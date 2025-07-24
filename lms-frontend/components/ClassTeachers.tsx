"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Calendar,
  Clock,
  Award,
  ChevronRight,
  ChevronDown,
  X,
  Download,
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import Image from "next/image";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import { FaCalendarCheck } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import { StarFilledIcon } from "@radix-ui/react-icons";

interface Student {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role?: { roleName: string } | null;
  subjects: string[];
  teacherId?: string | null;
  grade?: string;
}

interface Batch {
  _id: string;
  name: string;
  courseId?: string;
  courseTitle?: string;
  studentIds: Student[];
  createdAt: string;
  studentDetails?: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    profileImage: string;
    subjects: string[];
    grade?: string;
  };
}

interface Call {
  _id: string;
  teacherId: string;
  teacherName: string;
  date: string;
  startTime: string;
  endTime: string;
  days: string[];
  status: string;
  zoomLink: string;
}

interface BatchCallResponse {
  batch: {
    batchId: string;
    batchName: string;
    teacherId: string;
    teacherName?: string;
    studentIds: string[];
    courseId: string;
    courseTitle: string;
    calls: Call[];
    schedule: {
      scheduleStatus: string;
      scheduleDuration: string;
    };
  };
}

interface AttendanceRecord {
  attendanceId: string;
  callId: string;
  batch: { batchId: string; name: string } | null;
  course: { courseId: string; title: string } | null;
  teacher: { teacherId: string; name: string } | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  timezone: string;
  students: {
    studentId: string;
    name: string;
    status: string;
    markedAt: string | null;
    markedBy: { teacherId: string; name: string };
    rating: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

interface MappedTeacher {
  courseTitle: string;
  id: string;
  name: string;
  initials: string;
  subject: string;
  grade: string;
  schedule: string[];
  firstClassDate: string;
  totalAttended: string;
  nextClassDate: string;
  nextClassTime?: string;
  zoomLink: string;
  subjects: string[];
  profileImage?: string;
}

const Loader: React.FC = () => (
  <div className="flex items-center justify-center p-6">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
);

const ClassTeachers: React.FC = () => {
  const [selectedTeacher, setSelectedTeacher] = useState<MappedTeacher | null>(
    null
  );
  const [teachers, setTeachers] = useState<MappedTeacher[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [selectedBatchName, setSelectedBatchName] = useState<string>("");
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [modalLoading, setModalLoading] = useState(false);
  const recordsPerPage = 10;

  const isJoinButtonEnabled = (teacher: MappedTeacher) => {
    if (
      !teacher.nextClassDate ||
      teacher.nextClassDate === "N/A" ||
      !teacher.nextClassTime
    ) {
      return false;
    }

    try {
      const classDateTime = new Date(teacher.nextClassTime);
      const currentTime = new Date();
      const timeDiff =
        (classDateTime.getTime() - currentTime.getTime()) / (1000 * 60);
      return timeDiff <= 10 && timeDiff >= -30;
    } catch {
      return false;
    }
  };

  const fetchAttendanceData = async (
    batchId: string,
    batchName: string,
    fromDate?: string,
    toDate?: string
  ) => {
    if (!studentId) {
      setError("Student ID not found");
      setModalLoading(false);
      return;
    }

    try {
      setModalLoading(true);
      const params: {
        batchId: string;
        studentId: string;
        fromDate?: string;
        toDate?: string;
      } = { batchId, studentId };
      if (fromDate && toDate) {
        params.fromDate = fromDate;
        params.toDate = toDate;
      }
      const response = await api.get("/attendance/data", { params });
      const records = response.data.attendanceRecords || [];
      const filteredRecords = records.filter((record: AttendanceRecord) =>
        record.students.some((student) => student.studentId === studentId)
      );


      setAttendanceRecords(filteredRecords);
      setSelectedBatchName(batchName);
      setSelectedBatchId(batchId);
    } catch (err) {
      console.error("[ClassTeachers] Error fetching attendance:", err);
      setError("Failed to load attendance data");
      setAttendanceRecords([]);
    } finally {
      setModalLoading(false);
    }
  };

  console.log(attendanceRecords)

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = attendanceRecords.slice(
    indexOfFirstRecord,
    indexOfLastRecord
  );
  const totalPages = Math.ceil(attendanceRecords.length / recordsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
    if (selectedBatchId && selectedBatchName) {
      fetchAttendanceData(selectedBatchId, selectedBatchName);
    }
  };

  const exportToExcel = async () => {
    if (!studentId) {
      setError("Student ID not found");
      return;
    }

    try {
      const params: {
        batchId: string;
        studentId: string;
        fromDate?: string;
        toDate?: string;
      } = {
        batchId: selectedBatchId,
        studentId,
      };
      if (fromDate && toDate) {
        params.fromDate = fromDate;
        params.toDate = toDate;
      }

      // Call the /attendance/export endpoint with responseType: 'blob'
      const response = await api.get("/attendance/export", {
        params,
        responseType: "blob", // Handle binary data for Excel file
      });

      // Create a blob from the response data with correct MIME type for Excel
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${selectedBatchName}_attendance.xlsx`; // Use .xlsx extension
      link.click();
      URL.revokeObjectURL(link.href); // Clean up the URL object
    } catch (err) {
      console.error("[ClassTeachers] Error exporting attendance:", err);
      setError("Failed to export attendance data");
    }
  };

  useEffect(() => {
    const fetchBatchesAndCalls = async () => {
      try {
        setLoading(true);
        const batchesResponse = await api.get("/courses/batches/student");
        const batches: Batch[] = batchesResponse.data.batches || [];

        const extractedStudentId = batches[0]?.studentDetails?._id;
        if (!extractedStudentId) {
          setError("No student ID found in batch data");
          setLoading(false);
          return;
        }
        setStudentId(extractedStudentId);

        const filteredBatches = batches.filter(
          (batch) => batch.studentDetails?._id === extractedStudentId
        );

        if (filteredBatches.length === 0) {
          setError("No valid batches found for the student");
          setLoading(false);
          return;
        }

        const teacherMap = new Map<string, MappedTeacher>();

        await Promise.all(
          filteredBatches.map(async (batch) => {
            try {
              const callsResponse = await api.get(
                `/schedule/batch/${batch._id}/calls`,
                {
                  params: { studentId: extractedStudentId },
                }
              );
              const batchData: BatchCallResponse["batch"] =
                callsResponse.data.batch;
              const calls = batchData.calls || [];
              const currentDate = new Date();

              const schedule =
                calls.length > 0
                  ? [...new Set(calls.flatMap((call) => call.days))].map(
                    (day) => {
                      const call = calls.find((c) => c.days.includes(day));
                      if (!call) return `${day} - N/A`;

                      const dayMap: { [key: string]: string } = {
                        Sunday: "Sun",
                        Monday: "Mon",
                        Tuesday: "Tue",
                        Wednesday: "Wed",
                        Thursday: "Thu",
                        Friday: "Fri",
                        Saturday: "Sat",
                      };
                      const shortDay = dayMap[day] || day;

                      const formatTime = (time: string) => {
                        if (!time) return "N/A";
                        const [hours, minutes] = time.split(":").map(Number);
                        const period = hours >= 12 ? "PM" : "AM";
                        const adjustedHours = hours % 12 || 12;
                        return `${adjustedHours
                          .toString()
                          .padStart(2, "0")}:${minutes
                            .toString()
                            .padStart(2, "0")} ${period}`;
                      };

                      const startTime = call.startTime
                        ? formatTime(call.startTime)
                        : "N/A";
                      const endTime = call.endTime
                        ? formatTime(call.endTime)
                        : "N/A";

                      return `${shortDay} - ${startTime} - ${endTime}`;
                    }
                  )
                  : ["N/A"];

              const firstClassDate =
                calls.length > 0
                  ? new Date(
                    Math.min(
                      ...calls.map((call) => new Date(call.date).getTime())
                    )
                  ).toLocaleDateString("en-US", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                  : "N/A";

              const totalAttended =
                calls.length > 0
                  ? `${calls.filter((call) => call.status === "Completed").length
                  } / ${calls.length}`
                  : "N/A";

              const nextCall = calls.find(
                (call) =>
                  call.status === "Scheduled" &&
                  new Date(call.date) > currentDate
              );
              const nextClassDate = nextCall
                ? new Date(nextCall.date).toLocaleDateString("en-US", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
                : "N/A";

              const nextClassTime =
                nextCall && nextCall.startTime
                  ? `${new Date(nextCall.date).toLocaleDateString("en-US", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })} ${nextCall.startTime}`
                  : undefined;

              const zoomLink = nextCall?.zoomLink || "#";
              const teacherName =
                calls[0]?.teacherName ||
                batchData.teacherName ||
                "Unknown Teacher";

              const teacher: MappedTeacher = {
                id: batch._id,
                name: teacherName,
                initials:
                  teacherName
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "UT",
                subject: batch.name,
                courseTitle:
                  batch.courseTitle || batchData.courseTitle || "N/A",
                grade: batch.studentDetails?.grade || "N/A",
                subjects: batch.studentDetails?.subjects || [],
                schedule,
                firstClassDate,
                totalAttended,
                nextClassDate,
                nextClassTime,
                zoomLink,
                profileImage: batch.studentDetails?.profileImage,
              };

              if (teacherMap.has(teacherName)) {
                const existingTeacher = teacherMap.get(teacherName)!;
                existingTeacher.schedule = [
                  ...new Set([...existingTeacher.schedule, ...schedule]),
                ];
                existingTeacher.subjects = [
                  ...new Set([
                    ...existingTeacher.subjects,
                    ...teacher.subjects,
                  ]),
                ];
                existingTeacher.courseTitle = `${existingTeacher.courseTitle}, ${teacher.courseTitle}`;
              } else {
                teacherMap.set(teacherName, teacher);
              }
            } catch (callErr) {
              console.error(
                `[ClassTeachers] Error fetching calls for batch ${batch._id}:`,
                callErr
              );
              const teacher: MappedTeacher = {
                id: batch._id,
                name: "Unknown Teacher",
                initials: "UT",
                subject: batch.name,
                courseTitle: batch.courseTitle || "N/A",
                grade: batch.studentDetails?.grade || "N/A",
                subjects: batch.studentDetails?.subjects || [],
                schedule: ["N/A"],
                firstClassDate: "N/A",
                totalAttended: "N/A",
                nextClassDate: "N/A",
                nextClassTime: undefined,
                zoomLink: "#",
                profileImage: undefined,
              };
              teacherMap.set("Unknown Teacher", teacher);
            }
          })
        );

        const uniqueTeachers = Array.from(teacherMap.values());
        setTeachers(uniqueTeachers);
        setError(null);
      } catch (err) {
        console.error("[ClassTeachers] Error fetching batches:", err);
        setError("Failed to load batch data");
      } finally {
        setLoading(false);
      }
    };

    fetchBatchesAndCalls();
  }, []);

  useEffect(() => {
    if (!selectedTeacher && teachers.length > 1) {
      setSelectedTeacher(teachers[0]);
    }
  }, [selectedTeacher, teachers]);

  const handleTeacherClick = (teacher: MappedTeacher) => {
    if (teachers.length === 1) return;
    if (selectedTeacher?.id === teacher.id) {
      setSelectedTeacher(null);
    } else {
      setSelectedTeacher(teacher);
    }
  };

  const handleFilter = () => {
    if (fromDate && toDate && selectedBatchId) {
      fetchAttendanceData(selectedBatchId, selectedBatchName, fromDate, toDate);
      setCurrentPage(1);
    }
  };

  const handleOpenAttendance = (batchId: string, batchName: string) => {
    setIsModalOpen(true);
    setSelectedBatchId(batchId);
    setSelectedBatchName(batchName);
    fetchAttendanceData(batchId, batchName);
  };

  if (loading) {
    return (
      <div className="max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 p-6">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 p-6">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (teachers.length === 0) {
    return (
      <div className="max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 p-6">
        <p className="text-gray-600 text-sm">No batches available</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500 rounded-xl">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Class Teachers
              </h2>
              <p className="text-base text-gray-600">
                Guiding students every step of the way
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {teachers.map((teacher) => (
              <div key={teacher.id}>
                <div
                  className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm cursor-pointer hover:shadow-md transition-all duration-300"
                  onClick={() => handleTeacherClick(teacher)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden">
                      {teacher.profileImage ? (
                        <Image
                          src={teacher.profileImage}
                          alt={teacher.name}
                          className="w-full h-full object-cover"
                          width={48}
                          height={48}
                        />
                      ) : (
                        <div className="w-full h-full bg-blue-500 flex items-center justify-center">
                          <span className="text-white font-bold text-base">
                            {teacher.initials}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">
                        {teacher.name}
                      </h3>
                    </div>
                  </div>
                  {teachers.length > 1 &&
                    (selectedTeacher?.id === teacher.id ? (
                      <ChevronDown className="w-6 h-6 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-6 h-6 text-gray-400" />
                    ))}
                </div>

                <div
                  className={`${selectedTeacher?.id === teacher.id || teachers.length === 1
                    ? "max-h-[1000px] opacity-100"
                    : "max-h-0 opacity-0"
                    } overflow-hidden transition-all duration-500 ease-in-out transform ${selectedTeacher?.id === teacher.id || teachers.length === 1
                      ? "translate-y-0"
                      : "-translate-y-2"
                    } will-change-[max-height,opacity,transform]`}
                >
                  <div className="mt-3 p-6 bg-gray-50 rounded-2xl border border-gray-200">
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div>
                            <h3 className="font-bold text-sm text-gray-900">
                              {teacher.subject}
                            </h3>
                            <p className="text-xs text-gray-600">
                              {teacher.courseTitle}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {teacher.subjects.map((subject, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full"
                                >
                                  {subject}
                                </span>
                              ))}
                              {teacher.grade !== "N/A" && (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                                  Grade: {teacher.grade}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-blue-600" />
                            <span className="text-xs font-semibold text-blue-600 whitespace-nowrap">
                              Schedule
                            </span>
                          </div>
                          <div className="text-xs text-gray-700 space-y-2">
                            {teacher.schedule.map(
                              (time: string, index: number) => (
                                <p
                                  key={index}
                                  className="font-medium whitespace-nowrap"
                                >
                                  {time}
                                </p>
                              )
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-blue-600" />
                            <span className="text-xs font-semibold text-blue-600 whitespace-nowrap">
                              First Class
                            </span>
                          </div>
                          <div className="text-xs text-gray-700">
                            <p className="font-medium">
                              {teacher.firstClassDate}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Award className="w-3 h-3 text-blue-600" />
                            <span className="text-xs font-semibold text-blue-600 whitespace-nowrap">
                              Attended
                            </span>
                          </div>
                          <div className="text-xs text-gray-700">
                            <p className="font-medium">
                              {teacher.totalAttended}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-blue-600" />
                            <span className="text-xs font-semibold text-blue-600 whitespace-nowrap">
                              Next Class
                            </span>
                          </div>
                          <div className="text-xs text-gray-700">
                            <p className="font-medium">
                              {teacher.nextClassDate}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg shadow-blue-200 text-xs"
                          onClick={() =>
                            handleOpenAttendance(teacher.id, teacher.subject)
                          }
                        >
                          Attendance
                        </button>
                        <Link
                          href={teacher.zoomLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex-1 py-2 px-3 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg text-xs text-center ${isJoinButtonEnabled(teacher)
                            ? "bg-green-600 hover:bg-green-700 text-white shadow-green-200"
                            : "bg-gray-400 cursor-not-allowed text-gray-200 shadow-gray-200"
                            }`}
                        >
                          Join Class
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <FaCalendarCheck className="w-6 h-6 text-blue-600" />
                  Attendance for {selectedBatchName}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setFromDate("");
                    setToDate("");
                    setCurrentPage(1);
                    setAttendanceRecords([]);
                    setError(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 transition-colors p-2 rounded-full hover:bg-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal border-2 rounded-lg transition-all ${fromDate
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-300"
                          } hover:border-blue-500 focus:ring-2 focus:ring-blue-300`}
                      >
                        <Calendar className="mr-2 h-4 w-4 text-blue-600" />
                        {fromDate ? (
                          format(parseISO(fromDate), "PPP")
                        ) : (
                          <span className="text-gray-500">Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-2 border-blue-200 rounded-lg shadow-lg">
                      <CalendarComponent
                        mode="single"
                        selected={fromDate ? parseISO(fromDate) : undefined}
                        onSelect={(date) => {
                          setFromDate(date ? format(date, "yyyy-MM-dd") : "");
                          document.dispatchEvent(new MouseEvent("click"));
                        }}
                        className="rounded-lg bg-white"
                        initialFocus
                        modifiers={{
                          selected: (date: Date) =>
                            fromDate
                              ? format(parseISO(fromDate), "yyyy-MM-dd") ===
                              format(date, "yyyy-MM-dd")
                              : false,
                        }}
                        modifiersClassNames={{
                          selected:
                            "bg-blue-100 border-2 border-blue-500 rounded-full",
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal border-2 rounded-lg transition-all ${toDate
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-300"
                          } hover:border-blue-500 focus:ring-2 focus:ring-blue-300`}
                      >
                        <Calendar className="mr-2 h-4 w-4 text-blue-600" />
                        {toDate ? (
                          format(parseISO(toDate), "PPP")
                        ) : (
                          <span className="text-gray-500">Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-2 border-blue-200 rounded-lg shadow-lg">
                      <CalendarComponent
                        mode="single"
                        selected={toDate ? parseISO(toDate) : undefined}
                        onSelect={(date) => {
                          setToDate(date ? format(date, "yyyy-MM-dd") : "");
                          document.dispatchEvent(new MouseEvent("click"));
                        }}
                        className="rounded-lg bg-white"
                        initialFocus
                        modifiers={{
                          selected: (date: Date) =>
                            toDate
                              ? format(parseISO(toDate), "yyyy-MM-dd") ===
                              format(date, "yyyy-MM-dd")
                              : false,
                        }}
                        modifiersClassNames={{
                          selected:
                            "bg-blue-100 border-2 border-blue-500 rounded-full",
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex gap-2 mt-5">
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
                  <Button
                    onClick={exportToExcel}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-md"
                    disabled={modalLoading || !studentId || !selectedBatchId}
                  >
                    <Download className="w-5 h-5" />
                    Export
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {modalLoading ? (
                <Loader />
              ) : error ? (
                <p className="text-red-600 text-center p-6">{error}</p>
              ) : attendanceRecords.length === 0 ? (
                <p className="text-gray-600 text-center p-6">
                  No attendance records available.
                </p>
              ) : (
                <table className="w-full text-sm text-left text-gray-900">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0 z-10">
                    <tr className="text-center">
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Day</th>
                      <th className="px-6 py-3">Teacher</th>
                      <th className="px-6 py-3">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRecords.map((record) => {
                      const date = format(parseISO(record.date), "dd-MMM-yyyy");
                      const day = format(parseISO(record.date), "EEEE");
                      const student = record.students.find(
                        (s) => s.studentId === studentId
                      );
                      const status = student?.status || "N/A";
                      const teacher = record.teacher?.name || "N/A";
                      const rating = Number(student?.rating) || 0

                      return (
                        <tr
                          key={record.attendanceId}
                          className="bg-white border-b hover:bg-blue-50 transition-colors text-center"
                        >
                          <td className="px-6 py-4 font-semibold">{date}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-8 py-2 border-1 text-xs text-black font-bold rounded-lg ${status === "Present"
                                ? "bg-green-100 border-green-500"
                                : status === "Absent"
                                  ? "bg-red-100 border-red-500"
                                  : "bg-gray-100 border-gray-800"
                                }`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-500 font-medium">{day}</td>
                          <td className="px-6 py-4 text-gray-500 font-medium">{teacher}</td>
                          <td className="px-6 py-4 text-nowrap">
                            {[...Array(5)].map((_, index) => (
                              <StarFilledIcon
                                key={index}
                                className={`h-4 w-4 inline-block ${index < rating ? "text-yellow-400" : "text-gray-300"
                                  }`}
                              />))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {!modalLoading && attendanceRecords.length > recordsPerPage && (
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Showing {indexOfFirstRecord + 1} to{" "}
                  {Math.min(indexOfLastRecord, attendanceRecords.length)} of{" "}
                  {attendanceRecords.length} records
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationPrevious
                      size="sm"
                      onClick={() => paginate(currentPage - 1)}
                      className={
                        currentPage === 1
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            size="sm"
                            onClick={() => paginate(page)}
                            isActive={currentPage === page}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}
                    <PaginationNext
                      size="sm"
                      onClick={() => paginate(currentPage + 1)}
                      className={
                        currentPage === totalPages
                          ? "pointer-events-none opacity-50"
                          : ""
                      }
                    />
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassTeachers;
