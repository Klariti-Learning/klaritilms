
const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const authenticate = require("../middleware/auth");
const Attendance = require("../models/Attendance");
const Batch = require("../models/Batch");
const User = require("../models/User");
const ScheduledCall = require("../models/ScheduledCall");
const logger = require("../utils/logger");
const XLSX = require("xlsx");
const moment = require("moment");

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
        logger.warn(
          `Unauthorized attendance marking attempt by user: ${userId}`
        );
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

      const existingByIdempotency = await Attendance.findOne({
        idempotencyKey,
      });
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
    check("teacherId").optional().isMongoId().withMessage("Invalid teacher ID"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Validation errors in get attendance data:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { fromDate, toDate, batchId, studentId, callId, teacherId } = req.query;
    const userId = req.user.userId;

    try {
      const user = await User.findById(userId).populate("role");
      if (
        !user ||
        !["Student", "Teacher", "Admin", "Super Admin"].includes(user.role.roleName)
      ) {
        logger.warn(`Unauthorized attendance data access attempt by user: ${userId}`);
        return res.status(403).json({ message: "Not authorized" });
      }

      let query = {};
      if (fromDate || toDate) {
        query.date = {};
        if (fromDate) query.date.$gte = new Date(fromDate);
        if (toDate) {
          const endOfDay = new Date(toDate);
          endOfDay.setUTCHours(23, 59, 59, 999);
          query.date.$lte = endOfDay;
        }
      }
      if (batchId) query.batchId = batchId;
      if (studentId) query["attendances.studentId"] = studentId;
      if (callId) query.callId = callId;

      logger.debug("Query for attendance data:", query);

      let response = {};

      if (["Admin", "Super Admin"].includes(user.role.roleName) && teacherId) {
        query.teacherId = teacherId;

        const batches = await Batch.find({ teacherId, isDeleted: { $ne: true } })
          .select("_id name")
          .lean();
        if (!batches.length) {
          logger.warn(`No batches found for teacher: ${teacherId}`);
          return res.status(404).json({ message: "No batches found for the teacher" });
        }

        const attendanceRecordsRaw = await Attendance.find({
          ...query,
          batchId: { $in: batches.map((batch) => batch._id) },
        })
          .populate({
            path: "batchId",
            select: "name",
          })
          .populate("courseId", "title")
          .populate("teacherId", "name")
          .populate("attendances.studentId", "name parentGuardianName parentGuardianNumber")
          .populate("attendances.markedBy", "name")
          .populate({
            path: "callId",
            select: "startTime endTime",
          })
          .lean();

        logger.debug("Raw attendance records for admin:", JSON.stringify(attendanceRecordsRaw, null, 2));

        const batchAttendance = batches.map((batch) => {
          const batchRecords = attendanceRecordsRaw
            .filter(
              (record) =>
                record.batchId?._id.toString() === batch._id.toString()
            )
            .map((record) => ({
              attendanceId: record._id,
              callId: record.callId?._id?.toString() || null,
              batch: record.batchId
                ? {
                    batchId: record.batchId._id?.toString() || null,
                    name: record.batchId.name || "N/A",
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
              startTime: record.callId?.startTime || null,
              endTime: record.callId?.endTime || null,
              timezone: record.timezone || "Asia/Calcutta",
              students: (record.attendances || []).map((student) => ({
                studentId: student.studentId?._id || student.studentId,
                name: student.studentId?.name || "N/A",
                parentGuardianName: student.studentId?.parentGuardianName || "N/A",
                parentGuardianNumber: student.studentId?.parentGuardianNumber || "N/A",
                status: student.status,
                markedAt: student.markedAt || record.callId?.endTime || null,
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
            }));

          return {
            batchId: batch._id,
            batchName: batch.name,
            attendanceRecords: batchRecords,
          };
        });

        response = { batchAttendance };
      } else {
        if (user.role.roleName === "Student") {
          query["attendances.studentId"] = userId;
        } else if (user.role.roleName === "Teacher") {
          query.teacherId = userId;
        }

        const attendanceRecordsRaw = await Attendance.find(query)
          .populate({
            path: "batchId",
            select: "name",
          })
          .populate("courseId", "title")
          .populate("teacherId", "name")
          .populate("attendances.studentId", "name parentGuardianName parentGuardianNumber")
          .populate("attendances.markedBy", "name")
          .populate({
            path: "callId",
            select: "startTime endTime",
          })
          .lean();

        logger.debug("Raw attendance records for non-admin:", JSON.stringify(attendanceRecordsRaw, null, 2));

        const attendanceRecords = attendanceRecordsRaw.map((record) => ({
          attendanceId: record._id,
          callId: record.callId?._id?.toString() || null,
          batch: record.batchId
            ? {
                batchId: record.batchId._id?.toString() || null,
                name: record.batchId.name || "N/A",
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
          startTime: record.callId?.startTime || null,
          endTime: record.callId?.endTime || null,
          timezone: record.timezone || "Asia/Calcutta",
          students: (record.attendances || []).map((student) => ({
            studentId: student.studentId?._id || student.studentId,
            name: student.studentId?.name || "N/A",
            parentGuardianName: student.studentId?.parentGuardianName || "N/A",
            parentGuardianNumber: student.studentId?.parentGuardianNumber || "N/A",
            status: student.status,
            markedAt: student.markedAt || record.callId?.endTime || null,
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
        }));

        response = { attendanceRecords };
      }

      res.json(response);
    } catch (error) {
      logger.error("Get attendance data error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

// Export Attendance as Excel
router.get(
  "/export",
  authenticate,
  [
    check("fromDate").optional().isISO8601().withMessage("Invalid from date"),
    check("toDate").optional().isISO8601().withMessage("Invalid to date"),
    check("batchId").optional().isMongoId().withMessage("Invalid batch ID"),
    check("studentId").optional().isMongoId().withMessage("Invalid student ID"),
    check("callId").optional().isMongoId().withMessage("Invalid call ID"),
    check("teacherId").optional().isMongoId().withMessage("Invalid teacher ID"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Validation errors in export attendance:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { fromDate, toDate, batchId, studentId, callId, teacherId } = req.query;
    const userId = req.user.userId;

    try {
      const user = await User.findById(userId).populate("role");
      if (
        !user ||
        !["Student", "Teacher", "Admin", "Super Admin"].includes(user.role.roleName)
      ) {
        logger.warn(`Unauthorized attendance export attempt by user: ${userId}`);
        return res.status(403).json({ message: "Not authorized" });
      }

      let query = {};
      let batchAttendance = [];

      if (fromDate || toDate) {
        query.date = {};
        if (fromDate) query.date.$gte = new Date(fromDate);
        if (toDate) {
          const endOfDay = new Date(toDate);
          endOfDay.setUTCHours(23, 59, 59, 999);
          query.date.$lte = endOfDay;
        }
      }
      if (batchId) query.batchId = batchId;
      if (studentId) query["attendances.studentId"] = studentId;
      if (callId) query.callId = callId;

      if (["Admin", "Super Admin"].includes(user.role.roleName) && teacherId) {
        query.teacherId = teacherId;

        const batches = await Batch.find({ teacherId, isDeleted: { $ne: true } })
          .select("_id name")
          .lean();
        if (!batches.length) {
          logger.warn(`No batches found for teacher: ${teacherId}`);
          return res.status(404).json({ message: "No batches found for the teacher" });
        }

        const attendanceRecordsRaw = await Attendance.find({
          ...query,
          batchId: { $in: batches.map((batch) => batch._id) },
        })
          .populate("batchId", "name")
          .populate("courseId", "title")
          .populate("teacherId", "name")
          .populate("attendances.studentId", "name parentGuardianName parentGuardianNumber")
          .lean();

        logger.info(`Found ${attendanceRecordsRaw.length} attendance records for teacher ${teacherId}`);

        const attendanceRecords = attendanceRecordsRaw.map((record) => ({
          attendanceId: record._id,
          callId: record.callId?._id?.toString() || null,
          batch: record.batchId
            ? {
                batchId: record.batchId._id?.toString() || null,
                name: record.batchId.name || "No Batch",
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
          startTime: record.callId?.startTime || null,
          endTime: record.callId?.endTime || null,
          timezone: record.timezone || "Asia/Calcutta",
          students: (record.attendances || []).map((student) => ({
            studentId: student.studentId?._id || student.studentId,
            name: student.studentId?.name || "N/A",
            parentGuardianName: student.studentId?.parentGuardianName || "N/A",
            parentGuardianNumber: student.studentId?.parentGuardianNumber || "N/A",
            status: student.status,
            markedAt: student.markedAt || record.callId?.endTime || null,
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
        }));

        batchAttendance = batches.map((batch) => {
          const batchRecords = attendanceRecords
            .filter(
              (record) =>
                record.batch?.batchId === batch._id.toString()
            )
            .map((record) => ({
              ...record,
              batch: {
                batchId: batch._id.toString(),
                name: batch.name || "No Batch",
              },
            }));

          return {
            batchId: batch._id.toString(),
            batchName: batch.name,
            attendanceRecords: batchRecords,
          };
        }).filter((batch) => batch.attendanceRecords.length > 0); // Remove empty batches
      } else {
        if (user.role.roleName === "Student") {
          query["attendances.studentId"] = userId;
        } else if (user.role.roleName === "Teacher") {
          query.teacherId = userId;
        }

        const attendanceRecordsRaw = await Attendance.find(query)
          .populate("batchId", "name")
          .populate("courseId", "title")
          .populate("teacherId", "name")
          .populate("attendances.studentId", "name parentGuardianName parentGuardianNumber")
          .lean();

        logger.info(`Found ${attendanceRecordsRaw.length} attendance records`);

        const attendanceRecords = attendanceRecordsRaw.map((record) => ({
          attendanceId: record._id,
          callId: record.callId?._id?.toString() || null,
          batch: record.batchId
            ? {
                batchId: record.batchId._id?.toString() || null,
                name: record.batchId.name || "No Batch",
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
          startTime: record.callId?.startTime || null,
          endTime: record.callId?.endTime || null,
          timezone: record.timezone || "Asia/Calcutta",
          students: (record.attendances || []).map((student) => ({
            studentId: student.studentId?._id || student.studentId,
            name: student.studentId?.name || "N/A",
            parentGuardianName: student.studentId?.parentGuardianName || "N/A",
            parentGuardianNumber: student.studentId?.parentGuardianNumber || "N/A",
            status: student.status,
            markedAt: student.markedAt || record.callId?.endTime || null,
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
        }));

        const batchMap = new Map();
        attendanceRecords.forEach((record) => {
          const batchId = record.batch?.batchId || "no-batch";
          const batchName = record.batch?.name || "No Batch";
          if (!batchMap.has(batchId)) {
            batchMap.set(batchId, {
              batchId,
              batchName,
              attendanceRecords: [],
            });
          }
          batchMap.get(batchId).attendanceRecords.push(record);
        });
        batchAttendance = Array.from(batchMap.values());
      }

      const uniqueDates = Array.from(
        new Set(
          batchAttendance.flatMap((batch) =>
            batch.attendanceRecords.map((record) =>
              moment(record.date).format("DD-MMM-YY")
            )
          )
        )
      ).sort((a, b) => moment(a, "DD-MMM-YY").diff(moment(b, "DD-MMM-YY")));

      const studentAttendanceMap = new Map();
      batchAttendance.forEach((batch) => {
        batch.attendanceRecords.forEach((record) => {
          const courseId = record.course?.courseId || "N/A";
          const formattedDate = moment(record.date).format("DD-MMM-YY");
          record.students.forEach((student) => {
            const key = `${student.studentId}-${batch.batchId}-${courseId}`;
            if (!studentAttendanceMap.has(key)) {
              studentAttendanceMap.set(key, {
                studentId: student.studentId,
                studentName: student.name,
                parentGuardianName: student.parentGuardianName || "N/A",
                parentGuardianNumber: student.parentGuardianNumber || "N/A",
                teacherName: record.teacher.name,
                classType: record.course?.title || "N/A",
                batchId: batch.batchId,
                batchName: batch.batchName,
                attendance: new Map(),
              });
            }
            studentAttendanceMap
              .get(key)
              .attendance.set(formattedDate, student.status);
          });
        });
      });

      const studentAttendance = Array.from(studentAttendanceMap.values());

      const workbook = XLSX.utils.book_new();
      const headerStyle = {
        font: { bold: true, sz: 12, name: "Arial" },
        fill: { fgColor: { rgb: "E6E6FA" } },
        alignment: { horizontal: "center" },
      };

      const worksheetData = [
        [
          "S.No.",
          "Teacher Name",
          "Student Name",
          "Parent's Name",
          "Parent's Number",
          "Class Type",
          "Batch Name",
          ...uniqueDates,
        ],
      ];

      studentAttendance.forEach((student, index) => {
        const row = [
          index + 1,
          student.teacherName,
          student.studentName,
          student.parentGuardianName,
          student.parentGuardianNumber,
          student.classType,
          student.batchName,
          ...uniqueDates.map((date) => student.attendance.get(date) || "-"),
        ];
        worksheetData.push(row);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      worksheetData[0].forEach((header, index) => {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: index });
        worksheet[cellRef] = { v: header, t: "s", s: headerStyle };
      });
      worksheet["!cols"] = [
        { wch: 10 }, 
        { wch: 20 },
        { wch: 20 }, 
        { wch: 20 }, 
        { wch: 20 },
        { wch: 20 }, 
        { wch: 20 }, 
        ...uniqueDates.map(() => ({ wch: 15 })),
      ];
      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

      const excelBuffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
        compression: true,
      });

      let filename = `attendance_teacher_${teacherId || userId}`;
      if (fromDate && toDate) {
        filename += `_${moment(fromDate).format("YYYY-MM-DD")}_to_${moment(toDate).format("YYYY-MM-DD")}`;
      }
      filename += ".xlsx";

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

      res.send(excelBuffer);
      logger.info(
        `Attendance exported by user ${userId} for teacher ${teacherId || userId}`
      );
    } catch (error) {
      logger.error("Export attendance error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

module.exports = router;
