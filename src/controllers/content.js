const prisma = require("../lib/prisma");

async function createContent(req, res) {
  try {
    const { conditionId, category, title, body } = req.body;
    if (!title || !body)
      return res.status(400).json({ error: "title and body are required" });

    const content = await prisma.educationalContent.create({
      data: { conditionId: conditionId || null, category: category || null, title, body },
    });
    res.status(201).json({ content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create content" });
  }
}

async function getContent(req, res) {
  try {
    const { conditionId, category } = req.query;
    const where = {};
    if (conditionId) where.conditionId = conditionId;
    if (category) where.category = category;
    const content = await prisma.educationalContent.findMany({
      where,
      include: { condition: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
}

async function markRead(req, res) {
  try {
    const { id } = req.params;
    const exists = await prisma.educationalContent.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Content not found" });

    await prisma.contentProgress.upsert({
      where: { userId_contentId: { userId: req.user.id, contentId: id } },
      create: { userId: req.user.id, contentId: id },
      update: { readAt: new Date() },
    });
    res.json({ message: "Marked as read" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to mark content as read" });
  }
}

async function myProgress(req, res) {
  try {
    const progress = await prisma.contentProgress.findMany({
      where: { userId: req.user.id },
      include: { content: { select: { title: true, conditionId: true } } },
    });
    res.json({ progress });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch progress" });
  }
}

module.exports = { createContent, getContent, markRead, myProgress };
