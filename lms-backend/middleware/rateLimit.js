const rateLimit = require("express-rate-limit");

const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: "Too many OTP requests, please try again later.",
  headers: true,
  keyGenerator: (req) => req.user?.userId || req.ip,
});

module.exports = { otpLimiter };
