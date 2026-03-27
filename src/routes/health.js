const router = require("express").Router();
const { authenticate } = require("../middleware/auth");
const { createLog, getLogs, deleteLog } = require("../controllers/health");

router.post("/logs", authenticate, createLog);
router.get("/logs", authenticate, getLogs);
router.delete("/logs/:id", authenticate, deleteLog);

module.exports = router;
