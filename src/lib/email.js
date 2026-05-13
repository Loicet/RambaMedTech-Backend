const nodemailer = require('nodemailer');

// Direct SMTP is faster and more reliable than service:'gmail'
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  pool: true,        // reuse connections — much faster for multiple sends
  maxConnections: 5,
  socketTimeout: 10000,
});

// Verify connection on startup so you know immediately if credentials are wrong
transporter.verify((err) => {
  if (err) console.error('❌ Email transporter error:', err.message);
  else console.log('✅ Email transporter ready');
});

const i18n = {
  en: {
    otpSubject: 'Your RambaMedTech Verification Code',
    otpTagline: 'Your health, your community',
    otpHi: (name) => `Hi <strong>${name}</strong>,`,
    otpBody: 'Use the code below to verify your account. It expires in <strong>10 minutes</strong>.',
    otpIgnore: 'If you did not request this, you can safely ignore this email.',
    otpText: (name, otp) => `Hi ${name},\n\nYour RambaMedTech verification code is: ${otp}\n\nIt expires in 10 minutes.\n\nIf you did not request this, ignore this email.`,

    healthSubject: (name) => `Health Update: ${name} logged new data`,
    healthTagline: 'Patient Health Update',
    healthHi: (name) => `Hi <strong>${name}</strong>,`,
    healthBody: (patient) => `Your patient <strong>${patient}</strong> has just logged new health data.`,
    healthMetric: 'Metric',
    healthValue: 'Value',
    healthNotes: 'Notes',
    healthFooter: (patient) => `Log in to RambaMedTech to view the full details and history.`,
    healthDisclaimer: (patient) => `You are receiving this because you are a registered caregiver for ${patient}.`,

    moodSubject: (name, emotion) => `⚠️ Mood Alert: ${name} is feeling ${emotion}`,
    moodTagline: 'Patient Well-being Alert',
    moodHi: (name) => `Hi <strong>${name}</strong>,`,
    moodBody: (patient, emotion) => `Your patient <strong>${patient}</strong> just completed a well-being check-in and reported feeling <strong>${emotion}</strong>. They may need your support.`,
    moodFooter: (patient) => `Consider reaching out to ${patient} to check in on them.`,
    moodDisclaimer: (patient) => `You are receiving this because you are a registered caregiver for ${patient}.`,

    resetSubject: 'Reset your RambaMedTech password',
    resetTagline: 'Password Reset Request',
    resetHi: (name) => `Hi <strong>${name}</strong>,`,
    resetBody: 'Click the button below to reset your password. This link expires in <strong>15 minutes</strong>.',
    resetBtn: 'Reset Password',
    resetIgnore: 'If you did not request this, you can safely ignore this email. Your password will not change.',
    resetText: (name, link) => `Hi ${name},\n\nClick the link below to reset your password (expires in 15 minutes):\n\n${link}\n\nIf you did not request this, ignore this email.`,
  },

  rw: {
    otpSubject: 'Kode yawe yo kugenzura konti ya RambaMedTech',
    otpTagline: 'Ubuzima bwawe, umuryango wawe',
    otpHi: (name) => `Muraho <strong>${name}</strong>,`,
    otpBody: 'Koresha kode iri hasi kugira ngo ugenzure konti yawe. Irangira mu <strong>minota 10</strong>.',
    otpIgnore: 'Niba utasabye ibi, urashobora gusiba ubutumwa bw\'ubwo.',
    otpText: (name, otp) => `Muraho ${name},\n\nKode yawe yo kugenzura konti ya RambaMedTech ni: ${otp}\n\nIrangira mu minota 10.\n\nNiba utasabye ibi, siba ubutumwa bw'ubwo.`,

    healthSubject: (name) => `Amakuru y'Ubuzima: ${name} yanditse amakuru mashya`,
    healthTagline: 'Amakuru y\'Ubuzima bw\'Umurwayi',
    healthHi: (name) => `Muraho <strong>${name}</strong>,`,
    healthBody: (patient) => `Umurwayi wawe <strong>${patient}</strong> yanditse amakuru mashya y'ubuzima.`,
    healthMetric: 'Igipimo',
    healthValue: 'Agaciro',
    healthNotes: 'Ibisobanuro',
    healthFooter: (patient) => `Injira kuri RambaMedTech kureba amakuru yose n'amateka.`,
    healthDisclaimer: (patient) => `Urabona ubutumwa bw'ubwo kuko uri umurezi wa ${patient}.`,

    moodSubject: (name, emotion) => `⚠️ Imyumvire: ${name} yiyumva ${emotion}`,
    moodTagline: 'Imenyesha ry\'Ubuzima bw\'Amarangamutima',
    moodHi: (name) => `Muraho <strong>${name}</strong>,`,
    moodBody: (patient, emotion) => `Umurwayi wawe <strong>${patient}</strong> arangije genzura ubuzima bw'amarangamutima kandi yavuze ko yiyumva <strong>${emotion}</strong>. Ashobora gukeneya inkunga yawe.`,
    moodFooter: (patient) => `Tekereza gutumanahana na ${patient} kugira ngo umurebe.`,
    moodDisclaimer: (patient) => `Urabona ubutumwa bw'ubwo kuko uri umurezi wa ${patient}.`,

    resetSubject: 'Hindura ijambo ry\'ibanga rya RambaMedTech',
    resetTagline: 'Gusaba Guhindura Ijambo ry\'Ibanga',
    resetHi: (name) => `Muraho <strong>${name}</strong>,`,
    resetBody: 'Kanda buto iri hasi kugira ngo uhindure ijambo ry\'ibanga. Ihuza irangira mu <strong>minota 15</strong>.',
    resetBtn: 'Hindura Ijambo ry\'Ibanga',
    resetIgnore: 'Niba utasabye ibi, urashobora gusiba ubutumwa bw\'ubwo. Ijambo ry\'ibanga ntizahinduka.',
    resetText: (name, link) => `Muraho ${name},\n\nKanda ihuza iri hasi kugira ngo uhindure ijambo ry'ibanga (irangira mu minota 15):\n\n${link}\n\nNiba utasabye ibi, siba ubutumwa bw'ubwo.`,
  },
};

