const mongoose = require("mongoose");
const logger = require("../utils/logger");

const ticketSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      match: /^#[0-9]{6}$/,
    },
    issueType: {
      type: String,
      enum: [
        "Technical",
        "Content",
        "Scheduling",
        "Payment",
        "Other",
        "Teacher Change Request",
        "Class Pause Request",
        "Timezone Change Request",
        "Subject Change Request",
      ],
      required: true,
    },
    description: { type: String, required: true },
    visibleToTeacher: { type: Boolean, default: false },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved", "Closed"],
      default: "Open",
    },
    response: { type: String, default: null },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    rating: { type: Number, default: null, min: 1, max: 5 },
    fileUrl: { type: String, default: null },
  },
  { timestamps: true }
);

ticketSchema.pre("validate", async function (next) {
  if (this.isNew && !this.ticketNumber) {
    try {
      const lastTicket = await mongoose
        .model("Ticket")
        .findOne()
        .sort({ createdAt: -1 })
        .exec();
      let newNumber = 100000;
      if (lastTicket && lastTicket.ticketNumber) {
        const lastNumber = parseInt(
          lastTicket.ticketNumber.replace("#", ""),
          10
        );
        if (!isNaN(lastNumber)) {
          newNumber = lastNumber + 1;
        }
      }
      this.ticketNumber = `#${newNumber.toString().padStart(6, "0")}`;
    } catch (err) {
      this.ticketNumber = `#${Date.now().toString().slice(-6)}`;
    }
  }
  next();
});

logger.info("Ticket schema middleware registered:", ticketSchema._middleware);

module.exports = mongoose.model("Ticket", ticketSchema);
