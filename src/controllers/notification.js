const prisma = require("../lib/prisma");

async function createNotification(req, res) {
  try {
    const { userId, title, message } = req.body;
    if (!userId || !title || !message)
      return res.status(400).json({ error: "userId, title and message are required" });

    const notification = await prisma.notification.create({ data: { userId, title, message } });
    res.status(201).json({ notification });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create notification" });
  }
}

async function getMyNotifications(req, res) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ notifications });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
}

async function markRead(req, res) {
  try {
    const { id } = req.params;
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== req.user.id)
      return res.status(404).json({ error: "Notification not found" });

    const updated = await prisma.notification.update({ where: { id }, data: { isRead: true } });
    res.json({ notification: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
}

async function markAllRead(req, res) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to mark all notifications as read" });
  }
}

module.exports = { createNotification, getMyNotifications, markRead, markAllRead };
