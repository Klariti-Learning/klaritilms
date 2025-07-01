const { google } = require("googleapis");
const fs = require("fs");
const logger = require("../utils/logger");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const drive = google.drive({ version: "v3", auth: oauth2Client });

const createFolderInDrive = async (
  folderName,
  parentFolderId = process.env.GOOGLE_COURSE_FOLDER_ID
) => {
  try {
    const fileMetadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    };

    const folder = await drive.files.create({
      resource: fileMetadata,
      fields: "id",
    });

    await drive.permissions.create({
      fileId: folder.data.id,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    logger.info(
      `Created folder in Google Drive: ${folderName} with ID ${folder.data.id}`
    );
    return folder.data.id;
  } catch (error) {
    logger.error(`Failed to create folder in Google Drive: ${error.message}`);
    throw new Error(`Failed to create folder: ${error.message}`);
  }
};

const uploadFileToDrive = async (filePath, fileName, mimeType, isVideo) => {
  try {
    const folderId = isVideo
      ? process.env.GOOGLE_DRIVE_VIDEO_FOLDER_ID
      : process.env.GOOGLE_DRIVE_DOCUMENT_FOLDER_ID;

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType,
      body: fs.createReadStream(filePath),
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: "id, webViewLink",
    });

    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    logger.info(
      `Uploaded file to Google Drive: ${file.data.id} in folder ${folderId}`
    );
    return {
      fileId: file.data.id,
      webViewLink: file.data.webViewLink,
    };
  } catch (error) {
    logger.error("Failed to upload file to Google Drive:", error.message);
    throw error;
  }
};

const uploadCourseFileToDrive = async (
  filePath,
  fileName,
  mimeType,
  courseTitle,
  existingFolderId = null
) => {
  try {
    const courseFolderId =
      existingFolderId ||
      (await createFolderInDrive(
        `klariti_learning/courses/${courseTitle.replace(
          /\s+/g,
          "_"
        )}_${Date.now()}`
      ));

    const fileMetadata = {
      name: fileName,
      parents: [courseFolderId],
    };

    const media = {
      mimeType,
      body: fs.createReadStream(filePath),
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: "id, webViewLink",
    });

    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    logger.info(
      `Uploaded course file to Google Drive: ${file.data.id} in folder ${courseFolderId}`
    );
    return {
      fileId: file.data.id,
      webViewLink: file.data.webViewLink,
      courseFolderId,
    };
  } catch (error) {
    logger.error(
      `Failed to upload course file to Google Drive: ${error.message}`
    );
    throw new Error(`Failed to upload course file: ${error.message}`);
  }
};

const listDriveFiles = async (folderId, fileType = "", includeTrashed = true) => {
  try {
    const mimeTypes = {
      pdf: "application/pdf",
      word: [
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
      ppt: [
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ],
      image: ["image/jpeg", "image/png"],
      video: [
        "video/mp4",
        "video/quicktime",
        "video/x-msvideo",
        "video/x-ms-wmv",
        "video/webm",
      ],
      audio: ["audio/wav", "audio/flac", "audio/mpeg"],
    };

    const effectiveFileType = fileType && fileType !== "" && fileType !== "any" ? fileType : null;

    if (effectiveFileType && !mimeTypes[effectiveFileType]) {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    const folderCheck = await drive.files.get({
      fileId: folderId,
      fields: "id, name, mimeType",
    }).catch((error) => {
      logger.error(`Error checking folder ${folderId}: ${error.message}`);
      throw new Error(`Invalid or non-existent folder ID: ${folderId}`);
    });

    if (folderCheck.data.mimeType !== "application/vnd.google-apps.folder") {
      throw new Error(`ID ${folderId} is not a folder`);
    }
    logger.info(`Listing files in folder: ${folderCheck.data.name} (ID: ${folderId})`);

    let query = `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder'`;
    if (!includeTrashed) {
      query += " and trashed = false";
    }
    if (effectiveFileType) {
      const mimeTypeFilter = Array.isArray(mimeTypes[effectiveFileType])
        ? mimeTypes[effectiveFileType].map((type) => `mimeType = '${type}'`).join(" or ")
        : `mimeType = '${mimeTypes[effectiveFileType]}'`;
      query += ` and (${mimeTypeFilter})`;
    }

    logger.debug(`Executing Drive query: ${query}`);

    const allFiles = [];
    let nextPageToken = null;

    do {
      const response = await drive.files.list({
        q: query,
        fields: "nextPageToken, files(id, name, mimeType, webViewLink, trashed)",
        pageSize: 100,
        pageToken: nextPageToken,
      });

      const files = response.data.files || [];
      allFiles.push(...files);
      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken);

    logger.info(`Listed ${allFiles.length} files from Google Drive folder ${folderId} (${folderCheck.data.name})`);

    return allFiles.map((item) => ({
      id: item.id,
      name: item.name,
      mimeType: item.mimeType,
      url: item.webViewLink,
      isFolder: false,
      isTrashed: item.trashed,
    }));
  } catch (error) {
    logger.error(`Failed to list files from Google Drive folder ${folderId}: ${error.message}`);
    throw new Error(`Failed to list files: ${error.message}`);
  }
};

const selectFileFromDrive = async (fileId, fileName, mimeType, courseTitle, courseFolderId = null) => {
  try {
    if (mimeType === "application/vnd.google-apps.folder") {
      throw new Error("Cannot select a folder. Please select a file.");
    }

    const courseFolderIdFinal =
      courseFolderId ||
      (await createFolderInDrive(
        `klariti_learning/courses/${courseTitle.replace(
          /\s+/g,
          "_"
        )}_${Date.now()}`
      ));

    const fileMetadata = {
      name: fileName,
      parents: [courseFolderIdFinal],
    };

    const file = await drive.files.copy({
      fileId: fileId,
      resource: fileMetadata,
      fields: "id, webViewLink",
    });

    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    logger.info(
      `Selected and copied file from Google Drive: ${file.data.id} to folder ${courseFolderIdFinal}`
    );
    return {
      fileId: file.data.id,
      webViewLink: file.data.webViewLink,
      courseFolderId: courseFolderIdFinal,
    };
  } catch (error) {
    logger.error(`Failed to select file from Google Drive: ${error.message}`);
    throw new Error(`Failed to select file: ${error.message}`);
  }
};

module.exports = { uploadFileToDrive, uploadCourseFileToDrive, listDriveFiles, selectFileFromDrive };