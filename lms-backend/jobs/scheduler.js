const cron = require("node-cron");
const moment = require("moment-timezone");
const ScheduledCall = require("../models/ScheduledCall");
const DemoClass = require("../models/DemoClass");
const Notification = require("../models/Notification");
const Course = require("../models/Course");
const User = require("../models/User");
const logger = require("../utils/logger");
const { getIO } = require("../config/socket");

const updateCallStatuses = async () => {
  try {
    logger.info("Running scheduled task to update call statuses");
    const now = moment().utc();

    // Update ScheduledCall statuses
    const scheduledCallsToUpdate = await ScheduledCall.find({
      status: { $in: ["Scheduled", "Rescheduled"] },
      date: { $lte: now.toDate() },
    }).populate("courseId");

    const scheduledCallPromises = scheduledCallsToUpdate.map(async (call) => {
      const [startHour, startMinute] = call.startTime.split(":").map(Number);
      const [endHour, endMinute] = call.endTime.split(":").map(Number);

      const callDate = moment(call.date).utc();
      let endDateTime;
      if (endHour < startHour || (endHour === startHour && endMinute <= startMinute)) {
        endDateTime = moment.tz(
          `${callDate.add(1, "days").format("YYYY-MM-DD")} ${call.endTime}`,
          "YYYY-MM-DD HH:mm",
          call.timezone
        );
      } else {
        endDateTime = moment.tz(
          `${callDate.format("YYYY-MM-DD")} ${call.endTime}`,
          "YYYY-MM-DD HH:mm",
          call.timezone
        );
      }

      if (endDateTime.isBefore(now)) {
        call.status = "Completed";
        await call.save();
        logger.info(`Updated ScheduledCall ${call._id} to Completed`, {
          date: call.date,
          endTime: call.endTime,
          timezone: call.timezone,
          endDateTime: endDateTime.toISOString(),
        });

        const course = await Course.findById(call.courseId);
        const notifications = [
          new Notification({
            userId: call.teacherId,
            message: `Call for course "${course.title}" on ${moment(call.date).format(
              "YYYY-MM-DD"
            )} completed`,
            link: `${process.env.BASE_URL}/teacher/schedule`,
          }).save(),
          ...call.studentIds.map((studentId) =>
            new Notification({
              userId: studentId,
              message: `Call for course "${course.title}" on ${moment(call.date).format(
                "YYYY-MM-DD"
              )} completed`,
              link: `${process.env.BASE_URL}/student/schedule`,
            }).save()
          ),
        ];

        await Promise.all(notifications);
        getIO()
          .to(call.teacherId.toString())
          .emit("notification", {
            message: `Call for course "${course.title}" on ${moment(call.date).format(
              "YYYY-MM-DD"
            )} completed`,
            link: `${process.env.BASE_URL}/teacher/schedule`,
          });
        call.studentIds.forEach((studentId) => {
          getIO()
            .to(studentId.toString())
            .emit("notification", {
              message: `Call for course "${course.title}" on ${moment(call.date).format(
                "YYYY-MM-DD"
              )} completed`,
              link: `${process.env.BASE_URL}/student/schedule`,
            });
        });
      }
    });

    // Update DemoClass statuses
    const demoClassesToUpdate = await DemoClass.find({
      status: { $in: ["Scheduled", "Rescheduled"] },
      date: { $lte: now.toDate() },
    }).populate("assignedTeacherId scheduledBy");

    const demoClassPromises = demoClassesToUpdate.map(async (demoClass) => {
      const [startHour, startMinute] = demoClass.startTime.split(":").map(Number);
      const [endHour, endMinute] = demoClass.endTime.split(":").map(Number);

      const callDate = moment(demoClass.date).utc();
      let endDateTime;
      if (endHour < startHour || (endHour === startHour && endMinute <= startMinute)) {
        endDateTime = moment.tz(
          `${callDate.add(1, "days").format("YYYY-MM-DD")} ${demoClass.endTime}`,
          "YYYY-MM-DD HH:mm",
          demoClass.timezone
        );
      } else {
        endDateTime = moment.tz(
          `${callDate.format("YYYY-MM-DD")} ${demoClass.endTime}`,
          "YYYY-MM-DD HH:mm",
          demoClass.timezone
        );
      }

      if (endDateTime.isBefore(now)) {
        demoClass.status = "Completed";
        await demoClass.save();
        logger.info(`Updated DemoClass ${demoClass._id} to Completed`, {
          date: demoClass.date,
          endTime: demoClass.endTime,
          timezone: demoClass.timezone,
          endDateTime: endDateTime.toISOString(),
        });

        const notifications = [
          new Notification({
            userId: demoClass.assignedTeacherId._id,
            message: `Demo class "${demoClass.classType}" on ${moment(demoClass.date).format(
              "YYYY-MM-DD"
            )} completed`,
            link: `${process.env.BASE_URL}/teacher/schedule`,
          }).save(),
          ...demoClass.studentEmails.map((email) =>
            User.findOne({ email }).then((student) => {
              if (student) {
                return new Notification({
                  userId: student._id,
                  message: `Demo class "${demoClass.classType}" on ${moment(demoClass.date).format(
                    "YYYY-MM-DD"
                  )} completed`,
                  link: `${process.env.BASE_URL}/student/schedule`,
                }).save();
              }
            })
          ),
        ];

        await Promise.all(notifications.filter((n) => n)); // Filter out undefined notifications
        getIO()
          .to(demoClass.assignedTeacherId._id.toString())
          .emit("notification", {
            message: `Demo class "${demoClass.classType}" on ${moment(demoClass.date).format(
              "YYYY-MM-DD"
            )} completed`,
            link: `${process.env.BASE_URL}/teacher/schedule`,
          });
        const studentPromises = demoClass.studentEmails.map(async (email) => {
          const student = await User.findOne({ email });
          if (student) {
            getIO()
              .to(student._id.toString())
              .emit("notification", {
                message: `Demo class "${demoClass.classType}" on ${moment(demoClass.date).format(
                  "YYYY-MM-DD"
                )} completed`,
                link: `${process.env.BASE_URL}/student/schedule`,
              });
          }
        });
        await Promise.all(studentPromises);
      }
    });

    const allPromises = [...scheduledCallPromises, ...demoClassPromises];
    if (allPromises.length === 0) {
      logger.info("No calls or demo classes need status update");
      return;
    }

    await Promise.all(allPromises);
    logger.info(`Updated ${scheduledCallPromises.length} ScheduledCalls and ${demoClassPromises.length} DemoClasses to Completed`);
  } catch (error) {
    logger.error("Error updating call statuses:", error);
  }
};

const startScheduler = () => {
  cron.schedule("* * * * *", updateCallStatuses);
  logger.info("Call and DemoClass status update scheduler started");
};

updateCallStatuses();

module.exports = { startScheduler, updateCallStatuses };