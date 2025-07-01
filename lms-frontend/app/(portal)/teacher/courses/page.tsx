"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Edit,
  Clock,
  Target,
  MoreVertical,
  Calendar,
  Users,
  Trash,
  Clock4,
  BookOpen,
  GraduationCap,
  Sparkles,
  ChevronRight,
  Star,
  TrendingUp,
  Award,
  Zap,
  CheckCircle,
  AlertCircle,
  BookMarked,
  UserCheck,
  Eye,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import toast from "react-hot-toast";
import type { ApiError } from "@/types";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { FaBook, FaCalendarCheck } from "react-icons/fa";
import { Suspense } from "react";

interface Teacher {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  subjects?: string[];
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
  batches: Batch[];
}

interface Batch {
  _id: string;
  name: string;
  courseId?: string;
  courseTitle?: string;
  studentIds: Student[];
  createdAt: string;
  isScheduled?: boolean;
  hasScheduledCalls?: boolean;
  scheduleStatus?: string;
  scheduleDuration?: string;
  callDuration?: string;
}

interface Student {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  profileImage?: string;
  subjects?: string[];
}

export function TeacherCoursesContent() {
  const { user, loading: authLoading, deviceId } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<Batch[]>([]);
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [batchSearchQuery, setBatchSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("courses");
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    type: "batch";
    id: string;
    title: string;
  } | null>(null);
  const [assignCourseModal, setAssignCourseModal] = useState<{
    batchId: string;
    batchName: string;
  } | null>(null);
  const [editCourseModal, setEditCourseModal] = useState<{
    courseId: string;
    courseTitle: string;
  } | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [editOption, setEditOption] = useState<
    "editCourse" | "editCourseForBatch" | null
  >(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const modalRef = useRef<HTMLDivElement>(null);

  const handleUnauthorized = useCallback(() => {
    console.debug("[TeacherCoursesContent] Handling unauthorized access");
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
        "[TeacherCoursesContent] Redirecting due to invalid role or no user",
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
    const tab = searchParams.get("tab");
    if (tab === "batch") {
      setActiveTab("batch");
    } else {
      setActiveTab("courses");
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      console.debug("[TeacherCoursesContent] Starting fetchData");
      setFetchLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        if (!token || !deviceId) {
          console.debug("[TeacherCoursesContent] Missing token or deviceId", {
            token,
            deviceId,
          });
          handleUnauthorized();
          return;
        }

        console.debug(
          "[TeacherCoursesContent] Fetching courses from /courses/all"
        );
        const courseResponse = await api.get("/courses/all");
        const fetchedCourses = courseResponse.data.courses || [];
        setCourses(fetchedCourses);
        setFilteredCourses(fetchedCourses);

        console.debug(
          "[TeacherCoursesContent] Fetching batches from /courses/batches/teacher"
        );
        const batchResponse = await api.get("/courses/batches/teacher");
        let fetchedBatches = batchResponse.data.batches || [];

        fetchedBatches = await Promise.all(
          fetchedBatches.map(async (batch: Batch) => {
            if (batch.courseId) {
              try {
                console.debug(
                  `[TeacherCoursesContent] Fetching schedule for batch ${batch._id}`
                );
                const scheduleResponse = await api.get(
                  `/schedule/batch/${batch._id}/calls?_=${Date.now()}`
                );
                const scheduledCalls = scheduleResponse.data.batch || {
                  calls: [],
                  schedule: { scheduleStatus: "N/A", scheduleDuration: "N/A" },
                };
                return {
                  ...batch,
                  hasScheduledCalls:
                    Array.isArray(scheduledCalls.calls) &&
                    scheduledCalls.calls.length > 0,
                  scheduleStatus:
                    scheduledCalls.schedule?.scheduleStatus || "N/A",
                  scheduleDuration:
                    scheduledCalls.schedule?.scheduleDuration || "N/A",
                  callDuration: scheduledCalls.calls[0]?.callDuration || "N/A",
                };
              } catch (error) {
                console.error(
                  `[TeacherCoursesContent] Failed to fetch schedule for batch ${batch._id}:`,
                  error
                );
                return {
                  ...batch,
                  hasScheduledCalls: false,
                  scheduleStatus: "N/A",
                  scheduleDuration: "N/A",
                  callDuration: "N/A",
                };
              }
            }
            return {
              ...batch,
              hasScheduledCalls: false,
              scheduleStatus: "N/A",
              scheduleDuration: "N/A",
              callDuration: "N/A",
            };
          })
        );

        console.debug("[TeacherCoursesContent] Data fetch completed:", {
          courses: fetchedCourses.length,
          batches: fetchedBatches.length,
        });
        setBatches(fetchedBatches);
        setFilteredBatches(fetchedBatches);
      } catch (error) {
        const apiError = error as ApiError;
        console.error("[TeacherCoursesContent] Fetch error:", {
          message: apiError.response?.data?.message || apiError.message,
          status: apiError.response?.status,
        });
        if (apiError.response?.status === 401) {
          handleUnauthorized();
        } else {
          const errorMessage =
            apiError.response?.data?.message || "Failed to fetch data";
          setError(errorMessage);
          toast.error(errorMessage);
        }
      } finally {
        console.debug("[TeacherCoursesContent] Setting fetchLoading to false");
        setFetchLoading(false);
      }
    };

    if (authLoading) {
      console.debug(
        "[TeacherCoursesContent] Waiting for authLoading to resolve"
      );
      return;
    }

    if (user && user.role?.roleName === "Teacher") {
      console.debug("[TeacherCoursesContent] Triggering fetchData:", {
        userId: user._id,
        role: user.role?.roleName,
      });
      fetchData();
    } else {
      console.warn("[TeacherCoursesContent] Cannot fetch data:", {
        user: !!user,
        role: user?.role?.roleName,
        authLoading,
      });
    }
  }, [user, authLoading, router, deviceId, handleUnauthorized]);

  useEffect(() => {
    const handler = setTimeout(() => {
      const lowerCourseQuery = courseSearchQuery.toLowerCase();
      const filteredCourses = courses.filter(
        (course) =>
          course.title.toLowerCase().includes(lowerCourseQuery) ||
          course.targetAudience.toLowerCase().includes(lowerCourseQuery) ||
          course.duration.toLowerCase().includes(lowerCourseQuery)
      );
      setFilteredCourses(filteredCourses);

      const lowerBatchQuery = batchSearchQuery.toLowerCase();
      const filteredBatches = batches.filter(
        (batch) =>
          batch.name.toLowerCase().includes(lowerBatchQuery) ||
          batch.courseTitle?.toLowerCase().includes(lowerBatchQuery)
      );
      setFilteredBatches(filteredBatches);
    }, 300);
    return () => clearTimeout(handler);
  }, [courseSearchQuery, batchSearchQuery, courses, batches]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuOpen && cardRefs.current.get(menuOpen)) {
        const cardElement = cardRefs.current.get(menuOpen);
        if (cardElement && !cardElement.contains(event.target as Node)) {
          setMenuOpen(null);
        }
      }
      if (
        (deleteModal || assignCourseModal || editCourseModal) &&
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setDeleteModal(null);
        setAssignCourseModal(null);
        setEditCourseModal(null);
        setSelectedCourseId(null);
        setEditOption(null);
        setSelectedBatchId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen, deleteModal, assignCourseModal, editCourseModal]);

  const handleEditCourse = (courseId: string, courseTitle: string) => {
    setEditCourseModal({ courseId, courseTitle });
    setMenuOpen(null);
    setEditOption(null);
    setSelectedBatchId(null);
  };

  const handleEditOptionSelect = (
    option: "editCourse" | "editCourseForBatch"
  ) => {
    setEditOption(option);
    setSelectedBatchId(null);
  };

  const handleProceedEdit = () => {
    if (!editCourseModal) return;

    if (editOption === "editCourse") {
      router.push(
        `/teacher/courses/${editCourseModal.courseId}/edit?mode=course`
      );
    } else if (editOption === "editCourseForBatch" && selectedBatchId) {
      router.push(
        `/teacher/courses/${editCourseModal.courseId}/edit?mode=batch&batchId=${selectedBatchId}`
      );
    } else {
      toast.error("Please select the required options to proceed.");
      return;
    }
    setEditCourseModal(null);
    setEditOption(null);
    setSelectedBatchId(null);
  };

  const handleDeleteBatch = async (batchId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token || !deviceId) {
        console.debug(
          "[TeacherCoursesContent] Missing token or deviceId for delete batch",
          { token, deviceId }
        );
        handleUnauthorized();
        return;
      }

      await api.delete(`/courses/batch/delete/${batchId}`);
      setBatches(batches.filter((batch) => batch._id !== batchId));
      setFilteredBatches(
        filteredBatches.filter((batch) => batch._id !== batchId)
      );
      toast.success("Batch deleted successfully");
    } catch (error) {
      const apiError = error as ApiError;
      console.error(
        "[TeacherCoursesContent] Failed to delete batch:",
        apiError
      );
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        const errorMessage =
          apiError.response?.status === 404
            ? "Batch not found or not assigned to you"
            : apiError.response?.data?.message || "Failed to delete batch";
        toast.error(errorMessage);
      }
    } finally {
      setDeleteModal(null);
      setMenuOpen(null);
    }
  };

  const handleAssignCourse = async (batchId: string, courseId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token || !deviceId) {
        console.debug(
          "[TeacherCoursesContent] Missing token or deviceId for assign course",
          { token, deviceId }
        );
        handleUnauthorized();
        return;
      }

      const batch = batches.find((b) => b._id === batchId);
      if (!batch) {
        toast.error("Batch not found");
        return;
      }

      const studentIds = batch.studentIds.map((s) => s._id);

      const response = await api.post("/courses/batch/assign", {
        batchId,
        courseId,
        studentIds,
      });
      toast.success(
        response.data.message || "Course assigned to batch successfully"
      );

      setBatches((prev) =>
        prev.map((batch) =>
          batch._id === batchId
            ? {
                ...batch,
                courseId,
                courseTitle:
                  courses.find((c) => c._id === courseId)?.title || "N/A",
              }
            : batch
        )
      );
      setFilteredBatches((prev) =>
        prev.map((batch) =>
          batch._id === batchId
            ? {
                ...batch,
                courseId,
                courseTitle:
                  courses.find((c) => c._id === courseId)?.title || "N/A",
              }
            : batch
        )
      );
      setAssignCourseModal(null);
      setSelectedCourseId(null);
    } catch (error) {
      const apiError = error as ApiError;
      console.error(
        "[TeacherCoursesContent] Failed to assign course:",
        apiError
      );
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        toast.error(
          apiError.response?.data?.message || "Failed to assign course to batch"
        );
      }
    }
  };

  const handleOpenDeleteModal = (type: "batch", id: string, title: string) => {
    setDeleteModal({ type, id, title });
    setMenuOpen(null);
  };

  const truncateTitle = (text: string, maxLength = 10) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
  };

  const toggleMenu = (id: string) => {
    setMenuOpen(menuOpen === id ? null : id);
  };

  if (authLoading) {
    console.debug("[TeacherCoursesContent] Rendering authLoading state");
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <motion.div className="relative">
          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
            className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-blue-600" />
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user || user.role?.roleName !== "Teacher") {
    console.debug("[TeacherCoursesContent] User invalid, awaiting redirect");
    return null;
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
        {/* Compact Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              x: [0, 80, 0],
              y: [0, -80, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 15,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            className="absolute top-10 left-10 w-48 h-48 bg-gradient-to-r from-blue-200/20 to-purple-200/20 rounded-full blur-2xl"
          />
          <motion.div
            animate={{
              x: [0, -100, 0],
              y: [0, 80, 0],
              scale: [1, 0.9, 1],
            }}
            transition={{
              duration: 18,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            className="absolute bottom-10 right-10 w-64 h-64 bg-gradient-to-r from-indigo-200/20 to-pink-200/20 rounded-full blur-2xl"
          />
        </div>

        <div className="relative z-10 p-4 md:p-6">
          <style jsx global>{`
            .no-scrollbar::-webkit-scrollbar {
              display: none;
            }
            .no-scrollbar {
              scrollbar-width: none;
              -ms-overflow-style: none;
            }
            .glass-light {
              background: rgba(255, 255, 255, 0.85);
              backdrop-filter: blur(12px);
              border: 1px solid rgba(255, 255, 255, 0.3);
            }
            .premium-card {
              background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
              border: 1px solid rgba(148, 163, 184, 0.08);
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08),
                0 4px 6px -2px rgba(0, 0, 0, 0.03),
                inset 0 1px 0 0 rgba(255, 255, 255, 0.7);
            }
            .premium-hover {
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .premium-hover:hover {
              transform: translateY(-4px) scale(1.01);
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.12),
                0 10px 10px -5px rgba(0, 0, 0, 0.06),
                inset 0 1px 0 0 rgba(255, 255, 255, 0.8);
            }
            .card-shine {
              position: relative;
              overflow: hidden;
            }
            .card-shine::before {
              content: "";
              position: absolute;
              top: 0;
              left: -100%;
              width: 100%;
              height: 100%;
              background: linear-gradient(
                90deg,
                transparent,
                rgba(255, 255, 255, 0.4),
                transparent
              );
              transition: left 0.5s;
            }
            .card-shine:hover::before {
              left: 100%;
            }
          `}</style>

          <div className="max-w-7xl mx-auto w-full">
            {/* Compact Header */}
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-center mb-8"
            >
              <div className="flex items-center justify-center gap-3 mb-4">
                <motion.div
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 15,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                  className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg"
                >
                  <GraduationCap className="w-6 h-6 text-white" />
                </motion.div>
                <Sparkles className="w-6 h-6 text-yellow-500" />
              </div>

              <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-3">
                Teaching Dashboard
              </h1>

              <div className="glass-light rounded-2xl p-4 max-w-2xl mx-auto shadow-lg">
                <p className="text-gray-700 mb-3 font-medium">
                  Manage courses and batches efficiently
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                  <div className="flex items-center gap-2 text-blue-700">
                    <TrendingUp className="w-4 h-4" />
                    <span className="font-semibold">Analytics</span>
                  </div>
                  <div className="flex items-center gap-2 text-purple-700">
                    <Award className="w-4 h-4" />
                    <span className="font-semibold">Premium</span>
                  </div>
                  <div className="flex items-center gap-2 text-cyan-700">
                    <Zap className="w-4 h-4" />
                    <span className="font-semibold">Fast</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
                className="glass-light border-l-4 border-red-500 p-4 rounded-xl mb-6 shadow-lg"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <p className="text-red-700 font-semibold">{error}</p>
                </div>
              </motion.div>
            )}

            <Tabs
              value={activeTab}
              className="w-full"
              onValueChange={(value) => setActiveTab(value)}
            >
              {/* Centered Tab Navigation */}
              <div className="flex flex-col items-center gap-4 mb-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="glass-light rounded-2xl p-2 shadow-lg"
                >
                  <TabsList className="bg-transparent border-0 gap-2">
                    <TabsTrigger
                      value="courses"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-white/60 rounded-xl px-6 py-2 font-bold transition-all duration-300 shadow-sm data-[state=active]:shadow-blue-500/20"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Courses
                      <Badge
                        variant="secondary"
                        className="ml-2 bg-white/20 text-current border-0 text-xs"
                      >
                        {courses.length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger
                      value="batch"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-white/60 rounded-xl px-6 py-2 font-bold transition-all duration-300 shadow-sm data-[state=active]:shadow-emerald-500/20"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Batches
                      <Badge
                        variant="secondary"
                        className="ml-2 bg-white/20 text-current border-0 text-xs"
                      >
                        {batches.length}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>
                </motion.div>

                {activeTab === "batch" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Button
                      onClick={() =>
                        router.push("/teacher/batches/create-batch")
                      }
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl px-6 py-2 font-bold shadow-lg hover:shadow-emerald-500/20 transition-all duration-300 transform hover:scale-105"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Create Batch
                    </Button>
                  </motion.div>
                )}
              </div>

              {/* Compact Search Bar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative mb-8"
              >
                <div className="glass-light rounded-2xl p-1 shadow-lg">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
                    <Input
                      type="text"
                      placeholder={`Search ${
                        activeTab === "courses" ? "courses" : "batches"
                      }...`}
                      value={
                        activeTab === "courses"
                          ? courseSearchQuery
                          : batchSearchQuery
                      }
                      onChange={(e) =>
                        activeTab === "courses"
                          ? setCourseSearchQuery(e.target.value)
                          : setBatchSearchQuery(e.target.value)
                      }
                      className="w-full pl-12 pr-12 py-3 bg-white/90 rounded-xl border-0 font-semibold text-gray-800 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500/50 transition-all duration-300"
                    />
                    {(activeTab === "courses"
                      ? courseSearchQuery
                      : batchSearchQuery) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 hover:bg-gray-100"
                        onClick={() =>
                          activeTab === "courses"
                            ? setCourseSearchQuery("")
                            : setBatchSearchQuery("")
                        }
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>

              <div>
                <TabsContent value="courses">
                  {fetchLoading ? (
                    <div className="flex items-center justify-center min-h-[300px]">
                      <motion.div className="relative">
                        <motion.div
                          animate={{
                            rotate: 360,
                          }}
                          transition={{
                            duration: 2,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "linear",
                          }}
                          className="w-12 h-12 border-3 border-blue-200 border-t-blue-600 rounded-full"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-blue-600" />
                        </div>
                      </motion.div>
                    </div>
                  ) : filteredCourses.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6 }}
                      className="text-center mt-12"
                    >
                      <div className="glass-light rounded-2xl p-12 max-w-2xl mx-auto shadow-lg">
                        <div className="mx-auto w-48 h-48 mb-6">
                          <DotLottieReact
                            src="https://lottie.host/3dbd1dd9-1fa6-4176-b31c-d78f20294a85/WjSa8Bg9Y7.lottie"
                            loop
                            autoplay
                          />
                        </div>
                        <h2 className="text-2xl font-black text-gray-800 mb-3">
                          No Courses Assigned Yet
                        </h2>
                        <p className="text-gray-600 leading-relaxed">
                          Your course library is waiting to be filled with
                          amazing content.
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                      <AnimatePresence>
                        {filteredCourses.map((course, index) => (
                          <motion.div
                            key={course.courseId}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 30 }}
                            transition={{
                              duration: 0.4,
                              delay: index * 0.05,
                              ease: "easeOut",
                            }}
                            className="group relative"
                            ref={(el) => {
                              if (el) {
                                cardRefs.current.set(course.courseId, el);
                              } else {
                                cardRefs.current.delete(course.courseId);
                              }
                            }}
                          >
                            <Card
                              className="premium-card premium-hover card-shine rounded-2xl border-0 h-full flex flex-col overflow-hidden cursor-pointer relative"
                              onClick={() =>
                                router.push(
                                  `/teacher/courses/${course.courseId}/preview`
                                )
                              }
                            >
                              {/* Compact Course Header */}
                              <div className="relative p-4 pb-3 bg-gradient-to-br from-blue-50/60 to-purple-50/60">
                                {/* Status & Menu */}
                                <div className="flex justify-between items-start mb-3">
                                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-sm text-xs">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Active
                                  </Badge>

                                  <div className="relative">
                                    <AnimatePresence>
                                      {menuOpen !== course.courseId ? (
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          exit={{ opacity: 0, scale: 0 }}
                                          transition={{ duration: 0.2 }}
                                        >
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-gray-500 hover:bg-white/80 hover:text-blue-600 rounded-full p-2 transition-all duration-200"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleMenu(course.courseId);
                                            }}
                                          >
                                            <MoreVertical className="w-4 h-4" />
                                          </Button>
                                        </motion.div>
                                      ) : (
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          exit={{ opacity: 0, scale: 0 }}
                                          transition={{ duration: 0.2 }}
                                          className="absolute top-0 right-0 bg-white/95 backdrop-blur-sm rounded-xl p-1 shadow-xl border border-white/20 z-10"
                                        >
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-blue-600 hover:bg-blue-50 rounded-lg p-2"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEditCourse(
                                                course.courseId,
                                                course.title
                                              );
                                            }}
                                            title="Edit Course"
                                          >
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </div>

                                {/* Course Icon */}
                                <div className="flex justify-center mb-3">
                                  <div className="relative">
                                    <motion.div
                                      whileHover={{ scale: 1.05, rotate: 3 }}
                                      className="w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg"
                                    >
                                      <BookOpen className="w-7 h-7 text-white" />
                                    </motion.div>
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                                      <Star className="w-3 h-3 text-white" />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <CardContent className="flex-1 px-4 pb-4">
                                {/* Title */}
                                <div className="text-center mb-4">
                                  <h3
                                    className="text-lg font-black text-gray-800 mb-1 group-hover:text-blue-600 transition-colors duration-300 leading-tight"
                                    title={course.title}
                                  >
                                    {truncateTitle(course.title, 20)}
                                  </h3>
                                  <div className="w-12 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto"></div>
                                </div>

                                {/* Compact Info */}
                                <div className="space-y-2 mb-4">
                                  <div className="flex items-center gap-2 p-2 bg-blue-50/50 rounded-lg">
                                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                                      <Clock className="w-3 h-3 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-xs font-medium text-gray-500 block">
                                        Duration
                                      </span>
                                      <span className="text-sm font-bold text-gray-800 truncate block">
                                        {course.duration}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 p-2 bg-purple-50/50 rounded-lg">
                                    <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                                      <Target className="w-3 h-3 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-xs font-medium text-gray-500 block">
                                        Audience
                                      </span>
                                      <span className="text-sm font-bold text-gray-800 truncate block">
                                        {course.targetAudience}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 p-2 bg-indigo-50/50 rounded-lg">
                                    <div className="w-6 h-6 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                      <Calendar className="w-3 h-3 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-xs font-medium text-gray-500 block">
                                        Created
                                      </span>
                                      <span className="text-sm font-bold text-gray-800 truncate block">
                                        {new Date(
                                          course.createdAt
                                        ).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Action Button */}
                                <motion.div
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-3 text-white shadow-md group-hover:shadow-blue-500/20 transition-all duration-300"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Eye className="w-4 h-4" />
                                      <span className="font-bold text-sm">
                                        View Course
                                      </span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                                  </div>
                                </motion.div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="batch">
                  {fetchLoading ? (
                    <div className="flex items-center justify-center min-h-[300px]">
                      <motion.div className="relative">
                        <motion.div
                          animate={{
                            rotate: 360,
                          }}
                          transition={{
                            duration: 2,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "linear",
                          }}
                          className="w-12 h-12 border-3 border-emerald-200 border-t-emerald-600 rounded-full"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Users className="w-5 h-5 text-emerald-600" />
                        </div>
                      </motion.div>
                    </div>
                  ) : filteredBatches.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6 }}
                      className="text-center mt-12"
                    >
                      <div className="glass-light rounded-2xl p-12 max-w-2xl mx-auto shadow-lg">
                        <div className="mx-auto w-48 h-48 mb-6">
                          <DotLottieReact
                            src="https://lottie.host/3dbd1dd9-1fa6-4176-b31c-d78f20294a85/WjSa8Bg9Y7.lottie"
                            loop
                            autoplay
                          />
                        </div>
                        <h2 className="text-2xl font-black text-gray-800 mb-3">
                          No Batches Created Yet
                        </h2>
                        <p className="text-gray-600 leading-relaxed mb-6">
                          Start building your teaching community by creating
                          your first batch.
                        </p>
                        <Button
                          onClick={() =>
                            router.push("/teacher/batches/create-batch")
                          }
                          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl px-8 py-3 font-bold shadow-lg hover:shadow-emerald-500/20 transition-all duration-300 transform hover:scale-105"
                        >
                          <Users className="w-5 h-5 mr-2" />
                          Create Your First Batch
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                      <AnimatePresence>
                        {filteredBatches.map((batch, index) => (
                          <motion.div
                            key={batch._id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 30 }}
                            transition={{
                              duration: 0.4,
                              delay: index * 0.05,
                              ease: "easeOut",
                            }}
                            className="group relative"
                            ref={(el) => {
                              if (el) {
                                cardRefs.current.set(batch._id, el);
                              } else {
                                cardRefs.current.delete(batch._id);
                              }
                            }}
                          >
                            <Card
                              className="premium-card premium-hover card-shine rounded-2xl border-0 h-full flex flex-col overflow-hidden cursor-pointer relative"
                              onClick={() =>
                                router.push(`/teacher/batches/${batch._id}`)
                              }
                            >
                              {/* Compact Batch Header */}
                              <div className="relative p-4 pb-3 bg-gradient-to-br from-emerald-50/60 to-teal-50/60">
                                {/* Status & Menu */}
                                <div className="flex justify-between items-start mb-3">
                                  {batch.courseId ? (
                                    <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 shadow-sm text-xs">
                                      <BookMarked className="w-3 h-3 mr-1" />
                                      Assigned
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 shadow-sm text-xs">
                                      <AlertCircle className="w-3 h-3 mr-1" />
                                      No Course
                                    </Badge>
                                  )}

                                  <div className="relative">
                                    <AnimatePresence>
                                      {menuOpen !== batch._id ? (
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          exit={{ opacity: 0, scale: 0 }}
                                          transition={{ duration: 0.2 }}
                                        >
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-gray-500 hover:bg-white/80 hover:text-emerald-600 rounded-full p-2 transition-all duration-200"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleMenu(batch._id);
                                            }}
                                          >
                                            <MoreVertical className="w-4 h-4" />
                                          </Button>
                                        </motion.div>
                                      ) : (
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          exit={{ opacity: 0, scale: 0 }}
                                          transition={{ duration: 0.2 }}
                                          className="absolute top-0 right-0 bg-white/95 backdrop-blur-sm rounded-xl p-1 shadow-xl border border-white/20 z-10 flex gap-1"
                                        >
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-emerald-600 hover:bg-emerald-50 rounded-lg p-2"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              router.push(
                                                `/teacher/batches/${batch._id}/edit-batch`
                                              );
                                            }}
                                            title="Edit Batch"
                                          >
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:bg-red-50 rounded-lg p-2"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenDeleteModal(
                                                "batch",
                                                batch._id,
                                                batch.name
                                              );
                                            }}
                                            title="Delete Batch"
                                          >
                                            <Trash className="w-4 h-4" />
                                          </Button>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </div>

                                {/* Batch Icon */}
                                <div className="flex justify-center mb-3">
                                  <div className="relative">
                                    <motion.div
                                      whileHover={{ scale: 1.05, rotate: 3 }}
                                      className="w-14 h-14 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg"
                                    >
                                      <Users className="w-7 h-7 text-white" />
                                    </motion.div>
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                                      <span className="text-white font-bold text-xs">
                                        {batch.studentIds.length}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <CardContent className="flex-1 px-4 pb-4 flex flex-col">
                                {/* Title */}
                                <div className="text-center mb-4">
                                  <h3
                                    className="text-lg font-black text-gray-800 mb-1 group-hover:text-emerald-600 transition-colors duration-300 leading-tight"
                                    title={batch.name}
                                  >
                                    {truncateTitle(batch.name, 20)}
                                  </h3>
                                  <div className="w-12 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mx-auto"></div>
                                </div>

                                {/* Compact Info */}
                                <div className="space-y-2 flex-1 mb-4">
                                  <div className="flex items-center gap-2 p-2 bg-emerald-50/50 rounded-lg">
                                    <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                                      <UserCheck className="w-3 h-3 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-xs font-medium text-gray-500 block">
                                        Students
                                      </span>
                                      <span className="text-sm font-bold text-gray-800 truncate block">
                                        {batch.studentIds.length} enrolled
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 p-2 bg-blue-50/50 rounded-lg">
                                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                                      <FaBook className="w-3 h-3 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-xs font-medium text-gray-500 block">
                                        Course
                                      </span>
                                      <span className="text-sm font-bold text-gray-800 truncate block">
                                        {truncateTitle(
                                          batch.courseTitle || "Not Assigned",
                                          12
                                        )}
                                      </span>
                                    </div>
                                  </div>

                                  {(batch.isScheduled ||
                                    batch.hasScheduledCalls) && (
                                    <div className="flex items-center gap-2 p-2 bg-purple-50/50 rounded-lg">
                                      <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                                        <Clock4 className="w-3 h-3 text-white" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <span className="text-xs font-medium text-gray-500 block">
                                          Schedule
                                        </span>
                                        <span className="text-sm font-bold text-gray-800 truncate block">
                                          {batch.scheduleDuration || "N/A"}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Action Buttons */}
                                <div className="space-y-2">
                                  {batch.studentIds.length > 0 &&
                                    !batch.courseId && (
                                      <motion.div
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                      >
                                        <Button
                                          variant="default"
                                          size="sm"
                                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl py-2 text-sm font-bold transition-all duration-300 shadow-md hover:shadow-blue-500/20"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setAssignCourseModal({
                                              batchId: batch._id,
                                              batchName: batch.name,
                                            });
                                            setSelectedCourseId(null);
                                          }}
                                        >
                                          <FaBook className="w-3 h-3 mr-2" />
                                          Assign Course
                                        </Button>
                                      </motion.div>
                                    )}

                                  {batch.studentIds.length > 0 &&
                                    batch.courseId &&
                                    !batch.hasScheduledCalls && (
                                      <motion.div
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                      >
                                        <Button
                                          variant="default"
                                          size="sm"
                                          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl py-2 text-sm font-bold transition-all duration-300 shadow-md hover:shadow-cyan-500/20"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(
                                              `/teacher/batches/${batch._id}/schedule`
                                            );
                                          }}
                                        >
                                          <FaCalendarCheck className="w-3 h-3 mr-2" />
                                          Schedule Classes
                                        </Button>
                                      </motion.div>
                                    )}

                                  {(batch.isScheduled ||
                                    batch.hasScheduledCalls) && (
                                    <div
                                      className={`text-white text-center font-bold px-3 py-2 rounded-xl shadow-md text-xs ${
                                        batch.scheduleStatus?.toLowerCase() ===
                                        "scheduled"
                                          ? "bg-gradient-to-r from-green-500 to-emerald-500"
                                          : batch.scheduleStatus?.toLowerCase() ===
                                            "cancelled"
                                          ? "bg-gradient-to-r from-red-500 to-pink-500"
                                          : batch.scheduleStatus?.toLowerCase() ===
                                            "completed"
                                          ? "bg-gradient-to-r from-blue-500 to-indigo-500"
                                          : "bg-gradient-to-r from-gray-500 to-gray-600"
                                      }`}
                                    >
                                      {batch.scheduleStatus || "N/A"}
                                    </div>
                                  )}
                                </div>

                                {/* View Button */}
                                <motion.div
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-3 text-white shadow-md group-hover:shadow-emerald-500/20 transition-all duration-300 mt-3"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Eye className="w-4 h-4" />
                                      <span className="font-bold text-sm">
                                        View Batch
                                      </span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                                  </div>
                                </motion.div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>

            {/* Modals remain the same but with smaller sizes */}
            {/* Enhanced Edit Course Modal */}
            <AnimatePresence>
              {editCourseModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                >
                  <motion.div
                    ref={modalRef}
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ duration: 0.3, type: "spring", damping: 20 }}
                    className="bg-white rounded-2xl p-6 max-w-4xl w-full shadow-2xl max-h-[85vh] no-scrollbar relative flex flex-col"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h2 className="text-2xl font-black text-gray-800 mb-2">
                          Edit Course
                        </h2>
                        <p className="text-gray-600 font-semibold">
                          {editCourseModal.courseTitle}
                        </p>
                        <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mt-2"></div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditCourseModal(null);
                          setEditOption(null);
                          setSelectedBatchId(null);
                        }}
                        className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-3"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>

                    <div className="relative overflow-y-auto max-h-[60vh] no-scrollbar px-2 flex-grow">
                      {!editOption && (
                        <div className="space-y-4">
                          <h3 className="text-lg font-bold text-gray-800 mb-4">
                            Select Edit Option
                          </h3>
                          <div className="grid gap-4">
                            <motion.div
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                            >
                              <Button
                                onClick={() =>
                                  handleEditOptionSelect("editCourse")
                                }
                                className="w-full bg-white border-2 border-blue-200 text-blue-700 hover:bg-blue-50 rounded-2xl p-6 text-left font-bold transition-all duration-300 shadow-md hover:shadow-blue-500/20"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
                                    <Edit className="w-6 h-6 text-white" />
                                  </div>
                                  <div>
                                    <div className="text-lg font-black mb-1">
                                      Edit Entire Course
                                    </div>
                                    <div className="text-sm text-gray-600 font-semibold">
                                      Make changes to the complete course
                                      structure
                                    </div>
                                  </div>
                                </div>
                              </Button>
                            </motion.div>
                            <motion.div
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                            >
                              <Button
                                onClick={() =>
                                  handleEditOptionSelect("editCourseForBatch")
                                }
                                className="w-full bg-white border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-2xl p-6 text-left font-bold transition-all duration-300 shadow-md hover:shadow-emerald-500/20"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-md">
                                    <Users className="w-6 h-6 text-white" />
                                  </div>
                                  <div>
                                    <div className="text-lg font-black mb-1">
                                      Edit Course for Specific Batch
                                    </div>
                                    <div className="text-sm text-gray-600 font-semibold">
                                      Customize course content for a particular
                                      batch
                                    </div>
                                  </div>
                                </div>
                              </Button>
                            </motion.div>
                          </div>
                        </div>
                      )}

                      {editOption === "editCourseForBatch" && (
                        <div>
                          <h3 className="text-lg font-bold text-gray-800 mb-4">
                            Select Batch
                          </h3>
                          {(() => {
                            const filteredBatches = batches.filter(
                              (batch) =>
                                batch.courseId === editCourseModal.courseId
                            );
                            return filteredBatches.length === 0 ? (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                                className="bg-white rounded-2xl p-8 text-center shadow-md"
                              >
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <Users className="w-8 h-8 text-gray-400" />
                                </div>
                                <p className="text-gray-600 font-semibold">
                                  No batches are assigned to this course.
                                </p>
                              </motion.div>
                            ) : (
                              <RadioGroup
                                value={selectedBatchId || ""}
                                onValueChange={(value) => {
                                  setSelectedBatchId(value);
                                }}
                                className="grid gap-4 sm:grid-cols-2"
                              >
                                <AnimatePresence>
                                  {filteredBatches.map((batch, index) => (
                                    <motion.div
                                      key={batch._id}
                                      initial={{ opacity: 0, y: 20 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: 20 }}
                                      transition={{
                                        duration: 0.3,
                                        delay: index * 0.1,
                                      }}
                                      className={`relative p-6 bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1 ${
                                        selectedBatchId === batch._id
                                          ? "border-2 border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-200"
                                          : "border border-gray-200"
                                      }`}
                                      onClick={() => {
                                        setSelectedBatchId(batch._id);
                                      }}
                                    >
                                      <RadioGroupItem
                                        value={batch._id}
                                        id={batch._id}
                                        className="absolute top-4 right-4 text-emerald-600"
                                      />
                                      <Label
                                        htmlFor={batch._id}
                                        className="cursor-pointer block"
                                      >
                                        <div className="flex items-center gap-4 mb-4">
                                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-md">
                                            <Users className="w-6 h-6 text-white" />
                                          </div>
                                          <h3
                                            className="text-lg font-black text-gray-800"
                                            title={batch.name}
                                          >
                                            {truncateTitle(batch.name, 15)}
                                          </h3>
                                        </div>
                                        <div className="space-y-2 text-gray-700">
                                          <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center">
                                              <Users className="w-3 h-3 text-emerald-600" />
                                            </div>
                                            <span className="font-semibold text-sm">
                                              Students:{" "}
                                              {batch.studentIds.length}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                                              <FaBook className="w-3 h-3 text-blue-600" />
                                            </div>
                                            <span className="font-semibold text-sm">
                                              Course:{" "}
                                              {batch.courseTitle || "N/A"}
                                            </span>
                                          </div>
                                        </div>
                                      </Label>
                                    </motion.div>
                                  ))}
                                </AnimatePresence>
                              </RadioGroup>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-gray-200/50">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditCourseModal(null);
                          setEditOption(null);
                          setSelectedBatchId(null);
                        }}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl px-6 py-2 font-bold"
                      >
                        Cancel
                      </Button>
                      {(editOption === "editCourse" ||
                        (editOption === "editCourseForBatch" &&
                          selectedBatchId)) && (
                        <Button
                          onClick={handleProceedEdit}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl px-8 py-2 font-bold transition-all duration-300 shadow-md hover:shadow-blue-500/20"
                        >
                          Proceed to Edit
                        </Button>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Enhanced Assign Course Modal */}
            <AnimatePresence>
              {assignCourseModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                >
                  <motion.div
                    ref={modalRef}
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ duration: 0.3, type: "spring", damping: 20 }}
                    className="bg-white rounded-2xl p-6 max-w-4xl w-full shadow-2xl max-h-[85vh] no-scrollbar relative flex flex-col"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h2 className="text-2xl font-black text-gray-800 mb-2">
                          Assign Course
                        </h2>
                        <p className="text-gray-600 font-semibold">
                          to Batch: {assignCourseModal.batchName}
                        </p>
                        <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mt-2"></div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAssignCourseModal(null);
                          setSelectedCourseId(null);
                        }}
                        className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-3"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>

                    <div className="relative overflow-y-auto max-h-[60vh] no-scrollbar px-2 flex-grow">
                      {courses.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                          className="bg-white rounded-2xl p-8 text-center shadow-md"
                        >
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="w-8 h-8 text-gray-400" />
                          </div>
                          <p className="text-gray-600 font-semibold">
                            No courses available to assign.
                          </p>
                        </motion.div>
                      ) : (
                        <RadioGroup
                          value={selectedCourseId || ""}
                          onValueChange={setSelectedCourseId}
                          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-2"
                        >
                          <AnimatePresence>
                            {courses.map((course, index) => (
                              <motion.div
                                key={course.courseId}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                transition={{
                                  duration: 0.3,
                                  delay: index * 0.1,
                                }}
                                className={`relative p-6 bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1 ${
                                  selectedCourseId === course.courseId
                                    ? "border-2 border-blue-500 bg-blue-50/50 ring-2 ring-blue-200"
                                    : "border border-gray-200"
                                }`}
                                onClick={() =>
                                  setSelectedCourseId(course.courseId)
                                }
                              >
                                <RadioGroupItem
                                  value={course.courseId}
                                  id={course.courseId}
                                  className="absolute top-4 right-4 text-blue-600"
                                />
                                <Label
                                  htmlFor={course.courseId}
                                  className="cursor-pointer block"
                                >
                                  <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
                                      <BookOpen className="w-6 h-6 text-white" />
                                    </div>
                                    <h3
                                      className="text-lg font-black text-gray-800"
                                      title={course.title}
                                    >
                                      {truncateTitle(course.title, 15)}
                                    </h3>
                                  </div>
                                  <div className="space-y-2 text-gray-700">
                                    <div className="flex items-center gap-3">
                                      <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <Clock className="w-3 h-3 text-blue-600" />
                                      </div>
                                      <span className="font-semibold text-sm">
                                        {course.duration}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <Target className="w-3 h-3 text-purple-600" />
                                      </div>
                                      <span className="font-semibold text-sm">
                                        {course.targetAudience}
                                      </span>
                                    </div>
                                  </div>
                                </Label>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </RadioGroup>
                      )}
                    </div>

                    <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-gray-200/50">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setAssignCourseModal(null);
                          setSelectedCourseId(null);
                        }}
                        className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl px-6 py-2 font-bold"
                      >
                        Cancel
                      </Button>
                      <Button
                        disabled={!selectedCourseId}
                        onClick={() => {
                          if (selectedCourseId && assignCourseModal) {
                            handleAssignCourse(
                              assignCourseModal.batchId,
                              selectedCourseId
                            );
                          }
                        }}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl px-8 py-2 font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-blue-500/20"
                      >
                        Assign Course
                      </Button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Enhanced Delete Confirmation Modal */}
            <AnimatePresence>
              {deleteModal && deleteModal.type === "batch" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                >
                  <motion.div
                    ref={modalRef}
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ duration: 0.3, type: "spring", damping: 20 }}
                    className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl"
                  >
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trash className="w-8 h-8 text-red-600" />
                      </div>
                      <h2 className="text-2xl font-black text-gray-800 mb-2">
                        Confirm Batch Deletion
                      </h2>
                      <div className="w-16 h-1 bg-gradient-to-r from-red-500 to-pink-600 rounded-full mx-auto"></div>
                    </div>

                    <div className="bg-red-50 rounded-xl p-6 mb-6 border-2 border-red-200">
                      <p className="text-gray-700 text-center leading-relaxed font-semibold">
                        Are you sure you want to delete the batch{" "}
                        <span className="font-black text-red-600">
                          {deleteModal.title}
                        </span>
                        ?
                      </p>
                      <p className="text-gray-600 text-center mt-3 text-sm font-medium">
                        This will notify enrolled students but will not affect
                        admins or other teachers.
                      </p>
                    </div>

                    <div className="flex gap-4">
                      <Button
                        variant="outline"
                        onClick={() => setDeleteModal(null)}
                        className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl py-3 font-bold"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleDeleteBatch(deleteModal.id)}
                        className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl py-3 font-bold transition-all duration-300 shadow-md hover:shadow-red-500/20"
                      >
                        Delete Batch
                      </Button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default function TeacherCourses() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
          <motion.div className="relative">
            <motion.div
              animate={{
                rotate: 360,
              }}
              transition={{
                duratxion: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
              className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-blue-600" />
            </div>
          </motion.div>
        </div>
      }
    >
      <TeacherCoursesContent />
    </Suspense>
  );
}
