const prisma = require("../lib/prisma");

const MAX_MEMBERS = 7;

async function createCommunity(req, res) {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const community = await prisma.community.create({ data: { name, description } });
    res.status(201).json({ community });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create community" });
  }
}

async function listCommunities(req, res) {
  try {
    const communities = await prisma.community.findMany({
      include: { _count: { select: { members: true } } },
    });
    res.json({ communities });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch communities" });
  }
}

async function joinCommunity(req, res) {
  try {
    const { id } = req.params;

    const memberCount = await prisma.communityMember.count({ where: { communityId: id } });
    if (memberCount >= MAX_MEMBERS)
      return res.status(400).json({ error: "Community is full (max 7 members)" });

    const existing = await prisma.communityMember.findUnique({
      where: { userId_communityId: { userId: req.user.id, communityId: id } },
    });
    if (existing) return res.status(409).json({ error: "Already a member" });

    await prisma.communityMember.create({ data: { userId: req.user.id, communityId: id } });
    res.status(201).json({ message: "Joined community" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to join community" });
  }
}

async function leaveCommunity(req, res) {
  try {
    const { id } = req.params;
    await prisma.communityMember.deleteMany({
      where: { userId: req.user.id, communityId: id },
    });
    res.json({ message: "Left community" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to leave community" });
  }
}

async function incrementStreak(req, res) {
  try {
    const { id } = req.params;
    const member = await prisma.communityMember.findUnique({
      where: { userId_communityId: { userId: req.user.id, communityId: id } },
    });
    if (!member) return res.status(404).json({ error: "Not a member" });

    const updated = await prisma.communityMember.update({
      where: { userId_communityId: { userId: req.user.id, communityId: id } },
      data: { streak: { increment: 1 } },
    });
    res.json({ streak: updated.streak });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update streak" });
  }
}

async function createPost(req, res) {
  try {
    const { id } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "content is required" });

    const member = await prisma.communityMember.findUnique({
      where: { userId_communityId: { userId: req.user.id, communityId: id } },
    });
    if (!member) return res.status(403).json({ error: "Join the community first" });

    const post = await prisma.communityPost.create({
      data: { communityId: id, authorId: req.user.id, content },
      include: { community: { select: { name: true } } },
    });

    // Attach author name for frontend display
    const author = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { name: true },
    });

    res.status(201).json({ post: { ...post, authorName: author.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create post" });
  }
}

async function getPosts(req, res) {
  try {
    const { id } = req.params;
    const posts = await prisma.communityPost.findMany({
      where: { communityId: id },
      orderBy: { createdAt: "desc" },
      include: {
        community: { select: { name: true } },
      },
    });

    // Attach author names
    const authorIds = [...new Set(posts.map((p) => p.authorId))];
    const authors = await prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, name: true },
    });
    const authorMap = Object.fromEntries(authors.map((a) => [a.id, a.name]));

    res.json({ posts: posts.map((p) => ({ ...p, authorName: authorMap[p.authorId] || "Unknown" })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
}

async function grantCaregiverAccess(req, res) {
  try {
    const { caregiverEmail } = req.body;
    if (!caregiverEmail) return res.status(400).json({ error: "caregiverEmail is required" });

    const caregiver = await prisma.user.findUnique({ where: { email: caregiverEmail } });
    if (!caregiver) return res.status(404).json({ error: "Caregiver user not found" });
    if (caregiver.role !== "CAREGIVER")
      return res.status(400).json({ error: "That user is not registered as a caregiver" });
    if (caregiver.id === req.user.id)
      return res.status(400).json({ error: "Cannot grant access to yourself" });

    await prisma.caregiverAccess.upsert({
      where: { caregiverId_patientId: { caregiverId: caregiver.id, patientId: req.user.id } },
      create: { caregiverId: caregiver.id, patientId: req.user.id },
      update: {},
    });
    res.status(201).json({ message: "Caregiver access granted", caregiverId: caregiver.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to grant caregiver access" });
  }
}

async function revokeCaregiverAccess(req, res) {
  try {
    const { caregiverId } = req.params;
    await prisma.caregiverAccess.deleteMany({
      where: { caregiverId, patientId: req.user.id },
    });
    res.json({ message: "Caregiver access revoked" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to revoke caregiver access" });
  }
}

async function getPatientSummary(req, res) {
  try {
    const { patientId } = req.params;
    const access = await prisma.caregiverAccess.findUnique({
      where: { caregiverId_patientId: { caregiverId: req.user.id, patientId } },
    });
    if (!access) return res.status(403).json({ error: "Access not granted" });

    const [conditions, recentLogs, recentEmotions] = await Promise.all([
      prisma.userCondition.findMany({ where: { userId: patientId }, include: { condition: true } }),
      prisma.healthLog.findMany({ where: { userId: patientId }, orderBy: { loggedAt: "desc" }, take: 5 }),
      prisma.emotionalCheckIn.findMany({ where: { userId: patientId }, orderBy: { checkedAt: "desc" }, take: 5 }),
    ]);

    res.json({
      conditions: conditions.map((c) => c.condition),
      recentLogs,
      recentEmotions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch patient summary" });
  }
}

// Get all patients linked to the logged-in caregiver
async function getMyPatients(req, res) {
  try {
    const accesses = await prisma.caregiverAccess.findMany({
      where: { caregiverId: req.user.id },
      include: {
        patient: {
          select: {
            id: true, name: true, email: true,
            conditions: { include: { condition: { select: { name: true } } } },
          },
        },
      },
    });
    const patients = accesses.map((a) => ({
      ...a.patient,
      condition: a.patient.conditions[0]?.condition?.name || null,
      conditions: undefined,
      grantedAt: a.grantedAt,
    }));
    res.json({ patients });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch patients" });
  }
}

module.exports = {
  createCommunity,
  listCommunities,
  joinCommunity,
  leaveCommunity,
  incrementStreak,
  createPost,
  getPosts,
  grantCaregiverAccess,
  revokeCaregiverAccess,
  getPatientSummary,
  getMyPatients,
};
