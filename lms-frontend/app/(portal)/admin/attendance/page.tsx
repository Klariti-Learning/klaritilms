"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar as CalendarPick, FileDown } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Teacher {
  _id: string;
  name: string;
}

interface AttendanceRecord {
  attendanceId: string;
  callId: string | null;
  batch: { batchId: string; name: string } | null;
  course: { courseId: string; title: string } | null;
  teacher: { teacherId: string; name: string };
  date: string;
  startTime: string | null;
  endTime: string | null;
  timezone: string;
  students: Array<{
    parentGuardianName: string;
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

export function AttendanceContentPage() {
  const { user, loading: authLoading, deviceId } = useAuth();
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [batchAttendance, setBatchAttendance] = useState<BatchAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openToDate, setOpenToDate] = useState(false);
  const [openFromDate, setOpenFromDate] = useState(false);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedTeacher, setSelectedTeacher] = useState<string>("all");

  const formatDateYYYYMMDD = (date: Date) => {
    const newDate = date?.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const [month, day, year] = newDate.split("/");
    return `${year}-${month}-${day}`;
  };

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
    setSelectedTeacher("all");
    setCurrentPage(1);
    fetchTeachersAndAttendance();
  };

  const transformToBatchAttendance = (
    attendanceRecords: AttendanceRecord[]
  ): BatchAttendance[] => {
    const batchMap = new Map<string, BatchAttendance>();

    attendanceRecords.forEach((record) => {
      const batchId = record.batch?.batchId || "no-batch";
      const batchName = record.batch?.name || "No Batch";
      if (!batchMap.has(batchId)) {
        batchMap.set(batchId, {
          batchId,
          batchName,
          attendanceRecords: [],
        });
      }
      batchMap.get(batchId)!.attendanceRecords.push(record);
    });

    return Array.from(batchMap.values());
  };

  const fetchTeachersAndAttendance = useCallback(
    async (
      fromDate?: Date | undefined,
      toDate?: Date | undefined,
      teacherId?: string
    ) => {
      setAttendanceLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          handleUnauthorized();
          return;
        }

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

        const params: {
          teacherId?: string;
          fromDate?: string;
          toDate?: string;
        } = {};
        if (teacherId && teacherId !== "all") {
          params.teacherId = teacherId;
        }
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

        const responseData = attendanceResponse.data;
        let transformedData: BatchAttendance[] = [];

        if (responseData.batchAttendance) {
          transformedData = responseData.batchAttendance || [];
        } else if (responseData.attendanceRecords) {
          transformedData = transformToBatchAttendance(
            responseData.attendanceRecords
          );
        }

        setBatchAttendance(transformedData);
        setCurrentPage(1);
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
        setAttendanceLoading(false);
        setLoading(false);
      }
    },
    [deviceId, handleUnauthorized, teachers.length]
  );

  const handleFilter = () => {
    if (fromDate && toDate) {
      fetchTeachersAndAttendance(fromDate, toDate, selectedTeacher);
    }
  };

  useEffect(() => {
    if (!user || !deviceId) {
      handleUnauthorized();
      return;
    }
    if (!authLoading && user?.role?.roleName === "Admin") {
      fetchTeachersAndAttendance();
    } else if (!authLoading) {
      handleUnauthorized();
    }
  }, [
    user,
    authLoading,
    deviceId,
    handleUnauthorized,
    fetchTeachersAndAttendance,
  ]);

  const handleExport = useCallback(async () => {
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
      const params: { teacherId?: string; fromDate?: string; toDate?: string } =
        {};
      if (selectedTeacher !== "all") {
        params.teacherId = selectedTeacher;
      }
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

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const dateSuffix =
        fromDate && toDate
          ? `_${formatDateYYYYMMDD(fromDate)}_to_${formatDateYYYYMMDD(toDate)}`
          : "";
      link.setAttribute(
        "download",
        selectedTeacher === "all"
          ? `attendance_all_teachers${dateSuffix}.xlsx`
          : `attendance_teacher_${selectedTeacher}${dateSuffix}.xlsx`
      );
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
  }, [user, deviceId, handleUnauthorized, selectedTeacher, fromDate, toDate]);

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
          transition={{ duration: 0.5 }}
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
                View and export attendance records
              </p>
            </div>
            <div className="flex items-center gap-4">
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
                    Filter by teacher and date range
                  </p>
                </div>
              </div>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-6 py-2 shadow-md hover:shadow-lg transition-all"
                onClick={handleExport}
              >
                <FileDown className="w-4 h-4 mr-2" />
                Export to Excel
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 my-6 mx-2">
              <div className="flex flex-row items-center gap-3">
                <Select
                  value={selectedTeacher}
                  onValueChange={(value) => {
                    setSelectedTeacher(value);
                    fetchTeachersAndAttendance(fromDate, toDate, value);
                  }}
                >
                  <SelectTrigger
                    className={cn(
                      "w-48 bg-white border border-gray-300 hover:border-blue-500 focus:ring-2 focus:ring-blue-300 transition-all",
                      selectedTeacher ? "font-bold" : "font-normal"
                    )}
                  >
                    <SelectValue placeholder="Select a teacher" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg rounded-md max-h-60 font-extrabold overflow-y-auto ">
                    <SelectItem value="all" className="hover:bg-blue-50 cursor-pointer">
                      All Teachers
                    </SelectItem>
                    {teachers.map((teacher) => (
                      <SelectItem
                        key={teacher._id}
                        value={teacher._id}
                        className="hover:bg-blue-50 cursor-pointer"
                      >
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-row items-center gap-3">
                <Popover open={openFromDate} onOpenChange={setOpenFromDate}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      id="fromDate"
                      className={cn(
                        "w-48 justify-between text-black bg-white border transition-all",
                        openFromDate
                          ? "border-blue-500 ring-2 ring-blue-300"
                          : "border-gray-300",
                        fromDate ? "font-bold" : "font-normal"
                      )}
                    >
                      <div className="flex items-center gap-2 font-bold">
                        <CalendarPick className="w-4 h-4" />
                        {fromDate
                          ? fromDate.toLocaleDateString("en-GB")
                          : "From Date"}
                      </div>
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
                        day_selected:
                          "bg-blue-600 text-white hover:bg-blue-700",
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-row items-center gap-3">
                <Popover open={openToDate} onOpenChange={setOpenToDate}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      id="toDate"
                      className={cn(
                        "w-48 justify-between text-black bg-white border transition-all",
                        openToDate
                          ? "border-blue-500 ring-2 ring-blue-300"
                          : "border-gray-300",
                        toDate ? "font-bold" : "font-normal"
                      )}
                    >
                      <div className="flex items-center gap-2 font-bold">
                        <CalendarPick className="w-4 h-4" />
                        {toDate
                          ? toDate.toLocaleDateString("en-GB")
                          : "To Date"}
                      </div>
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
                        day_selected:
                          "bg-blue-600 text-white hover:bg-blue-700",
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
                <p className="ml-4 text-blue-600">
                  Loading attendance records...
                </p>
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
                  No attendance data available
                </p>
              </div>
            ) : (
              (() => {
                const uniqueDates = Array.from(
                  new Set(
                    batchAttendance.flatMap((batch) =>
                      batch.attendanceRecords.map((record) =>
                        moment(record.date).format("DD MMM YYYY")
                      )
                    )
                  )
                ).sort((a, b) =>
                  moment(a, "DD MMM YYYY").diff(moment(b, "DD MMM YYYY"))
                );

                const studentAttendanceMap = new Map();
                batchAttendance.forEach((batch) => {
                  batch.attendanceRecords.forEach((record) => {
                    const courseId = record.course?.courseId || "N/A";
                    const formattedDate = moment(record.date).format(
                      "DD MMM YYYY"
                    );
                    record.students.forEach((student) => {
                      const key = `${student.studentId}-${batch.batchId}-${courseId}`;
                      if (!studentAttendanceMap.has(key)) {
                        studentAttendanceMap.set(key, {
                          studentId: student.studentId,
                          studentName: student.name,
                          parentGuardianName:
                            student.parentGuardianName || "N/A",
                          teacherName: record.teacher.name,
                          classType: record.course?.title || "N/A",
                          batchId: batch.batchId,
                          batchName: batch.batchName,
                          attendance: new Map(),
                        });
                      }
                      studentAttendanceMap
                        .get(key)
                        .attendance.set(formattedDate, student.status);
                    });
                  });
                });

                const studentAttendance = Array.from(
                  studentAttendanceMap.values()
                );

                const totalItems = studentAttendance.length;
                const totalPages = Math.ceil(totalItems / itemsPerPage);
                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const paginatedAttendance = studentAttendance.slice(
                  startIndex,
                  endIndex
                );

                const handlePageChange = (page: number) => {
                  setCurrentPage(page);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                };

                return (
                  <div className="relative max-w-5xl overflow-x-auto">
                    <style jsx>{`
                      .custom-scroll {
                        scroll-behavior: smooth;
                        -webkit-overflow-scrolling: touch;
                        position: relative;
                        /* Reserve space for scrollbar to prevent content shift */
                        scrollbar-gutter: stable;
                      }

                      /* Always reserve space for scrollbar */
                      .custom-scroll::-webkit-scrollbar {
                        height: 10px;
                        background: rgba(0, 0, 0, 0.02);
                        border-radius: 8px;
                      }

                      /* Track - always visible but very subtle */
                      .custom-scroll::-webkit-scrollbar-track {
                        background: rgba(148, 163, 184, 0.03);
                        border-radius: 8px;
                        margin: 0 6px;
                        border: 1px solid rgba(148, 163, 184, 0.02);
                      }

                      /* Thumb - invisible by default, appears on interaction */
                      .custom-scroll::-webkit-scrollbar-thumb {
                        background: transparent;
                        border-radius: 8px;
                        border: 2px solid transparent;
                        background-clip: padding-box;
                        transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
                        transform: scaleY(0.8);
                        opacity: 0;
                      }

                      /* Scrollbar states */
                      .custom-scroll.scrolling::-webkit-scrollbar-thumb,
                      .custom-scroll:hover::-webkit-scrollbar-thumb {
                        background: linear-gradient(
                          90deg,
                          rgba(148, 163, 184, 0.25) 0%,
                          rgba(148, 163, 184, 0.35) 50%,
                          rgba(148, 163, 184, 0.25) 100%
                        );
                        opacity: 1;
                        transform: scaleY(1);
                        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                      }

                      /* Enhanced hover state */
                      .custom-scroll::-webkit-scrollbar-thumb:hover {
                        background: linear-gradient(
                          90deg,
                          rgba(148, 163, 184, 0.4) 0%,
                          rgba(148, 163, 184, 0.5) 50%,
                          rgba(148, 163, 184, 0.4) 100%
                        );
                        transform: scaleY(1.05);
                        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
                        transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
                      }

                      /* Active/dragging state */
                      .custom-scroll::-webkit-scrollbar-thumb:active {
                        background: linear-gradient(
                          90deg,
                          rgba(148, 163, 184, 0.5) 0%,
                          rgba(148, 163, 184, 0.6) 50%,
                          rgba(148, 163, 184, 0.5) 100%
                        );
                        transform: scaleY(1.02);
                        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
                      }

                      /* Track hover enhancement */
                      .custom-scroll:hover::-webkit-scrollbar-track {
                        background: rgba(148, 163, 184, 0.06);
                        border: 1px solid rgba(148, 163, 184, 0.04);
                        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
                      }

                      /* Firefox scrollbar - always reserve space */
                      .custom-scroll {
                        scrollbar-width: thin;
                        scrollbar-color: transparent rgba(148, 163, 184, 0.03);
                      }

                      .custom-scroll.scrolling,
                      .custom-scroll:hover {
                        scrollbar-color: rgba(148, 163, 184, 0.35)
                          rgba(148, 163, 184, 0.06);
                      }

                      /* Smooth table interactions */
                      table {
                        width: 100%;
                        min-width: max-content;
                        border-collapse: separate;
                        border-spacing: 0;
                      }

                      th,
                      td {
                        transition: background-color 0.25s
                            cubic-bezier(0.25, 0.8, 0.25, 1),
                          transform 0.15s cubic-bezier(0.25, 0.8, 0.25, 1),
                          box-shadow 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
                      }

                      tr {
                        transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
                      }

                      tr:hover {
                        background-color: rgba(59, 130, 246, 0.03);
                        transform: translateY(-0.5px);
                        box-shadow: 0 1px 4px rgba(59, 130, 246, 0.06);
                      }

                      td:hover {
                        background-color: rgba(59, 130, 246, 0.06);
                      }

                      .badge {
                        transition: transform 0.2s
                            cubic-bezier(0.25, 0.8, 0.25, 1),
                          background-color 0.25s
                            cubic-bezier(0.25, 0.8, 0.25, 1),
                          box-shadow 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
                      }

                      .badge:hover {
                        transform: scale(1.03);
                        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
                      }

                      /* Scrollbar fade animations */
                      @keyframes scrollbarFadeIn {
                        from {
                          opacity: 0;
                          transform: scaleY(0.6);
                        }
                        to {
                          opacity: 1;
                          transform: scaleY(1);
                        }
                      }

                      @keyframes scrollbarFadeOut {
                        from {
                          opacity: 1;
                          transform: scaleY(1);
                        }
                        to {
                          opacity: 0;
                          transform: scaleY(0.8);
                        }
                      }

                      /* Enhanced scrolling experience */
                      .custom-scroll {
                        scroll-padding: 12px;
                        /* Ensure smooth momentum scrolling on iOS */
                        -webkit-overflow-scrolling: touch;
                      }

                      /* Custom scrollbar corner */
                      .custom-scroll::-webkit-scrollbar-corner {
                        background: rgba(148, 163, 184, 0.03);
                        border-radius: 8px;
                      }

                      /* Subtle scroll indicator */
                      .custom-scroll::before {
                        content: "";
                        position: absolute;
                        top: 0;
                        right: 0;
                        bottom: 0;
                        width: 1px;
                        background: linear-gradient(
                          to bottom,
                          transparent 0%,
                          rgba(148, 163, 184, 0.05) 20%,
                          rgba(148, 163, 184, 0.05) 80%,
                          transparent 100%
                        );
                        opacity: 0;
                        transition: opacity 0.3s
                          cubic-bezier(0.25, 0.8, 0.25, 1);
                        pointer-events: none;
                      }

                      .custom-scroll:hover::before {
                        opacity: 1;
                      }
                    `}</style>
                    <div className="relative overflow-x-auto custom-scroll">
                      <table className="text-sm text-left text-gray-700 bg-white/90 rounded-lg shadow-lg">
                        <thead className="text-xs uppercase bg-blue-50 text-blue-700 sticky top-0 z-10">
                          <tr>
                            <th className="px-6 py-4 w-16 text-center">
                              S.No.
                            </th>
                            <th className="px-6 py-4 w-40 text-center">
                              Teacher Name
                            </th>
                            <th className="px-6 py-4 w-40 text-center">
                              Student Name
                            </th>
                            <th className="px-6 py-4 w-40 text-center">
                              Parent&apos;s Name
                            </th>
                            <th className="px-6 py-4 w-40 text-center">
                              Class Type
                            </th>
                            <th className="px-6 py-4 w-40 text-center">
                              Batch Name
                            </th>
                            {uniqueDates.map((date) => (
                              <th
                                key={date}
                                className="px-6 py-4 w-40 text-center"
                              >
                                {date}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedAttendance.map((student, index) => (
                            <motion.tr
                              key={`${student.studentId}-${student.batchId}-${student.classType}`}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                delay: index * 0.1,
                                type: "spring",
                                stiffness: 120,
                              }}
                              className="border-b border-gray-100"
                            >
                              <td className="px-6 py-4 w-16 text-center">
                                {startIndex + index + 1}
                              </td>
                              <td className="px-6 py-4 w-40 text-center">
                                {student.teacherName}
                              </td>
                              <td className="px-6 py-4 w-40 text-center">
                                {student.studentName}
                              </td>
                              <td className="px-6 py-4 w-40 text-center">
                                {student.parentGuardianName}
                              </td>
                              <td className="px-6 py-4 w-40 text-center">
                                {student.classType}
                              </td>
                              <td className="px-6 py-4 w-40 text-center">
                                {student.batchName}
                              </td>
                              {uniqueDates.map((date) => (
                                <td
                                  key={date}
                                  className="px-6 py-4 w-40 text-center"
                                >
                                  <Badge
                                    className={`badge ${
                                      student.attendance.get(date) === "Present"
                                        ? "bg-green-100 text-green-700"
                                        : student.attendance.get(date) ===
                                          "Absent"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-gray-100 text-gray-700"
                                    } border border-gray-200 inline-flex justify-center px-3 py-1 rounded-full`}
                                  >
                                    {student.attendance.get(date) || "-"}
                                  </Badge>
                                </td>
                              ))}
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {totalPages > 1 && (
                      <div className="mt-6">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() =>
                                  handlePageChange(currentPage - 1)
                                }
                                className={
                                  currentPage === 1
                                    ? "pointer-events-none opacity-50"
                                    : "cursor-pointer hover:bg-blue-100 transition-colors"
                                }
                                size="default"
                              />
                            </PaginationItem>
                            {[...Array(totalPages)].map((_, i) => {
                              const page = i + 1;
                              if (
                                page === 1 ||
                                page === totalPages ||
                                (page >= currentPage - 1 &&
                                  page <= currentPage + 1)
                              ) {
                                return (
                                  <PaginationItem key={page}>
                                    <PaginationLink
                                      onClick={() => handlePageChange(page)}
                                      isActive={currentPage === page}
                                      className={
                                        currentPage === page
                                          ? "bg-blue-600 text-white hover:bg-blue-700"
                                          : "cursor-pointer hover:bg-blue-100 transition-colors"
                                      }
                                      size="default"
                                    >
                                      {page}
                                    </PaginationLink>
                                  </PaginationItem>
                                );
                              } else if (
                                (page === currentPage - 2 && currentPage > 3) ||
                                (page === currentPage + 2 &&
                                  currentPage < totalPages - 2)
                              ) {
                                return (
                                  <PaginationItem key={page}>
                                    <PaginationEllipsis />
                                  </PaginationItem>
                                );
                              }
                              return null;
                            })}
                            <PaginationItem>
                              <PaginationNext
                                onClick={() =>
                                  handlePageChange(currentPage + 1)
                                }
                                className={
                                  currentPage === totalPages
                                    ? "pointer-events-none opacity-50"
                                    : "cursor-pointer hover:bg-blue-100 transition-colors"
                                }
                                size="default"
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                  </div>
                );
              })()
            )}
          </CardContent>
        </Card>
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