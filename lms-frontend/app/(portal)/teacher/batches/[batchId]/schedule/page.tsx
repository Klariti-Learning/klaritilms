"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FaCalendarCheck, FaInfoCircle, FaClock } from "react-icons/fa";
import { Search, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { ApiError } from "@/types";
import moment from "moment-timezone";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import dayjs from "dayjs";

interface Batch {
  _id: string;
  name: string;
  courseId?: string;
  courseTitle?: string;
  isScheduled?: boolean;
}

interface Lesson {
  lessonId: string;
  title: string;
}

interface Chapter {
  chapterId: string;
  title: string;
  lessons: Lesson[];
}

interface Course {
  courseId: string;
  title: string;
  chapters: Chapter[];
}

interface FormData {
  courseId: string;
  batchId: string;
  classType: string;
  meetingType: string;
  meetingLink: string;
  zoomLink: string;
  timezone: string;
  startTime: string;
  startDate: string;
  days: string[];
  repeat: number;
  lessonIds: string[];
  callDuration: number;
}

interface FormErrors {
  courseId?: string;
  batchId?: string;
  classType?: string;
  meetingType?: string;
  meetingLink?: string;
  zoomLink?: string;
  timezone?: string;
  startTime?: string;
  startDate?: string;
  days?: string;
  repeat?: string;
  lessonIds?: string;
  callDuration?: string;
}

interface Duration {
  hours: number;
  minutes: number;
}

const CustomDurationPicker: React.FC<{
  value: Duration;
  onChange: (duration: Duration) => void;
  maxHours?: number;
}> = ({ value, onChange, maxHours = 5 }) => {
  const hourOptions = ["00"].concat(Array.from({ length: maxHours }, (_, i) => String(i + 1).padStart(2, '0')));
  const minuteOptions = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  const handleHourChange = (hour: string) => {
    const newHours = parseInt(hour, 10) || 0;
    onChange({ hours: newHours, minutes: value.minutes });
  };

  const handleMinuteChange = (minute: string) => {
    const newMinutes = parseInt(minute, 10) || 0;
    onChange({ hours: value.hours, minutes: newMinutes });
  };

  return (
    <motion.div 
      className="flex items-center gap-2 bg-gray-100/80 rounded-xl p-2 shadow-sm"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <FaClock className="w-4 h-4 text-gray-500 ml-2" />
      <Select value={String(value.hours).padStart(2, '0')} onValueChange={handleHourChange}>
        <SelectTrigger className="w-20 h-10 bg-white/90 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all duration-300 hover:shadow-sm cursor-pointer">
          <SelectValue placeholder="Hours" />
        </SelectTrigger>
        <SelectContent className="bg-white/95 backdrop-blur-lg rounded-xl shadow-xl max-h-60 no-scrollbar border border-gray-100 cursor-pointer">
          {hourOptions.map((hour) => (
            <motion.div
              key={hour}
              whileHover={{ backgroundColor: '#eef2ff', x: 2 }}
              transition={{ duration: 0.2 }}
            >
              <SelectItem
                value={hour}
                className="cursor-pointer py-2 px-4 text-gray-700 hover:text-indigo-600 transition-all duration-200"
              >
                {hour}
              </SelectItem>
            </motion.div>
          ))}
        </SelectContent>
      </Select>
      <span className="text-gray-600 text-sm font-medium">hr</span>
      <Select value={String(value.minutes).padStart(2, '0')} onValueChange={handleMinuteChange}>
        <SelectTrigger className="w-20 h-10 bg-white/90 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all duration-300 hover:shadow-sm cursor-pointer">
          <SelectValue placeholder="Minutes" />
        </SelectTrigger>
        <SelectContent className="bg-white/95 backdrop-blur-lg rounded-xl shadow-xl max-h-60 no-scrollbar border border-gray-100 cursor-pointer">
          {minuteOptions.map((minute) => (
            <motion.div
              key={minute}
              whileHover={{ backgroundColor: '#eef2ff', x: 2 }}
              transition={{ duration: 0.2 }}
            >
              <SelectItem
                value={minute}
                className="cursor-pointer py-2 px-4 text-gray-700 hover:text-indigo-600 transition-all duration-200"
              >
                {minute}
              </SelectItem>
            </motion.div>
          ))}
        </SelectContent>
      </Select>
      <span className="text-gray-600 text-sm font-medium mr-2">min</span>
    </motion.div>
  );
};

export default function ScheduleBatch() {
  const { user, loading: authLoading, deviceId } = useAuth();
  const router = useRouter();
  const { batchId } = useParams();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    courseId: "",
    batchId: "",
    classType: "",
    meetingType: "zoom",
    meetingLink: "",
    zoomLink: "",
    timezone: moment.tz.guess(),
    startTime: "12:00",
    startDate: moment().format("YYYY-MM-DD"),
    days: [moment().format("dddd")],
    repeat: 0,
    lessonIds: [],
    callDuration: 120,
  });
  const [error, setError] = useState<string | null>(null);
