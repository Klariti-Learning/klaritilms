const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const authenticate = require("../middleware/auth");
const Attendance = require("../models/Attendance");
const Batch = require("../models/Batch");
const Course = require("../models/Course");
const User = require("../models/User");
const Role = require("../models/Role");
const ScheduledCall = require("../models/ScheduledCall");
const logger = require("../utils/logger");
const XLSX = require("xlsx");

// Create or Update Attendance
router.post(
  "/mark",
  authenticate,
  [
    check("callId").isMongoId().withMessage("Valid call ID is required"),
    check("attendances")
      .isArray()
      .withMessage("Attendances must be an array")
      .custom((value) =>
        value.every(
          (item) =>
            mongoose.Types.ObjectId.isValid(item.studentId) &&
            ["Present", "Absent"].includes(item.status)
        )
      )
      .withMessage(
        "Each attendance must have a valid studentId and status (Present/Absent)"
      ),
    check("idempotencyKey")
      .notEmpty()
      .withMessage("Idempotency key is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Validation errors in mark attendance:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { callId, attendances, idempotencyKey } = req.body;
    const userId = req.user.userId;

    try {
      const user = await User.findById(userId).populate("role");
      if (
        !user ||
        !["Teacher", "Admin", "Super Admin"].includes(user.role.roleName)
      ) {
        logger.warn(`Unauthorized attendance marking attempt by user: ${userId}`);
        return res.status(403).json({ message: "Not authorized" });
      }

      const call = await ScheduledCall.findById(callId).populate("batchId");
      if (!call) {
        logger.warn(`Scheduled call not found: ${callId}`);
        return res.status(404).json({ message: "Scheduled call not found" });
      }

      if (
        user.role.roleName === "Teacher" &&
        call.teacherId.toString() !== userId
      ) {
        logger.warn(`Teacher ${userId} not assigned to call: ${callId}`);
        return res
          .status(403)
          .json({ message: "Not authorized to mark attendance for this call" });
      }

      const batch = await Batch.findById(call.batchId);
      if (!batch) {
        logger.warn(`Batch not found for call: ${callId}`);
        return res.status(404).json({ message: "Batch not found" });
      }

      const existingByIdempotency = await Attendance.findOne({ idempotencyKey });
      if (existingByIdempotency) {
        logger.info(
          `Duplicate request with idempotency key: ${idempotencyKey} for callId: ${callId}`
        );
        return res.json({
          message: "Attendance already marked",
          attendance: existingByIdempotency,
        });
      }

      const updatedAttendance = await Attendance.findOneAndUpdate(
        { callId },
        {
          $set: {
            batchId: call.batchId,
            courseId: call.courseId,
            teacherId: call.teacherId,
            attendances,
            date: call.date,
            createdBy: userId,
            idempotencyKey,
            updatedAt: new Date(),
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      logger.info(
        `Attendance marked for call ${callId} by user ${userId} with idempotencyKey: ${idempotencyKey}`
      );
      res.json({
        message: "Attendance marked successfully",
        attendance: updatedAttendance,
      });
    } catch (error) {
      if (error.code === 11000) {
        logger.warn(`Duplicate attendance record for callId: ${callId}`);
        return res
          .status(400)
          .json({ message: "Attendance record already exists for this call" });
      }
      logger.error("Mark attendance error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Get Attendance Data
router.get(
  "/data",
  authenticate,
  [
    check("fromDate").optional().isISO8601().withMessage("Invalid from date"),
    check("toDate").optional().isISO8601().withMessage("Invalid to date"),
    check("batchId").optional().isMongoId().withMessage("Invalid batch ID"),
    check("studentId").optional().isMongoId().withMessage("Invalid student ID"),
    check("callId").optional().isMongoId().withMessage("Invalid call ID"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Validation errors in get attendance data:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { fromDate, toDate, batchId, studentId, callId } = req.query;
    const userId = req.user.userId;

    try {
      const user = await User.findById(userId).populate("role");
      if (!user || !["Student", "Teacher", "Admin", "Super Admin"].includes(user.role.roleName)) {
        logger.warn(`Unauthorized attendance data access attempt by user: ${userId}`);
        return res.status(403).json({ message: "Not authorized" });
      }

      let query = {};
      if (fromDate || toDate) {
        query.date = {};
        if (fromDate) query.date.$gte = new Date(fromDate);
        if (toDate) query.date.$lte = new Date(toDate);
      }

      if (batchId) query.batchId = batchId;
      if (studentId) query["attendances.studentId"] = studentId;
      if (callId) query.callId = callId;
      if (user.role.roleName === "Student") query["attendances.studentId"] = userId;
      else if (user.role.roleName === "Teacher") query.teacherId = userId;

      const attendanceRecordsRaw = await Attendance.find(query)
        .populate("batchId", "name")
        .populate("courseId", "title")
        .populate("teacherId", "name")
        .populate("attendances.studentId", "name")
        .populate("attendances.markedBy", "name")
        .populate("callId", "startTime endTime")
        .lean();

      const attendanceRecords = attendanceRecordsRaw.map(record => {
        return {
          attendanceId: record._id,
          callId: record.callId?._id || record.callId,
          batch: record.batchId
            ? {
                batchId: record.batchId._id,
                name: record.batchId.name,
              }
            : null,
          course: record.courseId
            ? {
                courseId: record.courseId._id,
                title: record.courseId.title,
              }
            : null,
          teacher: record.teacherId
            ? {
                teacherId: record.teacherId._id,
                name: record.teacherId.name,
              }
            : null,
          date: record.date || record.classDate,
          startTime: record.callId?.startTime || record.classStartTime || record.startTime || null,
          endTime: record.callId?.endTime || record.classEndTime || record.endTime || null,
          timezone: record.timezone || "Asia/Calcutta",
          students: (record.attendances || record.studentAttendance || []).map(student => ({
            studentId: student.studentId?._id || student.studentId,
            name: student.studentId?.name || "N/A",
            status: student.status,
            markedAt: record.callId?.endTime || record.classEndTime || record.endTime || null, 
            markedBy: record.teacherId
              ? {
                  teacherId: record.teacherId._id,
                  name: record.teacherId.name,
                }
              : {
                  teacherId: student.markedBy?._id || student.markedBy,
                  name: student.markedBy?.name || "N/A",
                },
          })),
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        };
      });

      res.json({ attendanceRecords });
    } catch (error) {
      logger.error("Get attendance data error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);


// Export Attendance as Excel
router.get("/export", authenticate, async (req, res) => {
  const { fromDate, toDate, batchId, studentId, callId } = req.query;
  const userId = req.user.userId;

  try {
    const user = await User.findById(userId).populate("role");
    if (!user || !["Teacher", "Admin", "Super Admin"].includes(user.role.roleName)) {
      logger.warn(`Unauthorized attendance export attempt by user: ${userId}`);
      return res.status(403).json({ message: "Not authorized" });
    }

    let query = {};

    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) query.date.$gte = new Date(fromDate);
      if (toDate) query.date.$lte = new Date(toDate);
    }

    if (batchId) {
      query.batchId = batchId;
    }

    if (studentId) {
      query["attendances.studentId"] = studentId;
    }

    if (callId) {
      query.callId = callId;
    }

    if (user.role.roleName === "Teacher") {
      query.teacherId = userId;
    }

    const attendanceRecords = await Attendance.find(query)
      .populate("batchId", "name")
      .populate("courseId", "title")
      .populate("teacherId", "name")
      .populate("attendances.studentId", "name")
      .lean();

    const worksheetData = [];
    worksheetData.push([
      "Date",
      "Course",
      "Batch",
      "Teacher",
      "Student",
      "Status",
    ]);

    attendanceRecords.forEach((record) => {
      record.attendances.forEach((attendance) => {
        worksheetData.push([
          new Date(record.date).toLocaleDateString(),
          record.courseId?.title || "N/A",
          record.batchId?.name || "N/A",
          record.teacherId?.name || "N/A",
          attendance.studentId?.name || "N/A",
          attendance.status,
        ]);
      });
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

    worksheet["!cols"] = [
      { wch: 15 }, 
      { wch: 20 }, 
      { wch: 20 }, 
      { wch: 20 }, 
      { wch: 20 }, 
      { wch: 15 }, 
    ];

    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=attendance.xlsx"
    );

    res.send(excelBuffer);
    logger.info(`Attendance exported by user ${userId}`);
  } catch (error) {
    logger.error("Export attendance error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


module.exports = router;