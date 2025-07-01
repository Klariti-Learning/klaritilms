const nodemailer = require("nodemailer");
const logger = require("../utils/logger");
const { getEmailTemplate } = require("../templates/emailTemplate");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmailOTP = async (email, otp, name) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Klariti Learning - Registration OTP Verification",
    html: getEmailTemplate("registrationOTP", { name, otp }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Email OTP sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send email OTP to ${email}:`, error);
    throw error;
  }
};

const sendLoginOTP = async (email, otp, name) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Klariti Learning - Login OTP Verification",
    html: getEmailTemplate("loginOTP", { name, otp }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Login OTP email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send login OTP email to ${email}:`, error);
    throw error;
  }
};

const sendRegistrationEmail = async (email, name, customMessage = null) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: customMessage
      ? "Klariti Learning - Role Assignment"
      : "Klariti Learning - Welcome!",
    html: getEmailTemplate("registrationSuccess", { name, customMessage }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Registration email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send registration email to ${email}:`, error);
    throw error;
  }
};

const sendAdminNotificationEmail = async (
  email,
  userName,
  userId,
  customMessage = null
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: customMessage
      ? "Klariti Learning - Role Assignment Notification"
      : "Klariti Learning - New User Registration",
    html: getEmailTemplate("adminNotification", {
      userName,
      userId,
      customMessage,
    }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Admin notification email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send admin notification email to ${email}:`, error);
    throw error;
  }
};

const sendRoleAssignmentEmail = async (email, name, role, assignedBy) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Klariti Learning - Role Assignment Notification",
    html: getEmailTemplate("roleAssignment", { name, role, assignedBy }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Role assignment email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send role assignment email to ${email}:`, error);
    throw error;
  }
};

const sendScheduledCallEmail = async (email, name, callDetails) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Klariti Learning - New Scheduled Call",
    html: getEmailTemplate("scheduledCall", {
      name,
      classType: callDetails.classType,
      type: callDetails.type,
      date: new Date(callDetails.date).toLocaleDateString(),
      startTime: callDetails.startTime,
      endTime: callDetails.endTime,
    }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Scheduled call email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send scheduled call email to ${email}:`, error);
    throw error;
  }
};

const sendRecordingUploadedEmail = async (email, name, callDetails) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Klariti Learning - Call Recording Uploaded",
    html: getEmailTemplate("recordingUploaded", {
      name,
      classType: callDetails.classType,
      type: callDetails.type,
      date: new Date(callDetails.date).toLocaleDateString(),
    }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Recording uploaded email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send recording uploaded email to ${email}:`, error);
    throw error;
  }
};

const sendPreCallNotificationEmail = async (email, name, callDetails) => {
  const timeUntil =
    callDetails.timeUntil === "1day"
      ? "1 day"
      : callDetails.timeUntil === "1hour"
      ? "1 hour"
      : `${callDetails.timeUntil} minutes`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Klariti Learning - Call Reminder",
    html: getEmailTemplate("preCallNotification", {
      name,
      classType: callDetails.classType,
      type: callDetails.type,
      date: callDetails.date,
      startTime: callDetails.startTime,
      zoomLink: callDetails.zoomLink,
      teacher: callDetails.teacher,
      timeUntil,
      lessonTitle: callDetails.lessonTitle,
      baseUrl: process.env.BASE_URL,
    }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Pre-call notification email sent to ${email}`);
  } catch (error) {
    logger.error(
      `Failed to send pre-call notification email to ${email}:`,
      error
    );
    throw error;
  }
};

