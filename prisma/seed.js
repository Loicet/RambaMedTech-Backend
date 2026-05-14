require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const CONDITIONS = [
  { name: "Diabetes", description: "A chronic condition affecting blood sugar regulation." },
  { name: "Hypertension", description: "High blood pressure condition." },
  { name: "Asthma", description: "A respiratory condition causing airway inflammation." },
  { name: "Cardiovascular Disease", description: "Conditions affecting the heart and blood vessels." },
  { name: "Chronic Kidney Disease", description: "Long-term condition where the kidneys don't work effectively." },
  { name: "Sickle Cell", description: "An inherited red blood cell disorder." },
];

const ARTICLES = [
  { condition: "Diabetes", title: "Managing Blood Sugar Daily", body: "Practical tips for keeping your glucose levels stable throughout the day, including meal timing and portion control." },
  { condition: "Diabetes", title: "Diet and Diabetes in Africa", body: "How to adapt traditional African diets — including ugali, fufu, and jollof rice — for better diabetes management." },
  { condition: "Diabetes", title: "Exercise and Blood Sugar Control", body: "How regular physical activity improves insulin sensitivity and helps maintain healthy glucose levels." },
  { condition: "Hypertension", title: "Understanding High Blood Pressure", body: "What hypertension means, why it is called the silent killer, and how lifestyle changes can help." },
  { condition: "Hypertension", title: "Salt, Stress & Blood Pressure", body: "The role of sodium intake and chronic stress in hypertension and practical ways to reduce both." },
  { condition: "Hypertension", title: "Medications for Hypertension", body: "A guide to common blood pressure medications, how they work, and why consistency matters." },
  { condition: "Asthma", title: "Asthma Triggers to Avoid", body: "Common environmental and lifestyle triggers — dust, smoke, cold air — and how to manage exposure." },
  { condition: "Asthma", title: "Using Your Inhaler Correctly", body: "Step-by-step guidance on proper inhaler technique to ensure you get the full dose every time." },
  { condition: "Asthma", title: "Asthma and the Rainy Season", body: "Why humid and rainy conditions worsen asthma symptoms and how to prepare your action plan." },
  { condition: "Cardiovascular Disease", title: "Heart Health Basics", body: "Key daily habits that protect your heart and significantly reduce cardiovascular risk over time." },
  { condition: "Cardiovascular Disease", title: "Reading Your Heart Rate", body: "What your resting heart rate tells you about your cardiovascular health and when to seek help." },
  { condition: "Cardiovascular Disease", title: "Heart-Healthy Eating in Africa", body: "Choosing local foods that support heart health while staying true to your cultural food traditions." },
  { condition: "Chronic Kidney Disease", title: "Protecting Your Kidneys Daily", body: "Simple habits — hydration, diet, and medication adherence — that slow the progression of CKD." },
  { condition: "Chronic Kidney Disease", title: "Diet and CKD", body: "Foods to limit and foods to embrace when managing chronic kidney disease in an African context." },
  { condition: "Chronic Kidney Disease", title: "Understanding Kidney Function Tests", body: "What creatinine, GFR, and other kidney markers mean and how to track them over time." },
  { condition: "Sickle Cell", title: "Living Well with Sickle Cell", body: "Practical strategies for managing pain crises, fatigue, and daily life with sickle cell disease." },
  { condition: "Sickle Cell", title: "Preventing Sickle Cell Crises", body: "How hydration, temperature, stress management, and infection prevention reduce crisis frequency." },
  { condition: "Sickle Cell", title: "Sickle Cell and Mental Health", body: "Addressing the emotional and psychological impact of living with a chronic painful condition." },
];

