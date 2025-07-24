const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  callId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ScheduledCall",
    required: true,
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Batch",
    required: true,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  attendances: [
    {
      studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      status: {
        type: String,
        enum: ["Present", "Absent"],
        default: "Present",
      },
      rating: {
        type: Number,
        min: 1,
        max: 5,
        required: false,
      },
      ratedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      markedAt: {
        type: Date,
        default: Date.now,
      },
      markedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
  ],
  date: {
    type: Date,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

attendanceSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

attendanceSchema.index({ date: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);