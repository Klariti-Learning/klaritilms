const axios = require("axios");
const base64 = require("base-64");
const logger = require("../utils/logger");
const User = require("../models/User");

const ZOOM_API_URL = "https://api.zoom.us/v2";
const ZOOM_OAUTH_URL = "https://zoom.us/oauth/token";
const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;

const getAuthHeaders = () => {
  return {
    Authorization: `Basic ${base64.encode(
      `${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`
    )}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
};

const generateZoomAccessToken = async () => {
  try {
    const response = await axios.post(
      `${ZOOM_OAUTH_URL}?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`,
      null,
      { headers: getAuthHeaders() }
    );
    logger.info("Zoom access token generated");
    return response.data.access_token;
  } catch (error) {
    logger.error(
      "Failed to generate Zoom access token:",
      error.response?.data || error.message
    );
    throw error;
  }
};

const createZoomMeeting = async (topic, startTime, duration, teacherEmail) => {
  try {
    const accessToken = await generateZoomAccessToken();
    const settings = {
      host_video: true,
      participant_video: true,
      join_before_host: true,
      mute_upon_entry: false,
      approval_type: 2,
      auto_recording: "none",
      meeting_authentication: false,
      waiting_room: false,
    };

    if (teacherEmail) {
      try {
        await axios.get(`${ZOOM_API_URL}/users/${teacherEmail}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        settings.alternative_hosts = teacherEmail;
        settings.alternative_hosts_email_notification = false;
        logger.info(`Assigned ${teacherEmail} as alternative host.`);
      } catch (validationError) {
        logger.warn(
          `Skipping alternative host: ${teacherEmail} is not a valid Zoom user or not part of this account.`
        );
      }
    } else {
      logger.warn("No teacher email provided; skipping alternative host.");
    }

    const response = await axios.post(
      `${ZOOM_API_URL}/users/me/meetings`,
      {
        topic,
        type: 2,
        start_time: startTime,
        duration,
        timezone: "Asia/Kolkata",
        settings,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    logger.info(`Zoom meeting created: ${response.data.id}`);
    return {
      zoomLink: response.data.join_url,
      meetingId: response.data.id,
      passcode: response.data.encrypted_password,
    };
  } catch (error) {
    logger.error(
      "Failed to create Zoom meeting:",
      error.response?.data || error.message
    );
    throw error;
  }
};

// const createInbuiltZoomMeeting = async (topic, startTime, duration, teacherId, timezone) => {
//     try {
//         const teacher = await User.findById(teacherId);
//         if (!teacher || !teacher.email) {
//             logger.error(`Teacher not found or missing email for ID: ${teacherId}`);
//             throw new Error('Teacher not found or missing email');
//         }

//         const accessToken = await generateZoomAccessToken();
//         const settings = {
//             host_video: true,
//             participant_video: true,
//             join_before_host: true,
//             mute_upon_entry: false,
//             approval_type: 2,
//             auto_recording: 'none',
//             meeting_authentication: false,
//             waiting_room: false,
//         };

//         try {
//             await axios.get(`${ZOOM_API_URL}/users/${teacher.email}`, {
//                 headers: {
//                     Authorization: `Bearer ${accessToken}`,
//                     'Content-Type': 'application/json',
//                 },
//             });
//             settings.alternative_hosts = teacher.email;
//             settings.alternative_hosts_email_notification = false;
//             logger.info(`Assigned ${teacher.email} as alternative host`);
//         } catch (validationError) {
//             logger.warn(`Skipping alternative host: ${teacher.email} is not a valid Zoom user or not part of this account`);
//         }

//         const response = await axios.post(
//             `${ZOOM_API_URL}/users/me/meetings`,
//             {
//                 topic,
//                 type: 2,
//                 start_time: startTime,
//                 duration,
//                 timezone: timezone || 'Asia/Kolkata',
//                 settings,
//             },
//             {
//                 headers: {
//                     Authorization: `Bearer ${accessToken}`,
//                     'Content-Type': 'application/json',
//                 },
//             }
//         );

//         logger.info(`Zoom meeting created: ${response.data.id}`);
//         return {
//             zoomLink: response.data.join_url,
//             meetingId: response.data.id,
//             passcode: response.data.encrypted_password || '',
//         };
//     } catch (error) {
//         logger.error('Failed to create Zoom meeting:', error.response?.data || error.message);
//         throw new Error('Failed to create Zoom meeting');
//     }
// };

module.exports = { createZoomMeeting };
