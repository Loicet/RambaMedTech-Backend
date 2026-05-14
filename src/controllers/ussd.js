const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { t, getSession, saveSession, clearSession, calcBMI } = require('../lib/ussd');
const AfricasTalking = require('africastalking');

const at = AfricasTalking({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME,
});
const sms = at.SMS;

const VITALS = ['Blood Pressure', 'Blood Sugar', 'Heart Rate', 'Weight'];
const MOODS  = ['GREAT', 'GOOD', 'OKAY', 'LOW', 'BAD'];

function con(text) { return `CON ${text}`; }
function end(text) { return `END ${text}`; }

async function sendSms(phone, message) {
  try {
    await sms.send({ to: [phone], message, from: process.env.AT_SENDER_ID || 'RAMBA' });
  } catch (e) {
    console.error('SMS send failed:', e.message);
  }
}

async function handleUssd(req, res) {
  const { sessionId, phoneNumber, text } = req.body;
  const phone = phoneNumber;
  const parts = text ? text.split('*') : [''];
  const input = parts[parts.length - 1].trim();

  const session = await getSession(phone);
  const { state, data } = session;
  const lang = data.lang || 'en';

  let response;

  try {
    response = await processState(phone, state, data, input, lang);
  } catch (err) {
    console.error('USSD error:', err);
    response = end('Service error. Please try again later.');
  }

  res.set('Content-Type', 'text/plain');
  res.send(response);
}

