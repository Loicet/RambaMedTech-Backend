const prisma = require("../lib/prisma");
const { sendCaregiverMoodAlert } = require('../lib/email');
const { encrypt, decrypt } = require('../lib/encryption');

const VALID_EMOTIONS = ["GREAT", "GOOD", "OKAY", "LOW", "BAD"];

const MOOD_MAP = {
  great: "GREAT",
  good: "GOOD",
  okay: "OKAY",
  low: "LOW",
  bad: "BAD",
  struggling: "BAD",
};

async function createCheckIn(req, res) {
  try {
    const rawEmotion = req.body.emotion || req.body.mood;
    const emotion = MOOD_MAP[rawEmotion?.toLowerCase()] || rawEmotion?.toUpperCase();
    const notes = req.body.notes || req.body.note || null;

    if (!emotion || !VALID_EMOTIONS.includes(emotion))
      return res.status(400).json({ error: `emotion must be one of: ${VALID_EMOTIONS.join(", ")} (or: great, good, okay, low, struggling)` });

    const checkIn = await prisma.emotionalCheckIn.create({
      data: { userId: req.user.id, emotion, notes: encrypt(notes) },
    });

    res.status(201).json({ checkIn: { ...checkIn, notes: decrypt(checkIn.notes) } });

    // Only alert caregiver if mood is LOW or BAD
    if (['LOW', 'BAD'].includes(emotion)) {
      prisma.caregiverAccess.findMany({
        where: { patientId: req.user.id },
        include: {
          caregiver: { select: { name: true, email: true, lang: true } },
          patient: { select: { name: true } },
        },
      }).then((accesses) => {
        if (accesses.length === 0) return;
        const patientName = accesses[0].patient.name;
        accesses.forEach(({ caregiver }) => {
          sendCaregiverMoodAlert(caregiver.email, caregiver.name, patientName, emotion, notes, caregiver.lang || 'en')
            .catch((e) => console.error('Caregiver mood alert failed:', e.message));
        });
      }).catch(() => {});
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save check-in" });
  }
}

async function getCheckIns(req, res) {
  try {
    const checkIns = await prisma.emotionalCheckIn.findMany({
      where: { userId: req.user.id },
      orderBy: { checkedAt: "desc" },
    });
    res.json({ checkIns: checkIns.map(c => ({ ...c, notes: decrypt(c.notes) })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch check-ins" });
  }
}

module.exports = { createCheckIn, getCheckIns };
