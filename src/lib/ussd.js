const prisma = require('./prisma');

const T = {
  en: {
    welcome_new:        'Welcome to RambaMedTech.\nCreate a 5-digit PIN to secure your account:',
    confirm_pin:        'Confirm your 5-digit PIN:',
    pin_mismatch:       'PINs do not match. Please start again.\n0. Retry',
    pin_invalid:        'PIN must be exactly 5 digits. Try again:',
    choose_lang:        'Choose language / Hitamo ururimi:\n1. English\n2. Kinyarwanda',
    privacy_notice:     'Your health data is private and protected.\n\nWould you like to register?\n1. Yes\n2. No (Explore)',
    choose_role:        'Choose your role:\n1. Patient\n2. Caregiver\n3. Explorer',
    enter_name:         'Enter your full name:',
    ask_age:            'Enter your age (or 0 to skip):',
    ask_height:         'Enter your height in cm (or 0 to skip):',
    ask_weight:         'Enter your weight in kg (or 0 to skip):',
    bmi_result:         (bmi) => `Your BMI is ${bmi}. Registration complete!`,
    reg_done:           'Registration complete! Welcome to RambaMedTech.',
    caregiver_reg_done: 'Registered as Caregiver on RambaMedTech. Welcome!',
    welcome_back:       (name) => `Welcome back, ${name}!`,
    enter_pin:          'Enter your 5-digit PIN:',
    wrong_pin:          'Incorrect PIN. Try again:',

    main_menu:          '1. Log Vitals\n2. Log Mood\n3. My Reminders\n4. Community\n5. Assign Caregiver\n6. Emergency Contact\n7. Reset PIN\n0. Exit',
    vitals_menu:        'Log Vitals:\n1. Blood Pressure\n2. Blood Sugar\n3. Heart Rate\n4. Weight\n0. Back',
    enter_value:        (metric) => `Enter ${metric} value:`,
    log_saved:          'Health log saved!',
    mood_menu:          'How are you feeling?\n1. Great\n2. Good\n3. Okay\n4. Low\n5. Bad\n0. Back',
    mood_saved:         'Mood check-in saved!',
    no_reminders:       'No active reminders.',
    reminders_header:   'Your reminders:',
    community_menu:     'Community:\n1. Join updates (SMS)\n2. Leave updates\n0. Back',
    community_joined:   'You will receive community SMS updates.',
    community_left:     'You have left community SMS updates.',
    emergency_menu:     'Emergency Contact:\n1. Set contact number\n2. View contact\n0. Back',
    enter_emergency:    'Enter emergency contact phone number:',
    emergency_saved:    'Emergency contact saved!',
    no_emergency:       'No emergency contact set.',
    emergency_show:     (n) => `Emergency contact: ${n}`,
    reset_pin_new:      'Enter your new 5-digit PIN:',
    reset_pin_done:     'PIN reset successfully!',

    // Caregiver assignment (patient side)
    assign_caregiver:   'Enter your caregiver\'s phone number:',
    invite_sent:        (phone) => `Invite sent to ${phone}. They will receive an SMS to accept.`,
    invite_sms:         (name) => `RambaMedTech: ${name} has assigned you as their caregiver. Dial *384*62481# and log in to accept.`,

    // Caregiver menu
    caregiver_menu:     '1. Pending Invites\n2. My Patients\n3. My Reminders\n4. Reset PIN\n0. Exit',
    no_invites:         'No pending invites.',
    invites_header:     'Pending invites:',
    invite_action:      (name) => `${name} wants you as caregiver.\n1. Accept\n2. Decline\n0. Back`,
    invite_accepted:    (name) => `You are now caregiver for ${name}.`,
    invite_declined:    'Invite declined.',
    no_patients:        'You have no linked patients yet.',
    patients_header:    'Your patients:',

    invalid_option:     'Invalid option. Please try again.',
    goodbye:            'Thank you for using RambaMedTech. Stay healthy!',
  },

  rw: {
    welcome_new:        'Murakaza neza kuri RambaMedTech.\nShyiraho PIN y\'imibare 5 kurinda konti yawe:',
    confirm_pin:        'Emeza PIN yawe y\'imibare 5:',
    pin_mismatch:       'PIN ntizuye. Ongera ugerageze.\n0. Ongera',
    pin_invalid:        'PIN igomba kuba imibare 5. Ongera ugerageze:',
    choose_lang:        'Choose language / Hitamo ururimi:\n1. English\n2. Kinyarwanda',
    privacy_notice:     'Amakuru yawe y\'ubuzima arindwa.\n\nUrashaka kwiyandikisha?\n1. Yego\n2. Oya (Reba gusa)',
    choose_role:        'Hitamo uruhare rwawe:\n1. Umurwayi\n2. Umurezi\n3. Umugerageza',
    enter_name:         'Injiza amazina yawe yuzuye:',
    ask_age:            'Injiza imyaka yawe (cyangwa 0 kurenza):',
    ask_height:         'Injiza uburebure bwawe mu cm (cyangwa 0 kurenza):',
    ask_weight:         'Injiza ibiro byawe mu kg (cyangwa 0 kurenza):',
    bmi_result:         (bmi) => `BMI yawe ni ${bmi}. Kwiyandikisha byarangiye!`,
    reg_done:           'Kwiyandikisha byarangiye! Murakaza neza kuri RambaMedTech.',
    caregiver_reg_done: 'Wanditswe nka Umurezi kuri RambaMedTech. Murakaza neza!',
    welcome_back:       (name) => `Murakaza neza, ${name}!`,
    enter_pin:          'Injiza PIN yawe y\'imibare 5:',
    wrong_pin:          'PIN ntabwo ari yo. Ongera ugerageze:',

    main_menu:          '1. Injiza Ibipimo\n2. Injiza Imyumvire\n3. Ibibutso Byanjye\n4. Umuryango\n5. Shyiraho Umurezi\n6. Telefoni y\'Acil\n7. Hindura PIN\n0. Sohoka',
    vitals_menu:        'Injiza Ibipimo:\n1. Umuvuduko w\'Amaraso\n2. Isukari mu Maraso\n3. Imitsi y\'Umutima\n4. Ibiro\n0. Subira',
    enter_value:        (metric) => `Injiza agaciro ka ${metric}:`,
    log_saved:          'Ibipimo byabitswe!',
    mood_menu:          'Wiyumva ute?\n1. Neza cyane\n2. Neza\n3. Bisanzwe\n4. Nabi gato\n5. Nabi\n0. Subira',
    mood_saved:         'Imyumvire yabitswe!',
    no_reminders:       'Nta bibutso bihari.',
    reminders_header:   'Ibibutso byawe:',
    community_menu:     'Umuryango:\n1. Injira ubutumwa (SMS)\n2. Sohoka mu butumwa\n0. Subira',
    community_joined:   'Uzakira ubutumwa bw\'umuryango kuri SMS.',
    community_left:     'Wasohokye mu butumwa bw\'umuryango.',
    emergency_menu:     'Telefoni y\'Acil:\n1. Shyiraho nimero\n2. Reba nimero\n0. Subira',
    enter_emergency:    'Injiza nimero ya telefoni y\'acil:',
    emergency_saved:    'Telefoni y\'acil yabitswe!',
    no_emergency:       'Nta telefoni y\'acil ishyizweho.',
    emergency_show:     (n) => `Telefoni y'acil: ${n}`,
    reset_pin_new:      'Injiza PIN nshya y\'imibare 5:',
    reset_pin_done:     'PIN yahinduwe neza!',

    assign_caregiver:   'Injiza nimero ya telefoni y\'umurezi wawe:',
    invite_sent:        (phone) => `Ubutumwa bwoherejwe kuri ${phone}. Bazakira SMS yo kwemera.`,
    invite_sms:         (name) => `RambaMedTech: ${name} yakugennye nk'umurezi we. Pinya *384*62481# winjire kwemera.`,

    caregiver_menu:     '1. Ibyifuzo Bihari\n2. Abarwayi Banjye\n3. Ibibutso Byanjye\n4. Hindura PIN\n0. Sohoka',
    no_invites:         'Nta byifuzo bihari.',
    invites_header:     'Ibyifuzo bihari:',
    invite_action:      (name) => `${name} akugennye nk'umurezi.\n1. Emera\n2. Yanga\n0. Subira`,
    invite_accepted:    (name) => `Ubu uri umurezi wa ${name}.`,
    invite_declined:    'Icyifuzo cyanzwe.',
    no_patients:        'Nta barwayi bagufunguye uburenganzira.',
    patients_header:    'Abarwayi bawe:',

    invalid_option:     'Amahitamo ntabwo ari yo. Ongera ugerageze.',
    goodbye:            'Murakoze gukoresha RambaMedTech. Mukomeze mubaho neza!',
  },
};

function t(lang, key, ...args) {
  const strings = T[lang] || T.en;
  const val = strings[key] !== undefined ? strings[key] : T.en[key];
  return typeof val === 'function' ? val(...args) : (val || '');
}

async function getSession(phone) {
  let session = await prisma.ussdSession.findUnique({ where: { phone } });
  if (!session) session = await prisma.ussdSession.create({ data: { phone } });
  return { ...session, data: JSON.parse(session.data) };
}

async function saveSession(phone, state, data) {
  await prisma.ussdSession.upsert({
    where: { phone },
    create: { phone, state, data: JSON.stringify(data) },
    update: { state, data: JSON.stringify(data) },
  });
}

async function clearSession(phone) {
  await prisma.ussdSession.deleteMany({ where: { phone } });
}

function calcBMI(height, weight) {
  const h = parseFloat(height) / 100;
  const w = parseFloat(weight);
  if (!h || !w) return null;
  return (w / (h * h)).toFixed(1);
}

module.exports = { t, getSession, saveSession, clearSession, calcBMI };