const [formErrors, setFormErrors] = useState<FormErrors>({});  const [scheduleDuration, setScheduleDuration] = useState<number | null>(null);
const [callDurationResponse, setCallDurationResponse] = useState<string | null>(null);
  const [timezoneSearch, setTimezoneSearch] = useState("");
  const [filteredTimezones, setFilteredTimezones] = useState<string[]>(moment.tz.names());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleUnauthorized = useCallback(() => {
  console.debug("[ScheduleBatch] Handling unauthorized access");
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("deviceId");
  setError("Session expired. Please log in again.");
  router.push("/login");
}, [router]);

useEffect(() => {
  if (authLoading) return;
  if (!user || user.role?.roleName !== "Teacher") {
    console.debug("[ScheduleBatch] Redirecting due to invalid role or no user", {
      user: !!user,
      role: user?.role?.roleName,
      authLoading,
    });
    handleUnauthorized();
    return;
  }
}, [user, authLoading, handleUnauthorized, router]);

useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token || !deviceId) {
        console.debug("[ScheduleBatch] Missing token or deviceId in fetchData", { token, deviceId });
        handleUnauthorized();
        return;
      }

      const id = Array.isArray(batchId) ? batchId[0] : batchId;
      const batchResponse = await api.get(`/courses/batches/teacher/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Device-Id": deviceId,
        },
      });
      const fetchedBatch = batchResponse.data;
      if (!fetchedBatch.courseId) {
        throw new Error("No course assigned to this batch");
      }
      setBatch(fetchedBatch);

      const courseResponse = await api.get(`/courses/${fetchedBatch.courseId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Device-Id": deviceId,
        },
      });
      const fetchedCourse = courseResponse.data;
      setCourse(fetchedCourse);

      const allLessonIds = fetchedCourse.chapters.flatMap((chapter: Chapter) =>
        chapter.lessons.map((lesson: Lesson) => lesson.lessonId)
      );

      setFormData((prev) => ({
        ...prev,
        courseId: fetchedBatch.courseId || "",
        batchId: fetchedBatch._id,
        classType: fetchedBatch.courseTitle || "",
        lessonIds: allLessonIds,
      }));
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        setError(apiError.response?.data?.message || "Failed to fetch batch or course details");
        toast.error(apiError.response?.data?.message || "Failed to fetch batch or course details");
      }
    } finally {
      setLoading(false);
    }
  };

  if (user && user.role?.roleName === "Teacher" && batchId) {
    fetchData();
  }
}, [user, batchId, deviceId, handleUnauthorized]);

  useEffect(() => {
    const handler = setTimeout(() => {
      const lowerQuery = timezoneSearch.toLowerCase();
      const filtered = moment.tz.names().filter((tz) => tz.toLowerCase().includes(lowerQuery));
      setFilteredTimezones(filtered);
    }, 300);

    return () => clearTimeout(handler);
  }, [timezoneSearch]);

  const handleTimezoneSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTimezoneSearch(e.target.value);
  };

  const handleClearSearch = () => {
    setTimezoneSearch("");
  };

  const handleSelectOpen = () => {
    setTimeout(() => {
      document.getElementById("timezone-search-input")?.focus();
    }, 0);
  };

  const handleTimeChange = (value: dayjs.Dayjs | null) => {
    if (value) {
      const formattedTime = value.format("HH:mm");
      setFormData((prev) => ({ ...prev, startTime: formattedTime }));
      setFormErrors((prev) => ({ ...prev, startTime: undefined }));
    }
  };

const handleDurationChange = (duration: Duration) => {
  const totalMinutes = duration.hours * 60 + duration.minutes;
  if (totalMinutes <= 0) {
    setFormErrors((prev) => ({ ...prev, callDuration: "Duration must be at least 1 minute" }));
    return;
  }
  setFormData((prev) => ({
    ...prev,
    callDuration: totalMinutes,
  }));
  setFormErrors((prev) => ({ ...prev, callDuration: undefined }));
};

