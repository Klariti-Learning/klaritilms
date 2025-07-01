const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [],
});

if (process.env.NODE_ENV === "production") {
  logger.add(
    new winston.transports.File({ filename: "error.log", level: "error" })
  );
  logger.add(new winston.transports.File({ filename: "combined.log" }));
} else {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

module.exports = logger;
