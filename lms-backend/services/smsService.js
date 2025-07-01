const twilio = require("twilio");
const logger = require("../utils/logger");
const { getSMSTemplate } = require("../templates/smsTemplate");
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendSMSOTP = async (phone, otp, name) => {
  try {
    await client.messages.create({
      body: getSMSTemplate("registrationOTP", { name, otp }),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`SMS OTP sent to ${phone}`);
  } catch (error) {
    logger.error(`Failed to send SMS OTP to ${phone}:`, error);
    throw error;
  }
};

const sendLoginSMSOTP = async (phone, otp, name) => {
  try {
    await client.messages.create({
      body: getSMSTemplate("loginOTP", { name, otp }),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`Login SMS OTP sent to ${phone}`);
  } catch (error) {
    logger.error(`Failed to send login SMS OTP to ${phone}:`, error);
    throw error;
  }
};

const sendRegistrationSMS = async (phone, name) => {
  try {
    await client.messages.create({
      body: getSMSTemplate("registrationSuccess", { name }),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`Registration SMS sent to ${phone}`);
  } catch (error) {
    logger.error(`Failed to send registration SMS to ${phone}:`, error);
    throw error;
  }
};

const sendRoleAssignmentSMS = async (
  phone,
  name,
  role,
  assignedBy,
  subjects
) => {
  try {
    await client.messages.create({
      body: getSMSTemplate("roleAssignment", {
        name,
        role,
        assignedBy,
        subjects,
      }),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`Role assignment SMS sent to ${phone}`);
  } catch (error) {
    logger.error(`Failed to send role assignment SMS to ${phone}:`, error);
    throw error;
  }
};

const sendAdminNotificationSMS = async (
  phone,
  userName,
  userId,
  customMessage
) => {
  try {
    await client.messages.create({
      body: getSMSTemplate("adminNotification", {
        userName,
        userId,
        customMessage,
      }),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`Admin notification SMS sent to ${phone}`);
  } catch (error) {
    logger.error(`Failed to send admin notification SMS to ${phone}:`, error);
    throw error;
  }
};

const sendScheduledCallSMS = async (phone, name, callDetails) => {
  try {
    await client.messages.create({
      body: getSMSTemplate("scheduledCall", {
        name,
        classType: callDetails.classType,
        type: callDetails.type,
        date: new Date(callDetails.date).toLocaleDateString(),
        startTime: callDetails.startTime,
        endTime: callDetails.endTime,
      }),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`Scheduled call SMS sent to ${phone}`);
  } catch (error) {
    logger.error(`Failed to send scheduled call SMS to ${phone}:`, error);
    throw error;
  }
};

const sendRecordingUploadedSMS = async (phone, name, callDetails) => {
  try {
    await client.messages.create({
      body: getSMSTemplate("recordingUploaded", {
        name,
        classType: callDetails.classType,
        type: callDetails.type,
        date: new Date(callDetails.date).toLocaleDateString(),
      }),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`Recording uploaded SMS sent to ${phone}`);
  } catch (error) {
    logger.error(`Failed to send recording uploaded SMS to ${phone}:`, error);
    throw error;
  }
};

const sendPreCallNotificationSMS = async (phone, name, callDetails) => {
  try {
    await client.messages.create({
      body: getSMSTemplate("preCallNotification", {
        name,
        classType: callDetails.classType,
        type: callDetails.type,
        date: new Date(callDetails.date).toLocaleDateString(),
        startTime: callDetails.startTime,
        zoomLink: callDetails.zoomLink,
        teacher: callDetails.teacher,
      }),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`Pre-call notification SMS sent to ${phone}`);
  } catch (error) {
    logger.error(
      `Failed to send pre-call notification SMS to ${phone}:`,
      error
    );
    throw error;
  }
};

const sendPreCallNotificationWhatsApp = async (phone, name, callDetails) => {
  try {
    await client.messages.create({
      body: getSMSTemplate("preCallNotificationWhatsApp", {
        name,
        classType: callDetails.classType,
        type: callDetails.type,
        date: new Date(callDetails.date).toLocaleDateString(),
        startTime: callDetails.startTime,
        zoomLink: callDetails.zoomLink,
        teacher: callDetails.teacher,
        timeUntil: callDetails.timeUntil,
      }),
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${phone}`,
    });
    logger.info(`Pre-call WhatsApp notification sent to ${phone}`);
  } catch (error) {
    logger.error(
      `Failed to send pre-call WhatsApp notification to ${phone}:`,
      error
    );
    throw error;
  }
};

const sendTicketConfirmationSMS = async (phone, ticketDetails) => {
  try {
    await client.messages.create({
      body: getSMSTemplate("ticketConfirmation", {
        name: ticketDetails.name,
        ticketId: ticketDetails.ticketId,
        issueType: ticketDetails.issueType,
      }),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`Ticket confirmation SMS sent to ${phone}`);
  } catch (error) {
    logger.error(`Failed to send ticket confirmation SMS to ${phone}:`, error);
    throw error;
  }
};

const sendReportCardSMS = async (phone, studentName, teacherName, rating) => {
  try {
    await client.messages.create({
      body: getSMSTemplate("reportCard", { studentName, teacherName, rating }),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`Report card SMS sent to ${phone}`);
  } catch (error) {
    logger.error(`Failed to send report card SMS to ${phone}:`, error);
    throw error;
  }
};

const sendRescheduleCallSMS = async (phone, name, callDetails) => {
  try {
    await client.messages.create({
      body: getSMSTemplate("rescheduleCall", { name, ...callDetails }),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`Reschedule call SMS sent to ${phone}`);
  } catch (error) {
    logger.error(`Failed to send reschedule call SMS to ${phone}:`, error);
    throw error;
  }
};

const sendCancelCallSMS = async (phone, name, callDetails) => {
  try {
    await client.messages.create({
      body: getSMSTemplate("cancelCall", { name, ...callDetails }),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`Cancel call SMS sent to ${phone}`);
  } catch (error) {
    logger.error(`Failed to send cancel call SMS to ${phone}:`, error);
    throw error;
  }
};

const sendCourseCreatedSMS = async (phone, title, createdBy, courseId) => {
  try {
    await client.messages.create({
      body: getSMSTemplate("courseCreated", { title, createdBy, courseId }),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`Course created SMS sent to ${phone}`);
  } catch (error) {
    logger.error(`Failed to send course created SMS to ${phone}:`, error);
    throw error;
  }
};

const sendCourseAssignedSMS = async (phone, name, title, courseId) => {
  try {
    await client.messages.create({
      body: getSMSTemplate("courseAssigned", { name, title, courseId }),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`Course assigned SMS sent to ${phone}`);
  } catch (error) {
    logger.error(`Failed to send course assigned SMS to ${phone}:`, error);
    throw error;
  }
};

const sendCourseUnassignedSMS = async (phone, name, title, courseId) => {
  try {
    await client.messages.create({
      body: getSMSTemplate("courseUnassigned", { name, title, courseId }),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`Course unassigned SMS sent to ${phone}`);
  } catch (error) {
    logger.error(`Failed to send course unassigned SMS to ${phone}:`, error);
    throw error;
  }
};

const sendBatchCreatedSMS = async (
  phone,
  name,
  batchName,
  courseTitle,
  batchId
) => {
  try {
    await client.messages.create({
      body: getSMSTemplate("batchCreated", {
        name,
        batchName,
        courseTitle,
        batchId,
      }),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`Batch created SMS sent to ${phone}`);
  } catch (error) {
    logger.error(`Failed to send batch created SMS to ${phone}:`, error);
    throw error;
  }
};

const sendBatchDeletedSMS = async (
  phone,
  name,
  batchName,
  courseTitle,
  batchId
) => {
  try {
    await client.messages.create({
      body: getSMSTemplate("batchDeleted", {
        name,
        batchName,
        courseTitle,
        batchId,
      }),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`Batch deleted SMS sent to ${phone}`);
  } catch (error) {
    logger.error(`Failed to send batch deleted SMS to ${phone}:`, error);
    throw error;
  }
};

const sendCourseEditedSMS = async (
  phone,
  recipientRole,
  title,
  updatedBy,
  courseId
) => {
  try {
    await client.messages.create({
      body: getSMSTemplate("courseEdited", {
        recipientRole,
        title,
        updatedBy,
        courseId,
      }),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`Course edited SMS sent to ${phone}`);
  } catch (error) {
    logger.error(`Failed to send course edited SMS to ${phone}:`, error);
    throw error;
  }
};

const sendCourseDeletedSMS = async (phone, recipientRole, title, deletedBy) => {
  try {
    await client.messages.create({
      body: getSMSTemplate("courseDeleted", {
        recipientRole,
        title,
        deletedBy,
      }),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`Course deleted SMS sent to ${phone}`);
  } catch (error) {
    logger.error(`Failed to send course deleted SMS to ${phone}:`, error);
    throw error;
  }
};

const sendBatchCourseEditedSMS = async (
  phone,
  name,
  batchName,
  updatedBy,
  batchId
) => {
  try {
    await client.messages.create({
      body: getSMSTemplate("batchCourseEdited", {
        name,
        batchName,
        updatedBy,
        batchId,
      }),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`Batch course edited SMS sent to ${phone}`);
  } catch (error) {
    logger.error(`Failed to send batch course edited SMS to ${phone}:`, error);
    throw error;
  }
};

const sendStudentCourseEditedSMS = async (
  phone,
  name,
  batchName,
  updatedBy,
  batchId
) => {
  try {
    await client.messages.create({
      body: getSMSTemplate("studentCourseEdited", {
        name,
        batchName,
        updatedBy,
        batchId,
      }),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`Student course edited SMS sent to ${phone}`);
  } catch (error) {
    logger.error(
      `Failed to send student course edited SMS to ${phone}:`,
      error
    );
    throw error;
  }
};

const sendCourseScheduledSMS = async (
  phone,
  name,
  courseName,
  courseId,
  batchName,
  updatedBy,
  batchId
) => {
  try {
    await client.messages.create({
      body: getSMSTemplate("courseScheduled", {
        name,
        batchName,
        updatedBy,
        batchId,
        courseName,
        courseId,
      }),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`Student course scheduled SMS sent to ${phone}`);
  } catch (error) {
    logger.error(
      `Failed to send student course scheduled SMS to ${phone}:`,
      error
    );
    throw error;
  }
};

const sendCourseRescheduledSMS = async (
  phone,
  name,
  courseName,
  courseId,
  batchName,
  updatedBy,
  batchId
) => {
  try {
    await client.messages.create({
      body: getSMSTemplate("courseRescheduled", {
        name,
        batchName,
        updatedBy,
        batchId,
        courseName,
        courseId,
      }),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`Student course Rescheduled SMS sent to ${phone}`);
  } catch (error) {
    logger.error(
      `Failed to send student course Rescheduled SMS to ${phone}:`,
      error
    );
    throw error;
  }
};

const sendCourseCancelledSMS = async (
  phone,
  name,
  courseName,
  courseId,
  batchName,
  updatedBy,
  batchId
) => {
  try {
    await client.messages.create({
      body: getSMSTemplate("courseCallCancelled", {
        name,
        batchName,
        updatedBy,
        batchId,
        courseName,
        courseId,
      }),
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    logger.info(`Student course Cancelled SMS sent to ${phone}`);
  } catch (error) {
    logger.error(
      `Failed to send student course Cancelled SMS to ${phone}:`,
      error
    );
    throw error;
  }
};

module.exports = {
  sendSMSOTP,
  sendLoginSMSOTP,
  sendRegistrationSMS,
  sendRoleAssignmentSMS,
  sendAdminNotificationSMS,
  sendScheduledCallSMS,
  sendRecordingUploadedSMS,
  sendPreCallNotificationSMS,
  sendPreCallNotificationWhatsApp,
  sendTicketConfirmationSMS,
  sendReportCardSMS,
  sendRescheduleCallSMS,
  sendCancelCallSMS,
  sendCourseCreatedSMS,
  sendCourseAssignedSMS,
  sendBatchCreatedSMS,
  sendBatchDeletedSMS,
  sendCourseEditedSMS,
  sendCourseDeletedSMS,
  sendBatchCourseEditedSMS,
  sendStudentCourseEditedSMS,
  sendCourseUnassignedSMS,
  sendCourseScheduledSMS,
  sendCourseRescheduledSMS,
  sendCourseCancelledSMS,
};
