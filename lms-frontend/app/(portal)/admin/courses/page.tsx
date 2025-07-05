"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Plus,
  MoreVertical,
  Edit,
  Trash,
  Clock,
  Users,
  User,
  Calendar,
  BookOpen,
  Play,
  ArrowRight,
  Star,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { ApiError } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    title: string;
    lessons: {
      title: string;
      format: string;
      resources: { name: string }[];
      worksheets?: { name: string }[];
      learningGoals: string[];
    }[];
  }[];
}

export default function Courses() {
  const { user, loading: authLoading, deviceId } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    courseId: string;
    courseTitle: string;
  } | null>(null);
  const [teachersModal, setTeachersModal] = useState<Course | null>(null);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState("");
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [unassignModal, setUnassignModal] = useState<{
    courseId: string;
    courseTitle: string;
    teacherIds: string[];
    teacherNames: string[];
  } | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const modalRef = useRef<HTMLDivElement>(null);

  const handleUnauthorized = useCallback(() => {
    console.debug("[Courses] Handling unauthorized access");
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("deviceId");
    toast.error("Session expired. Please log in again.");
    router.push("/login");
  }, [router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !["Admin", "Super Admin"].includes(user.role?.roleName)) {
      console.debug("[Courses] Redirecting due to invalid role or no user", {
        user: !!user,
        role: user?.role?.roleName,
        authLoading,
      });
      handleUnauthorized();
    }
  }, [user, authLoading, handleUnauthorized]);

  const fetchCourses = useCallback(async () => {
    if (!user || !deviceId) {
      handleUnauthorized();
      return;
    }
    setFetchLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        handleUnauthorized();
        return;
      }
      const response = await api.get("/courses/all", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Device-Id": deviceId,
        },
      });
      const fetchedCourses = response.data.courses || [];
      setCourses(fetchedCourses);
      setFilteredCourses(fetchedCourses);
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[Courses] Failed to fetch courses:", apiError);
      const errorMessage =
        apiError.response?.data?.message || "Failed to fetch courses";
      setError(errorMessage);
      toast.error(errorMessage);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      }
    } finally {
      setFetchLoading(false);
    }
  }, [user, deviceId, handleUnauthorized]);

  useEffect(() => {
    if (
      !authLoading &&
      user &&
      ["Admin", "Super Admin"].includes(user.role?.roleName)
    ) {
      console.debug("[Courses] Fetching courses", { userId: user._id });
      fetchCourses();
    }
  }, [user, authLoading, fetchCourses]);

  useEffect(() => {
    const handler = setTimeout(() => {
      const lowerQuery = searchQuery.toLowerCase();
      const filtered = courses.filter(
        (course) =>
          course.title.toLowerCase().includes(lowerQuery) ||
          course.assignedTeachers.some((teacher) =>
            teacher.name.toLowerCase().includes(lowerQuery)
          ) ||
          course.targetAudience.toLowerCase().includes(lowerQuery) ||
          course.duration.toLowerCase().includes(lowerQuery)
      );
      setFilteredCourses(filtered);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery, courses]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (teachersModal) {
        const lowerQuery = teacherSearchQuery.toLowerCase();
        const filtered = teachersModal.assignedTeachers.filter(
          (teacher) =>
            teacher.name.toLowerCase().includes(lowerQuery) ||
            teacher.email.toLowerCase().includes(lowerQuery) ||
            (teacher.phone &&
              teacher.phone.toLowerCase().includes(lowerQuery)) ||
            (teacher.subjects?.some((subject) =>
              subject.toLowerCase().includes(lowerQuery)
            ) ??
              false)
        );
        setFilteredTeachers(filtered);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [teacherSearchQuery, teachersModal]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuOpen && cardRefs.current.get(menuOpen)) {
        const cardElement = cardRefs.current.get(menuOpen);
        if (cardElement && !cardElement.contains(event.target as Node)) {
          setMenuOpen(null);
        }
      }
      if (
        (deleteModal || teachersModal || unassignModal) &&
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setDeleteModal(null);
        setTeachersModal(null);
        setUnassignModal(null);
        setSelectedTeachers([]);
        setTeacherSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen, deleteModal, teachersModal, unassignModal]);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .force-pointer,
      .force-pointer *,
      button,
      [role="button"],
      .cursor-pointer,
      input[type="button"],
      input[type="submit"],
      input[type="reset"],
      a[href],
      label[for],
      select,
      [tabindex]:not([tabindex="-1"]),
      [onclick] {
        cursor: pointer !important;
      }
      
      .force-pointer:hover,
      .force-pointer *:hover,
      button:hover,
      [role="button"]:hover,
      .cursor-pointer:hover {
        cursor: pointer !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleCreateCourse = () => {
    router.push("/admin/courses/create");
  };

  const handlePreviewClick = (courseId: string) => {
    if (!courseId) {
      toast.error("Course ID is missing");
      return;
    }
    router.push(`/admin/courses/${courseId}/preview`);
  };

  const handleAssignCourse = (courseId: string) => {
    if (!courseId) {
      toast.error("Course ID is missing");
      return;
    }
    router.push(`/admin/courses/${courseId}/assign`);
  };

  const handleEditCourse = (courseId: string) => {
    router.push(`/admin/courses/${courseId}/edit`);
    setMenuOpen(null);
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!user || !deviceId) {
      handleUnauthorized();
      return;
    }
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        handleUnauthorized();
        return;
      }
      await api.delete(`/courses/delete/${courseId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Device-Id": deviceId,
        },
      });
      setCourses(courses.filter((course) => course.courseId !== courseId));
      setFilteredCourses(
        filteredCourses.filter((course) => course.courseId !== courseId)
      );
      toast.success("Course deleted successfully");
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[Courses] Failed to delete course:", apiError);
      const errorMessage =
        apiError.response?.data?.message || "Failed to delete course";
      toast.error(errorMessage);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      }
    } finally {
      setDeleteModal(null);
      setMenuOpen(null);
    }
  };

  const handleUnassignTeachers = async (
    courseId: string,
    teacherIds: string[]
  ) => {
    if (!user || !deviceId) {
      handleUnauthorized();
      return;
    }
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        handleUnauthorized();
        return;
      }
      await api.post(
        "/courses/unassign-teacher",
        { courseId, teacherIds },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Device-Id": deviceId,
          },
        }
      );
      setCourses((prevCourses) =>
        prevCourses.map((course) =>
          course.courseId === courseId
            ? {
                ...course,
                assignedTeachers: course.assignedTeachers.filter(
                  (teacher) => !teacherIds.includes(teacher._id)
                ),
              }
            : course
        )
      );
      setFilteredCourses((prevCourses) =>
        prevCourses.map((course) =>
          course.courseId === courseId
            ? {
                ...course,
                assignedTeachers: course.assignedTeachers.filter(
                  (teacher) => !teacherIds.includes(teacher._id)
                ),
              }
            : course
        )
      );
      setTeachersModal((prev) =>
        prev
          ? {
              ...prev,
              assignedTeachers: prev.assignedTeachers.filter(
                (teacher) => !teacherIds.includes(teacher._id)
              ),
            }
          : null
      );
      setFilteredTeachers((prev) =>
        prev.filter((teacher) => !teacherIds.includes(teacher._id))
      );
      toast.success("Teacher(s) unassigned successfully");
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[Courses] Failed to unassign teachers:", apiError);
      const errorMessage =
        apiError.response?.data?.message || "Failed to unassign teacher(s)";
      toast.error(errorMessage);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      }
    } finally {
      setUnassignModal(null);
      setSelectedTeachers([]);
    }
  };

  const handleOpenDeleteModal = (courseId: string, courseTitle: string) => {
    setDeleteModal({ courseId, courseTitle });
    setMenuOpen(null);
  };

  const handleOpenTeachersModal = async (course: Course) => {
    if (!user || !deviceId) {
      handleUnauthorized();
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        handleUnauthorized();
        return;
      }
      const response = await api.get(
        `/courses/course/${course.courseId}/assigned-teachers`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Device-Id": deviceId,
          },
        }
      );
      const normalizedData = {
        ...response.data,
        assignedTeachers: response.data.assignedTeachers.map(
          (teacher: Teacher) => ({
            ...teacher,
            subjects: teacher.subjects || [],
          })
        ),
      };
      setTeachersModal(normalizedData);
      setFilteredTeachers(normalizedData.assignedTeachers || []);
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[Courses] Failed to fetch assigned teachers:", apiError);
      const errorMessage =
        apiError.response?.data?.message || "Failed to fetch assigned teachers";
      toast.error(errorMessage);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      }
    }
    setMenuOpen(null);
  };

  const handleSelectTeacher = (teacherId: string) => {
    setSelectedTeachers((prev) =>
      prev.includes(teacherId)
        ? prev.filter((id) => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const handleSelectAllTeachers = () => {
    if (selectedTeachers.length === filteredTeachers.length) {
      setSelectedTeachers([]);
    } else {
      setSelectedTeachers(filteredTeachers.map((teacher) => teacher._id));
    }
  };

  const handleOpenUnassignModal = (
    courseId: string,
    courseTitle: string,
    teacherIds: string[],
    teacherNames: string[]
  ) => {
    setUnassignModal({ courseId, courseTitle, teacherIds, teacherNames });
  };

  const truncateTitle = (text: string, maxLength: number = 20) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
  };

  const toggleMenu = (courseId: string, ref: HTMLDivElement) => {
    cardRefs.current.set(courseId, ref);
    setMenuOpen(menuOpen === courseId ? null : courseId);
  };

const getCardGradient = (index: number) => {
  const gradients = [
    "from-blue-600 to-cyan-400",
    "from-purple-600 to-indigo-400",
    "from-emerald-600 to-teal-400",
    "from-amber-500 to-orange-300",
    "from-rose-500 to-pink-400",
    "from-cyan-500 to-blue-400",
  ];
  return gradients[index % gradients.length];
};

  const getStatusColor = (index: number) => {
    const colors = [
      "bg-green-50 text-green-600 border-green-100",
      "bg-indigo-50 text-indigo-600 border-indigo-100",
      "bg-purple-50 text-purple-600 border-purple-100",
      "bg-yellow-50 text-yellow-600 border-yellow-100",
      "bg-red-50 text-red-300 border-red-50",
      "bg-blue-50 text-blue-600 border-blue-100",
    ];
    return colors[index % colors.length];
  };

  if (authLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-25 via-purple-25 to-pink-25">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
          className="relative"
        >
          <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full border-4 border-indigo-100"></div>
          <div className="absolute top-0 left-0 h-12 w-12 sm:h-16 sm:w-16 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin"></div>
          <div
            className="absolute top-1 left-1 h-10 w-10 sm:h-14 sm:w-14 rounded-full border-4 border-transparent border-t-purple-300 animate-spin"
            style={{ animationDirection: "reverse", animationDuration: "0.8s" }}
          ></div>
        </motion.div>
      </div>
    );
  }

  if (!user || !["Admin", "Super Admin"].includes(user.role?.roleName || "")) {
    router.push("/login");
    return null;
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-indigo-25 mt-10 via-purple-25/30 to-pink-25/50 force-pointer">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 sm:-top-40 -right-20 sm:-right-40 w-40 h-40 sm:w-80 sm:h-80 bg-gradient-to-br from-indigo-300/10 to-purple-500/10 rounded-full blur-2xl sm:blur-3xl"></div>
          <div className="absolute -bottom-20 sm:-bottom-40 -left-20 sm:-left-40 w-40 h-40 sm:w-80 sm:h-80 bg-gradient-to-tr from-purple-300/10 to-pink-500/10 rounded-full blur-2xl sm:blur-3xl"></div>
        </div>

        <div className="relative z-10 p-3 sm:p-6 md:p-8 pt-16 sm:pt-20">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:justify-between lg:items-center mb-6 sm:mb-10"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="relative">
                  <div className="p-2 sm:p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl sm:rounded-2xl shadow-lg">
                    <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-6 sm:h-6 bg-gradient-to-r from-yellow-300 to-orange-400 rounded-full flex items-center justify-center">
                    <Star className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
                    Course Management
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600 font-medium mt-1">
                    Create and manage your educational content
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <Button
                  onClick={handleCreateCourse}
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-4 sm:px-6 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 flex-1 sm:flex-none force-pointer"
                  style={{ cursor: "pointer" }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Create Course</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              </div>
            </motion.div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-gradient-to-r from-red-25 to-pink-25 border border-red-100 rounded-xl p-4 sm:p-5 mb-6 sm:mb-8 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg flex-shrink-0">
                    <X className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-red-700 text-sm sm:text-base">
                      Error
                    </h3>
                    <p className="text-red-600 text-sm break-words">{error}</p>
                  </div>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative mb-6 sm:mb-10"
            >
              <div className="relative max-w-full sm:max-w-xl">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/10 to-purple-400/10 rounded-xl sm:rounded-2xl blur-xl"></div>
                <div className="relative bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-indigo-100/50 p-1">
                  <div className="relative flex items-center">
                    <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2">
                      <div className="p-1.5 sm:p-2 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-lg">
                        <Search className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                      </div>
                    </div>
                    <Input
                      type="text"
                      placeholder="Search courses, teachers, or topics..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 sm:pl-16 pr-10 sm:pr-12 py-3 sm:py-4 bg-transparent border-0 focus:ring-0 text-gray-700 placeholder-gray-500 font-medium text-sm sm:text-base force-pointer"
                      style={{ cursor: "text" }}
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 hover:bg-indigo-50 rounded-lg p-1.5 sm:p-2 force-pointer"
                        onClick={() => setSearchQuery("")}
                        style={{ cursor: "pointer" }}
                      >
                        <X className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {fetchLoading ? (
              <div className="flex items-center justify-center min-h-[400px] sm:min-h-[500px]">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="text-center"
                >
                  <div className="relative mb-4 sm:mb-6">
                    <div className="h-16 w-16 sm:h-20 sm:w-20 mx-auto rounded-full border-4 border-indigo-100"></div>
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-16 w-16 sm:h-20 sm:w-20 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin"></div>
                    <div
                      className="absolute top-1 left-1/2 transform translate-x-0.5 h-14 w-14 sm:h-18 sm:w-18 rounded-full border-4 border-transparent border-t-purple-300 animate-spin"
                      style={{
                        animationDirection: "reverse",
                        animationDuration: "0.8s",
                      }}
                    ></div>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
                    Loading Courses
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600">
                    Please wait while we fetch your content...
                  </p>
                </motion.div>
              </div>
            ) : filteredCourses.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="text-center py-12 sm:py-20"
              >
                <div className="mx-auto w-48 h-48 sm:w-72 sm:h-72 mb-6 sm:mb-8">
                  <DotLottieReact
                    src="https://lottie.host/3dbd1dd9-1fa6-4176-b31c-d78f20294a85/WjSa8Bg9Y7.lottie"
                    loop
                    autoplay
                  />
                </div>
                <div className="max-w-sm sm:max-w-md mx-auto bg-white/60 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-xl border border-indigo-100/50">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
                    No Courses Found
                  </h2>
                  <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-6 sm:mb-8">
                    {searchQuery
                      ? `No courses match "${searchQuery}". Try adjusting your search terms.`
                      : "Ready to create your first course? Start building engaging educational content."}
                  </p>
                  {!searchQuery && (
                    <Button
                      onClick={handleCreateCourse}
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 force-pointer w-full sm:w-auto"
                      style={{ cursor: "pointer" }}
                    >
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Create Your First Course
                    </Button>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
                <AnimatePresence>
                  {filteredCourses.map((course, index) => (
                    <motion.div
                      key={course.courseId}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 20, scale: 0.95 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                      className="group relative"
                      ref={(el) => {
                        if (el) cardRefs.current.set(course.courseId, el);
                      }}
                    >
                      <Card
                        className="h-full bg-white/90 backdrop-blur-sm border border-indigo-100/50 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 sm:hover:-translate-y-2 group-hover:border-indigo-200/50 overflow-hidden force-pointer"
                        onClick={() => handlePreviewClick(course.courseId)}
                        style={{ cursor: "pointer" }}
                      >
                        <div
                          className={`relative h-24 sm:h-32 bg-gradient-to-br ${getCardGradient(
                            index
                          )} overflow-hidden`}
                        >
                          <div className="absolute inset-0 bg-black/5"></div>
                          <div className="absolute top-2 sm:top-4 right-2 sm:right-4 w-8 h-8 sm:w-16 sm:h-16 bg-white/5 rounded-full blur-lg sm:blur-xl"></div>
                          <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 w-6 h-6 sm:w-12 sm:h-12 bg-white/5 rounded-full blur-md sm:blur-lg"></div>

                          <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-20">
                            <AnimatePresence>
                              {menuOpen !== course.courseId ? (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-white/80 hover:text-white hover:bg-white/15 rounded-lg sm:rounded-xl p-1.5 sm:p-2 force-pointer transition-all duration-200 hover:scale-110 backdrop-blur-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const cardElement = cardRefs.current.get(
                                        course.courseId
                                      );
                                      if (cardElement)
                                        toggleMenu(
                                          course.courseId,
                                          cardElement
                                        );
                                    }}
                                    style={{ cursor: "pointer" }}
                                  >
                                    <MoreVertical className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </Button>
                                </motion.div>
                              ) : (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  transition={{ duration: 0.2 }}
                                  className="flex gap-1"
                                >
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-white hover:bg-white/15 rounded-lg sm:rounded-xl p-1.5 sm:p-2 force-pointer transition-all duration-200 hover:scale-110 backdrop-blur-sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditCourse(course.courseId);
                                        }}
                                        style={{ cursor: "pointer" }}
                                      >
                                        <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-gray-800 text-white">
                                      <p>Edit Course</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-white hover:bg-white/15 rounded-lg sm:rounded-xl p-1.5 sm:p-2 force-pointer transition-all duration-200 hover:scale-110 backdrop-blur-sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenTeachersModal(course);
                                        }}
                                        style={{ cursor: "pointer" }}
                                      >
                                        <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-gray-800 text-white">
                                      <p>View Teachers</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-white hover:bg-red-400/15 rounded-lg sm:rounded-xl p-1.5 sm:p-2 force-pointer transition-all duration-200 hover:scale-110 backdrop-blur-sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenDeleteModal(
                                            course.courseId,
                                            course.title
                                          );
                                        }}
                                        style={{ cursor: "pointer" }}
                                      >
                                        <Trash className="w-3 h-3 sm:w-4 sm:h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-gray-800 text-white">
                                      <p>Delete Course</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          <div className="absolute bottom-0 left-3 sm:left-6 transform translate-y-1/2">
                            <motion.div
                              whileHover={{ scale: 1.1, rotate: 5 }}
                              transition={{ type: "spring", stiffness: 300 }}
                              className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg sm:shadow-xl border-2 sm:border-4 border-white group-hover:shadow-xl sm:group-hover:shadow-2xl transition-all duration-500 force-pointer"
                              style={{ cursor: "pointer" }}
                            >
                              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-gray-700" />
                            </motion.div>
                          </div>

                          <div className="absolute bottom-2 sm:bottom-4 right-3 sm:right-6">
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              className="w-8 h-8 sm:w-10 sm:h-10 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center force-pointer"
                              style={{ cursor: "pointer" }}
                            >
                              <Play className="w-4 h-4 sm:w-5 sm:h-5 text-white ml-0.5" />
                            </motion.div>
                          </div>
                        </div>

                        <CardContent className="pt-8 sm:pt-10 px-4 sm:px-6 pb-4 sm:pb-6">
                          <h3
                            className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight group-hover:text-indigo-500 transition-colors duration-300 line-clamp-2 force-pointer"
                            title={course.title}
                            style={{ cursor: "pointer" }}
                          >
                            {truncateTitle(
                              course.title,
                              window.innerWidth < 640 ? 30 : 45
                            )}
                          </h3>

                          <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                            <div className="flex items-center justify-between">
                              <div
                                className="flex items-center gap-2 text-gray-600 force-pointer"
                                style={{ cursor: "pointer" }}
                              >
                                <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span className="text-xs sm:text-sm font-medium truncate">
                                  {course.duration}
                                </span>
                              </div>
                              <span
                                className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                                  index
                                )} flex-shrink-0 force-pointer`}
                                style={{ cursor: "pointer" }}
                              >
                                Active
                              </span>
                            </div>

                            <div
                              className="flex items-center gap-2 text-gray-600 force-pointer"
                              style={{ cursor: "pointer" }}
                            >
                              <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span className="text-xs sm:text-sm font-medium truncate">
                                {course.targetAudience}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-gray-500 text-xs sm:text-sm">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span className="truncate">
                                  {course.assignedTeachers.length > 0
                                    ? `${
                                        course.assignedTeachers.length
                                      } teacher${
                                        course.assignedTeachers.length > 1
                                          ? "s"
                                          : ""
                                      }`
                                    : "Not assigned"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline">
                                  {new Date(
                                    course.createdAt
                                  ).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                                <span className="sm:hidden">
                                  {new Date(
                                    course.createdAt
                                  ).toLocaleDateString("en-US", {
                                    month: "numeric",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 sm:space-y-3">
                            <Button
                              type="button"
                              className="w-full bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 force-pointer group/btn text-sm sm:text-base"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAssignCourse(course.courseId);
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                              }}
                              style={{ cursor: "pointer" }}
                            >
                              <span className="flex items-center justify-center gap-2">
                                <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline">
                                  Assign Course
                                </span>
                                <span className="sm:hidden">Assign</span>
                                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover/btn:translate-x-1 transition-transform duration-300" />
                              </span>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {deleteModal && (
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
                transition={{
                  duration: 0.3,
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                }}
                className="bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl p-6 sm:p-8 max-w-sm sm:max-w-md w-full shadow-2xl border border-indigo-100/50 mx-4"
              >
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-red-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg"
                  >
                    <Trash className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </motion.div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
                    Delete Course
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-6 sm:mb-8">
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-gray-900 break-words">
                      &quot;{deleteModal.courseTitle}&quot;
                    </span>
                    ? This action cannot be undone.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setDeleteModal(null)}
                      className="flex-1 border-indigo-100 hover:bg-indigo-25 rounded-lg sm:rounded-xl py-2.5 sm:py-3 font-semibold force-pointer order-2 sm:order-1"
                      style={{ cursor: "pointer" }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDeleteCourse(deleteModal.courseId)}
                      className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-lg sm:rounded-xl py-2.5 sm:py-3 font-semibold force-pointer order-1 sm:order-2"
                      style={{ cursor: "pointer" }}
                    >
                      Delete Course
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {teachersModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
            >
              <motion.div
                ref={modalRef}
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{
                  duration: 0.3,
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                }}
                className="bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-8 max-w-full sm:max-w-5xl w-full shadow-2xl border border-indigo-100/50 max-h-[90vh] overflow-hidden flex flex-col"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-indigo-100/50 gap-4 sm:gap-0">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                      Assigned Teachers
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600 font-medium bg-indigo-25 px-3 py-1 rounded-lg inline-block break-words">
                      {teachersModal?.courseTitle}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTeachersModal(null);
                      setSelectedTeachers([]);
                      setTeacherSearchQuery("");
                    }}
                    className="text-gray-400 hover:text-gray-600 hover:bg-indigo-25 rounded-xl p-2 sm:p-3 force-pointer flex-shrink-0"
                    style={{ cursor: "pointer" }}
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  </Button>
                </div>

                <div className="relative mb-4 sm:mb-6">
                  <div className="relative">
                    <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2">
                      <div className="p-1.5 sm:p-2 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-lg">
                        <Search className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                      </div>
                    </div>
                    <Input
                      type="text"
                      placeholder="Search teachers..."
                      value={teacherSearchQuery}
                      onChange={(e) => setTeacherSearchQuery(e.target.value)}
                      className="w-full pl-12 sm:pl-16 pr-10 sm:pr-12 py-3 sm:py-4 bg-indigo-25/80 border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all duration-300 placeholder-gray-400 text-gray-700 font-medium text-sm sm:text-base"
                      style={{ cursor: "text" }}
                    />
                    {teacherSearchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 hover:bg-indigo-25 rounded-lg p-1.5 sm:p-2 force-pointer"
                        onClick={() => setTeacherSearchQuery("")}
                        style={{ cursor: "pointer" }}
                      >
                        <X className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-hidden">
                  {filteredTeachers.length === 0 ? (
                    <div className="text-center py-8 sm:py-12">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-25 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                        <Users className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
                        No Teachers Found
                      </h3>
                      <p className="text-sm sm:text-base text-gray-500">
                        {teacherSearchQuery
                          ? "No teachers match your search criteria."
                          : "No teachers are currently assigned to this course."}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-indigo-25 to-purple-25 rounded-xl border border-indigo-100 gap-3 sm:gap-0">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={
                              selectedTeachers.length ===
                              filteredTeachers.length
                            }
                            onCheckedChange={handleSelectAllTeachers}
                            className="force-pointer"
                            style={{ cursor: "pointer" }}
                          />
                          <span className="text-sm sm:text-base font-semibold text-gray-700">
                            Select All ({selectedTeachers.length}/
                            {filteredTeachers.length})
                          </span>
                        </div>
                        {selectedTeachers.length > 0 && (
                          <Button
                            variant="destructive"
                            onClick={() =>
                              handleOpenUnassignModal(
                                teachersModal.courseId,
                                teachersModal.courseTitle,
                                selectedTeachers,
                                filteredTeachers
                                  .filter((t) =>
                                    selectedTeachers.includes(t._id)
                                  )
                                  .map((t) => t.name)
                              )
                            }
                            className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-xl px-4 sm:px-6 py-2 font-semibold force-pointer shadow-lg hover:shadow-xl transition-all duration-300 text-sm sm:text-base w-full sm:w-auto"
                            style={{ cursor: "pointer" }}
                          >
                            Unassign Selected ({selectedTeachers.length})
                          </Button>
                        )}
                      </div>

                      <div className="overflow-auto max-h-60 sm:max-h-80 rounded-xl border border-indigo-100 shadow-sm">
                        <Table>
                          <TableHeader className="bg-gradient-to-r from-indigo-25 to-purple-25">
                            <TableRow>
                              <TableHead className="w-[40px] sm:w-[50px] font-semibold text-gray-700 text-xs sm:text-sm"></TableHead>
                              <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm">
                                Name
                              </TableHead>
                              <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm hidden sm:table-cell">
                                Email
                              </TableHead>
                              <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm hidden lg:table-cell">
                                Phone
                              </TableHead>
                              <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm hidden md:table-cell">
                                Subjects
                              </TableHead>
                              <TableHead className="text-right font-semibold text-gray-700 text-xs sm:text-sm">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredTeachers.map((teacher) => (
                              <TableRow
                                key={teacher._id}
                                className="hover:bg-indigo-25 transition-colors force-pointer"
                                style={{ cursor: "pointer" }}
                              >
                                <TableCell className="py-2 sm:py-4">
                                  <Checkbox
                                    checked={selectedTeachers.includes(
                                      teacher._id
                                    )}
                                    onCheckedChange={() =>
                                      handleSelectTeacher(teacher._id)
                                    }
                                    className="force-pointer"
                                    style={{ cursor: "pointer" }}
                                  />
                                </TableCell>
                                <TableCell className="font-semibold text-gray-800 text-xs sm:text-sm py-2 sm:py-4">
                                  <div className="min-w-0">
                                    <div className="truncate">
                                      {teacher.name}
                                    </div>
                                    <div className="text-xs text-gray-500 sm:hidden truncate">
                                      {teacher.email}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-gray-600 text-xs sm:text-sm py-2 sm:py-4 hidden sm:table-cell">
                                  <div className="truncate max-w-[150px]">
                                    {teacher.email}
                                  </div>
                                </TableCell>
                                <TableCell className="text-gray-600 text-xs sm:text-sm py-2 sm:py-4 hidden lg:table-cell">
                                  {teacher.phone || "N/A"}
                                </TableCell>
                                <TableCell className="py-2 sm:py-4 hidden md:table-cell">
                                  <div className="flex gap-1 flex-wrap max-w-[200px]">
                                    {teacher.subjects &&
                                    teacher.subjects.length > 0 ? (
                                      teacher.subjects
                                        .slice(0, 2)
                                        .map((subject, index) => (
                                          <span
                                            key={index}
                                            className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg text-xs font-medium force-pointer"
                                            style={{ cursor: "pointer" }}
                                          >
                                            {subject}
                                          </span>
                                        ))
                                    ) : (
                                      <span className="text-gray-400 text-xs">
                                        No subjects
                                      </span>
                                    )}
                                    {teacher.subjects &&
                                      teacher.subjects.length > 2 && (
                                        <span className="text-gray-400 text-xs">
                                          +{teacher.subjects.length - 2}
                                        </span>
                                      )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right py-2 sm:py-4">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-400 hover:bg-red-25 hover:text-red-500 rounded-lg p-1.5 sm:p-2 force-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenUnassignModal(
                                        teachersModal.courseId,
                                        teachersModal.courseTitle,
                                        [teacher._id],
                                        [teacher.name]
                                      );
                                    }}
                                    style={{ cursor: "pointer" }}
                                  >
                                    <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {unassignModal && (
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
                transition={{
                  duration: 0.3,
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                }}
                className="bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl p-6 sm:p-8 max-w-sm sm:max-w-md w-full shadow-2xl border border-indigo-100/50 mx-4"
              >
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg"
                  >
                    <Users className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </motion.div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
                    Unassign Teachers
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-4 sm:mb-6">
                    Are you sure you want to unassign the following teacher
                    {unassignModal.teacherNames.length > 1 ? "s" : ""} from{" "}
                    <span className="font-semibold text-gray-900 break-words">
                      &quot;{unassignModal.courseTitle}&quot;
                    </span>
                    ?
                  </p>
                  <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-gradient-to-r from-indigo-25 to-purple-25 rounded-xl border border-indigo-100">
                    <p className="font-semibold text-gray-900 text-sm sm:text-base break-words">
                      {unassignModal.teacherNames.join(", ")}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setUnassignModal(null)}
                      className="flex-1 border-indigo-100 hover:bg-indigo-25 rounded-lg sm:rounded-xl py-2.5 sm:py-3 font-semibold force-pointer order-2 sm:order-1"
                      style={{ cursor: "pointer" }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() =>
                        handleUnassignTeachers(
                          unassignModal.courseId,
                          unassignModal.teacherIds
                        )
                      }
                      className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg sm:rounded-xl py-2.5 sm:py-3 font-semibold force-pointer order-1 sm:order-2"
                      style={{ cursor: "pointer" }}
                    >
                      Unassign
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}
