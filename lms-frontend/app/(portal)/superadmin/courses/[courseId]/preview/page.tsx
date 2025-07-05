"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Target,
  Users,
  Calendar,
  BookOpen,
  GraduationCap,
  Sparkles,
  Star,
  Award,
  TrendingUp,
  Zap,
  Globe,
  Shield,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import toast from "react-hot-toast";
import type { ApiError } from "@/types";
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
  const { user, loading: authLoading } = useAuth();
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
    toast.error("Session expired. Please log in again.");
    router.push("/login");
  }, [router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role?.roleName !== "Super Admin") {
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
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const deviceId = localStorage.getItem("deviceId");
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
        console.error(
          "[CoursePreview] Failed to fetch course or batches:",
          apiError
        );
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

    if (user && user.role?.roleName === "Super Admin") {
      fetchCourseAndBatches();
    }
  }, [courseId, handleUnauthorized, user]);

  const toggleLesson = (chapterIndex: number, lessonIndex: number) => {
    const key = `${chapterIndex}-${lessonIndex}`;
    setOpenLessons((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getLessonIcon = (format: string | null) => {
    const iconMap = {
      video: { icon: BsFiletypeMp4, color: "text-blue-600", bg: "bg-blue-50" },
      audio: {
        icon: BsFiletypeMp3,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
      },
      pdf: { icon: BsFileEarmarkPdf, color: "text-red-600", bg: "bg-red-50" },
      word: { icon: FaRegFileWord, color: "text-blue-700", bg: "bg-blue-50" },
      ppt: {
        icon: BsFiletypePptx,
        color: "text-orange-600",
        bg: "bg-orange-50",
      },
      jpg: {
        icon: AiOutlineFileJpg,
        color: "text-purple-600",
        bg: "bg-purple-50",
      },
      png: {
        icon: AiOutlineFileJpg,
        color: "text-purple-600",
        bg: "bg-purple-50",
      },
      gif: {
        icon: AiOutlineFileJpg,
        color: "text-purple-600",
        bg: "bg-purple-50",
      },
      avif: {
        icon: AiOutlineFileJpg,
        color: "text-purple-600",
        bg: "bg-purple-50",
      },
      webp: {
        icon: AiOutlineFileJpg,
        color: "text-purple-600",
        bg: "bg-purple-50",
      },
      svg: {
        icon: AiOutlineFileJpg,
        color: "text-purple-600",
        bg: "bg-purple-50",
      },
    };

    const config = iconMap[format as keyof typeof iconMap] || {
      icon: FaBook,
      color: "text-gray-600",
      bg: "bg-gray-50",
    };
    const IconComponent = config.icon;

    return (
      <div
        className={`w-8 h-8 ${config.bg} rounded-lg flex items-center justify-center shadow-sm border border-white/50`}
      >
        <IconComponent className={`w-4 h-4 ${config.color}`} />
      </div>
    );
  };

  const getFileIcon = (format: string | null) => {
    const iconMap = {
      video: { icon: BsFiletypeMp4, color: "text-blue-600" },
      audio: { icon: BsFiletypeMp3, color: "text-emerald-600" },
      pdf: { icon: BsFileEarmarkPdf, color: "text-red-600" },
      word: { icon: FaRegFileWord, color: "text-blue-800" },
      ppt: { icon: BsFiletypePptx, color: "text-orange-600" },
      jpg: { icon: AiOutlineFileJpg, color: "text-purple-600" },
      png: { icon: AiOutlineFileJpg, color: "text-purple-600" },
      gif: { icon: AiOutlineFileJpg, color: "text-purple-600" },
      avif: { icon: AiOutlineFileJpg, color: "text-purple-600" },
      webp: { icon: AiOutlineFileJpg, color: "text-purple-600" },
      svg: { icon: AiOutlineFileJpg, color: "text-purple-600" },
    };

    const config = iconMap[format as keyof typeof iconMap] || {
      icon: FaFile,
      color: "text-gray-600",
    };
    const IconComponent = config.icon;

    return <IconComponent className={`w-4 h-4 ${config.color}`} />;
  };

  const truncateTitle = (text: string, maxLength = 20) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
  };

  if (authLoading || loading) {
    return (
      <div className="fixed inset-0 bg-blue-50 flex items-center justify-center overflow-hidden">
        <motion.div className="relative z-10 flex flex-col items-center space-y-6">
          <div className="relative">
            <motion.div
              className="w-20 h-20 border-3 border-blue-200 rounded-full"
              animate={{ rotate: 360 }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            />
            <motion.div
              className="absolute top-1 left-1 w-18 h-18 border-3 border-blue-300 rounded-full border-t-transparent"
              animate={{ rotate: -360 }}
              transition={{
                duration: 1.5,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            />
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
            >
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-xl">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <h2 className="text-xl font-bold text-blue-600">
              Loading Course
            </h2>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 p-4 md:p-6 mt-10">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <Button
              variant="outline"
              onClick={() => router.push("/superadmin/courses")}
              className="mb-6 border-red-200 text-red-700 hover:bg-red-50 rounded-xl px-6 py-2 font-medium shadow-lg bg-white/80 transition-all duration-300"
            >
              ← Back to Courses
            </Button>
            <div className="bg-white/80 border border-red-100 p-8 rounded-2xl shadow-xl">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Something went wrong
              </h2>
              <p className="text-red-600 text-base">{error}</p>
              <Button
                onClick={() => window.location.reload()}
                className="mt-4 bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium shadow-lg"
              >
                Try Again
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6 mt-10">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <Button
              variant="outline"
              onClick={() => router.push("/superadmin/courses")}
              className="mb-6 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl px-6 py-2 font-medium shadow-lg bg-white/80 transition-all duration-300"
            >
              ← Back to Courses
            </Button>
            <div className="bg-white/80 border border-gray-100 p-8 rounded-2xl shadow-xl">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-gray-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Course Not Found
              </h2>
              <p className="text-gray-600 text-base">
                The course you are looking for does not exist or you do not have
                access to it.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 p-4 md:p-6 mt-10 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden opacity-30">
        <motion.div
          className="absolute -top-20 -right-20 w-40 h-40 bg-purple-200 rounded-full blur-2xl"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 15, repeat: Number.POSITIVE_INFINITY }}
        />
        <motion.div
          className="absolute -bottom-20 -left-20 w-48 h-48 bg-blue-200 rounded-full blur-2xl"
          animate={{ scale: [1.2, 1, 1.2], rotate: [360, 180, 0] }}
          transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY }}
        />
      </div>
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Button
            variant="outline"
            onClick={() => router.push("/superadmin/courses")}
            className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl px-6 py-2 font-medium shadow-lg bg-white/80 transition-all duration-300"
          >
            ← Back to Courses
          </Button>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative bg-white/70 rounded-2xl p-6 md:p-8 shadow-2xl border border-white/50 overflow-hidden"
        >
          <div className="relative z-10 space-y-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-center space-y-6"
            >
              <div className="relative bg-blue-500 text-white px-8 py-4 rounded-2xl shadow-xl inline-block">
                <div className="flex items-center space-x-3">
                  <GraduationCap className="w-6 h-6" />
                  <span className="text-xl md:text-2xl font-bold">
                    {course.title}
                  </span>
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {course.targetAudience && (
                  <Badge className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-sm font-medium border border-blue-200">
                    <Target className="w-4 h-4 mr-1" />
                    {course.targetAudience}
                  </Badge>
                )}
                {course.duration && (
                  <Badge className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-sm font-medium border border-emerald-200">
                    <Clock className="w-4 h-4 mr-1" />
                    {course.duration}
                  </Badge>
                )}
                <Badge className="bg-purple-100 text-purple-700 px-4 py-2 rounded-xl text-sm font-medium border border-purple-200">
                  <BookOpen className="w-4 h-4 mr-1" />
                  {course.chapters?.length || 0} Chapters
                </Badge>
                <Badge className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-xl text-sm font-medium border border-yellow-200">
                  <Award className="w-4 h-4 mr-1" />
                  Premium
                </Badge>
              </div>
            </motion.div>
            {course.chapters && course.chapters.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <div className="text-center mb-8">
                  <h1 className="text-3xl md:text-4xl font-bold mb-3 text-blue-600">
                    Table of Contents
                  </h1>
                  <div className="w-24 h-1 bg-blue-500 rounded-full mx-auto" />
                </div>
                <div className="space-y-6">
                  {course.chapters.map(
                    (chapter, chapterIndex) =>
                      chapter.title?.trim() && (
                        <motion.div
                          key={chapter.chapterId}
                          initial={{ opacity: 0, x: -30 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            duration: 0.6,
                            delay: chapterIndex * 0.05,
                          }}
                          className="bg-white/80 rounded-2xl p-6 shadow-xl border border-white/60 hover:border-indigo-200 transition-all duration-300"
                        >
                          <div className="flex items-center space-x-4 mb-4">
                            <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg">
                              {chapterIndex + 1}
                            </div>
                            <div>
                              <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                                {chapter.title}
                              </h2>
                              <div className="flex items-center space-x-3 text-gray-600 text-sm">
                                <span className="flex items-center">
                                  <BookOpen className="w-3 h-3 mr-1" />
                                  {chapter.lessons?.length || 0} Lessons
                                </span>
                                <span className="flex items-center">
                                  <Star className="w-3 h-3 mr-1" />
                                  Premium
                                </span>
                              </div>
                            </div>
                          </div>
                          {chapter.lessons?.length ? (
                            <div className="space-y-3">
                              {chapter.lessons.map((lesson, lessonIndex) => (
                                <motion.div
                                  key={lessonIndex}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{
                                    duration: 0.4,
                                    delay: lessonIndex * 0.03,
                                  }}
                                >
                                  <div
                                    className="bg-white/60 p-4 rounded-xl shadow-lg border border-white/40 cursor-pointer transition-all duration-300 hover:bg-white/80 hover:border-indigo-200"
                                    onClick={() =>
                                      toggleLesson(chapterIndex, lessonIndex)
                                    }
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        {getLessonIcon(lesson.format)}
                                        <div>
                                          <h3 className="font-semibold text-gray-800 text-base">
                                            Lesson {lessonIndex + 1}:{" "}
                                            {lesson.title || "Untitled"}
                                          </h3>
                                          <div className="flex items-center space-x-2 text-gray-600 text-xs">
                                            <span className="bg-gray-100 px-2 py-1 rounded-md">
                                              {lesson.format || "No format"}
                                            </span>
                                            <span className="flex items-center">
                                              <TrendingUp className="w-3 h-3 mr-1" />
                                              Interactive
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <button className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-gray-700 border border-purple-200">
                                        {openLessons[
                                          `${chapterIndex}-${lessonIndex}`
                                        ] ? (
                                          <ChevronUp className="w-4 h-4" />
                                        ) : (
                                          <ChevronDown className="w-4 h-4" />
                                        )}
                                      </button>
                                    </div>
                                    <AnimatePresence>
                                      {openLessons[
                                        `${chapterIndex}-${lessonIndex}`
                                      ] && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{
                                            height: "auto",
                                            opacity: 1,
                                          }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.3 }}
                                          className="mt-4 space-y-4 overflow-hidden"
                                        >
                                          {lesson.resources?.length > 0 && (
                                            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                                              <h4 className="text-sm font-semibold text-blue-700 mb-3 flex items-center">
                                                <Globe className="w-4 h-4 mr-2" />
                                                Resources
                                              </h4>
                                              <div className="grid gap-2">
                                                {lesson.resources.map(
                                                  (file, fileIndex) => (
                                                    <div
                                                      key={fileIndex}
                                                      className="flex items-center space-x-2 bg-white/70 p-2 rounded-lg border border-blue-100"
                                                    >
                                                      {getFileIcon(
                                                        lesson.format
                                                      )}
                                                      <span className="text-gray-700 text-sm font-medium truncate">
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
                                              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                                                <h4 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center">
                                                  <Shield className="w-4 h-4 mr-2" />
                                                  Worksheets
                                                </h4>
                                                <div className="grid gap-2">
                                                  {lesson.worksheets.map(
                                                    (worksheet, fileIndex) => (
                                                      <div
                                                        key={fileIndex}
                                                        className="flex items-center space-x-2 bg-white/70 p-2 rounded-lg border border-emerald-100"
                                                      >
                                                        {getFileIcon(
                                                          lesson.format
                                                        )}
                                                        <span className="text-gray-700 text-sm font-medium truncate">
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
                                              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                                                <h4 className="text-sm font-semibold text-purple-700 mb-3 flex items-center">
                                                  <Target className="w-4 h-4 mr-2" />
                                                  Learning Goals
                                                </h4>
                                                <div className="space-y-2">
                                                  {lesson.learningGoals.map(
                                                    (goal, goalIndex) =>
                                                      goal?.trim() && (
                                                        <div
                                                          key={goalIndex}
                                                          className="flex items-start space-x-2 bg-white/70 p-2 rounded-lg border border-purple-100"
                                                        >
                                                          <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0" />
                                                          <span className="text-gray-700 text-sm leading-relaxed">
                                                            {goal}
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
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 bg-gray-50 rounded-xl border border-gray-100">
                              <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-500 text-sm">
                                No lessons available for this chapter.
                              </p>
                            </div>
                          )}
                        </motion.div>
                      )
                  )}
                </div>
              </motion.div>
            )}
            {course.assignedTeachers && course.assignedTeachers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-3 text-blue-600">
                    Expert Instructors
                  </h2>
                  <div className="w-20 h-1 bg-blue-500 rounded-full mx-auto" />
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {course.assignedTeachers.map((teacher, index) => (
                    <motion.div
                      key={teacher._id}
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      className="bg-white/80 rounded-2xl p-6 shadow-xl border border-white/60 hover:border-indigo-200 transition-all duration-300"
                    >
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full bg-purple-500 p-0.5 shadow-xl">
                            <Image
                              src={
                                teacher.profileImage ||
                                "https://via.placeholder.com/64?text=User"
                              }
                              alt={teacher.name}
                              width={64}
                              height={64}
                              className="w-full h-full rounded-full object-cover"
                            />
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                            <Heart className="w-2 h-2 text-white" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-lg font-bold text-purple-600">
                            {teacher.name}
                          </h3>
                          <p className="text-gray-600 text-xs">
                            {teacher.email}
                          </p>
                          {teacher.phone && (
                            <p className="text-gray-500 text-xs">
                              {teacher.phone}
                            </p>
                          )}
                        </div>
                        {teacher.subjects && teacher.subjects.length > 0 && (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {teacher.subjects.map((subject, subjectIndex) => (
                              <div
                                key={subjectIndex}
                                className="bg-purple-100 text-purple-700 px-2 py-1 rounded-lg text-xs font-medium border border-purple-200"
                              >
                                {subject}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center space-x-1 text-yellow-500">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-current" />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
            {batches.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-3 text-blue-600">
                    Active Batches
                  </h2>
                  <div className="w-20 h-1 bg-blue-500 rounded-full mx-auto" />
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {batches.map((batch, index) => (
                    <motion.div
                      key={batch._id}
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(
                          `/superadmin/courses/${courseId}/batches/${batch._id}`
                        )
                      }
                    >
                      <Card className="bg-white/80 border border-white/60 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-indigo-200">
                        <CardContent className="p-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <h3
                              className="text-lg font-bold text-blue-600"
                              title={batch.name}
                            >
                              {truncateTitle(batch.name, 25)}
                            </h3>
                            {(batch.isScheduled || batch.hasScheduledCalls) && (
                              <div className="bg-emerald-500 text-white px-3 py-1 rounded-xl text-xs font-bold shadow-lg">
                                {batch.scheduleStatus || "Scheduled"}
                              </div>
                            )}
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Users className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-gray-800 font-bold text-sm">
                                  {batch.studentIds?.filter(
                                    (s) => s.isInThisBatch
                                  ).length || 0}
                                </p>
                                <p className="text-blue-600 text-xs">
                                  Students
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-xl border border-purple-200">
                              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                <BookOpen className="w-4 h-4 text-purple-600" />
                              </div>
                              <div>
                                <p className="text-gray-800 font-bold text-sm truncate">
                                  {batch.courseId?.title || "N/A"}
                                </p>
                                <p className="text-purple-600 text-xs">
                                  Course
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                                <Calendar className="w-4 h-4 text-emerald-600" />
                              </div>
                              <div>
                                <p className="text-gray-800 font-bold text-sm">
                                  {new Date(
                                    batch.createdAt
                                  ).toLocaleDateString()}
                                </p>
                                <p className="text-emerald-600 text-xs">
                                  Created
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="pt-2 border-t border-gray-200">
                            <div className="flex items-center justify-center text-gray-600 text-xs">
                              <span className="mr-1">
                                Click to view details
                              </span>
                              <span>→</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}