const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth");
const Notification = require("../models/Notification");
const logger = require("../utils/logger");

router.use(authenticate);

// Get Notifications
router.get("/", async (req, res) => {
  const userId = req.user.userId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  try {
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Notification.countDocuments({ userId });
    logger.info(`Notifications fetched for user: ${userId}, page: ${page}`);
    res.json({
      notifications,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error("Get notifications error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Save Socket.io Notification
router.post("/", async (req, res) => {
  const userId = req.user.userId;
  const { message, link } = req.body;

  try {
    const notification = new Notification({
      userId,
      message,
      link,
      read: false,
    });
    await notification.save();
    logger.info(`Notification saved for user: ${userId}`);
    res.json({ message: "Notification saved", notification });
  } catch (error) {
    logger.error("Save notification error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Mark Notification as Read
router.put("/:id/read", async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const notification = await Notification.findOne({ _id: id, userId });
    if (!notification) {
      logger.warn(`Notification not found: ${id} for user: ${userId}`);
      return res.status(404).json({ message: "Notification not found" });
    }

    notification.read = true;
    await notification.save();

    logger.info(`Notification marked as read: ${id} for user: ${userId}`);
    res.json({ message: "Notification marked as read" });
  } catch (error) {
    logger.error("Mark notification read error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
