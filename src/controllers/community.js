const prisma = require("../lib/prisma");
const { audit } = require('../lib/audit');

// Helper: create a DB notification
async function notify(userId, title, message) {
  try {
    await prisma.notification.create({ data: { userId, title, message } });
  } catch (e) {
    console.error('notify error:', e.message);
  }
}

async function createCommunity(req, res) {
  try {
    const { name, description, conditionName } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const community = await prisma.community.create({ data: { name, description, conditionName: conditionName || null } });
    res.status(201).json({ community });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create community" });
  }
}

async function listCommunities(req, res) {
  try {
    // Patients only see communities matching their condition(s)
    // Admins/caregivers see all
    let where = {};
    if (req.user.role === 'USER') {
      const userConditions = await prisma.userCondition.findMany({
        where: { userId: req.user.id },
        include: { condition: true },
      });
      const conditionNames = userConditions.map(uc => uc.condition.name);
      // Show communities that match their condition OR have no condition restriction
      where = {
        OR: [
          { conditionName: { in: conditionNames } },
          { conditionName: null },
        ],
      };
    }

    const communities = await prisma.community.findMany({
      where,
      include: {
        _count: { select: { members: true } },
        members: { where: { userId: req.user.id }, select: { userId: true } },
      },
    });

    res.json({
      communities: communities.map(c => ({
        ...c,
        isMember: c.members.length > 0,
        members: undefined,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch communities" });
  }
}

async function joinCommunity(req, res) {
  try {
    const { id } = req.params;

    // Upsert — if already a member just return success
    await prisma.communityMember.upsert({
      where: { userId_communityId: { userId: req.user.id, communityId: id } },
      create: { userId: req.user.id, communityId: id },
      update: {},
    });
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

    // Auto-join if not already a member (handles users registered before auto-join was added)
    await prisma.communityMember.upsert({
      where: { userId_communityId: { userId: req.user.id, communityId: id } },
      create: { userId: req.user.id, communityId: id },
      update: {},
    });

    const [post, author] = await Promise.all([
      prisma.communityPost.create({
        data: { communityId: id, authorId: req.user.id, content },
        include: { community: { select: { name: true } } },
      }),
      prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } }),
    ]);

    res.status(201).json({ post: { ...post, authorName: author.name } });

    // Notify all other community members about the new post
    const otherMembers = await prisma.communityMember.findMany({
      where: { communityId: id, NOT: { userId: req.user.id } },
      select: { userId: true },
    });
    await Promise.all(
      otherMembers.map(m =>
        notify(m.userId, `New post in ${post.community.name}`, `${author.name} posted: "${content.slice(0, 80)}${content.length > 80 ? '...' : ''}"`))
    );
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
      orderBy: { createdAt: 'desc' },
      include: {
        community: { select: { name: true } },
        likes: { select: { userId: true } },
        _count: { select: { comments: true } },
      },
    });

    const authorIds = [...new Set(posts.map((p) => p.authorId))];
    const authors = await prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, name: true },
    });
    const authorMap = Object.fromEntries(authors.map((a) => [a.id, a.name]));

    res.json({
      posts: posts.map((p) => ({
        ...p,
        authorName: authorMap[p.authorId] || 'Unknown',
        likeCount: p.likes.length,
        likedByMe: p.likes.some(l => l.userId === req.user.id),
        commentCount: p._count.comments,
        likes: undefined,
        _count: undefined,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
}

async function editPost(req, res) {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'content is required' });
    const post = await prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.authorId !== req.user.id) return res.status(403).json({ error: 'Not your post' });
    const updated = await prisma.communityPost.update({ where: { id: postId }, data: { content, edited: true } });
    res.json({ post: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to edit post' });
  }
}

async function deletePost(req, res) {
  try {
    const { postId } = req.params;
    const post = await prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.authorId !== req.user.id) return res.status(403).json({ error: 'Not your post' });
    await prisma.communityPost.delete({ where: { id: postId } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
}

async function toggleLike(req, res) {
  try {
    const { postId } = req.params;
    const existing = await prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId: req.user.id } },
    });

    if (existing) {
      await prisma.postLike.delete({ where: { postId_userId: { postId, userId: req.user.id } } });
    } else {
      await prisma.postLike.create({ data: { postId, userId: req.user.id } });
    }

    const [likeCount, post, liker] = await Promise.all([
      prisma.postLike.count({ where: { postId } }),
      prisma.communityPost.findUnique({ where: { id: postId }, select: { authorId: true } }),
      prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } }),
    ]);

    res.json({ liked: !existing, likeCount });

    // Notify post author when someone likes (not when unliking, not self-like)
    if (!existing && post && post.authorId !== req.user.id) {
      await notify(post.authorId, 'Someone liked your post', `${liker.name} liked your post.`);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
}

async function getComments(req, res) {
  try {
    const { postId } = req.params;
    const comments = await prisma.postComment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
    });

    const authorIds = [...new Set(comments.map(c => c.authorId))];
    const authors = await prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, name: true },
    });
    const authorMap = Object.fromEntries(authors.map(a => [a.id, a.name]));

    res.json({ comments: comments.map(c => ({ ...c, authorName: authorMap[c.authorId] || 'Unknown' })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
}

async function addComment(req, res) {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'content is required' });

    const [comment, author, post] = await Promise.all([
      prisma.postComment.create({ data: { postId, authorId: req.user.id, content } }),
      prisma.user.findUnique({ where: { id: req.user.id }, select: { name: true } }),
      prisma.communityPost.findUnique({ where: { id: postId }, select: { authorId: true } }),
    ]);

    res.status(201).json({ comment: { ...comment, authorName: author.name } });

    // Notify post author (if not the same person commenting)
    if (post && post.authorId !== req.user.id) {
      await notify(post.authorId, 'New comment on your post', `${author.name} commented: "${content.slice(0, 80)}${content.length > 80 ? '...' : ''}"`);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add comment' });
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

    await audit('PATIENT_DATA_ACCESSED', { userId: req.user.id, details: `Caregiver accessed patient ${patientId}`, req });

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
  editPost,
  deletePost,
  toggleLike,
  getComments,
  addComment,
  grantCaregiverAccess,
  revokeCaregiverAccess,
  getPatientSummary,
  getMyPatients,
};
