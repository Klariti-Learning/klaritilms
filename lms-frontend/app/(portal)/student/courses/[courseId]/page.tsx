"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Clock,
  Target,
  User,
  Calendar,
  Book,
  Film,
  PenTool,
  Mic,
  Headphones,
  Mail,
  Phone,
  GraduationCap,
  X,
  CheckCircle,
  Video,
  Download,
  XCircle,
  Users,
  Play,
  Award,
  BookOpen,
  Star,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { ApiError } from "@/types";
import Image from "next/image";

interface Teacher {
  _id: string;
  name: string;
  email: string;
  phone: string;
  subjects: string[];
  profileImage?: string;
}

interface Resource {
  name: string;
  url: string;
}

interface Worksheet {
  id: string;
  type: string;
  url: string;
  fileId: string;
  name: string;
  uploadedBy: string;
  uploadedAt: string;
}

interface Lesson {
  _id: string;
  lessonId?: string;
  title: string;
  format: string;
  resources: Resource[];
  learningGoals: string[];
  worksheets?: Worksheet[];
}

interface Chapter {
  title: string;
  lessons: Lesson[];
}

interface Course {
  _id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  targetAudience: string;
  duration: string;
  assignedTeachers: Teacher[];
  createdBy: { name: string };
  createdAt: string;
  lastUpdatedAt?: string;
  chapters?: Chapter[];
}

interface ScheduledCall {
  lessonTitle: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  timezone: string;
  lessonId: string;
  _id: string;
  type?: string;
  zoomLink?: string;
  meetingLink?: string;
}

interface ScheduleResponse {
  calls: ScheduledCall[];
  schedule: {
    scheduleStatus: string;
    scheduleDuration: string;
  };
}

const timelineIcons = [Book, Film, PenTool, Mic, Headphones];

