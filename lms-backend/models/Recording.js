const mongoose = require("mongoose");

const recordingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    url: { type: String, required: true },
    fileId: { type: String, required: true },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    callId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScheduledCall",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Recording", recordingSchema);
