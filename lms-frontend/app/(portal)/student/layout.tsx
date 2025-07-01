"use client";

import type React from "react";
import { Notification } from "@/types";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  Home,
  Video,
  BarChart2,
  Tent,
  Award,
  HelpCircle,
  ShoppingBag,
  FileText,
  Users2,
  School,
  BookUser,
  Users,
  Pin,
  BookOpen,
  Bell,
  Settings,
  LogOut,
  ChevronRight,
  X,
  Clock,
  AlertCircle,
  CheckCircle,
  Info,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import profile from "../../../public/Assests/small.png";
import type { ApiError, StudentLayoutProps } from "@/types";
import toast from "react-hot-toast";
import { FaAngleDown, FaAngleRight } from "react-icons/fa";
import { useUser } from "../../../lib/UserContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Course {
  courseId: string;
  title: string;
}

const StudentLayout = ({ children }: StudentLayoutProps) => {
  const { user, logout } = useAuth();
  const { userDetails } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false);
  const [isCoursesMenuOpen, setIsCoursesMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);
  const [showNotificationOptions, setShowNotificationOptions] = useState(false);
  const [notificationMethod, setNotificationMethod] = useState<string | null>(
    null
  );
  const [notificationTiming, setNotificationTiming] =
    useState<string>("1 hour");
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(
    null
  );

  const [showComingSoon, setShowComingSoon] = useState<string | null>(null);

  const disabledMenuItems = [
    "My Recordings",
    "My Progress",
    "Klariti Community",
    "Summer Camp",
    "Rewards and Coins",
    "Payments",
    "KlarityShop",
    "Frequently Asked Questions",
    "Refer a Friend",
    "Parents Corner",
  ];

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchNotificationPreferences = async () => {
      try {
        setIsLoading(true);
        const response = await api.get("/users/notification-preferences");
        const { enabled, methods, timings } =
          response.data.notificationPreferences;
        setIsNotificationsEnabled(enabled);
        setShowNotificationOptions(false);
        setNotificationMethod(
          methods.includes("email") && methods.includes("whatsapp")
            ? "Both"
            : methods.includes("email")
            ? "Email"
            : methods.includes("whatsapp")
            ? "WhatsApp"
            : null
        );
        setNotificationTiming(
          timings.includes("1day")
            ? "1 day"
            : timings.includes("1hour")
            ? "1 hour"
            : timings.includes("30min")
            ? "30 min"
            : timings.includes("10min")
            ? "10 min"
            : "1 hour"
        );
      } catch (error) {
        const errorMsg =  error as ApiError;
        console.error("Failed to fetch notification preferences:", errorMsg.response?.data?.message);
        toast.error("Failed to load notification preferences");
      } finally {
        setIsLoading(false);
      }
    };

    const fetchCourses = async () => {
      try {
        const response = await api.get("/courses/all");
        const fetchedCourses = response.data.courses || [];
        setCourses(fetchedCourses);
        console.log("fetchedCourses",fetchedCourses);
      } catch (error) {
        const errorMsg =  error as ApiError;
        console.error("Failed to fetch courses:", errorMsg.response?.data?.message);
        toast.error("Failed to fetch courses");
      }
    };

    fetchNotificationPreferences();
    fetchCourses();
  }, [user]);

  useEffect(() => {
    if (!user || !user?.role || user?.role?.roleName !== "Student") {
      router.push("/my-learnings");
    }
  }, [user, router]);

  const handleToggleNotifications = async (newState: boolean) => {
    if (newState) {
      setShowNotificationOptions(true);
    } else {
      setShowDisableConfirm(true);
    }
  };

  const handleDisableNotifications = async () => {
    try {
      await api.put("/users/notification-preferences", {
        enabled: false,
        methods:
          notificationMethod === "Both"
            ? ["email", "whatsapp"]
            : [notificationMethod?.toLowerCase() || "email"],
        timings: [
          notificationTiming === "1 day"
            ? "1day"
            : notificationTiming === "1 hour"
            ? "1hour"
            : notificationTiming === "30min"
            ? "30min"
            : "10min",
        ],
      });
      setIsNotificationsEnabled(false);
      setShowNotificationOptions(false);
      setShowDisableConfirm(false);
      toast.success("Notifications disabled");
    } catch (error) {
      const errorMsg =  error as ApiError;

      console.error("Failed to disable notifications:", errorMsg.response?.data?.message);
      toast.error("Failed to disable notifications");
    }
  };

  const handleSaveNotificationPreferences = async () => {
    if (!notificationMethod || !notificationTiming) {
      toast.error("Please select a notification method and timing");
      return;
    }

    const methods =
      notificationMethod === "Both"
        ? ["email", "whatsapp"]
        : [notificationMethod.toLowerCase()];
    const timings = [
      notificationTiming === "1 day"
        ? "1day"
        : notificationTiming === "1 hour"
        ? "1hour"
        : notificationTiming === "30min"
        ? "30min"
        : "10min",
    ];

    try {
      await api.put("/users/notification-preferences", {
        enabled: true,
        methods,
        timings,
      });
      setIsNotificationsEnabled(true);
      setShowNotificationOptions(false);
      toast.success(
        `Notifications set to ${notificationMethod} at ${notificationTiming}`
      );
    } catch (error) {
      const errorMsg =  error as ApiError;
      console.error("Failed to save notification preferences:", errorMsg.response?.data?.message);
      toast.error("Failed to save notification preferences");
    }
  };

  const handleLogout = async () => {
    if (!user) return;
    try {
      await logout();
    } catch (error) {
      const errorMessage =
        error as  ApiError; 
        const errors =  errorMessage.response?.data?.message || "Failed to logout";
      toast.error(errors);
    }
  };

  const handleRaiseQueryClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setIsModalOpen(true);
  };

  const handleCheckFAQs = () => {
    setIsModalOpen(false);
    router.push("/student/faq");
  };

  const handleRaiseTicket = () => {
    setIsModalOpen(false);
    router.push("/student/raise-query");
  };

  const selectNotificationMethod = (method: string) => {
    setNotificationMethod(method);
  };

  const toggleSidebarPin = () => {
    setIsSidebarPinned(!isSidebarPinned);
  };

  const styles = `
  .custom-sidebar::-webkit-scrollbar {
    display: none;
  }
  .custom-sidebar {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .custom-notifications::-webkit-scrollbar {
    display: none;
  }
  .custom-notifications {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
`;

  const sidebarItems = [
    {
      name: "Home",
      icon: <Home className="w-5 h-5" />,
      href: "/student",
      color: "text-blue-500",
    },
    {
      name: "My Batch",
      icon: <Users className="w-5 h-5" />,
      href: "/student/peers",
      color: "text-green-500",
    },
    {
      name: "My Courses",
      icon: <BookOpen className="w-5 h-5" />,
      href: "#",
      color: "text-purple-500",
    },
    {
      name: "My Classes",
      icon: <School className="w-5 h-5" />,
      href: "/student/schedule",
      color: "text-orange-500",
    },
    {
      name: "My Recordings",
      icon: <Video className="w-5 h-5" />,
      href: "/student/my-recordings",
      color: "text-red-500",
    },
    {
      name: "My Progress",
      icon: <BarChart2 className="w-5 h-5" />,
      href: "/student/progress",
      color: "text-indigo-500",
    },
    {
      name: "Klariti Community",
      icon: <Users2 className="w-5 h-5" />,
      href: "/student/community",
      color: "text-yellow-500",
    },
    {
      name: "Summer Camp",
      icon: <Tent className="w-5 h-5" />,
      href: "/student/summer-camp",
      color: "text-amber-500",
    },
    {
      name: "Rewards and Coins",
      icon: <Award className="w-5 h-5" />,
      href: "/student/rewards",
      color: "text-pink-500",
    },
    {
      name: "Payments",
      icon: <ShoppingBag className="w-5 h-5" />,
      href: "/student/payments",
      color: "text-emerald-500",
    },
    {
      name: "KlarityShop",
      icon: <ShoppingBag className="w-5 h-5" />,
      href: "/student/sparkshop",
      color: "text-slate-500",
    },
    {
      name: "Frequently Asked Questions",
      icon: <FileText className="w-5 h-5" />,
      href: "/student/faq",
      color: "text-teal-500",
    },
    {
      name: "Refer a Friend",
      icon: <Users2 className="w-5 h-5" />,
      href: "https://www.klariti.in/students/klariti",
      color: "text-violet-500",
    },
    {
      name: "Parents Corner",
      icon: <BookUser className="w-5 h-5" />,
      href: "/student/parents",
      color: "text-rose-500",
    },
  ];

  const fetchNotifications = async (): Promise<void> => {
    try {
      setNotificationsLoading(true);
      setNotificationsError(null);
      const token = localStorage.getItem("token");
      const deviceId = localStorage.getItem("deviceId");

      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await api.get("/notifications", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Device-Id": deviceId,
        },
        params: {
          page: 1,
          limit: 10,
        },
      });

      const { notifications: notificationsData } = response.data;
      setNotifications(notificationsData || []);

    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage =
        apiError.response?.data?.message ||
        apiError.message ||
        "Failed to load notifications";
      setNotificationsError(errorMessage);

      if (apiError.response?.status !== 404) {
        toast.error(errorMessage);
      }
    } finally {
      setNotificationsLoading(false);
    }
  };
  const EmailIcon = (
    <svg
      width="20"
      height="20"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 11.9556C2 8.47078 2 6.7284 2.67818 5.39739C3.27473 4.22661 4.22661 3.27473 5.39739 2.67818C6.7284 2 8.47078 2 11.9556 2H20.0444C23.5292 2 25.2716 2 26.6026 2.67818C27.7734 3.27473 28.7253 4.22661 29.3218 5.39739C30 6.7284 30 8.47078 30 11.9556V20.0444C30 23.5292 30 25.2716 29.3218 26.6026C28.7253 27.7734 27.7734 28.7253 26.6026 29.3218C25.2716 30 23.5292 30 20.0444 30H11.9556C8.47078 30 6.7284 30 5.39739 29.3218C4.22661 28.7253 3.27473 27.7734 2.67818 26.6026C2 25.2716 2 23.5292 2 20.0444V11.9556Z"
        fill="white"
      />
      <path
        d="M22.0515 8.52295L16.0644 13.1954L9.94043 8.52295V8.52421L9.94783 8.53053V15.0732L15.9954 19.8466L22.0515 15.2575V8.52295Z"
        fill="#EA4335"
      />
      <path
        d="M23.6231 7.38639L22.0508 8.52292V15.2575L26.9983 11.459V9.17074C26.9983 9.17074 26.3978 5.90258 23.6231 7.38639Z"
        fill="#FBBC05"
      />
      <path
        d="M22.0508 15.2575V23.9924H25.8428C25.8428 23.9924 26.9219 23.8813 26.9995 22.6513V11.459L22.0508 15.2575Z"
        fill="#34A853"
      />
      <path
        d="M9.94811 24.0001V15.0732L9.94043 15.0669L9.94811 24.0001Z"
        fill="#C5221F"
      />
      <path
        d="M9.94014 8.52404L8.37646 7.39382C5.60179 5.91001 5 9.17692 5 9.17692V11.4651L9.94014 15.0667V8.52404Z"
        fill="#C5221F"
      />
      <path
        d="M9.94043 8.52441V15.0671L9.94811 15.0734V8.53073L9.94043 8.52441Z"
        fill="#C5221F"
      />
      <path
        d="M5 11.4668V22.6591C5.07646 23.8904 6.15673 24.0003 6.15673 24.0003H9.94877L9.94014 15.0671L5 11.4668Z"
        fill="#4285F4"
      />
    </svg>
  );
  // Function to mark notification as read
  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem("token");
      const deviceId = localStorage.getItem("deviceId");

      if (!token) {
        throw new Error("No authentication token found");
      }

      await api.put(
        `/notifications/${notificationId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Device-Id": deviceId,
          },
        }
      );

      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === notificationId ? { ...notif, read: true } : notif
        )
      );

      toast.success("Notification marked as read");
    } catch(error) {
      const errorMsg =  error as ApiError;
      console.error("Failed to mark notification as read:");
      toast.error(errorMsg.message);
    }
  };
  const markAllNotificationsAsRead = async () => {
    try {
      const token = localStorage.getItem("token");
      const deviceId = localStorage.getItem("deviceId");
  
      if (!token) {
        throw new Error("No authentication token found");
      }
  
      const unreadNotifications = notifications.filter((n) => !n.read);
      await Promise.all(
        unreadNotifications.map((notification) =>
          api.put(
            `/notifications/${notification._id}/read`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Device-Id": deviceId,
              },
            }
          )
        )
      );
  
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read: true }))
      );
    } catch (error) {
      const apiError = error as ApiError;
      console.error("Failed to mark notifications as read:", apiError);
      const errorMessage =
        apiError.response?.data?.message ||
        "Failed to mark notifications as read";
      toast.error(errorMessage);
    }
  };

  const formatNotificationTime = (createdAt: string) => {
    try {
      const now = new Date();
      const notificationTime = new Date(createdAt);
      const diffInMinutes = Math.floor(
        (now.getTime() - notificationTime.getTime()) / (1000 * 60)
      );

      if (diffInMinutes < 1) return "Just now";
      if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
      if (diffInMinutes < 1440)
        return `${Math.floor(diffInMinutes / 60)} hours ago`;
      return `${Math.floor(diffInMinutes / 1440)} days ago`;
    } catch {
      return "Unknown time";
    }
  };

  const getNotificationType = (
    message: string
  ): "info" | "success" | "warning" | "error" => {
    const lowerMessage = message.toLowerCase();
    if (
      lowerMessage.includes("error") ||
      lowerMessage.includes("failed") ||
      lowerMessage.includes("problem")
    ) {
      return "error";
    }
    if (
      lowerMessage.includes("warning") ||
      lowerMessage.includes("alert") ||
      lowerMessage.includes("attention")
    ) {
      return "warning";
    }
    if (
      lowerMessage.includes("success") ||
      lowerMessage.includes("completed") ||
      lowerMessage.includes("approved") ||
      lowerMessage.includes("enrolled") ||
      lowerMessage.includes("assigned")
    ) {
      return "success";
    }
    return "info";
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return {
          icon: <CheckCircle className="w-4 h-4" />,
          className: "bg-green-100 text-green-600",
        };
      case "warning":
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          className: "bg-yellow-100 text-yellow-600",
        };
      case "error":
        return {
          icon: <XCircle className="w-4 h-4" />,
          className: "bg-red-100 text-red-600",
        };
      default:
        return {
          icon: <Info className="w-4 h-4" />,
          className: "bg-blue-100 text-blue-600",
        };
    }
  };

  useEffect(() => {
    if (user && user?.role?.roleName === "Student") {
      fetchNotifications();
    }
  }, [user]);

  return (
    <TooltipProvider>
      <style>{styles}</style>
      <div className="flex min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100">
        <motion.aside
          className="bg-white/80 backdrop-blur-lg border-r border-slate-200/50 shadow-md flex flex-col fixed top-[60px] left-0 h-[calc(100vh-60px)] z-40"
          initial={{ width: "80px" }}
          animate={{ width: isSidebarCollapsed ? "80px" : "320px" }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          onMouseEnter={() => setIsSidebarCollapsed(false)}
          onMouseLeave={() => {
            if (!isSidebarPinned) {
              setIsSidebarCollapsed(true);
              setIsHelpMenuOpen(false);
              setIsCoursesMenuOpen(false);
              setShowNotificationOptions(false);
            }
          }}
        >
          {/* Header Section */}
          <div className="p-6 border-b border-slate-200/60">
            {isSidebarCollapsed ? (
              <div className="flex items-center justify-center">
                <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-blue-500/20 bg-gray-100 flex-shrink-0">
                  <Image
                    src={userDetails?.profileImage || profile}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    width={48}
                    height={48}
                  />
                </div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-blue-500/20">
                      <Image
                        src={userDetails?.profileImage || profile}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        width={56}
                        height={56}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-lg">
                        {userDetails?.name || user?.name}
                      </h3>
                      <Badge
                        variant="secondary"
                        className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                      >
                        {userDetails?.role?.roleName || user?.role?.roleName}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setShowNotifications(true);
                            markAllNotificationsAsRead();
                          }}
                          className="h-8 w-8 cursor-pointer rounded-xl transition-all duration-200 hover:bg-slate-100 text-slate-500 relative"
                        >
                          <Bell className="w-4 h-4" />
                          {notifications.filter((n) => !n.read).length > 0 && (
                            <span className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 rounded-full text-sm text-white flex items-center justify-center font-bold shadow-lg border-2 border-white">
                              {notifications.filter((n) => !n.read).length > 9
                                ? "9+"
                                : notifications.filter((n) => !n.read).length}
                            </span>
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        Notifications
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={toggleSidebarPin}
                          className={`h-8 w-8 rounded-xl transition-all cursor-pointer duration-200 ${
                            isSidebarPinned
                              ? "bg-blue-100 text-blue-600 hover:bg-blue-200"
                              : "hover:bg-slate-100 text-slate-500"
                          }`}
                        >
                          <Pin
                            className={`w-4 h-4 transition-transform ${
                              isSidebarPinned ? "rotate-45" : ""
                            }`}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {isSidebarPinned ? "Unpin sidebar" : "Pin sidebar"}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Link href="/student/profile">
                      <Button
                        size="sm"
                        className="bg-blue-600 cursor-pointer hover:bg-blue-700 text-white rounded-xl"
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        Profile
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleLogout}
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl cursor-pointer"
                    >
                      <LogOut className="w-3 h-3 mr-1" />
                      Logout
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isNotificationsEnabled}
                            onChange={(e) =>
                              handleToggleNotifications(e.target.checked)
                            }
                            className="sr-only peer"
                            disabled={isLoading}
                          />
                          <div
                            className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                              isLoading
                                ? "bg-gray-300 cursor-not-allowed"
                                : "bg-gray-200 peer-checked:bg-green-500"
                            }`}
                          ></div>
                        </label>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        {isNotificationsEnabled
                          ? "Disable notifications"
                          : "Enable notifications"}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Enhanced Notification Options */}
                <AnimatePresence>
                  {showNotificationOptions && (
                    <motion.div
                      initial={{ opacity: 0, y: -20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                      className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-200/50 shadow-lg"
                    >
                      <h4 className="font-semibold text-slate-800 mb-4 flex items-center">
                        <Bell className="w-4 h-4 mr-2 text-blue-600" />
                        Notification Settings
                      </h4>

                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium cursor-pointertext-slate-700 mb-2 block">
                            Method
                          </label>
                          <div className="grid cursor-pointer gap-2">
                            {[
                              {
                                key: "Email",
                                icon: EmailIcon,
                                desc: "Email notifications",
                              },
                              // { key: "WhatsApp", icon: "💬", desc: "WhatsApp messages" },
                              // { key: "Both", icon: "🔔", desc: "Email + WhatsApp" },
                            ].map((method) => (
                              <button
                                key={method.key}
                                onClick={() =>
                                  selectNotificationMethod(method.key)
                                }
                                className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 transition-all duration-200 ${
                                  notificationMethod === method.key
                                    ? "border-blue-500 bg-blue-50 text-blue-700"
                                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                }`}
                              >
                                <span className="text-lg">{method.icon}</span>
                                <div className="text-left">
                                  <div className="font-medium text-sm">
                                    {method.key}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {method.desc}
                                  </div>
                                </div>
                                {notificationMethod === method.key && (
                                  <ChevronRight className="w-4 h-4 ml-auto text-blue-500" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        {notificationMethod && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="space-y-2"
                          >
                            <label className="text-sm font-medium text-slate-700 block">
                              Timing
                            </label>
                            <div className="grid  grid-cols-2 cursor-pointer gap-2">
                              {[
                                { key: "1 day", label: "1 Day", icon: "📅" },
                                { key: "1 hour", label: "1 Hour", icon: "⏰" },
                                { key: "30 min", label: "30 Min", icon: "⏱️" },
                                { key: "10 min", label: "10 Min", icon: "⚡" },
                              ].map((timing) => (
                                <button
                                  key={timing.key}
                                  onClick={() =>
                                    setNotificationTiming(timing.key)
                                  }
                                  className={`flex items-center cursor-pointer justify-center gap-2 p-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    notificationTiming === timing.key
                                      ? "bg-green-500 text-white shadow-md"
                                      : "bg-white border border-slate-200 hover:border-slate-300 text-slate-700"
                                  }`}
                                >
                                  <span>{timing.icon}</span>
                                  {timing.label}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}

                        {notificationMethod && notificationTiming && (
                          <Button
                            onClick={handleSaveNotificationPreferences}
                            className="w-full cursor-pointer bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl shadow-md"
                          >
                            Save Preferences
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2 custom-sidebar">
            {sidebarItems.map((item, index) => {
              const isDisabled = disabledMenuItems.includes(item.name);

              return item.name === "My Courses" ? (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div
                    className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-200 hover:bg-slate-100 cursor-pointer ${
                      isCoursesMenuOpen ||
                      pathname.startsWith("/student/courses")
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                        : "text-slate-700 hover:text-slate-900"
                    }`}
                    onClick={() => setIsCoursesMenuOpen(!isCoursesMenuOpen)}
                  >
                    <div className="flex items-center">
                      <span
                        className={`${
                          isCoursesMenuOpen ||
                          pathname.startsWith("/student/courses")
                            ? "text-white"
                            : item.color
                        } transition-colors duration-200`}
                      >
                        {item.icon}
                      </span>
                      <AnimatePresence>
                        {!isSidebarCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="ml-3 font-medium text-sm"
                          >
                            {item.name}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                    {!isSidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {isCoursesMenuOpen ? (
                          <FaAngleDown
                            size={16}
                            className={
                              isCoursesMenuOpen ||
                              pathname.startsWith("/student/courses")
                                ? "text-white"
                                : "text-slate-500"
                            }
                          />
                        ) : (
                          <FaAngleRight
                            size={16}
                            className={
                              isCoursesMenuOpen ||
                              pathname.startsWith("/student/courses")
                                ? "text-white"
                                : "text-slate-500"
                            }
                          />
                        )}
                      </motion.span>
                    )}
                  </div>
                  <AnimatePresence>
                    {isCoursesMenuOpen && !isSidebarCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="ml-4 pl-4 border-l border-slate-200 mt-1 space-y-1"
                      >
                        {courses.map((course) => (
                          <Link
                            key={course.courseId}
                            href={`/student/courses/${course.courseId}`}
                          >
                            <div
                              className={`flex items-center p-2 rounded-lg text-sm transition-all duration-200 ${
                                pathname ===
                                `/student/courses/${course.courseId}`
                                  ? "bg-blue-100 text-blue-700 font-medium"
                                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                              }`}
                            >
                              {course.title}
                            </div>
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`group flex items-center p-3 rounded-xl transition-all duration-200 relative ${
                          isDisabled
                            ? "text-slate-400 cursor-not-allowed opacity-60"
                            : pathname === item.href
                            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg cursor-pointer hover:bg-slate-100"
                            : "text-slate-700 hover:text-slate-900 cursor-pointer hover:bg-slate-100"
                        }`}
                        onClick={(e) => {
                          if (isDisabled) {
                            e.preventDefault();
                            setShowComingSoon(item.name);
                            setTimeout(() => setShowComingSoon(null), 2000);
                          } else if (item.href !== "#") {
                            router.push(item.href);
                          }
                        }}
                        onMouseEnter={() => {
                          if (isDisabled) {
                            setShowComingSoon(item.name);
                          }
                        }}
                        onMouseLeave={() => {
                          if (isDisabled) {
                            setShowComingSoon(null);
                          }
                        }}
                      >
                        <span
                          className={`${
                            isDisabled
                              ? "text-slate-400"
                              : pathname === item.href
                              ? "text-white"
                              : item.color
                          } transition-colors duration-200`}
                        >
                          {item.icon}
                        </span>
                        <AnimatePresence>
                          {!isSidebarCollapsed && (
                            <motion.span
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              transition={{ duration: 0.2 }}
                              className="ml-3 font-medium text-sm"
                            >
                              {item.name}
                            </motion.span>
                          )}
                        </AnimatePresence>
                        {pathname === item.href &&
                          !isSidebarCollapsed &&
                          !isDisabled && (
                            <motion.div
                              layoutId="activeIndicator"
                              className="ml-auto w-2 h-2 bg-white rounded-full"
                              transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 30,
                              }}
                            />
                          )}
                        {isDisabled && !isSidebarCollapsed && (
                          <span className="ml-auto text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full">
                            Soon
                          </span>
                        )}
                      </div>
                    </TooltipTrigger>
                    {isDisabled && (
                      <TooltipContent
                        side="right"
                        className="bg-orange-500 text-white"
                      >
                        <div className="flex items-center gap-2">
                          <span>🚀</span>
                          Coming Soon!
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </motion.div>
              );
            })}

            {/* Help and Support */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: sidebarItems.length * 0.05 }}
            >
              <div
                className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-200 hover:bg-slate-100 cursor-pointer ${
                  isHelpMenuOpen || pathname === "/student/support"
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                    : "text-slate-700 hover:text-slate-900"
                }`}
                onClick={() => setIsHelpMenuOpen(!isHelpMenuOpen)}
              >
                <div className="flex items-center">
                  <span
                    className={`${
                      isHelpMenuOpen || pathname === "/student/support"
                        ? "text-white"
                        : "text-pink-500"
                    } transition-colors duration-200`}
                  >
                    <HelpCircle className="w-5 h-5" />
                  </span>
                  <AnimatePresence>
                    {!isSidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="ml-3 font-medium text-sm"
                      >
                        Help and Support
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                {!isSidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {isHelpMenuOpen ? (
                      <FaAngleDown
                        size={16}
                        className={
                          isHelpMenuOpen || pathname === "/student/support"
                            ? "text-white"
                            : "text-slate-500"
                        }
                      />
                    ) : (
                      <FaAngleRight
                        size={16}
                        className={
                          isHelpMenuOpen || pathname === "/student/support"
                            ? "text-white"
                            : "text-slate-500"
                        }
                      />
                    )}
                  </motion.span>
                )}
              </div>
              <AnimatePresence>
                {isHelpMenuOpen && !isSidebarCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="ml-4 pl-4 border-l border-slate-200 mt-1"
                  >
                    <Link
                      href="/student/raise-query"
                      onClick={handleRaiseQueryClick}
                    >
                      <div className="flex items-center p-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200">
                        Raise a Query
                      </div>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </nav>

          {/* Footer */}
          <AnimatePresence>
            {!isSidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="p-4 border-t border-slate-200/60"
              >
                <Button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl shadow-md">
                  🚀 Renew Now
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.aside>

        {/* Main Content */}
        <main
          className={`flex-1 transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isSidebarCollapsed ? "ml-20" : "ml-80"
          }  min-h-screen`}
        >
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>

        {/* Modal for FAQ/Raise Query */}
        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1000]"
              onClick={() => setIsModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
              >
                <Card className="bg-white border-0 rounded-3xl max-w-md w-full shadow-2xl">
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <HelpCircle className="w-8 h-8 text-blue-500" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-800">
                      NEW FAQs AVAILABLE!
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center space-y-6">
                    <p className="text-slate-600 leading-relaxed">
                      We&apos;ve added a new FAQs section to help you find
                      answers to common questions. Click below to check it out
                      instead of raising tickets.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleCheckFAQs}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-xl cursor-pointer"
                        disabled={true}
                      >
                        Check FAQs
                      </Button>
                      <Button
                        onClick={handleRaiseTicket}
                        variant="outline"
                        className="flex-1 border-2 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer"
                      >
                        Raise a Ticket
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Disable Notifications Confirmation Modal */}
        <AnimatePresence>
          {showDisableConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1000]"
              onClick={() => setShowDisableConfirm(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
              >
                <Card className="bg-white border-0 rounded-3xl max-w-md w-full shadow-2xl">
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bell className="w-8 h-8 text-red-500" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-800">
                      Disable Notifications?
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center space-y-6">
                    <p className="text-slate-600 leading-relaxed">
                      You&apos;ll no longer receive important updates about your
                      classes, schedules, and platform activities.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 border-2 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl"
                        onClick={() => setShowDisableConfirm(false)}
                      >
                        Keep Enabled
                      </Button>
                      <Button
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl"
                        onClick={handleDisableNotifications}
                      >
                        Disable
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notifications Modal */}
        <AnimatePresence>
          {showNotifications && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1000]"
              onClick={() => setShowNotifications(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
              >
                <Card className="bg-white border-0 rounded-3xl max-w-md w-full shadow-2xl max-h-[80vh] overflow-hidden">
                  <CardHeader className="pb-4 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-bold text-slate-800">
                        Notifications
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowNotifications(false)}
                        className="h-8 w-8 rounded-xl hover:bg-slate-100 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 max-h-96 overflow-y-auto custom-notifications">
                  <div className="pt-1 p-6 space-y-6">
                      {notificationsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="flex flex-col items-center gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                            <p className="text-sm text-gray-500">
                              Loading notifications...
                            </p>
                          </div>
                        </div>
                      ) : notificationsError ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="bg-red-50 p-3 rounded-full mb-3">
                            <XCircle className="w-8 h-8 text-red-500" />
                          </div>
                          <p className="text-red-600 font-medium">
                            Failed to load notifications
                          </p>
                          <p className="text-sm text-gray-500 mt-1 max-w-xs">
                            {notificationsError}
                          </p>
                        </div>
                      ) : notifications.length > 0 ? (
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-semibold text-slate-800">
                                Recent Notifications
                              </h3>
                            </div>
                            <div className="space-y-3">
                              {notifications.map((notification) => {
                                const notificationType = getNotificationType(
                                  notification.message
                                );
                                const notificationIcon =
                                  getNotificationIcon(notificationType);

                                return (
                                  <div
                                    key={notification._id}
                                    className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                                      notification.read
                                        ? "bg-slate-50 hover:bg-slate-100"
                                        : "bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-500"
                                    }`}
                                    onClick={() =>
                                      !notification.read &&
                                      markNotificationAsRead(notification._id)
                                    }
                                  >
                                    <div
                                      className={`p-2 rounded-lg ${notificationIcon.className} flex-shrink-0`}
                                    >
                                      {notificationIcon.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p
                                        className={`text-sm ${
                                          notification.read
                                            ? "font-medium text-slate-700"
                                            : "font-semibold text-slate-900"
                                        }`}
                                      >
                                        {notification.message}
                                      </p>

                                      <p className="text-xs text-slate-500 mt-2 flex items-center">
                                        <Clock className="w-3 h-3 mr-1" />
                                        {formatNotificationTime(
                                          notification.createdAt
                                        )}
                                      </p>
                                    </div>
                                    {!notification.read && (
                                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 animate-pulse"></div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="bg-gray-50 p-3 rounded-full mb-3">
                            <Bell className="w-8 h-8 text-gray-400" />
                          </div>
                          <p className="font-medium text-gray-700">
                            No notifications found
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            You&apos;re all caught up!
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showComingSoon && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-6 right-6 z-[1001]"
            >
              <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 max-w-sm">
                <div className="text-2xl">🚀</div>
                <div>
                  <div className="font-semibold text-sm">Coming Soon!</div>
                  <div className="text-xs opacity-90">
                    {showComingSoon} will be available soon
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
};

export default StudentLayout;
