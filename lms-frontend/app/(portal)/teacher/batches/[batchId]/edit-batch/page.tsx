"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { ApiError } from "@/types";
import {
  Search,
  X,
  CheckCircle,
  AlertCircle,
  Trash2,
  Save,
  User,
  ChevronLeft,
  Users,
  UserPlus,
  GraduationCap,
  Mail,
  Phone,
  Sparkles,
  BookOpen,
  Award,
  Clock,
  Filter,
  SortAsc,
} from "lucide-react";
import Image from "next/image";

interface Student {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  profileImage?: string;
  subjects?: string[];
}

interface Batch {
  _id: string;
  name: string;
  studentIds: string[];
  students: Student[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 15,
    },
  },
};

const cardHoverVariants = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -4,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
};

export default function EditBatch() {
  const { user, loading: authLoading, deviceId } = useAuth();
  const router = useRouter();
  const params = useParams();
  const batchId = params.batchId as string;
  const [batch, setBatch] = useState<Batch | null>(null);
  const [batchName, setBatchName] = useState("");
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const modalRef = useRef<HTMLDivElement>(null);

  const handleUnauthorized = useCallback(() => {
    console.debug("[EditBatch] Handling unauthorized access");
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
      console.debug("[EditBatch] Redirecting due to invalid role or no user", {
        user: !!user,
        role: user?.role?.roleName,
        authLoading,
      });
      handleUnauthorized();
      return;
    }
  }, [user, authLoading, handleUnauthorized, router]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        if (!token || !deviceId) {
          console.debug("[EditBatch] Missing token or deviceId in fetchData", {
            token,
            deviceId,
          });
          handleUnauthorized();
          return;
        }

        const batchResponse = await api.get(
          `/courses/batches/teacher/${batchId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Device-Id": deviceId,
            },
          }
        );
        const batchData = batchResponse.data;
        setBatch({
          ...batchData,
          studentIds: batchData.studentIds || [],
        });
        setBatchName(batchData.name || "");

        const studentsResponse = await api.get(
          `/schedule/students?teacherId=${user?._id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Device-Id": deviceId,
            },
          }
        );
        const allStudents = studentsResponse.data.students || [];
        setAvailableStudents(allStudents);
        setFilteredStudents(
          allStudents.filter(
            (student: Student) => !batchData.studentIds?.includes(student._id)
          )
        );
      } catch (error) {
        const apiError = error as ApiError;
        console.error("API Error:", apiError);
        if (apiError.response?.status === 401) {
          handleUnauthorized();
        } else {
          setError(
            apiError.response?.data?.message ||
              "Failed to fetch batch or students"
          );
          toast.error(
            apiError.response?.data?.message ||
              "Failed to fetch batch or students"
          );
        }
      } finally {
        setLoading(false);
      }
    };

    if (user && user.role?.roleName === "Teacher") {
      fetchData();
    }
  }, [user, batchId, deviceId, handleUnauthorized]);

  const filteredStudentsMemo = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    return availableStudents.filter(
      (student) =>
        !batch?.studentIds.includes(student._id) &&
        (student.name.toLowerCase().includes(lowerQuery) ||
          student.email.toLowerCase().includes(lowerQuery))
    );
  }, [searchQuery, availableStudents, batch]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setFilteredStudents(filteredStudentsMemo);
    }, 300);
    return () => clearTimeout(handler);
  }, [filteredStudentsMemo]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        confirmModal &&
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setConfirmModal(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [confirmModal]);

  const handleUpdateBatch = async () => {
    if (!batch || !batchName.trim()) {
      toast.error("Batch name is required");
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      if (!token || !deviceId) {
        console.debug(
          "[EditBatch] Missing token or deviceId in handleUpdateBatch",
          { token, deviceId }
        );
        handleUnauthorized();
        return;
      }

      const response = await api.put(
        `/courses/batch/edit-students/${batch._id}`,
        {
          name: batchName,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Device-Id": deviceId,
          },
        }
      );
      toast.success(response.data.message || "Batch updated successfully");
      router.push("/teacher/courses?tab=batch");
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        toast.error(
          apiError.response?.data?.message || "Failed to update batch"
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStudentSelect = (studentId: string) => {
    if (batch?.studentIds.includes(studentId)) return;
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleRemoveStudent = async (student: Student) => {
    if (!batch) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      if (!token || !deviceId) {
        console.debug(
          "[EditBatch] Missing token or deviceId in handleRemoveStudent",
          { token, deviceId }
        );
        handleUnauthorized();
        return;
      }

      const response = await api.put(
        `/courses/batch/edit-students/${batch._id}`,
        {
          removeStudentIds: [student._id],
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Device-Id": deviceId,
          },
        }
      );
      setBatch({
        ...batch,
        studentIds: batch.studentIds.filter((id) => id !== student._id),
        students: batch.students.filter((s) => s._id !== student._id),
      });
      setFilteredStudents([...filteredStudents, student]);
      toast.success(response.data.message || "Student removed from batch");
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        toast.error(
          apiError.response?.data?.message || "Failed to remove student"
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddStudents = async () => {
    if (!batch || selectedStudents.length === 0) {
      toast.error("No students selected to add");
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      if (!token || !deviceId) {
        console.debug(
          "[EditBatch] Missing token or deviceId in handleAddStudents",
          { token, deviceId }
        );
        handleUnauthorized();
        return;
      }

      const response = await api.put(
        `/courses/batch/edit-students/${batch._id}`,
        {
          addStudentIds: selectedStudents,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Device-Id": deviceId,
          },
        }
      );
      const newStudents = availableStudents.filter((s) =>
        selectedStudents.includes(s._id)
      );
      setBatch({
        ...batch,
        studentIds: [...batch.studentIds, ...selectedStudents],
        students: [...batch.students, ...newStudents],
      });
      setFilteredStudents(
        filteredStudents.filter((s) => !selectedStudents.includes(s._id))
      );
      setSelectedStudents([]);
      toast.success(response.data.message || "Students added to batch");
      router.push("/teacher/courses?tab=batch");
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        toast.error(
          apiError.response?.data?.message || "Failed to add students"
        );
      }
    } finally {
      setSaving(false);
      setConfirmModal(false);
    }
  };

  const truncateText = (text: string, maxLength = 18) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
  };

  if (authLoading || loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 via-transparent to-purple-100/20"></div>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)",
              backgroundSize: "60px 60px",
            }}
          ></div>
        </div>
        <motion.div
          className="relative flex flex-col items-center space-y-6"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
              className="h-16 w-16"
            >
              <div className="h-full w-full rounded-full border-4 border-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-1">
                <div className="h-full w-full rounded-full bg-white"></div>
              </div>
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-xl"
            ></motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Loading Batch Details
            </h3>
            <p className="text-gray-600">Preparing your workspace...</p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (!user || user.role?.roleName !== "Teacher") {
    router.push("/login");
    return null;
  }

  if (!batch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
        <div className="absolute inset-0 opacity-20">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)",
              backgroundSize: "60px 60px",
            }}
          ></div>
        </div>
        <div className="relative max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-2xl rounded-2xl shadow-xl p-12 border border-gray-200"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            >
              <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            </motion.div>
            <h2 className="text-3xl font-bold text-gray-800 mb-3">
              Batch Not Found
            </h2>
            <p className="text-gray-600 text-lg">
              The requested batch could not be located in our system.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6 mt-8 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-purple-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-blue-200/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-200/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 opacity-30">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.08) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.08) 0%, transparent 50%)",
            backgroundSize: "60px 60px",
          }}
        ></div>
      </div>

      <motion.div
        className="relative max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Enhanced Header Section */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col lg:flex-row justify-between items-start mb-8 gap-6"
        >
          <div className="flex items-center gap-6">
            <motion.div
              whileHover={{ scale: 1.05, rotate: -5 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <Button
                variant="ghost"
                onClick={() => router.push("/teacher/courses")}
                className="relative text-gray-600 hover:text-gray-800 hover:bg-white/60 rounded-xl p-3 transition-all duration-300 border border-gray-200 hover:border-gray-300 backdrop-blur-sm group overflow-hidden shadow-md"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <ChevronLeft className="w-5 h-5 relative z-10" />
              </Button>
            </motion.div>
            <div>
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="flex items-center gap-2 mb-1"
              >
                <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
                <span className="text-yellow-600 font-semibold">
                  Premium Editor
                </span>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 tracking-tight leading-tight"
              >
                Edit Batch
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, type: "spring" }}
                className="text-gray-700 text-lg mt-1 font-medium"
              >
                {batch.name}
              </motion.p>
            </div>
          </div>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <div className="flex items-center gap-4 bg-white/80 backdrop-blur-2xl rounded-xl px-6 py-3 border border-gray-200 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg shadow-md">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-gray-800 font-bold text-lg">
                    {batch.students.length}
                  </p>
                  <p className="text-gray-600 text-xs">Enrolled</p>
                </div>
              </div>
              <div className="w-px h-6 bg-gray-300"></div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-md">
                  <UserPlus className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-gray-800 font-bold text-lg">
                    {filteredStudents.length}
                  </p>
                  <p className="text-gray-600 text-xs">Available</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-100 to-orange-100 backdrop-blur-sm rounded-xl px-3 py-2 border border-yellow-300">
              <Award className="w-4 h-4 text-yellow-600" />
              <span className="text-yellow-700 font-semibold text-sm">
                Active
              </span>
            </div>
          </motion.div>
        </motion.div>

        {/* Enhanced Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative bg-gradient-to-r from-red-50 to-pink-50 backdrop-blur-2xl border border-red-200 rounded-2xl p-6 mb-6 shadow-lg overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-100/50 to-pink-100/50 animate-pulse"></div>
            <div className="relative flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                className="p-2 bg-red-100 rounded-xl"
              >
                <AlertCircle className="w-6 h-6 text-red-600" />
              </motion.div>
              <div>
                <h3 className="text-red-700 font-bold text-lg mb-1">
                  System Alert
                </h3>
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Compact Batch Details Section */}
        <motion.div
          variants={itemVariants}
          className="relative bg-white/80 backdrop-blur-2xl rounded-2xl shadow-lg border border-gray-200 p-6 mb-6 overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-purple-50/50 to-pink-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg"
              >
                <GraduationCap className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Batch Configuration
                </h2>
                <p className="text-gray-600 text-sm">
                  Customize your batch settings
                </p>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row items-stretch gap-4">
              <div className="flex-1 relative">
                <Input
                  type="text"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  className="w-full h-12 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-300 text-lg font-semibold bg-white/80 backdrop-blur-sm text-gray-800 placeholder-gray-500 shadow-md"
                  placeholder="Enter batch name"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative"
              >
                <Button
                  onClick={handleUpdateBatch}
                  disabled={saving || !batchName.trim()}
                  className="h-12 px-8 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white rounded-xl shadow-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center gap-2">
                    <motion.div
                      animate={saving ? { rotate: 360 } : {}}
                      transition={{
                        duration: 1,
                        repeat: saving ? Number.POSITIVE_INFINITY : 0,
                      }}
                    >
                      <Save className="w-5 h-5" />
                    </motion.div>
                    {saving ? "Saving..." : "Save Changes"}
                  </div>
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Compact Current Students Section */}
        <motion.div
          variants={itemVariants}
          className="relative bg-white/80 backdrop-blur-2xl rounded-2xl shadow-lg border border-gray-200 p-6 mb-6 overflow-hidden"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg"
              >
                <Users className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Current Students
                </h2>
                <p className="text-gray-600 text-sm">
                  {batch.students.length} students enrolled
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-300"
              >
                <Filter className="w-4 h-4 text-gray-600" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-300"
              >
                <SortAsc className="w-4 h-4 text-gray-600" />
              </motion.button>
            </div>
          </div>

          {batch.students.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                className="mb-4"
              >
                <Users className="w-16 h-16 text-gray-400 mx-auto" />
              </motion.div>
              <h3 className="text-lg font-bold text-gray-700 mb-2">
                No Students Enrolled
              </h3>
              <p className="text-gray-500 mb-4">
                Start building your batch by adding students from below
              </p>
              <div className="flex justify-center">
                <div className="px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl border border-purple-200">
                  <span className="text-purple-700 font-semibold text-sm">
                    Ready to add students
                  </span>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              <AnimatePresence>
                {batch.students.map((student, index) => (
                  <motion.div
                    key={student._id}
                    variants={cardHoverVariants}
                    initial="rest"
                    whileHover="hover"
                    animate="rest"
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    transition={{ duration: 0.3, delay: index * 0.03 }}
                    className="group relative"
                    ref={(el) => {
                      if (el) cardRefs.current.set(student._id, el);
                    }}
                  >
                    <Card className="overflow-hidden bg-gradient-to-br from-white to-gray-50 backdrop-blur-2xl border border-gray-200 rounded-2xl shadow-md h-full group-hover:border-emerald-300 transition-all duration-300 relative">
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-100/50 via-teal-100/50 to-cyan-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>

                      <CardContent className="p-4 h-full flex flex-col relative z-10">
                        {/* Status Badge */}
                        <div className="absolute top-2 right-2 z-20">
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{
                              duration: 2,
                              repeat: Number.POSITIVE_INFINITY,
                            }}
                            className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-md"
                          >
                            <CheckCircle className="w-3 h-3 text-white" />
                          </motion.div>
                        </div>

                        {/* Profile Section */}
                        <div className="flex items-center justify-center mb-3">
                          {student.profileImage ? (
                            <div className="relative">
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                className="relative"
                              >
                                <Image
                                  src={
                                    student.profileImage || "/placeholder.svg"
                                  }
                                  alt={student.name}
                                  width={64}
                                  height={64}
                                  className="w-16 h-16 rounded-xl object-cover border-2 border-emerald-300 shadow-lg"
                                />
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-emerald-500/20 to-transparent"></div>
                              </motion.div>
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-md border border-white">
                                <Award className="w-3 h-3 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="relative">
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center border-2 border-emerald-300 shadow-lg backdrop-blur-sm"
                              >
                                <User className="w-8 h-8 text-emerald-600" />
                              </motion.div>
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-md border border-white">
                                <Award className="w-3 h-3 text-white" />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Student Info */}
                        <div className="text-center mb-3 flex-grow">
                          <motion.h3
                            whileHover={{ scale: 1.05 }}
                            className="text-lg font-bold text-gray-800 group-hover:text-emerald-700 transition-colors duration-300 mb-2"
                            title={student.name}
                          >
                            {truncateText(student.name, 14)}
                          </motion.h3>

                          <div className="space-y-2">
                            <div className="flex items-center justify-center gap-2 text-gray-600 bg-gray-50 rounded-lg p-2 backdrop-blur-sm">
                              <Mail className="w-3 h-3 text-blue-500 flex-shrink-0" />
                              <span
                                className="text-xs truncate max-w-[100px]"
                                title={student.email}
                              >
                                {student.email}
                              </span>
                            </div>

                            {student.phone && (
                              <div className="flex items-center justify-center gap-2 text-gray-600 bg-gray-50 rounded-lg p-2 backdrop-blur-sm">
                                <Phone className="w-3 h-3 text-green-500 flex-shrink-0" />
                                <span className="text-xs">{student.phone}</span>
                              </div>
                            )}
                          </div>

                          {/* Subjects */}
                          {student.subjects && student.subjects.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-1 mt-2">
                              {student.subjects
                                .slice(0, 2)
                                .map((subject, idx) => (
                                  <motion.span
                                    key={idx}
                                    whileHover={{ scale: 1.1 }}
                                    className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold border border-blue-200 backdrop-blur-sm"
                                  >
                                    <BookOpen className="w-2 h-2 inline mr-1" />
                                    {subject}
                                  </motion.span>
                                ))}
                              {student.subjects.length > 2 && (
                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-semibold border border-gray-200">
                                  +{student.subjects.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Hover overlay with enhanced effects */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-2xl flex items-center justify-center z-30">
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            whileHover={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.2 }}
                            className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300"
                          >
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveStudent(student);
                              }}
                              className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-xl px-4 py-2 shadow-lg font-bold text-sm transition-all duration-300 hover:scale-105 border border-red-400/50"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Remove
                            </Button>
                          </motion.div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Compact Add Students Section */}
        {filteredStudents.length > 0 && (
          <motion.div
            variants={itemVariants}
            className="relative bg-white/80 backdrop-blur-2xl rounded-2xl shadow-lg border border-gray-200 p-6 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-50/50 via-pink-50/50 to-blue-50/50 animate-pulse"></div>

            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                    className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg"
                  >
                    <UserPlus className="w-6 h-6 text-white" />
                  </motion.div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      Add New Students
                    </h2>
                    <p className="text-gray-600 text-sm">
                      {selectedStudents.length} of {filteredStudents.length}{" "}
                      students selected
                    </p>
                  </div>
                </div>

                {selectedStudents.length > 0 && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-gradient-to-r from-purple-100 to-pink-100 backdrop-blur-sm rounded-xl px-4 py-2 border border-purple-200"
                  >
                    <span className="text-purple-700 font-bold">
                      {selectedStudents.length} Selected
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Compact Search Bar */}
              <div className="relative mb-6">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                  <Search className="w-5 h-5 text-gray-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Search by student name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-12 pr-12 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-300 bg-white/80 backdrop-blur-sm text-gray-800 placeholder-gray-500 shadow-md"
                />
                {searchQuery && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-gray-100 rounded-lg p-2 transition-all duration-300"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                    </Button>
                  </motion.div>
                )}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>

              {/* Compact Students Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 mb-6">
                <AnimatePresence>
                  {filteredStudents.map((student, index) => (
                    <motion.div
                      key={student._id}
                      variants={cardHoverVariants}
                      initial="rest"
                      whileHover="hover"
                      animate="rest"
                      exit={{ opacity: 0, scale: 0.8, y: 20 }}
                      transition={{ duration: 0.3, delay: index * 0.02 }}
                      className="group relative"
                      ref={(el) => {
                        if (el) cardRefs.current.set(student._id, el);
                      }}
                    >
                      <Card
                        className={`overflow-hidden backdrop-blur-2xl border-2 rounded-2xl shadow-md h-full cursor-pointer transition-all duration-300 relative ${
                          selectedStudents.includes(student._id)
                            ? "bg-gradient-to-br from-purple-100 to-pink-100 border-purple-300 ring-2 ring-purple-200"
                            : "bg-gradient-to-br from-white to-gray-50 border-gray-200 hover:border-purple-300"
                        }`}
                        onClick={() => handleStudentSelect(student._id)}
                      >
                        {/* Selection glow effect */}
                        <div
                          className={`absolute inset-0 bg-gradient-to-r from-purple-100/50 via-pink-100/50 to-blue-100/50 opacity-0 transition-opacity duration-300 rounded-2xl ${
                            selectedStudents.includes(student._id)
                              ? "opacity-100"
                              : "group-hover:opacity-50"
                          }`}
                        ></div>

                        <CardContent className="p-4 h-full flex flex-col relative z-10">
                          {/* Selection indicator */}
                          <div className="absolute top-2 right-2 z-20">
                            <motion.div
                              animate={
                                selectedStudents.includes(student._id)
                                  ? { scale: [1, 1.2, 1] }
                                  : {}
                              }
                              transition={{ duration: 0.5 }}
                              className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-all duration-300 ${
                                selectedStudents.includes(student._id)
                                  ? "bg-gradient-to-r from-purple-500 to-pink-500"
                                  : "bg-gray-200 group-hover:bg-purple-300"
                              }`}
                            >
                              <CheckCircle className="w-3 h-3 text-white" />
                            </motion.div>
                          </div>

                          {/* Profile Section */}
                          <div className="flex items-center justify-center mb-3">
                            {student.profileImage ? (
                              <div className="relative">
                                <motion.div
                                  whileHover={{ scale: 1.1 }}
                                  className="relative"
                                >
                                  <Image
                                    src={
                                      student.profileImage || "/placeholder.svg"
                                    }
                                    alt={student.name}
                                    width={64}
                                    height={64}
                                    className={`w-16 h-16 rounded-xl object-cover border-2 shadow-lg transition-all duration-300 ${
                                      selectedStudents.includes(student._id)
                                        ? "border-purple-400"
                                        : "border-gray-300 group-hover:border-purple-400"
                                    }`}
                                  />
                                  <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-purple-500/20 to-transparent"></div>
                                </motion.div>
                                <div
                                  className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-md border border-white transition-all duration-300 ${
                                    selectedStudents.includes(student._id)
                                      ? "bg-gradient-to-r from-purple-500 to-pink-500"
                                      : "bg-gray-200 group-hover:bg-purple-400"
                                  }`}
                                >
                                  <Clock className="w-3 h-3 text-white" />
                                </div>
                              </div>
                            ) : (
                              <div className="relative">
                                <motion.div
                                  whileHover={{ scale: 1.1 }}
                                  className={`w-16 h-16 rounded-xl bg-gradient-to-br flex items-center justify-center border-2 shadow-lg backdrop-blur-sm transition-all duration-300 ${
                                    selectedStudents.includes(student._id)
                                      ? "from-purple-200 to-pink-200 border-purple-400"
                                      : "from-gray-100 to-gray-200 border-gray-300 group-hover:border-purple-400 group-hover:from-purple-100 group-hover:to-pink-100"
                                  }`}
                                >
                                  <User
                                    className={`w-8 h-8 transition-colors duration-300 ${
                                      selectedStudents.includes(student._id)
                                        ? "text-purple-600"
                                        : "text-gray-500 group-hover:text-purple-600"
                                    }`}
                                  />
                                </motion.div>
                                <div
                                  className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-md border border-white transition-all duration-300 ${
                                    selectedStudents.includes(student._id)
                                      ? "bg-gradient-to-r from-purple-500 to-pink-500"
                                      : "bg-gray-200 group-hover:bg-purple-400"
                                  }`}
                                >
                                  <Clock className="w-3 h-3 text-white" />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Student Info */}
                          <div className="text-center mb-3 flex-grow">
                            <motion.h3
                              whileHover={{ scale: 1.05 }}
                              className={`text-lg font-bold mb-2 transition-colors duration-300 ${
                                selectedStudents.includes(student._id)
                                  ? "text-purple-700"
                                  : "text-gray-800 group-hover:text-purple-700"
                              }`}
                              title={student.name}
                            >
                              {truncateText(student.name, 14)}
                            </motion.h3>

                            <div className="space-y-2">
                              <div className="flex items-center justify-center gap-2 text-gray-600 bg-gray-50 rounded-lg p-2 backdrop-blur-sm">
                                <Mail className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                <span
                                  className="text-xs truncate max-w-[100px]"
                                  title={student.email}
                                >
                                  {student.email}
                                </span>
                              </div>

                              {student.phone && (
                                <div className="flex items-center justify-center gap-2 text-gray-600 bg-gray-50 rounded-lg p-2 backdrop-blur-sm">
                                  <Phone className="w-3 h-3 text-green-500 flex-shrink-0" />
                                  <span className="text-xs">
                                    {student.phone}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Subjects */}
                            {student.subjects &&
                              student.subjects.length > 0 && (
                                <div className="flex flex-wrap justify-center gap-1 mt-2">
                                  {student.subjects
                                    .slice(0, 2)
                                    .map((subject, idx) => (
                                      <motion.span
                                        key={idx}
                                        whileHover={{ scale: 1.1 }}
                                        className="bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 px-2 py-1 rounded-full text-xs font-semibold border border-blue-200 backdrop-blur-sm"
                                      >
                                        <BookOpen className="w-2 h-2 inline mr-1" />
                                        {subject}
                                      </motion.span>
                                    ))}
                                  {student.subjects.length > 2 && (
                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-semibold border border-gray-200">
                                      +{student.subjects.length - 2}
                                    </span>
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

              {/* Compact Add Students Button */}
              <div className="flex justify-end">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative"
                >
                  <Button
                    onClick={() => setConfirmModal(true)}
                    disabled={saving || selectedStudents.length === 0}
                    className="h-12 px-8 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-700 hover:via-pink-700 hover:to-blue-700 text-white rounded-xl shadow-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center gap-3">
                      <motion.div
                        animate={
                          saving
                            ? { rotate: 360 }
                            : selectedStudents.length > 0
                            ? { scale: [1, 1.2, 1] }
                            : {}
                        }
                        transition={{
                          duration: saving ? 1 : 2,
                          repeat: saving
                            ? Number.POSITIVE_INFINITY
                            : selectedStudents.length > 0
                            ? Number.POSITIVE_INFINITY
                            : 0,
                        }}
                      >
                        <UserPlus className="w-5 h-5" />
                      </motion.div>
                      {saving
                        ? "Adding Students..."
                        : `Add ${selectedStudents.length} Student${
                            selectedStudents.length !== 1 ? "s" : ""
                          }`}
                    </div>
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Compact Confirmation Modal */}
        <AnimatePresence>
          {confirmModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
            >
              <motion.div
                ref={modalRef}
                initial={{ scale: 0.8, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 50 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="bg-white/95 backdrop-blur-2xl rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-200 relative overflow-hidden"
              >
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 animate-pulse"></div>

                <div className="relative text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg"
                  >
                    <UserPlus className="w-8 h-8 text-white" />
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-2xl font-bold text-gray-800 mb-2"
                  >
                    Confirm Student Addition
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-gray-600 mb-6 leading-relaxed"
                  >
                    You&apos;re about to add{" "}
                    <span className="font-bold text-purple-600 text-xl">
                      {selectedStudents.length}
                    </span>{" "}
                    {selectedStudents.length === 1 ? "student" : "students"} to
                    this batch.
                    <br />
                    <span className="text-sm text-gray-500 mt-1 block">
                      This action will enroll them immediately.
                    </span>
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex gap-3"
                  >
                    <Button
                      variant="outline"
                      onClick={() => setConfirmModal(false)}
                      className="flex-1 h-12 border-2 border-gray-300 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddStudents}
                      disabled={saving}
                      className="flex-1 h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold shadow-lg transition-all duration-300 disabled:opacity-50 relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative flex items-center gap-2">
                        <motion.div
                          animate={saving ? { rotate: 360 } : {}}
                          transition={{
                            duration: 1,
                            repeat: saving ? Number.POSITIVE_INFINITY : 0,
                          }}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </motion.div>
                        {saving ? "Adding..." : "Confirm"}
                      </div>
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
