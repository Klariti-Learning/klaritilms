const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    phone: { type: String, required: true, unique: true, index: true },
    gender: {
      type: String,
      required: [true, "Gender is required"],
      enum: {
        values: ["male", "female", "other"],
        message: "Gender must be 'male', 'female', or 'other'",
      },
    },
    role: { type: mongoose.Schema.Types.ObjectId, ref: "Role" },
    profileImage: { type: String, default: null },
    subjects: [
      {
        type: String,
        enum: ["Phonics", "Creative Writing", "Public Speaking"],
      },
    ],
    timezone: { type: String },
    preferredTimeSlots: [{ type: String }],
    isTimezoneSet: { type: Boolean, default: false },
    address: { type: String, default: "" },
    joinDate: { type: Date, default: Date.now },
    studentId: { type: String, unique: true, sparse: true },
    employeeId: { type: String, unique: true, sparse: true },
    isFirstLogin: { type: Boolean, default: true },
    teacherId: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    students: [{ type: String, ref: "User", default: null }],
    notificationPreferences: {
      enabled: { type: Boolean, default: false },
      methods: [
        {
          type: String,
          enum: ["email", "whatsapp"],
          default: ["email"],
        },
      ],
      timings: [
        {
          type: String,
          enum: ["1day", "1hour", "30min", "10min"],
          default: ["10min"],
        },
      ],
    },
    profile: {
      bio: { type: String, default: "" },
      hobbies: [{ type: String }],
      skills: [{ type: String }],
      about: { type: String, default: "" },
      accomplishments: [{ type: String }],
      qualifications: [{ type: String }],
      enrollmentStatus: {
        type: String,
        enum: ["Active", "Inactive"],
        default: "Active",
      },
      academicYear: { type: String },
      experience: [
        {
          title: String,
          institution: String,
          duration: String,
        },
      ],
    },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

module.exports = User;