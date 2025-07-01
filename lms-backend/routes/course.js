const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const authenticate = require("../middleware/auth");
const Course = require("../models/Course");
const Batch = require("../models/Batch");
const User = require("../models/User");
const Role = require("../models/Role");
const ScheduledCall = require("../models/ScheduledCall");
const Notification = require("../models/Notification");
const upload = require("../config/multer");
const logger = require("../utils/logger");
const { getIO } = require("../config/socket");
const fs = require("fs");
const {
  sendCourseAssignedEmail,
  sendCourseCreatedEmail,
  sendBatchCreatedEmail,
  sendBatchDeletedEmail,
  sendCourseEditedEmail,
  sendCourseDeletedEmail,
  sendBatchCourseEditedEmail,
  sendStudentCourseEditedEmail,
  sendCourseUnassignedEmail,
  sendTeacherCourseEditedEmail,
} = require("../services/emailService");
const { uploadCourseFileToDrive } = require("../services/googleDriveService");
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
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "doc",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "ppt",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

// Admin: Create a Course
router.post(
  "/create",
  authenticate,
  upload.any(),
  [
    check("title").notEmpty().withMessage("Course title is required"),
    check("chapters")
      .custom((value) => {
        try {
          const parsed = typeof value === "string" ? JSON.parse(value) : value;
          if (!Array.isArray(parsed)) {
            throw new Error("Chapters must be an array");
          }
          parsed.forEach((chapter, index) => {
            if (!chapter.title?.trim()) {
              throw new Error(`Chapter ${index + 1} title is required`);
            }
            if (!Array.isArray(chapter.lessons)) {
              throw new Error(`Lessons in chapter ${index + 1} must be an array`);
            }
            chapter.lessons.forEach((lesson, lessonIndex) => {
              if (!lesson.title?.trim()) {
                throw new Error(
                  `Lesson ${lessonIndex + 1} title in chapter ${index + 1} is required`
                );
              }
              if (
                !["video", "audio", "pdf", "word", "ppt", "jpg", "png", "gif", "avif", "webp", "svg"].includes(
                  lesson.format
                )
              ) {
                throw new Error(
                  `Invalid format for lesson ${lessonIndex + 1} in chapter ${index + 1}`
                );
              }
              if (!Array.isArray(lesson.learningGoals)) {
                throw new Error(
                  `Learning goals for lesson ${lessonIndex + 1} in chapter ${index + 1} must be an array`
                );
              }
            });
          });
          return true;
        } catch (error) {
          throw new Error(error.message || "Chapters must be a valid JSON array");
        }
      })
      .withMessage("Chapters must be a valid JSON array"),
    check("targetAudience").notEmpty().withMessage("Target audience is required"),
    check("duration").notEmpty().withMessage("Course duration is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Validation errors in create course:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, chapters, targetAudience, duration } = req.body;
    const adminId = req.user.userId;

    try {
      const admin = await User.findById(adminId).populate("role");
      if (!admin || !["Admin", "Super Admin"].includes(admin.role.roleName)) {
        logger.warn(`Unauthorized course creation attempt by user: ${adminId}`);
        return res.status(403).json({ message: "Not authorized" });
      }

      const parsedChapters = typeof chapters === "string" ? JSON.parse(chapters) : chapters;

      const resources = {};
      const worksheets = {};
      let courseFolderId = null;

      for (const file of req.files || []) {
        if (file.fieldname.startsWith("resources")) {
          const match = file.fieldname.match(/resources\[(\d+)\]\[(\d+)\]/);
          if (!match) {
            logger.warn(`Invalid resource field name: ${file.fieldname}`);
            return res.status(400).json({
              message: `Invalid resource field name: ${file.fieldname}`,
            });
          }
          const chapterIndex = parseInt(match[1], 10);
          const lessonIndex = parseInt(match[2], 10);
          const { fileId, webViewLink, courseFolderId: uploadedFolderId } = await uploadCourseFileToDrive(
            file.path,
            file.originalname,
            file.mimetype,
            title
          );
          courseFolderId = uploadedFolderId;
          const resource = {
            type: mimeToType[file.mimetype] || file.mimetype.split("/")[1],
            url: webViewLink,
            fileId,
            name: file.originalname,
            uploadedBy: adminId,
          };
          if (!resources[chapterIndex]) resources[chapterIndex] = {};
          if (!resources[chapterIndex][lessonIndex]) resources[chapterIndex][lessonIndex] = [];
          resources[chapterIndex][lessonIndex].push(resource);
          deleteLocalFile(file.path);
        }
        else if (file.fieldname.startsWith("worksheets")) {
          const match = file.fieldname.match(/worksheets\[(\d+)\]\[(\d+)\]/);
          if (!match) {
            logger.warn(`Invalid worksheet field name: ${file.fieldname}`);
            return res.status(400).json({
              message: `Invalid worksheet field name: ${file.fieldname}`,
            });
          }
          const chapterIndex = parseInt(match[1], 10);
          const lessonIndex = parseInt(match[2], 10);
          const { fileId, webViewLink, courseFolderId: uploadedFolderId } = await uploadCourseFileToDrive(
            file.path,
            file.originalname,
            file.mimetype,
            title
          );
          courseFolderId = uploadedFolderId;
          const worksheet = {
            type: mimeToType[file.mimetype] || file.mimetype.split("/")[1],
            url: webViewLink,
            fileId,
            name: file.originalname,
            uploadedBy: adminId,
          };
          if (!worksheets[chapterIndex]) worksheets[chapterIndex] = {};
          if (!worksheets[chapterIndex][lessonIndex]) worksheets[chapterIndex][lessonIndex] = [];
          worksheets[chapterIndex][lessonIndex].push(worksheet);
          deleteLocalFile(file.path);
        }
      }

      const formattedChapters = parsedChapters.map((chapter, chapterIndex) => {
        const lessons = chapter.lessons.map((lesson, lessonIndex) => {
          const lessonResources = resources[chapterIndex]?.[lessonIndex] || [];
          const lessonWorksheets = worksheets[chapterIndex]?.[lessonIndex] || [];
          const expectedType = lesson.format === "word" ? "doc" : lesson.format;
          if (!lessonResources.every((res) => res.type === expectedType)) {
            throw new Error(
              `Resource type mismatch for lesson ${lessonIndex + 1} in chapter ${chapterIndex + 1}`
            );
          }
          
          if (lessonWorksheets.length > 0 && !lessonWorksheets.every((ws) => ws.type === expectedType)) {
            throw new Error(
              `Worksheet type mismatch for lesson ${lessonIndex + 1} in chapter ${chapterIndex + 1}`
            );
          }
          return {
            title: lesson.title,
            format: lesson.format,
            learningGoals: lesson.learningGoals.filter((goal) => goal?.trim()),
            resources: lessonResources,
            worksheets: lessonWorksheets,
            order: lessonIndex + 1,
          };
        });
        return {
          title: chapter.title,
          lessons,
          order: chapterIndex + 1,
        };
      });

      const course = new Course({
        title,
        chapters: formattedChapters,
        targetAudience,
        duration,
        createdBy: adminId,
        assignedTeachers: [],
        lastUpdatedBy: adminId,
        lastUpdatedAt: Date.now(),
        driveFolderId: courseFolderId,
      });
      await course.save();

      const admins = await User.find({
        role: {
          $in: await Role.find({ roleName: { $in: ["Admin", "Super Admin"] } }),
        },
      });
      const notifications = admins.map((admin) =>
        new Notification({
          userId: admin._id,
          message: `New course "${title}" created by ${admin.name}`,
          link: `${process.env.BASE_URL}/admin/courses/${course._id}`,
        }).save()
      );

      const emailNotifications = admins.map((admin) =>
        sendCourseCreatedEmail(
          admin.email,
          admin.name,
          course._id,
          `New course "${title}" created by ${admin.name}`
        )
      );

      await Promise.all([...notifications, ...emailNotifications]);

      admins.forEach((admin) => {
        getIO()
          .to(admin._id.toString())
          .emit("notification", {
            message: `New course "${title}" created by ${admin.name}`,
            link: `${process.env.BASE_URL}/admin/courses/${course._id}`,
          });
      });

      logger.info(`Course created: ${course._id} by admin ${adminId}`);
      res.json({
        message: "Course created successfully",
        course: {
          courseId: course._id,
          title: course.title,
          chapters: course.chapters.map((chapter) => ({
            chapterId: chapter._id,
            title: chapter.title,
            order: chapter.order,
            lessons: chapter.lessons.map((lesson) => ({
              lessonId: lesson._id,
              title: lesson.title,
              format: lesson.format,
              learningGoals: lesson.learningGoals,
              resources: lesson.resources,
              worksheets: lesson.worksheets,
              order: lesson.order,
            })),
          })),
          targetAudience: course.targetAudience,
          duration: course.duration,
          createdBy: course.createdBy,
          assignedTeachers: course.assignedTeachers,
          lastUpdatedBy: course.lastUpdatedBy,
          lastUpdatedAt: course.lastUpdatedAt,
          driveFolderId: course.driveFolderId,
          createdAt: course.createdAt,
        },
      });
    } catch (error) {
      logger.error("Create course error:", error.message);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Admin: Assign Course to Teacher(s)
router.post(
  "/assign-teacher",
  authenticate,
  [
    check("courseId").isMongoId().withMessage("Valid course ID is required"),
    check("teacherIds")
      .isArray({ min: 1 })
      .withMessage("At least one teacher ID is required")
      .custom((value) =>
        value.every((id) => mongoose.Types.ObjectId.isValid(id))
      )
      .withMessage("All teacher IDs must be valid MongoDB ObjectIds"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Validation errors in assign-teacher:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { courseId, teacherIds } = req.body;
    const adminId = req.user.userId;

    try {
      const admin = await User.findById(adminId).populate("role");
      if (!admin || !["Admin", "Super Admin"].includes(admin.role.roleName)) {
        logger.warn(
          `Unauthorized course assignment attempt by user: ${adminId}`
        );
        return res.status(403).json({ message: "Not authorized" });
      }

      const course = await Course.findById(courseId);
      if (!course) {
        logger.warn(`Course not found: ${courseId}`);
        return res.status(404).json({ message: "Course not found" });
      }

      const teachers = await User.find({
        _id: { $in: teacherIds },
      }).populate("role");

      if (
        teachers.length !== teacherIds.length ||
        !teachers.every((t) => t.role?.roleName === "Teacher")
      ) {
        logger.warn(`Invalid teacher IDs or roles: ${teacherIds}`);
        return res.status(400).json({
          message: "One or more teacher IDs are invalid or not teachers",
        });
      }

      course.assignedTeachers = teacherIds;
      await course.save();

      const notifications = teacherIds.map((teacherId) =>
        new Notification({
          userId: teacherId,
          message: `You have been assigned to teach course "${course.title}"`,
          link: `${process.env.BASE_URL}/teacher/courses/${course._id}`,
        }).save()
      );

      const emailNotifications = teachers.map((teacher) =>
        sendCourseAssignedEmail(
          teacher.email,
          teacher.name,
          course._id,
          `You have been assigned to teach course "${course.title}"`
        )
      );

      await Promise.all([...notifications, ...emailNotifications]);

      teachers.forEach((teacher) => {
        getIO()
          .to(teacher._id.toString())
          .emit("notification", {
            message: `You have been assigned to teach course "${course.title}"`,
            link: `${process.env.BASE_URL}/teacher/courses/${course._id}`,
          });
      });

      logger.info(
        `Course ${courseId} assigned to teachers ${teacherIds} by admin ${adminId}`
      );
      res.json({ message: "Course assigned successfully to teachers" });
    } catch (error) {
      logger.error("Assign course error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Admin: Unassign Teacher(s) from a Course
router.post(
  "/unassign-teacher",
  authenticate,
  [
    check("courseId").isMongoId().withMessage("Valid course ID is required"),
    check("teacherIds")
      .isArray({ min: 1 })
      .withMessage("At least one teacher ID is required")
      .custom((value) =>
        value.every((id) => mongoose.Types.ObjectId.isValid(id))
      )
      .withMessage("All teacher IDs must be valid MongoDB ObjectIds"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Validation errors in unassign-teacher:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { courseId, teacherIds } = req.body;
    const adminId = req.user.userId;

    try {
      const admin = await User.findById(adminId).populate("role");
      if (!admin || !["Admin", "Super Admin"].includes(admin.role?.roleName)) {
        logger.warn(`Unauthorized unassignment attempt by user: ${adminId}`);
        return res.status(403).json({ message: "Not authorized" });
      }

      const course = await Course.findById(courseId);
      if (!course) {
        logger.warn(`Course not found: ${courseId}`);
        return res.status(404).json({ message: "Course not found" });
      }

      const teachers = await User.find({
        _id: { $in: teacherIds },
      }).populate("role");

      const validTeachers = teachers.filter(
        (teacher) => teacher.role?.roleName === "Teacher"
      );

      if (validTeachers.length !== teacherIds.length) {
        logger.warn(
          `One or more teacher IDs are invalid or not teachers: ${teacherIds}`
        );
        return res
          .status(400)
          .json({
            message: "One or more teacher IDs are invalid or not teachers",
          });
      }

      course.assignedTeachers = course.assignedTeachers.filter(
        (id) => !teacherIds.includes(id.toString())
      );
      await course.save();

      const notifications = teacherIds.map((teacherId) =>
        new Notification({
          userId: teacherId,
          message: `You have been unassigned from the course "${course.title}"`,
          link: `${process.env.BASE_URL}/teacher/courses`,
        }).save()
      );

      const emailNotifications = validTeachers.map((teacher) =>
        sendCourseUnassignedEmail(
          teacher.email,
          teacher.name,
          course._id,
          `You have been unassigned from the course "${course.title}"`
        )
      );

      await Promise.all([...notifications, ...emailNotifications]);

      validTeachers.forEach((teacher) => {
        getIO()
          .to(teacher._id.toString())
          .emit("notification", {
            message: `You have been unassigned from the course "${course.title}"`,
            link: `${process.env.BASE_URL}/teacher/courses`,
          });
      });

      logger.info(
        `Teachers ${teacherIds} unassigned from course ${courseId} by admin ${adminId}`
      );
      res.json({ message: "Teachers unassigned successfully" });
    } catch (error) {
      logger.error("Unassign course error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Get assigned teachers for a specific course
router.get(
  "/course/:courseId/assigned-teachers",
  authenticate,
  async (req, res) => {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: "Invalid course ID" });
    }

    try {
      const course = await Course.findById(courseId).populate({
        path: "assignedTeachers",
        select: "name email phone subjects role profileImage",
        populate: {
          path: "role",
          select: "roleName",
        },
      });

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      res.json({
        courseId: course._id,
        courseTitle: course.title,
        assignedTeachers: course.assignedTeachers || [],
      });
    } catch (error) {
      logger.error("Error fetching assigned teachers:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Admins: Edit a Course
router.put(
  "/edit/:courseId",
  authenticate,
  [
    check("title").optional().notEmpty().withMessage("Course title cannot be empty"),
    check("chapters")
      .optional()
      .custom((value) => {
        if (!value) return true;
        try {
          const parsed = typeof value === "string" ? JSON.parse(value) : value;
          if (!Array.isArray(parsed)) {
            throw new Error("Chapters must be an array");
          }
          parsed.forEach((chapter, index) => {
            if (chapter.title && !chapter.title.trim()) {
              throw new Error(`Chapter ${index + 1} title cannot be empty`);
            }
            if (!Array.isArray(chapter.lessons)) {
              throw new Error(`Lessons in chapter ${index + 1} must be an array`);
            }
            chapter.lessons.forEach((lesson, lessonIndex) => {
              if (lesson.title && !lesson.title.trim()) {
                throw new Error(
                  `Lesson ${lessonIndex + 1} title in chapter ${index + 1} is required`
                );
              }
              if (
                lesson.format &&
                !["video", "audio", "pdf", "word", "ppt", "jpg", "png", "gif", "avif", "webp", "svg"].includes(
                  lesson.format
                )
              ) {
                throw new Error(
                  `Invalid format for lesson ${lessonIndex + 1} in chapter ${index + 1}`
                );
              }
              if (lesson.learningGoals && !Array.isArray(lesson.learningGoals)) {
                throw new Error(
                  `Learning goals for lesson ${lessonIndex + 1} in chapter ${index + 1} must be an array`
                );
              }
            });
          });
          return true;
        } catch (error) {
          throw new Error(error.message || "Chapters must be a valid JSON array");
        }
      })
      .withMessage("Chapters must be a valid JSON array"),
    check("targetAudience").optional().notEmpty().withMessage("Target audience cannot be empty"),
    check("duration").optional().notEmpty().withMessage("Course duration cannot be empty"),
  ],
  upload.any(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Validation errors in edit course:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { courseId } = req.params;
    const { title, chapters, targetAudience, duration } = req.body;
    const userId = req.user.userId;

    try {
      const user = await User.findById(userId).populate("role");
      if (!user || !["Admin", "Super Admin"].includes(user.role.roleName)) {
        logger.warn(`Unauthorized course edit attempt by user: ${userId}`);
        return res.status(403).json({ message: "Not authorized" });
      }

      const course = await Course.findById(courseId);
      if (!course) {
        logger.warn(`Course not found: ${courseId}`);
        return res.status(404).json({ message: "Course not found" });
      }

      const resources = {};
      const worksheets = {};

      for (const file of req.files || []) {
        if (file.fieldname.startsWith("resources")) {
          const match = file.fieldname.match(/resources\[(\d+)\]\[(\d+)\]\[(\d+)\]/);
          if (!match) {
            logger.warn(`Invalid resource field name: ${file.fieldname}`);
            return res.status(400).json({
              message: `Invalid resource field name: ${file.fieldname}`,
            });
          }
          const chapterIndex = parseInt(match[1], 10);
          const lessonIndex = parseInt(match[2], 10);
          const resourceIndex = parseInt(match[3], 10);
          const { fileId, webViewLink } = await uploadCourseFileToDrive(
            file.path,
            file.originalname,
            file.mimetype,
            title || course.title,
            course.driveFolderId
          );
          const resource = {
            type: mimeToType[file.mimetype] || file.mimetype.split("/")[1],
            url: webViewLink,
            fileId,
            name: file.originalname,
            uploadedBy: userId,
            uploadedAt: new Date(),
          };
          if (!resources[chapterIndex]) resources[chapterIndex] = {};
          if (!resources[chapterIndex][lessonIndex]) resources[chapterIndex][lessonIndex] = {};
          resources[chapterIndex][lessonIndex][resourceIndex] = resource;
          deleteLocalFile(file.path);
        } else if (file.fieldname.startsWith("worksheets")) {
          const match = file.fieldname.match(/worksheets\[(\d+)\]\[(\d+)\]\[(\d+)\]/);
          if (!match) {
            logger.warn(`Invalid worksheet field name: ${file.fieldname}`);
            return res.status(400).json({
              message: `Invalid worksheet field name: ${file.fieldname}`,
            });
          }
          const chapterIndex = parseInt(match[1], 10);
          const lessonIndex = parseInt(match[2], 10);
          const resourceIndex = parseInt(match[3], 10);
          const { fileId, webViewLink } = await uploadCourseFileToDrive(
            file.path,
            file.originalname,
            file.mimetype,
            title || course.title,
            course.driveFolderId
          );
          const worksheet = {
            type: mimeToType[file.mimetype] || file.mimetype.split("/")[1],
            url: webViewLink,
            fileId,
            name: file.originalname,
            uploadedBy: userId,
            uploadedAt: new Date(),
          };
          if (!worksheets[chapterIndex]) worksheets[chapterIndex] = {};
          if (!worksheets[chapterIndex][lessonIndex]) worksheets[chapterIndex][lessonIndex] = {};
          worksheets[chapterIndex][lessonIndex][resourceIndex] = worksheet;
          deleteLocalFile(file.path);
        }
      }

      if (title) course.title = title;
      if (targetAudience) course.targetAudience = targetAudience;
      if (duration) course.duration = duration;
      if (chapters) {
        const parsedChapters = JSON.parse(chapters).map((chapter, chapterIndex) => {
          const lessons = chapter.lessons.map((lesson, lessonIndex) => {
            const lessonResources = [];
            const lessonWorksheets = [];
            if (resources[chapterIndex]?.[lessonIndex]) {
              Object.keys(resources[chapterIndex][lessonIndex])
                .sort((a, b) => parseInt(a) - parseInt(b))
                .forEach((resourceIndex) => {
                  lessonResources.push(resources[chapterIndex][lessonIndex][resourceIndex]);
                });
            }
            if (worksheets[chapterIndex]?.[lessonIndex]) {
              Object.keys(worksheets[chapterIndex][lessonIndex])
                .sort((a, b) => parseInt(a) - parseInt(b))
                .forEach((resourceIndex) => {
                  lessonWorksheets.push(worksheets[chapterIndex][lessonIndex][resourceIndex]);
                });
            }
            const expectedType = lesson.format === "word" ? "doc" : lesson.format;
            if (lessonResources.length > 0 && !lessonResources.every((res) => res.type === expectedType)) {
              throw new Error(
                `Resource type mismatch for lesson ${lessonIndex + 1} in chapter ${chapterIndex + 1}`
              );
            }
            if (lessonWorksheets.length > 0 && !lessonWorksheets.every((ws) => ws.type === expectedType)) {
              throw new Error(
                `Worksheet type mismatch for lesson ${lessonIndex + 1} in chapter ${chapterIndex + 1}`
              );
            }
            return {
              title: lesson.title,
              format: lesson.format,
              learningGoals: lesson.learningGoals.filter((goal) => goal?.trim()),
              resources: lessonResources.length > 0 ? lessonResources : course.chapters[chapterIndex]?.lessons[lessonIndex]?.resources || [],
              worksheets: lessonWorksheets.length > 0 ? lessonWorksheets : course.chapters[chapterIndex]?.lessons[lessonIndex]?.worksheets || [],
              order: lessonIndex + 1,
            };
          });
          return {
            title: chapter.title,
            lessons,
            order: chapterIndex + 1,
          };
        });
        course.chapters = parsedChapters;
      }

      course.lastUpdatedBy = userId;
      course.lastUpdatedAt = new Date();
      await course.save();

      const admins = await User.find({
        role: {
          $in: await Role.find({ roleName: { $in: ["Admin", "Super Admin"] } }),
        },
      });
      const notifications = admins.map((admin) =>
        new Notification({
          userId: admin._id,
          message: `Course "${course.title}" updated by ${user.name}`,
          link: `${process.env.BASE_URL}/admin/courses/${course._id}`,
        }).save()
      );

      const teacherNotifications = [];
      const assignedTeachers = await User.find({
        _id: { $in: course.assignedTeachers },
      });
      for (const teacher of assignedTeachers) {
        teacherNotifications.push(
          new Notification({
            userId: teacher._id,
            message: `Course "${course.title}" updated by ${user.name}`,
            link: `${process.env.BASE_URL}/teacher/courses/${course._id}`,
          }).save(),
          sendCourseEditedEmail(
            teacher.email,
            teacher.name,
            course._id,
            `Course "${course.title}" updated by ${user.name}`
          )
        );
        getIO()
          .to(teacher._id.toString())
          .emit("notification", {
            message: `Course "${course.title}" updated by ${user.name}`,
            link: `${process.env.BASE_URL}/teacher/courses/${course._id}`,
          });
      }

      const adminEmailNotifications = admins.map((admin) =>
        sendCourseEditedEmail(
          admin.email,
          admin.name,
          course._id,
          `Course "${course.title}" updated by ${user.name}`
        )
      );

      await Promise.all([...notifications, ...adminEmailNotifications, ...teacherNotifications]);

      admins.forEach((admin) => {
        getIO()
          .to(admin._id.toString())
          .emit("notification", {
            message: `Course "${course.title}" updated by ${user.name}`,
            link: `${process.env.BASE_URL}/admin/courses/${course._id}`,
          });
      });

      logger.info(`Course ${courseId} updated by user ${userId}`);
      res.json({
        message: "Course updated successfully",
        courseId: course._id,
      });
    } catch (error) {
      logger.error("Edit course error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Admin: Delete a Course
router.delete("/delete/:courseId", authenticate, async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user.userId;

  try {
    const user = await User.findById(userId).populate("role");
    if (
      !user ||
      !["Admin", "Super Admin", "Teacher"].includes(user.role.roleName)
    ) {
      logger.warn(`Unauthorized course deletion attempt by user: ${userId}`);
      return res.status(403).json({ message: "Not authorized" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      logger.warn(`Course not found: ${courseId}`);
      return res.status(404).json({ message: "Course not found" });
    }

    if (user.role.roleName === "Teacher") {
      if (
        !course.assignedTeachers.map((id) => id.toString()).includes(userId)
      ) {
        logger.warn(`Teacher ${userId} not assigned to course: ${courseId}`);
        return res
          .status(403)
          .json({ message: "Not authorized to delete this course" });
      }

      const batches = await Batch.find({ courseId, teacherId: userId });
      if (!batches.length) {
        logger.warn(
          `No batches found for course ${courseId} and teacher ${userId}`
        );
        return res
          .status(400)
          .json({ message: "No batches assigned to you for this course" });
      }

      for (const batch of batches) {
        batch.isDeleted = true;
        await batch.save();

        const notifications = batch.studentIds.map((studentId) =>
          new Notification({
            userId: studentId,
            message: `Course "${course.title}" removed from batch "${batch.name}" by ${user.name}`,
            link: `${process.env.BASE_URL}/student/batches`,
          }).save()
        );

        const students = await User.find({
          _id: { $in: batch.studentIds },
        });
        const emailNotifications = students.map((student) =>
          sendBatchDeletedEmail(
            student.email,
            student.name,
            batch._id,
            `Course "${course.title}" removed from batch "${batch.name}" by ${user.name}`
          )
        );

        await Promise.all([...notifications, ...emailNotifications]);

        batch.studentIds.forEach((studentId) => {
          getIO()
            .to(studentId.toString())
            .emit("notification", {
              message: `Course "${course.title}" removed from batch "${batch.name}" by ${user.name}`,
              link: `${process.env.BASE_URL}/student/batches`,
            });
        });
      }

      logger.info(
        `Course ${courseId} marked as deleted for teacher ${userId}'s batches`
      );
      return res.json({
        message: "Course removed from your batches successfully",
      });
    }

    const batches = await Batch.find({ courseId });
    if (batches.length > 0) {
      logger.warn(`Cannot delete course ${courseId} with associated batches`);
      return res
        .status(400)
        .json({ message: "Cannot delete course with associated batches" });
    }

    await course.deleteOne();

    const admins = await User.find({
      role: {
        $in: await Role.find({ roleName: { $in: ["Admin", "Super Admin"] } }),
      },
    });
    const notifications = admins.map((admin) =>
      new Notification({
        userId: admin._id,
        message: `Course "${course.title}" deleted by ${user.name}`,
        link: `${process.env.BASE_URL}/admin/courses`,
      }).save()
    );

    const teacherNotifications = [];
    const assignedTeachers = await User.find({
      _id: { $in: course.assignedTeachers },
    });
    for (const teacher of assignedTeachers) {
      if (teacher._id.toString() !== userId) {
        teacherNotifications.push(
          new Notification({
            userId: teacher._id,
            message: `Course "${course.title}" deleted by ${user.name}`,
            link: `${process.env.BASE_URL}/teacher/courses`,
          }).save(),
          sendCourseDeletedEmail(
            teacher.email,
            teacher.name,
            course._id,
            `Course "${course.title}" deleted by ${user.name}`
          )
        );
        getIO()
          .to(teacher._id.toString())
          .emit("notification", {
            message: `Course "${course.title}" deleted by ${user.name}`,
            link: `${process.env.BASE_URL}/teacher/courses`,
          });
      }
    }

    const adminEmailNotifications = admins.map((admin) =>
      sendCourseDeletedEmail(
        admin.email,
        admin.name,
        course._id,
        `Course "${course.title}" deleted by ${user.name}`
      )
    );

    await Promise.all([
      ...notifications,
      ...adminEmailNotifications,
      ...teacherNotifications,
    ]);

    admins.forEach((admin) => {
      getIO()
        .to(admin._id.toString())
        .emit("notification", {
          message: `Course "${course.title}" deleted by ${user.name}`,
          link: `${process.env.BASE_URL}/admin/courses`,
        });
    });

    logger.info(`Course ${courseId} deleted by user ${userId}`);
    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    logger.error("Delete course error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Teacher: Create a Batch
router.post(
  "/batch/create",
  authenticate,
  [
    check("name").notEmpty().withMessage("Batch name is required"),
    check("studentIds")
      .optional()
      .isArray()
      .withMessage("Student IDs must be an array")
      .custom((value) => value.every((id) => mongoose.Types.ObjectId.isValid(id)))
      .withMessage("All student IDs must be valid MongoDB ObjectIds"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Validation errors in create batch:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, studentIds = [] } = req.body;
    const teacherId = req.user.userId;

    try {
      const teacher = await User.findById(teacherId).populate("role");
      if (!teacher || teacher.role.roleName !== "Teacher") {
        logger.warn(`Unauthorized batch creation attempt by user: ${teacherId}`);
        return res.status(403).json({ message: "Not authorized" });
      }

    if (studentIds.length > 0) {
        const students = await User.find({
          _id: { $in: studentIds },
        }).populate("role");

        const validStudents = students.filter(
          (student) => student.role && student.role.roleName === "Student"
        );

       if (validStudents.length !== studentIds.length) {
          const invalidIds = studentIds.filter(
            (id) => !validStudents.some((s) => s._id.toString() === id)
          );
          logger.warn(`Invalid student IDs provided for batch: ${invalidIds}`);
          return res
            .status(400)
            .json({ message: "One or more student IDs are invalid" });
        }
      }

      const batch = new Batch({
        name,
        teacherId,
       studentIds: studentIds.map((id) => ({
          studentId: id,
          isInThisBatch: true,
        })),
      });
      await batch.save();

      const notifications = studentIds.map((studentId) =>
        new Notification({
          userId: studentId,
          message: `You have been added to batch "${name}" by ${teacher.name}`,
          link: `${process.env.BASE_URL}/student/batches/${batch._id}`,
        }).save()
      );

      const students = await User.find({
        _id: { $in: studentIds },
      }).populate("role");
      
      const emailNotifications = students.map((student) =>
        sendBatchCreatedEmail(
          student.email,
          student.name,
          batch._id,
          `You have been added to batch "${name}" by ${teacher.name}`
        )
      );

      await Promise.all([...notifications, ...emailNotifications]);

      studentIds.forEach((studentId) => {
        getIO()
          .to(studentId.toString())
          .emit("notification", {
            message: `You have been added to batch "${name}" by ${teacher.name}`,
            link: `${process.env.BASE_URL}/student/batches/${batch._id}`,
          });
      });

      logger.info(`Batch ${batch._id} created by teacher ${teacherId}`);
      res.json({ message: "Batch created successfully", batchId: batch._id });
    } catch (error) {
      logger.error("Create batch error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);


// Teacher: Delete a Batch
router.delete(
  "/batch/delete/:batchId",
  authenticate,
  [check("batchId").isMongoId().withMessage("Valid batch ID is required")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Validation errors in delete batch:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { batchId } = req.params;
    const teacherId = req.user.userId;

    try {
      const teacher = await User.findById(teacherId).populate("role");
      if (!teacher || teacher.role.roleName !== "Teacher") {
        logger.warn(`Unauthorized batch deletion attempt by user: ${teacherId}`);
        return res.status(403).json({ message: "Not authorized" });
      }

      const batch = await Batch.findById(batchId).populate("courseId");
      if (!batch || batch.teacherId.toString() !== teacherId) {
        logger.warn(`Batch not found or not assigned to teacher: ${batchId}`);
        return res
          .status(404)
          .json({ message: "Batch not found or not assigned to you" });
      }

      const course = batch.courseId;

      await batch.deleteOne();

      const notifications = batch.studentIds.map((studentId) =>
        new Notification({
          userId: studentId,
          message: `Batch "${batch.name}" for course "${
            course && course.title ? course.title : "N/A"
          }" has been deleted by ${teacher.name}`,
          link: `${process.env.BASE_URL}/student/batches`,
        }).save()
      );

      const students = await User.find({
        _id: { $in: batch.studentIds },
      }).populate("role");

      const emailNotifications = students.map((student) =>
        sendBatchDeletedEmail(
          student.email,
          student.name,
          batch._id,
          `Batch "${batch.name}" for course "${
            course && course.title ? course.title : "N/A"
          }" has been deleted by ${teacher.name}`
        )
      );

      await Promise.all([...notifications, ...emailNotifications]);

      batch.studentIds.forEach((studentId) => {
        getIO()
          .to(studentId.toString())
          .emit("notification", {
            message: `Batch "${batch.name}" for course "${
              course && course.title ? course.title : "N/A"
            }" has been deleted by ${teacher.name}`,
            link: `${process.env.BASE_URL}/student/batches`,
          });
      });

      logger.info(`Batch ${batchId} deleted by teacher ${teacherId}`);
      res.json({ message: "Batch deleted successfully" });
    } catch (error) {
      logger.error("Delete batch error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Teacher: Delete Lesson from Batch
router.post(
  "/batch/delete-lesson",
  authenticate,
  [
    check("batchId").isMongoId().withMessage("Valid batch ID is required"),
    check("lessonId").isMongoId().withMessage("Valid lesson ID is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Validation errors in delete lesson:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { batchId, lessonId } = req.body;
    const teacherId = req.user.userId;

    try {
      const batch = await Batch.findById(batchId).populate("courseId");
      if (!batch || batch.teacherId.toString() !== teacherId) {
        logger.warn(
          `Unauthorized lesson deletion attempt by user: ${teacherId}`
        );
        return res.status(403).json({ message: "Not authorized" });
      }

      const course = batch.courseId;
      if (
        !course.assignedTeachers.map((id) => id.toString()).includes(teacherId)
      ) {
        logger.warn(
          `Teacher ${teacherId} not assigned to course: ${course._id}`
        );
        return res
          .status(403)
          .json({ message: "Not authorized to modify this course" });
      }

      batch.modifiedLessons.push({ lessonId, isDeleted: true });
      await batch.save();

      logger.info(
        `Lesson ${lessonId} marked as deleted for batch ${batchId} by teacher ${teacherId}`
      );
      res.json({ message: "Lesson deleted for batch successfully" });
    } catch (error) {
      logger.error("Delete lesson error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Teacher: Edit Batch (Add or Remove Students)
router.put(
  "/batch/edit-students/:batchId",
  authenticate,
  [
    check("batchId").isMongoId().withMessage("Valid batch ID is required"),
    check("name")
      .optional()
      .notEmpty()
      .withMessage("Batch name cannot be empty"),
    check("addStudentIds")
      .optional()
      .isArray()
      .withMessage("addStudentIds must be an array")
      .custom((value) =>
        value.every((id) => mongoose.Types.ObjectId.isValid(id))
      )
      .withMessage("All student IDs to add must be valid MongoDB ObjectIds"),
    check("removeStudentIds")
      .optional()
      .isArray()
      .withMessage("removeStudentIds must be an array")
      .custom((value) =>
        value.every((id) => mongoose.Types.ObjectId.isValid(id))
      )
      .withMessage("All student IDs to remove must be valid MongoDB ObjectIds"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Validation errors in edit batch students:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { batchId } = req.params;
    const { name, addStudentIds, removeStudentIds } = req.body;
    const teacherId = req.user.userId;

    try {
      const teacher = await User.findById(teacherId).populate("role");
      if (!teacher || teacher.role.roleName !== "Teacher") {
        logger.warn(`Unauthorized batch edit attempt by user: ${teacherId}`);
        return res.status(403).json({ message: "Not authorized" });
      }

      const batch = await Batch.findById(batchId).populate("courseId");
      if (!batch || batch.teacherId.toString() !== teacherId) {
        logger.warn(`Batch not found or not assigned to teacher: ${batchId}`);
        return res
          .status(404)
          .json({ message: "Batch not found or not assigned to you" });
      }

      const course = batch.courseId;

      if (name) {
        batch.name = name;
      }

      if (addStudentIds && addStudentIds.length > 0) {
        const studentsToAdd = await User.find({
          _id: { $in: addStudentIds },
        }).populate("role");
        const validStudents = studentsToAdd.filter(
          (student) => student.role && student.role.roleName === "Student"
        );
        if (validStudents.length !== addStudentIds.length) {
          logger.warn(`Invalid student IDs provided for adding: ${addStudentIds}`);
          return res
            .status(400)
            .json({ message: "One or more student IDs to add are invalid or not students" });
        }

       addStudentIds.forEach((studentId) => {
          const existingStudent = batch.studentIds.find(
            (s) => s.studentId.toString() === studentId
          );
          if (existingStudent) {
            existingStudent.isInThisBatch = true;
          } else {
            batch.studentIds.push({ studentId, isInThisBatch: true });
          }
        });

        const notifications = addStudentIds.map((studentId) =>
          new Notification({
            userId: studentId,
            message: course
              ? `You have been added to batch "${batch.name}" for course "${course.title}"`
              : `You have been added to batch "${batch.name}"`,
            link: `${process.env.BASE_URL}/student/batches/${batch._id}`,
          }).save()
        );

        const emailNotifications = validStudents.map((student) =>
          sendBatchCreatedEmail(
            student.email,
            student.name,
            batch.name,
            course ? course.title : null,
            batch._id,
            course
              ? `You have been added to batch "${batch.name}" for course "${course.title}"`
              : `You have been added to batch "${batch.name}"`
          )
        );

        await Promise.all([...notifications, ...emailNotifications]);

        addStudentIds.forEach((studentId) => {
          getIO()
            .to(studentId.toString())
            .emit("notification", {
              message: course
                ? `You have been added to batch "${batch.name}" for course "${course.title}"`
                : `You have been added to batch "${batch.name}"`,
              link: `${process.env.BASE_URL}/student/batches/${batch._id}`,
            });
        });
      }

      if (removeStudentIds && removeStudentIds.length > 0) {
        const studentsToRemove = await User.find({
          _id: { $in: removeStudentIds },
        }).populate("role");
        const validStudents = studentsToRemove.filter(
          (student) => student.role && student.role.roleName === "Student"
        );
        if (validStudents.length !== removeStudentIds.length) {
          logger.warn(`Invalid student IDs provided for removing: ${removeStudentIds}`);
          return res
            .status(400)
            .json({ message: "One or more student IDs to remove are invalid or not students" });
        }

       removeStudentIds.forEach((studentId) => {
          const student = batch.studentIds.find(
            (s) => s.studentId.toString() === studentId
          );
          if (student) {
            student.isInThisBatch = false;
          }
        });

        batch.studentSpecificModifications =
          batch.studentSpecificModifications.filter(
            (mod) => !removeStudentIds.includes(mod.studentId.toString())
          );

        const notifications = removeStudentIds.map((studentId) =>
          new Notification({
            userId: studentId,
            message: course
              ? `You have been removed from batch "${batch.name}" for course "${course.title}"`
              : `You have been removed from batch "${batch.name}"`,
            link: `${process.env.BASE_URL}/student/batches`,
          }).save()
        );

        const emailNotifications = validStudents.map((student) =>
          sendBatchDeletedEmail(
            student.email,
            student.name,
            batch._id,
            course
              ? `You have been removed from batch "${batch.name}" for course "${course.title}"`
              : `You have been removed from batch "${batch.name}"`
          )
        );

        await Promise.all([...notifications, ...emailNotifications]);

        removeStudentIds.forEach((studentId) => {
          getIO()
            .to(studentId.toString())
            .emit("notification", {
              message: course
                ? `You have been removed from batch "${batch.name}" for course "${course.title}"`
                : `You have been removed from batch "${batch.name}"`,
              link: `${process.env.BASE_URL}/student/batches`,
            });
        });
      }

      batch.updatedAt = Date.now();
      await batch.save();

      logger.info(`Batch ${batchId} updated by teacher ${teacherId}`);
      res.json({
        message: "Batch updated successfully",
        batchId: batch._id,
      });
    } catch (error) {
      logger.error(`Edit batch error for batchId ${batchId}:`, error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

//Teacher: Edit a course
router.put(
  "/teacher/edit-course/:courseId",
  authenticate,
  [
    check("courseId").isMongoId().withMessage("Valid course ID is required"),
    check("title")
      .optional()
      .notEmpty()
      .withMessage("Course title cannot be empty"),
    check("chapters")
      .optional()
      .custom((value) => {
        if (!value) return true;
        try {
          const parsed = typeof value === "string" ? JSON.parse(value) : value;
          if (!Array.isArray(parsed)) {
            throw new Error("Chapters must be an array");
          }
          parsed.forEach((chapter, index) => {
            if (chapter.title && !chapter.title.trim()) {
              throw new Error(`Chapter ${index + 1} title cannot be empty`);
            }
            if (!Array.isArray(chapter.lessons)) {
              throw new Error(`Lessons in chapter ${index + 1} must be an array`);
            }
            chapter.lessons.forEach((lesson, lessonIndex) => {
              if (lesson.title && !lesson.title.trim()) {
                throw new Error(
                  `Lesson ${lessonIndex + 1} title in chapter ${
                    index + 1
                  } cannot be empty`
                );
              }
              if (
                lesson.format &&
                ![
                  "video",
                  "audio",
                  "pdf",
                  "word",
                  "ppt",
                  "jpg",
                  "png",
                  "gif",
                  "avif",
                  "webp",
                  "svg",
                ].includes(lesson.format)
              ) {
                throw new Error(
                  `Invalid format for lesson ${lessonIndex + 1} in chapter ${
                    index + 1
                  }`
                );
              }
              if (
                lesson.learningGoals &&
                !Array.isArray(lesson.learningGoals)
              ) {
                throw new Error(
                  `Learning goals for lesson ${lessonIndex + 1} in chapter ${
                    index + 1
                  } must be an array`
                );
              }
            });
          });
          return true;
        } catch (error) {
          throw new Error(error.message || "Chapters must be a valid JSON array");
        }
      })
      .withMessage("Chapters must be a valid JSON array"),
    check("targetAudience")
      .optional()
      .notEmpty()
      .withMessage("Target audience cannot be empty"),
    check("duration")
      .optional()
      .notEmpty()
      .withMessage("Course duration cannot be empty"),
  ],
  upload.any(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Validation errors in teacher edit course:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { courseId } = req.params;
    const { title, chapters, targetAudience, duration } = req.body;
    const teacherId = req.user.userId;

    try {
      const teacher = await User.findById(teacherId).populate("role");
      if (!teacher || teacher.role.roleName !== "Teacher") {
        logger.warn(`Unauthorized course edit attempt by user: ${teacherId}`);
        return res.status(403).json({ message: "Not authorized" });
      }

      const course = await Course.findById(courseId);
      if (
        !course ||
        !course.assignedTeachers.map((id) => id.toString()).includes(teacherId)
      ) {
        logger.warn(`Course not found or not assigned to teacher: ${courseId}`);
        return res
          .status(404)
          .json({ message: "Course not found or not assigned to you" });
      }

      const batches = await Batch.find({
        courseId: courseId,
        teacherId: teacherId,
        isDeleted: false,
      });

      const resources = {};
      const worksheets = {};
      for (const file of req.files || []) {
        if (file.fieldname.startsWith("resources")) {
          const match = file.fieldname.match(/resources\[(\d+)\]\[(\d+)\]\[(\d+)\]/);
          if (!match) {
            logger.warn(`Invalid resource field name: ${file.fieldname}`);
            return res
              .status(400)
              .json({ message: `Invalid resource field name: ${file.fieldname}` });
          }
          const chapterIndex = parseInt(match[1], 10);
          const lessonIndex = parseInt(match[2], 10);
          const resourceIndex = parseInt(match[3], 10);
          const { fileId, webViewLink } = await uploadCourseFileToDrive(
            file.path,
            file.originalname,
            file.mimetype,
            title || course.title,
            course.driveFolderId
          );
          const resource = {
            type: mimeToType[file.mimetype] || file.mimetype.split("/")[1],
            url: webViewLink,
            fileId,
            name: file.originalname,
            uploadedBy: teacherId,
            uploadedAt: new Date(),
          };
          if (!resources[chapterIndex]) resources[chapterIndex] = {};
          if (!resources[chapterIndex][lessonIndex])
            resources[chapterIndex][lessonIndex] = {};
          resources[chapterIndex][lessonIndex][resourceIndex] = resource;
          deleteLocalFile(file.path);
        } else if (file.fieldname.startsWith("worksheets")) {
          const match = file.fieldname.match(/worksheets\[(\d+)\]\[(\d+)\]\[(\d+)\]/);
          if (!match) {
            logger.warn(`Invalid worksheet field name: ${file.fieldname}`);
            return res
              .status(400)
              .json({ message: `Invalid worksheet field name: ${file.fieldname}` });
          }
          const chapterIndex = parseInt(match[1], 10);
          const lessonIndex = parseInt(match[2], 10);
          const resourceIndex = parseInt(match[3], 10);
          const { fileId, webViewLink } = await uploadCourseFileToDrive(
            file.path,
            file.originalname,
            file.mimetype,
            title || course.title,
            course.driveFolderId
          );
          const worksheet = {
            type: mimeToType[file.mimetype] || file.mimetype.split("/")[1],
            url: webViewLink,
            fileId,
            name: file.originalname,
            uploadedBy: teacherId,
            uploadedAt: new Date(),
          };
          if (!worksheets[chapterIndex]) worksheets[chapterIndex] = {};
          if (!worksheets[chapterIndex][lessonIndex])
            worksheets[chapterIndex][lessonIndex] = {};
          worksheets[chapterIndex][lessonIndex][resourceIndex] = worksheet;
          deleteLocalFile(file.path);
        }
      }

      const teacherCourseModifications = {
        title: title || undefined,
        targetAudience: targetAudience || undefined,
        duration: duration || undefined,
        lastModifiedBy: teacherId,
        lastModifiedAt: new Date(),
      };

      if (chapters) {
        const parsedChapters =
          typeof chapters === "string" ? JSON.parse(chapters) : chapters;
        teacherCourseModifications.chapters = parsedChapters.map(
          (chapter, chapterIndex) => {
            const existingChapter = course.chapters[chapterIndex] || {};
            const lessons = chapter.lessons.map((lesson, lessonIndex) => {
              const lessonResources = [];
              const lessonWorksheets = [];
              if (resources[chapterIndex]?.[lessonIndex]) {
                Object.keys(resources[chapterIndex][lessonIndex])
                  .sort((a, b) => parseInt(a) - parseInt(b))
                  .forEach((resourceIndex) => {
                    lessonResources.push(
                      resources[chapterIndex][lessonIndex][resourceIndex]
                    );
                  });
              }
              if (worksheets[chapterIndex]?.[lessonIndex]) {
                Object.keys(worksheets[chapterIndex][lessonIndex])
                  .sort((a, b) => parseInt(a) - parseInt(b))
                  .forEach((resourceIndex) => {
                    lessonWorksheets.push(
                      worksheets[chapterIndex][lessonIndex][resourceIndex]
                    );
                  });
              }
              const expectedType = lesson.format === "word" ? "doc" : lesson.format;
              if (
                lessonResources.length > 0 &&
                !lessonResources.every((res) => res.type === expectedType)
              ) {
                throw new Error(
                  `Resource type mismatch for lesson ${
                    lessonIndex + 1
                  } in chapter ${chapterIndex + 1}`
                );
              }
              if (
                lessonWorksheets.length > 0 &&
                !lessonWorksheets.every((ws) => ws.type === expectedType)
              ) {
                throw new Error(
                  `Worksheet type mismatch for lesson ${
                    lessonIndex + 1
                  } in chapter ${chapterIndex + 1}`
                );
              }
              const existingLesson = existingChapter.lessons?.[lessonIndex] || {};
              return {
                title: lesson.title,
                format: lesson.format,
                learningGoals: lesson.learningGoals.filter((goal) => goal.trim()),
                resources: lessonResources.length > 0 ? lessonResources : existingLesson.resources || [],
                worksheets: lessonWorksheets.length > 0 ? lessonWorksheets : existingLesson.worksheets || [],
                order: lessonIndex + 1,
              };
            });
            return {
              title: chapter.title,
              lessons,
              order: chapterIndex + 1,
            };
          }
        );
      }

      course.teacherCourseModifications = {
        ...course.teacherCourseModifications,
        ...teacherCourseModifications,
      };
      await course.save();
      logger.info(`Course ${courseId} updated by teacher ${teacherId}`);

      const updatedBatchIds = [];
      const notifications = [];
      const emailNotifications = [];
      const socketNotifications = [];

      if (batches.length > 0) {
        for (const batch of batches) {
          batch.teacherCourseModifications = {
            ...batch.teacherCourseModifications,
            ...teacherCourseModifications,
          };
          await batch.save();
          logger.info(`Batch ${batch._id} updated with teacherCourseModifications:`, batch.teacherCourseModifications);
          updatedBatchIds.push(batch._id);

          const batchNotifications = batch.studentIds
            .filter((s) => s.isInThisBatch)
            .map((s) =>
              new Notification({
                userId: s.studentId,
                message: `Course "${course.title}" modified for batch "${batch.name}" by ${teacher.name}`,
                link: `${process.env.BASE_URL}/student/batches/${batch._id}`,
              }).save()
            );
          notifications.push(...batchNotifications);

          const students = await User.find({
            _id: {
              $in: batch.studentIds
                .filter((s) => s.isInThisBatch)
                .map((s) => s.studentId),
            },
          });

          const batchEmailNotifications = students.map((student) =>
            sendTeacherCourseEditedEmail(
              student.email,
              student.name,
              batch._id,
              `Course "${course.title}" modified for batch "${batch.name}" by ${teacher.name}`
            )
          );
          emailNotifications.push(...batchEmailNotifications);

          batch.studentIds
            .filter((s) => s.isInThisBatch)
            .forEach((s) => {
              socketNotifications.push({
                userId: s.studentId.toString(),
                message: `Course "${course.title}" modified for batch "${batch.name}" by ${teacher.name}`,
                link: `${process.env.BASE_URL}/student/batches/${batch._id}`,
              });
            });
        }
      }

      await Promise.all([...notifications, ...emailNotifications]);
      socketNotifications.forEach(({ userId, message, link }) => {
        getIO().to(userId).emit("notification", { message, link });
      });

      getIO()
        .to(teacherId.toString())
        .emit("notification", {
          message: `You modified course "${course.title}"${batches.length > 0 ? ` for ${batches.length} batch(es)` : ""}`,
          link: `${process.env.BASE_URL}/teacher/courses/${course._id}`,
        });

      logger.info(
        `Course ${courseId} modified${batches.length > 0 ? ` for batches ${updatedBatchIds.join(", ")}` : ""} by teacher ${teacherId}`
      );
      res.json({
        message: `Course modified successfully${batches.length > 0 ? ` for ${batches.length} batch(es)` : ""}`,
        courseId: course._id,
        batchIds: updatedBatchIds,
      });
    } catch (error) {
      logger.error("Teacher edit course error:", error.message);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Teacher: Edit Course for a Specific Batch
router.put(
  "/batch/course/edit/:batchId",
  authenticate,
  [
    check("batchId").isMongoId().withMessage("Valid batch ID is required"),
    check("modifiedLessons")
      .optional()
      .custom((value) => {
        if (!value) return true;
        try {
          const parsed = typeof value === "string" ? JSON.parse(value) : value;
          if (!Array.isArray(parsed)) {
            throw new Error("Modified lessons must be an array");
          }
          parsed.forEach((lesson, index) => {
            if (lesson.lessonId && !mongoose.isValidObjectId(lesson.lessonId)) {
              throw new Error(`Invalid lesson ID at index ${index}`);
            }
            if (lesson.title && !lesson.title.trim()) {
              throw new Error(`Lesson title at index ${index} cannot be empty`);
            }
            if (
              lesson.format &&
              !["video", "audio", "pdf", "word", "ppt"].includes(lesson.format)
            ) {
              throw new Error(`Invalid format for lesson at index ${index}`);
            }
          });
          return true;
        } catch (error) {
          throw new Error(
            error.message || "Modified lessons must be a valid JSON array"
          );
        }
      })
      .withMessage("Modified lessons must be a valid JSON array"),
    check("chapters")
      .optional()
      .custom((value) => {
        if (!value) return true;
        try {
          const parsed = typeof value === "string" ? JSON.parse(value) : value;
          if (!Array.isArray(parsed)) {
            throw new Error("Chapters must be an array");
          }
          parsed.forEach((chapter, index) => {
            if (chapter.title && !chapter.title.trim()) {
              throw new Error(`Chapter ${index + 1} title cannot be empty`);
            }
            if (!Array.isArray(chapter.lessons)) {
              throw new Error(`Lessons in chapter ${index + 1} must be an array`);
            }
            chapter.lessons.forEach((lesson, lessonIndex) => {
              if (lesson.title && !lesson.title.trim()) {
                throw new Error(
                  `Lesson ${lessonIndex + 1} title in chapter ${
                    index + 1
                  } cannot be empty`
                );
              }
              if (
                lesson.format &&
                !["video", "audio", "pdf", "word", "ppt"].includes(lesson.format)
              ) {
                throw new Error(
                  `Invalid format for lesson ${lessonIndex + 1} in chapter ${
                    index + 1
                  }`
                );
              }
              if (
                lesson.learningGoals &&
                !Array.isArray(lesson.learningGoals)
              ) {
                throw new Error(
                  `Learning goals for lesson ${lessonIndex + 1} in chapter ${
                    index + 1
                  } must be an array`
                );
              }
            });
          });
          return true;
        } catch (error) {
          throw new Error(error.message || "Chapters must be a valid JSON array");
        }
      })
      .withMessage("Chapters must be a valid JSON array"),
    check("targetAudience")
      .optional()
      .notEmpty()
      .withMessage("Target audience cannot be empty"),
    check("duration")
      .optional()
      .notEmpty()
      .withMessage("Course duration cannot be empty"),
  ],
  upload.any(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Validation errors in edit batch course:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { batchId } = req.params;
    const { modifiedLessons, title, chapters, targetAudience, duration } = req.body;
    const teacherId = req.user.userId;

    try {
      const teacher = await User.findById(teacherId).populate("role");
      if (!teacher || teacher.role.roleName !== "Teacher") {
        logger.warn(`Unauthorized batch course edit attempt by user: ${teacherId}`);
        return res.status(403).json({ message: "Not authorized" });
      }

      const batch = await Batch.findById(batchId).populate("courseId");
      if (!batch || batch.teacherId.toString() !== teacherId) {
        logger.warn(`Batch not found or not assigned to teacher: ${batchId}`);
        return res.status(404).json({ message: "Batch not found or not assigned to you" });
      }

      const course = batch.courseId;
      if (!course.assignedTeachers.map((id) => id.toString()).includes(teacherId)) {
        logger.warn(`Teacher ${teacherId} not assigned to course: ${course._id}`);
        return res.status(403).json({ message: "Not authorized to modify this course" });
      }

      const resources = {};
      const worksheets = {};
      for (const file of req.files || []) {
        if (file.fieldname.startsWith("resources")) {
          const match = file.fieldname.match(/resources\[(\d+)\]\[(\d+)\]\[(\d+)\]/);
          if (!match) {
            logger.warn(`Invalid resource field name: ${file.fieldname}`);
            return res.status(400).json({ message: `Invalid resource field name: ${file.fieldname}` });
          }
          const chapterIndex = parseInt(match[1], 10);
          const lessonIndex = parseInt(match[2], 10);
          const resourceIndex = parseInt(match[3], 10);
          const { fileId, webViewLink } = await uploadCourseFileToDrive(
            file.path,
            file.originalname,
            file.mimetype,
            title || course.title,
            course.driveFolderId
          );
          const resource = {
            type: mimeToType[file.mimetype] || file.mimetype.split("/")[1],
            url: webViewLink,
            fileId,
            name: file.originalname,
            uploadedBy: teacherId,
            uploadedAt: new Date(),
          };
          if (!resources[chapterIndex]) resources[chapterIndex] = {};
          if (!resources[chapterIndex][lessonIndex]) resources[chapterIndex][lessonIndex] = {};
          resources[chapterIndex][lessonIndex][resourceIndex] = resource;
          deleteLocalFile(file.path);
        } else if (file.fieldname.startsWith("worksheets")) {
          const match = file.fieldname.match(/worksheets\[(\d+)\]\[(\d+)\]\[(\d+)\]/);
          if (!match) {
            logger.warn(`Invalid worksheet field name: ${file.fieldname}`);
            return res.status(400).json({ message: `Invalid worksheet field name: ${file.fieldname}` });
          }
          const chapterIndex = parseInt(match[1], 10);
          const lessonIndex = parseInt(match[2], 10);
          const resourceIndex = parseInt(match[3], 10);
          const { fileId, webViewLink } = await uploadCourseFileToDrive(
            file.path,
            file.originalname,
            file.mimetype,
            title || course.title,
            course.driveFolderId
          );
          const worksheet = {
            type: mimeToType[file.mimetype] || file.mimetype.split("/")[1],
            url: webViewLink,
            fileId,
            name: file.originalname,
            uploadedBy: teacherId,
            uploadedAt: new Date(),
          };
          if (!worksheets[chapterIndex]) worksheets[chapterIndex] = {};
          if (!worksheets[chapterIndex][lessonIndex]) worksheets[chapterIndex][lessonIndex] = {};
          worksheets[chapterIndex][lessonIndex][resourceIndex] = worksheet;
          deleteLocalFile(file.path);
        }
      }

      const batchSpecificModifications = {
        title: title || undefined,
        targetAudience: targetAudience || undefined,
        duration: duration || undefined,
        lastModifiedBy: teacherId,
        lastModifiedAt: new Date(),
      };

      if (chapters) {
        const parsedChapters = typeof chapters === "string" ? JSON.parse(chapters) : chapters;
        batchSpecificModifications.chapters = parsedChapters.map((chapter, chapterIndex) => {
          const existingChapter = course.chapters[chapterIndex] || {};
          const lessons = chapter.lessons.map((lesson, lessonIndex) => {
            const lessonResources = [];
            const lessonWorksheets = [];
            if (resources[chapterIndex]?.[lessonIndex]) {
              Object.keys(resources[chapterIndex][lessonIndex])
                .sort((a, b) => parseInt(a) - parseInt(b))
                .forEach((resourceIndex) => {
                  lessonResources.push(resources[chapterIndex][lessonIndex][resourceIndex]);
                });
            }
            if (worksheets[chapterIndex]?.[lessonIndex]) {
              Object.keys(worksheets[chapterIndex][lessonIndex])
                .sort((a, b) => parseInt(a) - parseInt(b))
                .forEach((resourceIndex) => {
                  lessonWorksheets.push(worksheets[chapterIndex][lessonIndex][resourceIndex]);
                });
            }
            const expectedType = lesson.format === "word" ? "doc" : lesson.format;
            if (lessonResources.length > 0 && !lessonResources.every((res) => res.type === expectedType)) {
              throw new Error(
                `Resource type mismatch for lesson ${lessonIndex + 1} in chapter ${chapterIndex + 1}`
              );
            }
            if (lessonWorksheets.length > 0 && !lessonWorksheets.every((ws) => ws.type === expectedType)) {
              throw new Error(
                `Worksheet type mismatch for lesson ${lessonIndex + 1} in chapter ${chapterIndex + 1}`
              );
            }
            const existingLesson = existingChapter.lessons?.[lessonIndex] || {};
            return {
              title: lesson.title,
              format: lesson.format,
              learningGoals: lesson.learningGoals.filter((goal) => goal.trim()),
              resources: lessonResources.length > 0 ? lessonResources : existingLesson.resources || [],
              worksheets: lessonWorksheets.length > 0 ? lessonWorksheets : existingLesson.worksheets || [],
              order: lessonIndex + 1,
            };
          });
          return {
            title: chapter.title,
            lessons,
            order: chapterIndex + 1,
          };
        });
      }

      if (modifiedLessons) {
        const parsedLessons = typeof modifiedLessons === "string" ? JSON.parse(modifiedLessons) : modifiedLessons;
        batch.modifiedLessons = parsedLessons.map((lesson) => ({
          lessonId: lesson.lessonId,
          isDeleted: lesson.isDeleted || false,
        }));
      }

      batch.batchSpecificModifications = { ...batch.batchSpecificModifications, ...batchSpecificModifications };
      await batch.save();

      const notifications = batch.studentIds
        .filter((s) => s.isInThisBatch)
        .map((s) =>
          new Notification({
            userId: s.studentId,
            message: `Course "${course.title}" modified for batch "${batch.name}" by ${teacher.name}`,
            link: `${process.env.BASE_URL}/student/batches/${batch._id}`,
          }).save()
        );

      const students = await User.find({
        _id: { $in: batch.studentIds.filter((s) => s.isInThisBatch).map((s) => s.studentId) },
      });

      const emailNotifications = students.map((student) =>
        sendBatchCourseEditedEmail(
          student.email,
          student.name,
          batch._id,
          `Course "${course.title}" modified for batch "${batch.name}" by ${teacher.name}`
        )
      );

      await Promise.all([...notifications, ...emailNotifications]);

      batch.studentIds
        .filter((s) => s.isInThisBatch)
        .forEach((s) => {
          getIO()
            .to(s.studentId.toString())
            .emit("notification", {
              message: `Course "${course.title}" modified for batch "${batch.name}" by ${teacher.name}`,
              link: `${process.env.BASE_URL}/student/batches/${batch._id}`,
            });
        });

      getIO()
        .to(teacherId.toString())
        .emit("notification", {
          message: `You modified course "${course.title}" for batch "${batch.name}"`,
          link: `${process.env.BASE_URL}/teacher/courses/${course._id}`,
        });

      logger.info(`Course ${course._id} modified for batch ${batchId} by teacher ${teacherId}`);
      res.json({
        message: "Course modified successfully for batch",
        courseId: course._id,
        batchId: batch._id,
      });
    } catch (error) {
      logger.error("Edit batch course error:", error.message);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Teacher: Edit Course for Specific Students in a Batch
router.put(
  "/batch/:batchId/student/:studentIds",
  authenticate,
  [
    check("batchId").isMongoId().withMessage("Valid batch ID is required"),
    check("studentIds")
      .custom((value) => {
        const ids = value.split(",");
        return ids.every((id) => mongoose.isValidObjectId(id));
      })
      .withMessage("Student IDs must be valid MongoDB ObjectIds separated by commas"),
    check("title")
      .optional()
      .notEmpty()
      .withMessage("Course title cannot be empty"),
    check("chapters")
      .optional()
      .custom((value) => {
        if (!value) return true;
        try {
          const parsed = typeof value === "string" ? JSON.parse(value) : value;
          if (!Array.isArray(parsed)) {
            throw new Error("Chapters must be an array");
          }
          parsed.forEach((chapter, index) => {
            if (chapter.title && !chapter.title.trim()) {
              throw new Error(`Chapter ${index + 1} title cannot be empty`);
            }
            if (!Array.isArray(chapter.lessons)) {
              throw new Error(`Lessons in chapter ${index + 1} must be an array`);
            }
            chapter.lessons.forEach((lesson, lessonIndex) => {
              if (lesson.title && !lesson.title.trim()) {
                throw new Error(
                  `Lesson ${lessonIndex + 1} title in chapter ${
                    index + 1
                  } cannot be empty`
                );
              }
              if (
                lesson.format &&
                !["video", "audio", "pdf", "word", "ppt"].includes(lesson.format)
              ) {
                throw new Error(
                  `Invalid format for lesson ${lessonIndex + 1} in chapter ${
                    index + 1
                  }`
                );
              }
              if (
                lesson.learningGoals &&
                !Array.isArray(lesson.learningGoals)
              ) {
                throw new Error(
                  `Learning goals for lesson ${lessonIndex + 1} in chapter ${
                    index + 1
                  } must be an array`
                );
              }
            });
          });
          return true;
        } catch (error) {
          throw new Error(error.message || "Chapters must be a valid JSON array");
        }
      })
      .withMessage("Chapters must be a valid JSON array"),
    check("targetAudience")
      .optional()
      .notEmpty()
      .withMessage("Target audience cannot be empty"),
    check("duration")
      .optional()
      .notEmpty()
      .withMessage("Course duration cannot be empty"),
  ],
  upload.any(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Validation errors in edit student course:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { batchId, studentIds } = req.params;
    const { courseId, title, chapters, targetAudience, duration } = req.body;
    const teacherId = req.user.userId;

    try {
      const teacher = await User.findById(teacherId).populate("role");
      if (!teacher || teacher.role.roleName !== "Teacher") {
        logger.warn(`Unauthorized student course edit attempt by user: ${teacherId}`);
        return res.status(403).json({ message: "Not authorized" });
      }

      const batch = await Batch.findById(batchId).populate("courseId");
      if (!batch || batch.teacherId.toString() !== teacherId) {
        logger.warn(`Batch not found or not assigned to teacher: ${batchId}`);
        return res.status(404).json({ message: "Batch not found or not assigned to you" });
      }

      const course = batch.courseId;
      if (course._id.toString() !== courseId) {
        logger.warn(`Course ${courseId} not associated with batch: ${batchId}`);
        return res.status(400).json({ message: "Course not associated with this batch" });
      }

      const studentIdArray = studentIds.split(",");
      const students = await User.find({
        _id: { $in: studentIdArray },
      }).populate("role");
      const validStudents = students.filter((s) => s.role.roleName === "Student");
      if (validStudents.length !== studentIdArray.length) {
        logger.warn(`Invalid student IDs: ${studentIds}`);
        return res.status(400).json({ message: "One or more student IDs are invalid" });
      }

      const resources = {};
      const worksheets = {};
      for (const file of req.files || []) {
        if (file.fieldname.startsWith("resources")) {
          const match = file.fieldname.match(/resources\[(\d+)\]\[(\d+)\]\[(\d+)\]/);
          if (!match) {
            logger.warn(`Invalid resource field name: ${file.fieldname}`);
            return res.status(400).json({ message: `Invalid resource field name: ${file.fieldname}` });
          }
          const chapterIndex = parseInt(match[1], 10);
          const lessonIndex = parseInt(match[2], 10);
          const resourceIndex = parseInt(match[3], 10);
          const { fileId, webViewLink } = await uploadCourseFileToDrive(
            file.path,
            file.originalname,
            file.mimetype,
            title || course.title,
            course.driveFolderId
          );
          const resource = {
            type: mimeToType[file.mimetype] || file.mimetype.split("/")[1],
            url: webViewLink,
            fileId,
            name: file.originalname,
            uploadedBy: teacherId,
            uploadedAt: new Date(),
          };
          if (!resources[chapterIndex]) resources[chapterIndex] = {};
          if (!resources[chapterIndex][lessonIndex]) resources[chapterIndex][lessonIndex] = {};
          resources[chapterIndex][lessonIndex][resourceIndex] = resource;
          deleteLocalFile(file.path);
        } else if (file.fieldname.startsWith("worksheets")) {
          const match = file.fieldname.match(/worksheets\[(\d+)\]\[(\d+)\]\[(\d+)\]/);
          if (!match) {
            logger.warn(`Invalid worksheet field name: ${file.fieldname}`);
            return res.status(400).json({ message: `Invalid worksheet field name: ${file.fieldname}` });
          }
          const chapterIndex = parseInt(match[1], 10);
          const lessonIndex = parseInt(match[2], 10);
          const resourceIndex = parseInt(match[3], 10);
          const { fileId, webViewLink } = await uploadCourseFileToDrive(
            file.path,
            file.originalname,
            file.mimetype,
            title || course.title,
            course.driveFolderId
          );
          const worksheet = {
            type: mimeToType[file.mimetype] || file.mimetype.split("/")[1],
            url: webViewLink,
            fileId,
            name: file.originalname,
            uploadedBy: teacherId,
            uploadedAt: new Date(),
          };
          if (!worksheets[chapterIndex]) worksheets[chapterIndex] = {};
          if (!worksheets[chapterIndex][lessonIndex]) worksheets[chapterIndex][lessonIndex] = {};
          worksheets[chapterIndex][lessonIndex][resourceIndex] = worksheet;
          deleteLocalFile(file.path);
        }
      }

      const studentModifications = {
        title: title || undefined,
        targetAudience: targetAudience || undefined,
        duration: duration || undefined,
        lastModifiedBy: teacherId,
        lastModifiedAt: new Date(),
      };

      if (chapters) {
        const parsedChapters = typeof chapters === "string" ? JSON.parse(chapters) : chapters;
        studentModifications.chapters = parsedChapters.map((chapter, chapterIndex) => {
          const existingChapter = course.chapters[chapterIndex] || {};
          const lessons = chapter.lessons.map((lesson, lessonIndex) => {
            const lessonResources = [];
            const lessonWorksheets = [];
            if (resources[chapterIndex]?.[lessonIndex]) {
              Object.keys(resources[chapterIndex][lessonIndex])
                .sort((a, b) => parseInt(a) - parseInt(b))
                .forEach((resourceIndex) => {
                  lessonResources.push(resources[chapterIndex][lessonIndex][resourceIndex]);
                });
            }
            if (worksheets[chapterIndex]?.[lessonIndex]) {
              Object.keys(worksheets[chapterIndex][lessonIndex])
                .sort((a, b) => parseInt(a) - parseInt(b))
                .forEach((resourceIndex) => {
                  lessonWorksheets.push(worksheets[chapterIndex][lessonIndex][resourceIndex]);
                });
            }
            const expectedType = lesson.format === "word" ? "doc" : lesson.format;
            if (lessonResources.length > 0 && !lessonResources.every((res) => res.type === expectedType)) {
              throw new Error(
                `Resource type mismatch for lesson ${lessonIndex + 1} in chapter ${chapterIndex + 1}`
              );
            }
            if (lessonWorksheets.length > 0 && !lessonWorksheets.every((ws) => ws.type === expectedType)) {
              throw new Error(
                `Worksheet type mismatch for lesson ${lessonIndex + 1} in chapter ${chapterIndex + 1}`
              );
            }
            const existingLesson = existingChapter.lessons?.[lessonIndex] || {};
            return {
              title: lesson.title,
              format: lesson.format,
              learningGoals: lesson.learningGoals.filter((goal) => goal.trim()),
              resources: lessonResources.length > 0 ? lessonResources : existingLesson.resources || [],
              worksheets: lessonWorksheets.length > 0 ? lessonWorksheets : existingLesson.worksheets || [],
              order: lessonIndex + 1,
            };
          });
          return {
            title: chapter.title,
            lessons,
            order: chapterIndex + 1,
          };
        });
      }

      studentIdArray.forEach((studentId) => {
        const existingMod = batch.studentSpecificModifications.find(
          (mod) => mod.studentId.toString() === studentId
        );
        if (existingMod) {
          batch.studentSpecificModifications = batch.studentSpecificModifications.map((mod) =>
            mod.studentId.toString() === studentId
              ? { ...mod, ...studentModifications }
              : mod
          );
        } else {
          batch.studentSpecificModifications.push({
            studentId,
            ...studentModifications,
          });
        }
      });

      await batch.save();

      const notifications = studentIdArray.map((studentId) =>
        new Notification({
          userId: studentId,
          message: `Course "${course.title}" modified for you in batch "${batch.name}" by ${teacher.name}`,
          link: `${process.env.BASE_URL}/student/batches/${batch._id}`,
        }).save()
      );

      const emailNotifications = validStudents.map((student) =>
        sendStudentCourseEditedEmail(
          student.email,
          student.name,
          batch._id,
          `Course "${course.title}" modified for you in batch "${batch.name}" by ${teacher.name}`
        )
      );

      await Promise.all([...notifications, ...emailNotifications]);

      studentIdArray.forEach((studentId) => {
        getIO()
          .to(studentId)
          .emit("notification", {
            message: `Course "${course.title}" modified for you in batch "${batch.name}" by ${teacher.name}`,
            link: `${process.env.BASE_URL}/student/batches/${batch._id}`,
          });
      });

      getIO()
        .to(teacherId.toString())
        .emit("notification", {
          message: `You modified course "${course.title}" for ${studentIdArray.length} student(s) in batch "${batch.name}"`,
          link: `${process.env.BASE_URL}/teacher/courses/${course._id}`,
        });

      logger.info(
        `Course ${courseId} modified for students ${studentIds} in batch ${batchId} by teacher ${teacherId}`
      );
      res.json({
        message: `Course modified successfully for ${studentIdArray.length} student(s) in batch`,
        courseId: course._id,
        batchId: batch._id,
        studentIds: studentIdArray,
      });
    } catch (error) {
      logger.error("Edit student course error:", error.message);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Teacher: Unassign Course from Batch
router.put(
  "/unassign/:courseId/batch/:batchId",
  authenticate,
  [
    check("courseId").isMongoId().withMessage("Valid course ID is required"),
    check("batchId").isMongoId().withMessage("Valid batch ID is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Validation errors in unassign course:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { courseId, batchId } = req.params;
    const teacherId = req.user.userId;

    try {
      const teacher = await User.findById(teacherId).populate("role");
      if (!teacher || teacher.role.roleName !== "Teacher") {
        logger.warn(`Unauthorized unassign attempt by user: ${teacherId}`);
        return res.status(403).json({ message: "Not authorized" });
      }

      const batch = await Batch.findById(batchId).populate("courseId");
      if (!batch || batch.teacherId.toString() !== teacherId || batch.courseId._id.toString() !== courseId) {
        logger.warn(`Batch not found or not assigned to teacher/course: ${batchId}`);
        return res.status(404).json({ message: "Batch not found or not assigned to you for this course" });
      }

      batch.batchSpecificModifications = {};
      batch.studentSpecificModifications = [];
      batch.teacherCourseModifications = {};
      await batch.save();

      await removeSchedulesForCourse(courseId, batchId);
      logger.info(`Schedules removed for course ${courseId} and batch ${batchId}`);

      const notifications = batch.studentIds
        .filter((s) => s.isInThisBatch)
        .map((s) =>
          new Notification({
            userId: s.studentId,
            message: `Course "${batch.courseId.title}" unassigned from batch "${batch.name}" by ${teacher.name}`,
            link: `${process.env.BASE_URL}/student/batches`,
          }).save()
        );

      const students = await User.find({
        _id: { $in: batch.studentIds.filter((s) => s.isInThisBatch).map((s) => s.studentId) },
      });

      const emailNotifications = students.map((student) =>
        sendBatchCourseEditedEmail(
          student.email,
          student.name,
          batch._id,
          `Course "${batch.courseId.title}" unassigned from batch "${batch.name}" by ${teacher.name}`
        )
      );

      await Promise.all([...notifications, ...emailNotifications]);

      batch.studentIds
        .filter((s) => s.isInThisBatch)
        .forEach((s) => {
          getIO()
            .to(s.studentId.toString())
            .emit("notification", {
              message: `Course "${batch.courseId.title}" unassigned from batch "${batch.name}" by ${teacher.name}`,
              link: `${process.env.BASE_URL}/student/batches`,
            });
        });

      getIO()
        .to(teacherId.toString())
        .emit("notification", {
          message: `You unassigned course "${batch.courseId.title}" from batch "${batch.name}"`,
          link: `${process.env.BASE_URL}/teacher/courses`,
        });

      logger.info(`Course ${courseId} unassigned from batch ${batchId} by teacher ${teacherId}`);
      res.json({ message: "Course unassigned successfully from batch" });
    } catch (error) {
      logger.error("Unassign course error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Teacher: Assign Batch to a Course
router.post(
  "/batch/assign",
  authenticate,
  [
    check("batchId").isMongoId().withMessage("Valid batch ID is required"),
    check("studentIds")
      .optional()
      .isArray()
      .withMessage("Student IDs must be an array")
      .custom((value) => value.every((id) => mongoose.Types.ObjectId.isValid(id)))
      .withMessage("All student IDs must be valid MongoDB ObjectIds"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Validation errors in assign batch to course:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { batchId, courseId, studentIds = [] } = req.body;
    const teacherId = req.user.userId;

    try {
      const teacher = await User.findById(teacherId).populate("role");
      if (!teacher || teacher.role.roleName !== "Teacher") {
        logger.warn(`Unauthorized batch assignment attempt by user: ${teacherId}`);
        return res.status(403).json({ message: "Not authorized" });
      }

      const batch = await Batch.findById(batchId);
      if (!batch || batch.teacherId.toString() !== teacherId) {
        logger.warn(`Batch not found or not assigned to teacher: ${batchId}`);
        return res
          .status(404)
          .json({ message: "Batch not found or not assigned to you" });
      }

      if (batch.courseId) {
        logger.warn(`Batch ${batchId} is already assigned to a course`);
        return res
          .status(400)
          .json({ message: "Batch is already assigned to a course" });
      }

      const course = await Course.findById(courseId);
      if (
        !course ||
        !course.assignedTeachers.map((id) => id.toString()).includes(teacherId)
      ) {
        logger.warn(`Course not found or not assigned to teacher: ${courseId}`);
        return res
          .status(404)
          .json({ message: "Course not found or not assigned to you" });
      }

      if (studentIds.length > 0) {
        const students = await User.find({
          _id: { $in: studentIds },
        }).populate('role');
        
        if (students.length !== studentIds.length) {
          logger.warn(`Invalid student IDs provided: ${studentIds}`);
          return res
            .status(400)
            .json({ message: "One or more student IDs are invalid" });
        }
       studentIds.forEach((studentId) => {
          const existingStudent = batch.studentIds.find(
            (s) => s.studentId.toString() === studentId
          );
          if (existingStudent) {
            existingStudent.isInThisBatch = true;
          } else {
            batch.studentIds.push({ studentId, isInThisBatch: true });
          }
        });
      }

      batch.courseId = courseId;
      await batch.save();

      const notifications = batch.studentIds.map((studentId) =>
        new Notification({
          userId: studentId,
          message: `Batch "${batch.name}" has been assigned to course "${course.title}" by ${teacher.name}`,
          link: `${process.env.BASE_URL}/student/batches/${batch._id}`,
        }).save()
      );

      const students = await User.find({
        _id: { $in: batch.studentIds },
        "role.roleName": "Student",
      });
      const emailNotifications = students.map((student) =>
        sendBatchCreatedEmail(
          student.email,
          student.name,
          batch._id,
          `Batch "${batch.name}" has been assigned to course "${course.title}" by ${teacher.name}`
        )
      );

      await Promise.all([...notifications, ...emailNotifications]);

     batch.studentIds
        .filter((s) => s.isInThisBatch === true)
        .forEach((s) => {
          getIO()
            .to(s.studentId.toString())
            .emit('notification', {
              message: `Batch "${batch.name}" has been assigned to course "${course.title}" by ${teacher.name}`,
              link: `${process.env.BASE_URL}/student/batches/${batch._id}`,
            });
        });

      logger.info(`Batch ${batchId} assigned to course ${courseId} by teacher ${teacherId}`);
      res.json({ message: "Batch assigned to course successfully", batchId });
    } catch (error) {
      logger.error("Assign batch to course error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Get Teacher assigned batch
router.get("/batches/teacher", authenticate, async (req, res) => {
  try {
    const teacherId = req.user.userId;
    const teacher = await User.findById(teacherId).populate("role");
    if (!teacher || teacher.role.roleName !== "Teacher") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const batches = await Batch.find({ teacherId })
      .populate({
        path: "courseId",
        populate: [
          { path: "createdBy", select: "name" },
          { path: "assignedTeachers", select: "name _id" },
          { path: "lastUpdatedBy", select: "name" },
        ],
      })
      .populate({
        path: "studentIds.studentId",
        select: "name email phone profileImage subjects",
      });

    const formattedBatches = batches.map((batch) => ({
      _id: batch._id,
      name: batch.name,
      courseId: batch.courseId?._id,
      courseTitle: batch.courseId?.title,
      courseDetails: batch.courseId
        ? {
            courseId: batch.courseId._id,
            title: batch.courseId.title,
            chapters: batch.courseId.chapters.map((chapter) => ({
              chapterId: chapter._id,
              title: chapter.title,
              order: chapter.order,
              lessons: chapter.lessons.map((lesson) => ({
                lessonId: lesson._id,
                title: lesson.title,
                format: lesson.format,
                learningGoals: lesson.learningGoals,
                resources: lesson.resources,
                order: lesson.order,
              })),
            })),
            targetAudience: batch.courseId.targetAudience,
            duration: batch.courseId.duration,
            createdBy: {
              _id: batch.courseId.createdBy?._id,
              name: batch.courseId.createdBy?.name,
            },
            assignedTeachers: batch.courseId.assignedTeachers.map((teacher) => ({
              _id: teacher._id,
              name: teacher.name,
            })),
            lastUpdatedBy: {
              _id: batch.courseId.lastUpdatedBy?._id,
              name: batch.courseId.lastUpdatedBy?.name,
            },
            lastUpdatedAt: batch.courseId.lastUpdatedAt,
            driveFolderId: batch.courseId.driveFolderId,
            createdAt: batch.courseId.createdAt,
          }
        : null,
      studentIds: batch.studentIds
        .filter((s) => s.isInThisBatch === true)
        .map((s) => ({
          _id: s.studentId._id,
          name: s.studentId.name,
          email: s.studentId.email,
          phone: s.studentId.phone,
          profileImage: s.studentId.profileImage,
          subjects: s.studentId.subjects,
        })),
      createdAt: batch.createdAt,
    }));

    res.json({ batches: formattedBatches });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get Teacher assigned batch by ID
router.get("/batches/teacher/:batchId", authenticate, async (req, res) => {
  try {
    const teacherId = req.user.userId;
    const batchId = req.params.batchId;

    const teacher = await User.findById(teacherId).populate("role");
    if (!teacher || teacher.role.roleName !== "Teacher") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const batch = await Batch.findOne({ _id: batchId, teacherId })
      .populate({
        path: "courseId",
        populate: [
          { path: "createdBy", select: "name" },
          { path: "assignedTeachers", select: "name _id" },
          { path: "lastUpdatedBy", select: "name" },
        ],
      })
      .populate({
        path: "studentIds.studentId",
        select: "name email phone profileImage subjects",
      });

    if (!batch) {
      return res.status(404).json({ message: "Batch not found or not assigned to you" });
    }

    const teacherCourseModifications = batch.teacherCourseModifications || {};
    const batchSpecificModifications = batch.batchSpecificModifications || {};
    const studentSpecificModifications = batch.studentSpecificModifications || [];

    let effectiveModifications = {};
    const studentIds = req.query.studentIds ? req.query.studentIds.split(",") : [];
    if (studentIds.length > 0) {
      const selectedModifications = studentSpecificModifications.find((mod) =>
        studentIds.includes(mod.studentId)
      );
      effectiveModifications = selectedModifications || batchSpecificModifications || teacherCourseModifications;
    } else {
      effectiveModifications = batchSpecificModifications || teacherCourseModifications;
    }

    const formattedBatch = {
      _id: batch._id,
      name: batch.name,
      courseId: batch.courseId?._id,
      courseTitle: batch.courseId?.title,
      courseDetails: batch.courseId
        ? {
            courseId: batch.courseId._id,
            title: effectiveModifications.title || batch.courseId.title,
            chapters: effectiveModifications.chapters
              ? effectiveModifications.chapters.map((chapter) => ({
                  chapterId: chapter._id || chapter.chapterId,
                  title: chapter.title,
                  order: chapter.order,
                  lessons: chapter.lessons
                    ? chapter.lessons.map((lesson) => ({
                        lessonId: lesson._id || lesson.lessonId,
                        title: lesson.title,
                        format: lesson.format,
                        learningGoals: lesson.learningGoals,
                        resources: lesson.resources,
                        order: lesson.order,
                      }))
                    : [],
                }))
              : batch.courseId.chapters.map((chapter) => ({
                  chapterId: chapter._id,
                  title: chapter.title,
                  order: chapter.order,
                  lessons: chapter.lessons.map((lesson) => ({
                    lessonId: lesson._id,
                    title: lesson.title,
                    format: lesson.format,
                    learningGoals: lesson.learningGoals,
                    resources: lesson.resources,
                    order: lesson.order,
                  })),
                })),
            targetAudience: effectiveModifications.targetAudience || batch.courseId.targetAudience,
            duration: effectiveModifications.duration || batch.courseId.duration,
            createdBy: {
              _id: batch.courseId.createdBy?._id,
              name: batch.courseId.createdBy?.name,
            },
            assignedTeachers: batch.courseId.assignedTeachers.map((teacher) => ({
              _id: teacher._id,
              name: teacher.name,
            })),
            lastUpdatedBy: {
              _id: effectiveModifications.lastModifiedBy || batch.courseId.lastUpdatedBy?._id,
              name: effectiveModifications.lastModifiedByName || batch.courseId.lastUpdatedBy?.name,
            },
            lastUpdatedAt: effectiveModifications.lastModifiedAt || batch.courseId.lastUpdatedAt,
            driveFolderId: batch.courseId.driveFolderId,
            createdAt: batch.courseId.createdAt,
          }
        : null,
      studentIds: batch.studentIds
        .filter((s) => s.isInThisBatch === true)
        .map((s) => s.studentId._id),
      students: batch.studentIds
        .filter((s) => s.isInThisBatch === true)
        .map((s) => ({
          _id: s.studentId._id,
          name: s.studentId.name,
          email: s.studentId.email,
          phone: s.studentId.phone,
          profileImage: s.studentId.profileImage,
          subjects: s.studentId.subjects,
        })),
      teacherCourseModifications: {
        title: teacherCourseModifications.title || null,
        chapters: teacherCourseModifications.chapters
          ? teacherCourseModifications.chapters.map((chapter) => ({
              chapterId: chapter._id || chapter.chapterId,
              title: chapter.title,
              order: chapter.order,
              lessons: chapter.lessons
                ? chapter.lessons.map((lesson) => ({
                    lessonId: lesson._id || lesson.lessonId,
                    title: lesson.title,
                    format: lesson.format,
                    learningGoals: lesson.learningGoals,
                    resources: lesson.resources,
                    order: lesson.order,
                  }))
                : [],
            }))
          : [],
        targetAudience: teacherCourseModifications.targetAudience || null,
        duration: teacherCourseModifications.duration || null,
        lastModifiedBy: teacherCourseModifications.lastModifiedBy || null,
        lastModifiedAt: teacherCourseModifications.lastModifiedAt || null,
      },
      batchSpecificModifications: {
        title: batchSpecificModifications.title || null,
        chapters: batchSpecificModifications.chapters
          ? batchSpecificModifications.chapters.map((chapter) => ({
              chapterId: chapter._id || chapter.chapterId,
              title: chapter.title,
              order: chapter.order,
              lessons: chapter.lessons
                ? chapter.lessons.map((lesson) => ({
                    lessonId: lesson._id || lesson.lessonId,
                    title: lesson.title,
                    format: lesson.format,
                    learningGoals: lesson.learningGoals,
                    resources: lesson.resources,
                    order: lesson.order,
                  }))
                : [],
            }))
          : [],
        targetAudience: batchSpecificModifications.targetAudience || null,
        duration: batchSpecificModifications.duration || null,
        lastModifiedBy: batchSpecificModifications.lastModifiedBy || null,
        lastModifiedAt: batchSpecificModifications.lastModifiedAt || null,
      },
      studentSpecificModifications: studentSpecificModifications.map((mod) => ({
        studentId: mod.studentId,
        title: mod.title || null,
        chapters: mod.chapters
          ? mod.chapters.map((chapter) => ({
              chapterId: chapter._id || chapter.chapterId,
              title: chapter.title,
              order: chapter.order,
              lessons: chapter.lessons
                ? chapter.lessons.map((lesson) => ({
                    lessonId: lesson._id || lesson.lessonId,
                    title: lesson.title,
                    format: lesson.format,
                    learningGoals: lesson.learningGoals,
                    resources: lesson.resources,
                    order: lesson.order,
                  }))
                : [],
            }))
          : [],
        targetAudience: mod.targetAudience || null,
        duration: mod.duration || null,
        lastModifiedBy: mod.lastModifiedBy || null,
        lastModifiedAt: mod.lastModifiedAt || null,
      })),
      createdAt: batch.createdAt,
    };

    res.json(formattedBatch);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all batches for Admin and Super Admin
router.get("/batches/admin", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).populate("role");
    
    // Check if the user is Admin or Super Admin
    if (!user || !["Admin", "Super Admin"].includes(user.role.roleName)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Fetch all batches, regardless of teacherId
    const batches = await Batch.find({})
      .populate({
        path: "courseId",
        populate: [
          { path: "createdBy", select: "name" },
          { path: "assignedTeachers", select: "name _id" },
          { path: "lastUpdatedBy", select: "name" },
        ],
      })
      .populate({
        path: "studentIds.studentId",
        select: "name email phone profileImage subjects",
      });

    const formattedBatches = batches.map((batch) => ({
      _id: batch._id,
      name: batch.name,
      courseId: batch.courseId?._id,
      courseTitle: batch.courseId?.title,
      courseDetails: batch.courseId
        ? {
            courseId: batch.courseId._id,
            title: batch.courseId.title,
            chapters: batch.courseId.chapters.map((chapter) => ({
              chapterId: chapter._id,
              title: chapter.title,
              order: chapter.order,
              lessons: chapter.lessons.map((lesson) => ({
                lessonId: lesson._id,
                title: lesson.title,
                format: lesson.format,
                learningGoals: lesson.learningGoals,
                resources: lesson.resources,
                order: lesson.order,
              })),
            })),
            targetAudience: batch.courseId.targetAudience,
            duration: batch.courseId.duration,
            createdBy: {
              _id: batch.courseId.createdBy?._id,
              name: batch.courseId.createdBy?.name,
            },
            assignedTeachers: batch.courseId.assignedTeachers.map((teacher) => ({
              _id: teacher._id,
              name: teacher.name,
            })),
            lastUpdatedBy: {
              _id: batch.courseId.lastUpdatedBy?._id,
              name: batch.courseId.lastUpdatedBy?.name,
            },
            lastUpdatedAt: batch.courseId.lastUpdatedAt,
            driveFolderId: batch.courseId.driveFolderId,
            createdAt: batch.courseId.createdAt,
          }
        : null,
      studentIds: batch.studentIds
        .filter((s) => s.isInThisBatch === true)
        .map((s) => ({
          _id: s.studentId._id,
          name: s.studentId.name,
          email: s.studentId.email,
          phone: s.studentId.phone,
          profileImage: s.studentId.profileImage,
          subjects: s.studentId.subjects,
        })),
      createdAt: batch.createdAt,
    }));

    res.json({ batches: formattedBatches });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all courses
router.get("/all", authenticate, async (req, res) => {
  const userId = req.user.userId;
  try {
    const user = await User.findById(userId).populate("role");
    if (
      !user ||
      !["Admin", "Super Admin", "Teacher", "Student"].includes(user.role.roleName)
    ) {
      logger.warn(`Unauthorized course fetch attempt by user: ${userId}`);
      return res.status(403).json({ message: "Not authorized" });
    }

    let courses = [];
    if (user.role.roleName === "Super Admin") {
      courses = await Course.find({}).populate("createdBy", "name").populate("assignedTeachers", "name _id");
    }
    if (["Admin"].includes(user.role.roleName)) {
      courses = await Course.find({ createdBy: userId })
        .populate("createdBy", "name")
        .populate("assignedTeachers", "name");
    } else if (user.role.roleName === "Teacher") {
      const teacherCourses = await Course.find({ assignedTeachers: userId })
        .populate("createdBy", "name")
        .populate("assignedTeachers", "name")
        .lean(); 

      const batches = await Batch.find({ teacherId: userId, courseId: { $ne: null } }).lean();

      courses = await Promise.all(
        teacherCourses.map(async (course) => {
          try {
            if (!course?._id) {
              logger.warn(`Invalid course document for teacher ${userId}: ${JSON.stringify(course)}`);
              return null; 
            }

            const batch = batches.find((b) => b.courseId?.toString() === course._id.toString());
            const hasTeacherModifications =
              batch &&
              batch.teacherCourseModifications &&
              batch.teacherCourseModifications.lastModifiedBy &&
              batch.teacherCourseModifications.lastModifiedBy.toString() === userId;

            if (hasTeacherModifications) {
              return {
                ...course,
                title: batch.teacherCourseModifications.title || course.title,
                chapters:
                  batch.teacherCourseModifications.chapters &&
                  Array.isArray(batch.teacherCourseModifications.chapters) &&
                  batch.teacherCourseModifications.chapters.length > 0
                    ? batch.teacherCourseModifications.chapters
                    : course.chapters || [],
                targetAudience: batch.teacherCourseModifications.targetAudience || course.targetAudience,
                duration: batch.teacherCourseModifications.duration || course.duration,
                lastUpdatedBy: batch.teacherCourseModifications.lastModifiedBy || course.lastUpdatedBy,
                lastUpdatedAt: batch.teacherCourseModifications.lastModifiedAt || course.lastUpdatedAt,
              };
            }
            return course;
          } catch (error) {
            logger.error(`Error processing course ${course?._id} for teacher ${userId}:`, error.message);
            return null; 
          }
        })
      );

      courses = courses.filter((course) => course !== null);
    } else if (user.role.roleName === "Student") {
      const scheduledCalls = await ScheduledCall.find({ studentIds: userId }).distinct('courseId');
      courses = await Course.find({ _id: { $in: scheduledCalls } })
        .populate("createdBy", "name")
        .populate("assignedTeachers", "name");
    }

    if (!Array.isArray(courses)) {
      logger.error(`Courses is not an array for user ${userId}: ${JSON.stringify(courses)}`);
      return res.status(500).json({ message: "Server error: Invalid course data" });
    }

    const formattedCourses = courses.map((course) => {
      try {
        return {
          courseId: course._id,
          title: course.title || '',
          chapters: Array.isArray(course.chapters)
            ? course.chapters.map((chapter) => ({
                chapterId: chapter._id || null,
                title: chapter.title || '',
                order: 0,
                lessons: Array.isArray(chapter.lessons)
                  ? chapter.lessons.map((lesson) => ({
                      lessonId: lesson._id || '',
                      title: lesson.title || '',
                      format: lesson.format || '',
                      learningGoals: Array.isArray(lesson.learningGoals) ? lesson.learningGoals : [],
                      resources: Array.isArray(lesson.resources)
                        ? lesson.resources.map((resource) => ({
                            type: resource.type || '',
                            url: resource.url || '',
                            fileId: resource.fileId || '',
                            name: resource.name || '',
                            uploadedBy: resource.uploadedBy || '',
                            uploadedAt: resource.uploadedAt || '',
                          }))
                        : [],
                      worksheets: Array.isArray(lesson.worksheets)
                        ? lesson.worksheets.map((worksheet) => ({
                            type: worksheet.type || '',
                            url: worksheet.url || '',
                            fileId: worksheet.fileId || '',
                            name: worksheet.name || '',
                            uploadedBy: worksheet.uploadedBy || '',
                            uploadedAt: worksheet.uploadedAt || '',
                          }))
                        : [],
                      order: lesson.order || '',
                    }))
                  : [],
              }))
            : [],
          targetAudience: course.targetAudience || '',
          duration: course.duration || '',
          createdBy: course.createdBy || null,
          assignedTeachers: Array.isArray(course.assignedTeachers) ? course.assignedTeachers : [],
          lastUpdatedBy: course.lastUpdatedBy || '',
          lastUpdatedAt: course.lastUpdatedAt || '',
          driveFolderId: course.driveFolderId || '',
          createdAt: course.createdAt || '',
        };
      } catch (error) {
        logger.error(`Error formatting course ${course?._id} for user ${userId}:`, error.message);
        return null; 
      }
    });

    const validFormattedCourses = formattedCourses.filter((course) => course !== null);

    logger.info(`Courses fetched by user ${userId}: ${validFormattedCourses.length} courses`);
    res.json({ courses: validFormattedCourses });
  } catch (error) {
    logger.error("Fetch courses error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get a Specific Course
router.get("/:courseId", authenticate, async (req, res) => {
  const { courseId } = req.params;
  const userId = req.user.userId;

  try {
    logger.info(`Fetching course ${courseId} for user ${userId}`);
    const user = await User.findById(userId).populate("role");

    if (
      !user ||
      !["Admin", "Super Admin", "Teacher", "Student"].includes(user.role.roleName)
    ) {
      logger.warn(`Unauthorized course fetch attempt by user: ${userId}`);
      return res.status(403).json({ message: "Not authorized" });
    }

    let course = await Course.findById(courseId)
      .populate("createdBy", "name")
      .populate("assignedTeachers", "name _id profileImage");
    if (!course) {
      logger.warn(`Course not found: ${courseId}`);
      return res.status(404).json({ message: "Course not found" });
    }

    let formattedCourse = {
      courseId: course._id,
      title: course.title,
      chapters: course.chapters.map((chapter) => ({
        chapterId: chapter._id,
        title: chapter.title,
        order: chapter.order,
        lessons: chapter.lessons.map((lesson) => ({
          lessonId: lesson._id,
          title: lesson.title,
          format: lesson.format,
          learningGoals: lesson.learningGoals,
          resources: lesson.resources.map((resource) => ({
            type: resource.type,
            url: resource.url,
            fileId: resource.fileId,
            name: resource.name,
            uploadedBy: resource.uploadedBy,
            uploadedAt: resource.uploadedAt,
          })),
          worksheets: lesson.worksheets.map((worksheet) => ({
            type: worksheet.type,
            url: worksheet.url,
            fileId: worksheet.fileId,
            name: worksheet.name,
            uploadedBy: worksheet.uploadedBy,
            uploadedAt: worksheet.uploadedAt,
          })),
          order: lesson.order,
        })),
      })),
      targetAudience: course.targetAudience,
      duration: course.duration,
      createdBy: course.createdBy,
      assignedTeachers: course.assignedTeachers,
      lastUpdatedBy: course.lastUpdatedBy,
      lastUpdatedAt: course.lastUpdatedAt,
      driveFolderId: course.driveFolderId,
      createdAt: course.createdAt,
    };

    if (user.role.roleName === "Teacher") {
      const teacherIds = course.assignedTeachers.map((teacher) =>
        teacher._id.toString()
      );
      if (!teacherIds.includes(userId)) {
        logger.warn(`Teacher ${userId} not assigned to course: ${courseId}`);
        return res
          .status(403)
          .json({ message: "Not authorized to view this course" });
      }

      const batches = await Batch.find({
        teacherId: userId,
        courseId: courseId,
        isDeleted: false,
      }).lean();

      let latestModifications = null;
      let latestModifiedAt = null;

      for (const batch of batches) {
        if (
          batch.teacherCourseModifications &&
          batch.teacherCourseModifications.lastModifiedBy?.toString() === userId &&
          batch.teacherCourseModifications.lastModifiedAt
        ) {
          const modifiedAt = new Date(batch.teacherCourseModifications.lastModifiedAt);
          if (!latestModifiedAt || modifiedAt > latestModifiedAt) {
            latestModifiedAt = modifiedAt;
            latestModifications = batch.teacherCourseModifications;
          }
        }
      }

      if (latestModifications) {
        formattedCourse = {
          ...formattedCourse,
          title: latestModifications.title || course.title,
          targetAudience: latestModifications.targetAudience || course.targetAudience,
          duration: latestModifications.duration || course.duration,
          lastUpdatedBy: latestModifications.lastModifiedBy || course.lastUpdatedBy,
          lastUpdatedAt: latestModifications.lastModifiedAt || course.lastUpdatedAt,
          chapters: latestModifications.chapters && latestModifications.chapters.length > 0
            ? latestModifications.chapters.map((modChapter, index) => ({
                chapterId: modChapter._id || course.chapters[index]?._id || null,
                title: modChapter.title || course.chapters[index]?.title || `Chapter ${index + 1}`,
                order: modChapter.order || index + 1,
                lessons: modChapter.lessons?.map((modLesson, lessonIndex) => ({
                  lessonId: modLesson._id || course.chapters[index]?.lessons[lessonIndex]?._id || null,
                  title: modLesson.title || course.chapters[index]?.lessons[lessonIndex]?.title || `Lesson ${lessonIndex + 1}`,
                  format: modLesson.format || course.chapters[index]?.lessons[lessonIndex]?.format || null,
                  learningGoals: modLesson.learningGoals || course.chapters[index]?.lessons[lessonIndex]?.learningGoals || [],
                  resources: modLesson.resources?.length > 0 ? modLesson.resources.map((resource) => ({
                    type: resource.type,
                    url: resource.url,
                    fileId: resource.fileId,
                    name: resource.name,
                    uploadedBy: resource.uploadedBy,
                    uploadedAt: resource.uploadedAt,
                  })) : course.chapters[index]?.lessons[lessonIndex]?.resources || [],
                  worksheets: modLesson.worksheets?.length > 0 ? modLesson.worksheets.map((worksheet) => ({
                    type: worksheet.type,
                    url: worksheet.url,
                    fileId: worksheet.fileId,
                    name: worksheet.name,
                    uploadedBy: worksheet.uploadedBy,
                    uploadedAt: worksheet.uploadedAt,
                  })) : course.chapters[index]?.lessons[lessonIndex]?.worksheets || [],
                  order: modLesson.order || lessonIndex + 1,
                })) || [],
              }))
            : formattedCourse.chapters,
        };
      }
    } else if (user.role.roleName === "Admin") {
      if (course.createdBy._id.toString() !== userId) {
        logger.warn(`Admin ${userId} not authorized for course: ${courseId}`);
        return res
          .status(403)
          .json({ message: "Not authorized to view this course" });
      }
    } else if (user.role.roleName === "Student") {
      const scheduledCall = await ScheduledCall.findOne({
        courseId,
        studentIds: userId,
      });
      if (!scheduledCall) {
        logger.warn(`Student ${userId} not assigned to course: ${courseId}`);
        return res
          .status(403)
          .json({ message: "Not authorized to view this course" });
      }
    }

    logger.info(`Course ${courseId} fetched by user ${userId}`);
    res.json(formattedCourse);
  } catch (error) {
    logger.error("Fetch course error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Admin or Teacher: Add and Remove Worksheets for a Lesson
router.put(
  "/:courseId/lesson/:lessonId/worksheets",
  authenticate,
  upload.any(),
  [
    check("courseId").isMongoId().withMessage("Valid course ID is required"),
    check("lessonId").isMongoId().withMessage("Valid lesson ID is required"),
    check("worksheetIds")
      .optional()
      .isArray()
      .withMessage("worksheetIds must be an array")
      .custom((value) => value.every((id) => mongoose.Types.ObjectId.isValid(id)))
      .withMessage("All worksheet IDs must be valid MongoDB ObjectIds"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Validation errors in manage worksheets:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { courseId, lessonId } = req.params;
    const { worksheetIds = [] } = req.body;
    const userId = req.user.userId;

    try {
      const user = await User.findById(userId).populate("role");
      if (
        !user ||
        !["Admin", "Super Admin", "Teacher"].includes(user.role.roleName)
      ) {
        logger.warn(`Unauthorized worksheet management attempt by user: ${userId}`);
        return res.status(403).json({ message: "Not authorized" });
      }

      const course = await Course.findById(courseId);
      if (!course) {
        logger.warn(`Course not found: ${courseId}`);
        return res.status(404).json({ message: "Course not found" });
      }

      if (user.role.roleName === "Teacher") {
        if (
          !course.assignedTeachers.map((id) => id.toString()).includes(userId)
        ) {
          logger.warn(`Teacher ${userId} not assigned to course: ${courseId}`);
          return res
            .status(403)
            .json({ message: "Not authorized to modify this course" });
        }
      } else if (["Admin", "Super Admin"].includes(user.role.roleName)) {
        if (course.createdBy.toString() !== userId) {
          logger.warn(`Admin ${userId} not authorized for course: ${courseId}`);
          return res
            .status(403)
            .json({ message: "Not authorized to modify this course" });
        }
      }

      const lesson = course.chapters
        .flatMap((chapter) => chapter.lessons)
        .find((lesson) => lesson._id.toString() === lessonId);
      if (!lesson) {
        logger.warn(`Lesson ${lessonId} not found in course: ${courseId}`);
        return res.status(404).json({ message: "Lesson not found in this course" });
      }

      const newWorksheets = [];

      for (const file of req.files || []) {
        const { fileId, webViewLink } = await uploadCourseFileToDrive(
          file.path,
          file.originalname,
          file.mimetype,
          course.title,
          course.driveFolderId
        );
        const worksheet = {
          _id: new mongoose.Types.ObjectId(), 
          type: mimeToType[file.mimetype] || file.mimetype.split("/")[1],
          url: webViewLink,
          fileId,
          name: file.originalname,
          uploadedBy: userId,
          uploadedAt: new Date(),
        };
        newWorksheets.push(worksheet);
        deleteLocalFile(file.path);
      }

      if (req.body.fileId && req.body.url && req.body.type && req.body.name) {
        const worksheet = {
          _id: new mongoose.Types.ObjectId(),
          type: req.body.type,
          url: req.body.url,
          fileId: req.body.fileId,
          name: req.body.name,
          uploadedBy: userId,
          uploadedAt: new Date(),
        };
        newWorksheets.push(worksheet);
      }

      // Handle worksheet removal
      const removedWorksheets = [];
      if (worksheetIds.length > 0) {
        worksheetIds.forEach((worksheetId) => {
          const worksheetIndex = lesson.worksheets.findIndex(
            (w) => w._id.toString() === worksheetId
          );
          if (worksheetIndex !== -1) {
            const worksheet = lesson.worksheets[worksheetIndex];
            removedWorksheets.push(worksheet);
            lesson.worksheets.splice(worksheetIndex, 1);
          }
        });
      }

      if (newWorksheets.length === 0 && removedWorksheets.length === 0) {
        logger.warn(`No worksheets added or removed for lesson ${lessonId}`);
        return res.status(400).json({ message: "No worksheets added or removed" });
      }

      if (newWorksheets.length > 0) {
        lesson.worksheets.push(...newWorksheets);
      }

      course.lastUpdatedBy = userId;
      course.lastUpdatedAt = new Date();
      await course.save();

      const notifications = [];
      const emailNotifications = [];

      const admins = await User.find({
        role: {
          $in: await Role.find({ roleName: { $in: ["Admin", "Super Admin"] } }),
        },
      });
      admins.forEach((admin) => {
        if (newWorksheets.length > 0) {
          notifications.push(
            new Notification({
              userId: admin._id,
              message: `Worksheets added to lesson "${lesson.title}" in course "${course.title}" by ${user.name}`,
              link: `${process.env.BASE_URL}/admin/courses/${course._id}`,
            }).save()
          );
        }
        if (removedWorksheets.length > 0) {
          removedWorksheets.forEach((worksheet) => {
            notifications.push(
              new Notification({
                userId: admin._id,
                message: `Worksheet "${worksheet.name}" removed from lesson "${lesson.title}" in course "${course.title}" by ${user.name}`,
                link: `${process.env.BASE_URL}/admin/courses/${course._id}`,
              }).save()
            );
          });
        }
      });

      const assignedTeachers = await User.find({
        _id: { $in: course.assignedTeachers },
      });
      assignedTeachers.forEach((teacher) => {
        if (teacher._id.toString() !== userId) {
          if (newWorksheets.length > 0) {
            notifications.push(
              new Notification({
                userId: teacher._id,
                message: `Worksheets added to lesson "${lesson.title}" in course "${course.title}" by ${user.name}`,
                link: `${process.env.BASE_URL}/teacher/courses/${course._id}`,
              }).save()
            );
            emailNotifications.push(
              sendCourseEditedEmail(
                teacher.email,
                teacher.name,
                course._id,
                `Worksheets added to lesson "${lesson.title}" in course "${course.title}" by ${user.name}`
              )
            );
            getIO()
              .to(teacher._id.toString())
              .emit("notification", {
                message: `Worksheets added to lesson "${lesson.title}" in course "${course.title}" by ${user.name}`,
                link: `${process.env.BASE_URL}/teacher/courses/${course._id}`,
              });
          }
          if (removedWorksheets.length > 0) {
            removedWorksheets.forEach((worksheet) => {
              notifications.push(
                new Notification({
                  userId: teacher._id,
                  message: `Worksheet "${worksheet.name}" removed from lesson "${lesson.title}" in course "${course.title}" by ${user.name}`,
                  link: `${process.env.BASE_URL}/teacher/courses/${course._id}`,
                }).save()
              );
              emailNotifications.push(
                sendCourseEditedEmail(
                  teacher.email,
                  teacher.name,
                  course._id,
                  `Worksheet "${worksheet.name}" removed from lesson "${lesson.title}" in course "${course.title}" by ${user.name}`
                )
              );
              getIO()
                .to(teacher._id.toString())
                .emit("notification", {
                  message: `Worksheet "${worksheet.name}" removed from lesson "${lesson.title}" in course "${course.title}" by ${user.name}`,
                  link: `${process.env.BASE_URL}/teacher/courses/${course._id}`,
                });
            });
          }
        }
      });

      const batches = await Batch.find({ courseId });
      const studentIds = [...new Set(batches.flatMap((batch) => batch.studentIds.map((s) => s.studentId)))];
      const students = await User.find({ _id: { $in: studentIds } });
      students.forEach((student) => {
        if (newWorksheets.length > 0) {
          notifications.push(
            new Notification({
              userId: student._id,
              message: `Worksheets added to lesson "${lesson.title}" in course "${course.title}" by ${user.name}`,
              link: `${process.env.BASE_URL}/student/courses/${course._id}`,
            }).save()
          );
          emailNotifications.push(
            sendStudentCourseEditedEmail(
              student.email,
              student.name,
              course._id,
              `Worksheets added to lesson "${lesson.title}" in course "${course.title}" by ${user.name}`
            )
          );
        }
        if (removedWorksheets.length > 0) {
          removedWorksheets.forEach((worksheet) => {
            notifications.push(
              new Notification({
                userId: student._id,
                message: `Worksheet "${worksheet.name}" removed from lesson "${lesson.title}" in course "${course.title}" by ${user.name}`,
                link: `${process.env.BASE_URL}/student/courses/${course._id}`,
              }).save()
            );
            emailNotifications.push(
              sendStudentCourseEditedEmail(
                student.email,
                student.name,
                course._id,
                `Worksheet "${worksheet.name}" removed from lesson "${lesson.title}" in course "${course.title}" by ${user.name}`
              )
            );
          });
        }
      });

      await Promise.all([...notifications, ...emailNotifications]);

      logger.info(
        `Worksheets managed for lesson ${lessonId} in course ${courseId} by user ${userId}: ` +
        `${newWorksheets.length} added, ${removedWorksheets.length} removed`
      );
      res.json({
        message: "Worksheets managed successfully",
        addedWorksheetIds: newWorksheets.map((w) => w._id),
        removedWorksheetIds: removedWorksheets.map((w) => w._id),
      });
    } catch (error) {
      logger.error("Manage worksheets error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

//get Worksheets
router.get(
  "/:courseId/lesson/:lessonId/worksheets",
  authenticate,
  [
    check("courseId").isMongoId().withMessage("Valid course ID is required"),
    check("lessonId").isMongoId().withMessage("Valid lesson ID is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Validation errors in get worksheets:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { courseId, lessonId } = req.params;
    const userId = req.user.userId;

    try {
      const user = await User.findById(userId).populate("role");
      if (
        !user ||
        !["Admin", "Super Admin", "Teacher", "Student"].includes(user.role.roleName)
      ) {
        logger.warn(`Unauthorized worksheet access attempt by user: ${userId}`);
        return res.status(403).json({ message: "Not authorized" });
      }

      const course = await Course.findById(courseId);
      if (!course) {
        logger.warn(`Course not found: ${courseId}`);
        return res.status(404).json({ message: "Course not found" });
      }

      let isAuthorized = false;
      if (user.role.roleName === "Super Admin") {
        isAuthorized = true;
      } else if (user.role.roleName === "Admin") {
        if (course.createdBy.toString() === userId) {
          isAuthorized = true;
        }
      } else if (user.role.roleName === "Teacher") {
        if (course.assignedTeachers.map((id) => id.toString()).includes(userId)) {
          isAuthorized = true;
        }
      } else if (user.role.roleName === "Student") {
        const batches = await Batch.find({ courseId });
        const studentBatch = batches.find((batch) =>
          batch.studentIds.some((s) => s.studentId.toString() === userId)
        );
        if (studentBatch) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        logger.warn(`User ${userId} not authorized to access worksheets for course: ${courseId}`);
        return res.status(403).json({ message: "Not authorized to access this course" });
      }

      logger.debug(`Course ${courseId} chapters: ${JSON.stringify(course.chapters, null, 2)}`);

      const lesson = course.chapters
        .flatMap((chapter) => chapter.lessons)
        .find((lesson) => lesson._id.toString() === lessonId);

      if (!lesson) {
        logger.warn(
          `Lesson ${lessonId} not found in course: ${courseId}. Available lesson IDs: ${course.chapters
            .flatMap((chapter) => chapter.lessons)
            .map((l) => l._id.toString())
            .join(", ")}`
        );
        return res.status(404).json({ message: "Lesson not found in this course" });
      }

      logger.debug(`Found lesson: ${JSON.stringify(lesson, null, 2)}`);

      const worksheets = lesson.worksheets.map((worksheet) => ({
        id: worksheet._id,
        type: worksheet.type,
        url: worksheet.url,
        fileId: worksheet.fileId,
        name: worksheet.name,
        uploadedBy: worksheet.uploadedBy,
        uploadedAt: worksheet.uploadedAt,
      }));

      logger.info(`Worksheets retrieved for lesson ${lessonId} in course ${courseId} by user ${userId}`);
      res.json({
        message: worksheets.length > 0 ? "Worksheets retrieved successfully" : "No worksheets found for this lesson",
        worksheets,
      });
    } catch (error) {
      logger.error(`Get worksheets error for course ${courseId}, lesson ${lessonId}:`, error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

//get batches by courseId
router.get("/batch/by-course/:courseId", authenticate, async (req, res) => {
  try {
    const { courseId } = req.params;

    const batches = await Batch.find({ courseId, isDeleted: false })
      .populate({
        path: "courseId",      
        select: "title"   
      })
      .lean();

    res.json({ batches });
  } catch (err) {
    res.status(500).json({ error: "Server error", message: err.message });
  }
});


module.exports = router;
