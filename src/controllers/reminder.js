const prisma = require('../lib/prisma');

async function getReminders(req, res) {
  try {
    const reminders = await prisma.reminder.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ reminders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
}

async function createReminder(req, res) {
  try {
    const { title, time, type } = req.body;
    if (!title || !time) return res.status(400).json({ error: 'title and time are required' });

    const reminder = await prisma.reminder.create({
      data: { userId: req.user.id, title, time, type: type || 'general' },
    });
    res.status(201).json({ reminder });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create reminder' });
  }
}

async function toggleReminder(req, res) {
  try {
    const { id } = req.params;
    const existing = await prisma.reminder.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user.id)
      return res.status(404).json({ error: 'Reminder not found' });

    const updated = await prisma.reminder.update({
      where: { id },
      data: { active: !existing.active },
    });
    res.json({ reminder: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to toggle reminder' });
  }
}

async function deleteReminder(req, res) {
  try {
    const { id } = req.params;
    const existing = await prisma.reminder.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user.id)
      return res.status(404).json({ error: 'Reminder not found' });

    await prisma.reminder.delete({ where: { id } });
    res.json({ message: 'Reminder deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete reminder' });
  }
}

module.exports = { getReminders, createReminder, toggleReminder, deleteReminder };
