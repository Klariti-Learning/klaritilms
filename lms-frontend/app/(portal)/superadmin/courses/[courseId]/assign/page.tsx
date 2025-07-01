"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  User,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { ApiError } from "@/types";
import Image from "next/image";

interface Teacher {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  profileImage?: string;
  subjects: string[];
}

export default function AssignTeachers() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { courseId } = useParams();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [assignedTeachers, setAssignedTeachers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [fetchLoading, setFetchLoading] = useState(true);
  const [assignLoading, setAssignLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState(false);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      !user ||
      !user.role ||
      !["Admin", "Super Admin"].includes(user.role.roleName)
    ) {
      router.push("/my-learnings");
    }
  }, [user, router]);

  useEffect(() => {
    const fetchTeachers = async () => {
      setFetchLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("No authentication token found");
        }
        const response = await api.get("/auth/teachers");
        const fetchedTeachers = response.data.teachers || [];
        setTeachers(fetchedTeachers);
        setFilteredTeachers(fetchedTeachers);
      } catch (error) {
        const apiError = error as ApiError;
        setError(apiError.response?.data?.message || "Failed to fetch teachers");
        toast.error(apiError.response?.data?.message || "Failed to fetch teachers");
      } finally {
        setFetchLoading(false);
      }
    };

    if (user && ["Admin", "Super Admin"].includes(user.role?.roleName || "")) {
      fetchTeachers();
    } else if (!authLoading) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchAssignedTeachers = async () => {
      try {
        const response = await api.get(
          `/courses/course/${courseId}/assigned-teachers`
        );
        const assigned = response.data.assignedTeachers.map(
          (teacher: Teacher) => teacher._id
        );
        setAssignedTeachers(assigned);
      } catch (error) {
        const apiError = error as ApiError;
        toast.error(apiError.response?.data?.message || "Failed to fetch assigned teachers");
      }
    };

    if (
      courseId &&
      user &&
      ["Admin", "Super Admin"].includes(user.role?.roleName || "")
    ) {
      fetchAssignedTeachers();
    }
  }, [courseId, user]);

  useEffect(() => {
    const handler = setTimeout(() => {
      const lowerQuery = searchQuery.toLowerCase();
      const filtered = teachers.filter(
        (teacher) =>
          teacher.name.toLowerCase().includes(lowerQuery) ||
          teacher.email.toLowerCase().includes(lowerQuery) ||
          (teacher.phone || "").toLowerCase().includes(lowerQuery)
      );
      setFilteredTeachers(filtered);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery, teachers]);

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

  const handleTeacherSelect = (teacherId: string) => {
    if (assignedTeachers.includes(teacherId)) return;
    setSelectedTeachers((prev) =>
      prev.includes(teacherId)
        ? prev.filter((id) => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const handleAssignTeachers = async () => {
    const teachersToAssign = selectedTeachers.filter(
      (id) => !assignedTeachers.includes(id)
    );
    if (teachersToAssign.length === 0) {
      toast.error("No unassigned teachers selected to assign");
      return;
    }

    setAssignLoading(true);
    try {
      await api.post("/courses/assign-teacher", {
        courseId,
        teacherIds: teachersToAssign,
      });
      toast.success("Course assigned successfully to selected teachers");
      router.push("/superadmin/courses");
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(apiError.response?.data?.message || "Failed to assign course");
    } finally {
      setAssignLoading(false);
      setConfirmModal(false);
    }
  };

  const truncateText = (text: string, maxLength: number = 20) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
  };

  if (authLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-100/80">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-16 w-16 text-indigo-600"
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

  if (!user || !["Admin", "Super Admin"].includes(user.role?.roleName || "")) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 p-6 md:p-8 mt-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-4">
          <div className="flex items-center gap-4 ml-35">
            <Button
              variant="ghost"
              onClick={() => router.push("/superadmin/courses")}
              className="text-indigo-600 hover:bg-indigo-100/50 rounded-full p-2 cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight">
              Assign Teachers
            </h1>
          </div>
          <Button
            onClick={() => setConfirmModal(true)}
            disabled={
              assignLoading ||
              selectedTeachers.filter((id) => !assignedTeachers.includes(id))
                .length === 0
            }
            className="group relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-3 px-6 md:px-8 rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 ease-in-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="relative z-10 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 group-hover:animate-pulse" />
              Assign Selected Teachers
            </span>
            <span className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
          </Button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl mb-8 shadow-md"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          </motion.div>
        )}

        <div className="relative mb-10 ml-35">
          <div className="relative flex items-center">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by teacher name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-3 bg-white/90 backdrop-blur-sm rounded-xl shadow-md focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300 placeholder-gray-400 text-gray-700"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-3 top-1/2 -translate-y-1/2 hover:bg-gray-100/50 rounded-full p-2 cursor-pointer"
                onClick={() => setSearchQuery("")}
              >
                <X className="w-5 h-5 text-gray-500 hover:text-gray-700 transition-colors" />
              </Button>
            )}
          </div>
        </div>

        {fetchLoading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="h-16 w-16 text-indigo-600 ml-35"
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
        ) : filteredTeachers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="text-center mt-16 ml-35"
          >
            <div className="mx-auto w-80 h-80">
              <DotLottieReact
                src="https://lottie.host/3dbd1dd9-1fa6-4176-b31c-d78f20294a85/WjSa8Bg9Y7.lottie"
                loop
                autoplay
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              No Teachers Available
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              No teachers found. Try adjusting the search or add new teachers to
              assign this course.
            </p>
          </motion.div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence>
              {filteredTeachers.map((teacher) => (
                <motion.div
                  key={teacher._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="group relative w-full ml-35"
                  ref={(el) => {
                    if (el) cardRefs.current.set(teacher._id, el);
                  }}
                >
                  <Card
                    className={`overflow-hidden bg-white/95 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-lg transition-all duration-500 h-full flex flex-col ${
                      assignedTeachers.includes(teacher._id)
                        ? "opacity-75 cursor-not-allowed"
                        : selectedTeachers.includes(teacher._id)
                        ? "ring-2 ring-indigo-500 cursor-pointer hover:shadow-2xl hover:-translate-y-2"
                        : "cursor-pointer hover:shadow-2xl hover:-translate-y-2"
                    }`}
                    onClick={() =>
                      !assignedTeachers.includes(teacher._id) &&
                      handleTeacherSelect(teacher._id)
                    }
                  >
                    <CardContent className="space-y-4 flex-grow p-6">
                      <div className="flex items-center justify-center">
                        {teacher.profileImage ? (
                          <Image
                            src={teacher.profileImage}
                            alt={teacher.name}
                            width={96}
                            height={96}
                            className={`w-24 h-24 rounded-full object-cover border-2 ${
                              assignedTeachers.includes(teacher._id)
                                ? "border-green-200"
                                : "border-indigo-200 group-hover:border-indigo-400"
                            } transition-colors duration-300`}
                          />
                        ) : (
                          <div
                            className={`w-24 h-24 rounded-full bg-indigo-100 flex items-center justify-center border-2 ${
                              assignedTeachers.includes(teacher._id)
                                ? "border-green-200"
                                : "border-indigo-200 group-hover:border-indigo-400"
                            } transition-colors duration-300`}
                          >
                            <User className="w-12 h-12 text-indigo-500" />
                          </div>
                        )}
                      </div>
                      <h3
                        className={`text-xl font-semibold text-gray-900 text-center ${
                          assignedTeachers.includes(teacher._id)
                            ? "text-gray-600"
                            : "group-hover:text-indigo-600"
                        } transition-colors duration-300`}
                        title={teacher.name}
                      >
                        {truncateText(teacher.name)}
                        {assignedTeachers.includes(teacher._id) && (
                          <span className="ml-2 text-sm text-green-600 font-medium">
                            (Assigned)
                          </span>
                        )}
                      </h3>
                      <div className="space-y-3 text-sm text-gray-600">
                        <div className="flex items-center gap-2 justify-center">
                          <span className="truncate">{teacher.email}</span>
                        </div>
                        {teacher.phone && (
                          <div className="flex items-center gap-2 justify-center">
                            <span className="truncate">{teacher.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 justify-center flex-wrap">
                          {teacher.subjects.map((subject, index) => (
                            <span
                              key={index}
                              className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs"
                            >
                              {subject}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="absolute top-4 right-4">
                        <CheckCircle
                          className={`w-6 h-6 ${
                            assignedTeachers.includes(teacher._id)
                              ? "text-green-500"
                              : selectedTeachers.includes(teacher._id)
                              ? "text-green-500"
                              : "text-gray-300"
                          }`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <AnimatePresence>
          {confirmModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            >
              <motion.div
                ref={modalRef}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
              >
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Confirm Assignment
                </h2>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to assign this course to{" "}
                  <span className="font-semibold">
                    {
                      selectedTeachers.filter(
                        (id) => !assignedTeachers.includes(id)
                      ).length
                    }
                  </span>{" "}
                  {selectedTeachers.filter(
                    (id) => !assignedTeachers.includes(id)
                  ).length === 1
                    ? "teacher"
                    : "teachers"}
                  ?
                </p>
                <div className="flex justify-end gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setConfirmModal(false)}
                    className="border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg px-4 py-2 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAssignTeachers}
                    disabled={assignLoading}
                    className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 cursor-pointer"
                  >
                    Confirm
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
