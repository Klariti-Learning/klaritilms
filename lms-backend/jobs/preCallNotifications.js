const cron = require("node-cron");
const moment = require("moment-timezone");
const ScheduledCall = require("../models/ScheduledCall");
const Notification = require("../models/Notification");
const User = require("../models/User");
const {
  sendPreCallNotificationEmail,
  sendPreCallNotificationWhatsApp,
} = require("../services/emailService");
const logger = require("../utils/logger");
const { getIO } = require("../config/socket");

const startPreCallNotifications = () => {
  logger.info("Starting pre-call notification cron job");
  cron.schedule("*/1 * * * *", async () => {
    logger.info("Checking pre-call notifications at: " + new Date().toISOString());
    try {
      const now = moment().utc();
      const calls = await ScheduledCall.find({
        status: { $in: ["Scheduled", "Rescheduled"] },
      }).populate("teacherId studentIds");

      logger.info(`Found ${calls.length} calls to check for notifications`);

      // Define timing windows for notifications (in minutes)
      const timingWindows = {
        "1day": { min: 1438, max: 1442 }, // 24 hours ± 2 minutes
        "1hour": { min: 58, max: 62 }, // 60 minutes ± 2 minutes
        "30min": { min: 28, max: 32 }, // 30 minutes ± 2 minutes
        "10min": { min: 7, max: 13 }, // 10 minutes ± 3 minutes
      };

      for (const call of calls) {
        try {
          const callDate = moment(call.date).utc().format("YYYY-MM-DD");
          const callTimezone = call.timezone || "Asia/Kolkata";

          // Validate timezone
          if (!moment.tz.zone(callTimezone)) {
            logger.warn(`Invalid timezone ${callTimezone} for call ${call._id}`);
            continue;
          }

          const callStart = moment.tz(
            `${callDate} ${call.startTime}`,
            "YYYY-MM-DD HH:mm",
            callTimezone
          );
          const nowInCallTimezone = moment(now).tz(callTimezone);
          const timeDiff = callStart.diff(nowInCallTimezone, "minutes");

          logger.info(
            `Call ${call._id}: timeDiff=${timeDiff} minutes, timezone=${callTimezone}, startTime=${call.startTime}`
          );

          // Check each notification timing
          for (const timing in timingWindows) {
            const { min, max } = timingWindows[timing];
            if (
              timeDiff >= min &&
              timeDiff <= max &&
              !(call.notificationSent || []).includes(timing)
            ) {
              const callDetails = {
                classType: call.classType,
                type: call.type,
                date: call.date.toLocaleDateString(),
                startTime: call.startTime,
                zoomLink: call.zoomLink,
                timeUntil:
                  timing === "1day"
                    ? "1 day"
                    : timing === "1hour"
                    ? "1 hour"
                    : `${timing} minutes`,
                baseUrl: process.env.BASE_URL,
                teacher: call.teacherId.name,
                lessonTitle: call.classType, // Adjust if lesson title is available
              };

              const userIds = [
                call.teacherId._id,
                ...call.studentIds.map((id) => id),
              ];
              const users = await User.find({
                _id: { $in: [...new Set(userIds)] },
              }).populate("role");

              logger.info(
                `Processing ${timing} notification for call ${call._id} to ${users.length} users`
              );

              const notifications = [];
              for (const user of users) {
                const preferences = user.notificationPreferences || {
                  enabled: true,
                  methods: ["email"],
                  timings: ["1day", "1hour", "30min", "10min"],
                };

                const roleName = user.role?.roleName || "User";
                const roleCategory =
                  roleName === "Teacher"
                    ? "Teacher"
                    : roleName === "Admin"
                    ? "Admin"
                    : "Student";

                // Log notificationPreferences.enabled for each role
                logger.info(
                  `${roleCategory} notificationPreferences.enabled for user ${user._id} (${user.name}): ${preferences.enabled}`
                );

                if (
                  !preferences.enabled ||
                  !preferences.timings.includes(timing)
                ) {
                  logger.info(
                    `Skipping ${timing} notification for ${roleCategory} ${user._id} (${user.name}): Notifications disabled or ${timing} not selected`
                  );
                  continue;
                }

                logger.info(
                  `Sending ${timing} reminder to ${roleCategory} ${user._id} (${user.name})`
                );

                const notificationLink = `${
                  process.env.BASE_URL
                }/${roleName.toLowerCase().replace(/\s+/g, "")}/schedule`;

                notifications.push(
                  new Notification({
                    userId: user._id,
                    message: `Reminder: ${call.classType} starts in ${callDetails.timeUntil} at ${call.startTime}`,
                    link: notificationLink,
                  }).save()
                );

                try {
                  getIO().to(user._id.toString()).emit("notification", {
                    message: `Reminder: ${call.classType} starts in ${callDetails.timeUntil}`,
                    link: notificationLink,
                  });
                  logger.info(
                    `Socket notification (${timing}) sent to ${roleCategory} ${user._id} (${user.name})`
                  );
                } catch (socketError) {
                  logger.warn(
                    `Failed to send socket notification (${timing}) to ${roleCategory} ${user._id} (${user.name}): ${socketError.message}`
                  );
                }

                const communications = [];
                if (preferences.methods.includes("email") && user.email) {
                  communications.push(
                    sendPreCallNotificationEmail(
                      user.email,
                      user.name,
                      callDetails
                    ).catch((err) => {
                      logger.error(
                        `Failed to send ${timing} email to ${roleCategory} ${user.email} (${user.name}): ${err.message}`
                      );
                      throw err;
                    })
                  );
                }
                if (preferences.methods.includes("whatsapp") && user.phone) {
                  communications.push(
                    sendPreCallNotificationWhatsApp(
                      user.phone,
                      user.name,
                      callDetails
                    ).catch((err) => {
                      logger.error(
                        `Failed to send ${timing} WhatsApp to ${roleCategory} ${user.phone} (${user.name}): ${err.message}`
                      );
                      throw err;
                    })
                  );
                }
                await Promise.all(communications);
              }

              await Promise.all(notifications);
              call.notificationSent = call.notificationSent || [];
              call.notificationSent.push(timing);
              await call.save();
              logger.info(`${timing} reminders sent for call ${call._id}`);
            }
          }
        } catch (error) {
          logger.error(`Error processing call ${call._id}: ${error.message}`);
          continue;
        }
      }
    } catch (error) {
      logger.error("Pre-call notification cron job error:", error.message);
    }
  });
  logger.info("Pre-call notification cron job started");
};

module.exports = { startPreCallNotifications };