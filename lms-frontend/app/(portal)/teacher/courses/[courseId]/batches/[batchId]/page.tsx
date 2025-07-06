"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Target,
  X,
  User,
  ChevronLeft,
  Calendar,
  Globe,
  Clock4,
  Users,
  GraduationCap,
  Sparkles,
  BookOpen,
  MapPin,
  CheckCircle,
  AlertCircle,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import toast from "react-hot-toast";
import type { ApiError } from "@/types";
import { FaBook, FaFileAlt, FaFilePdf, FaFileVideo } from "react-icons/fa";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpRightFromSquare } from "@fortawesome/free-solid-svg-icons";

interface Lesson {
  lessonId: string;
  title: string;
  learningGoals: string[];
  format?: string;
  resources?: { name: string }[];
  worksheets?: { name: string }[];
}

interface Chapter {
  title: string;
  lessons: Lesson[];
}

interface Course {
  courseId: string;
  title: string;
  chapters: Chapter[];
  targetAudience: string;
  duration: string;
  createdAt: string;
}

interface Student {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  profileImage?: string;
  subjects?: string[];
}

interface ScheduledCall {
  lessonId: string;
  lessonTitle: string;
  chapterTitle: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  days: string[];
  repeat: boolean;
  status: string;
  timezone: string;
  previousDate?: string | null;
  previousStartTime?: string | null;
  previousEndTime?: string | null;
  callDuration?: string | null;
  updatedAt: string;
}

interface ScheduleResponse {
  calls: ScheduledCall[];
  schedule: {
    scheduleStatus: string;
    scheduleDuration: string;
  };
}

interface Batch {
  _id: string;
  name: string;
  courseId?: string;
  courseTitle?: string;
  studentIds: Student[];
  createdAt: string;
}

