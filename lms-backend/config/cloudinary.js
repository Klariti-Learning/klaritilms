const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const logger = require("../utils/logger");

const configureCloudinary = () => {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    logger.error(
      "Cloudinary configuration failed: Missing environment variables"
    );
    throw new Error(
      "Cloudinary configuration failed: Missing environment variables"
    );
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  logger.info("Cloudinary configured successfully");
};

const uploadImage = async (filePath) => {
  try {
    configureCloudinary();
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "klariti_learning/profile_images",
      resource_type: "image",
    });
    logger.info(`Image uploaded to Cloudinary: ${result.secure_url}`);
    return {
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    logger.error("Cloudinary upload error:", error.message);
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

const uploadFile = async (
  filePath,
  folder = "klariti_learning/ticket_attachments"
) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error("File not found");
    }
    configureCloudinary();
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: "auto",
      allowed_formats: [
        "jpg",
        "jpeg",
        "png",
        "pdf",
        "doc",
        "docx",
        "ppt",
        "pptx",
        "mp3",
        "mp4",
        "wav",
        "gif",
        "avif",
        "webp",
        "svg",
      ],
    });
    logger.info(`File uploaded to Cloudinary: ${result.secure_url}`);
    return {
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    logger.error(
      `Cloudinary file upload error for ${filePath}: ${error.message}`
    );
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

const deleteLocalFile = (filePath) => {
  try {
    configureCloudinary();
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Local file deleted: ${filePath}`);
    }
  } catch (error) {
    logger.error(`Failed to delete local file ${filePath}: ${error.message}`);
  }
};

module.exports = { uploadImage, uploadFile, deleteLocalFile };
