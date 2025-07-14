"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  User,
  XCircle,
  Sparkles,
  ArrowRight,
  FileDown,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import toast from "react-hot-toast";
import moment from "moment-timezone";
import { motion } from "framer-motion";
import Loader from "@/components/Loader";
import type { ApiError } from "@/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { ChevronDownIcon, Calendar as CalendarPick } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";

interface Teacher {
  _id: string;
  name: string;
}

interface AttendanceRecord {
  attendanceId: string;
  callId: string;
  batch:{LbatchId: string; name: string };
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
  const [loading, setLoading] = useState(true); // For initial page load
  const [attendanceLoading, setAttendanceLoading] = useState(false); // For attendance records
  const [error, setError] = useState<string | null>(null);
  const [openToDate, setOpenToDate] = useState(false);
  const [openFromDate, setOpenFromDate] = useState(false);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);

  const formatDateYYYYMMDD = (date: Date) => {
    const newDate = date?.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const [month, day, year] = newDate.split("/");
    return `${year}-${month}-${day}`;
  };

  const teacherName =
    teacherId &&
    batchAttendance.length > 0 &&
    batchAttendance[0].attendanceRecords.length > 0
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

  const clearFilters = () => {
    setFromDate(undefined);
    setToDate(undefined);
    fetchAttendance(); // Only fetch attendance
  };

  const fetchAttendance = useCallback(
    async (fromDate?: Date | undefined, toDate?: Date | undefined) => {
      setAttendanceLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          handleUnauthorized();
          return;
        }
        if (teacherId) {
          const params: { teacherId: string; fromDate?: string; toDate?: string } = {
            teacherId: teacherId,
          };
          if (fromDate && toDate) {
            params.fromDate = formatDateYYYYMMDD(fromDate);
            params.toDate = formatDateYYYYMMDD(toDate);
          }
          const attendanceResponse = await api.get("/attendance/data", {
            headers: {
              Authorization: `Bearer ${token}`,
              "Device-Id": deviceId,
            },
            params,
          });
          setBatchAttendance(attendanceResponse.data.batchAttendance || []);
        }
      } catch (error) {
        const apiError = error as ApiError;
        const errorMessage =
          apiError.response?.data?.message || "Failed to fetch attendance data";
        setError(errorMessage);
        if (apiError.response?.status === 401) {
          handleUnauthorized();
        } else {
          toast.error(errorMessage);
        }
      } finally {
        setAttendanceLoading(false);
      }
    },
    [deviceId, handleUnauthorized, teacherId]
  );

  const fetchTeachersAndAttendance = useCallback(
    async (fromDate?: Date | undefined, toDate?: Date | undefined) => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          handleUnauthorized();
          return;
        }

        // Fetch teachers only if not already loaded
        if (teachers.length === 0) {
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
        }

        if (teacherId) {
          await fetchAttendance(fromDate, toDate);
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
    },
    [deviceId, handleUnauthorized, teacherId, teachers.length, fetchAttendance]
  );

  const handleFilter = () => {
    if (fromDate && toDate) {
      fetchAttendance(fromDate, toDate);
    }
  };

  useEffect(() => {
    if (!user || !deviceId) {
      handleUnauthorized();
      return;
    }
    if (!authLoading && user?.role?.roleName === "Super Admin") {
      fetchTeachersAndAttendance();
    } else if (!authLoading) {
      handleUnauthorized();
    }
  }, [user, authLoading, deviceId, handleUnauthorized, fetchTeachersAndAttendance]);

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
      const params: { teacherId: string; fromDate?: string; toDate?: string } = {
        teacherId: teacherId,
      };
      if (fromDate && toDate) {
        params.fromDate = formatDateYYYYMMDD(fromDate);
        params.toDate = formatDateYYYYMMDD(toDate);
      }

      const response = await api.get("/attendance/export", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Device-Id": deviceId,
        },
        params,
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
  }, [user, deviceId, teacherId, handleUnauthorized, fromDate, toDate]);

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

  if (!user || user.role?.roleName !== "Super Admin") {
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
                <CalendarPick className="w-4 h-4" />
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
                      <Link href={`/superadmin/attendance?teacherId=${teacher._id}`}>
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
          <div>
            <div className="flex justify-between my-8 mx-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/superadmin/attendance")}
                className="border-gray-200 bg-white hover:bg-gray-100"
              >
                <ArrowLeft className="w-4 h-4" />
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

            {/* Filter part */}
            <div className="flex gap-4 my-6 mx-2">
              <div className="flex flex-row gap-3">
                <Label
                  htmlFor="formDate"
                  className="px-1 font-semibold text-black"
                >
                  <CalendarPick className="w-4 h-4" />
                  FromDate
                </Label>
                <Popover open={openFromDate} onOpenChange={setOpenFromDate}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      id="formDate"
                      className={cn(
                        "w-48 justify-between font-normal text-black bg-white border transition-all",
                        openFromDate
                          ? "border-blue-500 ring-2 ring-blue-300"
                          : "border-gray-300"
                      )}
                    >
                      {fromDate
                        ? fromDate.toLocaleDateString("en-GB")
                        : "Pick a date"}
                      <ChevronDownIcon className="ml-2 h-4 w-4 text-gray-500" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto overflow-hidden p-0 bg-white border border-gray-200 shadow-md rounded-md"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={fromDate}
                      captionLayout="dropdown"
                      className="text-black bg-white"
                      onSelect={(date) => {
                        setFromDate(date);
                        setOpenFromDate(false);
                      }}
                      classNames={{
                        day_selected: "bg-blue-600 text-white hover:bg-blue-700",
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-row items-center gap-3">
                <CalendarPick className="w-4 h-4 text-gray-600" />
                <Label htmlFor="toDate" className="px-1 font-semibold text-black">
                  To Date
                </Label>

                <Popover open={openToDate} onOpenChange={setOpenToDate}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      id="toDate"
                      className={cn(
                        "w-48 justify-between font-normal text-black bg-white border transition-all",
                        openToDate
                          ? "border-blue-500 ring-2 ring-blue-300"
                          : "border-gray-300"
                      )}
                    >
                      {toDate
                        ? toDate.toLocaleDateString("en-GB")
                        : "Pick a date"}
                      <ChevronDownIcon className="ml-2 h-4 w-4 text-gray-500" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto overflow-hidden p-0 bg-white border border-gray-200 shadow-md rounded-md"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      className="bg-white text-black"
                      selected={toDate}
                      captionLayout="dropdown"
                      onSelect={(date) => {
                        setToDate(date);
                        setOpenToDate(false);
                      }}
                      classNames={{
                        day_selected: "bg-blue-600 text-white hover:bg-blue-700",
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Button
                onClick={handleFilter}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-md"
                disabled={!fromDate || !toDate}
              >
                Filter
              </Button>
              <Button
                onClick={clearFilters}
                className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-md"
              >
                Clear
              </Button>
            </div>

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
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {attendanceLoading ? (
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
                    <p className="ml-4 text-blue-600">Loading attendance records...</p>
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
                    <div key={batch.batchId + "_" + index}>
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
                            key={record.attendanceId + "_" + idx}
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
                                  className={`${record.students.every(
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
                                {record.students.map((student, idx) => (
                                  <div
                                    key={student.studentId + "_" + idx}
                                    className="flex items-center justify-between p-3 bg-white/60 rounded-lg"
                                  >
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">
                                        {student.name}
                                      </p>
                                    </div>
                                    <Badge
                                      className={`${student.status === "Present"
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
          </div>
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
  );
}