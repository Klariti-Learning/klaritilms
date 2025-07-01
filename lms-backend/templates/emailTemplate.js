const getEmailTemplate = (type, data) => {
  console.log("data", data);
  const logoUrl =
    "https://res.cloudinary.com/dlie87ah0/image/upload/v1745815676/Klariti_Web_2_edited_n6vp0n.avif";

  const companyName = "Klariti Learning";
  const baseUrl = process.env.BASE_URL;
  const supportEmail = process.env.SUPPORT_EMAIL;

  const styles = `
  <style>
    body { font-family: Arial, sans-serif; color: #333; margin: 0; padding: 0; }
    a { text-decoration: none; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
    .header { position: relative; padding: 10px 0; text-align: center; }
    .logo { float: right; max-width: 100px; height: auto; }
    .company-name { margin: 0; font-size: 24px; font-weight: bold; color: #ff0000; }
    .content { padding: 20px; clear: both; }
    .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: #fff !important; text-decoration: none; border-radius: 5px; }
    .footer { text-align: center; font-size: 12px; color: #777; margin-top: 20px; }
     .star-filled { color: #FFD700; margin-right: 2px; font-size: 20px; }
    .star-empty { color: #D3D3D3; margin-right: 2px; font-size: 20px; }
    .schedule-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      .schedule-table th, .schedule-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      .schedule-table th { background: #f2f2f2; }
      .cancelled { text-decoration: line-through; color: #777; }
@media only screen and (max-width: 600px) {
        .logo { float: none; margin: 0 auto; display: block; }
        .header { text-align: center; }
        .company-name { font-size: 20px; margin-top: 10px; }
        .schedule-table th, .schedule-table td { font-size: 14px; padding: 6px; }
    }
  </style>
`;

  switch (type) {
    case "registrationOTP":
      return `
        <!DOCTYPE html>
        <html>
        <head>${styles}</head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
              <h2 class="company-name">${companyName}</h2>
            </div>
            <div class="content">
              <h3>Registration OTP Verification</h3>
              <p>Dear ${data.name},</p>
              <p>Welcome to ${companyName}! To complete your registration, please use the following One-Time Password (OTP):</p>
              <h2 style="color: #007bff;">${data.otp}</h2>
              <p>This OTP is valid for 5 minutes. Please do not share it with anyone.</p>
              <p><a href="${baseUrl}/verify" class="button">Verify Now</a></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case "loginOTP":
      return `
        <!DOCTYPE html>
        <html>
        <head>${styles}</head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
              <h2 class="company-name">${companyName}</h2>
            </div>
            <div class="content">
              <h3>Login OTP Verification</h3>
              <p>Dear ${data.name || "User"},</p>
              <p>To securely log in to your ${companyName} account, please use the following One-Time Password (OTP):</p>
              <h2 style="color: #007bff;">${data.otp}</h2>
              <p>This OTP is valid for 5 minutes. Please do not share it with anyone.</p>
              <p><a href="${baseUrl}/login" class="button ">Log In Now</a></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case "registrationSuccess":
      return `
        <!DOCTYPE html>
        <html>
        <head>${styles}</head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
              <h2 class="company-name">${companyName}</h2>
            </div>
            <div class="content">
              <h3>Welcome to ${companyName}!</h3>
              <p>Dear ${data.name},</p>
              <p>Congratulations! You have successfully registered with ${companyName}. We're excited to have you on board!</p>
              ${data.customMessage ? `<p>${data.customMessage}</p>` : ""}
              <p><a href="${baseUrl}/login" class="button">Log In Now</a></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case "adminNotification":
      return `
        <!DOCTYPE html>
        <html>
        <head>${styles}</head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
              <h2 class="company-name">${companyName}</h2>
            </div>
            <div class="content">
              <h3>New User Registration</h3>
              <p>Dear Admin,</p>
              <p>A new user, ${
                data.userName
              }, has registered with ${companyName}. Please assign them a role.</p>
              <p><a href="${baseUrl}/admin/assign-role/${
        data.userId
      }" class="button">Assign Role</a></p>
              ${data.customMessage ? `<p>${data.customMessage}</p>` : ""}
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case "roleAssignment":
      return `
        <!DOCTYPE html>
        <html>
        <head>${styles}</head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
              <h2 class="company-name">${companyName}</h2>
            </div>
            <div class="content">
              <h3>Role Assignment Notification</h3>
              <p>Dear ${data.name},</p>
              <p>You have been assigned the role of <strong>${
                data.role
              }</strong> by ${data.assignedBy} at ${companyName}.</p>
              <p><a href="${baseUrl}/login" class="button">Log In Now</a></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case "scheduledCall":
      return `
          <!DOCTYPE html>
          <html>
          <head>${styles}</head>
          <body>
            <div class="container">
              <div class="header">
                <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
                <h2 class="company-name">${companyName}</h2>
              </div>
              <div class="content">
                <h3>New Scheduled Call</h3>
                <p>Dear ${data.name},</p>
                <p>A new call has been scheduled for you:</p>
                <p><strong>Class:</strong> ${data.classType}</p>
                <p><strong>Type:</strong> ${data.type}</p>
                <p><strong>Date:</strong> ${data.date}</p>
                <p><strong>Time:</strong> ${data.startTime} - ${
        data.endTime
      }</p>
                <p>Please check the teacher portal 10 minutes before the call to access the Zoom link and any documents.</p>
                <p><a href="${baseUrl}/teacher/schedule" class="button">View Schedule</a></p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;
    case "recordingUploaded":
      return `
          <!DOCTYPE html>
          <html>
          <head>${styles}</head>
          <body>
            <div class="container">
              <div class="header">
                <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
                <h2 class="company-name">${companyName}</h2>
              </div>
              <div class="content">
                <h3>Call Recording Uploaded</h3>
                <p>Dear ${data.name},</p>
                <p>The recording for your recent call is now available:</p>
                <p><strong>Class:</strong> ${data.classType}</p>
                <p><strong>Type:</strong> ${data.type}</p>
                <p><strong>Date:</strong> ${data.date}</p>
                <p>Please check the teacher portal to view the recording.</p>
                <p><a href="${baseUrl}/teacher/schedule" class="button">View Recording</a></p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;

    case "preCallNotification":
      return `
        <!DOCTYPE html>
        <html>
        <head>${styles}</head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
              <h2>${companyName}</h2>
            </div>
            <div class="content">
              <h3>Class Reminder</h3>
              <p>Dear ${data.name},</p>
              <p>Your ${data.classType} (${data.type}) starts in ${
        data.timeUntil
      } on ${data.date} at ${data.startTime}.</p>
              <p><a href="${data.zoomLink}" class="button">Join Class</a></p>
              <p><a href="${data.baseUrl}/${
        data.isTeacher ? "teacher" : "student"
      }/schedule">View Schedule</a></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case "ticketRaised":
      return `
              <!DOCTYPE html>
              <html>
              <head>${styles}</head>
              <body>
                <div class="container">
                  <div class="header">
                    <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
                    <h2 class="company-name">${companyName}</h2>
                  </div>
                  <div class="content">
                    <h3>New Support Ticket Raised</h3>
                    <p>Dear Support Team,</p>
                    <p>A new ticket has been raised by a user and requires your attention:</p>
                    <div class="ticket-info">
                      <p><strong>User Name:</strong> ${data.userName}</p>
                      <p><strong>User Email:</strong> ${data.userEmail}</p>
                      <p><strong>User Role:</strong> ${data.userRole}</p>
                      <p><strong>Ticket Number:</strong> ${data.ticketId}</p>
                      <p><strong>Issue Type:</strong> ${data.issueType}</p>
                      <p><strong>Description:</strong> ${data.description}</p>
                      ${
                        data.fileUrl
                          ? `<p><strong>Attachment:</strong> <a href="${data.fileUrl}" target="_blank">View File</a></p>`
                          : ""
                      }
                    </div>
                    <p>Please review this ticket and take appropriate action at your earliest convenience.</p>
                  </div>
                  <div class="footer">
                    <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
                  </div>
                </div>
              </body>
              </html>
            `;

    case "ticketConfirmation":
      return `
              <!DOCTYPE html>
              <html>
              <head>${styles}</head>
              <body>
                <div class="container">
                  <div class="header">
                    <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
                    <h2 class="company-name">${companyName}</h2>
                  </div>
                  <div class="content">
                    <h3>Ticket Confirmation</h3>
                    <p>Dear ${data.name},</p>
                    <p>Thank you for reaching out to us. Your support ticket has been successfully generated and is now being processed by our team. Here are the details:</p>
                    <div class="ticket-info">
                      <p><strong>Ticket Number:</strong> ${data.ticketId}</p>
                      <p><strong>Subject:</strong> ${data.issueType}</p>
                      <p><strong>Status:</strong> In Progress</p>
                    </div>
                    <p>We are working on resolving your query and will keep you updated on the progress. You can view the status of your ticket at any time in your student portal.</p>
                    <p><a href="${baseUrl}/student/raise-query" class="button">View Ticket</a></p>
                    <p class="support-contact">Need assistance sooner? Feel free to reach out to our support team at <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
                  </div>
                  <div class="footer">
                    <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
                  </div>
                </div>
              </body>
              </html>
            `;

    case "classPauseRequest":
      return `
              <!DOCTYPE html>
              <html>
              <head>${styles}</head>
              <body>
                <div class="container">
                  <div class="header">
                    <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
                    <h2 class="company-name">${companyName}</h2>
                  </div>
                  <div class="content">
                    <h3>New Class Pause Request</h3>
                    <p>Dear Support Team,</p>
                    <p>A student has requested to pause their classes. Please review the details below and take appropriate action:</p>
                    <div class="ticket-info">
                      <p><strong>User Name:</strong> ${data.userName}</p>
                      <p><strong>User Email:</strong> ${data.userEmail}</p>
                      <p><strong>User Role:</strong> ${data.userRole}</p>
                      <p><strong>Ticket Number:</strong> ${data.ticketId}</p>
                      <p><strong>Issue Type:</strong> ${data.issueType}</p>
                      <p><strong>Description:</strong> ${data.description}</p>
                    </div>
                    <p>Please reach out to the student to confirm the pause request and provide further instructions.</p>
                  </div>
                  <div class="footer">
                    <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
                  </div>
                </div>
              </body>
              </html>
            `;

    case "teacherChangeRequest":
      return `
              <!DOCTYPE html>
              <html>
              <head>${styles}</head>
              <body>
                <div class="container">
                  <div class="header">
                    <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
                    <h2 class="company-name">${companyName}</h2>
                  </div>
                  <div class="content">
                    <h3>New Teacher Change Request</h3>
                    <p>Dear Support Team,</p>
                    <p>A student has requested to change their teacher. Please review the details below and take appropriate action:</p>
                    <div class="ticket-info">
                      <p><strong>User Name:</strong> ${data.userName}</p>
                      <p><strong>User Email:</strong> ${data.userEmail}</p>
                      <p><strong>User Role:</strong> ${data.userRole}</p>
                      <p><strong>Ticket Number:</strong> ${data.ticketId}</p>
                      <p><strong>Issue Type:</strong> ${data.issueType}</p>
                      <p><strong>Description:</strong> ${data.description}</p>
                    </div>
                    <p>Please reach out to the student to confirm the teacher change request and provide further instructions.</p>
                  </div>
                  <div class="footer">
                    <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
                  </div>
                </div>
              </body>
              </html>
            `;

    case "ticketRating":
      return `
                <!DOCTYPE html>
                <html>
                <head>${styles}</head>
                <body>
                  <div class="container">
                    <div class="header">
                      <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
                      <h2 class="company-name">${companyName}</h2>
                    </div>
                    <div class="content">
                      <h3>Ticket Rating Confirmation</h3>
                      <p>Dear ${data.name},</p>
                      <p>Thank you for rating your support ticket. Here are the details:</p>
                      <div class="ticket-info">
                        <p><strong>Ticket Number:</strong> ${
                          data.ticketNumber
                        }</p>
                        <p><strong>Description:</strong> ${data.description}</p>
                        <p><strong>Your Rating:</strong> 
                          ${'<span class="star-filled">★</span>'.repeat(
                            data.rating
                          )}${'<span class="star-empty">☆</span>'.repeat(
        5 - data.rating
      )}
                        </p>
                      </div>
                      <p>We value your feedback! If you have any further questions, feel free to reach out to our support team at <a href="mailto:${supportEmail}" style="color: #007bff;">${supportEmail}</a>.</p>
                      <p><a href="${baseUrl}/student/raise-query" class="button">View Tickets</a></p>
                    </div>
                    <div class="footer">
                      <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
                    </div>
                  </div>
                </body>
                </html>
              `;

    case "timezoneChangeRequest":
      return `
                  <!DOCTYPE html>
                  <html>
                  <head>${styles}</head>
                  <body>
                    <div class="container">
                      <div class="header">
                        <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
                        <h2 class="company-name">${companyName}</h2>
                      </div>
                      <div class="content">
                        <h3>New Timezone Change Request</h3>
                        <p>Dear Support Team,</p>
                        <p>A ${
                          data.userRole
                        } has requested a timezone change. Please review the details below and take appropriate action:</p>
                        <div class="ticket-info">
                          <p><strong>User Name:</strong> ${data.userName}</p>
                          <p><strong>User Email:</strong> ${data.userEmail}</p>
                          <p><strong>User Role:</strong> ${data.userRole}</p>
                          <p><strong>Ticket Number:</strong> ${
                            data.ticketId
                          }</p>
                          <p><strong>Issue Type:</strong> ${data.issueType}</p>
                          <p><strong>Description:</strong> ${
                            data.description
                          }</p>
                          <p><strong>Visible to Teacher:</strong> ${
                            data.visibleToTeacher ? "Yes" : "No"
                          }</p>
                          ${
                            data.fileUrl
                              ? `<p><strong>Attachment:</strong> <a href="${data.fileUrl}" target="_blank">View File</a></p>`
                              : ""
                          }
                        </div>
                        <p>Please contact the ${data.userRole.toLowerCase().replace(/\s+/g, '')} to confirm the timezone change request and update their schedule accordingly.</p>
                        <p><a href="${baseUrl}/admin/tickets" class="button">View Ticket</a></p>
                      </div>
                      <div class="footer">
                        <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
                      </div>
                    </div>
                  </body>
                  </html>
                `;

    case "subjectChangeRequest":
      return `
        <!DOCTYPE html>
        <html>
        <head>${styles}</head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
              <h2 class="company-name">${companyName}</h2>
            </div>
            <div class="content">
              <h3>New Subject Change Request</h3>
              <p>Dear Support Team,</p>
              <p>A Teacher has requested a subject change. Please review the details below and take appropriate action:</p>
              <div class="ticket-info">
                <p><strong>User Name:</strong> ${data.userName}</p>
                <p><strong>User Email:</strong> ${data.userEmail}</p>
                <p><strong>User Role:</strong> ${data.userRole}</p>
                <p><strong>Ticket Number:</strong> ${data.ticketId}</p>
                <p><strong>Issue Type:</strong> ${data.issueType}</p>
                <p><strong>Description:</strong> ${data.description}</p>
                <p><strong>Current Subject:</strong> ${
                  data.currentSubject || "N/A"
                }</p>
                ${
                  data.fileUrl
                    ? `<p><strong>Attachment:</strong> <a href="${data.fileUrl}" target="_blank">View File</a></p>`
                    : ""
                }
              </div>
              <p>Please contact the teacher to confirm the subject change request and update their teaching assignments accordingly.</p>
              <p><a href="${baseUrl}/admin/tickets" class="button">View Ticket</a></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case "timezoneSetup":
      return `
        <!DOCTYPE html>
        <html>
        <head>${styles}</head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
              <h2 class="company-name">${companyName}</h2>
            </div>
            <div class="content">
              <h3>User Timezone Setup Notification</h3>
              <p>Dear Admin,</p>
              <p>The user ${data.userName} with role ${
        data.userRole
      } has set their timezone and preferred time slots:</p>
              <div class="ticket-info">
                <p><strong>User Name:</strong> ${data.userName}</p>
                <p><strong>Timezone:</strong> ${data.timezone}</p>
                <p><strong>Preferred Time Slots:</strong> ${data.timeSlots.join(
                  ", "
                )}</p>
              </div>
              <p>Please review the user's profile to ensure their schedule aligns with their preferences.</p>
              <p><a href="${baseUrl}/admin/users/${
        data.userId
      }" class="button">View User Profile</a></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case "reportCard":
      return `
        <!DOCTYPE html>
        <html>
        <head>${styles}</head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
              <h2 class="company-name">${companyName}</h2>
            </div>
            <div class="content">
              <h3>Daily Report Card</h3>
              <p>Dear Admin,</p>
              <p>A new report card has been submitted for ${
                data.studentName
              } by ${data.teacherName}:</p>
              <p><strong>Rating:</strong> ${'<span class="star-filled">★</span>'.repeat(
                data.rating
              )}${'<span class="star-empty">☆</span>'.repeat(
        5 - data.rating
      )}</p>
              <p><strong>Comments:</strong> ${
                data.comments || "No comments provided"
              }</p>
              <p><a href="${baseUrl}/admin/students" class="button">View Students</a></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case "rescheduleCall":
      return `
        <!DOCTYPE html>
        <html>
        <head>${styles}</head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
              <h2 class="company-name">${companyName}</h2>
            </div>
            <div class="content">
              <h3>Call Rescheduled</h3>
              <p>Dear ${data.name},</p>
              <p>Your scheduled call has been rescheduled. Here are the updated details:</p>
              <p><strong>Status:</strong> <span class="status">Rescheduled</span></p>
              <p><strong>Class:</strong> ${data.classType}</p>
              <p><strong>Type:</strong> ${data.type}</p>
              <p><strong>Date:</strong> ${data.date}</p>
              <p><strong>Time:</strong> ${data.startTime} - ${data.endTime} (${
        data.timezone
      })</p>
              <p>Please check the ${
                data.teacher ? "teacher" : "student"
              } portal 10 minutes before the call to access the Zoom link and any documents.</p>
              <p><a href="${baseUrl}/${
        data.teacher ? "teacher" : "student"
      }/schedule" class="button">View Updated Schedule</a></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case "cancelCall":
      return `
        <!DOCTYPE html>
        <html>
        <head>${styles}</head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
              <h2 class="company-name">${companyName}</h2>
            </div>
            <div class="content">
              <h3>Call Cancelled</h3>
              <p>Dear ${data.name},</p>
              <p>Your scheduled call has been cancelled. Here are the details:</p>
              <p><strong>Status:</strong> <span class="status">Cancelled</span></p>
              <p><strong>Class:</strong> ${data.classType}</p>
              <p><strong>Type:</strong> ${data.type}</p>
              <p><strong>Date:</strong> ${data.date}</p>
              <p>No further action is required. If you have any questions, contact support at <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case "courseCreated":
      return `
    <!DOCTYPE html>
    <html>
    <head>${styles}</head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
          <h2 class="company-name">${companyName}</h2>
        </div>
        <div class="content">
          <h3>New Course Created</h3>
          <p>Dear ${data.name},</p>
          <p>${data.createdBy}.</p>
          <p><a href="${baseUrl}/admin/courses/${
        data.title
      }" class="button">View Course</a></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    case "courseAssigned":
      return `
    <!DOCTYPE html>
    <html>
    <head>${styles}</head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
          <h2 class="company-name">${companyName}</h2>
        </div>
        <div class="content">
          <h3>Course Assigned</h3>
          <p>Dear ${data.name},</p>
          <p>${data.courseId}.</p>
          <p><a href="${baseUrl}/teacher/courses/${
        data.title
      }" class="button">View Course</a></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    case "courseUnassigned":
      return `
    <!DOCTYPE html>
    <html>
    <head>${styles}</head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
          <h2 class="company-name">${companyName}</h2>
        </div>
        <div class="content">
          <h3>Course Access Removed</h3>
          <p>Dear ${data.name},</p>
          <p>${data.courseId}.</p>
          <p><a href="${baseUrl}/teacher/courses/${
        data.title
      }" class="button">View Course</a></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    case "courseEdited":
      return `
    <!DOCTYPE html>
    <html>
    <head>${styles}</head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
          <h2 class="company-name">${companyName}</h2>
        </div>
        <div class="content">
          <h3>Course Updated</h3>
          <p>Dear ${data.title},</p>
          <p>${data.updatedBy}.</p>
         <p><a href="${baseUrl}/teacher/courses/${
        data.name
      }" class="button">View Course</a></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

      case "teacherCourseEdited":
      return `
    <!DOCTYPE html>
    <html>
    <head>${styles}</head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
          <h2 class="company-name">${companyName}</h2>
        </div>
        <div class="content">
          <h3>Batch Course Updated</h3>
          <p>Dear ${data.name},</p>
          <p>${data.updatedBy}.</p>
          <p><a href="${baseUrl}/student/batches/${
        data.batchName
      }" class="button">View Batch</a></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    case "courseDeleted":
      return `
    <!DOCTYPE html>
    <html>
    <head>${styles}</head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
          <h2 class="company-name">${companyName}</h2>
        </div>
        <div class="content">
          <h3>Course Deleted</h3>
          <p>Dear ${data.recipientRole},</p>
          <p>${data.deletedBy}.</p>
          <p><a href="${baseUrl}/${data.recipientRole.toLowerCase().replace(/\s+/g, '')}/courses" class="button">View Courses</a></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    case "batchCreated":
      return `
    <!DOCTYPE html>
    <html>
    <head>${styles}</head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
          <h2 class="company-name">${companyName}</h2>
        </div>
        <div class="content">
          <h3>Added to Batch</h3>
          <p>Dear ${data.name},</p>
          <p>${data.courseTitle}.</p>
          <p><a href="${baseUrl}/student/batches/${
        data.batchName
      }" class="button">View Batch</a></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    case "batchDeleted":
      return `
    <!DOCTYPE html>
    <html>
    <head>${styles}</head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
          <h2 class="company-name">${companyName}</h2>
        </div>
        <div class="content">
          <h3>Removed from Batch</h3>
          <p>Dear ${data.name},</p>
          <p>${data.message}.</p>
          <p><a href="${baseUrl}/student/batches" class="button">View Batches</a></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    case "batchCourseEdited":
      return `
    <!DOCTYPE html>
    <html>
    <head>${styles}</head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
          <h2 class="company-name">${companyName}</h2>
        </div>
        <div class="content">
          <h3>Batch Course Updated</h3>
          <p>Dear ${data.name},</p>
          <p>${data.updatedBy}.</p>
          <p><a href="${baseUrl}/student/batches/${
        data.batchName
      }" class="button">View Batch</a></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    case "studentCourseEdited":
      return `
    <!DOCTYPE html>
    <html>
    <head>${styles}</head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
          <h2 class="company-name">${companyName}</h2>
        </div>
        <div class="content">
          <h3>Your Course Updated</h3>
          <p>Dear ${data.name},</p>
          <p>${data.updatedBy}.</p>
          <p><a href="${baseUrl}/student/batches/${
        data.batchName
      }" class="button">View Batch</a></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    case "courseScheduled":
      if (!Array.isArray(data.schedule)) {
        logger.error("Invalid schedule format in courseScheduled template", {
          schedule: data.schedule,
        });
        return `
            <!DOCTYPE html>
            <html>
            <head>${styles}</head>
            <body>
              <div class="container">
                <div class="header">
                  <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
                  <h2>${companyName}</h2>
                </div>
                <div class="content">
                  <h3>Course Scheduled</h3>
                  <p>Dear ${data.name},</p>
                  <p>Your course "${
                    data.courseTitle
                  }" has been scheduled. Please check your schedule in the portal.</p>
                  <p><a href="${data.baseUrl}/${
          data.isTeacher ? "teacher" : "student"
        }/schedule" class="button">View Schedule</a></p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
                </div>
              </div>
            </body>
            </html>
          `;
      }
      return `
          <!DOCTYPE html>
          <html>
          <head>${styles}</head>
          <body>
            <div class="container">
              <div class="header">
                <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
                <h2>${companyName}</h2>
              </div>
              <div class="content">
                <h3>Course Scheduled</h3>
                <p>Dear ${data.name},</p>
                <p>Your course "${
                  data.courseTitle
                }" has been scheduled. Please see the schedule below:</p>
                <table class="schedule-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Start Time</th>
                      <th>End Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.schedule
                      .map(
                        (s) => `
                      <tr>
                        <td>${s.date}</td>
                        <td>${s.startTime}</td>
                        <td>${s.endTime}</td>
                      </tr>
                    `
                      )
                      .join("")}
                  </tbody>
                </table>
                <p><a href="${data.baseUrl}/${
        data.isTeacher ? "teacher" : "student"
      }/schedule" class="button">View Schedule</a></p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;

