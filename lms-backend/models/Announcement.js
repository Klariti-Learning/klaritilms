const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    timing: {
      type: String,
      default: () => new Date().toTimeString().slice(0, 5),
    },
    announcement: {
      type: String,
      required: true, 
    },
    attachment: {
      type: {
        type: String,
        required: function () {
          return !!this.attachment;
        },
      },
      url: {
        type: String,
        required: function () {
          return !!this.attachment;
        },
      },
      fileId: {
        type: String,
        required: function () {
          return !!this.attachment;
        },
      },
      name: {
        type: String,
        required: function () {
          return !!this.attachment;
        },
      },
      uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: function () {
          return !!this.attachment;
        },
      },
      uploadedAt: {
        type: Date,
        required: function () {
          return !!this.attachment;
        },
      },
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Announcement", announcementSchema);