export default function BatchDetails() {
  const { user, loading: authLoading, deviceId } = useAuth();
  const router = useRouter();
  const params = useParams();
  const batchId = params.batchId as string;
  const [batch, setBatch] = useState<Batch | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [scheduledCalls, setScheduledCalls] = useState<ScheduleResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewModal, setPreviewModal] = useState<Course | null>(null);
  const [openLessons, setOpenLessons] = useState<{ [key: string]: boolean }>(
    {}
  );
  const modalRef = useRef<HTMLDivElement>(null);

  const handleUnauthorized = useCallback(() => {
    console.debug("[BatchDetails] Handling unauthorized access");
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("deviceId");
    setError("Session expired. Please log in again.");
    router.push("/login");
  }, [router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role?.roleName !== "Teacher") {
      console.debug(
        "[BatchDetails] Redirecting due to invalid role or no user",
        {
          user: !!user,
          role: user?.role?.roleName,
          authLoading,
        }
      );
      handleUnauthorized();
      return;
    }
  }, [user, authLoading, handleUnauthorized, router]);

  useEffect(() => {
    const fetchBatchAndCourse = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        if (!token || !deviceId) {
          console.debug("[BatchDetails] Missing token or deviceId", {
            token,
            deviceId,
          });
          handleUnauthorized();
          return;
        }

        // Fetch batch data
        const batchResponse = await api.get("/courses/batches/teacher");
        const fetchedBatch = batchResponse.data?.batches?.find(
          (b: Batch) => b._id === batchId
        );
        if (!fetchedBatch) {
          throw new Error("Batch not found");
        }
        setBatch(fetchedBatch);

        let fetchedCourse = null;
        let validLessonIds: string[] = [];

        // Fetch course data if courseId exists
        if (fetchedBatch.courseId) {
          try {
            const courseResponse = await api.get(
              `/courses/${fetchedBatch.courseId}`
            );
            fetchedCourse = courseResponse.data;
            if (!fetchedCourse) {
              throw new Error("Course not found");
            }
            console.log("[BatchDetails] Fetched Course:", {
              courseId: fetchedBatch.courseId,
              chapters: fetchedCourse.chapters,
            });
            setCourse(fetchedCourse);

            // Extract valid lesson IDs
            validLessonIds =
              fetchedCourse.chapters
                ?.flatMap((chapter: Chapter) =>
                  chapter.lessons.map((lesson: Lesson) => lesson.lessonId)
                )
                .filter(Boolean) || [];
            console.log("[BatchDetails] Valid Lesson IDs:", validLessonIds);
          } catch (courseError) {
            console.warn(
              "[BatchDetails] Failed to fetch course data, proceeding with schedule:",
              courseError
            );
          }
        } else {
          throw new Error("No course associated with this batch");
        }

        // Fetch schedule data
        const scheduleResponse = await api.get(
          `/schedule/batch/${batchId}/calls?_=${Date.now()}`
        );
        console.log(
          "[BatchDetails] Schedule Response:",
          scheduleResponse.data?.batch
        );
        const scheduleData = scheduleResponse.data?.batch || {
          calls: [],
          schedule: {
            scheduleStatus: "N/A",
            scheduleDuration: "N/A",
          },
        };

        // Filter calls, but keep all calls if validLessonIds is empty
        const filteredCalls = Array.isArray(scheduleData.calls)
          ? validLessonIds.length > 0
            ? scheduleData.calls.filter((call: ScheduledCall) =>
                call.lessonId ? validLessonIds.includes(call.lessonId) : false
              )
            : scheduleData.calls
          : [];

        // Deduplicate calls by lessonId, keeping the latest based on updatedAt
        const latestCallsMap = new Map<string, ScheduledCall>();
        filteredCalls.forEach((call: ScheduledCall) => {
          if (call.lessonId) {
            const existingCall = latestCallsMap.get(call.lessonId);
            if (
              !existingCall ||
              new Date(call.updatedAt) > new Date(existingCall.updatedAt)
            ) {
              latestCallsMap.set(call.lessonId, call);
            }
          }
        });

        setScheduledCalls({
          calls: Array.from(latestCallsMap.values()),
          schedule: {
            scheduleStatus: scheduleData.schedule?.scheduleStatus || "N/A",
            scheduleDuration: scheduleData.schedule?.scheduleDuration || "N/A",
          },
        });
      } catch (error) {
        const apiError = error as ApiError;
        const errorMessage =
          apiError.response?.data?.message ||
          "Failed to fetch batch, course, or schedule details";
        console.error("[BatchDetails] Fetch error:", {
          message: errorMessage,
          status: apiError.response?.status,
        });
        if (apiError.response?.status === 401) {
          handleUnauthorized();
        } else {
          setError(errorMessage);
          toast.error(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    if (user && user.role?.roleName === "Teacher" && batchId) {
      fetchBatchAndCourse();
    }
  }, [user, batchId, deviceId, handleUnauthorized]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setPreviewModal(null);
        setOpenLessons({});
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleLesson = (chapterIndex: number, lessonIndex: number) => {
    const key = `${chapterIndex}-${lessonIndex}`;
    setOpenLessons((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getLessonIcon = () => (
    <FaBook className="w-5 h-5 text-purple-500 transition-transform duration-300 group-hover:rotate-12" />
  );

  const getFileIcon = (format?: string) => {
    switch (format?.toLowerCase()) {
      case "pdf":
        return <FaFilePdf className="w-4 h-4 text-red-500" />;
      case "video":
        return <FaFileVideo className="w-4 h-4 text-blue-500" />;
      default:
        return <FaFileAlt className="w-4 h-4 text-gray-500" />;
    }
  };

  const truncateText = (text: string, maxLength = 20) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Scheduled":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "Rescheduled":
        return <RotateCcw className="w-4 h-4 text-yellow-600" />;
      case "Cancelled":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Scheduled":
        return "bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200 shadow-sm";
      case "Rescheduled":
        return "bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-700 border border-yellow-200 shadow-sm";
      case "Cancelled":
        return "bg-gradient-to-r from-red-50 to-red-50 text-red-700 border border-red-200 shadow-sm";
      default:
        return "bg-gradient-to-r from-gray-50 to-slate-50 text-gray-700 border border-gray-200 shadow-sm";
    }
  };

  const isScheduled =
    scheduledCalls?.calls &&
    Array.isArray(scheduledCalls.calls) &&
    scheduledCalls.calls.length > 0;

  const weekdays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const activeDaysText = scheduledCalls?.calls?.[0]?.days
    ? weekdays.every((day) => scheduledCalls.calls[0].days.includes(day))
      ? "Everyday"
      : scheduledCalls.calls[0].days.join(", ")
    : "N/A";

  if (authLoading || loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
          className="h-16 w-16"
        >
          <div className="h-16 w-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
        </motion.div>
      </div>
    );
  }

  if (!batch || error) {
    return (
      <div className="min-h-screen flex items-center justify-center ">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20"
        >
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <X className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            {error || "Batch Not Found"}
          </h2>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            {error
              ? "An error occurred while fetching the batch details."
              : "The requested batch could not be found."}
          </p>
          <Button
            onClick={() => router.push("/teacher/courses?tab=batch")}
            className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white rounded-xl px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
          >
            Back to Batches
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10 mt-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() =>
                  router.push(`/teacher/courses/${params.courseId}/preview`)
                }
                className="text-blue-600 hover:bg-blue-100/50 rounded-full p-3 transition-all duration-200 cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  {batch.name}
                </h1>
                <p className="text-gray-600 mt-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {batch.studentIds.length} Students Enrolled
                </p>
              </div>
            </div>
            {isScheduled && (
              <Badge className="bg-gradient-to-r from-green-400 to-green-600 text-white px-6 py-3 rounded-full text-sm font-semibold shadow-lg">
                <Calendar className="w-4 h-4 mr-2" />
                {scheduledCalls?.schedule?.scheduleStatus}
              </Badge>
            )}
          </div>
        </motion.div>

        {/* Students Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="mb-12"
        >
          <Card className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-3xl shadow-xl overflow-hidden">
            <CardContent className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Students
                    </h2>
                    <p className="text-gray-600">Manage your batch students</p>
                  </div>
                </div>
                {course && (
                  <Button
                    onClick={() => setPreviewModal(course)}
                    className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white rounded-xl px-6 py-3 flex items-center gap-2 shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    Preview Course
                  </Button>
                )}
              </div>

              {batch.studentIds.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="text-center py-16"
                >
                  <div className="w-32 h-32 mx-auto mb-6 bg-purple-100 rounded-full flex items-center justify-center">
                    <Users className="w-16 h-16 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    No Students Yet
                  </h3>
                  <p className="text-gray-600">
                    Students will appear here once they enroll in this batch.
                  </p>
                </motion.div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  <AnimatePresence>
                    {batch.studentIds.map((student, index) => (
                      <motion.div
                        key={student._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{
                          duration: 0.4,
                          delay: index * 0.1,
                          ease: "easeOut",
                        }}
                        className="group"
                      >
                        <Card className="overflow-hidden bg-white/90 backdrop-blur-sm border border-white/40 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 h-full">
                          <CardContent className="p-6 text-center">
                            <div className="relative mb-4">
                              {student.profileImage ? (
                                <Image
                                  src={
                                    student.profileImage || "/placeholder.svg"
                                  }
                                  alt={student.name}
                                  width={80}
                                  height={80}
                                  className="w-20 h-20 rounded-full object-cover mx-auto border-4 border-blue-200 group-hover:border-blue-300 transition-colors duration-300"
                                />
                              ) : (
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-blue-100 flex items-center justify-center mx-auto border-4 border-blue-200 group-hover:border-blue-300 transition-colors duration-300">
                                  <User className="w-10 h-10 text-blue-500" />
                                </div>
                              )}
                            </div>
                            <h3
                              className="text-lg font-semibold text-gray-900 mb-2"
                              title={student.name}
                            >
                              {truncateText(student.name, 15)}
                            </h3>
                            <div className="space-y-2 text-sm text-gray-600">
                              <p className="truncate">{student.email}</p>
                              {student.phone && (
                                <p className="truncate">{student.phone}</p>
                              )}
                              {student.subjects &&
                                student.subjects.length > 0 && (
                                  <div className="flex flex-wrap gap-1 justify-center mt-3">
                                    {student.subjects
                                      .slice(0, 2)
                                      .map((subject, idx) => (
                                        <Badge
                                          key={idx}
                                          className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full border-0"
                                        >
                                          {subject}
                                        </Badge>
                                      ))}
                                    {student.subjects.length > 2 && (
                                      <Badge className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full border-0">
                                        +{student.subjects.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Enhanced Schedule Section */}
        {isScheduled && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-3xl shadow-xl overflow-hidden">
              <CardContent className="p-8">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        Schedule Details
                      </h2>
                      <p className="text-gray-600">
                        View and manage class schedules
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push(`/teacher/batches/${batchId}`)}
                    className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white rounded-xl px-6 py-3 flex items-center gap-2 shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer"
                  >
                    <FontAwesomeIcon
                      icon={faUpRightFromSquare}
                      className="w-4 h-4"
                    />
                    Open Full Schedule
                  </Button>
                </div>

                {/* Enhanced Schedule Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Clock4 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-blue-600 font-medium">
                          Call Duration
                        </p>
                        <p className="text-xl font-bold text-blue-800">
                          {scheduledCalls?.calls[0]?.callDuration || "N/A"}
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Globe className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-blue-600 font-medium">
                          Timezone
                        </p>
                        <p className="text-xl font-bold text-blue-800">
                          {scheduledCalls?.calls[0]?.timezone || "N/A"}
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Clock className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-blue-600 font-medium">
                          Total Duration
                        </p>
                        <p className="text-xl font-bold text-blue-800">
                          {scheduledCalls?.schedule.scheduleDuration || "N/A"}
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-blue-600 font-medium">
                          Active Days
                        </p>
                        <p className="text-xl font-bold text-blue-800">
                          {activeDaysText}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Enhanced Schedule Table */}
                <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
                          <th className="px-8 py-6 text-left font-bold text-sm uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4" />
                              Lesson
                            </div>
                          </th>
                          <th className="px-8 py-6 text-left font-bold text-sm uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              Date
                            </div>
                          </th>
                          <th className="px-8 py-6 text-left font-bold text-sm uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Time
                            </div>
                          </th>
                          <th className="px-8 py-6 text-left font-bold text-sm uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              Status
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {scheduledCalls &&
                          (() => {
                            const chapterGroups =
                              course?.chapters
                                ?.map((chapter) => ({
                                  chapter,
                                  calls: scheduledCalls.calls.filter(
                                    (call) =>
                                      call.chapterTitle === chapter.title
                                  ),
                                }))
                                .filter((group) => group.calls.length > 0) ||
                              [];

                            return chapterGroups.map((group, groupIndex) => [
                              <tr
                                key={`chapter-${group.chapter.title}-${groupIndex}`}
                                className="bg-gradient-to-r from-blue-50 to-blue-100"
                              >
                                <td
                                  colSpan={4}
                                  className="px-8 py-4 font-bold text-lg text-blue-700 border-l-4 border-blue-500"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                      <span className="text-blue-600 font-bold text-sm">
                                        {groupIndex + 1}
                                      </span>
                                    </div>
                                    {group.chapter.title}
                                  </div>
                                </td>
                              </tr>,
                              ...group.calls.map((call, callIndex) => {
                                const isCancelled = call.status === "Cancelled";
                                const isRescheduled =
                                  call.status === "Rescheduled";
                                return (
                                  <motion.tr
                                    key={`call-${call.lessonId}-${callIndex}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                      duration: 0.3,
                                      delay: callIndex * 0.1,
                                    }}
                                    className={`
                                      transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-blue-100/50 hover:shadow-sm
                                      ${isCancelled ? "opacity-60" : ""}
                                      ${
                                        callIndex % 2 === 0
                                          ? "bg-gray-50/30"
                                          : "bg-white"
                                      }
                                    `}
                                  >
                                    <td className="px-8 py-6">
                                      <div className="flex items-center gap-4">
                                        <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex-shrink-0"></div>
                                        <div>
                                          <p
                                            className={`font-medium ${
                                              isCancelled
                                                ? "line-through text-gray-500"
                                                : "text-gray-900"
                                            }`}
                                          >
                                            {call.lessonTitle ===
                                            "Unknown Lesson"
                                              ? `Lesson ${callIndex + 1}`
                                              : truncateText(
                                                  call.lessonTitle,
                                                  30
                                                )}
                                          </p>
                                          <p className="text-sm text-gray-500 mt-1">
                                            Duration: {call.callDuration}
                                          </p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-8 py-6">
                                      <div className="space-y-1">
                                        {isRescheduled && call.previousDate && (
                                          <div className="text-sm text-gray-400 line-through italic">
                                            {formatDate(call.previousDate)}
                                          </div>
                                        )}
                                        <div
                                          className={`font-medium ${
                                            isCancelled
                                              ? "line-through text-gray-500"
                                              : "text-gray-900"
                                          }`}
                                        >
                                          {formatDate(call.date)}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-8 py-6">
                                      <div className="space-y-1">
                                        {isRescheduled &&
                                          call.previousStartTime &&
                                          call.previousEndTime && (
                                            <div className="text-sm text-gray-400 line-through italic">
                                              {formatTime(
                                                call.previousStartTime
                                              )}{" "}
                                              -{" "}
                                              {formatTime(call.previousEndTime)}
                                            </div>
                                          )}
                                        <div
                                          className={`font-medium ${
                                            isCancelled
                                              ? "line-through text-gray-500"
                                              : "text-gray-900"
                                          }`}
                                        >
                                          {formatTime(call.startTime)} -{" "}
                                          {formatTime(call.endTime)}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-8 py-6">
                                      <div className="flex items-center gap-2">
                                        {getStatusIcon(call.status)}
                                        <Badge
                                          className={`${getStatusBadgeClass(
                                            call.status
                                          )} px-3 py-1.5 rounded-full text-xs font-semibold`}
                                        >
                                          {call.status}
                                        </Badge>
                                      </div>
                                    </td>
                                  </motion.tr>
                                );
                              }),
                            ]);
                          })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Course Preview Modal */}

        <AnimatePresence>
          {previewModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-16"
            >
              <motion.div
                ref={modalRef}
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ duration: 0.3, type: "spring", damping: 20 }}
                className="bg-white/95 backdrop-blur-lg rounded-3xl p-8 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto relative"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <style jsx>{`
                  div::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 to-blue-100/20 rounded-3xl"></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center">
                        <GraduationCap className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          Course Preview
                        </h2>
                        <p className="text-gray-600">
                          Detailed course content overview
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setPreviewModal(null);
                        setOpenLessons({});
                      }}
                      className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-2 transition-colors duration-200 cursor-pointer"
                    >
                      <X className="w-6 h-6" />
                    </Button>
                  </div>

                  <div className="space-y-8">
                    {/* Course Title */}
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4 }}
                      className="text-center"
                    >
                      <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white px-8 py-4 rounded-3xl shadow-lg mb-4">
                        <Sparkles className="w-5 h-5" />
                        <span className="text-xl font-bold">
                          {previewModal.title}
                        </span>
                        <Sparkles className="w-5 h-5" />
                      </div>
                      {(previewModal.targetAudience ||
                        previewModal.duration) && (
                        <div className="flex justify-center gap-4 mt-4">
                          {previewModal.targetAudience && (
                            <Badge className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full border-0">
                              <Target className="w-3 h-3 mr-2" />
                              {previewModal.targetAudience}
                            </Badge>
                          )}
                          {previewModal.duration && (
                            <Badge className="bg-green-100 text-green-700 px-4 py-2 rounded-full border-0">
                              <Clock className="w-3 h-3 mr-2" />
                              {previewModal.duration}
                            </Badge>
                          )}
                        </div>
                      )}
                    </motion.div>

                    {/* Table of Contents */}
                    {previewModal.chapters &&
                    previewModal.chapters.length > 0 ? (
                      <div>
                        <div className="text-center mb-8">
                          <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2">
                            Table of Contents
                          </h3>
                          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-blue-800 rounded-full mx-auto"></div>
                        </div>
                        <div className="space-y-6">
                          {previewModal.chapters.map((chapter, chapterIndex) =>
                            chapter.title?.trim() ? (
                              <div
                                key={`${chapter.title}-${chapterIndex}`}
                                className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/40"
                              >
                                <div className="flex items-center gap-4 mb-4">
                                  <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl flex items-center justify-center text-white font-bold">
                                    {chapterIndex + 1}
                                  </div>
                                  <h4 className="text-xl font-semibold text-gray-900">
                                    {chapter.title}
                                  </h4>
                                </div>
                                {chapter.lessons.length > 0 && (
                                  <div className="space-y-3">
                                    {chapter.lessons.map(
                                      (lesson, lessonIndex) => (
                                        <motion.div
                                          key={lesson.lessonId}
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{
                                            duration: 0.3,
                                            delay: lessonIndex * 0.05,
                                          }}
                                          className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/60"
                                        >
                                          <div
                                            className="flex items-center justify-between cursor-pointer"
                                            onClick={() =>
                                              toggleLesson(
                                                chapterIndex,
                                                lessonIndex
                                              )
                                            }
                                          >
                                            <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                {getLessonIcon()}
                                              </div>
                                              <span className="font-medium text-gray-800">
                                                Lesson {lessonIndex + 1}:{" "}
                                                {lesson.title || "Untitled"}
                                              </span>
                                            </div>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="text-gray-400 hover:text-gray-600 cursor-pointer"
                                            >
                                              {openLessons[
                                                `${chapterIndex}-${lessonIndex}`
                                              ] ? (
                                                <ChevronUp className="w-4 h-4" />
                                              ) : (
                                                <ChevronDown className="w-4 h-4" />
                                              )}
                                            </Button>
                                          </div>

                                          <AnimatePresence>
                                            {openLessons[
                                              `${chapterIndex}-${lessonIndex}`
                                            ] && (
                                              <motion.div
                                                initial={{
                                                  height: 0,
                                                  opacity: 0,
                                                }}
                                                animate={{
                                                  height: "auto",
                                                  opacity: 1,
                                                }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="mt-4 pt-4 border-t border-gray-200"
                                              >
                                                {lesson.learningGoals?.length >
                                                  0 && (
                                                  <div className="mb-4">
                                                    <h5 className="font-medium text-gray-700 mb-2">
                                                      🎯 Learning Goals
                                                    </h5>
                                                    <ul className="space-y-1">
                                                      {lesson.learningGoals.map(
                                                        (
                                                          goal: string,
                                                          index: number
                                                        ) =>
                                                          goal?.trim() ? (
                                                            <li
                                                              key={index}
                                                              className="flex items-start gap-2 text-sm text-gray-600"
                                                            >
                                                              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                                                              {goal}
                                                            </li>
                                                          ) : null
                                                      )}
                                                    </ul>
                                                  </div>
                                                )}
                                                {Array.isArray(
                                                  lesson.resources
                                                ) &&
                                                  lesson.resources.length >
                                                    0 && (
                                                    <div className="mb-4">
                                                      <h5 className="font-medium text-gray-700 mb-2">
                                                        📎 Resources
                                                      </h5>
                                                      <div className="grid gap-2">
                                                        {lesson.resources.map(
                                                          (file, fileIndex) => (
                                                            <div
                                                              key={fileIndex}
                                                              className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                                                            >
                                                              {getFileIcon(
                                                                lesson.format
                                                              )}
                                                              <span className="text-sm text-gray-600 truncate">
                                                                {file.name}
                                                              </span>
                                                            </div>
                                                          )
                                                        )}
                                                      </div>
                                                    </div>
                                                  )}
                                                {Array.isArray(
                                                  lesson.worksheets
                                                ) &&
                                                  lesson.worksheets.length >
                                                    0 && (
                                                    <div>
                                                      <h5 className="font-medium text-gray-700 mb-2">
                                                        📝 Worksheets
                                                      </h5>
                                                      <div className="grid gap-2">
                                                        {lesson.worksheets.map(
                                                          (
                                                            worksheet,
                                                            fileIndex
                                                          ) => (
                                                            <div
                                                              key={fileIndex}
                                                              className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                                                            >
                                                              {getFileIcon(
                                                                lesson.format
                                                              )}
                                                              <span className="text-sm text-gray-600 truncate">
                                                                {worksheet.name}
                                                              </span>
                                                            </div>
                                                          )
                                                        )}
                                                      </div>
                                                    </div>
                                                  )}
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </motion.div>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : null
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                          <BookOpen className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-gray-600">
                          No chapters available for this course.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
