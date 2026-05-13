const router = require("express").Router();
const { register, verifyOtp, resendOtp, login, me, updateProfile, forgotPassword, resetPassword } = require("../controllers/auth");
const { authenticate } = require("../middleware/auth");

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", login);
router.get("/me", authenticate, me);
router.patch("/profile", authenticate, updateProfile);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