const sendTicketRaisedEmail = async (
  supportEmail,
  userDetails,
  ticketDetails
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: supportEmail,
    subject: `Ticket ${ticketDetails.ticketNumber} : Klariti Learning - New Support Ticket Raised`,
    html: getEmailTemplate("ticketRaised", {
      userName: userDetails.name,
      userEmail: userDetails.email,
      userRole: userDetails.role,
      ticketId: ticketDetails.ticketNumber,
      issueType: ticketDetails.issueType,
      description: ticketDetails.description,
      fileUrl: ticketDetails.fileUrl,
    }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Ticket raised email sent to ${supportEmail}`);
  } catch (error) {
    logger.error(
      `Failed to send ticket raised email to ${supportEmail}:`,
      error
    );
    throw error;
  }
};

const sendTicketConfirmationEmail = async (email, ticketDetails) => {
  logger.info("Sending ticket confirmation email with details:", ticketDetails);

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Ticket ${ticketDetails.ticketId} : Klariti Learning - Ticket Confirmation`,
    html: getEmailTemplate("ticketConfirmation", ticketDetails),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Ticket confirmation email sent to ${email}`);
  } catch (error) {
    logger.error(
      `Failed to send ticket confirmation email to ${email}:`,
      error
    );
    throw error;
  }
};

const sendClassPauseRequestEmail = async (
  supportEmail,
  userDetails,
  ticketDetails
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: supportEmail,
    subject: `Ticket ${ticketDetails.ticketNumber} : Klariti Learning - New Class Pause Request`,
    html: getEmailTemplate("classPauseRequest", {
      userName: userDetails.name,
      userEmail: userDetails.email,
      userRole: userDetails.role,
      ticketId: ticketDetails.ticketNumber,
      issueType: ticketDetails.issueType,
      description: ticketDetails.description,
    }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Class pause request email sent to ${supportEmail}`);
  } catch (error) {
    logger.error(
      `Failed to send class pause request email to ${supportEmail}:`,
      error
    );
    throw error;
  }
};

const sendTeacherChangeRequestEmail = async (
  supportEmail,
  userDetails,
  ticketDetails
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: supportEmail,
    subject: `Ticket ${ticketDetails.ticketNumber} : Klariti Learning - New Teacher Change Request`,
    html: getEmailTemplate("teacherChangeRequest", {
      userName: userDetails.name,
      userEmail: userDetails.email,
      userRole: userDetails.role,
      ticketId: ticketDetails.ticketNumber,
      issueType: ticketDetails.issueType,
      description: ticketDetails.description,
      teacherId: ticketDetails.teacherId,
    }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Teacher change request email sent to ${supportEmail}`);
  } catch (error) {
    logger.error(
      `Failed to send teacher change request email to ${supportEmail}:`,
      error
    );
    throw error;
  }
};

const sendTicketRatingEmail = async (email, userDetails, ticketDetails) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Ticket ${ticketDetails.ticketNumber}: Klariti Learning - Rating Confirmation`,
    html: getEmailTemplate("ticketRating", {
      name: userDetails.name,
      ticketNumber: ticketDetails.ticketNumber,
      description: ticketDetails.description,
      rating: ticketDetails.rating,
    }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Ticket rating email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send ticket rating email to ${email}:`, error);
    throw error;
  }
};

const sendTimezoneChangeRequestEmail = async (
  supportEmail,
  userDetails,
  ticketDetails
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: supportEmail,
    subject: `Ticket ${ticketDetails.ticketNumber} : Klariti Learning - New Timezone Change Request`,
    html: getEmailTemplate("timezoneChangeRequest", {
      userName: userDetails.name,
      userEmail: userDetails.email,
      userRole: userDetails.role,
      ticketId: ticketDetails.ticketNumber,
      issueType: ticketDetails.issueType,
      description: ticketDetails.description,
      visibleToTeacher: ticketDetails.visibleToTeacher,
      teacherId: ticketDetails.teacherId,
      fileUrl: ticketDetails.fileUrl,
    }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Timezone change request email sent to ${supportEmail}`);
  } catch (error) {
    logger.error(
      `Failed to send timezone change request email to ${supportEmail}:`,
      error
    );
    throw error;
  }
};

const sendSubjectChangeRequestEmail = async (
  supportEmail,
  userDetails,
  ticketDetails
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: supportEmail,
    subject: `Ticket ${ticketDetails.ticketNumber} : Klariti Learning - New Subject Change Request`,
    html: getEmailTemplate("subjectChangeRequest", {
      userName: userDetails.name,
      userEmail: userDetails.email,
      userRole: userDetails.role,
      ticketId: ticketDetails.ticketNumber,
      issueType: ticketDetails.issueType,
      description: ticketDetails.description,
      currentSubject: ticketDetails.currentSubject,
      teacherId: ticketDetails.teacherId,
      fileUrl: ticketDetails.fileUrl,
    }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Subject change request email sent to ${supportEmail}`);
  } catch (error) {
    logger.error(
      `Failed to send subject change request email to ${supportEmail}:`,
      error
    );
    throw error;
  }
};

const sendTimezoneSetupEmail = async (
  email,
  userName,
  userId,
  timezone,
  timeSlots
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Klariti Learning - User Timezone Setup Notification",
    html: getEmailTemplate("timezoneSetup", {
      userName,
      userId,
      timezone,
      timeSlots,
    }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Timezone setup email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send timezone setup email to ${email}:`, error);
    throw error;
  }
};

