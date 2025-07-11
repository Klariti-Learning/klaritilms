'use client';

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  BookOpen,
  Users,
  FileText,
  Clock,
  TrendingUp,
  ArrowUpRight,
  User,
  MessageSquare,
  Settings,
  Bell,
  BarChart3,
  Sparkles,
  Star,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import toast from "react-hot-toast";
import moment from "moment-timezone";
import type { ScheduledCall, ApiError, Ticket } from "@/types";
import Loader from "@/components/Loader";
import { motion } from "framer-motion";
import ClassTeachers from "@/components/ClassTeachers";

interface DashboardStats {
  totalScheduledCalls: number;
  upcomingCalls: number;
  completedCalls: number;
  openTickets: number;
  resolvedTickets: number;
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
        return "Invalid Date";
      }
      parsedDate = dateMoment.format("YYYY-MM-DD");
    }

    const timeFormats = [
      "h:mm a",
      "H:mm",
      "HH:mm",
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

    if (!startMoment?.isValid() || !endMoment?.isValid()) {
      return "Invalid Time";
    }

    const startFormatted = startMoment.format("h:mm A");
    const endFormatted = endMoment.format("h:mm A");
    return `${startFormatted} - ${endFormatted}`;
  } catch {
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
  } catch {
    return false;
  }
};

const isOngoingClass = (
  date: string,
  startTime: string,
  endTime: string,
  timezone: string
) => {
  const now = moment.tz(timezone);
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

    if (!startMoment?.isValid() || !endMoment?.isValid()) {
      return false;
    }

    return now.isBetween(startMoment, endMoment, undefined, "[]");
  } catch {
    return false;
  }
};

