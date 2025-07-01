"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CalendarIcon,
  Clock,
  User,
  ChevronDown,
  UserPlus,
  XCircle,
  Sparkles,
  Video,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment-timezone";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import toast from "react-hot-toast";
import "react-vertical-timeline-component/style.min.css";
import { ApiError, ScheduledCall } from "@/types";
import { Badge } from "@/components/ui/badge";

interface StudentScheduleCallState {
  scheduledCalls: ScheduledCall[];
  loading: boolean;
  callView: "upcoming" | "today" | "week";
  openCards: Record<string, boolean>;
}

const formatDateTime = (date: string) => {
  const callDate = new Date(date);
  return callDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatTimeRange = (
  date: string,
  startTime: string,
  endTime: string,
  timezone: string
) => {
  try {
    let parsedDate = date;
    if (!moment(date, "YYYY-MM-DD", true).isValid()) {
      const dateMoment = moment(date);
      if (!dateMoment.isValid()) {
        console.error("Invalid date format in formatTimeRange:", date);
        return "Invalid Date";
      }
      parsedDate = dateMoment.format("YYYY-MM-DD");
    }

    const timeFormats = [
      "H:mm",
      "HH:mm",
      "h:mm a",
      "h:mm A",
      "HH:mm:ss",
      "h:mm:ss a",
    ];

    let startMoment: moment.Moment | null = null;
    let endMoment: moment.Moment | null = null;

    for (const format of timeFormats) {
      startMoment = moment.tz(
        `${parsedDate} ${startTime}`,
        `YYYY-MM-DD ${format}`,
        timezone
      );
      if (startMoment.isValid()) {
        break;
      }
    }

    for (const format of timeFormats) {
      endMoment = moment.tz(
        `${parsedDate} ${endTime}`,
        `YYYY-MM-DD ${format}`,
        timezone
      );
      if (endMoment.isValid()) {
        break;
      }
    }

    if (
      !startMoment ||
      !startMoment.isValid() ||
      !endMoment ||
      !endMoment.isValid()
    ) {
      console.error(
        "Invalid time format in formatTimeRange:",
        { startTime, endTime },
        "Tried formats:",
        timeFormats
      );
      return "Invalid Time";
    }

    const startFormatted = startMoment.format("h:mm a");
    const endFormatted = endMoment.format("h:mm a");
    return `${startFormatted} - ${endFormatted}`;
  } catch (error) {
    console.error("Error formatting time range:", error);
    return "Invalid Time";
  }
};

const isJoinLinkEnabled = (
  date: string,
  startTime: string,
  endTime: string,
  timezone: string
) => {
  const now = moment.tz(timezone);
  const callDate = moment.tz(date, timezone);

  if (!callDate.isValid()) {
    return false;
  }
  try {
    const startMoment = moment.tz(
      `${date} ${startTime}`,
      "YYYY-MM-DD H:mm",
      timezone
    );
    const endMoment = moment.tz(
      `${date} ${endTime}`,
      "YYYY-MM-DD H:mm",
      timezone
    );

    if (!startMoment.isValid() || !endMoment.isValid()) {
      return false;
    }

    const enableStart = startMoment.clone().subtract(10, "minutes");
    return now.isBetween(enableStart, endMoment, undefined, "[]");
  } catch (error) {
    console.error("Error checking join link:", error);
    return false;
  }
};

const handleJoinCall = async (
  zoomLink: string,
  handleUnauthorized: () => void
) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      handleUnauthorized();
      return;
    }
    if (zoomLink) {
      window.open(zoomLink, "_blank", "noopener,noreferrer");
    } else {
      toast.error("No Zoom link available");
    }
  } catch (error) {
    const apiError = error as ApiError;
    console.error("[StudentScheduleCall] Failed to join call:", apiError);
    const errorMessage =
      apiError.response?.data?.message || "Failed to join call";
    if (apiError.response?.status === 401) {
      handleUnauthorized();
    } else {
      toast.error(errorMessage);
    }
  }
};