const GENERAL_ARTICLES = [
  { category: "General Wellness", title: "Building Habits That Actually Stick", body: "Why most habits fail and the science-backed approach to building routines that last — starting small, staying consistent, and celebrating progress." },
  { category: "General Wellness", title: "The Power of Drinking More Water", body: "How proper hydration affects your energy, skin, digestion, and mental clarity — and simple ways to drink more throughout the day." },
  { category: "General Wellness", title: "Sleep: The Most Underrated Health Tool", body: "What happens to your body during sleep, why 7–9 hours matters, and practical tips to improve your sleep quality tonight." },
  { category: "General Wellness", title: "Movement Doesn't Have to Mean the Gym", body: "How everyday movement — walking, stretching, dancing — contributes to long-term health just as much as structured exercise." },
  { category: "Women's Health", title: "Understanding Your Menstrual Cycle", body: "A guide to the four phases of the menstrual cycle, what's normal, what's not, and how to track your cycle for better health awareness." },
  { category: "Women's Health", title: "Nutrition for Women at Every Stage", body: "How nutritional needs change from adolescence through menopause, and which nutrients matter most for women's long-term health." },
  { category: "Women's Health", title: "Mental Health and Hormones", body: "The connection between hormonal changes and mood, anxiety, and energy — and how to support your mental health through these shifts." },
  { category: "Family Health", title: "Raising Healthy Eaters", body: "Practical strategies for introducing nutritious foods to children, building positive relationships with food, and making mealtimes enjoyable." },
  { category: "Family Health", title: "Preventive Health for the Whole Family", body: "Key screenings, vaccinations, and habits every family should prioritize — from infants to grandparents." },
  { category: "Mental Health", title: "Stress Is Normal — Here's How to Manage It", body: "Understanding the difference between healthy and harmful stress, and evidence-based techniques to manage it before it manages you." },
  { category: "Mental Health", title: "The Importance of Rest and Recovery", body: "Why rest is not laziness — how physical and mental recovery are essential to performance, mood, and long-term wellbeing." },
  { category: "Preventive Health", title: "Health Screenings You Shouldn't Skip", body: "A practical guide to routine health checks — blood pressure, blood sugar, cholesterol — and when to get them based on your age and risk." },
  { category: "Preventive Health", title: "How to Read Your Body's Warning Signs", body: "Common symptoms people ignore and what they might indicate — knowing when to monitor, when to rest, and when to see a doctor." },
];

async function main() {
  // Seed conditions
  const conditionMap = {};
  for (const c of CONDITIONS) {
    const record = await prisma.condition.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    });
    conditionMap[c.name] = record.id;
  }
  console.log("Seeded conditions:", Object.keys(conditionMap).join(", "));

  // Seed educational content
  for (const a of ARTICLES) {
    const conditionId = conditionMap[a.condition];
    if (!conditionId) continue;
    const exists = await prisma.educationalContent.findFirst({
      where: { title: a.title, conditionId },
    });
    if (!exists) {
      await prisma.educationalContent.create({
        data: { conditionId, title: a.title, body: a.body },
      });
    }
  }
  console.log("Seeded", ARTICLES.length, "educational articles");

  // Seed general wellness articles
  for (const a of GENERAL_ARTICLES) {
    const exists = await prisma.educationalContent.findFirst({ where: { title: a.title } });
    if (!exists) {
      await prisma.educationalContent.create({
        data: { conditionId: null, category: a.category, title: a.title, body: a.body },
      });
    }
  }
  console.log('Seeded', GENERAL_ARTICLES.length, 'general wellness articles');

  // Seed general community
  const generalCommunity = await prisma.community.findFirst({ where: { name: 'Wellness & Lifestyle' } });
  if (!generalCommunity) {
    await prisma.community.create({
      data: { name: 'Wellness & Lifestyle', description: 'A space for everyone building healthier habits and supporting each other.', conditionName: null },
    });
  }
  console.log('Seeded general community');

  // Seed default communities — linked to conditions
  const COMMUNITIES = [
    { name: "Diabetes Warriors", description: "Support group for people managing diabetes.", conditionName: "Diabetes" },
    { name: "BP Buddies", description: "Community for hypertension management.", conditionName: "Hypertension" },
    { name: "Asthma Support", description: "Breathing easier together.", conditionName: "Asthma" },
    { name: "Heart Health", description: "Cardiovascular wellness community.", conditionName: "Cardiovascular Disease" },
    { name: "Kidney Warriors", description: "Support for chronic kidney disease.", conditionName: "Chronic Kidney Disease" },
    { name: "Sickle Cell Circle", description: "Living well with sickle cell.", conditionName: "Sickle Cell" },
  ];
  for (const c of COMMUNITIES) {
    const exists = await prisma.community.findFirst({ where: { name: c.name } });
    if (!exists) await prisma.community.create({ data: c });
    else await prisma.community.update({ where: { id: exists.id }, data: { conditionName: c.conditionName } });
  }
  console.log("Seeded communities:", COMMUNITIES.map((c) => c.name).join(", "));

  // Seed admin account
  const adminEmail = "admin@rambamedtech.com";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("Admin@Ramba2025", 10);
    await prisma.user.create({
      data: { name: "RambaMedTech Admin", email: adminEmail, passwordHash, role: "ADMIN" },
    });
    console.log("Seeded admin account:", adminEmail);
  } else {
    console.log("Admin account already exists:", adminEmail);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
