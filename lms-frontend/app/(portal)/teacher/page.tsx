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
  Timer,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import toast from "react-hot-toast";
import moment from "moment-timezone";
import type { ScheduledCall, ApiError } from "@/types";

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

export default function TeacherPortal() {
  const { user, loading: authLoading, deviceId } = useAuth();
  const router = useRouter();
  const [upcomingClasses, setUpcomingClasses] = useState<ScheduledCall[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeCourses: 0,
    totalBatches: 0,
    classesThisWeek: 0,
  });
  const [loading, setLoading] = useState(true);

  const handleUnauthorized = useCallback(() => {
    console.debug("[TeacherPortal] Handling unauthorized access");
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("deviceId");
    toast.error("Session expired. Please log in again.");
    router.push("/login");
  }, [router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role?.roleName !== "Teacher") {
      console.debug(
        "[TeacherPortal] Redirecting due to invalid role or no user",
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
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token || !deviceId) {
          console.debug("[TeacherPortal] Missing token or deviceId", {
            token,
            deviceId,
          });
          handleUnauthorized();
          return;
        }

        let allCalls: ScheduledCall[] = [];
        let page = 1;
        let hasMore = true;
        const limit = 10;

        while (hasMore) {
          const callsResponse = await api.get(
            `/schedule/calls?page=${page}&limit=${limit}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Device-Id": deviceId,
              },
            }
          );
          allCalls = [...allCalls, ...callsResponse.data?.calls];
          hasMore = page < callsResponse.data?.pages;
          page++;
        }

        const uniqueCalls = Array.from(
          new Map(allCalls.map((c) => [c._id, c])).values()
        );
        const now = moment.tz("Asia/Kolkata");
        const upcomingCalls = uniqueCalls
          .filter((call) => {
            const callDate = moment.tz(call.date, call.timezone || "Asia/Kolkata");
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
          const callDate = moment.tz(call.date, call.timezone || "Asia/Kolkata");
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
        console.debug(
          "[TeacherPortal] Missing token or deviceId for join call",
          { token, deviceId }
        );
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
      icon: <BookOpen className="w-6 h-6" />,
      href: "/teacher/courses",
      bgColor: "bg-blue-500",
      hoverBg: "bg-blue-100",
    },
    {
      title: "Create Batch",
      description: "Organize students into learning groups",
      icon: <UserPlus className="w-6 h-6" />,
      href: "teacher/batches/create-batch",
      bgColor: "bg-indigo-500",
      hoverBg: "bg-indigo-100",
    },
    {
      title: "Schedule a Demo",
      description: "Plan a demo class for prospective students",
      icon: <CalendarPlus className="w-6 h-6" />,
      href: "/teacher/schedule?openForm=true",
      bgColor: "bg-green-500",
      hoverBg: "bg-green-100",
    },
  ];

  const statCards = [
    {
      title: "Total Students",
      value: stats.totalStudents.toString(),
      change: "+12% from last month",
      icon: <Users className="w-7 h-7" />,
      bgColor: "bg-blue-500",
      hoverBg: "bg-blue-100",
      changeColor: "text-green-600",
      href: "/teacher/students",
    },
    {
      title: "Active Batches",
      value: stats.totalBatches.toString(),
      change: "+3 new this month",
      icon: <GraduationCap className="w-7 h-7" />,
      bgColor: "bg-teal-500",
      hoverBg: "bg-teal-100",
      changeColor: "text-green-600",
      href: "/teacher/courses",
    },
    {
      title: "Classes This Week",
      value: stats.classesThisWeek.toString(),
      change: "+1 from last week",
      icon: <Video className="w-7 h-7" />,
      bgColor: "bg-indigo-500",
      hoverBg: "bg-indigo-100",
      changeColor: "text-green-600",
      href: "/teacher/schedule",
    },
    {
      title: "Completion Rate",
      value: "94%",
      change: "+5% this month",
      icon: <TrendingUp className="w-7 h-7" />,
      bgColor: "bg-yellow-500",
      hoverBg: "bg-yellow-100",
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
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <Card
              key={index}
              className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm cursor-pointer"
              onClick={() => router.push(stat.href)}
            >
              <div className="absolute inset-0 bg-blue-50 opacity-50"></div>
              <CardContent className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`p-3 rounded-xl ${stat.bgColor} text-white shadow-lg`}
                  >
                    {stat.icon}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stat.value}
                  </p>
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

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 text-white rounded-lg">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">
                      Quick Actions
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      Streamline your workflow
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {quickActions.map((action, index) => (
                  <Link key={index} href={action.href}>
                    <div className={`group relative overflow-hidden rounded-xl p-5 cursor-pointer transition-all duration-300 hover:shadow-lg border border-gray-200 hover:bg-${action.hoverBg}`}>
                      <div className="relative flex items-center gap-4">
                        <div
                          className={`p-3 rounded-xl ${action.bgColor} text-white shadow-lg group-hover:scale-110 transition-transform`}
                        >
                          {action.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {action.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {action.description}
                          </p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Classes Section */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="p-2 bg-blue-500 text-white rounded-lg">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">
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
                    className="border-gray-200 cursor-pointer hover:bg-blue-50"
                  >
                    View All
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {upcomingClasses.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {upcomingClasses.map((classItem, index) => {
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
                          className={`group relative p-4 hover:bg-blue-50 transition-all duration-300 ${
                            index === 0 ? "bg-blue-50/50" : ""
                          }`}
                        >
                          {index === 0 && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full"></div>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                              <div className="relative flex-shrink-0">
                                <div
                                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md transition-transform duration-300 group-hover:scale-105 ${
                                    isToday ? "bg-red-500" : "bg-blue-500"
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
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-900 transition-colors truncate">
                                    {classItem.classType}
                                  </h3>
                                  {timeUntil && (
                                    <div className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full ml-2">
                                      <Timer className="w-3 h-3 inline mr-1" />
                                      {timeUntil}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-blue-400" />
                                    <span className="font-medium">
                                      {isToday
                                        ? "Today"
                                        : isTomorrow
                                        ? "Tomorrow"
                                        : formatDateTime(classItem.date)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-blue-400" />
                                    <span className="font-medium">
                                      {formatTime(classItem.startTime)} -{" "}
                                      {formatTime(classItem.endTime)}
                                      <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100 align-middle">
                                        {classItem.timezone
                                          ? classItem.timezone.toUpperCase()
                                          : "Asia/Kolkata"}
                                      </span>
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isToday && (
                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs px-2 py-0.5 rounded-full">
                                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1 animate-pulse"></div>
                                      Today
                                    </Badge>
                                  )}
                                  {isTomorrow && (
                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs px-2 py-0.5 rounded-full">
                                      Tomorrow
                                    </Badge>
                                  )}
                                  {isJoinEnabled && (
                                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs px-2 py-0.5 rounded-full animate-pulse">
                                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1"></div>
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
                                className={`font-semibold cursor-pointer px-4 py-2 rounded-lg shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:hover:scale-100 ${
                                  isJoinEnabled
                                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                                    : "bg-blue-100 text-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                }`}
                              >
                                <Video className="w-4 h-4 mr-1" />
                                {isJoinEnabled ? "Join" : "Join (10 min before)"}
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
      </div>
    </div>
  );
}