export default function StudentScheduleCall() {
  const { user, loading: authLoading, deviceId } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<StudentScheduleCallState>({
    scheduledCalls: [],
    loading: true,
    callView: "upcoming",
    openCards: {},
  });
  const [error, setError] = useState<string | null>(null);

  const handleUnauthorized = useCallback(() => {
    console.debug("[StudentScheduleCall] Handling unauthorized access");
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("isLoggedIn");
    router.push("/login");
  }, [router]);

  const fetchCalls = useCallback(async () => {
    if (!user || !deviceId) return;

    try {
      setState((prev) => ({ ...prev, loading: true }));
      setError(null);
      const token = localStorage.getItem("token");
      if (!token) {
        handleUnauthorized();
        return;
      }

      let allCalls: ScheduledCall[] = [];
      let page = 1;
      let hasMore = true;
      const limit = 10;

      while (hasMore) {
        const callsResponse = await api.get(
          `/schedule/student/calls?page=${page}&limit=${limit}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Device-Id": deviceId,
            },
          }
        );

        allCalls = [...allCalls, ...callsResponse.data.calls];
        hasMore = page < callsResponse.data.pages;
        page++;
      }

      setState((prev) => ({
        ...prev,
        scheduledCalls: allCalls,
        loading: false,
      }));
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[StudentScheduleCall] Failed to fetch calls:", apiError);
      const errorMessage =
        apiError.response?.data?.message || "Failed to fetch calls";
      setError(errorMessage);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        toast.error(errorMessage);
      }
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [user, deviceId, handleUnauthorized]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role?.roleName !== "Student") {
      console.debug("[StudentScheduleCall] Redirecting to login", {
        user: !!user,
        role: user?.role?.roleName,
        authLoading,
      });
      handleUnauthorized();
      return;
    }
    console.debug("[StudentScheduleCall] Fetching calls", { userId: user._id });
    fetchCalls();
  }, [user, authLoading, fetchCalls, handleUnauthorized]);

  useEffect(() => {
    const interval = setInterval(async () => {
      await fetchCalls();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchCalls]);

  if (authLoading || state.loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100">
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

  if (!user || user.role?.roleName !== "Student") {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl shadow-lg max-w-md w-full text-center"
        >
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-700 font-medium mb-4">{error}</p>
          <Button
            onClick={() => {
              setError(null);
              fetchCalls();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Try Again
          </Button>
        </motion.div>
      </div>
    );
  }

  const sortedCalls = [...state.scheduledCalls].sort((a, b) => {
    const dateA = moment
      .tz(`${a.date} ${a.startTime}`, "YYYY-MM-DD H:mm", a.timezone || "UTC")
      .valueOf();
    const dateB = moment
      .tz(`${b.date} ${b.startTime}`, "YYYY-MM-DD H:mm", b.timezone || "UTC")
      .valueOf();
    return dateA - dateB;
  });

  const todayCalls = sortedCalls.filter((call) => {
    const callDate = moment.tz(call.date, call.timezone || "UTC");
    const today = moment.tz(call.timezone || "UTC").startOf("day");
    return (
      callDate.isSame(today, "day") &&
      call.status !== "Completed" &&
      call.status !== "Cancelled"
    );
  });

  const weekCalls = sortedCalls.filter((call) => {
    const callDate = moment.tz(call.date, call.timezone || "UTC");
    const today = moment.tz(call.timezone || "UTC").startOf("day");
    const endOfWeekDate = moment
      .tz(call.timezone || "UTC")
      .startOf("day")
      .add(6, "days")
      .endOf("day");
    return (
      callDate.isBetween(today, endOfWeekDate, undefined, "[]") &&
      call.status !== "Completed" &&
      call.status !== "Cancelled"
    );
  });

  const upcomingCalls = sortedCalls
    .filter((call) => {
      const callDate = moment.tz(call.date, call.timezone || "UTC");
      const today = moment.tz(call.timezone || "UTC").startOf("day");
      return (
        (call.status === "Scheduled" || call.status === "Rescheduled") &&
        callDate.isSame(today, "day")
      );
    })
    .slice(0, 2);

  const displayCalls =
    state.callView === "upcoming"
      ? upcomingCalls
      : state.callView === "today"
      ? todayCalls
      : state.callView === "week"
      ? weekCalls
      : upcomingCalls;

  const toggleCard = (callId: string) => {
    setState((prev) => ({
      ...prev,
      openCards: {
        [callId]: !prev.openCards[callId],
        ...Object.keys(prev.openCards).reduce((acc, key) => {
          if (key !== callId) {
            acc[key] = false;
          }
          return acc;
        }, {} as Record<string, boolean>),
      },
    }));
  };

  const getFilterTitle = () => {
    switch (state.callView) {
      case "upcoming":
        return "Upcoming Classes";
      case "today":
        return "Today's Classes";
      case "week":
        return "Weekly Classes";
      default:
        return "Your Classes";
    }
  };

  const filterOptions = [
    {
      key: "upcoming" as const,
      label: "Upcoming Classes",
      icon: Clock,
      color: "from-blue-500 to-cyan-500",
    },
    {
      key: "today" as const,
      label: "Today's Classes",
      icon: BookOpen,
      color: "from-emerald-500 to-green-500",
    },
    {
      key: "week" as const,
      label: "Weekly Classes",
      icon: GraduationCap,
      color: "from-purple-500 to-pink-500",
    },
  ];

  const getClassCount = (filter: string) => {
    switch (filter) {
      case "upcoming":
        return upcomingCalls.length;
      case "today":
        return todayCalls.length;
      case "week":
        return weekCalls.length;
      default:
        return 0;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br mt-22 from-slate-50 via-blue-50/30 to-indigo-100/50 relative overflow-hidden">
      {/* Compact Floating Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 20,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
          className="absolute top-10 right-10 w-48 h-48 bg-gradient-to-br from-purple-400/15 via-pink-400/15 to-blue-400/15 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
            scale: [1, 0.8, 1],
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{
            duration: 25,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: 5,
          }}
          className="absolute bottom-10 left-10 w-40 h-40 bg-gradient-to-br from-cyan-400/15 via-blue-400/15 to-indigo-400/15 rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Compact Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center mb-4">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative"
              >
                <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 p-3 rounded-2xl shadow-lg mr-4 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
                  <CalendarIcon className="w-6 h-6 text-white relative z-10" />
                </div>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent"
              >
                Schedule Class
              </motion.h1>
              <motion.div
                initial={{ scale: 0, rotate: 180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.4, delay: 0.6 }}
              >
                <Sparkles className="w-6 h-6 text-purple-500 ml-3" />
              </motion.div>
            </div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.8 }}
              className="text-lg text-slate-600 mb-6 max-w-2xl mx-auto"
            >
              Create engaging learning experiences with our advanced scheduling
              system
            </motion.p>
          </motion.div>

          {/* Compact Main Content */}
          <div className="flex flex-col xl:flex-row gap-6">
            {/* Compact Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="xl:w-80"
            >
              <Card className="bg-white/80 backdrop-blur-xl border-0 shadow-xl rounded-2xl overflow-hidden ring-1 ring-white/50">
                <CardHeader className="bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 text-white p-5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                  <CardTitle className="text-xl font-bold relative z-10 flex items-center">
                    <div className="p-2 bg-white/20 rounded-lg mr-3">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    Filter Classes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-3">
                  {filterOptions.map((option, index) => {
                    const IconComponent = option.icon;
                    const isActive = state.callView === option.key;
                    const classCount = getClassCount(option.key);

                    return (
                      <motion.div
                        key={option.key}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          variant="ghost"
                          className={`w-full justify-between h-12 rounded-xl font-semibold text-left transition-all duration-300 relative overflow-hidden group ${
                            isActive
                              ? `bg-gradient-to-r ${option.color} text-white shadow-lg ring-2 ring-white/30`
                              : "text-slate-700 hover:bg-slate-100/80 hover:shadow-md"
                          }`}
                          onClick={() =>
                            setState((prev) => ({
                              ...prev,
                              callView: option.key,
                            }))
                          }
                        >
                          <div className="flex items-center">
                            <div
                              className={`p-2 rounded-lg mr-3 transition-all duration-300 ${
                                isActive
                                  ? "bg-white/20"
                                  : "bg-slate-100 group-hover:bg-slate-200"
                              }`}
                            >
                              <IconComponent
                                className={`w-4 h-4 ${
                                  isActive ? "text-white" : "text-slate-600"
                                }`}
                              />
                            </div>
                            <span className="text-sm">{option.label}</span>
                          </div>
                          <Badge
                            variant="secondary"
                            className={`${
                              isActive
                                ? "bg-white/20 text-white border-white/30"
                                : "bg-slate-100 text-slate-600"
                            } px-2 py-1 text-xs font-bold`}
                          >
                            {classCount}
                          </Badge>
                        </Button>
                      </motion.div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>

            {/* Compact Main Content Area */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex-1"
            >
              <Card className="bg-white/80 backdrop-blur-xl border-0 shadow-xl rounded-2xl overflow-hidden min-h-[500px] ring-1 ring-white/50">
                <CardHeader className="bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 text-white p-5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                  <div className="flex items-center justify-between relative z-10">
                    <CardTitle className="text-2xl font-bold flex items-center">
                      <div className="p-2 bg-white/20 rounded-lg mr-3">
                        <CalendarIcon className="w-5 h-5" />
                      </div>
                      {getFilterTitle()}
                    </CardTitle>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button className="bg-white/20 hover:bg-white/30 text-white border-0 rounded-xl px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-all duration-300">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        Schedule New Class
                      </Button>
                    </motion.div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {state.loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: "linear",
                        }}
                        className="w-8 h-8 border-3 border-purple-200 border-t-purple-600 rounded-full mb-4"
                      />
                      <p className="text-slate-600 text-lg font-medium">
                        Loading your classes...
                      </p>
                    </div>
                  ) : displayCalls.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-12"
                    >
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-100 via-blue-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <CalendarIcon className="w-8 h-8 text-purple-500" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-700 mb-2">
                        No Classes Found
                      </h3>
                      <p className="text-slate-500">
                        {state.callView === "upcoming"
                          ? "No upcoming classes scheduled"
                          : state.callView === "today"
                          ? "No classes scheduled for today"
                          : "No classes scheduled for this week"}
                      </p>
                    </motion.div>
                  ) : (
                    <div className="relative">
                      {/* Compact Timeline Line */}
                      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 via-blue-500 to-cyan-500 rounded-full"></div>

                      <AnimatePresence>
                        <div className="space-y-4">
                          {displayCalls.map((call, index) => (
                            <motion.div
                              key={call._id}
                              initial={{ opacity: 0, y: 30, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -30, scale: 0.95 }}
                              transition={{
                                duration: 0.4,
                                delay: index * 0.1,
                                ease: [0.25, 0.46, 0.45, 0.94],
                              }}
                              className="relative pl-12"
                            >
                              {/* Compact Timeline Dot */}
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{
                                  duration: 0.3,
                                  delay: index * 0.1 + 0.2,
                                }}
                                className="absolute left-4 top-5 w-3 h-3 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-full shadow-lg transform -translate-x-1/2 ring-2 ring-white"
                              ></motion.div>

                              {/* Compact Class Card */}
                              <motion.div
                                whileHover={{
                                  scale: 1.01,
                                  y: -2,
                                  boxShadow:
                                    "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
                                }}
                                transition={{ duration: 0.2 }}
                                className="bg-gradient-to-br from-white to-slate-50/80 rounded-2xl p-5 shadow-lg hover:shadow-xl border border-white/50 backdrop-blur-sm relative overflow-hidden group"
                              >
                                {/* Hover Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/3 via-blue-500/3 to-cyan-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>

                                <div className="relative z-10">
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center flex-1">
                                      <motion.div
                                        whileHover={{ rotate: 5, scale: 1.05 }}
                                        className="bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 p-3 rounded-xl mr-4 shadow-md relative overflow-hidden flex-shrink-0"
                                      >
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl"></div>
                                        <Video className="w-5 h-5 text-white relative z-10" />
                                      </motion.div>
                                      <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-bold text-slate-900 mb-1 leading-tight truncate">
                                          {call.classType} - {call.type}
                                        </h3>
                                        <p className="text-slate-500 text-sm flex items-center">
                                          <CalendarIcon className="w-3 h-3 mr-1" />
                                          {formatDateTime(call.date)}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Status Badge and Join Button - Different logic for upcoming vs other views */}
                                    <div className="flex items-center gap-2 ml-4">
                                      <Badge className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-3 py-1 text-xs font-semibold">
                                        {call.status === "Scheduled" ||
                                        call.status === "Rescheduled"
                                          ? "Upcoming"
                                          : call.status}
                                      </Badge>

                                      {state.callView === "upcoming" ? (
                                        // For upcoming classes: Show join button, no expand functionality
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0.8 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          transition={{
                                            duration: 0.3,
                                            delay: 0.2,
                                          }}
                                        >
                                          <Button
                                            size="sm"
                                            className={`bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-700 hover:via-blue-700 hover:to-cyan-700 text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 relative overflow-hidden group ${
                                              !isJoinLinkEnabled(
                                                call.date,
                                                call.startTime,
                                                call.endTime,
                                                call.timezone || "UTC"
                                              )
                                                ? "opacity-60 cursor-not-allowed hover:scale-100"
                                                : ""
                                            }`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleJoinCall(
                                                call.zoomLink,
                                                handleUnauthorized
                                              );
                                            }}
                                            disabled={
                                              !isJoinLinkEnabled(
                                                call.date,
                                                call.startTime,
                                                call.endTime,
                                                call.timezone || "UTC"
                                              )
                                            }
                                            aria-label="Join call"
                                          >
                                            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                                            <Video className="w-4 h-4 mr-1 relative z-10" />
                                            <span className="relative z-10">
                                              Join
                                            </span>
                                          </Button>
                                        </motion.div>
                                      ) : (
                                        // For other views: Show expand button
                                        <motion.button
                                          onClick={() => toggleCard(call._id)}
                                          animate={{
                                            rotate: state.openCards[call._id]
                                              ? 180
                                              : 0,
                                          }}
                                          transition={{ duration: 0.3 }}
                                          className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                                        >
                                          <ChevronDown className="w-4 h-4 text-slate-600" />
                                        </motion.button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Teacher and Time Info - Vertical Layout */}
                                  <div className="flex items-center space-x-6 text-gray-600">
                                    <motion.div
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ duration: 0.3, delay: 0.1 }}
                                      className="flex items-center"
                                    >
                                      <div className="bg-blue-100 p-2 rounded-lg mr-3">
                                        <User className="w-4 h-4 text-blue-600" />
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500 font-medium">
                                          Teacher
                                        </p>
                                        <p className="font-semibold text-gray-900">
                                          {call.teacherId.name}
                                        </p>
                                      </div>
                                    </motion.div>
                                    <motion.div
                                      initial={{ opacity: 0, x: 10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ duration: 0.3, delay: 0.2 }}
                                      className="flex items-center"
                                    >
                                      <div className="bg-purple-100 p-2 rounded-lg mr-3">
                                        <Clock className="w-4 h-4 text-purple-600" />
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-500 font-medium">
                                          Time
                                        </p>
                                        <p className="font-semibold text-gray-900">
                                          {formatTimeRange(
                                            call.date,
                                            call.startTime,
                                            call.endTime,
                                            call.timezone || "UTC"
                                          )}
                                        </p>
                                      </div>
                                    </motion.div>
                                  </div>

                                  {/* Expandable Section - ONLY for non-upcoming views */}
                                  {state.callView !== "upcoming" && (
                                    <AnimatePresence>
                                      {state.openCards[call._id] && (
                                        <motion.div
                                          initial={{
                                            opacity: 0,
                                            height: 0,
                                            y: -10,
                                          }}
                                          animate={{
                                            opacity: 1,
                                            height: "auto",
                                            y: 0,
                                          }}
                                          exit={{
                                            opacity: 0,
                                            height: 0,
                                            y: -10,
                                          }}
                                          transition={{ duration: 0.4 }}
                                          className="mt-4 pt-4 border-t border-slate-200"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{
                                              duration: 0.3,
                                              delay: 0.1,
                                            }}
                                            className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 mb-4"
                                          >
                                            <div className="flex items-center">
                                              <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg mr-3 shadow-sm">
                                                <UserPlus className="w-4 h-4 text-white" />
                                              </div>
                                              <div>
                                                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-0.5">
                                                  Scheduled By
                                                </p>
                                                <p className="font-bold text-slate-900 text-sm">
                                                  {call.scheduledBy?.name ||
                                                    "Unknown"}
                                                </p>
                                              </div>
                                            </div>
                                            {call.scheduledBy?.roleName ===
                                            "Admin" ? (
                                              <Badge className="bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-white px-3 py-1 text-xs font-semibold">
                                                {call.scheduledBy?.roleName ||
                                                  "Admin"}
                                              </Badge>
                                            ) : (
                                              <Badge className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-3 py-1 text-xs font-semibold">
                                                Teacher
                                              </Badge>
                                            )}
                                          </motion.div>

                                          <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{
                                              duration: 0.3,
                                              delay: 0.2,
                                            }}
                                            className="flex justify-center"
                                          >
                                            <Button
                                              size="sm"
                                              className={`bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-700 hover:via-blue-700 hover:to-cyan-700 text-white rounded-xl px-6 py-2 font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 relative overflow-hidden group ${
                                                !isJoinLinkEnabled(
                                                  call.date,
                                                  call.startTime,
                                                  call.endTime,
                                                  call.timezone || "UTC"
                                                )
                                                  ? "opacity-60 cursor-not-allowed hover:scale-100"
                                                  : ""
                                              }`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleJoinCall(
                                                  call.zoomLink,
                                                  handleUnauthorized
                                                );
                                              }}
                                              disabled={
                                                !isJoinLinkEnabled(
                                                  call.date,
                                                  call.startTime,
                                                  call.endTime,
                                                  call.timezone || "UTC"
                                                )
                                              }
                                              aria-label="Join call"
                                            >
                                              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                                              <Video className="w-4 h-4 mr-2 relative z-10" />
                                              <span className="relative z-10">
                                                Join Class
                                              </span>
                                            </Button>
                                          </motion.div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  )}
                                </div>
                              </motion.div>
                            </motion.div>
                          ))}
                        </div>
                      </AnimatePresence>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