const validateForm = (): boolean => {
  const errors: FormErrors = {};
  if (!formData.classType.trim()) errors.classType = "Meeting name is recommended";
  if (formData.meetingType === "external" && !formData.meetingLink.trim())
    errors.meetingLink = "Meeting link is required for external meetings";
  if (formData.meetingType === "zoom" && !formData.zoomLink.trim())
    errors.zoomLink = "Zoom link is required for Zoom meetings";
  if (!formData.timezone) errors.timezone = "Timezone is required";
  if (!formData.startTime) errors.startTime = "Start time is required";
  if (!formData.startDate) errors.startDate = "Start date is required";
  setFormErrors(errors);
  return Object.keys(errors).length === 0;
};

const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  setFormData((prev) => ({ ...prev, [name]: value }));
  setFormErrors((prev) => ({ ...prev, [name]: undefined }));
};

const handleSelectChange = (name: keyof FormData) => (value: string) => {
  setFormData((prev) => ({
    ...prev,
    [name]: value,
  }));
  setFormErrors((prev) => ({ ...prev, [name]: undefined }));
};

const handleDateChange = (date: Date | undefined) => {
  if (date) {
    const formattedDate = moment(date).format("YYYY-MM-DD");
    const dayOfWeek = moment(date).format("dddd");
    setFormData((prev) => ({
      ...prev,
      startDate: formattedDate,
      days: [dayOfWeek],
    }));
    setFormErrors((prev) => ({
      ...prev,
      startDate: undefined,
      days: undefined,
    }));
    setIsCalendarOpen(false);
  }
};

const handleSwitchChange = (checked: number) => {
  setFormData((prev) => ({
    ...prev,
    repeat: checked,
  }));
  setFormErrors((prev) => ({ ...prev, repeat: undefined }));
};

const handleDayChange = (day: string) => {
  setFormData((prev) => {
    const newDays = prev.days.includes(day)
      ? prev.days.filter((d) => d !== day)
      : [...prev.days, day];
    return { ...prev, days: newDays };
  });
  setFormErrors((prev) => ({ ...prev, days: undefined }));
};

