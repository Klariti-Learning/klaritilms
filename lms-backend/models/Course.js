const mongoose = require("mongoose");

const ResourceSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      "pdf",
      "video",
      "audio",
      "doc",
      "ppt",
      "jpg",
      "png",
      "gif",
      "avif",
      "webp",
      "svg",
    ],
    required: true,
  },
  url: { type: String, required: true },
  fileId: { type: String, required: true },
  name: { type: String, required: true },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  uploadedAt: { type: Date, default: Date.now },
});

const LessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  format: {
    type: String,
    enum: [
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
    ],
    required: true,
  },
  learningGoals: [{ type: String, required: false }],
  resources: [ResourceSchema],
  worksheets: [ResourceSchema],
  order: { type: Number, required: true },
});

const ChapterSchema = new mongoose.Schema({
  title: { type: String, required: true },
  lessons: [LessonSchema],
  order: { type: Number, required: true },
});

const CourseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  chapters: [ChapterSchema],
  targetAudience: { type: String, required: true },
  duration: { type: String, required: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  assignedTeachers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  lastUpdatedAt: { type: Date },
  driveFolderId: { type: String, default: null },
});

const Course = mongoose.models.Course || mongoose.model("Course", CourseSchema);

module.exports = Course;