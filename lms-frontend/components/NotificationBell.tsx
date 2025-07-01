"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Clock, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";
import { Notification } from "@/types";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";

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

const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  const fetchAllNotifications = useCallback(async () => {
    setIsInitialLoading(true);
    try {
      let page = 1;
      let allNotifications: Notification[] = [];
      let hasMore = true;

      while (hasMore) {
        const response = await api.get(`/notifications?page=${page}&limit=10`);
        const fetchedNotifications: Notification[] =
          response.data.notifications || [];
        allNotifications = [...allNotifications, ...fetchedNotifications];
        hasMore = response.data.hasMore;
        page += 1;
      }

      setNotifications(allNotifications);
      setUnreadCount(allNotifications.filter((n) => !n.read).length);
    } catch (error) {
      console.error("Error fetching all notifications:", error);
      toast.error("Failed to fetch notifications");
    } finally {
      setIsInitialLoading(false);
    }
  }, []);

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((n) => !n.read);
      await Promise.all(
        unreadNotifications.map((notification) =>
          api.put(`/notifications/${notification._id}/read`)
        )
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast.error("Failed to mark all notifications as read");
    }
  };

  useEffect(() => {
    fetchAllNotifications();
    const interval = setInterval(fetchAllNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchAllNotifications]);

  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      setIsScrolling(true);
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
      }, 1000);
    };

    const container = document.querySelector(".notification-modal");
    if (container) {
      container.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      }
      clearTimeout(scrollTimeout);
    };
  }, []);

  const handleBellClick = async () => {
    if (!showNotifications) {
      await fetchAllNotifications();
      setShowNotifications(true);
    } else {
      await markAllAsRead();
      setShowNotifications(false);
    }
  };

  const handleCloseModal = async () => {
    await markAllAsRead();
    setShowNotifications(false);
  };

  const newerNotifications = notifications.filter((n) => !n.read);
  const olderNotifications = notifications.filter((n) => n.read);

  return (
    <>
      <div className="relative">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
          whileHover={{ scale: 1.1 }}
        >
          <Bell
            className="w-10 h-10 cursor-pointer hover:bg-gray-700 bg-opacity-60 rounded-full p-2 mb-10"
            onClick={handleBellClick}
          />
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Badge className="absolute top-1 right-1 bg-red-500 text-white rounded-full px-1.5 text-[10px] h-4 w-4 flex items-center justify-center">
                {unreadCount}
              </Badge>
            </motion.div>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: "5vh" }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl mx-4 max-h-[80vh] overflow-y-auto notification-modal"
              onClick={(e) => e.stopPropagation()}
              style={{
                scrollbarWidth: isScrolling ? "thin" : "none",
                scrollbarColor: isScrolling
                  ? "rgba(99, 102, 241, 0.5) transparent"
                  : "transparent transparent",
              }}
            >
              <style>{`
                .notification-modal::-webkit-scrollbar {
                  width: ${isScrolling ? "6px" : "0px"};
                  transition: width 0.3s ease;
                }
                .notification-modal::-webkit-scrollbar-track {
                  background: transparent;
                }
                .notification-modal::-webkit-scrollbar-thumb {
                  background: ${
                    isScrolling ? "rgba(99, 102, 241, 0.5)" : "transparent"
                  };
                  border-radius: 10px;
                  transition: background 0.3s ease;
                }
                .notification-modal::-webkit-scrollbar-thumb:hover {
                  background: rgba(99, 102, 241, 0.8);
                }
              `}</style>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  Notifications
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6 cursor-pointer" />
                </button>
              </div>
              {isInitialLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-gray-500">
                    Loading notifications...
                  </span>
                </div>
              ) : notifications.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No notifications
                </p>
              ) : (
                <>
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">
                      Newer Notifications
                    </h3>
                    {newerNotifications.length > 0 ? (
                      newerNotifications.map((notification) => (
                        <div
                          key={notification._id}
                          className="py-3 border-b border-gray-200 last:border-b-0"
                        >
                          <p className="text-gray-800 font-bold text-base">
                            {notification.message || "No message"}
                          </p>
                          <div className="flex items-center justify-end mt-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400 mr-1" />
                            <span className="text-xs text-gray-400">
                              {formatTimeAgo(notification.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">
                        No new notifications
                      </p>
                    )}
                  </div>
                  {olderNotifications.length > 0 && (
                    <>
                      <hr className="border-gray-300 mb-8" />
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
                              <Clock className="w-3.5 h-3.5 text-gray-400 mr-1" />
                              <span className="text-xs text-gray-400">
                                {formatTimeAgo(notification.createdAt)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NotificationBell;