const handleSelectAllDays = () => {
  setFormData((prev) => {
    const allDays = daysOfWeek;
    const newDays = prev.days.length === allDays.length ? [] : allDays;
    return { ...prev, days: newDays };
  });
  setFormErrors((prev) => ({ ...prev, days: undefined }));
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!validateForm()) {
    toast.error("Please fix the form errors before submitting");
    return;
  }
  setSubmitting(true);
  try {
    const token = localStorage.getItem("token");
    if (!token || !deviceId) {
      console.debug("[ScheduleBatch] Missing token or deviceId in handleSubmit", { token, deviceId });
      handleUnauthorized();
      return;
    }

    const payload = {
      ...formData,
      lessonIds: formData.lessonIds,
      callDuration: formData.callDuration,
    };
    const response = await api.post("/schedule/create", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Device-Id": deviceId,
      },
    });
    toast.success(response.data.message || "Schedule created successfully");
    setScheduleDuration(response.data.duration || null);
    setCallDurationResponse(response.data.callDuration || null);
    setBatch((prev) => (prev ? { ...prev, isScheduled: true } : prev));
    router.push("/teacher/courses?tab=batch");
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.response?.status === 401) {
      handleUnauthorized();
    } else {
      toast.error(apiError.response?.data?.message || "Failed to create schedule");
    }
  } finally {
    setSubmitting(false);
  }
};

  const handleZoomLinkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const zoomAppUrl = "zoommtg://zoom.us";
    const zoomWebUrl = "https://zoom.us/meeting/schedule";

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = zoomAppUrl;
    document.body.appendChild(iframe);

    const timeout = 2000;
    const timer = setTimeout(() => {
      window.open(zoomWebUrl, "_blank");
      document.body.removeChild(iframe);
    }, timeout);

    const onBlur = () => {
      clearTimeout(timer);
      document.body.removeChild(iframe);
      window.removeEventListener("blur", onBlur);
    };

    window.addEventListener("blur", onBlur);
  };

  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const selectedDate = formData.startDate
    ? moment(formData.startDate).toDate()
    : undefined;

  if (authLoading || loading) {
    return (
      <motion.div 
        className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="relative w-24 h-24"
        >
          <div className="absolute inset-0 border-4 border-t-indigo-600 border-gray-200 rounded-full"></div>
          <FaCalendarCheck className="absolute inset-0 m-auto w-10 h-10 text-indigo-600" />
        </motion.div>
      </motion.div>
    );
  }

  if (error || !batch || !course) {
    return (
      <motion.div
        className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 border-l-4 border-red-500 p-8 rounded-2xl shadow-xl max-w-md"
        >
          <p className="text-red-700 font-semibold text-lg">
            {error || "Batch or course not found"}
          </p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-6 md:p-10">
        <style jsx global>{`
          .no-scrollbar {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .custom-toggle {
            position: relative;
            width: 90px;
            height: 40px;
            background-color: #e5e7eb;
            border-radius: 9999px;
            transition: background-color 0.3s ease;
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .custom-toggle.checked {
            background: linear-gradient(to right, #6366f1, #a855f7);
          }
          .custom-toggle .handle {
            position: absolute;
            top: 2px;
            left: 2px;
            width: 36px;
            height: 36px;
            background: white;
            border-radius: 50%;
            transition: transform 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 600;
            color: #1f2937;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
          }
          .custom-toggle.checked .handle {
            transform: translateX(50px);
            color: #6366f1;
          }
          .calendar-container {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(12px);
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            padding: 20px;
          }
          [data-selected="true"] {
            background: linear-gradient(to right, #6366f1, #a855f7) !important;
            color: white !important;
            border-radius: 9999px !important;
            box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
          }
          [data-selected="true"]:hover {
            background: linear-gradient(to right, #4f46e5, #9333ea) !important;
          }
          .rdp-day:not([data-disabled="true"]):not([data-selected="true"]):hover {
            background-color: #e0e7ff;
            border-radius: 9999px;
            transform: scale(1.1);
            transition: all 0.2s ease;
          }
          [data-disabled="true"] {
            color: #d1d5db !important;
            cursor: not-allowed !important;
          }
          .timezone-search-input {
            transition: all 0.3s ease;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.7);
          }
          .timezone-search-input:focus {
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
            border-color: #6366f1;
            background: white;
          }
          .timezone-item:hover {
            background: linear-gradient(to right, #eef2ff, #e0e7ff) !important;
            transform: translateX(2px);
            transition: all 0.2s ease;
          }
          .MuiInputBase-root {
            border-radius: 12px !important;
            background-color: rgba(255, 255, 255, 0.7) !important;
            border: 1px solid #e5e7eb !important;
            padding: 12px 16px !important;
            height: 50px !important;
            font-size: 0.9rem !important;
            color: #1f2937 !important;
            transition: all 0.3s ease !important;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          }
          .MuiInputBase-root:hover {
            background-color: rgba(255, 255, 255, 0.9) !important;
            border-color: #6366f1 !important;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          }
          .MuiInputBase-root.Mui-focused {
            border-color: #6366f1 !important;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2) !important;
          }
          .MuiInputBase-input::placeholder {
            color: #9ca3af !important;
            opacity: 1 !important;
          }
          .MuiInputLabel-root {
            display: none !important;
          }
          .MuiPickersPopper-root {
            background: rgba(255, 255, 255, 0.95) !important;
            backdrop-filter: blur(12px) !important;
            border-radius: 16px !important;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
          }
          .MuiPickersLayout-contentWrapper {
            background: transparent !important;
          }
          .MuiPickersPopper-root .MuiTimeClock-root,
          .MuiPickersPopper-root .MuiClock-root,
          .MuiPickersPopper-root .MuiClock-hours,
          .MuiPickersPopper-root .MuiClock-minutes,
          .MuiPickersPopper-root [role="listbox"],
          .MuiPickersPopper-root .MuiMenu-root,
          .MuiPickersPopper-root .MuiMenu-list,
          .MuiPickersPopper-root [class*="MuiClock"],
          .MuiPickersPopper-root [style*="overflow"] {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
            overflow-y: auto !important;
          }
          .MuiPickersPopper-root .MuiTimeClock-root::-webkit-scrollbar,
          .MuiPickersPopper-root .MuiClock-root::-webkit-scrollbar,
          .MuiPickersPopper-root .MuiClock-hours::-webkit-scrollbar,
          .MuiPickersPopper-root .MuiClock-minutes::-webkit-scrollbar,
          .MuiPickersPopper-root [role="listbox"]::-webkit-scrollbar,
          .MuiPickersPopper-root .MuiMenu-root::-webkit-scrollbar,
          .MuiPickersPopper-root .MuiMenu-list::-webkit-scrollbar,
          .MuiPickersPopper-root [class*="MuiClock"]::-webkit-scrollbar,
          .MuiPickersPopper-root [style*="overflow"]::-webkit-scrollbar {
            display: none !important;
          }
          .MuiClockPointer-root {
            background: linear-gradient(to right, #6366f1, #a855f7) !important;
          }
          .MuiClock-pin,
          .MuiClockPointer-thumb {
            background: #6366f1 !important;
            border-color: #a855f7 !important;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
          .MuiClockNumber-root {
            color: #1f2937 !important;
            font-weight: 600 !important;
          }
          .MuiClockNumber-root.Mui-selected {
            background: linear-gradient(to right, #6366f1, #a855f7) !important;
            color: white !important;
            box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
          }
          .MuiButtonBase-root.MuiPickersDay-root.Mui-selected {
            background: linear-gradient(to right, #6366f1, #a855f7) !important;
            box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
          }
          .MuiTypography-root.MuiPickersToolbarText-root.Mui-selected {
            color: #6366f1 !important;
          }
          .timezone-select-trigger {
            height: 50px !important;
            padding: 12px 16px !important;
            font-size: 0.9rem !important;
            border-radius: 12px !important;
            background-color: rgba(255, 255, 255, 0.7) !important;
            border: 1px solid #e5e7eb !important;
            transition: all 0.3s ease !important;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          }
          .timezone-select-trigger:hover {
            background-color: rgba(255, 255, 255, 0.9) !important;
            border-color: #6366f1 !important;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          }
          .timezone-select-trigger:focus {
            border-color: #6366f1 !important;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2) !important;
          }
          .form-section {
            transition: all 0.3s ease;
          }
          .form-section:hover {
            transform: translateY(-2px);
          }
          .cursor-pointer {
            cursor: pointer;
          }
        `}</style>
        <motion.div 
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <motion.header
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="sticky top-0 z-20 bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-6 mb-8 flex justify-between items-center"
          >
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              Schedule: {batch.name}
            </h1>
            <motion.div 
              className="flex gap-4"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Button
                variant="outline"
                onClick={() => router.push("/teacher/courses?tab=batch")}
                className="border-indigo-300 text-indigo-700 hover:bg-indigo-100 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all duration-300 hover:shadow-md cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl px-6 py-2.5 text-sm font-semibold transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? (
                  <motion.div className="flex items-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 mr-2 border-2 border-t-white border-gray-200 rounded-full"
                    />
                    Saving...
                  </motion.div>
                ) : (
                  <motion.div className="flex items-center">
                    <FaCalendarCheck className="w-4 h-4 mr-2" />
                    Save Schedule
                  </motion.div>
                )}
              </Button>
            </motion.div>
          </motion.header>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-10"
          >
            <form onSubmit={handleSubmit} className="space-y-10">
              <motion.div className="form-section">
                <Label
                  htmlFor="classType"
                  className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-2"
                >
                  Meeting Name (Optional)
                  <Tooltip>
                    <TooltipTrigger>
                      <FaInfoCircle className="text-gray-400 cursor-pointer hover:text-indigo-500 transition-colors duration-200" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Custom name for the meeting (defaults to course title)
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <motion.div
                  whileFocus={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                  className="relative"
                >
                  <Input
                    id="classType"
                    name="classType"
                    value={formData.classType}
                    onChange={handleInputChange}
                    placeholder="Enter meeting name"
                    className="p-3 w-full border border-gray-200 rounded-xl bg-white/90 focus:ring-2 focus:ring-indigo-500 transition-all duration-300 shadow-sm hover:shadow-md"
                  />
                  <AnimatePresence>
                    {formErrors.classType && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-red-500 text-xs mt-1.5"
                      >
                        {formErrors.classType}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
              <motion.div className="form-section">
                <Label
                  htmlFor="courseTitle"
                  className="text-sm font-semibold text-gray-800 mb-2"
                >
                  Course Name
                </Label>
                <Input
                  id="courseTitle"
                  value={batch.courseTitle || "N/A"}
                  disabled
                  className="p-3 w-full border border-gray-200 rounded-xl bg-gray-100/50 cursor-not-allowed text-gray-600 shadow-sm"
                />
              </motion.div>
              <motion.div className="form-section">
                <Label
                  htmlFor="meetingType"
                  className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-2"
                >
                  Meeting Type
                  <Tooltip>
                    <TooltipTrigger>
                      <FaInfoCircle className="text-gray-400 cursor-pointer hover:text-indigo-500 transition-colors duration-200" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Choose between Zoom or external meeting platforms
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                  <Select
                    name="meetingType"
                    value={formData.meetingType}
                    onValueChange={handleSelectChange("meetingType")}
                  >
                    <SelectTrigger className="p-3 w-full border border-gray-200 rounded-xl bg-white/90 focus:ring-2 focus:ring-indigo-500 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer">
                      <SelectValue placeholder="Select meeting type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 backdrop-blur-lg rounded-xl shadow-xl border border-gray-100 cursor-pointer">
                      <motion.div whileHover={{ backgroundColor: '#eef2ff' }}>
                        <SelectItem
                          value="zoom"
                          className="hover:bg-indigo-50 transition-colors cursor-pointer py-3 px-4"
                        >
                          Zoom Meeting
                        </SelectItem>
                      </motion.div>
                      <motion.div whileHover={{ backgroundColor: '#eef2ff' }}>
                        <SelectItem
                          value="external"
                          className="hover:bg-indigo-50 transition-colors cursor-pointer py-3 px-4"
                        >
                          External Meetings (Google Meet, Zoho, etc.)
                        </SelectItem>
                      </motion.div>
                    </SelectContent>
                  </Select>
                </motion.div>
              </motion.div>
              <AnimatePresence>
                {formData.meetingType === "zoom" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="form-section"
                  >
                    <Label
                      htmlFor="zoomLink"
                      className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-2"
                    >
                      Zoom Meeting Link
                      <Tooltip>
                        <TooltipTrigger>
                          <FaInfoCircle className="text-gray-400 cursor-pointer hover:text-indigo-500 transition-colors duration-200" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Paste the Zoom meeting link created from the Zoom website
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <motion.div
                      whileFocus={{ scale: 1.01 }}
                      transition={{ duration: 0.2 }}
                      className="relative"
                    >
                      <Input
                        id="zoomLink"
                        name="zoomLink"
                        value={formData.zoomLink}
                        onChange={handleInputChange}
                        placeholder="🔗 Paste Zoom meeting link"
                        className="p-3 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white/90 transition-all duration-300 shadow-sm hover:shadow-md"
                      />
                      <AnimatePresence>
                        {formErrors.zoomLink && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-red-500 text-xs mt-1.5"
                          >
                            {formErrors.zoomLink}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-3"
                    >
                      <Link
                        href="#"
                        onClick={handleZoomLinkClick}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1.5 transition-colors duration-200 cursor-pointer"
                      >
                        <FaCalendarCheck className="w-4 h-4" />
                        Create a Zoom Meeting
                      </Link>
                    </motion.div>
                  </motion.div>
                )}
                {formData.meetingType === "external" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="form-section"
                  >
                    <Label
                      htmlFor="meetingLink"
                      className="text-sm font-semibold text-gray-800 mb-2"
                    >
                      External Meeting Link
                    </Label>
                    <motion.div
                      whileFocus={{ scale: 1.01 }}
                      transition={{ duration: 0.2 }}
                      className="relative"
                    >
                      <Input
                        id="meetingLink"
                        name="meetingLink"
                        value={formData.meetingLink}
                        onChange={handleInputChange}
                        placeholder="🔗 Paste external meeting link"
                        className="p-3 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white/90 transition-all duration-300 shadow-sm hover:shadow-md"
                      />
                      <AnimatePresence>
                        {formErrors.meetingLink && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-red-500 text-xs mt-1.5"
                          >
                            {formErrors.meetingLink}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.div className="form-section">
                <Label
                  htmlFor="startDate"
                  className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-2"
                >
                  Start Date
                  <Tooltip>
                    <TooltipTrigger>
                      <FaInfoCircle className="text-gray-400 cursor-pointer hover:text-indigo-500 transition-colors duration-200" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Choose the start date for the schedule
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                  className="relative"
                >
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal p-3 h-12 border border-gray-200 rounded-xl bg-white/90 cursor-pointer",
                          "hover:bg-white/95 focus:ring-2 focus:ring-indigo-500 transition-all duration-300 shadow-sm hover:shadow-md",
                          !formData.startDate && "text-gray-500"
                        )}
                      >
                        <FaCalendarCheck className="mr-2 h-4 w-4 text-indigo-600" />
                        {formData.startDate
                          ? moment(formData.startDate).format("MMMM D, YYYY")
                          : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="calendar-container"
                      >
                        <CalendarComponent
                          mode="single"
                          selected={selectedDate}
                          onSelect={handleDateChange}
                          disabled={(date) =>
                            moment(date).isBefore(moment(), "day")
                          }
                          initialFocus
                          className="rounded-xl"
                          components={{
                            DayContent: ({ date }) => (
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                className={cn(
                                  "p-2 text-center cursor-pointer",
                                  selectedDate &&
                                    format(selectedDate, "yyyy-MM-dd") ===
                                      format(date, "yyyy-MM-dd")
                                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full"
                                    : "hover:bg-indigo-100"
                                )}
                              >
                                {date.getDate()}
                              </motion.div>
                            ),
                          }}
                        />
                      </motion.div>
                    </PopoverContent>
                  </Popover>
                  <AnimatePresence>
                    {formErrors.startDate && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-red-500 text-xs mt-1.5"
                      >
                        {formErrors.startDate}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
              <motion.div className="form-section">
                <Label
                  htmlFor="timezone"
                  className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-2"
                >
                  Timezone
                  <Tooltip>
                    <TooltipTrigger>
                      <FaInfoCircle className="text-gray-400 cursor-pointer hover:text-indigo-500 transition-colors duration-200" />
                    </TooltipTrigger>
                    <TooltipContent className="ml-8">
                      Select your timezone for accurate scheduling
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                  <Select
                    name="timezone"
                    value={formData.timezone}
                    onValueChange={handleSelectChange("timezone")}
                    onOpenChange={(open) => {
                      if (open) {
                        handleSelectOpen();
                      }
                    }}
                  >
                    <SelectTrigger className="timezone-select-trigger w-full focus:ring-2 focus:ring-indigo-500 transition-all duration-300 cursor-pointer">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 backdrop-blur-lg rounded-xl shadow-xl max-h-60 no-scrollbar border border-gray-100 cursor-pointer">
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="sticky top-0 bg-white/95 z-10 p-3 border-b border-gray-200"
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <Input
                            id="timezone-search-input"
                            type="text"
                            placeholder="Search timezones..."
                            className="w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 bg-white/90 transition-all duration-200 shadow-sm"
                            value={timezoneSearch}
                            onChange={handleTimezoneSearch}
                            onMouseDown={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === "Escape") {
                                handleClearSearch();
                              } else if (e.key === "Enter") {
                                e.preventDefault();
                                if (filteredTimezones.length > 0) {
                                  handleSelectChange("timezone")(filteredTimezones[0]);
                                }
                              }
                            }}
                            autoFocus
                          />
                          {timezoneSearch && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute right-2 top-1/2 -translate-y-1/2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClearSearch();
                                setTimeout(() => {
                                  document.getElementById("timezone-search-input")?.focus();
                                }, 0);
                              }}
                            >
                              <X className="w-4 h-4 text-gray-500" />
                            </Button>
                          )}
                        </div>
                      </motion.div>
                      <div className="max-h-60 overflow-y-auto no-scrollbar">
                        {filteredTimezones.length > 0 ? (
                          filteredTimezones.map((tz) => (
                            <motion.div
                              key={tz}
                              whileHover={{ backgroundColor: '#eef2ff', x: 2 }}
                              transition={{ duration: 0.2 }}
                            >
                              <SelectItem
                                value={tz}
                                className="hover:bg-indigo-50 transition-colors duration-200 cursor-pointer py-3 px-4 timezone-item"
                              >
                                <div className="flex items-center justify-between">
                                  <span>{tz}</span>
                                  <span className="text-xs text-gray-500">
                                    {moment().tz(tz).format("Z")}
                                  </span>
                                </div>
                              </SelectItem>
                            </motion.div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            No timezones found
                          </div>
                        )}
                      </div>
                    </SelectContent>
                  </Select>
                  <AnimatePresence>
                    {formErrors.timezone && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-red-500 text-xs mt-1.5"
                      >
                        {formErrors.timezone}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
              <motion.div className="form-section flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <Label
                    htmlFor="startTime"
                    className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-2"
                  >
                    Start Time
                    <Tooltip>
                      <TooltipTrigger>
                        <FaInfoCircle className="text-gray-400 cursor-pointer hover:text-indigo-500 transition-colors duration-200" />
                      </TooltipTrigger>
                      <TooltipContent className="ml-5">
                        Choose the start time for the meeting
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    transition={{ duration: 0.2 }}
                  >
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <TimePicker
                        value={formData.startTime ? dayjs(formData.startTime, "HH:mm") : null}
                        onChange={handleTimeChange}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            variant: "outlined",
                            placeholder: "Select start time",
                            InputProps: {
                              style: {
                                borderRadius: "12px",
                                backgroundColor: "rgba(255, 255, 255, 0.7)",
                                border: "1px solid #e5e7eb",
                                padding: "10px 16px",
                                height: "50px",
                                fontSize: "0.9rem",
                              },
                            },
                            sx: {
                              "& .MuiInputBase-root": {
                                height: "50px",
                              },
                            },
                          },
                          popper: {
                            sx: {
                              "& .MuiPaper-root": {
                                background: "rgba(255, 255, 255, 0.95)",
                                backdropFilter: "blur(12px)",
                                borderRadius: "16px",
                                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
                              },
                            },
                          },
                        }}
                      />
                    </LocalizationProvider>
                    <AnimatePresence>
                      {formErrors.startTime && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-red-500 text-xs mt-1.5"
                        >
                          {formErrors.startTime}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>
                <div className="flex-1">
                  <Label
                    htmlFor="callDuration"
                    className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-2"
                  >
                    Call Duration
                    <Tooltip>
                      <TooltipTrigger>
                        <FaInfoCircle className="text-gray-400 cursor-pointer hover:text-indigo-500 transition-colors duration-200" />
                      </TooltipTrigger>
                      <TooltipContent className="ml-5">
                        Select the duration of the meeting
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <CustomDurationPicker
                    value={{
                      hours: Math.floor(formData.callDuration / 60),
                      minutes: formData.callDuration % 60,
                    }}
                    onChange={handleDurationChange}
                    maxHours={5}
                  />
                  <AnimatePresence>
                    {formErrors.callDuration && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-red-500 text-xs mt-1.5"
                      >
                        {formErrors.callDuration}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
              <motion.div className="form-section">
                <Label
                  htmlFor="days"
                  className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-2"
                >
                  Days
                  <Tooltip>
                    <TooltipTrigger>
                      <FaInfoCircle className="text-gray-400 cursor-pointer hover:text-indigo-500 transition-colors duration-200" />
                    </TooltipTrigger>
                    <TooltipContent className="ml-5">
                      Select the days for the schedule
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <div className="flex flex-wrap gap-3 mt-3">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "p-3 rounded-xl border cursor-pointer transition-all duration-300 text-center text-sm font-medium",
                      formData.days.length === daysOfWeek.length
                        ? "bg-green-100 border-green-500 text-green-700"
                        : "bg-white/90 border-gray-200 text-gray-700 hover:bg-gray-100 hover:shadow-sm"
                    )}
                    onClick={handleSelectAllDays}
                  >
                    Select All
                  </motion.div>
                  {daysOfWeek.map((day) => (
                    <motion.div
                      key={day}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "p-3 rounded-xl border cursor-pointer transition-all duration-300 px-4 text-sm font-medium",
                        formData.days.includes(day)
                          ? "bg-blue-100 border-blue-500 text-blue-700"
                          : "bg-white/90 border-gray-200 text-gray-700 hover:bg-gray-100 hover:shadow-sm"
                      )}
                      onClick={() => handleDayChange(day)}
                    >
                      {day.slice(0, 3).toUpperCase()}
                    </motion.div>
                  ))}
                </div>
                <AnimatePresence>
                  {formErrors.days && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-red-500 text-xs mt-2"
                    >
                      {formErrors.days}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
              <motion.div className="form-section flex items-center justify-between">
                <Label
                  htmlFor="repeat"
                  className="text-sm font-semibold text-gray-800 flex items-center gap-2"
                >
                  Repeat for Entire Course
                  <Tooltip>
                    <TooltipTrigger>
                      <FaInfoCircle className="text-gray-400 cursor-pointer hover:text-indigo-500 transition-colors duration-200" />
                    </TooltipTrigger>
                    <TooltipContent className="ml-5">
                      Apply this schedule to all lessons in the course
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.2 }}
                  className="cursor-pointer"
                >
                  <div
                    className={cn(
                      "custom-toggle",
                      formData.repeat && "checked"
                    )}
                    onClick={() => handleSwitchChange(formData.repeat ? 0 : 1)}
                  >
                    <span className="handle">{formData.repeat ? "ON" : "OFF"}</span>
                  </div>
                </motion.div>
              </motion.div>
              {(scheduleDuration || callDurationResponse) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="bg-green-50 p-5 rounded-2xl border border-green-200 text-green-700 text-sm shadow-sm"
                >
                  {scheduleDuration && (
                    <p>Schedule Duration: {scheduleDuration} days</p>
                  )}
                  {callDurationResponse && (
  <p>Call Duration: {callDurationResponse}</p>
)}
                </motion.div>
              )}
            </form>
          </motion.div>
        </motion.div>
      </div>
    </TooltipProvider>
  );
}