export default function StudentDashboard() {
  const { user, loading: authLoading, deviceId } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Overview");
  const [upcomingCalls, setUpcomingCalls] = useState<ScheduledCall[]>([]);
  const [ongoingCall, setOngoingCall] = useState<ScheduledCall | null>(null);
  const [, setTickets] = useState<Ticket[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalScheduledCalls: 0,
    upcomingCalls: 0,
    completedCalls: 0,
    openTickets: 0,
    resolvedTickets: 0,
  });
  const [callsLoading, setCallsLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleUnauthorized = useCallback(() => {
    console.debug("[StudentDashboard] Handling unauthorized access");
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("isLoggedIn");
    router.push("/login");
  }, [router]);

  useEffect(() => {
    if (!authLoading && (!user || user?.role?.roleName !== "Student")) {
      console.debug("[StudentDashboard] Redirecting to login", {
        user: !!user,
        role: user?.role?.roleName,
        authLoading,
      });
      handleUnauthorized();
    }
  }, [user, authLoading, router, handleUnauthorized]);

  const fetchCalls = useCallback(async () => {
    if (!user || !deviceId) return;
    try {
      setCallsLoading(true);
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

      const now = moment.tz("Asia/Kolkata");

      const ongoingCalls = allCalls.filter((call) => {
        return (
          (call.status === "Scheduled" || call.status === "Rescheduled") &&
          isOngoingClass(
            call.date,
            call.startTime,
            call.endTime,
            call.timezone || "Asia/Kolkata"
          )
        );
      });

      const allUpcomingCalls = allCalls
        .filter((call) => {
          const callDate = moment.tz(
            call.date,
            call.timezone || "Asia/Kolkata"
          );
          return (
            (call.status === "Scheduled" || call.status === "Rescheduled") &&
            callDate.isSameOrAfter(now, "day") &&
            !isOngoingClass(
              call.date,
              call.startTime,
              call.endTime,
              call.timezone || "Asia/Kolkata"
            )
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
              a.timezone || "Asia/Kolkata"
            )
            .valueOf();
          return dateA - dateB;
        });

      const completedCalls = allCalls.filter(
        (call) => call.status === "Completed"
      ).length;
      const totalScheduledCalls = allCalls.length;

      setOngoingCall(ongoingCalls[0] || null);
      setUpcomingCalls(allUpcomingCalls);
      setDashboardStats((prev) => ({
        ...prev,
        totalScheduledCalls,
        upcomingCalls: allUpcomingCalls.length,
        completedCalls,
      }));
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[StudentDashboard] Failed to fetch calls:", apiError);
      const errorMessage =
        apiError.response?.data?.message || "Failed to fetch calls";
      setError(errorMessage);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setCallsLoading(false);
    }
  }, [user, deviceId, handleUnauthorized]);

  const fetchTickets = useCallback(async () => {
    if (!user || !deviceId) return;
    try {
      setTicketsLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      if (!token) {
        handleUnauthorized();
        return;
      }

      const response = await api.get("/tickets", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Device-Id": deviceId,
        },
      });

      const ticketsData = response.data.tickets || [];
      setTickets(ticketsData);

      const openTickets = ticketsData.filter(
        (ticket: Ticket) =>
          ticket.status === "Open" || ticket.status === "In-progress"
      ).length;
      const resolvedTickets = ticketsData.filter(
        (ticket: Ticket) => ticket.status === "Resolved"
      ).length;

      setDashboardStats((prev) => ({
        ...prev,
        openTickets,
        resolvedTickets,
      }));
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[StudentDashboard] Failed to fetch tickets:", apiError);
      const errorMessage =
        apiError.response?.data?.message || "Failed to fetch tickets";
      setError(errorMessage);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setTicketsLoading(false);
    }
  }, [user, deviceId, handleUnauthorized]);

  useEffect(() => {
    if (!authLoading && user && user.role?.roleName === "Student") {
      console.debug("[StudentDashboard] Fetching data", { userId: user._id });
      fetchCalls();
      fetchTickets();
    }
  }, [fetchCalls, fetchTickets, authLoading, user]);

  const handleJoinCall = async (zoomLink: string) => {
    try {
      if (zoomLink) {
        window.open(zoomLink, "_blank", "noopener,noreferrer");
      } else {
        toast.error("No Zoom link available");
      }
    } catch {
      toast.error("Failed to join call");
    }
  };

  const getCurrentDate = () => {
    return moment().tz("Asia/Kolkata").format("MMM DD, YYYY");
  };

  if (authLoading || (!user && callsLoading)) {
    return (
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
            Loading your dashboard...
          </p>
          <div className="flex items-center justify-center gap-1 mt-2">
            <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
            <span className="text-blue-600 text-sm">
              Preparing your learning space
            </span>
            <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!user || user.role?.roleName !== "Student") {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="p-4 bg-red-50 rounded-xl shadow-lg">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Error Loading Dashboard
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button
              onClick={() => {
                setError(null);
                fetchCalls();
                fetchTickets();
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
    <div className="min-h-screen bg-blue-50 pt-20 pb-12">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-8 overflow-hidden rounded-2xl bg-blue-600 p-8 text-white shadow-xl"
        >
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-4 right-4 opacity-30">
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-blue-300 rounded-full animate-pulse"></div>
              <div className="w-3 h-3 bg-blue-300 rounded-full animate-pulse delay-75"></div>
              <div className="w-3 h-3 bg-blue-300 rounded-full animate-pulse delay-150"></div>
            </div>
          </div>
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                  <Star className="w-6 h-6 text-yellow-300" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold">
                  Welcome back, {user?.name}!
                </h1>
              </div>
              <p className="text-blue-100 text-lg">
                Ready to continue your learning journey? Track your progress and
                join your classes seamlessly.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2 text-blue-100 bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm">
                <Calendar className="w-4 h-4 text-blue-100" />
                <span className="text-sm font-medium">{getCurrentDate()}</span>
              </div>
            </div>
          </div>
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
        </motion.div>

        <div className="flex align-center justify-center flex-wrap gap-3 mb-8">
          {["Overview", "Schedule"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center px-6 py-3 cursor-pointer rounded-2xl font-medium transition-all transform hover:scale-105 ${
                activeTab === tab
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                  : "bg-white text-gray-800 hover:bg-gray-100 shadow-md hover:shadow-lg shadow-gray-200"
              }`}
            >
              {tab === "Overview" && (
                <BarChart3 className="w-4 h-4 inline-block mr-2 text-amber-400" />
              )}
              {tab === "Schedule" && (
                <Calendar className="w-4 h-4 inline-block mr-2 text-cyan-500" />
              )}
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Overview" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card
                className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 overflow-hidden cursor-pointer w-full h-48 flex flex-col justify-between relative px-2"
                onClick={() => router.push("/student/schedule")}
              >
                <div className="absolute inset-0 bg-blue-50 rounded-2xl"></div>
                <CardContent className="relative p-2 flex flex-col justify-between h-full z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-gray-600 font-semibold">
                        Total Classes
                      </h3>
                      <p className="text-2xl font-bold text-gray-900 mb-0">
                        {callsLoading ? (
                          <span className="inline-block w-10 h-6 bg-blue-200 animate-pulse rounded"></span>
                        ) : (
                          dashboardStats.totalScheduledCalls
                        )}
                      </p>
                    </div>
                    <div className="p-1 bg-blue-500 rounded-lg">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-0">
                    <div className="flex items-center text-gray-600 text-sm font-medium">
                      <TrendingUp className="w-4 h-4 mr-1 text-blue-500" />
                      <span>Scheduled</span>
                    </div>
                    <div className="text-blue-700 text-xs font-bold bg-blue-100 p-1 px-2 rounded">
                      All Time
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 overflow-hidden cursor-pointer w-full h-48 flex flex-col justify-between relative px-2"
                onClick={() => router.push("/student/schedule")}
              >
                <div className="absolute inset-0 bg-teal-50 rounded-2xl"></div>
                <CardContent className="relative p-2 flex flex-col justify-between h-full z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-gray-600 font-semibold">
                        Upcoming Classes
                      </h3>
                      <p className="text-2xl font-bold text-gray-900 mb-0">
                        {callsLoading ? (
                          <span className="inline-block w-10 h-6 bg-teal-200 animate-pulse rounded"></span>
                        ) : (
                          dashboardStats.upcomingCalls
                        )}
                      </p>
                    </div>
                    <div className="p-1 bg-teal-500 rounded-lg">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-0">
                    <div className="flex items-center text-gray-600 text-sm font-medium">
                      <Clock className="w-4 h-4 mr-1 text-teal-500" />
                      <span>Scheduled Soon</span>
                    </div>
                    <div className="text-teal-700 text-xs font-bold bg-teal-100 p-1 px-2 rounded">
                      This Week
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 overflow-hidden cursor-pointer w-full h-48 flex flex-col justify-between relative px-2"
                onClick={() => router.push("/student/schedule")}
              >
                <div className="absolute inset-0 bg-indigo-50 rounded-2xl"></div>
                <CardContent className="relative p-2 flex flex-col justify-between h-full z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-gray-600 font-semibold">
                        Completed Classes
                      </h3>
                      <p className="text-2xl font-bold text-gray-900 mb-0">
                        {callsLoading ? (
                          <span className="inline-block w-10 h-6 bg-indigo-200 animate-pulse rounded"></span>
                        ) : (
                          dashboardStats.completedCalls
                        )}
                      </p>
                    </div>
                    <div className="p-1 bg-indigo-500 rounded-lg">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-0">
                    <div className="flex items-center text-gray-600 text-sm font-medium">
                      <TrendingUp className="w-4 h-4 mr-1 text-indigo-500" />
                      <span>Total Completed</span>
                    </div>
                    <div className="text-indigo-700 text-xs font-bold bg-indigo-100 p-1 px-2 rounded">
                      Completed
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 overflow-hidden cursor-pointer w-full h-48 flex flex-col justify-between relative px-2"
                onClick={() => router.push("/student/raise-query")}
              >
                <div className="absolute inset-0 bg-yellow-50 rounded-2xl"></div>
                <CardContent className="relative p-2 flex flex-col justify-between h-full z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-gray-600 font-semibold">
                        Support Tickets
                      </h3>
                      <p className="text-2xl font-bold text-gray-900 mb-0">
                        {ticketsLoading ? (
                          <span className="inline-block w-10 h-6 bg-yellow-200 animate-pulse rounded"></span>
                        ) : (
                          `${dashboardStats.resolvedTickets}/${dashboardStats.openTickets}`
                        )}
                      </p>
                    </div>
                    <div className="p-1 bg-yellow-500 rounded-lg">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-0">
                    <div className="flex items-center text-gray-600 text-sm font-medium">
                      <MessageSquare className="w-4 h-4 mr-1 text-yellow-500" />
                      <span>Resolved / Open</span>
                    </div>
                    <div className="text-yellow-700 text-xs font-bold bg-yellow-100 p-1 px-2 rounded">
                      Support
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-2">
                <ClassTeachers />
              </div>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all overflow-hidden lg:col-span-3 h-fit">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
                      {ongoingCall ? (
                        <>
                          <div className="relative">
                            <div className="p-2 bg-red-500 rounded-xl">
                              <Clock className="w-5 h-5 text-white" />
                            </div>
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>
                          </div>
                          <span className="text-red-500 font-semibold drop-shadow-sm">
                            Ongoing Class
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="p-2 bg-teal-500 rounded-xl">
                            <Calendar className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-blue-600">
                            Upcoming Classes
                          </span>
                        </>
                      )}
                    </CardTitle>
                    <Link href="/student/schedule">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 gap-1 rounded-xl cursor-pointer border border-gray-200"
                      >
                        View All
                        <ArrowUpRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {callsLoading ? (
                    <div className="relative">
                      <div className="absolute inset-0 bg-blue-400 rounded-full blur-xl opacity-20 animate-pulse"></div>
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
                  ) : ongoingCall ? (
                    <div className="p-6 bg-red-400 border-t border-b border-gray-200">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <Badge className="bg-red-500 text-white px-3 py-1 text-xs font-bold animate-pulse">
                              🔴 LIVE NOW
                            </Badge>
                            <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                          </div>
                          <h3 className="font-bold text-gray-900 text-lg mt-3">
                            {ongoingCall.classType} - {ongoingCall.type}
                          </h3>
                          <p className="text-sm text-gray-700 mt-1 font-medium">
                            {formatDateTime(ongoingCall.date)},{" "}
                            {formatTimeRange(
                              ongoingCall.date,
                              ongoingCall.startTime,
                              ongoingCall.endTime,
                              ongoingCall.timezone || "Asia/Kolkata"
                            )}
                          </p>
                        </div>
                        <Button
                          className="bg-red-600 hover:bg-red-700 text-white rounded-2xl px-8 py-3 shadow-lg shadow-red-200 transition-all hover:shadow-red-300 transform hover:scale-105 font-bold"
                          onClick={() => handleJoinCall(ongoingCall.zoomLink)}
                        >
                          🚀 Join Now
                        </Button>
                      </div>
                    </div>
                  ) : upcomingCalls.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                      <div className="p-4 bg-blue-100 rounded-3xl mb-4">
                        <Calendar className="w-12 h-12 text-teal-500" />
                      </div>
                      <p className="text-gray-700 font-semibold text-lg">
                        No upcoming classes scheduled
                      </p>
                      <p className="text-gray-500 text-sm mt-1">
                        Check back later for updates
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {upcomingCalls.slice(0, 3).map((call, index) => (
                        <div
                          key={call._id}
                          className="p-6 hover:bg-blue-50 transition-all"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div
                                className={`p-3 bg-${
                                  index % 3 === 0
                                    ? "blue-500"
                                    : index % 3 === 1
                                    ? "teal-500"
                                    : "indigo-500"
                                } rounded-2xl shrink-0 mt-1 shadow-lg`}
                              >
                                <Clock className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h3 className="font-bold text-gray-900">
                                  {call.classType} - {call.type}
                                </h3>
                                <p className="text-sm text-gray-600 mt-1 font-medium">
                                  {formatDateTime(call.date)},{" "}
                                  {formatTimeRange(
                                    call.date,
                                    call.startTime,
                                    call.endTime,
                                    call.timezone || "Asia/Kolkata"
                                  )}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge className="bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200">
                                    ✅ Scheduled
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <Button
                              className={`rounded-2xl px-6 py-2 shadow-md transition-all transform hover:scale-105 font-semibold ${
                                isJoinLinkEnabled(
                                  call.date,
                                  call.startTime,
                                  call.endTime,
                                  call.timezone || "Asia/Kolkata"
                                )
                                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200"
                                  : "bg-blue-100 text-blue-500"
                              }`}
                              onClick={() => handleJoinCall(call.zoomLink)}
                              disabled={
                                !isJoinLinkEnabled(
                                  call.date,
                                  call.startTime,
                                  call.endTime,
                                  call.timezone || "Asia/Kolkata"
                                )
                              }
                            >
                              {isJoinLinkEnabled(
                                call.date,
                                call.startTime,
                                call.endTime,
                                call.timezone || "Asia/Kolkata"
                              )
                                ? "🚀 Join"
                                : "⏰ Join (10 min before)"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all overflow-hidden lg:col-span-5 h-fit">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
                      <div className="p-2 bg-purple-500 rounded-xl">
                        <Settings className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-blue-600">Quick Actions</span>
                    </CardTitle>
                    <Badge className="bg-blue-100 text-blue-700 border border-blue-200 font-bold">
                      🎯 Student Tools
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link href="/student/schedule">
                      <div className="group flex items-center justify-between p-5 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-all cursor-pointer border border-gray-200 transform hover:scale-105 shadow-md hover:shadow-lg">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-teal-500 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow">
                            <Calendar className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">
                              📅 View Schedule
                            </h3>
                            <p className="text-sm text-gray-600 font-medium">
                              See all your upcoming classes
                            </p>
                          </div>
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-gray-600 opacity-70 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                    <Link href="/student/profile">
                      <div className="group flex items-center justify-between p-5 bg-indigo-50 rounded-2xl hover:bg-indigo-100 transition-all cursor-pointer border border-gray-200 transform hover:scale-105 shadow-md hover:shadow-lg">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-500 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow">
                            <User className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">
                              👤 My Profile
                            </h3>
                            <p className="text-sm text-gray-600 font-medium">
                              Update your information
                            </p>
                          </div>
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-gray-600 opacity-70 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link href="/student/raise-query">
                      <div className="group flex items-center justify-between p-5 bg-purple-50 rounded-2xl hover:bg-purple-100 transition-all cursor-pointer border border-gray-200 transform hover:scale-105 shadow-md hover:shadow-lg">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-indigo-500 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow">
                            <MessageSquare className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">
                              💬 Support Tickets
                            </h3>
                            <p className="text-sm text-gray-600 font-medium">
                              View your support requests
                            </p>
                          </div>
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-gray-600 opacity-70 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                    <Link href="/student/raise-query/new">
                      <div className="group flex items-center justify-between p-5 bg-yellow-50 rounded-2xl hover:bg-yellow-100 transition-all cursor-pointer border border-gray-200 transform hover:scale-105 shadow-md hover:shadow-lg">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-amber-500 rounded-2xl shadow-lg group-hover:shadow-xl transition-shadow">
                            <Bell className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">
                              🎫 Raise Query
                            </h3>
                            <p className="text-sm text-gray-600 font-medium">
                              Create new support ticket
                            </p>
                          </div>
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-gray-600 opacity-70 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {activeTab === "Schedule" && (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 text-center border border-gray-200">
            <div className="bg-blue-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Calendar className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-3xl font-bold text-blue-600 mb-4">
              📅 Class Schedule
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto font-medium">
              View your complete class schedule and manage your upcoming
              learning sessions
            </p>
            <Link href="/student/schedule">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 font-bold cursor-pointer">
                📋 View Full Schedule
                <ArrowUpRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}