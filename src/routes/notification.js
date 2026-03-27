const router = require("express").Router();
const { authenticate, requireAdmin } = require("../middleware/auth");
const { createNotification, getMyNotifications, markRead, markAllRead } = require("../controllers/notification");

router.get("/", authenticate, getMyNotifications);
router.post("/", authenticate, requireAdmin, createNotification);
router.patch("/read-all", authenticate, markAllRead);
router.patch("/:id/read", authenticate, markRead);

module.exports = router;
