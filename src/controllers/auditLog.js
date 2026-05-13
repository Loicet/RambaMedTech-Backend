const prisma = require('../lib/prisma');

async function getAuditLogs(req, res) {
  try {
    const { userId, action, limit = 50, offset = 0 } = req.query;

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(userId && { userId }),
        ...(action && { action }),
      },
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const total = await prisma.auditLog.count({
      where: {
        ...(userId && { userId }),
        ...(action && { action }),
      },
    });

    res.json({ logs, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
}

module.exports = { getAuditLogs };
