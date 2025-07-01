const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const { connectRedis } = require("./config/redis");
const { initializeSocket } = require("./config/socket");
const http = require("http");
const logger = require("./utils/logger");

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

initializeSocket(server);

const allowedOrigin = process.env.BASE_URL;

app.use(helmet());
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || origin === allowedOrigin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

app.use(morgan("combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

const initializeRoutesAndJobs = () => {
  const authRoutes = require("./routes/auth");
  const adminRoutes = require("./routes/admin");
  const notificationRoutes = require("./routes/notification");
  const scheduleRoutes = require("./routes/schedule");
  const recordingsRoutes = require("./routes/recording");
  const ticketRoutes = require("./routes/ticket");
  const userRoutes = require("./routes/users");
  const courseRoutes = require("./routes/course");
  const driveRoutes = require("./routes/drive");
  const demoClassRoutes = require("./routes/democlass");

  const { startPreCallNotifications } = require("./jobs/preCallNotifications");
  const { startScheduler } = require("./jobs/scheduler");

  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/schedule", scheduleRoutes);
  app.use("/api/recordings", recordingsRoutes);
  app.use("/api/tickets", ticketRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/courses", courseRoutes);
  app.use("/api/drive", driveRoutes);
  app.use("/api/demo-class", demoClassRoutes);

  startPreCallNotifications();
  startScheduler();
};

initializeRoutesAndJobs();

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is healthy" });
});

app.use((err, req, res, next) => {
  logger.error("Server error:", err);
  res.status(500).json({ message: "Server error", error: err.message });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`CORS allowed for: ${allowedOrigin}`);
  await connectRedis();
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  logger.error("Unhandled Rejection:", err);
  process.exit(1);
});