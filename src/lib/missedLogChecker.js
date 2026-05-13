const prisma = require('../lib/prisma');
const { sendCaregiverMoodAlert } = require('./email');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

async function sendMissedLogAlert(caregiverEmail, caregiverName, patientName) {
  await transporter.sendMail({
    from: `"RambaMedTech" <${process.env.EMAIL_USER}>`,
    to: caregiverEmail,
    subject: `⏰ ${patientName} hasn't logged health data in 24 hours`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border-radius:12px;border:1px solid #e5e7eb;">
        <h2 style="color:#065f46;margin-bottom:4px;">RambaMedTech</h2>
        <p style="color:#6b7280;font-size:14px;margin-top:0;">Patient Activity Alert</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
        <p style="font-size:15px;color:#111827;">Hi <strong>${caregiverName}</strong>,</p>
        <div style="background:#fffbeb;border:2px solid #fcd34d;border-radius:10px;padding:20px;margin:24px 0;">
          <p style="margin:0;font-size:15px;color:#374151;">
            It has been <strong>24 hours</strong> since your patient <strong>${patientName}</strong> updated their health status. Please check on them.
          </p>
        </div>
        <p style="font-size:14px;color:#374151;">Log in to RambaMedTech to view their profile and reach out if needed.</p>
        <p style="font-size:13px;color:#9ca3af;">You are receiving this because you are a registered caregiver for ${patientName}.</p>
      </div>
    `,
  });
}

async function checkMissedLogs() {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get all caregiver-patient links
    const accesses = await prisma.caregiverAccess.findMany({
      include: {
        caregiver: { select: { name: true, email: true } },
        patient: { select: { id: true, name: true } },
      },
    });

    for (const access of accesses) {
      const { patient, caregiver } = access;

      // Check last health log
      const lastLog = await prisma.healthLog.findFirst({
        where: { userId: patient.id },
        orderBy: { loggedAt: 'desc' },
      });

      const hasNotLoggedIn24hrs = !lastLog || new Date(lastLog.loggedAt) < twentyFourHoursAgo;

      if (hasNotLoggedIn24hrs) {
        // Check if we already sent a notification in the last 24hrs to avoid spam
        const recentNotif = await prisma.notification.findFirst({
          where: {
            userId: caregiver.id ? access.caregiverId : null,
            title: 'Missed Health Log',
            createdAt: { gte: twentyFourHoursAgo },
          },
        });

        if (!recentNotif) {
          // In-app notification
          await prisma.notification.create({
            data: {
              userId: access.caregiverId,
              title: 'Missed Health Log',
              message: `It has been 24 hours since ${patient.name} updated their health status. Please check on them.`,
            },
          }).catch(() => {});

          // Email alert
          sendMissedLogAlert(caregiver.email, caregiver.name, patient.name)
            .catch(e => console.error('Missed log alert failed:', e.message));
        }
      }
    }
  } catch (err) {
    console.error('checkMissedLogs error:', err.message);
  }
}

// Run every hour
function startMissedLogChecker() {
  console.log('Missed log checker started — runs every hour');
  checkMissedLogs(); // run once on startup
  setInterval(checkMissedLogs, 60 * 60 * 1000);
}

module.exports = { startMissedLogChecker };
