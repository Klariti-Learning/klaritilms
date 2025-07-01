const mongoose = require("mongoose");

const scheduledCallSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
    },
    classType: { type: String },
    classSubType: { type: String }, 
    type: { type: String, enum: ["zoom", "external"] },
    date: { type: Date },
    startTime: { type: String },
    endTime: { type: String },
    callDuration: { type: Number, default: 40 },
    timezone: { type: String },
    zoomLink: { type: String, required: true },
    meetingId: { type: String },
    passcode: { type: String },
    scheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["Scheduled", "Rescheduled", "Completed", "Cancelled"],
      default: "Scheduled",
    },
    recordingUrl: { type: String },
    recordingFileId: { type: String },
    documents: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        fileId: { type: String, required: true },
      },
    ],
    studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    notificationSent: [
      {
        type: String,
        enum: ["1day", "1hour", "30min", "10min"],
      },
    ],
    days: [
      {
        type: String,
        enum: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
      },
    ],
    repeat: { type: Boolean, default: false },
    previousDate: { type: Date, default: null },
    previousStartTime: { type: String, default: null },
    previousEndTime: { type: String, default: null },
  },
  { timestamps: true }
);

scheduledCallSchema.index({ status: 1, date: 1 });

module.exports = mongoose.model("ScheduledCall", scheduledCallSchema);
