const mongoose = require("mongoose");

const ResourceModificationSchema = new mongoose.Schema({
  resourceId: { type: mongoose.Schema.Types.ObjectId },
  type: { type: String, enum: ["pdf", "video", "audio", "doc", "ppt"] },
  url: { type: String },
  fileId: { type: String, required: true },
  name: { type: String, required: true },
  isDeleted: { type: Boolean, default: false },
});

const LessonModificationSchema = new mongoose.Schema({
  lessonId: { type: mongoose.Schema.Types.ObjectId },
  title: { type: String },
  resources: [ResourceModificationSchema],
  isDeleted: { type: Boolean, default: false },
});

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

const StudentInBatchSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  isInThisBatch: { type: Boolean, default: false },
});

const BatchSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  studentIds: [StudentInBatchSchema],
  modifiedLessons: [LessonModificationSchema],
  teacherModifications: [LessonModificationSchema],
  teacherCourseModifications: {
  title: { type: String },
  chapters: [
    {
      title: { type: String, required: true },
      lessons: [
        {
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
          learningGoals: [{ type: String }],
          resources: [ResourceSchema],
          order: { type: Number, required: true },
        },
      ],
      order: { type: Number, required: true },
    },
  ],
  targetAudience: { type: String },
  duration: { type: String },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  lastModifiedAt: { type: Date },
},
batchSpecificModifications: {
    title: { type: String },
    chapters: [
      {
        title: { type: String },
        lessons: [
          {
            title: { type: String },
            format: { type: String },
            learningGoals: [{ type: String }],
            resources: [
              {
                type: { type: String },
                url: { type: String },
                fileId: { type: String },
                name: { type: String },
                uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                uploadedAt: { type: Date },
              },
            ],
            order: { type: Number },
          },
        ],
        order: { type: Number },
      },
    ],
    targetAudience: { type: String },
    duration: { type: String },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastModifiedAt: { type: Date },
  },
  studentSpecificModifications: [
    {
      studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      title: { type: String },
      chapters: [
        {
          title: { type: String },
          lessons: [
            {
              title: { type: String },
              format: { type: String },
              learningGoals: [{ type: String }],
              resources: [
                {
                  type: { type: String },
                  url: { type: String },
                  fileId: { type: String },
                  name: { type: String },
                  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                  uploadedAt: { type: Date },
                },
              ],
              order: { type: Number },
            },
          ],
          order: { type: Number },
        },
      ],
      targetAudience: { type: String },
      duration: { type: String },
      lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      lastModifiedAt: { type: Date },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false },
});

module.exports = mongoose.model("Batch", BatchSchema);
