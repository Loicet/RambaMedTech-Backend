require("dotenv").config();
const express = require("express");
const cors = require("cors");

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

const app = express();
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:4173', 'https://ramba-med-tech.vercel.app', 'https://ramba-med-tech-mj8ozxfho-loice-tetas-projects.vercel.app'], credentials: true }));
app.use(express.json());

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

app.get("/", (req, res) => res.json({ message: "RambaMedTech API running" }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