const sendReportCardEmail = async (
  email,
  studentName,
  teacherName,
  rating,
  comments
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Klariti Learning - Report Card Submission",
    html: getEmailTemplate("reportCard", {
      studentName,
      teacherName,
      rating,
      comments,
    }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Report card email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send report card email to ${email}:`, error);
    throw error;
  }
};

const sendRescheduleCallEmail = async (email, name, callDetails) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Klariti Learning - Call Rescheduled",
    html: getEmailTemplate("rescheduleCall", { name, ...callDetails }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Reschedule call email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send reschedule call email to ${email}:`, error);
    throw error;
  }
};

const sendCancelCallEmail = async (email, name, callDetails) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Klariti Learning - Call Cancelled",
    html: getEmailTemplate("cancelCall", { name, ...callDetails }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Cancel call email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send cancel call email to ${email}:`, error);
    throw error;
  }
};

const sendCourseCreatedEmail = async (
  email,
  name,
  title,
  createdBy,
  courseId
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Klariti Learning - New Course Created`,
    html: getEmailTemplate("courseCreated", {
      name,
      title,
      createdBy,
      courseId,
    }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Course created email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send course created email to ${email}:`, error);
    throw error;
  }
};

const sendCourseAssignedEmail = async (email, name, title, courseId) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Klariti Learning - Course Assigned`,
    html: getEmailTemplate("courseAssigned", { name, title, courseId }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Course assigned email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send course assigned email to ${email}:`, error);
    throw error;
  }
};

const sendCourseUnassignedEmail = async (email, name, title, courseId) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Klariti Learning - Course Access Removed`,
    html: getEmailTemplate("courseUnassigned", { name, title, courseId }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Course unassigned email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send course unassigned email to ${email}:`, error);
    throw error;
  }
};

const sendBatchCreatedEmail = async (
  email,
  name,
  batchName,
  courseTitle,
  batchId
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Klariti Learning - Added to Batch`,
    html: getEmailTemplate("batchCreated", {
      name,
      batchName,
      courseTitle,
      batchId,
    }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Batch created email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send batch created email to ${email}:`, error);
    throw error;
  }
};

const sendBatchDeletedEmail = async (email, name, batchId, message) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Klariti Learning - Removed from Batch`,
    html: getEmailTemplate("batchDeleted", { name, batchId, message }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Batch deleted email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send batch deleted email to ${email}:`, error);
    throw error;
  }
};

const sendCourseEditedEmail = async (
  email,
  title,
  name,
  updatedBy,
  courseId,
  recipientRole
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Klariti Learning - Course Updated`,
    html: getEmailTemplate("courseEdited", {
      name,
      title,
      updatedBy,
      courseId,
      recipientRole,
    }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Course edited email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send course edited email to ${email}:`, error);
    throw error;
  }
};

const sendTeacherCourseEditedEmail = async (
  email,
  name,
  batchName,
  updatedBy,
  batchId
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Klariti Learning - Course Updated`,
    html: getEmailTemplate("teacherCourseEdited", {
      name,
      batchName,
      updatedBy,
      batchId,
    }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`course edited email sent to ${email}`);
  } catch (error) {
    logger.error(
      `Failed to send course edited email to ${email}:`,
      error
    );
    throw error;
  }
};

const sendCourseDeletedEmail = async (
  email,
  recipientRole,
  title,
  deletedBy
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Klariti Learning - Course Deleted`,
    html: getEmailTemplate("courseDeleted", {
      recipientRole,
      title,
      deletedBy,
    }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Course deleted email sent to ${email}`);
  } catch (error) {
    logger.error(`Failed to send course deleted email to ${email}:`, error);
    throw error;
  }
};

const sendBatchCourseEditedEmail = async (
  email,
  name,
  batchName,
  updatedBy,
  batchId
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Klariti Learning - Batch Course Updated`,
    html: getEmailTemplate("batchCourseEdited", {
      name,
      batchName,
      updatedBy,
      batchId,
    }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Batch course edited email sent to ${email}`);
  } catch (error) {
    logger.error(
      `Failed to send batch course edited email to ${email}:`,
      error
    );
    throw error;
  }
};

const sendStudentCourseEditedEmail = async (
  email,
  name,
  batchName,
  updatedBy,
  batchId
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Klariti Learning - Your Course Updated`,
    html: getEmailTemplate("studentCourseEdited", {
      name,
      batchName,
      updatedBy,
      batchId,
    }),
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Student course edited email sent to ${email}`);
  } catch (error) {
    logger.error(
      `Failed to send student course edited email to ${email}:`,
      error
    );
    throw error;
  }
};

