const router = require("express").Router();
const { authenticate, requireAdmin } = require("../middleware/auth");
const { createContent, getContent, markRead, myProgress } = require("../controllers/content");

router.get("/", authenticate, getContent);
router.post("/", authenticate, requireAdmin, createContent);
router.post("/:id/read", authenticate, markRead);
router.get("/progress", authenticate, myProgress);

module.exports = router;
