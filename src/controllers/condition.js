const prisma = require("../lib/prisma");

async function listConditions(req, res) {
  try {
    const conditions = await prisma.condition.findMany({ orderBy: { name: "asc" } });
    res.json({ conditions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch conditions" });
  }
}

async function createCondition(req, res) {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const condition = await prisma.condition.create({ data: { name, description } });
    res.status(201).json({ condition });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create condition" });
  }
}

async function addUserCondition(req, res) {
  try {
    const { conditionId } = req.body;
    if (!conditionId) return res.status(400).json({ error: "conditionId is required" });

    const exists = await prisma.userCondition.findUnique({
      where: { userId_conditionId: { userId: req.user.id, conditionId } },
    });
    if (exists) return res.status(409).json({ error: "Condition already added" });

    await prisma.userCondition.create({ data: { userId: req.user.id, conditionId } });
    res.status(201).json({ message: "Condition added" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add condition" });
  }
}

async function removeUserCondition(req, res) {
  try {
    const { conditionId } = req.params;
    await prisma.userCondition.deleteMany({
      where: { userId: req.user.id, conditionId },
    });
    res.json({ message: "Condition removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove condition" });
  }
}

async function myConditions(req, res) {
  try {
    const records = await prisma.userCondition.findMany({
      where: { userId: req.user.id },
      include: { condition: true },
    });
    res.json({ conditions: records.map((r) => r.condition) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch your conditions" });
  }
}

module.exports = { listConditions, createCondition, addUserCondition, removeUserCondition, myConditions };
