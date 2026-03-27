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

module.exports = { sendOtpEmail };