case "courseCallRescheduled":
  if (!Array.isArray(data.schedule)) {
    console.error("Invalid schedule format in courseRescheduled template", {
      schedule: data.schedule,
    });
    return `
      <!DOCTYPE html>
      <html>
      <head>${styles}</head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
            <h2 class="company-name">${companyName}</h2>
          </div>
          <div class="content">
            <h3>Course Rescheduled</h3>
            <p>Dear ${data.name},</p>
            <p>Your call for lesson <b>${data.schedule.lessonTitle || "N/A"}</b> from course <b>${data.courseName}</b> in batch <b>${data.batchName || "N/A"}</b> has been rescheduled. Please check your updated schedule in the portal.</p>
            <p><a href="${baseUrl}/${data.isTeacher ? "teacher" : "student"}/schedule" class="button">View Updated Schedule</a></p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
  return `
    <!DOCTYPE html>
    <html>
    <head>${styles}</head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
          <h2 class="company-name">${companyName}</h2>
        </div>
        <div class="content">
          <h3>Course Rescheduled</h3>
          <p>Dear ${data.name},</p>
          <p>Your call for lesson <b>${data.schedule.lessonTitle || "N/A"}</b> from course <b>${data.courseName}</b> in batch <b>${data.batchName || "N/A"}</b> has been rescheduled. Please check your updated schedule:</p>
          <table class="schedule-table">
            <thead>
              <tr>
                <th>Lesson</th>
                <th>Date</th>
                <th>Start Time</th>
                <th>End Time</th>
              </tr>
            </thead>
            <tbody>
              ${data.schedule
                .map(
                  (s) => `
                <tr>
                  <td>${s.lessonTitle || "N/A"}</td>
                  <td>${s.date}</td>
                  <td>${s.startTime}</td>
                  <td>${s.endTime}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <p>Previous schedule (cancelled):</p>
          <table class="schedule-table">
            <thead>
              <tr>
                <th>Lesson</th>
                <th>Date</th>
                <th>Start Time</th>
                <th>End Time</th>
              </tr>
            </thead>
            <tbody>
              ${data.schedule
                .filter((s) => s.previousDate && s.previousStartTime && s.previousEndTime)
                .map(
                  (s) => `
                <tr>
                  <td class="cancelled">${s.lessonTitle || "N/A"}</td>
                  <td class="cancelled">${s.previousDate}</td>
                  <td class="cancelled">${s.previousStartTime}</td>
                  <td class="cancelled">${s.previousEndTime}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <p>Please check the ${data.isTeacher ? "teacher" : "student"} portal 10 minutes before the call to access the Zoom link and any documents.</p>
          <p><a href="${baseUrl}/${data.isTeacher ? "teacher" : "student"}/schedule" class="button">View Updated Schedule</a></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
    
case "courseCallCancelled":
  if (!Array.isArray(data.calls.cancelled)) {
    console.error("Invalid cancelled calls format in courseCallCancelled template", {
      cancelled: data.calls.cancelled,
    });
    return `
      <!DOCTYPE html>
      <html>
      <head>${styles}</head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
            <h2 class="company-name">${companyName}</h2>
          </div>
          <div class="content">
            <h3>Course Call Cancelled</h3>
            <p>Dear ${data.name},</p>
            <p>Your class from your course <b>${data.courseName || "N/A"}</b> in batch <b>${data.batchName || "N/A"}</b> has been cancelled by ${data.updatedBy || "N/A"}. Please check the portal for updates.</p>
            <p><a href="${baseUrl}/${data.isTeacher ? "teacher" : "student"}/batches/${data.batchId || ""}" class="button">View Batch Details</a></p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            <p>Contact us at <a href="mailto:${supportEmail}">${supportEmail}</a> for any questions.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
  return `
    <!DOCTYPE html>
    <html>
    <head>${styles}</head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
          <h2 class="company-name">${companyName}</h2>
        </div>
        <div class="content">
          <h3>Course Call Cancelled</h3>
          <p>Dear ${data.name},</p>
          <p>Your class for lesson <b>${data.calls.cancelled[0]?.lessonTitle || "N/A"}</b> from your course <b>${data.courseName || "N/A"}</b> in batch <b>${data.batchName || "N/A"}</b> has been cancelled by ${data.updatedBy || "N/A"}.</p>
          <table class="schedule-table">
            <thead>
              <tr>
                <th>Lesson</th>
                <th>Date</th>
                <th>Start Time</th>
                <th>End Time</th>
              </tr>
            </thead>
            <tbody>
              ${data.calls.cancelled
                .map(
                  (call) => `
                <tr>
                  <td class="cancelled">${call.lessonTitle || "N/A"}</td>
                  <td class="cancelled">${call.date || "N/A"}</td>
                  <td class="cancelled">${call.startTime || "N/A"}</td>
                  <td class="cancelled">${call.endTime || "N/A"}</td>
                </tr>
              `
                )
                .join("") || "<tr><td colspan='4'>No cancelled calls.</td></tr>"}
            </tbody>
          </table>
          <p>You will receive a rescheduling email shortly if applicable.</p>
          <p>Please check the ${data.isTeacher ? "teacher" : "student"} portal for the latest schedule.</p>
          <p><a href="${baseUrl}/${data.isTeacher ? "teacher" : "student"}/batches/${data.batchId || ""}" class="button">View Batch Details</a></p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
          <p>Contact us at <a href="mailto:${supportEmail}">${supportEmail}</a> for any questions.</p>
        </div>
      </div>
      </body>
      </html>
    `;

    case "demoClassScheduled":
      return `
        <!DOCTYPE html>
        <html>
        <head>${styles}</head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
              <h2 class="company-name">${companyName}</h2>
            </div>
            <div class="content">
              <h3>${data.isTeacher ? "Demo Class Scheduled" : "You're Invited to a Demo Class"}</h3>
              <p>Dear ${data.name},</p>
              <p>We are excited to inform you that a demo class <strong>${data.classType}</strong> has been scheduled. Below are the details:</p>
              <table class="schedule-table">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>${data.classType}</td>
                    <td>${data.date}</td>
                    <td>${data.startTime} - ${data.endTime}</td>
                    <td>${data.callDuration}</td>
                  </tr>
                </tbody>
              </table>
              <p>Please join the class 5-10 minutes early to ensure a smooth start. For any questions, contact our support team at <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
              <p><a href="${data.zoomLink}" class="button">Join Class</a></p>
              <p><a href="${data.baseUrl}/${data.isTeacher ? "teacher" : "student"}/schedule" class="button">View Schedule</a></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case "demoClassRescheduled":
      return `
        <!DOCTYPE html>
        <html>
        <head>${styles}</head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
              <h2 class="company-name">${companyName}</h2>
            </div>
            <div class="content">
              <h3>Demo Class Rescheduled</h3>
              <p>Dear ${data.name},</p>
              <p>The demo class <strong>${data.classType}</strong> has been rescheduled. Below are the updated details:</p>
              <table class="schedule-table">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>${data.classType}</td>
                    <td>${data.date}</td>
                    <td>${data.startTime} - ${data.endTime}</td>
                    <td>${data.callDuration}</td>
                  </tr>
                </tbody>
              </table>
              <p>Previous schedule (cancelled):</p>
              <table class="schedule-table">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="cancelled">${data.classType}</td>
                    <td class="cancelled">${data.previousDate}</td>
                    <td class="cancelled">${data.previousStartTime} - ${data.previousEndTime}</td>
                    <td class="cancelled">${data.callDuration}</td>
                  </tr>
                </tbody>
              </table>
              <p>Please join the class 5-10 minutes early. If you have any questions, contact our support team at <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
              <p><a href="${data.zoomLink}" class="button">Join Class</a></p>
              <p><a href="${data.baseUrl}/${data.isTeacher ? "teacher" : "student"}/schedule" class="button">View Updated Schedule</a></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

    case "demoClassCancelled":
      return `
        <!DOCTYPE html>
        <html>
        <head>${styles}</head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="${companyName} Logo" class="logo">
              <h2 class="company-name">${companyName}</h2>
            </div>
            <div class="content">
              <h3>Demo Class Cancelled</h3>
              <p>Dear ${data.name},</p>
              <p>We regret to inform you that the demo class <strong>${data.classType}</strong> has been cancelled. Below are the details of the cancelled class:</p>
              <table class="schedule-table">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="cancelled">${data.classType}</td>
                    <td class="cancelled">${data.date}</td>
                    <td class="cancelled">${data.startTime}</td>
                    <td class="cancelled">${data.callDuration}</td>
                  </tr>
                </tbody>
              </table>
              <p>We apologize for any inconvenience. Please contact our support team at <a href="mailto:${supportEmail}">${supportEmail}</a> to reschedule or for further assistance.</p>
              <p><a href="${data.baseUrl}/student/schedule" class="button">View Schedule</a></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

   
      default:
      return "";
  }
};

module.exports = { getEmailTemplate };