function getLang(lang) {
  return i18n[lang] || i18n.en;
}

function baseHtml(tagline, content) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border-radius:12px;border:1px solid #e5e7eb;">
      <h2 style="color:#065f46;margin-bottom:4px;">RambaMedTech</h2>
      <p style="color:#6b7280;font-size:14px;margin-top:0;">${tagline}</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
      ${content}
    </div>
  `;
}

async function sendOtpEmail(toEmail, otp, name, lang = 'en') {
  const l = getLang(lang);
  await transporter.sendMail({
    from: `"RambaMedTech" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: l.otpSubject,
    text: l.otpText(name, otp),
    html: baseHtml(l.otpTagline, `
      <p style="font-size:15px;color:#111827;">${l.otpHi(name)}</p>
      <p style="font-size:15px;color:#374151;">${l.otpBody}</p>
      <div style="background:#f0fdf4;border:2px solid #6ee7b7;border-radius:10px;padding:24px;text-align:center;margin:24px 0;">
        <span style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#065f46;">${otp}</span>
      </div>
      <p style="font-size:13px;color:#9ca3af;">${l.otpIgnore}</p>
    `),
  });
}

async function sendCaregiverHealthAlert(caregiverEmail, caregiverName, patientName, metric, value, unit, notes, lang = 'en') {
  const l = getLang(lang);
  await transporter.sendMail({
    from: `"RambaMedTech" <${process.env.EMAIL_USER}>`,
    to: caregiverEmail,
    subject: l.healthSubject(patientName),
    html: baseHtml(l.healthTagline, `
      <p style="font-size:15px;color:#111827;">${l.healthHi(caregiverName)}</p>
      <p style="font-size:15px;color:#374151;">${l.healthBody(patientName)}</p>
      <div style="background:#f0fdf4;border:2px solid #6ee7b7;border-radius:10px;padding:20px;margin:24px 0;">
        <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>${l.healthMetric}:</strong> ${metric}</p>
        <p style="margin:0 0 8px 0;font-size:14px;color:#374151;"><strong>${l.healthValue}:</strong> ${value}${unit ? ' ' + unit : ''}</p>
        ${notes ? `<p style="margin:0;font-size:14px;color:#374151;"><strong>${l.healthNotes}:</strong> ${notes}</p>` : ''}
      </div>
      <p style="font-size:14px;color:#374151;">${l.healthFooter(patientName)}</p>
      <p style="font-size:13px;color:#9ca3af;">${l.healthDisclaimer(patientName)}</p>
    `),
  });
}

