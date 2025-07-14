"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  FileText,
  User,
  XCircle,
  Sparkles,
  ArrowRight,
  FileDown,
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import toast from "react-hot-toast";
import moment from "moment-timezone";
import { motion } from "framer-motion";
import Loader from "@/components/Loader";
import type { ApiError } from "@/types";

interface Teacher {
  _id: string;
  name: string;
}

interface AttendanceRecord {
  attendanceId: string;
  callId: string;
  batch: { batchId: string; name: string };
  course: { courseId: string; title: string } | null;
  teacher: { teacherId: string; name: string };
  date: string;
  startTime: string | null;
  endTime: string | null;
  timezone: string;
  students: Array<{
    studentId: string;
    name: string;
    status: string;
    markedAt: string | null;
    markedBy: { teacherId: string; name: string };
  }>;
  createdAt: string;
  updatedAt: string;
}

interface BatchAttendance {
  batchId: string;
  batchName: string;
  attendanceRecords: AttendanceRecord[];
}

const formatDateTime = (date: string) => {
  try {
    const parsedDate = moment(date);
    if (!parsedDate.isValid()) return "Invalid Date";
    return parsedDate.format("DD MMM YYYY");
  } catch {
    return "Invalid Date";
  }
};

const formatTimeRange = (
  date: string,
  startTime: string | null,
  endTime: string | null,
  timezone: string
) => {
  if (!startTime || !endTime) return "N/A";
  try {
    const startMoment = moment.tz(
      `${date} ${startTime}`,
      "YYYY-MM-DD HH:mm",
      timezone
    );
    const endMoment = moment.tz(
      `${date} ${endTime}`,
      "YYYY-MM-DD HH:mm",
      timezone
    );
    if (!startMoment.isValid() || !endMoment.isValid()) return "Invalid Time";
    return `${startMoment.format("h:mm A")} - ${endMoment.format("h:mm A")}`;
  } catch {
    return "Invalid Time";
  }
};

