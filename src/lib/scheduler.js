const cron = require('node-cron');
const prisma = require('./prisma');
const { sendPushToUser } = require('./push');

function startReminderScheduler() {
  // Runs every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const reminders = await prisma.reminder.findMany({
        where: { active: true, time: currentTime },
        include: { user: { select: { id: true, name: true } } },
      });

      if (reminders.length === 0) return;

      await Promise.allSettled(
        reminders.map((reminder) =>
          sendPushToUser(
            reminder.userId,
            `⏰ ${reminder.title}`,
            `Hi ${reminder.user.name}, this is your ${reminder.type} reminder.`,
            { type: 'reminder', reminderId: reminder.id }
          )
        )
      );
    } catch (err) {
      console.error('Reminder scheduler error:', err.message);
    }
  });

  console.log('✅ Reminder scheduler started');
}

module.exports = { startReminderScheduler };
