const router = require("express").Router();
const { authenticate, requireAdmin } = require("../middleware/auth");
const {
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
} = require("../controllers/community");

// Caregiver routes MUST come before /:id routes to avoid param conflicts
router.get("/caregiver/mine", authenticate, getMyPatients);
router.post("/caregiver/grant", authenticate, grantCaregiverAccess);
router.delete("/caregiver/:caregiverId", authenticate, revokeCaregiverAccess);
router.get("/caregiver/patient/:patientId", authenticate, getPatientSummary);

// Communities
router.get("/", authenticate, listCommunities);
router.post("/", authenticate, requireAdmin, createCommunity);
router.post("/:id/join", authenticate, joinCommunity);
router.delete("/:id/leave", authenticate, leaveCommunity);
router.post("/:id/streak", authenticate, incrementStreak);

// Posts
router.post("/:id/posts", authenticate, createPost);
router.get("/:id/posts", authenticate, getPosts);

module.exports = router;
