const prisma = require('../lib/prisma');

async function getStats(req, res) {
  try {
    const [
      totalUsers, totalPatients, totalCaregivers, totalAdmins,
      totalHealthLogs, totalCheckIns, totalPosts, totalContent,
      usersByCondition,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.user.count({ where: { role: 'CAREGIVER' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.healthLog.count(),
      prisma.emotionalCheckIn.count(),
      prisma.communityPost.count(),
      prisma.educationalContent.count(),
      prisma.userCondition.groupBy({
        by: ['conditionId'],
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
      }),
    ]);

    // Resolve condition names
    const conditions = await prisma.condition.findMany({ select: { id: true, name: true } });
    const condMap = Object.fromEntries(conditions.map(c => [c.id, c.name]));
    const conditionBreakdown = usersByCondition.map(c => ({
      condition: condMap[c.conditionId] || 'Unknown',
      count: c._count.userId,
    }));
    const total = conditionBreakdown.reduce((s, c) => s + c.count, 0) || 1;
    conditionBreakdown.forEach(c => { c.pct = Math.round((c.count / total) * 100); });

    res.json({
      stats: { totalUsers, totalPatients, totalCaregivers, totalAdmins, totalHealthLogs, totalCheckIns, totalPosts, totalContent },
      conditionBreakdown,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
}

async function getUsers(req, res) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true, createdAt: true,
        conditions: { include: { condition: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const mapped = users.map(u => ({
      ...u,
      condition: u.conditions[0]?.condition?.name || '—',
      conditions: undefined,
      role: u.role === 'USER' ? 'patient' : u.role.toLowerCase(),
    }));
    res.json({ users: mapped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

async function getReports(req, res) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Monthly patient growth — last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const newPatients = await prisma.user.findMany({
      where: { role: 'USER', createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    });

    const growthMap = {};
    newPatients.forEach(u => {
      const key = `${u.createdAt.getFullYear()}-${String(u.createdAt.getMonth() + 1).padStart(2, '0')}`;
      growthMap[key] = (growthMap[key] || 0) + 1;
    });
    const growthData = Object.entries(growthMap)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Engagement stats
    const [totalPatients, activePatients, totalLogs] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.user.count({
        where: {
          role: 'USER',
          healthLogs: { some: { loggedAt: { gte: thirtyDaysAgo } } },
        },
      }),
      prisma.healthLog.count(),
    ]);

    const avgLogsPerPatient = totalPatients > 0 ? Math.round((totalLogs / totalPatients) * 10) / 10 : 0;

    // Mood improvement by condition cohort
    const conditions = await prisma.condition.findMany({ select: { id: true, name: true } });
    const MOOD_SCORE = { GREAT: 5, GOOD: 4, OKAY: 3, LOW: 2, BAD: 1 };

    const moodCohorts = await Promise.all(
      conditions.map(async (cond) => {
        const patients = await prisma.userCondition.findMany({
          where: { conditionId: cond.id },
          select: { userId: true, assignedAt: true },
        });
        if (patients.length === 0) return null;

        const patientIds = patients.map(p => p.userId);

        const [earlyCheckIns, recentCheckIns] = await Promise.all([
          prisma.emotionalCheckIn.findMany({
            where: { userId: { in: patientIds } },
            orderBy: { checkedAt: 'asc' },
            take: patientIds.length * 3,
            select: { emotion: true },
          }),
          prisma.emotionalCheckIn.findMany({
            where: { userId: { in: patientIds }, checkedAt: { gte: thirtyDaysAgo } },
            select: { emotion: true },
          }),
        ]);

        const avg = (arr) => {
          if (arr.length === 0) return null;
          const sum = arr.reduce((s, c) => s + (MOOD_SCORE[c.emotion] || 0), 0);
          return Math.round((sum / arr.length) * 10) / 10;
        };

        const avgMoodAtJoin = avg(earlyCheckIns);
        const avgMoodRecent = avg(recentCheckIns);
        const improvement = avgMoodAtJoin !== null && avgMoodRecent !== null
          ? Math.round((avgMoodRecent - avgMoodAtJoin) * 10) / 10
          : null;

        return { condition: cond.name, patientCount: patients.length, avgMoodAtJoin, avgMoodRecent, improvement };
      })
    );

    res.json({
      growthData,
      engagement: { totalPatients, activePatients, inactivePatients: totalPatients - activePatients, avgLogsPerPatient },
      moodCohorts: moodCohorts.filter(Boolean),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
}

module.exports = { getStats, getUsers, getReports };