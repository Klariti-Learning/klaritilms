
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Users,
  Calendar,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { ApiError } from "@/types";
import {
  BsFileEarmarkPdf,
  BsFiletypePptx,
  BsFiletypeMp3,
  BsFiletypeMp4,
} from "react-icons/bs";
import { FaRegFileWord, FaFile, FaBook } from "react-icons/fa";
import { AiOutlineFileJpg } from "react-icons/ai";
import Image from "next/image";
import { useAuth } from "@/lib/auth";

interface Teacher {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  subjects?: string[];
  profileImage?: string;
}

interface Course {
  _id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  targetAudience: string;
  duration: string;
  assignedTeachers: Teacher[];
  createdAt: string;
  lastUpdatedAt?: string;
  chapters?: {
    chapterId: string;
    title: string;
    lessons: {
      _id: string;
      title: string;
      format: string;
      resources: { name: string }[];
      worksheets?: { name: string }[];
      learningGoals: string[];
    }[];
  }[];
}

interface Batch {
  _id: string;
  name: string;
  courseId?: { _id: string; title: string };
  studentIds: { studentId: string; isInThisBatch: boolean; _id: string }[];
  createdAt: string;
  isScheduled?: boolean;
  hasScheduledCalls?: boolean;
  scheduleStatus?: string;
}

