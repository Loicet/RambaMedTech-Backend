require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

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

  // Seed default communities
  const COMMUNITIES = [
    { name: "Diabetes Warriors", description: "Support group for people managing diabetes." },
    { name: "BP Buddies", description: "Community for hypertension management." },
    { name: "Asthma Support", description: "Breathing easier together." },
    { name: "Heart Health", description: "Cardiovascular wellness community." },
  ];
  for (const c of COMMUNITIES) {
    const exists = await prisma.community.findFirst({ where: { name: c.name } });
    if (!exists) await prisma.community.create({ data: c });
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
