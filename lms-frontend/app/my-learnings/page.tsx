"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Bell, LogOut, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Notification } from "@/types";
import toast from "react-hot-toast";
import Loader from "@/components/Loader";

const formatTimeAgo = (timestamp: string | Date): string => {
  if (!timestamp) return "Just now";
  const now = new Date();
  const createdAt = new Date(timestamp);
  const diffInSeconds = Math.floor(
    (now.getTime() - createdAt.getTime()) / 1000
  );

  if (diffInSeconds < 60) return `${diffInSeconds} sec ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60)
    return `${diffInMinutes} ${diffInMinutes === 1 ? "min" : "mins"} ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24)
    return `${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30)
    return `${diffInDays} ${diffInDays === 1 ? "day" : "days"} ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12)
    return `${diffInMonths} ${diffInMonths === 1 ? "month" : "months"} ago`;
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} ${diffInYears === 1 ? "year" : "years"} ago`;
};

export default function MyLearnings() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const fetchNotifications = useCallback(
    async (pageNum: number, reset = false) => {
      setIsLoading(true);
      try {
        const response = await api.get(
          `/notifications?page=${pageNum}&limit=10`,
          {
            headers: { "Device-Id": localStorage.getItem("deviceId") },
          }
        );
        const fetchedNotifications = response.data.notifications || [];
        setNotifications((prev) =>
          reset ? fetchedNotifications : [...prev, ...fetchedNotifications]
        );
        setUnreadCount(
          (reset
            ? fetchedNotifications
            : [...notifications, ...fetchedNotifications]
          ).filter((n: Notification) => !n.read).length
        );
        setHasMore(response.data.hasMore);
        setTotalPages(response.data.pages || 1);
      } catch (error) {
        console.error("Error fetching notifications:", error);
        toast.error("Failed to fetch notifications");
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    },
    [notifications]
  );

  const markNotificationsAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((n) => !n.read);
      await Promise.all(
        unreadNotifications.map((notification) =>
          api.put(
            `/notifications/${notification._id}/read`,
            {},
            {
              headers: { "Device-Id": localStorage.getItem("deviceId") },
            }
          )
        )
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      toast.error("Failed to mark notifications as read");
    }
  };

  const handleBellClick = async () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      setPage(1);
      await fetchNotifications(1, true);
      await markNotificationsAsRead();
    }
  };

  const handleLogout = useCallback(async () => {
    if (!user) return;
    try {
      await logout();
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to logout");
    }
  }, [logout, user]);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !isLoading) {
        setPage((prev) => {
          const nextPage = prev + 1;
          fetchNotifications(nextPage);
          return nextPage;
        });
      }
    },
    [fetchNotifications, hasMore, isLoading]
  );

  useEffect(() => {
    const currentLoadMoreRef = loadMoreRef.current;
    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "20px",
      threshold: 1.0,
    });

    if (currentLoadMoreRef) {
      observerRef.current.observe(currentLoadMoreRef);
    }

    return () => {
      if (currentLoadMoreRef && observerRef.current) {
        observerRef.current.unobserve(currentLoadMoreRef);
      }
    };
  }, [handleObserver]);

  useEffect(() => {
    if (loading) return;

    const isLoggedIn = localStorage.getItem("isLoggedIn");
    const token = localStorage.getItem("token");

    if (!user || isLoggedIn !== "true" || !token) {
      localStorage.removeItem("token");
      localStorage.removeItem("isVerified");
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("deviceId");
      router.push("/login");
      return;
    }

    api
      .get("/notifications", {
        headers: { "Device-Id": localStorage.getItem("deviceId") },
      })
      .catch((error) => {
        console.error("Failed to fetch notifications:", error);
      });

    api
      .get("/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Device-Id": localStorage.getItem("deviceId") || "",
        },
      })
      .then((response) => {
        const fetchedUser = response.data.user;
        if (fetchedUser.role) {
          handleLogout();
        }
      })
      .catch((error) => {
        console.error("Error checking user role:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("isVerified");
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("deviceId");
        router.push("/login");
      });
  }, [user, loading, router, handleLogout]);

  if (loading) {
    return (
      <Loader
        height="80"
        width="80"
        color="#ff0000"
        ariaLabel="triangle-loading"
        wrapperStyle={{}}
        wrapperClass=""
        visible={true}
        fullScreen={true}
      />
    );
  }

  if (!user || localStorage.getItem("isLoggedIn") !== "true") {
    return null;
  }

  const newerNotifications = notifications.filter((n) => !n.read);
  const olderNotifications = notifications.filter((n) => n.read);
  const userInitial = user.name.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-6 mt-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden"
      >
        <div className="flex flex-col md:flex-row">
          <div className="md:w-1/3 bg-blue-900 text-white p-8 flex flex-col items-center justify-between">
            <div className="text-center">
              <motion.div
                className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center text-3xl font-semibold mb-4 mx-auto ring-4 ring-blue-300"
                whileHover={{ scale: 1.1 }}
              >
                {userInitial}
              </motion.div>
              <h2 className="text-2xl font-bold">{user.name}</h2>
              <p className="text-sm text-blue-200">{user.email}</p>
              <p className="text-sm text-blue-200">{user.phone}</p>
              <p className="mt-4 text-sm bg-blue-800 px-4 py-2 rounded-full">
                Role: Not Assigned
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-4 w-full">
              <motion.button
                onClick={handleBellClick}
                className="flex items-center justify-center gap-2 bg-blue-600 py-3 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                whileHover={{ scale: 1.05 }}
              >
                <Bell className="w-5 h-5" />
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <Badge className="bg-red-500 text-white rounded-full px-2">
                    {unreadCount}
                  </Badge>
                )}
              </motion.button>
              <motion.button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 bg-red-600 py-3 rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
                whileHover={{ scale: 1.05 }}
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </motion.button>
            </div>
          </div>
          <div className="md:w-2/3 p-8 flex flex-col justify-center">
            <motion.h1
              className="text-4xl font-extrabold text-gray-800 mb-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              Welcome, {user.name}!
            </motion.h1>
            <motion.p
              className="text-lg text-gray-600 mb-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              Your role has not been assigned yet. An administrator will assign
              your role soon. Once assigned, you will be logged out and can log
              in again to access your personalized portal.
            </motion.p>
            <motion.div
              className="bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <p className="text-yellow-700">
                <span className="font-semibold">Note:</span> Please check back
                later or contact support if you have any questions.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  Notifications
                </h2>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6 cursor-pointer" />
                </button>
              </div>
              <div className="text-sm text-gray-500 mb-4">
                Page {page} of {totalPages}
              </div>

              {notifications.length === 0 && !isLoading ? (
                <p className="text-gray-500 text-center py-4">
                  No notifications
                </p>
              ) : (
                <>
                  {newerNotifications.length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">
                        Newer Notifications
                      </h3>
                      {newerNotifications.map((notification) => (
                        <div
                          key={notification._id}
                          className="py-3 border-b border-gray-200 last:border-b-0"
                        >
                          <p className="text-gray-800 font-bold text-base">
                            {notification.message || "No message"}
                          </p>
                          <div className="flex items-center justify-end mt-1">
                            <span className="text-xs text-gray-400">
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {olderNotifications.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">
                        Older Notifications
                      </h3>
                      {olderNotifications.map((notification) => (
                        <div
                          key={notification._id}
                          className="py-3 border-b border-gray-200 last:border-b-0"
                        >
                          <p className="text-gray-600 text-base">
                            {notification.message || "No message"}
                          </p>
                          <div className="flex items-center justify-end mt-1">
                            <span className="text-xs text-gray-400">
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {hasMore && (
                    <div ref={loadMoreRef} className="py-4 flex justify-center">
                      {isLoading && (
                        <Loader
                          height="80"
                          width="80"
                          color="#ff0000"
                          ariaLabel="triangle-loading"
                          wrapperStyle={{}}
                          wrapperClass=""
                          visible={true}
                          fullScreen={true}
                        />
                      )}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .invisible-scrollbar {
          overflow-y: auto;
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
        }
        .invisible-scrollbar::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Edge */
        }
      `}</style>
    </div>
  );
}
