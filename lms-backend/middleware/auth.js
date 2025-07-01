const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const { redisClient } = require("../config/redis");

const authenticate = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    logger.warn("No token provided");
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    const deviceId = req.header("Device-Id") || "unknown";
    const session = await redisClient.get(
      `session:${decoded.userId}:${deviceId}`
    );

    if (!session || session !== token) {
      logger.warn(
        `Session expired or invalid for user ${decoded.userId}, device ${deviceId}`
      );
      return res.status(401).json({ message: "Session expired" });
    }
    next();
  } catch (error) {
    logger.error("Invalid token:", error);
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = authenticate;
