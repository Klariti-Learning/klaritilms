const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Announcement = require("../models/Announcement");
const User = require("../models/User");
const Batch = require("../models/Batch");
const authenticate = require("../middleware/auth");
const logger = require("../utils/logger");
const upload = require("../config/multer"); 
const { uploadCourseFileToDrive } = require("../services/googleDriveService");
const fs = require("fs");

const deleteLocalFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Local file deleted: ${filePath}`);
    }
  } catch (error) {
    logger.error(`Failed to delete local file ${filePath}: ${error.message}`);
  }
};

const mimeToType = {
  "video/mp4": "video",
  "audio/mpeg": "audio",
  "audio/wav": "audio",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "doc",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "ppt",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

// POST: Create an Announcement
router.post(
  "/",
  authenticate,
  upload.single("attachment"),
  async (req, res) => {
    try {
      const { name, date, timing, announcement } = req.body;
      const teacherId = req.user.userId;

      const teacher = await User.findById(teacherId).populate("role");
      if (!teacher || teacher.role.roleName !== "Teacher") {
        logger.warn(`Unauthorized announcement post attempt by user: ${teacherId}`);
        return res.status(403).json({ message: "Not authorized to post announcements" });
      }

      if (!name || !announcement) {
        logger.warn("Missing required fields in announcement creation");
        return res.status(400).json({ message: "Name and announcement are required" });
      }

      if (date && isNaN(Date.parse(date))) {
        logger.warn("Invalid date format provided");
        return res.status(400).json({ message: "Invalid date format" });
      }

      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (timing && !timeRegex.test(timing)) {
        logger.warn("Invalid timing format provided");
        return res.status(400).json({ message: "Invalid timing format (use HH:mm)" });
      }

      const announcementData = {
        name,
        date: date || new Date(),
        timing: timing || new Date().toTimeString().slice(0, 5),
        announcement,
        teacherId,
      };

      if (req.file) {
        if (!Object.keys(mimeToType).includes(req.file.mimetype)) {
          logger.warn(`Unsupported file type: ${req.file.mimetype}`);
          return res.status(400).json({ message: "Unsupported file type" });
        }

        try {
          const { fileId, webViewLink } = await uploadCourseFileToDrive(
            req.file.path,
            req.file.originalname,
            req.file.mimetype,
            name
          );
          announcementData.attachment = {
            type: mimeToType[req.file.mimetype] || req.file.mimetype.split("/")[1],
            url: webViewLink,
            fileId,
            name: req.file.originalname,
            uploadedBy: teacherId,
            uploadedAt: new Date(),
          };
        } catch (uploadError) {
          logger.error(`Google Drive upload failed: ${uploadError.message}`);
          deleteLocalFile(req.file.path);
          return res.status(500).json({ message: "Failed to upload file to Google Drive", error: uploadError.message });
        }
        deleteLocalFile(req.file.path);
      }

      const newAnnouncement = new Announcement(announcementData);
      await newAnnouncement.save();

      logger.info(`Announcement ${newAnnouncement._id} created by teacher ${teacherId}`);
      res.status(201).json({ message: "Announcement created successfully", announcement: newAnnouncement });
    } catch (error) {
      logger.error(`Create announcement error: ${error.message}`);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// POST: Create an Announcement for specific Batch
router.post(
  "/:batchId",
  authenticate,
  upload.single("attachment"),
  async (req, res) => {
    try {
      const { name, date, timing, announcement } = req.body;
      const { batchId } = req.params; 
      const teacherId = req.user.userId;

      const teacher = await User.findById(teacherId).populate("role");
      if (!teacher || teacher.role.roleName !== "Teacher") {
        logger.warn(`Unauthorized announcement post attempt by user: ${teacherId}`);
        return res.status(403).json({ message: "Not authorized to post announcements" });
      }

      if (!mongoose.isValidObjectId(batchId)) {
        logger.warn(`Invalid batchId: ${batchId}`);
        return res.status(400).json({ message: "Invalid batch ID" });
      }

      const batch = await Batch.findOne({ _id: batchId, teacherId, isDeleted: false });
      if (!batch) {
        logger.warn(`Batch ${batchId} not found or teacher ${teacherId} not assigned`);
        return res.status(403).json({ message: "Batch not found or you are not assigned to this batch" });
      }

      if (!name || !announcement) {
        logger.warn("Missing required fields in announcement creation");
        return res.status(400).json({ message: "Name and announcement are required" });
      }

      if (date && isNaN(Date.parse(date))) {
        logger.warn("Invalid date format provided");
        return res.status(400).json({ message: "Invalid date format" });
      }

      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (timing && !timeRegex.test(timing)) {
        logger.warn("Invalid timing format provided");
        return res.status(400).json({ message: "Invalid timing format (use HH:mm)" });
      }

      const announcementData = {
        name,
        date: date || new Date(),
        timing: timing || new Date().toTimeString().slice(0, 5),
        announcement,
        teacherId,
        batchId, 
      };

      if (req.file) {
        if (!Object.keys(mimeToType).includes(req.file.mimetype)) {
          logger.warn(`Unsupported file type: ${req.file.mimetype}`);
          return res.status(400).json({ message: "Unsupported file type" });
        }

        try {
          const { fileId, webViewLink } = await uploadCourseFileToDrive(
            req.file.path,
            req.file.originalname,
            req.file.mimetype,
            name
          );
          announcementData.attachment = {
            type: mimeToType[req.file.mimetype] || req.file.mimetype.split("/")[1],
            url: webViewLink,
            fileId,
            name: req.file.originalname,
            uploadedBy: teacherId,
            uploadedAt: new Date(),
          };
        } catch (uploadError) {
          logger.error(`Google Drive upload failed: ${uploadError.message}`);
          deleteLocalFile(req.file.path);
          return res.status(500).json({ message: "Failed to upload file to Google Drive", error: uploadError.message });
        }
        deleteLocalFile(req.file.path);
      }

      const newAnnouncement = new Announcement(announcementData);
      await newAnnouncement.save();

      logger.info(`Announcement ${newAnnouncement._id} created for batch ${batchId} by teacher ${teacherId}`);
      res.status(201).json({ message: "Announcement created successfully", announcement: newAnnouncement });
    } catch (error) {
      logger.error(`Create announcement error: ${error.message}`);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// GET: Fetch Announcements with optional batchId query parameter
router.get("/", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { batchId } = req.query;
    const user = await User.findById(userId).populate("role");

    let announcements;

    if (batchId && !mongoose.isValidObjectId(batchId)) {
      logger.warn(`Invalid batchId: ${batchId}`);
      return res.status(400).json({ message: "Invalid batch ID" });
    }

    if (user.role.roleName === "Admin" || user.role.roleName === "Super Admin") {
      const query = batchId ? { batchId, teacherId: { $exists: true } } : {};
      announcements = await Announcement.find(query).populate("teacherId", "name _id").populate("batchId", "name _id");
    } else if (user.role.roleName === "Student") {
      const student = await User.findById(userId).populate("batches");
      if (!student.batches || student.batches.length === 0) {
        logger.info(`No batches found for student ${userId}`);
        return res.status(200).json({ announcements: [] });
      }

      const studentBatches = student.batches.filter((batch) =>
        batch.studentIds.some((s) => s.studentId.equals(userId) && s.isInThisBatch)
      );
      const batchIds = studentBatches
        .map((batch) => batch._id)
        .filter((id) => mongoose.isValidObjectId(id));

      if (batchId && !batchIds.some((id) => id.equals(batchId))) {
        logger.warn(`Student ${userId} not enrolled in batch ${batchId}`);
        return res.status(403).json({ message: "Not enrolled in this batch" });
      }

      const query = batchId ? { batchId } : { batchId: { $in: batchIds } };
      announcements = await Announcement.find(query).populate("teacherId", "name _id").populate("batchId", "name _id");
    } else if (user.role.roleName === "Teacher") {
      const query = batchId ? { teacherId: userId, batchId } : { teacherId: userId };
      announcements = await Announcement.find(query).populate("teacherId", "name _id").populate("batchId", "name _id");
    } else {
      logger.warn(`Unauthorized announcement fetch attempt by user: ${userId}`);
      return res.status(403).json({ message: "Not authorized to fetch announcements" });
    }

    logger.info(`Announcements fetched for user ${userId}: ${announcements.length} announcements`);
    res.json({ announcements });
  } catch (error) {
    logger.error(`Fetch announcements error: ${error.message}`);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;