export function AttendanceContentPage() {
  const { user, loading: authLoading, deviceId } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const teacherId = searchParams.get("teacherId");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [batchAttendance, setBatchAttendance] = useState<BatchAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const teacherName =
    teacherId && batchAttendance.length > 0 && batchAttendance[0].attendanceRecords.length > 0
      ? batchAttendance[0].attendanceRecords[0].teacher.name
      : "Unknown Teacher";

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("deviceId");
    toast.error("Session expired. Please log in again.");
    router.push("/login");
  }, [router]);

  useEffect(() => {
    if (!user || !deviceId) {
      handleUnauthorized();
      return;
    }

    const fetchTeachersAndAttendance = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          handleUnauthorized();
          return;
        }

        const teacherResponse = await api.get("/admin/users?role=Teacher", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Device-Id": deviceId,
          },
        });

        const teachersData = Array.isArray(teacherResponse.data.users)
          ? teacherResponse.data.users
          : [];
        setTeachers(teachersData);

        if (teacherId) {
          const attendanceResponse = await api.get("/attendance/data", {
            headers: {
              Authorization: `Bearer ${token}`,
              "Device-Id": deviceId,
            },
            params: { teacherId },
          });
          setBatchAttendance(attendanceResponse.data.batchAttendance || []);
        }
      } catch (error) {
        const apiError = error as ApiError;
        const errorMessage =
          apiError.response?.data?.message || "Failed to fetch data";
        setError(errorMessage);
        if (apiError.response?.status === 401) {
          handleUnauthorized();
        } else {
          toast.error(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user?.role?.roleName === "Admin") {
      fetchTeachersAndAttendance();
    } else if (!authLoading) {
      handleUnauthorized();
    }
  }, [user, authLoading, deviceId, teacherId, handleUnauthorized]);

  const handleExport = useCallback(async () => {
    if (!user || !deviceId || !teacherId) {
      handleUnauthorized();
      return;
    }
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        handleUnauthorized();
        return;
      }
      const response = await api.get("/attendance/export", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Device-Id": deviceId,
        },
        params: { teacherId },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `attendance_teacher_${teacherId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Attendance exported successfully");
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage =
        apiError.response?.data?.message || "Failed to export attendance";
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        toast.error(errorMessage);
      }
    }
  }, [user, deviceId, teacherId, handleUnauthorized]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-400 rounded-full blur-xl opacity-20 animate-pulse"></div>
            <Loader
              height="80"
              width="80"
              color="#2563eb"
              ariaLabel="triangle-loading"
              wrapperStyle={{}}
              wrapperClass=""
              visible={true}
            />
            <p className="mt-6 text-blue-700 font-medium text-lg">
              Loading attendance data...
            </p>
            <div className="flex items-center justify-center gap-1 mt-2">
              <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
              <span className="text-blue-600 text-sm">
                Preparing attendance overview
              </span>
              <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user || user.role?.roleName !== "Admin") {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="p-4 bg-red-50 rounded-xl shadow-lg">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Error Loading Attendance
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button
              onClick={() => {
                setError(null);
                setLoading(true);
                const fetchTeachersAndAttendance = async () => {
                  try {
                    const token = localStorage.getItem("token");
                    if (!token) {
                      handleUnauthorized();
                      return;
                    }
                    const teacherResponse = await api.get(
                      "/admin/users?role=Teacher",
                      {
                        headers: {
                          Authorization: `Bearer ${token}`,
                          "Device-Id": deviceId,
                        },
                      }
                    );
                    setTeachers(
                      Array.isArray(teacherResponse.data.users)
                        ? teacherResponse.data.users
                        : []
                    );
                    if (teacherId) {
                      const attendanceResponse = await api.get(
                        "/attendance/data",
                        {
                          headers: {
                            Authorization: `Bearer ${token}`,
                            "Device-Id": deviceId,
                          },
                          params: { teacherId },
                        }
                      );
                      setBatchAttendance(
                        attendanceResponse.data.batchAttendance || []
                      );
                    }
                  } catch (error) {
                    const apiError = error as ApiError;
                    const errorMessage =
                      apiError.response?.data?.message ||
                      "Failed to fetch data";
                    setError(errorMessage);
                    if (apiError.response?.status === 401) {
                      handleUnauthorized();
                    } else {
                      toast.error(errorMessage);
                    }
                  } finally {
                    setLoading(false);
                  }
                };
                fetchTeachersAndAttendance();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 p-6 mt-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-800 p-8 text-white shadow-xl"
        >
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <FileText className="w-6 h-6" />
                </div>
                <h1 className="text-4xl font-bold">Attendance Management</h1>
              </div>
              <p className="text-indigo-100 text-lg">
                View and export attendance records for teachers
              </p>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2 text-indigo-100 bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
        </motion.div>

        {!teacherId ? (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900">
                    Teachers
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Select a teacher to view their attendance records
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {teachers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-3 bg-gradient-to-br from-blue-100 to-gray-100 text-blue-400 rounded-full w-fit mx-auto mb-4">
                    <User className="w-8 h-8" />
                  </div>
                  <p className="font-semibold text-blue-600 mb-1">
                    No teachers found
                  </p>
                  <p className="text-sm text-gray-500">
                    Check back later or add new teachers
                  </p>
                </div>
              ) : (
                teachers.map((teacher, index) => (
                  <motion.div
                    key={teacher._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-indigo-50 hover:to-blue-100 transition-all border border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">
                            {teacher.name}
                          </h3>
                        </div>
                      </div>
                      <Link href={`/admin/attendance?teacherId=${teacher._id}`}>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 py-2 shadow-md hover:shadow-lg transition-all">
                          Show Attendance
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">
                      Attendance Records
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      Attendance details for Teacher: {teacherName}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/admin/attendance")}
                    className="border-gray-200 hover:bg-gray-50"
                  >
                    Back to Teachers
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 py-2 shadow-md hover:shadow-lg transition-all"
                    onClick={handleExport}
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Export to Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader
                    height="40"
                    width="40"
                    color="#2563eb"
                    ariaLabel="triangle-loading"
                    wrapperStyle={{}}
                    wrapperClass=""
                    visible={true}
                  />
                </div>
              ) : batchAttendance.length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-3 bg-gradient-to-br from-blue-100 to-gray-100 text-blue-400 rounded-full w-fit mx-auto mb-4">
                    <FileText className="w-8 h-8" />
                  </div>
                  <p className="font-semibold text-blue-600 mb-1">
                    No attendance records found
                  </p>
                  <p className="text-sm text-gray-500">
                    No attendance data available for this teacher
                  </p>
                </div>
              ) : (
                batchAttendance.map((batch, index) => (
                  <div key={batch.batchId}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="mb-4"
                    >
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Badge className="bg-blue-100 text-blue-700 border border-blue-200">
                          Batch: {batch.batchName}
                        </Badge>
                      </h3>
                    </motion.div>
                    {batch.attendanceRecords.length === 0 ? (
                      <p className="text-gray-600 text-sm">
                        No attendance records for this batch
                      </p>
                    ) : (
                      batch.attendanceRecords.map((record, idx) => (
                        <motion.div
                          key={record.attendanceId}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-indigo-50 hover:to-blue-100 transition-all border border-gray-200 mb-4"
                        >
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-gray-900">
                                  {record.course?.title || "N/A"} -{" "}
                                  {formatDateTime(record.date)}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  Time:{" "}
                                  {formatTimeRange(
                                    record.date,
                                    record.startTime,
                                    record.endTime,
                                    record.timezone
                                  )}
                                </p>
                              </div>
                              <Badge
                                className={`${
                                  record.students.every(
                                    (s) => s.status === "Present"
                                  )
                                    ? "bg-green-100 text-green-700"
                                    : "bg-yellow-100 text-yellow-700"
                                } border border-gray-200`}
                              >
                                {record.students.every(
                                  (s) => s.status === "Present"
                                )
                                  ? "All Present"
                                  : "Mixed Attendance"}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {record.students.map((student) => (
                                <div
                                  key={student.studentId}
                                  className="flex items-center justify-between p-3 bg-white/60 rounded-lg"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {student.name}
                                    </p>
                                  </div>
                                  <Badge
                                    className={`${
                                      student.status === "Present"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                    } border border-gray-200`}
                                  >
                                    {student.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-gray-500">
                              Marked by:{" "}
                              {record.students[0]?.markedBy.name || "N/A"} on{" "}
                              {moment(record.createdAt).format(
                                "DD MMM YYYY, h:mm A"
                              )}
                            </p>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function AttendancePage() {
  return (
    <Suspense
      fallback={
        <div>
          <Loader />
        </div>
      }
    >
      <AttendanceContentPage />
    </Suspense>
  )
}