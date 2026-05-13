const prisma = require("../lib/prisma");
const { sendCaregiverInviteEmail } = require('../lib/email');

const generateCode = () =>
  "RAMBA-" + Math.random().toString(36).toUpperCase().slice(2, 7);

// Patient sends invite to a caregiver email
async function sendInvite(req, res) {
  try {
    const { caregiverEmail } = req.body;
    if (!caregiverEmail) return res.status(400).json({ error: "caregiverEmail is required" });

    const already = await prisma.careInvite.findFirst({
      where: { patientId: req.user.id, caregiverEmail, status: { in: ["pending", "accepted"] } },
    });
    if (already) return res.status(409).json({ error: "An invite has already been sent to this email." });

    const code = generateCode();
    const invite = await prisma.careInvite.create({
      data: { code, patientId: req.user.id, caregiverEmail },
    });

    res.status(201).json({ success: true, code: invite.code });

    // Send email + in-app notification in background
    const patient = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } });
    const patientName = patient?.name || 'Your patient';

    // Email the caregiver
    sendCaregiverInviteEmail(caregiverEmail, patientName, code)
      .catch(e => console.error('Invite email failed:', e.message));

    // In-app notification if caregiver already has an account
    prisma.user.findUnique({ where: { email: caregiverEmail } }).then(caregiver => {
      if (caregiver) {
        prisma.notification.create({
          data: {
            userId: caregiver.id,
            title: 'New Patient Assignment',
            message: `${patientName} has assigned you as their caregiver. Use code ${code} to accept.`,
          },
        }).catch(() => {});
      }
    }).catch(() => {});

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send invite" });
  }
}

// Caregiver redeems a code
async function redeemInvite(req, res) {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "code is required" });

    const invite = await prisma.careInvite.findUnique({ where: { code: code.toUpperCase().trim() } });
    if (!invite) return res.status(404).json({ error: "Invalid invite code. Please check and try again." });
    if (invite.status === "accepted") return res.status(409).json({ error: "This invite has already been used." });
    if (invite.status === "revoked") return res.status(410).json({ error: "This invite has been revoked." });

    // Link caregiver → patient
    await prisma.caregiverAccess.upsert({
      where: { caregiverId_patientId: { caregiverId: req.user.id, patientId: invite.patientId } },
      create: { caregiverId: req.user.id, patientId: invite.patientId },
      update: {},
    });

    await prisma.careInvite.update({ where: { code: invite.code }, data: { status: "accepted" } });

    const patient = await prisma.user.findUnique({
      where: { id: invite.patientId },
      select: { id: true, name: true, email: true },
    });

    // Notify patient that caregiver accepted
    const caregiver = await prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } });
    prisma.notification.create({
      data: {
        userId: invite.patientId,
        title: 'Caregiver Accepted',
        message: `${caregiver?.name || 'Your caregiver'} has accepted your caregiver invitation and is now monitoring your health.`,
      },
    }).catch(() => {});

    res.json({ success: true, invite: { ...invite, patientName: patient.name, patientEmail: patient.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to redeem invite" });
  }
}

// Patient revokes an invite by code
async function revokeInvite(req, res) {
  try {
    const { code } = req.params;
    const invite = await prisma.careInvite.findUnique({ where: { code } });
    if (!invite || invite.patientId !== req.user.id)
      return res.status(404).json({ error: "Invite not found" });

    await prisma.careInvite.update({ where: { code }, data: { status: "revoked" } });

    // Also remove CaregiverAccess if it was accepted
    if (invite.status === "accepted") {
      const caregiver = await prisma.user.findFirst({ where: { email: invite.caregiverEmail } });
      if (caregiver) {
        await prisma.caregiverAccess.deleteMany({
          where: { caregiverId: caregiver.id, patientId: req.user.id },
        });
      }
    }
    res.json({ message: "Invite revoked" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to revoke invite" });
  }
}

// Patient gets their own invites
async function getMyInvites(req, res) {
  try {
    const invites = await prisma.careInvite.findMany({
      where: { patientId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ invites });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch invites" });
  }
}

// Caregiver gets their linked patients (via accepted invites)
async function getMyPatients(req, res) {
  try {
    const accesses = await prisma.caregiverAccess.findMany({
      where: { caregiverId: req.user.id },
      include: {
        patient: {
          select: {
            id: true, name: true, email: true,
            conditions: { include: { condition: { select: { name: true } } } },
          },
        },
      },
    });
    const patients = accesses.map((a) => ({
      ...a.patient,
      condition: a.patient.conditions[0]?.condition?.name || null,
      conditions: undefined,
      grantedAt: a.grantedAt,
    }));
    res.json({ patients });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch patients" });
  }
}

module.exports = { sendInvite, redeemInvite, revokeInvite, getMyInvites, getMyPatients };