export default function StudentCourseDetails() {
  const { user, loading: authLoading, deviceId } = useAuth();
  const router = useRouter();
  const { courseId } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [scheduledCalls, setScheduledCalls] = useState<ScheduleResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openLessons, setOpenLessons] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [isTeachersModalOpen, setIsTeachersModalOpen] = useState(false);

  const handleUnauthorized = useCallback(() => {
    console.debug("[StudentCourseDetails] Handling unauthorized access");
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("isLoggedIn");
    router.push("/login");
  }, [router]);

  const fetchCourseAndSchedule = useCallback(async () => {
    if (!courseId || !user || !deviceId) return;

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        handleUnauthorized();
        return;
      }

      const batchResponse = await api.get(
        `/courses/batch/by-course/${courseId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Device-Id": deviceId,
          },
        }
      );
      const batchId = batchResponse.data.batches[0]._id;

      const courseResponse = await api.get(`/courses/${courseId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Device-Id": deviceId,
        },
      });
      const teachersResponse = await api.get(
        `/courses/course/${courseId}/assigned-teachers`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Device-Id": deviceId,
          },
        }
      );
      const courseData = courseResponse.data;
      const teachersData = teachersResponse.data;

      for (const chapter of courseData.chapters || []) {
        for (const lesson of chapter.lessons) {
          lesson.worksheets = lesson.worksheets || [];
        }
      }

      const scheduleResponse = await api.get(
        `/schedule/batch/${batchId}/calls`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Device-Id": deviceId,
          },
        }
      );

      const transformedCalls = scheduleResponse.data.batch.calls.map(
        (call: ScheduledCall) => ({
          ...call,
          scheduleId: call._id,
        })
      );

      for (const call of transformedCalls) {
        try {
          const worksheetResponse = await api.get(
            `/courses/${courseId}/lesson/${call.lessonId}/worksheets`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Device-Id": deviceId,
              },
            }
          );
          const fetchedWorksheets = worksheetResponse.data.worksheets || [];

          courseData.chapters = courseData.chapters.map((chapter: Chapter) => ({
            ...chapter,
            lessons: chapter.lessons.map((lesson: Lesson) => {
              if (lesson.lessonId === call.lessonId) {
                return { ...lesson, worksheets: fetchedWorksheets };
              }
              return lesson;
            }),
          }));
        } catch (worksheetError) {
          console.error(
            `Failed to fetch worksheets for lesson ${call.lessonId}:`,
            worksheetError
          );
        }
      }

      setCourse({
        ...courseData,
        courseId: teachersData.courseId,
        courseTitle: teachersData.courseTitle,
        assignedTeachers: Array.isArray(teachersData.assignedTeachers)
          ? teachersData.assignedTeachers
          : [],
      });
      setScheduledCalls({
        calls: transformedCalls,
        schedule: scheduleResponse.data.batch.schedule || {
          scheduleStatus: "Unknown",
          scheduleDuration: "Unknown",
        },
      });
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[StudentCourseDetails] Failed to fetch data:", apiError);
      const errorMessage =
        apiError.response?.data?.message ||
        "Failed to fetch course or schedule details";
      setError(errorMessage);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [courseId, user, deviceId, handleUnauthorized]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role?.roleName !== "Student") {
      console.debug("[StudentCourseDetails] Redirecting to login", {
        user: !!user,
        role: user?.role?.roleName,
        authLoading,
      });
      handleUnauthorized();
      return;
    }
    console.debug("[StudentCourseDetails] Fetching course data", { courseId });
    fetchCourseAndSchedule();
  }, [
    user,
    authLoading,
    courseId,
    router,
    fetchCourseAndSchedule,
    handleUnauthorized,
  ]);

  // ORIGINAL LOGIC: Keep exact same toggle function
  const toggleLesson = (chapterIndex: number, lessonIndex: number) => {
    const lessonKey = `${chapterIndex}-${lessonIndex}`;
    setOpenLessons((prev) => ({
      ...prev,
      [lessonKey]: !prev[lessonKey],
    }));
  };

  // ORIGINAL LOGIC: Keep exact same date formatting
  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // ORIGINAL LOGIC: Keep exact same time formatting
  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(":");
    const date = new Date();
    date.setHours(Number.parseInt(hours), Number.parseInt(minutes));
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // ORIGINAL LOGIC: Keep exact same meeting join logic
  const canJoinMeeting = (call: ScheduledCall): boolean => {
    try {
      const now = new Date();
      const callDateTimeStr = `${call.date}T${call.startTime}:00`;
      const callStartTime = new Date(callDateTimeStr);
      const tenMinutesBefore = new Date(
        callStartTime.getTime() - 10 * 60 * 1000
      );
      return now >= tenMinutesBefore && now <= callStartTime;
    } catch (error) {
      console.error("Error parsing call time:", error);
      return false;
    }
  };

  // ORIGINAL LOGIC: Keep exact same meeting handler
  const handleJoinMeeting = (call: ScheduledCall) => {
    if (!canJoinMeeting(call)) {
      toast.error(
        "Join link is only available 10 minutes before the call starts."
      );
      return;
    }
    const meetingUrl = call.type === "zoom" ? call.zoomLink : call.meetingLink;
    if (meetingUrl) {
      window.open(meetingUrl, "_blank");
    } else {
      toast.error("No meeting link available");
    }
  };

  const handleDownloadWorksheet = async (courseId: string, lesson: Lesson) => {
    const scheduledCall = scheduledCalls?.calls.find(
      (call) => call.lessonId === lesson.lessonId
    );
    if (!scheduledCall) {
      toast.error("No scheduled call found for this lesson");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        handleUnauthorized();
        return;
      }

      const response = await api.get(
        `/courses/${courseId}/lesson/${scheduledCall.lessonId}/worksheets`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Device-Id": deviceId,
          },
        }
      );
      const worksheets = response.data.worksheets || [];

      if (worksheets.length === 0) {
        toast.error("No worksheets available for this lesson");
        return;
      }

      worksheets.forEach((worksheet: Worksheet) => {
        let downloadUrl = worksheet.url;
        if (worksheet.url.includes("drive.google.com")) {
          const fileIdMatch = worksheet.url.match(/\/d\/(.+?)(\/|$)/);
          if (fileIdMatch && fileIdMatch[1]) {
            downloadUrl = `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
          }
        } else {
          downloadUrl = `/api/documents/proxy?url=${encodeURIComponent(
            worksheet.url
          )}`;
        }

        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download =
          worksheet.name ||
          `worksheet-${worksheet.id}.${worksheet.type || "pdf"}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });

      toast.success("Worksheet downloads initiated!");
    } catch (error) {
      const apiError = error as ApiError;
      console.error(
        "[StudentCourseDetails] Error fetching worksheets:",
        apiError
      );
      const errorMessage =
        apiError.response?.data?.message || "Failed to fetch worksheets";
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        toast.error(errorMessage);
      }
    }
  };

  // ORIGINAL LOGIC: Keep exact same status styling
  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled":
        return "bg-blue-500 text-white";
      case "rescheduled":
        return "bg-orange-500 text-white";
      case "cancelled":
        return "bg-red-500 text-white";
      case "completed":
        return "bg-green-500 text-white flex items-center gap-1";
      default:
        return "bg-gray-500 text-white";
    }
  };

  // ORIGINAL LOGIC: Keep exact same scheduling check
  const isScheduled = scheduledCalls?.calls && scheduledCalls.calls.length > 0;
  console.log("isScheduled", isScheduled);

  if (authLoading || loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
          className="h-12 w-12 text-indigo-600"
        >
          <svg viewBox="0 0 24 24">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-indigo-50 to-purple-50">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl shadow-lg max-w-md w-full text-center"
        >
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-700 font-medium mb-4">{error}</p>
          <Button
            onClick={() => {
              setError(null);
              fetchCourseAndSchedule();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Try Again
          </Button>
        </motion.div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-indigo-50 mt-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Course Not Found
          </h2>
          <p className="text-gray-600 max-w-md mx-auto">
            The course you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have access to it.
          </p>
        </motion.div>
      </div>
    );
  }

  if (!user || user.role?.roleName !== "Student") {
    return null;
  }

  return (
    <div className="min-h-screen mt-16 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6">
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 50;
        }
        .modal-content {
          max-height: 80vh;
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .modal-content::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6">
        {/* Compact Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="md:w-80 sticky top-20 self-start"
        >
          <Card className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl overflow-hidden border border-violet-100">
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 py-4 px-4">
              <h2 className="text-xl font-bold text-white text-center flex items-center justify-center gap-2">
                <Users className="w-5 h-5" />
                Course Instructors
              </h2>
            </div>
            <CardContent className="p-4">
              {course.assignedTeachers.length === 0 ? (
                <div className="text-center py-6">
                  <User className="w-8 h-8 text-violet-400 mx-auto mb-3" />
                  <p className="text-gray-600 text-sm">
                    No teachers assigned to this course.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {course.assignedTeachers.slice(0, 1).map((teacher, index) => (
                    <motion.div
                      key={teacher._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="bg-white/60 backdrop-blur-md p-4 rounded-xl shadow-md border border-violet-100 hover:shadow-lg transition-all duration-300"
                    >
                      <div className="flex flex-col items-center">
                        {teacher.profileImage ? (
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="relative w-20 h-20 rounded-full overflow-hidden mb-4 border-3 border-violet-200 shadow-lg"
                          >
                            <Image
                              width={80}
                              height={80}
                              src={teacher.profileImage || "/placeholder.svg"}
                              alt={teacher.name}
                              className="object-cover w-full h-full"
                              priority={true}
                            />
                          </motion.div>
                        ) : (
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg"
                          >
                            <User className="w-10 h-10 text-white" />
                          </motion.div>
                        )}

                        <div className="w-full space-y-3 text-center">
                          <div>
                            <h3 className="text-lg font-bold text-violet-900">
                              {teacher.name}
                            </h3>
                            <div className="flex items-center justify-center gap-1 mt-1">
                              <Star className="w-3 h-3 text-yellow-400 fill-current" />
                              <p className="text-xs text-slate-500">
                                Lead Instructor
                              </p>
                            </div>
                          </div>

                          <div className="w-full h-px bg-gradient-to-r from-transparent via-violet-300 to-transparent" />

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                              <Mail className="w-4 h-4 text-blue-600" />
                              <p className="text-xs text-slate-700 break-all">
                                {teacher.email}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                              <Phone className="w-4 h-4 text-violet-600" />
                              <p className="text-xs text-slate-700">
                                {teacher.phone || "Not provided"}
                              </p>
                            </div>

                            <div className="bg-slate-50 rounded-lg p-2">
                              <div className="flex items-center gap-2 mb-2">
                                <GraduationCap className="w-4 h-4 text-indigo-600" />
                                <span className="text-xs text-slate-600 font-medium">
                                  Subjects
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1 justify-center">
                                {teacher.subjects?.length > 0 ? (
                                  teacher.subjects.map((subject, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-block bg-violet-100 text-violet-800 text-xs font-semibold px-2 py-0.5 rounded-full"
                                    >
                                      {subject}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-slate-500">
                                    No subjects listed
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {course.assignedTeachers.length > 1 && (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="text-center"
                    >
                      <Button
                        onClick={() => setIsTeachersModalOpen(true)}
                        className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-lg px-4 py-2 text-sm shadow-lg"
                      >
                        View All {course.assignedTeachers.length} Instructors
                      </Button>
                    </motion.div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Main content */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="md:w-2/3"
        >
          {/* Compact Course header */}
          <Card className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl overflow-hidden border border-violet-100 mb-6">
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 py-4 px-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {course.title}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Award className="w-4 h-4 text-yellow-300" />
                    <span className="text-white/90 text-sm">
                      Premium Course
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-xs text-slate-500">Duration</p>
                      <p className="font-semibold text-slate-800 text-sm">
                        {isScheduled
                          ? `${scheduledCalls?.schedule.scheduleDuration} (${
                              scheduledCalls?.calls[0]?.timezone || "N/A"
                            })`
                          : course.duration || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-violet-600" />
                    <div>
                      <p className="text-xs text-slate-500">Audience</p>
                      <p className="font-semibold text-slate-800 text-sm">
                        {course.targetAudience}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-600" />
                    <div>
                      <p className="text-xs text-slate-500">Created By</p>
                      <p className="font-semibold text-slate-800 text-sm">
                        {course.createdBy.name}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <div>
                      <p className="text-xs text-slate-500">Created</p>
                      <p className="font-semibold text-slate-800 text-sm">
                        {new Date(course.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Course content with compact timeline */}
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-violet-500 to-indigo-500 rounded-full"></div>

            {course.chapters && course.chapters.length > 0 ? (
              course.chapters.map((chapter, chapterIndex) => {
                const IconComponent =
                  timelineIcons[chapterIndex % timelineIcons.length];
                return (
                  <div key={chapterIndex} className="relative mb-8">
                    <div className="flex items-center gap-4 mb-4">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 360 }}
                        transition={{ duration: 0.5 }}
                        className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg z-10"
                      >
                        <IconComponent className="w-4 h-4 text-white" />
                      </motion.div>
                      <h2 className="text-xl font-bold text-slate-800 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm border border-violet-100">
                        {chapter.title}
                      </h2>
                    </div>

                    <div className="ml-12 w-full">
                      {chapter.lessons.length > 0 ? (
                        <Card className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-violet-100">
                          <CardContent className="p-0">
                            <div className="flex justify-between items-center mb-4">
                              <div className="flex items-center gap-2">
                                <Play className="w-4 h-4 text-violet-600" />
                                <h3 className="text-lg font-semibold text-violet-800">
                                  Lessons
                                </h3>
                              </div>
                              <span className="text-sm font-medium text-gray-500 bg-violet-50 px-3 py-1 rounded-full">
                                <b>Total: {chapter.lessons.length}</b>
                              </span>
                            </div>

                            <ul className="space-y-4">
                              {chapter.lessons.map((lesson, lessonIndex) => {
                                const scheduledCall =
                                  scheduledCalls?.calls.find(
                                    (call) => call.lessonId === lesson.lessonId
                                  );
                                console.log(
                                  `Chapter: ${chapter.title}, Lesson: ${lesson.title}, LessonId: ${lesson.lessonId}, ScheduledCall Date:`,
                                  scheduledCall?.date || "No call found"
                                );
                                const isCompleted =
                                  scheduledCall?.status.toLowerCase() ===
                                  "completed";
                                const isCancelled =
                                  scheduledCall?.status.toLowerCase() ===
                                  "cancelled";
                                const canJoin = scheduledCall
                                  ? canJoinMeeting(scheduledCall)
                                  : false;

                                return (
                                  <motion.li
                                    key={lessonIndex}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: lessonIndex * 0.1 }}
                                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300"
                                  >
                                    {isScheduled && scheduledCall && (
                                      <div className="flex justify-end mb-2">
                                        <span
                                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(
                                            scheduledCall.status
                                          )}`}
                                        >
                                          {isCompleted && (
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                          )}
                                          {scheduledCall.status}
                                        </span>
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-3">
                                        <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                                        <span className="text-lg font-semibold text-gray-800">
                                          {lesson.title}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-3">
                                        {isScheduled && scheduledCall && (
                                          <div className="inline-flex items-center bg-gradient-to-r from-blue-100 to-indigo-100 px-3 py-1 rounded-full text-sm text-blue-700 shadow-sm">
                                            <Calendar className="w-3 h-3 mr-2 text-blue-600" />
                                            <span className="font-semibold text-xs">
                                              {formatDate(scheduledCall.date)}
                                            </span>
                                          </div>
                                        )}

                                        {isScheduled &&
                                          scheduledCall &&
                                          !isCompleted &&
                                          !isCancelled && (
                                            <>
                                              <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-1 rounded-full shadow-sm">
                                                {formatTime(
                                                  scheduledCall.startTime
                                                )}{" "}
                                                –{" "}
                                                {formatTime(
                                                  scheduledCall.endTime
                                                )}
                                              </span>
                                              <Button
                                                onClick={() =>
                                                  handleJoinMeeting(
                                                    scheduledCall
                                                  )
                                                }
                                                disabled={!canJoin}
                                                className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs text-white ${
                                                  canJoin
                                                    ? "bg-indigo-500 hover:bg-indigo-600"
                                                    : "bg-gray-400 cursor-not-allowed"
                                                }`}
                                                title={
                                                  !canJoin
                                                    ? "Join link is only available 10 minutes before the call starts"
                                                    : "Join the meeting"
                                                }
                                              >
                                                <Video className="w-3 h-3" />
                                                Join
                                              </Button>
                                            </>
                                          )}

                                        {lesson.learningGoals &&
                                          lesson.learningGoals.length > 0 && (
                                            <motion.div
                                              animate={{
                                                rotate: openLessons[
                                                  `${chapterIndex}-${lessonIndex}`
                                                ]
                                                  ? 180
                                                  : 0,
                                              }}
                                              transition={{ duration: 0.3 }}
                                              onClick={() =>
                                                toggleLesson(
                                                  chapterIndex,
                                                  lessonIndex
                                                )
                                              }
                                              className="cursor-pointer flex items-center justify-center w-6 h-6"
                                            >
                                              <ChevronDown className="w-4 h-4 text-indigo-600" />
                                            </motion.div>
                                          )}
                                      </div>
                                    </div>

                                    <div className="flex justify-between items-center">
                                      <div className="flex gap-3 items-center">
                                        {(!isScheduled ||
                                          (isScheduled &&
                                            scheduledCall &&
                                            lesson.worksheets &&
                                            lesson.worksheets.length > 0)) && (
                                          <motion.a
                                            href="#"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              handleDownloadWorksheet(
                                                courseId as string,
                                                lesson
                                              );
                                            }}
                                            className="flex items-center gap-1 text-sm text-gray-500 hover:text-orange-600 hover:underline transition-all duration-300"
                                            whileHover={{ x: -2 }}
                                          >
                                            <Download className="w-3 h-3" />
                                            Download Worksheets
                                          </motion.a>
                                        )}
                                      </div>
                                    </div>

                                    <AnimatePresence>
                                      {openLessons[
                                        `${chapterIndex}-${lessonIndex}`
                                      ] &&
                                        lesson.learningGoals &&
                                        lesson.learningGoals.length > 0 && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{
                                              height: "auto",
                                              opacity: 1,
                                            }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{
                                              duration: 0.4,
                                              ease: "easeInOut",
                                            }}
                                            className="mt-3 ml-4"
                                          >
                                            <p className="text-sm font-semibold text-indigo-700 mb-2">
                                              Learning Goals:
                                            </p>
                                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                              {lesson.learningGoals.map(
                                                (goal, goalIndex) => (
                                                  <li
                                                    key={goalIndex}
                                                    className="pl-1"
                                                  >
                                                    {goal}
                                                  </li>
                                                )
                                              )}
                                            </ul>
                                          </motion.div>
                                        )}
                                    </AnimatePresence>
                                  </motion.li>
                                );
                              })}
                            </ul>
                          </CardContent>
                        </Card>
                      ) : (
                        <p className="text-gray-600 text-sm bg-white/80 p-4 rounded-xl">
                          No lessons available.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-600 text-sm bg-white/80 p-6 rounded-xl ml-12">
                No chapters available.
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Compact Teachers modal */}
      <AnimatePresence>
        {isTeachersModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="modal-overlay"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="modal-content bg-white rounded-2xl p-6 max-w-4xl w-full shadow-xl max-h-[80vh] relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">
                  All Assigned Teachers
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsTeachersModalOpen(false)}
                  className="bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-700 rounded-full p-2"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="relative z-10 max-h-[calc(80vh-80px)] overflow-y-auto no-scrollbar">
                {course.assignedTeachers.length === 0 ? (
                  <div className="text-center py-8">
                    <User className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
                    <p className="text-gray-600 text-sm">
                      No teachers assigned to this course.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {course.assignedTeachers.map((teacher, index) => (
                      <motion.div
                        key={teacher._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        className="bg-slate-50 p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-violet-100"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          {teacher.profileImage ? (
                            <div className="relative w-16 h-16 rounded-full overflow-hidden border-3 border-violet-200">
                              <Image
                                width={64}
                                height={64}
                                src={teacher.profileImage || "/placeholder.svg"}
                                alt={teacher.name}
                                className="object-cover w-full h-full"
                                priority={true}
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                              <User className="w-8 h-8 text-white" />
                            </div>
                          )}
                          <div>
                            <h3 className="text-lg font-bold text-violet-900">
                              {teacher.name}
                            </h3>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-400 fill-current" />
                              <span className="text-xs text-slate-500">
                                Instructor
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-blue-600" />
                            <p className="text-sm text-slate-700 break-all">
                              {teacher.email}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-violet-600" />
                            <p className="text-sm text-slate-700">
                              {teacher.phone || "N/A"}
                            </p>
                          </div>
                          <div className="flex items-start gap-2">
                            <GraduationCap className="w-4 h-4 text-indigo-600 mt-0.5" />
                            <div className="flex flex-wrap gap-1">
                              {teacher.subjects?.length > 0 ? (
                                teacher.subjects.map((subject, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-block bg-indigo-100 text-indigo-800 text-xs font-semibold px-2 py-0.5 rounded-full"
                                  >
                                    {subject}
                                  </span>
                                ))
                              ) : (
                                <span className="text-sm text-slate-700">
                                  N/A
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
