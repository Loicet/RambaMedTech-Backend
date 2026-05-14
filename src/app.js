const express = require("express");
const cors = require("cors");
const { startMissedLogChecker } = require('./lib/missedLogChecker');

// keep process alive
process.stdin.resume();

const authRoutes = require("./routes/auth");
const healthRoutes = require("./routes/health");
const contentRoutes = require("./routes/content");
const emotionRoutes = require("./routes/emotion");
const communityRoutes = require("./routes/community");
const notificationRoutes = require("./routes/notification");
const conditionRoutes = require("./routes/condition");
const inviteRoutes = require("./routes/invite");
const consentRoutes = require("./routes/consent");
const adminRoutes = require("./routes/admin");
const reminderRoutes = require("./routes/reminder");
const pushRoutes = require("./routes/push");
const ussdRoutes = require("./routes/ussd");
const { startReminderScheduler } = require("./lib/scheduler");

const app = express();
app.use(cors({
  origin: function(origin, callback) {
    const allowed = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:4173',
      'https://ramba-med-tech.vercel.app',
      'https://ramba-med-tech-mj8ozxfho-loice-tetas-projects.vercel.app',
    ];
    // Allow Africa's Talking (no origin) and all allowed origins
    if (!origin || allowed.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true); // allow all for USSD webhook
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/api/auth", authRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/emotions", emotionRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/conditions", conditionRoutes);
app.use("/api/invites", inviteRoutes);
app.use("/api/consent", consentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/push", pushRoutes);
app.use("/api/ussd", ussdRoutes);

app.get("/", (req, res) => res.json({ message: "RambaMedTech API running -----" }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startReminderScheduler();
  startMissedLogChecker();
});
