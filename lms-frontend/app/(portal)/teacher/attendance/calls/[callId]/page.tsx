"use client"

import { useAuth } from "@/lib/auth";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button";
import { Calendar, CalendarCheck2, ChartNoAxesColumn, Clock, Download, Sparkles, Target, User } from "lucide-react";
import api from "@/lib/api";
import { ApiError } from "@/types";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/card";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import { format, parseISO } from "date-fns";

export interface AttendanceRecord {
    attendanceId: string;
    callId: string;
    batch: Batch;
    course: Course;
    teacher: Teacher;
    date: string;
    startTime: string;
    endTime: string;
    timezone: string;
    students: StudentAttendance[];
    createdAt: string;
    updatedAt: string;
}

export interface Batch {
    batchId: string;
    name: string;
}

export interface Course {
    courseId: string;
    title: string;
}

export interface Teacher {
    teacherId: string;
    name: string;
}

export interface StudentAttendance {
    studentId: string;
    name: string;
    status: 'Present' | 'Absent';
    markedAt: string;
    markedBy: Teacher;
}


export default function CallAttendanceDetails() {
    const { user } = useAuth();
    const { loading: authLoading, deviceId } = useAuth();
    const router = useRouter();
    const { callId } = useParams();
    const searchParams = useSearchParams();
    const lessonName = searchParams.get("lesson");
    const chapterTitle = searchParams.get("chapter");

    const [attendanceResponse, setAttendanceResponse] = useState<AttendanceRecord[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const students = attendanceResponse?.[0]?.students || [];

    // Calculation of pagination values
    const totalPages = Math.ceil(students.length / itemsPerPage);
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const currentStudents = students.slice(startIdx, endIdx);

    const handlePageChange = (page: string | number) => {
        const pageIdx = Number(page)
        setCurrentPage(pageIdx);
    }

    const handlePrevious = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1)
        }
    }

    const handleNext = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1)
        }
    }

    const exportToCSV = async () => {
        if (!callId) {
            setError("No batch ID provided");
            setLoading(false);
            return;
        }
        try {
            const params: { callId: string, teacherId?: string } = {
                callId: Array.isArray(callId) ? callId[0] : callId,
                teacherId: user?._id
            }

            const response = await api.get('/attendance/data', { params });
            const records: AttendanceRecord[] = response.data.attendanceRecords || [];

            if (records.length === 0) {
                setError('No attendace records to export');
                return;
            }

            const escapeCSV = (val: string) => `"${val?.replace(/"/g, '""') || "N/A"}"`;

            const headers = ['Date', 'Course', 'Batch', 'Chapter', 'Lesson', 'Teacher', 'Student', 'Status'];

            const csvRows = [
                headers.join(','),
                ...records.flatMap((record: AttendanceRecord) => {
                    const date = format(parseISO(record.date), 'dd-MMM-yyyy');
                    const course = escapeCSV(record.course?.title);
                    const batch = escapeCSV(record.batch?.name);
                    const teacher = escapeCSV(record.teacher?.name);

                    return record.students.map((student) => {
                        const studentName = escapeCSV(student?.name);
                        const status = escapeCSV(student?.status);
                        return [date, course, batch, chapterTitle, lessonName, teacher, studentName, status].join(',');
                    });
                }),
            ];


            const batchName = records[0].batch?.name || "Batch";

            const csvContent = csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${batchName}_${chapterTitle}_attendance.csv`;
            link.click();
        } catch (error) {
            console.log("[ExportError] Error exporting Call Attendance", error);
            setError("Failed to export Call Attendance data");
        }

    }
    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;
        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);

            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            if (start > 2) {
                pages.push('ellipsis-start');
            }
            if (end < totalPages - 1) {
                pages.push('ellipsis-end');
            }

            // Show last page
            if (totalPages > 1) {
                pages.push(totalPages);
            }
        }

        return pages;

    }


    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const handleUnauthorized = useCallback(() => {
        console.debug("[CourseDetails] Handling unauthorized access");
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("deviceId");
        setError("Session expired. Please log in again.");
        router.push("/login");
    }, [router]);

    const fetchCallAttendance = useCallback(async () => {
        if (!callId) {
            setError("No call ID provided");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("token");
            if (!token || !deviceId) {
                console.debug(
                    "[CourseDetails] Missing token or deviceId in fetchCourseAndSchedule",
                    { token, deviceId }
                );
                handleUnauthorized();
                return;
            }

            const params: { callId: string; teacherId?: string } = {
                callId: Array.isArray(callId) ? callId[0] : callId,
                teacherId: user?._id
            }

            const CallAttendnaceResponse = await api.get(
                `/attendance/data`,
                {
                    params,
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                        "Device-Id": deviceId,
                    },
                },
            );

            const callData = CallAttendnaceResponse?.data?.attendanceRecords
            if (!callData) throw new Error("call data not found in response");

            setAttendanceResponse((prev) => [...prev, ...callData])
        } catch (error) {
            const apiError = error as ApiError;
            console.error("Error in fetchCourseAndSchedule:", apiError);
            if (apiError.response?.status === 401) {
                handleUnauthorized();
            } else {
                setError(
                    apiError.response?.data?.message ||
                    "Failed to fetch course or schedule details"
                );
                toast.error(
                    apiError.response?.data?.message ||
                    "Failed to fetch course or schedule details"
                );
            }
        } finally {
            setLoading(false);
        }
    }, [callId, deviceId, handleUnauthorized, user?._id]);

    useEffect(() => {
        fetchCallAttendance();
    }, [callId, fetchCallAttendance]);


    const getComponent = (status: string) => {
        switch (status.toLowerCase()) {
            case "present":
                return <div className="bg-green-500 p-2 rounded-xl text-sm text-white w-10 h-10 text-center items-center font-semibold">P</div>
            case "absent":
                return <div className="bg-red-500 p-2 rounded-xl text-sm text-white w-10 h-10 text-center items-center font-semibold">A</div>
            default:
                return <div className="bg-green-500 p-2 rounded-xl text-sm text-white w-10 h-10 text-center items-center font-semibold">P</div>
        }
    }

    if (authLoading || loading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                        duration: 1,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "linear",
                    }}
                    className="h-16 w-16 text-blue-600"
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

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl shadow-md max-w-md w-full"
                >
                    <p className="text-red-700 font-medium">{error}</p>
                </motion.div>
            </div>
        );
    }
    console.log(attendanceResponse)
    const lastIdx = attendanceResponse.length - 1;
    const showPagination = students.length > 5;
    return (
        <div className="min-h-screen bg-gray-50 p-3 md:p-4 mt-8">
            <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .custom-toggle {
          position: relative;
          width: 80px;
          height: 34px;
          background-color: #e5e7eb;
          border-radius: 9999px;
          transition: background-color 0.3s;
        }
        .custom-toggle.checked {
          background-color: #10b981;
        }
        .custom-toggle .handle {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 30px;
          height: 30px;
          background-color: white;
          border-radius: 50%;
          transition: transform 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          color: #1f2937;
        }
        .custom-toggle.checked .handle {
          transform: translateX(46px);
        }
        .calendar-container {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px);
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          padding: 16px;
        }
        [data-selected="true"] {
          background: linear-gradient(to right, #3b82f6, #1d4ed8) !important;
          color: white !important;
          border-radius: 9999px !important;
        }
        [data-selected="true"]:hover {
          background: linear-gradient(to right, #2563eb, #1e40af) !important;
        }
        .rdp-day:not([data-disabled="true"]):not([data-selected="true"]):hover {
          background-color: #dbeafe;
          border-radius: 9999px;
        }
        [data-disabled="true"] {
          color: #d1d5db !important;
          cursor: not-allowed !important;
        }
        .timezone-search-input {
          transition: all 0.2s ease-in-out;
        }
        .timezone-search-input:focus {
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
          border-color: #3b82f6;
        }
        .timezone-item:hover {
          background: linear-gradient(to right, #f3f4f6, #e5e7eb) !important;
          transition: background 0.2s ease-in-out;
        }
        .MuiInputBase-root {
          border-radius: 12px !important;
          background-color: rgba(255, 255, 255, 0.5) !important;
          border: 1px solid #e5e7eb !important;
          padding: 12px 16px !important;
          height: 48px !important;
          font-size: 0.875rem !important;
          color: #374151 !important;
          transition: all 0.3s ease !important;
        }
        .MuiInputBase-root:hover {
          background-color: rgba(255, 255, 255, 0.7) !important;
          border-color: #3b82f6 !important;
        }
        .MuiInputBase-root.Mui-focused {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
        }
        .MuiInputBase-input::placeholder {
          color: #9ca3af !important;
          opacity: 1 !important;
        }
        .MuiInputLabel-root {
          display: none !important;
        }
        .MuiPickersPopper-root {
          background: rgba(255, 255, 255, 0.95) !important;
          backdrop-filter: blur(8px) !important;
          border-radius: 12px !important;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1) !important;
        }
        .MuiPickersLayout-contentWrapper {
          background: transparent !important;
        }
        .MuiPickersPopper-root .MuiTimeClock-root,
        .MuiPickersPopper-root .MuiClock-root,
        .MuiPickersPopper-root .MuiClock-hours,
        .MuiPickersPopper-root .MuiClock-minutes,
        .MuiPickersPopper-root [role="listbox"],
        .MuiPickersPopper-root .MuiMenu-root,
        .MuiPickersPopper-root .MuiMenu-list,
        .MuiPickersPopper-root [class*="MuiClock"],
        .MuiPickersPopper-root [style*="overflow"] {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
          overflow-y: auto !important;
        }
        .MuiPickersPopper-root .MuiTimeClock-root::-webkit-scrollbar,
        .MuiPickersPopper-root .MuiClock-root::-webkit-scrollbar,
        .MuiPickersPopper-root .MuiClock-hours::-webkit-scrollbar,
        .MuiPickersPopper-root .MuiClock-minutes::-webkit-scrollbar,
        .MuiPickersPopper-root [role="listbox"]::-webkit-scrollbar,
        .MuiPickersPopper-root .MuiMenu-root::-webkit-scrollbar,
        .MuiPickersPopper-root .MuiMenu-list::-webkit-scrollbar,
        .MuiPickersPopper-root [class*="MuiClock"]::-webkit-scrollbar,
        .MuiPickersPopper-root [style*="overflow"]::-webkit-scrollbar {
          display: none !important;
        }
        .MuiClockPointer-root {
          background: linear-gradient(to right, #3b82f6, #1d4ed8) !important;
        }
        .MuiClock-pin,
        .MuiClockPointer-thumb {
          background: #3b82f6 !important;
          border-color: #1d4ed8 !important;
        }
        .MuiClockNumber-root {
          color: #374151 !important;
          font-weight: 500 !important;
        }
        .MuiClockNumber-root.Mui-selected {
          background: linear-gradient(to right, #3b82f6, #1d4ed8) !important;
          color: white !important;
        }
        .MuiButtonBase-root.Mui oncliPickersDay-root.Mui-selected {
          background: linear-gradient(to right, #3b82f6, #1d4ed8) !important;
        }
        .MuiTypography-root.MuiPickersToolbarText-root.Mui-selected {
          color: #3b82f6 !important;
        }
        .timezone-select-trigger {
          height: 48px !important;
          padding: 12px 16px !important;
          font-size: 0.875rem !important;
          border-radius: 12px !important;
          background-color: rgba(255, 255, 255, 0.5) !important;
          border: 1px solid #e5e7eb !important;
          transition: all 0.3s ease !important;
        }
        .timezone-select-trigger:hover {
          background-color: rgba(255, 255, 255, 0.7) !important;
          border-color: #3b82f6 !important;
        }
        .timezone-select-trigger:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 50;
        }
        .modal-content {
          max-height: 80vh;
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .modal-content::-webkit-scrollbar {
          display: none;
        }
            `}</style>

            <div className="max-w-5xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-8"
                >
                    <div className="flex justify-between my-5">
                        <Button
                            onClick={() => router.push("/teacher/courses?tab=batch")}
                            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm mb-4 text-sm"
                        >
                            ← Back to Courses
                        </Button>

                        <Button onClick={exportToCSV} className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white rounded-xl px-6 py-3 flex items-center gap-2 shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer">
                            <Download className="h-4 w-4" />
                            Export
                        </Button>
                    </div>

                    {/* Header with Icon */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{attendanceResponse[lastIdx]?.batch?.name || "Batch Name"}</h1>
                            <p className="text-gray-600 text-base">
                                Attendance Sheet
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-6">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                            <Target className="w-3 h-3" />
                            {attendanceResponse[lastIdx]?.course?.title || "Course"}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-medium border border-green-200">
                            <Clock className="w-3 h-3" />
                            {attendanceResponse[lastIdx]?.startTime || "StartTime"} - {attendanceResponse[lastIdx]?.endTime || "EndTime"}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium border border-purple-200">
                            <User className="w-3 h-3" />
                            {attendanceResponse[lastIdx]?.teacher?.name || "Teacher"}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium border border-yellow-200">
                            <Calendar className="w-3 h-3" />
                            {attendanceResponse[lastIdx]?.timezone || "Asia/Calcutta"}
                        </span>
                    </div>
                </motion.div>

                {/* Titles */}
                <div className="m-2 mb-8">
                    <div className="text-xl font-bold text-blue-600">
                        {chapterTitle}
                    </div>
                    <div className="text-xs">
                        {lessonName}
                    </div>
                </div>

                {/* Students Data */}
                <div className="space-y-6">
                    {attendanceResponse && attendanceResponse.length > 0 ? (
                        <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-lg">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
                                            <th className="px-8 py-6 text-left font-bold text-sm uppercase tracking-wider">
                                                <div className="flex items-center gap-2 justify-center">
                                                    <User className="w-4 h-4" />
                                                    Name
                                                </div>
                                            </th>
                                            <th className="px-8 py-6 text-left font-bold text-sm tracking-wider">
                                                <div className="flex justify-center items-center gap-2 ">
                                                    <CalendarCheck2 className="w-4 h-4" />
                                                    Date
                                                </div>
                                            </th>
                                            <th className="px-8 py-6 text-left font-bold text-sm tracking-wider">
                                                <div className="flex justify-center items-center gap-2 ">
                                                    <ChartNoAxesColumn className="w-4 h-4" />
                                                    Status
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {/* Get unique students from the first record */}
                                        {currentStudents?.map((student) => (
                                            <tr key={`student-${student.studentId}`}>
                                                <td className="px-8 py-6 whitespace-nowrap text-sm text-gray-700">
                                                    <div className="flex justify-center font-semibold">
                                                        {student.name}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 whitespace-nowrap text-sm text-gray-500">
                                                    <div className="flex justify-center">
                                                        {formatDate(attendanceResponse[0]?.date)}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 whitespace-nowrap text-sm text-gray-500">
                                                    <div className="flex justify-center">
                                                        {getComponent(student.status)}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>


                                </table>

                                {/* Pagination Tab */}
                                {showPagination && (
                                    <div className="mt-6 flex justify-center">
                                        <Pagination>
                                            <PaginationContent>
                                                <PaginationItem>
                                                    <PaginationPrevious
                                                        onClick={handlePrevious}
                                                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                                        size="default"
                                                    />
                                                </PaginationItem>

                                                {getPageNumbers().map((page, index) => (
                                                    <PaginationItem key={index}>
                                                        {page === 'ellipsis-start' || page === 'ellipsis-end' ? (
                                                            <PaginationEllipsis />
                                                        ) : (
                                                            <PaginationLink
                                                                onClick={() => handlePageChange(page)}
                                                                isActive={currentPage === page}
                                                                className="cursor-pointer"
                                                                size="default"
                                                            >
                                                                {page}
                                                            </PaginationLink>
                                                        )}
                                                    </PaginationItem>
                                                ))}

                                                <PaginationItem>
                                                    <PaginationNext
                                                        onClick={handleNext}
                                                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                                        size="default"
                                                    />
                                                </PaginationItem>
                                            </PaginationContent>
                                        </Pagination>
                                    </div>
                                )}

                                {/* Show current page info */}
                                {showPagination && (
                                    <div className="mt-4 text-center text-sm text-gray-500">
                                        Showing {startIdx + 1} to {Math.min(endIdx, students.length)} of {students.length} entries
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <Card className="bg-white shadow-sm border-0 rounded-xl p-4">
                            <div className="text-center text-gray-500 text-sm">
                                No attendance available.
                            </div>
                        </Card>
                    )}
                </div>
            </div >
        </div >
    )
}