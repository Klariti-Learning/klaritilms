"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Users,
  BookOpen,
  Video,
  ArrowRight,
  TrendingUp,
  UserPlus,
  CalendarPlus,
  Sparkles,
  GraduationCap,
  PlayCircle,
  TicketSlash,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import toast from "react-hot-toast";
import moment from "moment-timezone";
import type { ScheduledCall, ApiError } from "@/types";
import AttendanceButton from "@/components/AttendanceButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SelectGroup } from "@radix-ui/react-select";

const formatDateTime = (date: string) => {
  const callDate = new Date(date);
  return callDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (time: string) => {
  try {
    const [hours, minutes] = time.split(":");
    const date = new Date();
    date.setHours(Number.parseInt(hours), Number.parseInt(minutes));
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return time;
  }
};

const isJoinLinkEnabled = (
  date: string,
  startTime: string,
  endTime: string,
  timezone: string
) => {
  try {
    const now = moment.tz(timezone || "Asia/Kolkata");
    const startMoment = moment.tz(
      `${date} ${startTime}`,
      "YYYY-MM-DD h:mm a",
      timezone || "Asia/Kolkata"
    );
    const endMoment = moment.tz(
      `${date} ${endTime}`,
      "YYYY-MM-DD h:mm a",
      timezone || "Asia/Kolkata"
    );

    if (!startMoment.isValid() || !endMoment.isValid()) {
      return false;
    }

    const enableStart = startMoment.clone().subtract(10, "minutes");
    return now.isBetween(enableStart, endMoment, undefined, "[]");
  } catch {
    return false;
  }
};

const getTimeUntilClass = (
  date: string,
  startTime: string,
  timezone: string
) => {
  try {
    const now = moment.tz(timezone || "Asia/Kolkata");
    const classMoment = moment.tz(
      `${date} ${startTime}`,
      "YYYY-MM-DD h:mm a",
      timezone || "Asia/Kolkata"
    );

    if (!classMoment.isValid()) return null;

    const diff = classMoment.diff(now);
    if (diff <= 0) return "Starting now";

    const duration = moment.duration(diff);
    const days = Math.floor(duration.asDays());
    const hours = duration.hours();
    const minutes = duration.minutes();

    if (days > 0) return `in ${days}d ${hours}h`;
    if (hours > 0) return `in ${hours}h ${minutes}m`;
    return `in ${minutes}m`;
  } catch {
    return null;
  }
};

interface StudentAttendance {
  studentId: string;
  name: string;
  status: "Present" | "Absent";
  rating: number; 
}

interface AttendanceState {
  callId: string;
  attendances: StudentAttendance[];
  submitted: boolean;
}

interface ScheduledCallData extends ScheduledCall {
  days: string[];
}

export default function TeacherPortal() {
  const { user, loading: authLoading, deviceId } = useAuth();
  const router = useRouter();
  const [todaysClasses, setTodaysClasses] = useState<ScheduledCallData[]>([]);
  const [upcomingClasses, setUpcomingClasses] = useState<ScheduledCallData[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeCourses: 0,
    totalBatches: 0,
    classesThisWeek: 0,
  });
  const [loading, setLoading] = useState(true);

  const [attendance, setAttendance] = useState<AttendanceState[]>([]);

  const eligibleClasses = todaysClasses.filter((classItem) => {
    const classDate = moment.tz(
      classItem.date,
      classItem.timezone || "Asia/Kolkata"
    );
    const today = moment.tz("Asia/Kolkata");
    const isToday = classDate.isSame(today, "day");
    const classAttendance = attendance.find(
      (entry) => entry.callId === classItem._id
    );
    return isToday && classAttendance;
  });

  const [selectedClassId, setSelectedClassId] = useState<string | null>(
    eligibleClasses.length > 0 ? eligibleClasses[0]._id : null
  );

  const selectedClass = eligibleClasses.find((c) => c._id === selectedClassId);
  const classAttendance = attendance.find((a) => a.callId === selectedClassId);

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("deviceId");
    toast.error("Session expired. Please log in again.");
    router.push("/login");
  }, [router]);

  useEffect(() => {
    if (!todaysClasses || todaysClasses.length === 0) return;

    const newAttendance: AttendanceState[] = todaysClasses
      .filter((classItem) => {
        const classDate = moment.tz(
          classItem.date,
          classItem.timezone || "Asia/Kolkata"
        );
        const today = moment.tz("Asia/Kolkata");
        const isToday = classDate.isSame(today, "day");
        return isToday && classItem.studentIds?.length;
      })
      .map((classItem) => ({
        callId: classItem._id,
        attendances: classItem.studentIds.map((student) => ({
          studentId: student._id,
          name: student.name,
          status: "Present" as "Present" | "Absent",
          rating: 0, 
        })),
        submitted: false,
      }))
      .filter(
        (newEntry) =>
          !attendance.some((entry) => entry.callId === newEntry.callId)
      );

    if (newAttendance.length > 0) {
      setAttendance((prev) => [...prev, ...newAttendance]);
    }
  }, [attendance, todaysClasses]);

  const handleSubmitAttendance = async (callId: string) => {
    const classAttendance = attendance.find((entry) => entry.callId === callId);
    if (!classAttendance) {
      toast.error("No attendance data found for this class");
      return;
    }

    if (classAttendance.submitted) {
      const confirmResubmit = window.confirm(
        "This attendance has already been submitted. Are you sure you want to resubmit with changes?"
      );
      if (!confirmResubmit) return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token || !deviceId) {
        handleUnauthorized();
        return;
      }

      const payload = {
        ...classAttendance,
        idempotencyKey: `mark-${callId}-${Date.now()}`,
      };
      await api.post(`/attendance/mark`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Device-Id": deviceId,
        },
      });

      toast.success("Attendance recorded successfully");
      setAttendance((prev) =>
        prev.map((entry) =>
          entry.callId === callId ? { ...entry, submitted: true } : entry
        )
      );
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[TeacherPortal] Failed to post attendance data", apiError);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        toast.error(
          apiError.response?.data?.message || "Failed to mark attendance"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceToggle = (
    classId: string,
    studentId: string,
    status: "Present" | "Absent",
    rating?: number
  ) => {
    setAttendance((prev) =>
      prev.map((classEntry) => {
        if (classEntry.callId !== classId) return classEntry;

        return {
          ...classEntry,
          attendances: classEntry.attendances.map((student) =>
            student.studentId === studentId
              ? { ...student, status, rating: rating || student.rating }
              : student
          ),
          submitted: false,
        };
      })
    );
  };

  const handleRatingChange = (
    classId: string,
    studentId: string,
    rating: number
  ) => {
    handleAttendanceToggle(classId, studentId, "Present", rating); 
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role?.roleName !== "Teacher") {
      handleUnauthorized();
      return;
    }
  }, [user, authLoading, handleUnauthorized, router]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token || !deviceId) {
          handleUnauthorized();
          return;
        }

        let allCalls: ScheduledCallData[] = [];
        let page = 1;
        let hasMore = true;
        const limit = 10;

        while (hasMore) {
          const response = await api.get(
            `/schedule/calls?page=${page}&limit=${limit}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Device-Id": deviceId,
              },
            }
          );
          allCalls = [...allCalls, ...response.data?.calls];
          hasMore = page < response.data?.pages;
          page++;
        }
        const uniqueCalls = Array.from(
          new Map(allCalls.map((c) => [c._id, c])).values()
        );
        const now = moment.tz("Asia/Kolkata");
        const todaysCallsData = uniqueCalls.filter((call) => {
          const callDate = moment.tz(
            call.date,
            call.timezone || "Asia/Kolkata"
          );
          const isValidDate = callDate.isValid();
          const isValidTime = moment(
            `${call.date} ${call.startTime}`,
            "YYYY-MM-DD h:mm a"
          ).isValid();
          return (
            isValidDate &&
            isValidTime &&
            (call.status === "Scheduled" ||
              call.status === "Rescheduled" ||
              call.status === "Completed") &&
            callDate.isSame(now, "day")
          );
        }).sort((a, b) => {
          const aLive = isJoinLinkEnabled(
            a.date,
            a.startTime,
            a.endTime,
            a.timezone || "Asia/Kolkata"
          );
          const bLive = isJoinLinkEnabled(
            b.date,
            b.startTime,
            b.endTime,
            b.timezone || "Asia/Kolkata"
          );
          if (aLive === bLive) return 0;
          return aLive ? -1 : 1;
        });

        const upcomingCalls = uniqueCalls
          .filter((call) => {
            const callDate = moment.tz(
              call.date,
              call.timezone || "Asia/Kolkata"
            );
            const isValidDate = callDate.isValid();
            const isValidTime = moment(
              `${call.date} ${call.startTime}`,
              "YYYY-MM-DD h:mm a"
            ).isValid();
            return (
              isValidDate &&
              isValidTime &&
              (call.status === "Scheduled" || call.status === "Rescheduled") &&
              callDate.isSameOrAfter(now, "day")
            );
          })
          .sort((a, b) => {
            const dateA = moment
              .tz(
                `${a.date} ${a.startTime}`,
                "YYYY-MM-DD h:mm a",
                a.timezone || "Asia/Kolkata"
              )
              .valueOf();
            const dateB = moment
              .tz(
                `${b.date} ${b.startTime}`,
                "YYYY-MM-DD h:mm a",
                b.timezone || "Asia/Kolkata"
              )
              .valueOf();
            return dateA - dateB;
          })
          .slice(0, 3);

        setUpcomingClasses(upcomingCalls);
        setTodaysClasses(todaysCallsData);

        const [studentsResponse, batchesResponse] = await Promise.all([
          api.get(`/schedule/students?teacherId=${user?._id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Device-Id": deviceId,
            },
          }),
          api.get("/courses/batches/teacher", {
            headers: {
              Authorization: `Bearer ${token}`,
              "Device-Id": deviceId,
            },
          }),
        ]);

        const students = studentsResponse.data?.students || [];
        const batches = batchesResponse.data?.batches || [];

        const today = moment.tz("Asia/Kolkata").startOf("day");
        const endOfWeekDate = moment
          .tz("Asia/Kolkata")
          .startOf("day")
          .add(6, "days")
          .endOf("day");

        const classesThisWeek = allCalls.filter((call: ScheduledCall) => {
          const callDate = moment.tz(
            call.date,
            call.timezone || "Asia/Kolkata"
          );
          const isValidDate = callDate.isValid();
          const isValidTime = moment(
            `${call.date} ${call.startTime}`,
            "YYYY-MM-DD h:mm a"
          ).isValid();

          return (
            isValidDate &&
            isValidTime &&
            callDate.isBetween(today, endOfWeekDate, undefined, "[]") &&
            call.status !== "Completed" &&
            call.status !== "Cancelled"
          );
        }).length;

        setStats({
          totalStudents: students.length,
          activeCourses: batches.length,
          totalBatches: batches.length,
          classesThisWeek,
        });
      } catch (error) {
        const apiError = error as ApiError;
        console.error(
          "[TeacherPortal] Failed to fetch dashboard data:",
          apiError
        );
        if (apiError.response?.status === 401) {
          handleUnauthorized();
        } else {
          toast.error(
            apiError.response?.data?.message || "Failed to load dashboard data"
          );
        }
      } finally {
        setLoading(false);
      }
    };

    if (user && user.role?.roleName === "Teacher") {
      fetchDashboardData();
    }
  }, [user, handleUnauthorized, deviceId]);

  const handleJoinCall = async (callId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token || !deviceId) {
        handleUnauthorized();
        return;
      }

      const response = await api.get(`/schedule/call-links/${callId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Device-Id": deviceId,
        },
      });
      const { zoomLink } = response.data;
      if (zoomLink) {
        window.open(zoomLink, "_blank", "noopener,noreferrer");
      } else {
        toast.error("No Zoom link available");
      }
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[TeacherPortal] Failed to join call:", apiError);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        toast.error(apiError.response?.data?.message || "Failed to join call");
      }
    }
  };

  const quickActions = [
    {
      title: "Search for Course",
      description: "Find all your courses",
      icon: <BookOpen className="w-5 h-5" />,
      href: "/teacher/courses",
      bgColor: "bg-blue-500",
      hoverBg: "bg-blue-100",
    },
    {
      title: "Create Batch",
      description: "Organize students into learning groups",
      icon: <UserPlus className="w-5 h-5" />,
      href: "teacher/batches/create-batch",
      bgColor: "bg-indigo-500",
      hoverBg: "bg-indigo-100",
    },
    {
      title: "Schedule a Demo",
      description: "Plan a demo class for prospective students",
      icon: <CalendarPlus className="w-5 h-5" />,
      href: "/teacher/schedule?openForm=true",
      bgColor: "bg-green-500",
      hoverBg: "bg-green-100",
    },
    {
      title: "Raise a Ticket",
      description: "Raise your query to notify us",
      icon: <TicketSlash className="w-5 h-5" />,
      href: "/teacher/raise-query",
      bgColor: "bg-red-500",
      hoverBg: "bg-red-100",
    },
  ];

  const statCards = [
    {
      title: "Total Students",
      value: stats.totalStudents.toString(),
      change: "+12% from last month",
      icon: <GraduationCap className="w-7 h-7" />,
      bgColor: "bg-teal-500",
      hoverBg: "bg-teal-50",
      changeColor: "text-green-600",
      href: "/teacher/students",
    },
    {
      title: "Active Batches",
      value: stats.totalBatches.toString(),
      change: "+3 new this month",
      icon: <Users className="w-7 h-7" />,
      bgColor: "bg-purple-500",
      hoverBg: "bg-purple-50",
      changeColor: "text-green-600",
      href: "/teacher/courses",
    },
    {
      title: "Classes This Week",
      value: stats.classesThisWeek.toString(),
      change: "+1 from last week",
      icon: <Video className="w-7 h-7" />,
      bgColor: "bg-indigo-500",
      hoverBg: "bg-indigo-50",
      changeColor: "text-green-600",
      href: "/teacher/schedule",
    },
    {
      title: "Completion Rate",
      value: "94%",
      change: "+5% this month",
      icon: <TrendingUp className="w-7 h-7" />,
      bgColor: "bg-yellow-500",
      hoverBg: "bg-yellow-50",
      changeColor: "text-green-600",
      href: "#",
    },
  ];

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p className="mt-4 text-blue-600 font-medium">
            Loading Teacher Portal...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 p-6">
      <div className="max-w-screen mx-auto space-y-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-blue-800 p-8 text-white shadow-xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h1 className="text-4xl font-bold">Teacher Portal</h1>
              </div>
              <p className="text-blue-100 text-lg">
                Welcome back, {user?.name}! Ready to inspire minds today?
              </p>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2 text-blue-100 bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm">
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <Card
              key={index}
              className={`relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm cursor-pointer ${stat.hoverBg}`}
              onClick={() => router.push(stat.href)}
            >
              <div className="absolute inset-0 bg-blue-50 opacity-50"></div>
              <CardContent className="relative px-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-600">
                        {stat.title}
                      </p>
                      <p className="text-3xl font-bold text-gray-900">
                        {stat.value}
                      </p>
                    </div>
                    <div>
                      <div
                        className={`p-3 rounded-xl ${stat.bgColor} text-white shadow-lg`}
                      >
                        {stat.icon}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <p className={`text-sm font-medium ${stat.changeColor}`}>
                      {stat.change}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Mark Attendance */}
       <div className="lg:col-span-1">
  <Card className="border-0 drop-shadow-lg/25 bg-white backdrop-blur-sm max-h-[500px] overflow-y-auto">
    <CardHeader className="pb-0">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500 text-white rounded-lg">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <CardTitle className="text-lg font-bold text-blue-600">
            Student Attendance
          </CardTitle>
          <p className="text-sm text-gray-600">
            Today&apos;s Attendance Overview
          </p>
        </div>
      </div>
    </CardHeader>

    <CardContent className="space-y-6 px-4">
      {selectedClass && classAttendance && (
        <div className="flex justify-between items-center space-x-4">
          <div className="text-xs text-blue-500 font-semibold">Time : <span className="font-bold text-black">{selectedClass?.startTime || "00:00"}</span></div>
          <div className="text-xs text-blue-500 font-semibold">Total Students : <span className="font-bold text-black">{selectedClass?.studentIds?.length || "0"}</span></div>
        </div>
      )}
      <div className="flex justify-between items-center mt-4 space-x-4">
        <div className={(selectedClassId && classAttendance) ? "w-2/3" : "w-full"}>
          <Select
            onValueChange={setSelectedClassId}
            value={selectedClassId ?? undefined}
            disabled={eligibleClasses.length === 0}
          >
            <SelectTrigger
              className="w-full bg-white border border-gray-200 rounded-lg shadow-md text-gray-700 text-xs font-medium py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:ring-offset-white disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-gradient-to-r hover:from-white hover:to-blue-50 transition-all duration-300 ease-in-out"
            >
              {selectedClass ? (
                <span className="flex items-center">
                  {isJoinLinkEnabled(
                    selectedClass.date,
                    selectedClass.startTime,
                    selectedClass.endTime,
                    selectedClass.timezone || "Asia/Kolkata"
                  ) && (
                      <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-[pulse_1.5s_ease-in-out_infinite] shadow-[0_0_6px_rgba(239,68,68,0.5)] inline-block" />
                    )}
                  <span className="truncate text-xs">{`${selectedClass.classType} — ${formatDateTime(selectedClass.date)}`}</span>
                </span>
              ) : (
                <SelectValue
                  placeholder="Select a live class to mark attendance"
                  className="text-gray-500 text-xs font-medium italic"
                />
              )}
            </SelectTrigger>
            <SelectContent
              className="bg-white/95 backdrop-blur-md border border-gray-100 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50 mt-1 p-1 cursor-pointer"
            >
              <SelectGroup>
                {eligibleClasses.map((classItem) => {
                  const isLive = isJoinLinkEnabled(
                    classItem.date,
                    classItem.startTime,
                    classItem.endTime,
                    classItem.timezone || "Asia/Kolkata"
                  );
                  return (
                    <SelectItem
                      key={classItem._id}
                      value={classItem._id}
                      className="w-full text-gray-700 py-2 px-3 text-xs font-medium rounded-md hover:bg-blue-50/80 hover:text-blue-600 focus:bg-blue-100 focus:text-blue-700 focus:outline-none cursor-pointer transition-all duration-200 ease-in-out hover:scale-[1.02] flex items-center group"
                    >
                      {isLive && (
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-[pulse_1.5s_ease-in-out_infinite] shadow-[0_0_6px_rgba(239,68,68,0.5)] inline-block group-hover:scale-125 transition-transform" />
                      )}
                      <span className="truncate text-xs">{`${classItem.classType} — ${formatDateTime(classItem.date)}`}</span>
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        {selectedClassId && classAttendance && (
          <div className="text-xs text-blue-500 font-semibold">
            Days : <span className="font-bold text-black">{selectedClass?.days?.length === 0 ? new Date().toLocaleDateString("en-US", { weekday: "short" }) : (selectedClass?.days.join(","))}</span>
          </div>
        )}
      </div>
{selectedClass && classAttendance && (
  <div className="space-y-4">
    <div className="flex items-center justify-center text-sm bg-blue-50 font-semibold text-blue-500 p-3 px-4 rounded-lg">
      <span className="w-1/6 text-center truncate">Sl. No</span>
      <span className="w-3/6 text-center truncate">Name</span>
      <span className="w-2/6 text-center truncate">Status</span>
    </div>

    {classAttendance.attendances.map((student, index) => (
      <div
        key={student.studentId}
        className="flex items-center justify-between text-sm bg-white p-2 rounded-lg shadow-sm hover:bg-gray-50 transition-all duration-200"
      >
        <div className="w-1/6 font-medium text-gray-700 text-center truncate">{index + 1}</div>
        <div className="w-3/6 flex flex-col items-center">
          <div className="font-medium text-gray-700 truncate mt-5">{student.name}</div>
          <div className="flex space-x-1 ">
            {Array.from({ length: 5 }, (_, i) => (
              <span
                key={i}
                className={`cursor-pointer ${student.rating > 0 && i < student.rating ? "text-yellow-500" : "text-gray-300"} hover:text-yellow-500 transition-all duration-300 ease-in-out`}
                onClick={() => handleRatingChange(selectedClass._id, student.studentId, i + 1)}
              >
                ★
              </span>
            ))}
          </div>
        </div>
        <div className="w-2/6 flex justify-center gap-1">
          <button
            className="px-2 py-1 rounded-md text-xs font-semibold transition-all duration-300"
            onClick={() =>
              handleAttendanceToggle(
                selectedClass._id,
                student.studentId,
                student.status === "Present" ? "Absent" : "Present"
              )
            }
            type="button"
          >
            <AttendanceButton status={student.status} />
          </button>
        </div>
      </div>
    ))}
    <Button
      onClick={() => handleSubmitAttendance(selectedClass._id)}
      disabled={loading}
      className={`w-full text-sm font-semibold ${classAttendance.submitted
        ? "bg-blue-500 hover:bg-blue-600 text-white"
        : "bg-blue-600 hover:bg-blue-700 text-white"
        } transition-all duration-300`}
    >
      {loading
        ? "Submitting..."
        : classAttendance.submitted
          ? "Resubmit"
          : "Submit"}
    </Button>
  </div>
)}

{eligibleClasses.length === 0 && (
  <p className="text-center text-gray-600 text-sm">
    No live classes available for attendance.
  </p>
)}
    </CardContent>
  </Card>
</div>
          {/* Upcoming Classes Section */}
          <div className="lg:col-span-2 upcoming-classes-section">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm overflow-hidden py-6 px-4">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="p-2 bg-blue-500 text-white rounded-lg">
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-[#1447E6]">
                      Upcoming Classes
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      Your next teaching sessions
                    </p>
                  </div>
                </div>
                <Link href="/teacher/schedule">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#1D44B5] cursor-pointer hover:bg-blue-50 bg-transparent text-[#1D44B5] font-[400]"
                  >
                    View All <ArrowUpRight />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="">
                {upcomingClasses.length > 0 ? (
                  <div className="divide-y divide-red-400 flex flex-col gap-y-3">
                    {upcomingClasses.map((classItem) => {
                      const isJoinEnabled = isJoinLinkEnabled(
                        classItem.date,
                        classItem.startTime,
                        classItem.endTime,
                        classItem.timezone || "Asia/Kolkata"
                      );
                      const timeUntil = getTimeUntilClass(
                        classItem.date,
                        classItem.startTime,
                        classItem.timezone || "Asia/Kolkata"
                      );
                      const isToday = moment(classItem.date).isSame(
                        moment(),
                        "day"
                      );
                      const isTomorrow = moment(classItem.date).isSame(
                        moment().add(1, "day"),
                        "day"
                      );

                      return (
                        <div
                          key={classItem._id}
                          className={`group relative p-4 hover:bg-blue-50 transition-all duration-300 border-[1px] border-[#CBCBCB] rounded-lg`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                              <div className="relative flex-shrink-0">
                                <div
                                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md transition-transform duration-300 group-hover:scale-105 ${isToday ? "bg-red-500" : "bg-blue-500"
                                    }`}
                                >
                                  <PlayCircle className="w-6 h-6" />
                                </div>
                                {isJoinEnabled && (
                                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse mx-auto mt-0.5"></div>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0 flex gap-y-3 flex-col">
                                <div className="flex items-center justify-between">
                                  <div className="text-lg font-bold text-gray-900 group-hover:text-blue-900 transition-colors truncate flex">
                                    <span className="">{classItem.classType}</span>
                                    {timeUntil && (
                                      <div className="text-sm font-semibold h-fit text-blue-600 bg-blue-100 rounded-full ml-2 flex items-center justify-center py-1 px-3">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="16"
                                          height="16"
                                          viewBox="0 0 12 12"
                                          fill="none"
                                          className=""
                                        >
                                          <g clipPath="url(#clip0_350_2042)">
                                            <path d="M10.9303 4.40944C11.1507 4.19123 11.3256 3.93145 11.4448 3.64516C11.5641 3.35887 11.6253 3.05176 11.625 2.74163C11.625 1.44169 10.5696 0.388125 9.26831 0.387938H9.26737C8.61488 0.387938 8.02369 0.653063 7.59713 1.08131L8.98781 2.46975L8.6745 2.78644C7.89169 2.24866 6.96399 1.96135 6.01425 1.96256C5.06453 1.96129 4.13683 2.24854 3.354 2.78625L3.01819 2.44669L4.37681 1.07269C4.16057 0.851721 3.90235 0.676181 3.61734 0.556372C3.33232 0.436563 3.02624 0.374899 2.71706 0.375C1.4235 0.375 0.375 1.43531 0.375 2.74331C0.375 3.39956 0.638625 3.99337 1.06519 4.42219L2.43806 3.03375L2.71463 3.31331C2.26305 3.7552 1.90446 4.28298 1.65996 4.86556C1.41546 5.44814 1.28999 6.07375 1.29094 6.70556C1.29094 7.647 1.56525 8.52375 2.03625 9.26175L1.64081 11.625H1.99069C2.20931 11.625 2.29013 11.3683 2.43225 11.049C2.55862 10.7624 2.68374 10.4753 2.80763 10.1876C3.64969 10.9706 4.776 11.4493 6.01425 11.4493C7.25231 11.4493 8.37844 10.9703 9.22088 10.1876C9.34473 10.4753 9.46992 10.7625 9.59644 11.049C9.73875 11.3683 9.81919 11.625 10.0378 11.625H10.3877L9.99281 9.26119C10.4803 8.4981 10.7388 7.61126 10.7378 6.70575C10.7387 6.07397 10.6132 5.4484 10.3687 4.86585C10.1242 4.2833 9.76561 3.75556 9.31406 3.31369L9.57206 3.05306L10.9303 4.40944ZM9.68813 6.70575C9.68813 8.74331 8.04319 10.3954 6.01425 10.3954C3.98531 10.3954 2.34056 8.74331 2.34056 6.70575C2.34056 4.66856 3.98513 3.01669 6.01425 3.01669C8.043 3.01669 9.68813 4.66838 9.68813 6.70575Z" fill="#2D6EFC" />
                                            <path d="M6.36396 6.10086V4.0708H5.6644V6.10086C5.55826 6.16231 5.4701 6.25053 5.40871 6.3567C5.34731 6.46287 5.31484 6.58328 5.31452 6.70593C5.31452 6.86174 5.36646 7.00461 5.45177 7.12105L3.86102 8.72943L4.07852 8.94993L5.68671 7.32374C5.78459 7.37624 5.89521 7.40886 6.01427 7.40886C6.27265 7.40886 6.49559 7.26674 6.61709 7.05749H7.76365V6.35493H6.61709C6.55644 6.24952 6.46915 6.1619 6.36396 6.10086Z" fill="#2D6EFC" />
                                          </g>
                                          <defs>
                                            <clipPath id="clip0_350_2042">
                                              <rect width="12" height="12" fill="white" />
                                            </clipPath>
                                          </defs>
                                        </svg>
                                        <span className="ml-2">
                                          {timeUntil}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-5 text-blue-400" />
                                    <span className="font-medium text-sm">
                                      {isToday
                                        ? "Today"
                                        : isTomorrow
                                          ? "Tomorrow"
                                          : formatDateTime(classItem.date)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-5 text-blue-400" />
                                    <span className="font-medium">
                                      {formatTime(classItem.startTime)} -{" "}
                                      {formatTime(classItem.endTime)}
                                      <span className="ml-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold border border-blue-100 align-middle">
                                        {classItem.timezone
                                          ? classItem.timezone.toUpperCase()
                                          : "ASIA / KOLKATA"}
                                      </span>
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isToday && (
                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-sm px-3 py-1 rounded-full flex items-center justify-center">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-1 animate-pulse"></div>
                                      Today
                                    </Badge>
                                  )}
                                  {isTomorrow && (
                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-sm px-3 py-1 rounded-full flex items-center justify-center">
                                      Tomorrow
                                    </Badge>
                                  )}
                                  {isJoinEnabled && (
                                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-sm px-3 py-1 rounded-full animate-pulse flex items-center justify-center">
                                      <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                                      Live
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex-shrink-0 ml-4">
                              <Button
                                onClick={() => handleJoinCall(classItem._id)}
                                disabled={!isJoinEnabled}
                                size="sm"
                                className={`font-semibold cursor-pointer px-10 py-3 rounded-lg shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:hover:scale-100 ${isJoinEnabled
                                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                                  : "bg-blue-100 text-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                  }`}
                              >
                                <Video className="w-4 h-4 mr-1" />
                                {isJoinEnabled
                                  ? "Join the class"
                                  : "Join (10 min before)"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 px-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                      <Calendar className="w-8 h-6 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-700 mb-2">
                      No Upcoming Classes
                    </h3>
                    <p className="text-gray-600 mb-4 text-sm">
                      Your schedule is clear! Perfect time to plan new classes.
                    </p>
                    <Link href="/teacher/schedule?openForm=true">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105">
                        <CalendarPlus className="w-4 h-4 mr-2" />
                        Schedule New Class
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-10 mx-2">
          <div className="flex items-center gap-4">
            <div className="p-1.5 bg-blue-500 text-white rounded-lg">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Quick Actions
              </CardTitle>
              <p className="text-sm text-gray-600">
                Streamline your workflow
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-10">
            {quickActions.map((action, index) => (
              <Link key={index} href={action.href} className="h-full">
                <div
                  className={`h-full bg-white group relative overflow-hidden rounded-xl py-8 px-4 cursor-pointer shadow transition-all duration-300 hover:shadow-lg border border-gray-200 flex flex-col justify-center hover:bg-${action.hoverBg}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${action.bgColor} text-white shadow-md group-hover:scale-110 transition-transform`}
                    >
                      {action.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm text-gray-900 mb-1">
                        {action.title}
                      </h3>
                      <p className="text-xs text-gray-600">
                        {action.description}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}