const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendOtpEmail(toEmail, otp, name) {
  await transporter.sendMail({
    from: `"RambaMedTech" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your RambaMedTech Verification Code',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border-radius:12px;border:1px solid #e5e7eb;">
        <h2 style="color:#065f46;margin-bottom:4px;">RambaMedTech</h2>
        <p style="color:#6b7280;font-size:14px;margin-top:0;">Your health, your community</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
        <p style="font-size:15px;color:#111827;">Hi <strong>${name}</strong>,</p>
        <p style="font-size:15px;color:#374151;">Use the code below to verify your account. It expires in <strong>10 minutes</strong>.</p>
        <div style="background:#f0fdf4;border:2px solid #6ee7b7;border-radius:10px;padding:24px;text-align:center;margin:24px 0;">
          <span style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#065f46;">${otp}</span>
        </div>
        <p style="font-size:13px;color:#9ca3af;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

async function sendCaregiverHealthAlert(caregiverEmail, caregiverName, patientName, metric, value, unit, notes) {
  await transporter.sendMail({
    from: `"RambaMedTech" <${process.env.EMAIL_USER}>`,
    to: caregiverEmail,
    subject: `Health Update: ${patientName} logged new data`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border-radius:12px;border:1px solid #e5e7eb;">
        <h2 style="color:#065f46;margin-bottom:4px;">RambaMedTech</h2>
        <p style="color:#6b7280;font-size:14px;margin-top:0;">Patient Health Update</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
        <p style="font-size:15px;color:#111827;">Hi <strong>${caregiverName}</strong>,</p>
        <p style="font-size:15px;color:#374151;">Your patient <strong>${patientName}</strong> has just logged new health data.</p>
        <div style="background:#f0fdf4;border:2px solid #6ee7b7;border-radius:10px;padding:20px;margin:24px 0;">
          <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>Metric:</strong> ${metric}</p>
          <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>Value:</strong> ${value}${unit ? ' ' + unit : ''}</p>
          ${notes ? `<p style="margin:0;font-size:14px;color:#374151;"><strong>Notes:</strong> ${notes}</p>` : ''}
        </div>
        <p style="font-size:14px;color:#374151;">Log in to RambaMedTech to view the full details and history.</p>
        <p style="font-size:13px;color:#9ca3af;">You are receiving this because you are a registered caregiver for ${patientName}.</p>
      </div>
    `,
  });
}

async function sendCaregiverMoodAlert(caregiverEmail, caregiverName, patientName, emotion, notes) {
  const isBad = emotion === 'BAD';
  const borderColor = isBad ? '#fca5a5' : '#fcd34d';
  const bgColor = isBad ? '#fef2f2' : '#fffbeb';
  const emotionLabel = emotion.charAt(0) + emotion.slice(1).toLowerCase();

  await transporter.sendMail({
    from: `"RambaMedTech" <${process.env.EMAIL_USER}>`,
    to: caregiverEmail,
    subject: `⚠️ Mood Alert: ${patientName} is feeling ${emotionLabel}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border-radius:12px;border:1px solid #e5e7eb;">
        <h2 style="color:#065f46;margin-bottom:4px;">RambaMedTech</h2>
        <p style="color:#6b7280;font-size:14px;margin-top:0;">Patient Well-being Alert</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
        <p style="font-size:15px;color:#111827;">Hi <strong>${caregiverName}</strong>,</p>
        <p style="font-size:15px;color:#374151;">Your patient <strong>${patientName}</strong> just completed a well-being check-in and reported feeling <strong>${emotionLabel}</strong>. They may need your support.</p>
        <div style="background:${bgColor};border:2px solid ${borderColor};border-radius:10px;padding:20px;margin:24px 0;text-align:center;">
          <span style="font-size:28px;font-weight:bold;color:#111827;">${emotionLabel}</span>
          ${notes ? `<p style="margin:12px 0 0 0;font-size:14px;color:#374151;">"${notes}"</p>` : ''}
        </div>
        <p style="font-size:14px;color:#374151;">Consider reaching out to ${patientName} to check in on them.</p>
        <p style="font-size:13px;color:#9ca3af;">You are receiving this because you are a registered caregiver for ${patientName}.</p>
      </div>
    `,
  });
}

async function sendPasswordResetEmail(toEmail, name, resetLink) {
  await transporter.sendMail({
    from: `"RambaMedTech" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Reset your RambaMedTech password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border-radius:12px;border:1px solid #e5e7eb;">
        <h2 style="color:#065f46;margin-bottom:4px;">RambaMedTech</h2>
        <p style="color:#6b7280;font-size:14px;margin-top:0;">Password Reset Request</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
        <p style="font-size:15px;color:#111827;">Hi <strong>${name}</strong>,</p>
        <p style="font-size:15px;color:#374151;">Click the button below to reset your password. This link expires in <strong>15 minutes</strong>.</p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${resetLink}" style="background:#065f46;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Reset Password</a>
        </div>
        <p style="font-size:13px;color:#9ca3af;">If you did not request this, you can safely ignore this email. Your password will not change.</p>
      </div>
    `,
  });
}

module.exports = { sendOtpEmail, sendCaregiverHealthAlert, sendCaregiverMoodAlert, sendPasswordResetEmail };
