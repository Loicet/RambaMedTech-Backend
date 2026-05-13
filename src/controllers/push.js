const prisma = require('../lib/prisma');

async function subscribe(req, res) {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth)
      return res.status(400).json({ error: 'Invalid subscription object' });

    await prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId: req.user.id, endpoint } },
      create: { userId: req.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      update: { p256dh: keys.p256dh, auth: keys.auth },
    });

    res.status(201).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
}

async function unsubscribe(req, res) {
  try {
    const { endpoint } = req.body;
    await prisma.pushSubscription.deleteMany({
      where: { userId: req.user.id, endpoint },
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove subscription' });
  }
}

function getVapidPublicKey(req, res) {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
}

module.exports = { subscribe, unsubscribe, getVapidPublicKey };
