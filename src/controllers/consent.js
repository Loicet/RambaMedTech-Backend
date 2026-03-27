const prisma = require("../lib/prisma");

const DEFAULT_CONSENT = { vitals: true, mood: true, symptoms: true, insights: true, reminders: true };

async function getConsent(req, res) {
  try {
    const patientId = req.params.patientId || req.user.id;

    // Caregivers can only read consent for patients they have access to
    if (patientId !== req.user.id) {
      const access = await prisma.caregiverAccess.findUnique({
        where: { caregiverId_patientId: { caregiverId: req.user.id, patientId } },
      });
      if (!access) return res.status(403).json({ error: "Access not granted" });
    }

    const record = await prisma.patientConsent.findUnique({ where: { patientId } });
    res.json({ consent: record ?? { patientId, ...DEFAULT_CONSENT } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch consent" });
  }
}

async function updateConsent(req, res) {
  try {
    const { vitals, mood, symptoms, insights, reminders } = req.body;
    const data = {};
    if (vitals    !== undefined) data.vitals    = Boolean(vitals);
    if (mood      !== undefined) data.mood      = Boolean(mood);
    if (symptoms  !== undefined) data.symptoms  = Boolean(symptoms);
    if (insights  !== undefined) data.insights  = Boolean(insights);
    if (reminders !== undefined) data.reminders = Boolean(reminders);

    const consent = await prisma.patientConsent.upsert({
      where: { patientId: req.user.id },
      create: { patientId: req.user.id, ...DEFAULT_CONSENT, ...data },
      update: data,
    });
    res.json({ consent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update consent" });
  }
}

module.exports = { getConsent, updateConsent };
