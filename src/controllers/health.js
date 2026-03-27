const prisma = require("../lib/prisma");

const METRIC_CONDITION_MAP = {
  "Blood Sugar": "Diabetes",
  "Blood Pressure": "Hypertension",
  "Heart Rate": "Cardiovascular Disease",
  "Peak Flow": "Asthma",
  "Oxygen Saturation": "Asthma",
  "Weight": null,
};

async function createLog(req, res) {
  try {
    const metric = req.body.metric || req.body.type;
    const notes = req.body.notes || req.body.note || null;
    const { value, unit } = req.body;
    let { conditionId } = req.body;

    if (!metric || !value)
      return res.status(400).json({ error: "metric/type and value are required" });

    if (!conditionId) {
      const conditionName = METRIC_CONDITION_MAP[metric];
      if (conditionName) {
        const condition = await prisma.condition.findFirst({ where: { name: conditionName } });
        conditionId = condition?.id || null;
      }
    }

    if (!conditionId)
      return res.status(400).json({ error: "conditionId is required or could not be resolved from metric type" });

    const log = await prisma.healthLog.create({
      data: { userId: req.user.id, conditionId, metric, value, unit, notes },
    });
    res.status(201).json({ log });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create health log" });
  }
}

async function getLogs(req, res) {
  try {
    const { conditionId } = req.query;
    const logs = await prisma.healthLog.findMany({
      where: { userId: req.user.id, ...(conditionId && { conditionId }) },
      orderBy: { loggedAt: "desc" },
      include: { condition: { select: { name: true } } },
    });
    res.json({ logs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch health logs" });
  }
}

async function deleteLog(req, res) {
  try {
    const { id } = req.params;
    const log = await prisma.healthLog.findUnique({ where: { id } });
    if (!log || log.userId !== req.user.id)
      return res.status(404).json({ error: "Log not found" });

    await prisma.healthLog.delete({ where: { id } });
    res.json({ message: "Log deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete health log" });
  }
}

module.exports = { createLog, getLogs, deleteLog };
