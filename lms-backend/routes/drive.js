const express = require("express");
const router = express.Router();
const { listDriveFiles, selectFileFromDrive } = require("../services/googleDriveService");

router.get("/files/:folderId", async (req, res) => {
  const { folderId } = req.params;
  const { fileType } = req.query;
  try {
    const items = await listDriveFiles(folderId, fileType);
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/select-file", async (req, res) => {
  const { fileId, fileName, mimeType, courseTitle, courseFolderId } = req.body;
  try {
    const result = await selectFileFromDrive(fileId, fileName, mimeType, courseTitle, courseFolderId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router