const sendCourseScheduledEmail = async (email, name, summary, isTeacher) => {
  try {
    if (!Array.isArray(summary.schedule)) {
      throw new Error(
        "summary.schedule must be an array of objects with date, startTime, and endTime"
      );
    }
    for (const s of summary.schedule) {
      if (!s.date || !s.startTime || !s.endTime) {
        throw new Error(
          "Each schedule entry must have date, startTime, and endTime"
        );
      }
    }

    logger.info(`Preparing to send course scheduled email to ${email}`, {
      summary,
      isTeacher,
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Klariti Learning - Your Course has been Scheduled`,
      html: getEmailTemplate("courseScheduled", {
        name,
        courseTitle: summary.courseTitle,
        classType: summary.classType,
        type: summary.type,
        schedule: summary.schedule,
        baseUrl: summary.baseUrl,
        isTeacher,
      }),
    });
    logger.info(`Course scheduled email sent to ${email}`);
  } catch (error) {
    logger.error(
      `Failed to send course scheduled email to ${email}: ${error.message}`,
      {
        error: error.stack,
        summary,
        isTeacher,
      }
    );
    throw error;
  }
};

const sendCourseCallRescheduledEmail = async (
  email,
  name,
  callDetails,
  isTeacher = false 
) => {
  try {
    const schedule = [{
      date: new Date(callDetails.date).toLocaleDateString("en-US"),
      startTime: callDetails.startTime,
      endTime: callDetails.endTime,
      previousDate: callDetails.previousDate ? new Date(callDetails.previousDate).toLocaleDateString("en-US") : null,
      previousStartTime: callDetails.previousStartTime || null,
      previousEndTime: callDetails.previousEndTime || null,
      zoomLink: callDetails.zoomLink || null,
      timezone: callDetails.timezone || null,
      duration: callDetails.duration || null,
      teacher: callDetails.teacher || null,
      callDuration: callDetails.callDuration || null,
      lessonTitle: callDetails.lessonTitle || null,
      classType: callDetails.classType || null,
      type: callDetails.type || null,
    }];

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Klariti Learning - Your Call for ${callDetails.courseName} has been Rescheduled`,
      html: getEmailTemplate("courseCallRescheduled", {
        name,
        courseName: callDetails.courseName,
        courseId: callDetails.courseId || null,
        batchName: callDetails.batchName || null,
        batchId: callDetails.batchId || null,
        schedule,
        isTeacher, 
      }),
    };
    await transporter.sendMail(mailOptions);
    logger.info(`Course rescheduled email sent to ${email}`);
  } catch (error) {
    logger.error(
      `Failed to send course rescheduled email to ${email}: ${error.message}`,
      { error: error.stack, email, name, callDetails }
    );
    throw error;
  }
};


const sendCourseCallCancelledEmail = async (
  email,
  name,
  callDetails,
  updatedBy,
  batchId,
  courseName,
  courseId,
isTeacher = false
) => {

  try {
    const cancelled = [{
      lessonTitle: callDetails.lessonTitle || "N/A",
      date: callDetails.date ? new Date(callDetails.date).toLocaleDateString("en-US") : "N/A",
      startTime: callDetails.startTime || "N/A",
      endTime: callDetails.endTime || "N/A",
      classType: callDetails.classType || "N/A",
      type: callDetails.type || "N/A",
      zoomLink: callDetails.zoomLink || null,
      timezone: callDetails.timezone || null,
      callDuration: callDetails.callDuration || null,
    }];

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Klariti Learning - Your Course Call has been Cancelled`,
      html: getEmailTemplate("courseCallCancelled", {
        name,
        courseName: courseName || callDetails.courseName || "N/A",
        courseId: courseId || null,
        batchName: callDetails.batchName || "N/A",
        batchId: batchId || null,
        updatedBy: updatedBy || "Admin",
        calls: { cancelled, rescheduled: [] }, 
        classType: callDetails.classType || "N/A",
        isTeacher,
      }),
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Course call cancelled email sent to ${email}`);
  } catch (error) {
    logger.error(
      `Failed to send course call cancelled email to ${email}:`,
      error
    );
    throw error;
  }
};

