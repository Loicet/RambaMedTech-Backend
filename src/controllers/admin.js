const prisma = require('../lib/prisma');

const EMOTION_SCORE = { GREAT: 5, GOOD: 4, OKAY: 3, LOW: 2, BAD: 1 };

async function getReports(req, res) {
  try {
    const now = new Date();
    const oneYearAgo = new Date(now - 365 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // Monthly new user signups (last 6 months)
    const sixMonthsAgo = new Date(now - 180 * 24 * 60 * 60 * 1000);
    const recentUsers = await prisma.user.findMany({
      where: { createdAt: { gte: sixMonthsAgo }, role: 'USER' },
      select: { createdAt: true },
    });
    const monthlyGrowth = {};
    recentUsers.forEach(u => {
      const key = u.createdAt.toISOString().slice(0, 7); // YYYY-MM
      monthlyGrowth[key] = (monthlyGrowth[key] || 0) + 1;
    });
    const growthData = Object.entries(monthlyGrowth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));

    // Cohort mood improvement: avg mood at first 30 days vs last 30 days, per condition
    const conditions = await prisma.condition.findMany({ select: { id: true, name: true } });
    const moodCohorts = [];
    for (const condition of conditions) {
      const patientIds = (await prisma.userCondition.findMany({
        where: { conditionId: condition.id },
        select: { userId: true },
      })).map(r => r.userId);

      if (patientIds.length === 0) continue;

      // Get each patient's join date
      const patients = await prisma.user.findMany({
        where: { id: { in: patientIds } },
        select: { id: true, createdAt: true },
      });

      let earlyScores = [], recentScores = [];
      for (const p of patients) {
        const firstMonth = new Date(p.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
        const [early, recent] = await Promise.all([
          prisma.emotionalCheckIn.findMany({
            where: { userId: p.id, checkedAt: { lte: firstMonth } },
            select: { emotion: true },
          }),
          prisma.emotionalCheckIn.findMany({
            where: { userId: p.id, checkedAt: { gte: thirtyDaysAgo } },
            select: { emotion: true },
          }),
        ]);
        early.forEach(e => earlyScores.push(EMOTION_SCORE[e.emotion] || 3));
        recent.forEach(e => recentScores.push(EMOTION_SCORE[e.emotion] || 3));
      }

      const avg = arr => arr.length ? +(arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(2) : null;
      moodCohorts.push({
        condition: condition.name,
        patientCount: patientIds.length,
        avgMoodAtJoin: avg(earlyScores),
        avgMoodRecent: avg(recentScores),
        improvement: (avg(earlyScores) !== null && avg(recentScores) !== null)
          ? +(avg(recentScores) - avg(earlyScores)).toFixed(2) : null,
      });
    }

    // Engagement: active vs inactive patients (logged in last 30 days)
    const allPatients = await prisma.user.findMany({
      where: { role: 'USER' },
      select: { id: true },
    });
    const activeIds = new Set(
      (await prisma.healthLog.findMany({
        where: { loggedAt: { gte: thirtyDaysAgo } },
        select: { userId: true },
        distinct: ['userId'],
      })).map(l => l.userId)
    );
    const activePatients = allPatients.filter(p => activeIds.has(p.id)).length;
    const inactivePatients = allPatients.length - activePatients;

    // Avg logs per active patient
    const totalLogs = await prisma.healthLog.count({ where: { loggedAt: { gte: thirtyDaysAgo } } });
    const avgLogsPerPatient = activePatients > 0 ? +(totalLogs / activePatients).toFixed(1) : 0;

    res.json({
      growthData,
      moodCohorts,
      engagement: { activePatients, inactivePatients, avgLogsPerPatient, totalPatients: allPatients.length },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
}

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
      },
      orderBy: { createdAt: 'desc' },
    });
    const mapped = users.map(u => ({
      ...u,
      role: u.role === 'USER' ? 'patient' : u.role.toLowerCase(),
    }));
    res.json({ users: mapped });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

module.exports = { getStats, getUsers, getReports };
