const router = require("express").Router();
const { authenticate } = require("../middleware/auth");
const { createCheckIn, getCheckIns } = require("../controllers/emotion");

router.post("/", authenticate, createCheckIn);
router.get("/", authenticate, getCheckIns);

module.exports = router;