async function sendCaregiverMoodAlert(caregiverEmail, caregiverName, patientName, emotion, notes, lang = 'en') {
  const l = getLang(lang);
  const isBad = emotion === 'BAD';
  const borderColor = isBad ? '#fca5a5' : '#fcd34d';
  const bgColor = isBad ? '#fef2f2' : '#fffbeb';
  const emotionLabel = emotion.charAt(0) + emotion.slice(1).toLowerCase();

  await transporter.sendMail({
    from: `"RambaMedTech" <${process.env.EMAIL_USER}>`,
    to: caregiverEmail,
    subject: l.moodSubject(patientName, emotionLabel),
    html: baseHtml(l.moodTagline, `
      <p style="font-size:15px;color:#111827;">${l.moodHi(caregiverName)}</p>
      <p style="font-size:15px;color:#374151;">${l.moodBody(patientName, emotionLabel)}</p>
      <div style="background:${bgColor};border:2px solid ${borderColor};border-radius:10px;padding:20px;margin:24px 0;text-align:center;">
        <span style="font-size:28px;font-weight:bold;color:#111827;">${emotionLabel}</span>
        ${notes ? `<p style="margin:12px 0 0 0;font-size:14px;color:#374151;">"${notes}"</p>` : ''}
      </div>
      <p style="font-size:14px;color:#374151;">${l.moodFooter(patientName)}</p>
      <p style="font-size:13px;color:#9ca3af;">${l.moodDisclaimer(patientName)}</p>
    `),
  });
}

async function sendPasswordResetEmail(toEmail, name, resetLink, lang = 'en') {
  const l = getLang(lang);
  await transporter.sendMail({
    from: `"RambaMedTech" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: l.resetSubject,
    text: l.resetText(name, resetLink),
    html: baseHtml(l.resetTagline, `
      <p style="font-size:15px;color:#111827;">${l.resetHi(name)}</p>
      <p style="font-size:15px;color:#374151;">${l.resetBody}</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${resetLink}" style="background:#065f46;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">${l.resetBtn}</a>
      </div>
      <p style="font-size:13px;color:#9ca3af;">${l.resetIgnore}</p>
    `),
  });
}

async function sendCaregiverInviteEmail(caregiverEmail, patientName, code) {
  await transporter.sendMail({
    from: `"RambaMedTech" <${process.env.EMAIL_USER}>`,
    to: caregiverEmail,
    subject: `${patientName} has assigned you as their caregiver on RambaMedTech`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border-radius:12px;border:1px solid #e5e7eb;">
        <h2 style="color:#065f46;margin-bottom:4px;">RambaMedTech</h2>
        <p style="color:#6b7280;font-size:14px;margin-top:0;">Caregiver Invitation</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
        <p style="font-size:15px;color:#111827;">Hi,</p>
        <p style="font-size:15px;color:#374151;">
          <strong>${patientName}</strong> has assigned you as their caregiver on RambaMedTech.
          Use the code below to accept the request.
        </p>
        <div style="background:#f0fdf4;border:2px solid #6ee7b7;border-radius:10px;padding:24px;text-align:center;margin:24px 0;">
          <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;">Your invite code</p>
          <span style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#065f46;">${code}</span>
        </div>
        <p style="font-size:14px;color:#374151;">Log in or create a caregiver account at RambaMedTech, then enter this code to link with your patient.</p>
        <p style="font-size:13px;color:#9ca3af;">If you were not expecting this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

module.exports = { sendOtpEmail, sendCaregiverHealthAlert, sendCaregiverMoodAlert, sendPasswordResetEmail, sendCaregiverInviteEmail };