export default function CoursePreview() {
  const { user, loading: authLoading, deviceId } = useAuth();
  const router = useRouter();
  const { courseId } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openLessons, setOpenLessons] = useState<{ [key: string]: boolean }>({});

  const handleUnauthorized = useCallback(() => {
    console.debug("[CoursePreview] Handling unauthorized access");
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("deviceId");
    setError("Session expired. Please log in again.");
    toast.error("Session expired. Please log in again.");
    router.push("/login");
  }, [router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role?.roleName !== "Teacher") {
      console.debug(
        "[CoursePreview] Redirecting due to invalid role or no user",
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
    const fetchCourseAndBatches = async () => {
      if (!courseId || !user || user.role?.roleName !== "Teacher") return;
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        if (!token || !deviceId) {
          console.debug("[CoursePreview] Missing token or deviceId", {
            token,
            deviceId,
          });
          handleUnauthorized();
          return;
        }
        const [courseResponse, batchesResponse] = await Promise.all([
          api.get(`/courses/${courseId}`),
          api.get(`/courses/batch/by-course/${courseId}`),
        ]);
        setCourse(courseResponse.data);
        setBatches(batchesResponse.data.batches || []);
      } catch (error) {
        const apiError = error as ApiError;
        console.error("[CoursePreview] Fetch error:", {
          message: apiError.response?.data?.message || apiError.message,
          status: apiError.response?.status,
        });
        if (apiError.response?.status === 401) {
          handleUnauthorized();
        } else {
          const errorMessage =
            apiError.response?.data?.message ||
            "Failed to fetch course or batch details";
          setError(errorMessage);
          toast.error(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    if (user && user.role?.roleName === "Teacher") {
      fetchCourseAndBatches();
    }
  }, [courseId, deviceId, handleUnauthorized, user]);

  const toggleLesson = (chapterIndex: number, lessonIndex: number) => {
    const key = `${chapterIndex}-${lessonIndex}`;
    setOpenLessons((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getLessonIcon = (format: string | null) => {
    switch (format) {
      case "video":
        return <BsFiletypeMp4 className="w-5 h-5 text-blue-500" />;
      case "audio":
        return <BsFiletypeMp3 className="w-5 h-5 text-green-500" />;
      case "pdf":
        return <BsFileEarmarkPdf className="w-5 h-5 text-red-500" />;
      case "word":
        return <FaRegFileWord className="w-5 h-5 text-blue-700" />;
      case "ppt":
        return <BsFiletypePptx className="w-5 h-5 text-orange-500" />;
      case "jpg":
      case "png":
      case "gif":
      case "avif":
      case "webp":
      case "svg":
        return <AiOutlineFileJpg className="w-5 h-5 text-purple-500" />;
      default:
        return <FaBook className="w-5 h-5 text-gray-500" />;
    }
  };

  const getFileIcon = (format: string | null) => {
    switch (format) {
      case "video":
        return <BsFiletypeMp4 className="w-5 h-5 text-blue-600" />;
      case "audio":
        return <BsFiletypeMp3 className="w-5 h-5 text-green-600" />;
      case "pdf":
        return <BsFileEarmarkPdf className="w-5 h-5 text-red-600" />;
      case "word":
        return <FaRegFileWord className="w-5 h-5 text-blue-800" />;
      case "ppt":
        return <BsFiletypePptx className="w-5 h-5 text-orange-600" />;
      case "jpg":
      case "png":
      case "gif":
      case "avif":
      case "webp":
      case "svg":
        return <AiOutlineFileJpg className="w-5 h-5 text-purple-600" />;
      default:
        return <FaFile className="w-5 h-5 text-gray-600" />;
    }
  };

  const truncateTitle = (text: string, maxLength = 20) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
  };

  if (authLoading || loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center ">
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

  if (error) {
    return (
      <div className="min-h-screen p-6 md:p-8 mt-10">
        <div className="max-w-7xl mx-auto w-full text-center">
          <Button
            variant="outline"
            onClick={() => router.push("/teacher/courses")}
            className="mb-6 border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl px-6 py-3 font-medium shadow-sm"
          >
            ← Back to Courses
          </Button>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-red-50 border border-red-200 p-6 rounded-2xl shadow-sm"
          >
            <p className="text-red-700 font-medium">{error}</p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen p-6 md:p-8 mt-10">
        <div className="max-w-7xl mx-auto w-full text-center">
          <Button
            variant="outline"
            onClick={() => router.push("/teacher/courses")}
            className="mb-6 border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl px-6 py-3 font-medium shadow-sm"
          >
            ← Back to Courses
          </Button>
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-lg border border-white/20">
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Course Not Found
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              The course you are looking for does not exist or you do not have
              access to it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto w-full">
        <Button
          variant="outline"
          onClick={() => router.push("/teacher/courses")}
          className="mb-8 border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl px-6 py-3 font-medium shadow-sm transition-all duration-200"
        >
          ← Back to Courses
        </Button>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white px-8 py-4 rounded-3xl shadow-lg mb-8">
            <GraduationCap className="w-6 h-6" />
            <span className="text-xl font-bold">{course.title}</span>
            <Sparkles className="w-5 h-5" />
          </div>

          {/* Course Metadata Badges */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-2 rounded-full text-sm font-medium border-0">
              🎯 {course.targetAudience || "Beginner"}
            </Badge>
            <Badge className="bg-green-100 text-green-700 hover:bg-green-200 px-4 py-2 rounded-full text-sm font-medium border-0">
              ⏱️ {course.duration || "2 Weeks"}
            </Badge>
            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 px-4 py-2 rounded-full text-sm font-medium border-0">
              📚 {course.chapters?.length || 0} Chapters
            </Badge>
            <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 px-4 py-2 rounded-full text-sm font-medium border-0">
              ⭐ Premium
            </Badge>
          </div>
        </motion.div>

        {/* Main Content Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden"
        >
          <div className="p-8 md:p-12">
            {/* Course Title */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-4">
                {course.title}
              </h1>
            </div>

            {/* Table of Contents */}
            {course.chapters && course.chapters.length > 0 && (
              <div className="mb-16">
                <div className="text-center mb-10">
                  <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-4">
                    Table of Contents
                  </h2>
                  <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-blue-800 rounded-full mx-auto"></div>
                </div>

                <div className="space-y-8">
                  {course.chapters.map((chapter, chapterIndex) =>
                    chapter.title?.trim() ? (
                      <motion.div
                        key={chapter.chapterId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.5,
                          delay: chapterIndex * 0.1,
                        }}
                        className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/30"
                      >
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                            {chapterIndex + 1}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-800">
                              {chapter.title}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                              <span className="flex items-center gap-1">
                                📖 {chapter.lessons?.length || 0} Lessons
                              </span>
                              <span className="flex items-center gap-1">
                                ⭐ Premium
                              </span>
                            </div>
                          </div>
                        </div>

                        {chapter.lessons?.length ? (
                          <div className="space-y-4">
                            {chapter.lessons.map((lesson, lessonIndex) => (
                              <motion.div
                                key={lesson._id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{
                                  duration: 0.3,
                                  delay: lessonIndex * 0.05,
                                }}
                                className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-white/40 hover:shadow-md transition-all duration-200"
                              >
                                <div
                                  className="flex items-center justify-between cursor-pointer"
                                  onClick={() =>
                                    toggleLesson(chapterIndex, lessonIndex)
                                  }
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                                      {getLessonIcon(lesson.format)}
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-gray-800">
                                        Lesson {lessonIndex + 1}:{" "}
                                        {lesson.title || "Untitled"}
                                      </h4>
                                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                        <span>
                                          {lesson.format || "No format"}
                                        </span>
                                        <span>🔗 Interactive</span>
                                      </div>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-gray-400 hover:text-gray-600 rounded-full"
                                  >
                                    {openLessons[
                                      `${chapterIndex}-${lessonIndex}`
                                    ] ? (
                                      <ChevronUp className="w-5 h-5" />
                                    ) : (
                                      <ChevronDown className="w-5 h-5" />
                                    )}
                                  </Button>
                                </div>

                                <AnimatePresence>
                                  {openLessons[`${chapterIndex}-${lessonIndex}`] && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.3 }}
                                      className="mt-6 pt-6 border-t border-gray-100"
                                    >
                                      {lesson.resources?.length > 0 && (
                                        <div className="mb-6">
                                          <h5 className="font-medium text-gray-700 mb-3">
                                            📎 Resources
                                          </h5>
                                          <div className="grid gap-2">
                                            {lesson.resources.map(
                                              (file, fileIndex) => (
                                                <div
                                                  key={fileIndex}
                                                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                                                >
                                                  {getFileIcon(lesson.format)}
                                                  <span className="text-sm text-gray-600 truncate">
                                                    {file.name}
                                                  </span>
                                                </div>
                                              )
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {lesson.worksheets &&
                                        lesson.worksheets.length > 0 && (
                                          <div className="mb-6">
                                            <h5 className="font-medium text-gray-700 mb-3">
                                              📝 Worksheets
                                            </h5>
                                            <div className="grid gap-2">
                                              {lesson.worksheets.map(
                                                (worksheet, fileIndex) => (
                                                  <div
                                                    key={fileIndex}
                                                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                                                  >
                                                    {getFileIcon(lesson.format)}
                                                    <span className="text-sm text-gray-600 truncate">
                                                      {worksheet.name}
                                                    </span>
                                                  </div>
                                                )
                                              )}
                                            </div>
                                          </div>
                                        )}

                                      {lesson.learningGoals &&
                                        lesson.learningGoals.some((goal) =>
                                          goal?.trim()
                                        ) && (
                                          <div>
                                            <h5 className="font-medium text-gray-700 mb-3">
                                              🎯 Learning Goals
                                            </h5>
                                            <ul className="space-y-2">
                                              {lesson.learningGoals.map(
                                                (goal, goalIndex) =>
                                                  goal?.trim() && (
                                                    <li
                                                      key={goalIndex}
                                                      className="flex items-start gap-2 text-sm text-gray-600"
                                                    >
                                                      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0"></span>
                                                      {goal}
                                                    </li>
                                                  )
                                              )}
                                            </ul>
                                          </div>
                                        )}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-center py-8">
                            No lessons available.
                          </p>
                        )}
                      </motion.div>
                    ) : null
                  )}
                </div>
              </div>
            )}

            {/* Assigned Teachers */}
            {course.assignedTeachers && course.assignedTeachers.length > 0 && (
              <div className="mb-16">
                <div className="text-center mb-10">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2">
                    Assigned Teachers
                  </h3>
                  <div className="w-16 h-1 bg-gradient-to-r from-blue-600 to-blue-800 rounded-full mx-auto"></div>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {course.assignedTeachers.map((teacher, index) => (
                    <motion.div
                      key={teacher._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -5, scale: 1.02 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/30 hover:shadow-xl transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Image
                            src={
                              teacher.profileImage ||
                              "https://via.placeholder.com/48?text=User"
                            }
                            alt={teacher.name}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-full object-cover border-2 border-white/30"
                          />
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-100 rounded-full border-2 border-white"></div>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800">
                            {teacher.name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {teacher.email}
                          </p>
                          {teacher.phone && (
                            <p className="text-sm text-gray-600">
                              {teacher.phone}
                            </p>
                          )}
                          {teacher.subjects && teacher.subjects.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {teacher.subjects.map((subject, subjectIndex) => (
                                <Badge
                                  key={subjectIndex}
                                  className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full border-0"
                                >
                                  {subject}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Assigned Batches */}
            {batches.length > 0 && (
              <div>
                <div className="text-center mb-10">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2">
                    Assigned Batches
                  </h3>
                  <div className="w-16 h-1 bg-gradient-to-r from-blue-600 to-blue-800 rounded-full mx-auto"></div>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {batches.map((batch, index) => (
                    <motion.div
                      key={batch._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -5, scale: 1.02 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(
                          `/teacher/courses/${courseId}/batches/${batch._id}`
                        )
                      }
                    >
                      <Card className="bg-white/60 backdrop-blur-sm border border-white/30 hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden">
                        <CardContent className="p-6">
                          <h4
                            className="font-semibold text-gray-800 mb-4"
                            title={batch.name}
                          >
                            {truncateTitle(batch.name)}
                          </h4>
                          <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Users className="w-4 h-4 text-blue-500" />
                              <span>
                                {batch.studentIds?.filter(
                                  (s) => s.isInThisBatch
                                ).length || 0}{" "}
                                Students
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <FaBook className="w-4 h-4 text-blue-500" />
                              <span className="truncate">
                                {batch.courseId?.title || "N/A"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="w-4 h-4 text-blue-500" />
                              <span>
                                {new Date(batch.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          {(batch.isScheduled || batch.hasScheduledCalls) && (
                            <div className="mt-4">
                              <Badge className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium border-0">
                                {batch.scheduleStatus || "Scheduled"}
                              </Badge>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
