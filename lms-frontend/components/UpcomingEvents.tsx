"use client"
import { Calendar, Sparkles, UserIcon, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { useCallback, useEffect, useState } from 'react'
import Loader from "@/components/Loader";
import { ApiError, ScheduledCall } from '@/types'
import { useAuth } from '@/lib/auth';
import { Button } from 'react-day-picker';
import { useRouter } from 'next/navigation';
import moment from 'moment-timezone';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface UpcomingEventsProps {
  batchId?: string;
}

export default function UpcomingEvents({ batchId }: UpcomingEventsProps) {
  const { user, loading: authLoading, deviceId } = useAuth();
  const router = useRouter();
  const [upcomingEvents, setUpcomingEvents] = useState<ScheduledCall[]>([]);
  const [eventsLoading, setEventsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const formatDateTime = (date: string) => {
    const callDate = new Date(date);
    return callDate.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
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
        "YYYY-MM-DD h:mm a",
        timezone
      );
      const endMoment = moment.tz(
        `${date} ${endTime}`,
        "YYYY-MM-DD h:mm a",
        timezone
      );

      if (!startMoment?.isValid() || !endMoment?.isValid()) {
        console.debug("[UpcomingEvents] Invalid date format", { date, startTime, endTime });
        return false;
      }

      return now.isBetween(startMoment, endMoment, undefined, "[]");
    } catch (error) {
      console.error("[UpcomingEvents] Error in isOngoingClass:", error);
      return false;
    }
  };

  const handleUnauthorized = useCallback(() => {
    console.debug("[UpcomingEvents] Handling unauthorized access");
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("isLoggedIn");
    router.push("/login");
  }, [router]);

  const fetchEvents = useCallback(async () => {
    if (!user || !deviceId || !batchId) {
      console.debug("[UpcomingEvents] Missing user, deviceId, or batchId", { user, deviceId, batchId });
      return;
    }
    try {
      setEventsLoading(true);
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

      console.debug("[UpcomingEvents] Fetching events for batchId:", batchId);

      while (hasMore) {
        const callsResponse = await api.get(
          `/schedule/student/calls?page=${page}&limit=${limit}&batchId=${batchId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Device-Id": deviceId,
            },
          }
        );

        console.debug("[UpcomingEvents] API Response:", callsResponse.data);

        allCalls = [...allCalls, ...callsResponse.data.calls];
        hasMore = page < callsResponse.data.pages;
        page++;
      }

      const now = moment.tz("Asia/Kolkata");

      const allUpcomingCalls = allCalls
        .filter((call) => {
          const callDate = moment.tz(
            call.date,
            call.timezone || "Asia/Kolkata"
          );
          const isUpcomingOrOngoing =
            (call.status === "Scheduled" || call.status === "Rescheduled") &&
            callDate.isSameOrAfter(now, "day");
          console.debug("[UpcomingEvents] Filtering call:", { call, isUpcomingOrOngoing });
          return isUpcomingOrOngoing;
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

      console.debug("[UpcomingEvents] Filtered Upcoming Calls:", allUpcomingCalls);

      setUpcomingEvents(allUpcomingCalls);
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[UpcomingEvents] Failed to fetch calls:", apiError);
      const errorMessage =
        apiError.response?.data?.message || "Failed to fetch calls";
      setError(errorMessage);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setEventsLoading(false);
    }
  }, [user, deviceId, handleUnauthorized, batchId]);

  useEffect(() => {
    if (!authLoading && (!user || user?.role?.roleName !== "Student")) {
      console.debug("[UpcomingEvents] Redirecting to login", {
        user: !!user,
        role: user?.role?.roleName,
        authLoading,
      });
      handleUnauthorized();
    }
  }, [user, authLoading, router, handleUnauthorized]);

  useEffect(() => {
    if (!authLoading && user && user.role?.roleName === "Student" && batchId) {
      console.debug("[UpcomingEvents] Fetching data", { userId: user._id, batchId });
      fetchEvents();
    }
  }, [fetchEvents, authLoading, user, batchId]);

  if (authLoading || (!user && eventsLoading)) {
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
                fetchEvents();
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
    <Card className='bg-white/80 border-0 backdrop-blur-sm shadow-md hover:shadow-lg transition-all h-fit lg:h-full'>
      <CardHeader>
        <CardTitle className='flex gap-4'>
          <div className='p-3 bg-purple-700 rounded-lg flex items-center justify-center'>
            <Calendar className='h-6 w-6 text-white' />
          </div>
          <span>
            <p className='text-xl font-bold text-blue-700'>Upcoming Events</p>
            <p className='text-sm text-gray-500'>Exciting events are on the way!</p>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {upcomingEvents.length === 0 ? (
          <div className="text-center text-gray-600">
            <p>No upcoming or ongoing events found for this batch.</p>
          </div>
        ) : (
          upcomingEvents.map((event, idx) => {
            const eventDate = formatDateTime(event?.date).split(" ");
            const isOngoing = isOngoingClass(
              event.date,
              event.startTime,
              event.endTime,
              event.timezone || "Asia/Kolkata"
            );
            return (
              <Card
                key={event._id + "#" + idx}
                className={`hover:shadow-xl transition-shadow delay-100 cursor-pointer border-1 border-gray-200 shadow-md hover:bg-white/90 ${isOngoing ? 'bg-green-50' : ''}`}
              >
                <CardContent className='flex justify-between items-center'>
                  <div className='flex gap-6'>
                    <div className='flex flex-col justify-center items-center'>
                      <p className='text-2xl font-bold'>{eventDate[0] || "00"}</p>
                      <p className='font-light'>{eventDate[1] || "Month"}</p>
                    </div>
                    <div className='bg-blue-600 w-1'></div>
                    <div className='flex flex-col gap-2'>
                      <div className='flex items-center gap-2'>
                        <p className='text-xl font-bold'>{event?.classType}</p>
                        {isOngoing && (
                          <span className='text-sm text-green-600 font-semibold'>(Ongoing)</span>
                        )}
                      </div>
                      <div className='flex justify-start gap-2'>
                        <div className='p-1 rounded-full bg-blue-600'>
                          <UserIcon className='w-4 h-4 text-white' />
                        </div>
                        <p className='text-gray-500'>{event?.teacher?.name || "Teacher"}</p>
                      </div>
                    </div>
                  </div>
                  <div className='font-semibold'>
                    Timing: <span className='text-blue-600'>{event?.startTime || "12:00"} - {event?.endTime || "3:00"}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}