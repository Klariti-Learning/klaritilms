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
    lessonId: {
      type: mongoose.Schema.Types.ObjectId, 
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
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

scheduledCallSchema.index({ status: 1, date: 1 });
scheduledCallSchema.index({ studentIds: 1, isDeleted: 1 });

scheduledCallSchema.pre('remove', async function (next) {
  const attendance = await mongoose.model('Attendance').findOne({ callId: this._id });
  if (attendance) {
    logger.error(`Cannot delete ScheduledCall ${this._id} with associated attendance`);
    return next(new Error('Cannot delete call with attendance records'));
  }
  next();
});

scheduledCallSchema.pre('save', function (next) {
  if (this.isModified('isDeleted') && this.isDeleted) {
    logger.warn(`ScheduledCall ${this._id} marked as deleted`);
  }
  next();
});

module.exports = mongoose.model("ScheduledCall", scheduledCallSchema);