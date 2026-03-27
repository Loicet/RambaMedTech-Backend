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

module.exports = { getStats, getUsers };
