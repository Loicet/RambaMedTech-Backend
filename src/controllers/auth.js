const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { sendOtpEmail } = require("../lib/email");

const ROLE_MAP = { patient: "USER", caregiver: "CAREGIVER", admin: "ADMIN" };

// Step 1: validate, hash password, store OTP — do NOT create user yet
async function register(req, res) {
  try {
    const { name, email, password, role, condition } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "name, email and password are required" });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email already in use" });

    const dbRole = ROLE_MAP[role] || "USER";
    const passwordHash = await bcrypt.hash(password, 10);
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await prisma.otpRequest.upsert({
      where: { email },
      create: { email, otp, name, password: passwordHash, role: dbRole, condition: condition || null, expiresAt },
      update: { otp, name, password: passwordHash, role: dbRole, condition: condition || null, expiresAt },
    });

    // Send OTP via email
    try {
      await sendOtpEmail(email, otp, name);
    } catch (emailErr) {
      console.error('Email send failed:', emailErr.message);
      // Still return success but include otp as fallback for demo
      return res.status(200).json({ success: true, otp, emailFailed: true });
    }
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
}

// Step 2: verify OTP and create the user
async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "email and otp are required" });

    const pending = await prisma.otpRequest.findUnique({ where: { email } });
    if (!pending) return res.status(400).json({ error: "Session expired. Please register again." });
    if (new Date() > pending.expiresAt) {
      await prisma.otpRequest.delete({ where: { email } });
      return res.status(400).json({ error: "OTP expired. Please register again." });
    }
    if (pending.otp !== otp) return res.status(400).json({ error: "Incorrect code. Please try again." });

    const user = await prisma.user.create({
      data: { name: pending.name, email, passwordHash: pending.password, role: pending.role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    if (pending.condition) {
      const found = await prisma.condition.findFirst({ where: { name: pending.condition } });
      if (found) await prisma.userCondition.create({ data: { userId: user.id, conditionId: found.id } });
    }

    await prisma.otpRequest.delete({ where: { email } });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    const roleDisplay = user.role === "USER" ? "patient" : user.role.toLowerCase();
    res.status(201).json({ token, user: { ...user, role: roleDisplay } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Verification failed" });
  }
}

// Resend OTP for a pending registration
async function resendOtp(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "email is required" });

    const pending = await prisma.otpRequest.findUnique({ where: { email } });
    if (!pending) return res.status(400).json({ error: "No pending registration for this email." });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await prisma.otpRequest.update({ where: { email }, data: { otp, expiresAt } });

    try {
      const pending2 = await prisma.otpRequest.findUnique({ where: { email } });
      if (pending2) await sendOtpEmail(email, otp, pending2.name);
    } catch (emailErr) {
      console.error('Email send failed:', emailErr.message);
      return res.json({ success: true, otp, emailFailed: true });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to resend OTP" });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "email and password are required" });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const roleDisplay = user.role === "USER" ? "patient" : user.role.toLowerCase();
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: roleDisplay } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
}

async function me(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, name: true, email: true, role: true, createdAt: true,
        conditions: { include: { condition: { select: { name: true } } } },
      },
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    const roleDisplay = user.role === "USER" ? "patient" : user.role.toLowerCase();
    const condition = user.conditions[0]?.condition?.name || null;
    res.json({ user: { ...user, role: roleDisplay, condition, conditions: undefined } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
}

module.exports = { register, verifyOtp, resendOtp, login, me };