const sendDemoClassScheduledEmail = async (to, name, callDetails, isTeacher = false) => {
  try {
    const mailOptions = {
      from: `"Klariti Learning" <${process.env.EMAIL_USER}>`,
      to,
      subject: isTeacher
        ? `Demo Class Scheduled: ${callDetails.classType}`
        : `You're Invited to a Demo Class: ${callDetails.classType}`,
      html: getEmailTemplate("demoClassScheduled", {
        name,
        classType: callDetails.classType,
        date: callDetails.date,
        startTime: callDetails.startTime,
        endTime: callDetails.endTime,
        callDuration: callDetails.callDuration,
        zoomLink: callDetails.zoomLink,
        isTeacher,
        baseUrl: process.env.BASE_URL,
      }),
    };
    await transporter.sendMail(mailOptions);
    logger.info(`Demo class scheduled email sent to ${to}`);
  } catch (error) {
    logger.error(`Failed to send demo class scheduled email to ${to}:`, error);
    throw error;
  }
};

const sendDemoClassRescheduledEmail = async (to, name, callDetails, isTeacher = false) => {
  try {
    const mailOptions = {
      from: `"Klariti Learning" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Demo Class Rescheduled: ${callDetails.classType}`,
      html: getEmailTemplate("demoClassRescheduled", {
        name,
        classType: callDetails.classType,
        date: callDetails.date.toLocaleDateString(),
        startTime: callDetails.startTime,
        endTime: callDetails.endTime,
        previousDate: callDetails.previousDate ? callDetails.previousDate.toLocaleDateString() : "N/A",
        previousStartTime: callDetails.previousStartTime || "N/A",
        previousEndTime: callDetails.previousEndTime || "N/A",
        callDuration: callDetails.callDuration,
        zoomLink: callDetails.zoomLink,
        isTeacher,
        baseUrl: process.env.BASE_URL,
      }),
    };
    await transporter.sendMail(mailOptions);
    logger.info(`Demo class rescheduled email sent to ${to}`);
  } catch (error) {
    logger.error(`Failed to send demo class rescheduled email to ${to}:`, error);
    throw error;
  }
};

const sendDemoClassCancelledEmail = async (to, name, callDetails) => {
  try {
    const mailOptions = {
      from: `"Klariti Learning" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Demo Class Cancelled: ${callDetails.classType}`,
      html: getEmailTemplate("demoClassCancelled", {
        name,
        classType: callDetails.classType,
        date: callDetails.date.toLocaleDateString(),
        startTime: callDetails.startTime,
        callDuration: callDetails.callDuration,
        baseUrl: process.env.BASE_URL,
        supportEmail: process.env.SUPPORT_EMAIL,
      }),
    };
    await transporter.sendMail(mailOptions);
    logger.info(`Demo class cancelled email sent to ${to}`);
  } catch (error) {
    logger.error(`Failed to send demo class cancelled email to ${to}:`, error);
    throw error;
  }
};

module.exports = {
  sendDemoClassScheduledEmail,
  sendDemoClassRescheduledEmail,
  sendDemoClassCancelledEmail,
};

module.exports = {
  sendEmailOTP,
  sendLoginOTP,
  sendRegistrationEmail,
  sendAdminNotificationEmail,
  sendRoleAssignmentEmail,
  sendScheduledCallEmail,
  sendRecordingUploadedEmail,
  sendPreCallNotificationEmail,
  sendTicketRaisedEmail,
  sendTicketConfirmationEmail,
  sendClassPauseRequestEmail,
  sendTeacherChangeRequestEmail,
  sendTicketRatingEmail,
  sendTimezoneChangeRequestEmail,
  sendSubjectChangeRequestEmail,
  sendTimezoneSetupEmail,
  sendReportCardEmail,
  sendRescheduleCallEmail,
  sendCancelCallEmail,
  sendCourseCreatedEmail,
  sendCourseAssignedEmail,
  sendBatchCreatedEmail,
  sendBatchDeletedEmail,
  sendCourseEditedEmail,
  sendCourseDeletedEmail,
  sendBatchCourseEditedEmail,
  sendTeacherCourseEditedEmail,
  sendStudentCourseEditedEmail,
  sendCourseUnassignedEmail,
  sendCourseScheduledEmail,
  sendCourseCallRescheduledEmail,
  sendCourseCallCancelledEmail,
  sendDemoClassScheduledEmail,
  sendDemoClassRescheduledEmail,
  sendDemoClassCancelledEmail,
};
