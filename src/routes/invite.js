const router = require("express").Router();
const { authenticate } = require("../middleware/auth");
const { sendInvite, redeemInvite, revokeInvite, getMyInvites, getMyPatients } = require("../controllers/invite");

router.post("/send", authenticate, sendInvite);
router.post("/redeem", authenticate, redeemInvite);
router.delete("/:code", authenticate, revokeInvite);
router.get("/mine", authenticate, getMyInvites);
router.get("/patients", authenticate, getMyPatients);

module.exports = router;
