const prisma = require('./prisma');

async function audit(action, { userId = null, details = null, req = null } = {}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details,
        ipAddress: req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null) : null,
        userAgent: req ? (req.headers['user-agent'] || null) : null,
      },
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

module.exports = { audit };
