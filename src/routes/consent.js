const router = require("express").Router();
const { authenticate } = require("../middleware/auth");
const { getConsent, updateConsent } = require("../controllers/consent");

router.get("/", authenticate, getConsent);
router.get("/:patientId", authenticate, getConsent);
router.patch("/", authenticate, updateConsent);

module.exports = router;
