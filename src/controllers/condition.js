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

    const condition = await prisma.condition.findUnique({ where: { id: conditionId } });
    if (!condition) return res.status(404).json({ error: "Condition not found" });

    await prisma.userCondition.upsert({
      where: { userId_conditionId: { userId: req.user.id, conditionId } },
      create: { userId: req.user.id, conditionId },
      update: {},
    });

    // Auto-join the matching community
    const community = await prisma.community.findFirst({ where: { conditionName: condition.name } });
    if (community) {
      await prisma.communityMember.upsert({
        where: { userId_communityId: { userId: req.user.id, communityId: community.id } },
        create: { userId: req.user.id, communityId: community.id },
        update: {},
      });
    }

    res.status(201).json({ message: "Condition added", condition, community: community || null });
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