async function processState(phone, state, data, input, lang) {
  // ── NEW USER ──────────────────────────────────────────────────────────────
  if (state === 'start') {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (user) {
      await saveSession(phone, 'login_pin', { userId: user.id, lang: user.lang || 'en' });
      return con(t(user.lang || 'en', 'enter_pin'));
    }
    await saveSession(phone, 'set_pin', {});
    return con(t('en', 'welcome_new'));
  }

  // ── REGISTRATION FLOW ─────────────────────────────────────────────────────
  if (state === 'set_pin') {
    if (!/^\d{5}$/.test(input)) {
      return con(t('en', 'pin_invalid'));
    }
    await saveSession(phone, 'confirm_pin', { pin: input });
    return con(t('en', 'confirm_pin'));
  }

  if (state === 'confirm_pin') {
    if (input !== data.pin) {
      await saveSession(phone, 'set_pin', {});
      return con(t('en', 'pin_mismatch'));
    }
    await saveSession(phone, 'choose_lang', { pin: data.pin });
    return con(t('en', 'choose_lang'));
  }

  if (state === 'choose_lang') {
    const l = input === '2' ? 'rw' : 'en';
    await saveSession(phone, 'privacy_notice', { ...data, lang: l });
    return con(t(l, 'privacy_notice'));
  }

  if (state === 'privacy_notice') {
    if (input === '2') {
      // Explorer — create minimal user
      const pinHash = await bcrypt.hash(data.pin, 10);
      const user = await prisma.user.create({
        data: { name: 'Explorer', email: `ussd_${phone}@ramba.local`, passwordHash: pinHash, phone, ussdPin: pinHash, role: 'USER', intent: 'explorer', lang },
      });
      await clearSession(phone);
      return end(t(lang, 'reg_done'));
    }
    await saveSession(phone, 'choose_role', data);
    return con(t(lang, 'choose_role'));
  }

  if (state === 'choose_role') {
    const roleMap = { '1': 'patient', '2': 'caregiver', '3': 'explorer' };
    const role = roleMap[input];
    if (!role) return con(t(lang, 'invalid_option') + '\n' + t(lang, 'choose_role'));
    await saveSession(phone, 'enter_name', { ...data, role });
    return con(t(lang, 'enter_name'));
  }

  if (state === 'enter_name') {
    if (!input || input.length < 2) return con(t(lang, 'enter_name'));
    await saveSession(phone, 'ask_age', { ...data, name: input });
    return con(t(lang, 'ask_age'));
  }

  if (state === 'ask_age') {
    const age = input === '0' ? null : parseInt(input);
    const birthYear = age ? new Date().getFullYear() - age : null;
    await saveSession(phone, 'ask_height', { ...data, birthYear });
    return con(t(lang, 'ask_height'));
  }

  if (state === 'ask_height') {
    const height = input === '0' ? null : parseFloat(input);
    await saveSession(phone, 'ask_weight', { ...data, height });
    return con(t(lang, 'ask_weight'));
  }

  if (state === 'ask_weight') {
    const weight = input === '0' ? null : parseFloat(input);
    const dbRole = data.role === 'caregiver' ? 'CAREGIVER' : 'USER';
    const pinHash = await bcrypt.hash(data.pin, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: `ussd_${phone}@ramba.local`,
        passwordHash: pinHash,
        phone,
        ussdPin: pinHash,
        role: dbRole,
        intent: data.role,
        lang,
        birthYear: data.birthYear || null,
        height: data.height || null,
        weight: weight || null,
      },
    });

    await clearSession(phone);

    const bmi = calcBMI(data.height, weight);
    const msg = bmi ? t(lang, 'bmi_result', bmi) : t(lang, 'reg_done');

    await sendSms(phone, `RambaMedTech: ${msg}`);
    return end(msg);
  }

  // ── LOGIN FLOW ────────────────────────────────────────────────────────────
  if (state === 'login_pin') {
    const user = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!user || !user.ussdPin) return end('Account error. Please contact support.');

    const valid = await bcrypt.compare(input, user.ussdPin);
    if (!valid) return con(t(lang, 'wrong_pin'));

    await saveSession(phone, 'main_menu', { userId: user.id, lang: user.lang || 'en' });
    return con(t(user.lang || 'en', 'welcome_back', user.name) + '\n\n' + t(user.lang || 'en', 'main_menu'));
  }

  // ── MAIN MENU ─────────────────────────────────────────────────────────────
  if (state === 'main_menu') {
    if (input === '1') { await saveSession(phone, 'vitals_menu', data); return con(t(lang, 'vitals_menu')); }
    if (input === '2') { await saveSession(phone, 'mood_menu', data); return con(t(lang, 'mood_menu')); }
    if (input === '3') return await showReminders(phone, data, lang);
    if (input === '4') { await saveSession(phone, 'community_menu', data); return con(t(lang, 'community_menu')); }
    if (input === '5') { await saveSession(phone, 'emergency_menu', data); return con(t(lang, 'emergency_menu')); }
    if (input === '6') { await saveSession(phone, 'reset_pin', data); return con(t(lang, 'reset_pin_new')); }
    if (input === '0') { await clearSession(phone); return end(t(lang, 'goodbye')); }
    return con(t(lang, 'invalid_option') + '\n\n' + t(lang, 'main_menu'));
  }

  // ── VITALS ────────────────────────────────────────────────────────────────
  if (state === 'vitals_menu') {
    if (input === '0') { await saveSession(phone, 'main_menu', data); return con(t(lang, 'main_menu')); }
    const idx = parseInt(input) - 1;
    if (idx < 0 || idx >= VITALS.length) return con(t(lang, 'invalid_option') + '\n' + t(lang, 'vitals_menu'));
    const metric = VITALS[idx];
    await saveSession(phone, 'enter_vital', { ...data, metric });
    return con(t(lang, 'enter_value', metric));
  }

  if (state === 'enter_vital') {
    const METRIC_CONDITION_MAP = {
      'Blood Pressure': 'Hypertension', 'Blood Sugar': 'Diabetes',
      'Heart Rate': 'Cardiovascular Disease', 'Weight': null,
    };
    const conditionName = METRIC_CONDITION_MAP[data.metric];
    let conditionId = null;
    if (conditionName) {
      const cond = await prisma.condition.findFirst({ where: { name: conditionName } });
      conditionId = cond?.id || null;
    }
    if (!conditionId) {
      const fallback = await prisma.condition.findFirst();
      conditionId = fallback?.id;
    }
    if (conditionId) {
      await prisma.healthLog.create({
        data: { userId: data.userId, conditionId, metric: data.metric, value: input, unit: '' },
      });
    }
    await saveSession(phone, 'main_menu', data);
    return con(t(lang, 'log_saved') + '\n\n' + t(lang, 'main_menu'));
  }

  // ── MOOD ──────────────────────────────────────────────────────────────────
  if (state === 'mood_menu') {
    if (input === '0') { await saveSession(phone, 'main_menu', data); return con(t(lang, 'main_menu')); }
    const idx = parseInt(input) - 1;
    if (idx < 0 || idx >= MOODS.length) return con(t(lang, 'invalid_option') + '\n' + t(lang, 'mood_menu'));
    await prisma.emotionalCheckIn.create({ data: { userId: data.userId, emotion: MOODS[idx] } });
    await saveSession(phone, 'main_menu', data);
    return con(t(lang, 'mood_saved') + '\n\n' + t(lang, 'main_menu'));
  }

  // ── REMINDERS ─────────────────────────────────────────────────────────────
  if (state === 'reminders_view') {
    await saveSession(phone, 'main_menu', data);
    return con(t(lang, 'main_menu'));
  }

  // ── COMMUNITY ─────────────────────────────────────────────────────────────
  if (state === 'community_menu') {
    if (input === '0') { await saveSession(phone, 'main_menu', data); return con(t(lang, 'main_menu')); }
    if (input === '1') {
      const community = await prisma.community.findFirst();
      if (community) {
        await prisma.communityMember.upsert({
          where: { userId_communityId: { userId: data.userId, communityId: community.id } },
          create: { userId: data.userId, communityId: community.id },
          update: {},
        });
      }
      await saveSession(phone, 'main_menu', data);
      return con(t(lang, 'community_joined') + '\n\n' + t(lang, 'main_menu'));
    }
    if (input === '2') {
      const community = await prisma.community.findFirst();
      if (community) {
        await prisma.communityMember.deleteMany({ where: { userId: data.userId, communityId: community.id } });
      }
      await saveSession(phone, 'main_menu', data);
      return con(t(lang, 'community_left') + '\n\n' + t(lang, 'main_menu'));
    }
    return con(t(lang, 'invalid_option') + '\n' + t(lang, 'community_menu'));
  }

  // ── EMERGENCY CONTACT ─────────────────────────────────────────────────────
  if (state === 'emergency_menu') {
    if (input === '0') { await saveSession(phone, 'main_menu', data); return con(t(lang, 'main_menu')); }
    if (input === '1') { await saveSession(phone, 'set_emergency', data); return con(t(lang, 'enter_emergency')); }
    if (input === '2') {
      const user = await prisma.user.findUnique({ where: { id: data.userId }, select: { emergencyContact: true } });
      const msg = user?.emergencyContact ? t(lang, 'emergency_show', user.emergencyContact) : t(lang, 'no_emergency');
      await saveSession(phone, 'main_menu', data);
      return con(msg + '\n\n' + t(lang, 'main_menu'));
    }
    return con(t(lang, 'invalid_option') + '\n' + t(lang, 'emergency_menu'));
  }

  if (state === 'set_emergency') {
    await prisma.user.update({ where: { id: data.userId }, data: { emergencyContact: input } });
    await saveSession(phone, 'main_menu', data);
    return con(t(lang, 'emergency_saved') + '\n\n' + t(lang, 'main_menu'));
  }

  // ── PIN RESET ─────────────────────────────────────────────────────────────
  if (state === 'reset_pin') {
    if (!/^\d{5}$/.test(input)) return con(t(lang, 'pin_invalid'));
    const pinHash = await bcrypt.hash(input, 10);
    await prisma.user.update({ where: { id: data.userId }, data: { ussdPin: pinHash } });
    await saveSession(phone, 'main_menu', data);
    return con(t(lang, 'reset_pin_done') + '\n\n' + t(lang, 'main_menu'));
  }

  // Fallback
  await saveSession(phone, 'start', {});
  return con(t('en', 'welcome_new'));
}

async function showReminders(phone, data, lang) {
  const reminders = await prisma.reminder.findMany({
    where: { userId: data.userId, active: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  if (!reminders.length) {
    await saveSession(phone, 'main_menu', data);
    return con(t(lang, 'no_reminders') + '\n\n' + t(lang, 'main_menu'));
  }
  const list = reminders.map((r, i) => `${i + 1}. ${r.title} - ${r.time}`).join('\n');
  await saveSession(phone, 'main_menu', data);
  return con(t(lang, 'reminders_header') + '\n' + list + '\n\n' + t(lang, 'main_menu'));
}

// SMS broadcast to all community members
async function broadcastCommunityUpdate(message) {
  const members = await prisma.communityMember.findMany({
    include: { user: { select: { phone: true } } },
  });
  const phones = [...new Set(members.map(m => m.user.phone).filter(Boolean))];
  if (!phones.length) return;
  await sendSms(phones, message);
}

module.exports = { handleUssd, broadcastCommunityUpdate };
