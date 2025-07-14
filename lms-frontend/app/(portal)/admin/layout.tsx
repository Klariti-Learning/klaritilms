"use client";

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
  ShieldIcon as ShieldUser,
  BookUser,
  BookOpen,
  User,
  Pin,
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
  NotebookTabs,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import profile from "../../../public/Assests/small.png";
import type { TeacherLayoutProps } from "@/types";
import toast from "react-hot-toast";
import { useUser } from "@/lib/UserContext";
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

interface Notification {
  _id: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  priority?: string;
}

interface ApiError {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
  message?: string;
}

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

const AdminLayout = ({ children }: TeacherLayoutProps) => {
  const { user, logout } = useAuth();
  const { userDetails } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
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
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(
    null
  );

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
        console.error("Failed to fetch notification preferences:", error);
        toast.error("Failed to load notification preferences");
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotificationPreferences();
  }, [user]);

  useEffect(() => {
    if (!user || !user?.role || user?.role?.roleName !== "Admin") {
      router.push("/my-learnings");
    }
  }, [user, router]);

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
      console.error("Failed to fetch notifications:", apiError);
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
    } catch (error) {
      const apiError = error as ApiError;
      console.error("Failed to mark notification as read:", apiError);
      const errorMessage =
        apiError.response?.data?.message ||
        "Failed to mark notification as read";
      toast.error(errorMessage);
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
        fill="#4285F4"
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
    if (user && user?.role?.roleName === "Admin") {
      fetchNotifications();
    }
  }, [user]);

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
            : notificationTiming === "30 min"
            ? "30min"
            : "10min",
        ],
      });
      setIsNotificationsEnabled(false);
      setShowNotificationOptions(false);
      setShowDisableConfirm(false);
      toast.success("Notifications disabled");
    } catch (error) {
      console.error("Failed to disable notifications:", error);
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
        : notificationTiming === "30 min"
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
      console.error("Failed to save notification preferences:", error);
      toast.error("Failed to save notification preferences");
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

  const handleLogout = async () => {
    if (!user) return;
    try {
      await logout();
    } catch (error) {
      const errorMessage = error as ApiError;
      const errors = errorMessage.response?.data?.message || "Failed to logout";
      toast.error(errors);
    }
  };

  const selectNotificationMethod = (method: string) => {
    setNotificationMethod(method);
  };

  const toggleSidebarPin = () => {
    setIsSidebarPinned(!isSidebarPinned);
  };

  const sidebarItems = [
    {
      name: "Dashboard",
      icon: <Home className="w-5 h-5" />,
      href: "/admin",
      color: "text-indigo-500",
      disabled: false,
    },
    {
      name: "Courses",
      icon: <BookOpen className="w-5 h-5" />,
      href: "/admin/courses",
      color: "text-green-500",
      disabled: false,
    },
    {
      name: "Schedule Demo Classes",
      icon: <School className="w-5 h-5" />,
      href: "/admin/schedule-call",
      color: "text-purple-500",
      disabled: false,
    },
    {
      name: "Attendance",
      icon: <NotebookTabs className="w-5 h-5" />,
      href: "/admin/attendance",
      color: "text-rose-500",
      disabled: false,
    },
    {
      name: "Recordings",
      icon: <Video className="w-5 h-5" />,
      href: "/admin/recordings",
      color: "text-orange-500",
      disabled: true,
    },
    {
      name: "Community",
      icon: <User className="w-5 h-5" />,
      href: "/admin/users",
      color: "text-red-500",
      disabled: false,
    },
    {
      name: "Assign Role",
      icon: <ShieldUser className="w-5 h-5" />,
      href: "/admin/assign-role",
      color: "text-cyan-500",
      disabled: false,
    },
    {
      name: "Progress",
      icon: <BarChart2 className="w-5 h-5" />,
      href: "/admin/progress",
      color: "text-yellow-500",
      disabled: true,
    },
    {
      name: "Summer Camp",
      icon: <Tent className="w-5 h-5" />,
      href: "/admin/summer-camp",
      color: "text-amber-500",
      disabled: true,
    },
    {
      name: "Rewards",
      icon: <Award className="w-5 h-5" />,
      href: "/admin/rewards",
      color: "text-pink-500",
      disabled: true,
    },
    {
      name: "Support",
      icon: <HelpCircle className="w-5 h-5" />,
      href: "/admin/support",
      color: "text-emerald-500",
      disabled: true,
    },
    {
      name: "KlaritiShop",
      icon: <ShoppingBag className="w-5 h-5" />,
      href: "/admin/KlaritiShop",
      color: "text-slate-500",
      disabled: true,
    },
    {
      name: "FAQ",
      icon: <FileText className="w-5 h-5" />,
      href: "/admin/faq",
      color: "text-teal-500",
      disabled: true,
    },
    {
      name: "Refer Friend",
      icon: <Users2 className="w-5 h-5" />,
      href: "/admin/refer",
      color: "text-violet-500",
      disabled: true,
    },
    {
      name: "Parents Corner",
      icon: <BookUser className="w-5 h-5" />,
      href: "/admin/parents",
      color: "text-amber-500",
      disabled: true,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">
            Please log in to continue
          </h2>
          <p className="text-gray-600 mt-2">
            You need to be logged in to access this page.
          </p>
        </div>
      </div>
    );
  }

  if (user?.role?.roleName !== "Admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">Access Denied</h2>
          <p className="text-gray-600 mt-2">
            You don&apos;t have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <style>{styles}</style>
      <div className="flex min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <motion.aside
          className="bg-white/80 backdrop-blur-lg border-r border-indigo-200/50 shadow-md flex flex-col fixed top-0 left-0 h-screen z-40"
          initial={{ width: "80px" }}
          animate={{ width: isSidebarCollapsed ? "80px" : "320px" }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          onMouseEnter={() => setIsSidebarCollapsed(false)}
          onMouseLeave={() => {
            if (!isSidebarPinned) {
              setIsSidebarCollapsed(true);
              setShowNotificationOptions(false);
            }
          }}
        >
          <div className="p-6 border-b border-indigo-200/60 mt-17">
            {isSidebarCollapsed ? (
              <div className="flex items-center justify-center">
                <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-indigo-500/20 flex-shrink-0">
                  <Image
                    src={userDetails?.profileImage || profile}
                    alt="Profile"
                    className="w-full h-full object-cover rounded-full"
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
                    <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-indigo-500/20">
                      <Image
                        src={userDetails?.profileImage || profile}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        width={56}
                        height={56}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 text-lg">
                        {userDetails?.name || user?.name}
                      </h3>
                      <Badge
                        variant="secondary"
                        className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200"
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
                          className="h-8 w-8 rounded-xl transition-all duration-200 cursor-pointer hover:bg-indigo-100 text-gray-600 relative"
                        >
                          <Bell className="w-4 h-4" />
                          {notifications.filter((n) => !n.read).length > 0 && (
                            <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-sm text-white flex items-center justify-center font-bold shadow-lg border-2 border-white">
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
                          className={`h-8 w-8 rounded-xl cursor-pointer transition-all duration-200 ${
                            isSidebarPinned
                              ? "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                              : "hover:bg-gray-100 text-gray-600"
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
                    <Link href="/admin/profile">
                      <Button
                        size="sm"
                        className="bg-indigo-600 cursor-pointer hover:bg-indigo-700 text-white rounded-xl"
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        Profile
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleLogout}
                      className="border-red-200 text-red-600 cursor-pointer hover:bg-red-50 hover:border-red-300 rounded-xl"
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
                            className={`w-11 h-6 rounded-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
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
                <AnimatePresence>
                  {showNotificationOptions && (
                    <motion.div
                      initial={{ opacity: 0, y: -20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                      className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-200/50 shadow-lg"
                    >
                      <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                        <Bell className="w-4 h-4 mr-2 text-indigo-600" />
                        Notification Settings
                      </h4>

                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">
                            Method
                          </label>
                          <div className="grid cursor-pointer gap-2">
                            {[
                              {
                                key: "Email",
                                icon: EmailIcon,
                                desc: "Email notifications",
                              },
                            ].map((method) => (
                              <button
                                key={method.key}
                                onClick={() =>
                                  selectNotificationMethod(method.key)
                                }
                                className={`flex items-center gap-3 p-3 cursor-pointer rounded-xl border-2 transition-all duration-200 ${
                                  notificationMethod === method.key
                                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                }`}
                              >
                                <span className="text-lg">{method.icon}</span>
                                <div className="text-left">
                                  <div className="font-medium text-sm">
                                    {method.key}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {method.desc}
                                  </div>
                                </div>
                                {notificationMethod === method.key && (
                                  <ChevronRight className="w-4 h-4 ml-auto text-indigo-500" />
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
                            <label className="text-sm font-medium text-gray-700 block">
                              Timing
                            </label>
                            <div className="grid grid-cols-2 gap-2">
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
                                      : "bg-white border border-gray-200 hover:border-gray-300 text-gray-700"
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

          <nav className="flex-1 overflow-y-auto p-4 space-y-2 custom-sidebar">
            {sidebarItems.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {item.disabled ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`group flex items-center p-3 rounded-xl transition-all duration-200 cursor-not-allowed opacity-50 hover:opacity-70 ${
                          pathname === item.href
                            ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          toast.success(
                            "🚀 Coming Soon! This feature is under development."
                          );
                        }}
                      >
                        <span
                          className={`${
                            pathname === item.href ? "text-white" : item.color
                          } transition-colors duration-200 opacity-60`}
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
                        {!isSidebarCollapsed && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="ml-auto px-2 py-1 bg-yellow-100 text-yellow-600 text-xs font-medium rounded-full"
                          >
                            Soon
                          </motion.div>
                        )}
                        {pathname === item.href && !isSidebarCollapsed && (
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
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="bg-yellow-100 text-yellow-800 border-yellow-200"
                    >
                      <div className="flex items-center gap-2">
                        <span>🚀</span>
                        <span>Coming Soon!</span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Link href={item.href}>
                    <div
                      className={`group flex items-center p-3 rounded-xl transition-all duration-200 hover:bg-gray-100 ${
                        pathname === item.href
                          ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg"
                          : "text-gray-700 hover:text-gray-900"
                      }`}
                    >
                      <span
                        className={`${
                          pathname === item.href ? "text-white" : item.color
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
                      {pathname === item.href && !isSidebarCollapsed && (
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
                    </div>
                  </Link>
                )}
              </motion.div>
            ))}
          </nav>

          <AnimatePresence>
            {!isSidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="p-4 border-t border-indigo-200/60"
              >
                <Button className="w-full cursor-pointer bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl shadow-md">
                  🚀 Renew Subscription
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.aside>

        <main
          className={`flex-1 transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isSidebarCollapsed ? "ml-20" : "ml-80"
          } p-8 min-h-screen`}
        >
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>

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
                    <CardTitle className="text-2xl font-bold text-gray-800">
                      Disable Notifications?
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center space-y-6">
                    <p className="text-gray-600 leading-relaxed">
                      You&apos;ll no longer receive important updates about your
                      classes, schedules, and platform activities.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1 border-2 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl"
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
                  <CardHeader className="pb-4 border-b border-indigo-100">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-bold text-gray-800">
                        Notifications
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowNotifications(false)}
                        className="h-8 w-8 rounded-xl hover:bg-gray-100 cursor-pointer"
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
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
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
                              <h3 className="font-semibold text-gray-800">
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
                                        ? "bg-gray-50 hover:bg-gray-100"
                                        : "bg-indigo-50 hover:bg-indigo-100 border-l-4 border-indigo-500"
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
                                            ? "font-medium text-gray-700"
                                            : "font-semibold text-gray-900"
                                        }`}
                                      >
                                        {notification.message}
                                      </p>

                                      <p className="text-xs text-gray-500 mt-2 flex items-center">
                                        <Clock className="w-3 h-3 mr-1" />
                                        {formatNotificationTime(
                                          notification.createdAt
                                        )}
                                      </p>
                                    </div>
                                    {!notification.read && (
                                      <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 animate-pulse"></div>
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
      </div>
    </TooltipProvider>
  );
};

export default AdminLayout;
