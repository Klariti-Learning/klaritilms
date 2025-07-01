const multer = require("multer");
const path = require("path");
const fs = require("fs");
const logger = require("../utils/logger");

const uploadDir = process.env.UPLOAD_DIR || "./uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const mimeToType = {
  "video/mp4": "video",
  "audio/mpeg": "audio",
  "audio/wav": "audio",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "doc",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "ppt",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

const fileFilter = (req, file, cb) => {
  if (mimeToType[file.mimetype]) {
    cb(null, true);
  } else {
    logger.warn(`Invalid file type uploaded: ${file.mimetype}`);
    cb(
      new Error(
        "Only MP4, MP3, WAV, PDF, DOC, DOCX, PPT, PPTX, JPEG, PNG, GIF, AVIF, WEBP, SVG files are allowed"
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 },
});

module.exports = upload;
