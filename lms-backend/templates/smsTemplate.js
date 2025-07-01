const getSMSTemplate = (type, data) => {
  console.log("data", data);

  const baseUrl = process.env.BASE_URL;

  switch (type) {
    case "registrationOTP":
      return `Klariti Learning: Dear ${data.name}, your registration OTP is ${data.otp}. Valid for 5 min. Do not share. Login: ${baseUrl}/verify`;

    case "loginOTP":
      return `Klariti Learning: Dear ${
        data.name || "User"
      }, your login OTP is ${
        data.otp
      }. Valid for 5 min. Do not share. Login: ${baseUrl}/login`;

    case "registrationSuccess":
      return `Klariti Learning: Welcome ${data.name}! You've registered. Start learning: ${baseUrl}/login`;

    case "roleAssignment":
      return `Klariti Learning: Dear ${data.name}, you're assigned ${data.role} by ${data.assignedBy}. Log in: ${baseUrl}/login`;

    case "adminNotification":
      return `Klariti Learning: New user ${data.userName} registered. Assign role: ${baseUrl}/admin/assign-role/${data.userId}`;

    case "scheduledCall":
      return `Klariti Learning: Dear ${data.name}, new call: ${data.classType} (${data.type}) on ${data.date} from ${data.startTime}-${data.endTime}. Check portal.`;

    case "recordingUploaded":
      return `Klariti Learning: Dear ${data.name}, recording for ${data.classType} (${data.type}) on ${data.date} is available in portal.`;

    case "preCallNotification":
      return `Klariti Learning: Dear ${data.name}, your ${data.classType} (${data.type}) call on ${data.date} at ${data.startTime} starts in 10 min. Join: ${data.zoomLink}`;

    case "preCallNotificationWhatsApp":
      return `Klariti Learning: Dear ${data.name}, your ${data.classType} (${
        data.type
      }) call on ${data.date} at ${data.startTime} starts in ${
        data.timeUntil === "1day"
          ? "1 day"
          : data.timeUntil === "1hour"
          ? "1 hour"
          : data.timeUntil + " minutes"
      }. Join: ${baseUrl}/${data.teacher ? "teacher" : "student"}/schedule`;

    case "ticketConfirmation":
      return `Klariti Learning: Dear ${data.name}, ticket ${data.ticketId} (${
        data.issueType
      }) received. View: ${baseUrl}/${
        data.userRole ? data.userRole.toLowerCase().replace(/\s+/g, '') : "user"
      }/raise-query`;

    case "reportCard":
      return `Klariti Learning: Report card for ${data.studentName} by ${data.teacherName}. Rating: ${data.rating}/5. View: ${baseUrl}/admin/students`;

    case "rescheduleCall":
      return `Klariti Learning: Dear ${data.name}, your ${data.classType} (${
        data.type
      }) call on ${data.date} is rescheduled to ${data.startTime}-${
        data.endTime
      } (${data.timezone}). Check portal: ${baseUrl}/${
        data.teacher ? "teacher" : "student"
      }/schedule`;

    case "cancelCall":
      return `Klariti Learning: Dear ${data.name}, your ${data.classType} (${data.type}) call on ${data.date} is cancelled. Contact support for queries.`;

    case "courseCreated":
      return `Klariti Learning: Dear ${data.name}, ${data.createdBy}. View: ${baseUrl}/admin/courses/${data.title}`;

    case "courseAssigned":
      return `Klariti Learning: Dear ${data.name}, ${data.courseId}. View: ${baseUrl}/teacher/courses/${data.title}`;

    case "courseUnassigned":
      return `Klariti Learning: Dear ${data.name}, ${data.courseId}. View: ${baseUrl}/teacher/courses/${data.title}`;

    case "courseEdited":
      return `Klariti Learning: Dear ${data.title},  ${
        data.updatedBy
      }. View: ${baseUrl}/${data.recipientRole.toLowerCase().replace(/\s+/g, '')}/courses/${
        data.name
      }`;

    case "courseDeleted":
      return `Klariti Learning: Dear ${data.recipientRole},  ${
        data.deletedBy
      }. View: ${baseUrl}/${data.recipientRole.toLowerCase().replace(/\s+/g, '')}/courses`;

    case "batchCreated":
      return `Klariti Learning: Dear ${data.title}, ${data.updatedBy}.". View: ${baseUrl}/student/batches/${data.name}`;

    case "batchCourseEdited":
      return `Klariti Learning: Dear ${data.title}, course content for batch "${data.batchName}" updated by ${data.updatedBy}. View: ${baseUrl}/student/batches/${data.batchId}`;

    case "batchDeleted":
      return `Klariti Learning: Dear ${data.name}, you have been removed from batch "${data.batchName}" for course "${data.courseTitle}". View: ${baseUrl}/student/batches`;

    case "studentCourseEdited":
      return `Klariti Learning: Dear ${data.title}, your course content for batch "${data.batchName}" updated by ${data.updatedBy}. View: ${baseUrl}/student/batches/${data.batchId}`;

    case "courseScheduled":
      return `Klariti Learning: Dear ${data.name}, your ${data.classType} (${
        data.type
      }) call on ${data.date} is scheduled to ${data.startTime}-${
        data.endTime
      } (${data.timezone}). Check portal: ${baseUrl}/${
        data.teacher ? "teacher" : "student"
      }/schedule`;

    case "courseRescheduled":
      return `Klariti Learning: Dear ${data.name}, your ${data.classType} (${
        data.type
      }) call on ${data.date} is rescheduled to ${data.startTime}-${
        data.endTime
      } (${data.timezone}). Check portal: ${baseUrl}/${
        data.teacher ? "teacher" : "student"
      }/schedule`;

    case "courseCallCancelled":
      return `Klariti Learning: Dear ${data.name}, your ${data.classType} (${
        data.type
      }) call on ${data.date} is Cancelled. Check portal: ${baseUrl}/${
        data.teacher ? "teacher" : "student"
      }/schedule`;

    default:
      return "";
  }
};

module.exports = { getSMSTemplate };
