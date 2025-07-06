"use client";

import type React from "react";
import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CalendarIcon,
  Clock,
  FileText,
  X,
  Trash2,
  Calendar,
  Edit,
  Copy,
  Download,
  User,
  ChevronUp,
  ChevronDown,
  Sparkles,
  BookOpen,
  Video,
  GraduationCap,
  CheckCircle,
  Plus,
  Search,
  Upload,
  Mail,
  NotebookTabs,
  Timer,
  CalendarCheck,
  Globe,
} from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  VerticalTimeline,
  VerticalTimelineElement,
} from "react-vertical-timeline-component";
import "react-vertical-timeline-component/style.min.css";
import moment from "moment-timezone";
import { useAuth } from "@/lib/auth";
import type {
  TeacherDemoScheduleCallState,
  TeacherDemoScheduleCall,
  TimeSlot,
  ApiError,
} from "@/types";
import DocumentPopup from "@/components/DocumentPopup";
import { Input } from "@/components/ui/input";
import { FaCalendarCheck } from "react-icons/fa";
import Link from "next/link";
import Loader from "@/components/Loader";

interface CallLinks {
  zoomLink?: string;
  meetingLink?: string;
  documents?: { url: string; name?: string }[];
}

const toggleBodyScroll = (disable: boolean) => {
  if (disable) {
    document.body.classList.add("overflow-hidden");
  } else {
    document.body.classList.remove("overflow-hidden");
  }
};

const generateTimeSlots = (timezone: string): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const start = moment.tz("2025-01-01 00:00", timezone);
  for (let i = 0; i < 24 * 60; i += 40) {
    const startTime = start.clone().add(i, "minutes");
    const endTime = startTime.clone().add(40, "minutes");
    slots.push({
      startTime: startTime.format("h:mm a"),
      endTime: endTime.format("h:mm a"),
      slot: `${startTime.format("h:mm a")} - ${endTime.format("h:mm a")}`,
      startTime24: startTime.format("HH:mm"),
      endTime24: endTime.format("HH:mm"),
    });
  }
  return slots;
};

const filterTimeSlots = (
  selectedDate: Date | undefined,
  allSlots: TimeSlot[],
  timezone: string
): TimeSlot[] => {
  if (!selectedDate) {
    return allSlots;
  }

  if (!isToday(selectedDate)) {
    return allSlots;
  }

  const now = moment.tz(timezone).add(30, "minutes");
  const currentHour = now.hours();
  const currentMinutes = now.minutes();

  return allSlots.filter((slot) => {
    const [slotHour, slotMinutes] = slot.startTime24.split(":").map(Number);
    return (
      slotHour > currentHour ||
      (slotHour === currentHour && slotMinutes >= currentMinutes)
    );
  });
};

const getTimezones = () => {
  return moment.tz
    .names()
    .filter((tz) => /^[^/]+\/[^/]+$/.test(tz))
    .map((tz) => ({ value: tz.trim(), label: tz.trim() }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

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

const formSchema = z.object({
  classType: z.string().min(1, "Class type is required"),
  date: z.date({ required_error: "A date is required" }),
  startTime: z.string().min(1, "Please select a time slot"),
  timezone: z.string().min(1, "Timezone is required"),
  meetingType: z.enum(["zoom", "external"], {
    required_error: "Meeting type is required",
  }),
  meetingLink: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
  zoomLink: z
    .string()
    .url("Please enter a valid Zoom URL")
    .optional()
    .or(z.literal("")),
  studentEmails: z
    .array(
      z.string().email("Invalid email address").min(1, "Email cannot be empty")
    )
    .min(1, "At least one email is required"),
});

const rescheduleFormSchema = z.object({
  date: z.date({ required_error: "A date is required" }).optional(),
  startTime: z.string().min(1, "Please select a time slot").optional(),
  timezone: z.string().min(1, "Timezone is required").optional(),
});

type FormData = z.infer<typeof formSchema>;
type RescheduleFormData = z.infer<typeof rescheduleFormSchema>;

const allClassTypeOptions = [
  { value: "Phonics", label: "Phonics", icon: BookOpen },
  { value: "Creative Writing", label: "Creative Writing", icon: Edit },
  { value: "Public Speaking", label: "Public Speaking", icon: Video },
];

export function ScheduleCallContent() {
  const { user, loading: authLoading, deviceId } = useAuth();
  const searchParams = useSearchParams();
  const [state, setState] = useState<TeacherDemoScheduleCallState>({
    selectedStudentIds: [],
    selectedCallId: "",
    documents: [],
    students: [],
    scheduledCalls: [],
    loading: true,
    showScheduleForm: searchParams.get("openForm") === "true",
    showRescheduleForm: false,
    formLoading: false,
    isModalScrolling: false,
    isDropdownScrolling: false,
    isClassTypePopoverOpen: false,
    isTimeSlotPopoverOpen: false,
    isDatePickerOpen: false,
    isRescheduleDatePickerOpen: false,
    showCancelConfirm: false,
    cancelCallId: "",
    showScheduledCalls: true,
    openCards: {},
    selectedDocument: null,
    isScrolling: true,
    callView: "upcoming",
  });
  const [timezoneSearch, setTimezoneSearch] = useState("");
  const [currentEmailInput, setCurrentEmailInput] = useState("");
  const router = useRouter();
  const allTimezones = useMemo(() => getTimezones(), []);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      classType: "",
      date: undefined,
      startTime: "",
      timezone: moment.tz.guess(),
      meetingType: "zoom",
      meetingLink: "",
      zoomLink: "",
      studentEmails: [""],
    },
  });

  const rescheduleForm = useForm<RescheduleFormData>({
    resolver: zodResolver(rescheduleFormSchema),
    defaultValues: {
      date: undefined,
      startTime: "",
      timezone: moment.tz.guess(),
    },
  });

  const handleZoomLinkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const zoomAppUrl = "zoommtg://zoom.us";
    const zoomWebUrl = "https://zoom.us/meeting/schedule";

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = zoomAppUrl;
    document.body.appendChild(iframe);

    const timeout = 2000;
    let isIframeRemoved = false; // Track if iframe has been removed

    const removeIframe = () => {
      if (iframe && document.body.contains(iframe) && !isIframeRemoved) {
        try {
          document.body.removeChild(iframe);
          isIframeRemoved = true;
        } catch (error) {
          console.warn("Failed to remove iframe:", error);
        }
      }
    };

    const timer = setTimeout(() => {
      if (!isIframeRemoved) {
        window.open(zoomWebUrl, "_blank", "noopener,noreferrer");
        removeIframe();
      }
    }, timeout);

    const onBlur = () => {
      clearTimeout(timer);
      removeIframe();
      window.removeEventListener("blur", onBlur);
    };

    window.addEventListener("blur", onBlur);

    return () => {
      clearTimeout(timer);
      removeIframe();
      window.removeEventListener("blur", onBlur);
    };
  };

  const handleUnauthorized = useCallback(() => {
    console.debug("[Courses] Handling unauthorized access");
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("deviceId");
    toast.error("Session expired. Please log in again.");
    router.push("/login");
  }, [router]);

  useEffect(() => {
    if (state.showScheduleForm) {
      form.reset({
        classType: "",
        date: undefined,
        startTime: "",
        timezone: moment.tz.guess(),
        meetingType: "zoom",
        meetingLink: "",
        studentEmails: [""],
      });
      setState((prev) => ({
        ...prev,
        documents: [],
        isDatePickerOpen: false,
      }));
      setCurrentEmailInput("");
    }
  }, [state.showScheduleForm, form]);

  const closeModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showScheduleForm: false,
      showRescheduleForm: false,
      selectedStudentIds: [],
      documents: [],
      selectedCallId: "",
      isDatePickerOpen: false,
      isRescheduleDatePickerOpen: false,
      showCancelConfirm: false,
      cancelCallId: "",
      selectedDocument: null,
    }));
    form.reset();
    rescheduleForm.reset();
    setCurrentEmailInput("");
    toggleBodyScroll(false);
  }, [form, rescheduleForm]);

  useEffect(() => {
    if (state.showRescheduleForm && state.selectedCallId) {
      const fetchCallDetails = async () => {
        try {
          const response = await api.get(`/demo-class/${state.selectedCallId}`);
          const call = response.data.demoClass as TeacherDemoScheduleCall;
          const callDate = moment
            .tz(call.date, call.timezone || "UTC")
            .toDate();
          const slot =
            generateTimeSlots(call.timezone || "UTC").find(
              (s) => s.startTime24 === call.startTime
            )?.slot || "";

          rescheduleForm.reset({
            date: callDate,
            startTime: slot,
            timezone: call.timezone || moment.tz.guess(),
          });
          setTimezoneSearch("");
        } catch (error) {
          const apiError = error as ApiError;
          console.error(
            "[ScheduleCall] Failed to fetch call details:",
            apiError
          );
          toast.error(
            apiError.response?.data?.message || "Failed to fetch call details"
          );
          if (apiError.response?.status === 401) {
            handleUnauthorized();
          }
          closeModal();
        }
      };
      fetchCallDetails();
    }
  }, [
    state.showRescheduleForm,
    state.selectedCallId,
    rescheduleForm,
    handleUnauthorized,
    closeModal,
  ]);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "date" || name === "timezone") {
        form.resetField("startTime");
      }
      if (name === "meetingType") {
        form.setValue("meetingLink", "");
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    const subscription = rescheduleForm.watch((value, { name }) => {
      if (name === "date" || name === "timezone") {
        rescheduleForm.resetField("startTime");
      }
    });
    return () => subscription.unsubscribe();
  }, [rescheduleForm]);

  useEffect(() => {
    if (!user || !deviceId) {
      handleUnauthorized();
      return;
    }

    const fetchCalls = async () => {
      setState((prev) => ({ ...prev, loading: true }));
      try {
        const callsResponse = await api.get(
          `/demo-class/list?page=1&limit=100&teacherId=${user._id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Device-Id": localStorage.getItem("deviceId"),
            },
          }
        );
        const calls = Array.isArray(callsResponse.data.demoClasses)
          ? callsResponse.data.demoClasses
          : [];
        setState((prev) => ({
          ...prev,
          scheduledCalls: calls,
          loading: false,
        }));
      } catch (error) {
        const apiError = error as ApiError;
        console.error("[fetchCalls] Error:", apiError);
        toast.error(apiError.response?.data?.message || "Failed to fetch data");
        if (apiError.response?.status === 401) {
          handleUnauthorized();
        }
        setState((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchCalls();

    const interval = setInterval(fetchCalls, 60000);

    return () => clearInterval(interval);
  }, [deviceId, handleUnauthorized, user]);

  useEffect(() => {
    if (
      state.showScheduleForm ||
      state.showRescheduleForm ||
      state.showCancelConfirm ||
      state.selectedDocument
    ) {
      toggleBodyScroll(true);
    } else {
      toggleBodyScroll(false);
    }
    return () => toggleBodyScroll(false);
  }, [
    state.showScheduleForm,
    state.showRescheduleForm,
    state.showCancelConfirm,
    state.selectedDocument,
  ]);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const allowedTypes = [
        "application/pdf",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      const maxFileSize = 500 * 1024 * 1024;
      const maxFiles = 5;

      const newFiles = Array.from(e.target.files).filter((file) => {
        if (!allowedTypes.includes(file.type)) {
          toast.error(
            `File "${file.name}" is not supported. Only PDF, PPT, PPTX, DOC, DOCX allowed.`
          );
          return false;
        }
        if (file.size > maxFileSize) {
          toast.error(
            `File "${file.name}" is too large. Maximum size is 500MB.`
          );
          return false;
        }
        return true;
      });

      if (newFiles.length + state.documents.length > maxFiles) {
        toast.error(`Maximum ${maxFiles} documents allowed.`);
        return;
      }

      setState((prev) => ({
        ...prev,
        documents: [...prev.documents, ...newFiles],
      }));
      e.target.value = "";
    }
  };

  const removeDocument = (index: number) => {
    setState((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index),
    }));
  };

  const getDocumentType = (url: string): string => {
    const extension = url.split(".").pop()?.toLowerCase();
    return extension || "unknown";
  };

  const transformGoogleDriveUrlToDownload = (url: string): string => {
    const fileIdMatch = url.match(/\/d\/(.+?)(\/|$)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
    }
    return url;
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
      return "Invalid Date";
    }
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

  const handleJoinCall = async (callId: string) => {
    if (!user || !deviceId) {
      handleUnauthorized();
      return;
    }
    try {
      const response = await api.get(`/demo-class/${callId}`);
      const { zoomLink, meetingLink } = response.data.demoClass as CallLinks;

      const link = zoomLink || meetingLink;
      if (link) {
        window.open(link, "_blank", "noopener,noreferrer");
      } else {
        toast.error("No meeting link available");
      }
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[ScheduleCall] Failed to join call:", apiError);
      const errorMessage =
        apiError.response?.data?.message || "Failed to join call";
      toast.error(errorMessage);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      }
    }
  };

  const handleCopyLink = async (callId: string) => {
    if (!user || !deviceId) {
      handleUnauthorized();
      return;
    }
    try {
      const response = await api.get(`/demo-class/${callId}`);
      const { zoomLink, meetingLink } = response.data.demoClass as CallLinks;

      const link = zoomLink ?? meetingLink;
      if (link) {
        await navigator.clipboard.writeText(link);
        toast.success("Meeting link copied to clipboard!");
      } else {
        toast.error("No meeting link available");
      }
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[ScheduleCall] Failed to copy meeting link:", apiError);
      const errorMessage =
        apiError.response?.data?.message || "Failed to copy meeting link";
      toast.error(errorMessage);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      }
    }
  };

  const handleViewDocument = async (callId: string, topic: string) => {
    if (!user || !deviceId) {
      handleUnauthorized();
      return;
    }
    try {
      const response = await api.get(`/demo-class/${callId}`);
      const { documents, zoomLink, meetingLink } = response.data
        .demoClass as CallLinks;
      console.log("documents", response.data.demoClass.documents);
      if (documents && documents.length > 0) {
        const document = documents[0];
        setState((prev) => ({
          ...prev,
          selectedDocument: {
            topic,
            documentUrl: document.url,
            documentType: getDocumentType(document.url),
            zoomLink: zoomLink || meetingLink,
          },
        }));
      } else {
        toast.error("No documents available for this call");
      }
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[ScheduleCall] Failed to fetch document:", apiError);
      const errorMessage =
        apiError.response?.data?.message || "Failed to fetch document";
      toast.error(errorMessage);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      }
    }
  };

  const handleDownloadDocument = async (callId: string) => {
    if (!user || !deviceId) {
      handleUnauthorized();
      return;
    }
    try {
      const response = await api.get(`/demo-class/${callId}`);
      const { documents } = response.data.demoClass as CallLinks;
      if (documents && documents.length > 0) {
        const doc = documents[0];
        let downloadUrl = doc.url;
        if (doc.url.includes("drive.google.com")) {
          downloadUrl = transformGoogleDriveUrlToDownload(doc.url);
        } else {
          downloadUrl = `/api/documents/proxy?url=${encodeURIComponent(
            doc.url
          )}`;
        }
        const link = globalThis.document.createElement("a");
        link.href = downloadUrl;
        link.download = doc.name || "document.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Document download initiated!");
      } else {
        toast.error("No documents available for this call");
      }
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[ScheduleCall] Failed to download document:", apiError);
      const errorMessage =
        apiError.response?.data?.message || "Failed to download document";
      toast.error(errorMessage);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      }
    }
  };

  const removeEmailField = (index: number) => {
    const currentEmails = form.getValues("studentEmails");
    const updatedEmails = currentEmails.filter((_, i) => i !== index);
    form.setValue("studentEmails", updatedEmails);
  };

  const handleAddEmail = () => {
    if (
      currentEmailInput.trim() &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentEmailInput.trim())
    ) {
      const currentEmails = form.getValues("studentEmails");
      const emailToAdd = currentEmailInput.trim();

      // Check if email already exists
      if (!currentEmails.includes(emailToAdd)) {
        // Remove any empty strings and add the new email
        const filteredEmails = currentEmails.filter(
          (email) => email.trim() !== ""
        );
        form.setValue("studentEmails", [...filteredEmails, emailToAdd]);
        setCurrentEmailInput("");
        form.clearErrors("studentEmails");
      } else {
        toast.error("Email already added");
      }
    }
  };

  const handleEmailInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const onSubmit = async (data: FormData) => {
    setState((prev) => ({ ...prev, formLoading: true }));

    if (!user || !user._id) {
      toast.error("User not authenticated");
      setState((prev) => ({ ...prev, formLoading: false }));
      handleUnauthorized();
      return;
    }

    const selectedSlot = generateTimeSlots(data.timezone).find(
      (slot) => slot.slot === data.startTime
    );
    if (!selectedSlot) {
      toast.error("Selected time slot not found");
      setState((prev) => ({ ...prev, formLoading: false }));
      return;
    }

    const formattedStartTime = selectedSlot.startTime24;
    const formattedEndTime = selectedSlot.endTime24;

    try {
      const startMoment = moment.tz(formattedStartTime, "HH:mm", data.timezone);
      const endMoment = moment.tz(formattedEndTime, "HH:mm", data.timezone);
      if (!startMoment.isValid() || !endMoment.isValid()) {
        throw new Error("Invalid time format");
      }
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(
        apiError?.message ||
          "Invalid time format. Please select a valid time slot."
      );
      setState((prev) => ({ ...prev, formLoading: false }));
      return;
    }

    const formData = new FormData();
    formData.append("assignedTeacherId", user._id);
    data.studentEmails.forEach((email) =>
      formData.append("studentEmails[]", email)
    );
    formData.append("classType", data.classType);
    formData.append("meetingType", data.meetingType);
    if (data.meetingType === "external" && data.meetingLink) {
      formData.append("meetingLink", data.meetingLink);
    }
    if (data.meetingType === "zoom" && data.zoomLink) {
      formData.append("zoomLink", data.zoomLink);
    }
    formData.append("date", format(data.date, "yyyy-MM-dd"));
    formData.append("startTime", formattedStartTime);
    formData.append("endTime", formattedEndTime);
    formData.append("timezone", data.timezone);

    if (state.documents.length > 0) {
      state.documents.forEach((file) => {
        formData.append("documents", file);
      });
    } else {
      formData.append("documents", JSON.stringify([]));
    }

    try {
      const response = await api.post("/demo-class/create", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Device-Id": localStorage.getItem("deviceId"),
        },
      });

      // Assume the API returns the created call in response.data.demoClass
      const newCall: TeacherDemoScheduleCall = response.data.demoClass;

      toast.success("Class scheduled successfully");

      setState((prev) => ({
        ...prev,
        scheduledCalls: [...prev.scheduledCalls, newCall], // Append the new call
        documents: [],
        showScheduleForm: false,
        formLoading: false,
        showScheduledCalls: true,
      }));
      form.reset();
      setCurrentEmailInput("");
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[ScheduleCall] Failed to schedule class:", apiError);
      const errorMessage =
        apiError.response?.data?.message || "Failed to schedule class";
      toast.error(errorMessage);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      }
      setState((prev) => ({ ...prev, formLoading: false }));
    }
  };

  const onRescheduleSubmit = async (data: RescheduleFormData) => {
    if (!user || !deviceId) {
      handleUnauthorized();
      return;
    }
    setState((prev) => ({ ...prev, formLoading: true }));

    const payload: {
      date: string;
      startTime: string;
      endTime: string;
      timezone: string;
    } = {
      date: data.date ? format(data.date, "yyyy-MM-dd") : "",
      startTime: "",
      endTime: "",
      timezone: data.timezone || moment.tz.guess(),
    };

    const selectedSlot = generateTimeSlots(
      data.timezone || moment.tz.guess()
    ).find((slot) => slot.slot === data.startTime);
    if (!selectedSlot) {
      toast.error("Selected time slot not found");
      setState((prev) => ({ ...prev, formLoading: false }));
      return;
    }
    payload.startTime = selectedSlot.startTime24;
    payload.endTime = selectedSlot.endTime24;

    try {
      const startMoment = moment.tz(
        payload.startTime,
        "HH:mm",
        data.timezone || moment.tz.guess()
      );
      const endMoment = moment.tz(
        payload.endTime,
        "HH:mm",
        data.timezone || moment.tz.guess()
      );
      if (!startMoment.isValid() || !endMoment.isValid()) {
        throw new Error("Invalid time format");
      }
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(
        apiError?.message ||
          "Invalid time format. Please select a valid time slot."
      );
      setState((prev) => ({ ...prev, formLoading: false }));
      return;
    }

    try {
      const response = await api.put(
        `/demo-class/reschedule/${state.selectedCallId}`,
        payload
      );

      // Assume the API returns the updated call in response.data.demoClass
      const updatedCall: TeacherDemoScheduleCall = {
        ...response.data.demoClass,
        status: "Rescheduled", // Update status to Rescheduled
      };

      toast.success("Class rescheduled successfully");

      setState((prev) => ({
        ...prev,
        scheduledCalls: prev.scheduledCalls.map((call) =>
          call._id === state.selectedCallId ? updatedCall : call
        ), // Update the specific call
        selectedCallId: "",
        showRescheduleForm: false,
        formLoading: false,
      }));
      rescheduleForm.reset();
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[ScheduleCall] Failed to reschedule class:", apiError);
      const errorMessage =
        apiError.response?.data?.message || "Failed to reschedule class";
      toast.error(errorMessage);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      }
      setState((prev) => ({ ...prev, formLoading: false }));
    }
  };

  const handleCancelCall = async (callId: string) => {
    if (!user || !deviceId) {
      handleUnauthorized();
      return;
    }
    try {
      await api.post(`/demo-class/cancel/${callId}`);

      toast.success("Class cancelled successfully");

      setState((prev) => ({
        ...prev,
        scheduledCalls: prev.scheduledCalls.map((call) =>
          call._id === callId ? { ...call, status: "Cancelled" } : call
        ), // Update the specific call's status
        showCancelConfirm: false,
        cancelCallId: "",
      }));
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[ScheduleCall] Failed to cancel class:", apiError);
      const errorMessage =
        apiError.response?.data?.message || "Failed to cancel class";
      toast.error(errorMessage);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      }
      setState((prev) => ({
        ...prev,
        showCancelConfirm: false,
        cancelCallId: "",
      }));
    }
  };

  const getStatusText = (call: TeacherDemoScheduleCall): string => {
    return call.status;
  };

  const getStatusClass = (call: TeacherDemoScheduleCall): string => {
    switch (call.status) {
      case "Completed":
        return "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg";
      case "Cancelled":
        return "bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg";
      case "Rescheduled":
        return "bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-lg";
      case "Scheduled":
      default:
        return "bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg";
    }
  };

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

  const getHeaderGradient = (callView: string) => {
    switch (callView) {
      case "today":
        return "bg-gradient-to-br from-orange-400 to-orange-500";
      case "week":
        return "bg-gradient-to-br from-indigo-400 to-indigo-500";
      case "completed":
        return "bg-gradient-to-br from-emerald-500 to-green-500";
      case "cancelled":
        return "bg-gradient-to-br from-red-500 to-pink-500";
      case "upcoming":
      default:
        return "bg-gradient-to-b from-blue-500 to-blue-700";
    }
  };

  const getTextGradient = (callView: string) => {
    switch (callView) {
      case "today":
        return "bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600";
      case "week":
        return "bg-gradient-to-r from-indigo-400 via-indigo-500 to-indigo-600";
      case "completed":
        return "bg-gradient-to-r from-emerald-500 via-green-500 to-green-600";
      case "cancelled":
        return "bg-gradient-to-r from-red-500 via-pink-500 to-pink-600";
      case "upcoming":
      default:
        return "bg-gradient-to-b from-blue-500 to-blue-700";
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role?.roleName !== "Teacher") {
      console.debug(
        "[ScheduleCall] Redirecting due to invalid role or no user",
        {
          user: !!user,
          role: user?.role?.roleName,
          authLoading,
        }
      );
      handleUnauthorized();
    }
  }, [user, authLoading, handleUnauthorized]);

  const availableClassTypeOptions = user
    ? allClassTypeOptions.filter((option) =>
        user.subjects.includes(option.value)
      )
    : [];

  const sortedCalls = [...state.scheduledCalls].sort((a, b) => {
    const dateA = moment
      .tz(`${a.date} ${a.startTime}`, "YYYY-MM-DD h:mm a", a.timezone || "UTC")
      .valueOf();
    const dateB = moment
      .tz(`${b.date} ${b.startTime}`, "YYYY-MM-DD h:mm a", b.timezone || "UTC")
      .valueOf();
    return dateA - dateB; // Sort in ascending order (earliest first)
  }) as TeacherDemoScheduleCall[];

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

  const completedCalls = sortedCalls.filter(
    (call) => call.status === "Completed"
  );
  const cancelledCalls = sortedCalls.filter(
    (call) => call.status === "Cancelled"
  );

  const upcomingCalls = sortedCalls
    .filter((call) => {
      const callDate = moment.tz(call.date, call.timezone || "UTC");
      const today = moment.tz(call.timezone || "UTC").startOf("day");
      return (
        (call.status === "Scheduled" || call.status === "Rescheduled") &&
        callDate.isSameOrAfter(today, "day") // Include calls on or after today
      );
    })
    .slice(0, 2); // Limit to 2 nearest calls

  const displayCalls =
    state.callView === "upcoming"
      ? upcomingCalls
      : state.callView === "today"
      ? todayCalls
      : state.callView === "week"
      ? weekCalls
      : state.callView === "completed"
      ? completedCalls
      : state.callView === "cancelled"
      ? cancelledCalls
      : sortedCalls;

  const filteredTimezones = useMemo(() => {
    return allTimezones.filter((tz) =>
      tz.label.toLowerCase().includes(timezoneSearch.toLowerCase())
    );
  }, [allTimezones, timezoneSearch]);

  return (
    <>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-200/20 to-pink-200/20 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 20,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
          <motion.div
            className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-200/20 to-indigo-200/20 rounded-full blur-3xl"
            animate={{
              scale: [1.2, 1, 1.2],
              rotate: [360, 180, 0],
            }}
            transition={{
              duration: 25,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        </div>

        <div className="content-container min-h-screen p-6 md:p-8 flex items-center justify-center transition-all duration-300 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-7xl mt-10"
          >
            {/* Enhanced Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-center mb-12"
            >
              <div className="flex items-center justify-center gap-3 mb-4">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{
                    duration: 3,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                  className={`p-3 ${getHeaderGradient(
                    state.callView
                  )} rounded-2xl shadow-lg`}
                >
                  <GraduationCap className="w-8 h-8 text-white" />
                </motion.div>
                <h1
                  className={`text-5xl md:text-6xl font-extrabold bg-clip-text text-transparent ${getTextGradient(
                    state.callView
                  )}`}
                >
                  {" "}
                  Schedule Class
                </h1>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                >
                  <Sparkles
                    className={`w-8 h-8 ${
                      state.callView === "today"
                        ? "text-orange-500"
                        : state.callView === "week"
                        ? "text-indigo-500"
                        : state.callView === "completed"
                        ? "text-green-500"
                        : state.callView === "cancelled"
                        ? "text-pink-500"
                        : "text-blue-500"
                    }`}
                  />{" "}
                </motion.div>
              </div>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Create engaging learning experiences with our advanced
                scheduling system
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-8 flex items-center justify-center"
            >
              <div
                className={`bg-white/80 backdrop-blur-lg rounded-2xl p-2 shadow-xl border border-white/20`}
              >
                <Button
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      showScheduleForm: true,
                    }))
                  }
                  className={`${getHeaderGradient(
                    state.callView
                  )} hover:${getHeaderGradient(state.callView).replace(
                    "bg-gradient-to-br",
                    "bg-gradient-to-br hover:from-blue-600 hover:to-blue-700"
                  )} text-white rounded-xl px-8 py-3 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300`}
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Schedule Class
                </Button>
              </div>
            </motion.div>

            <AnimatePresence>
              {state.showScheduledCalls && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col lg:flex-row gap-8 w-full"
                >
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="lg:w-1/4"
                  >
                    <Card className="bg-white/90 backdrop-blur-xl border-0 shadow-2xl rounded-3xl overflow-hidden sticky top-8">
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 to-purple-50/30" />
                      <CardHeader
                        className={`relative z-10 ${getHeaderGradient(
                          state.callView
                        )} text-white p-4`}
                      >
                        <CardTitle className="text-xl font-bold text-center">
                          Filter Classes
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="relative z-10 p-8 space-y-4 flex flex-col items-center">
                        {[
                          {
                            key: "upcoming",
                            label: "Upcoming Classes",
                            icon: Clock,
                            color: "bg-gradient-to-r from-blue-500 to-blue-700",
                            activeColor: getHeaderGradient("upcoming"),
                          },
                          {
                            key: "today",
                            label: "Today's Classes",
                            icon: BookOpen,
                            color:
                              "bg-gradient-to-r from-orange-400 to-orange-500",
                            activeColor: getHeaderGradient("today"),
                          },
                          {
                            key: "week",
                            label: "Weekly Classes",
                            icon: GraduationCap,
                            color:
                              "bg-gradient-to-r from-indigo-400 to-indigo-500",
                            activeColor: getHeaderGradient("week"),
                          },
                          {
                            key: "completed",
                            label: "Completed Classes",
                            icon: CheckCircle,
                            color:
                              "bg-gradient-to-r from-emerald-500 to-green-500",
                            activeColor: getHeaderGradient("completed"),
                          },
                          {
                            key: "cancelled",
                            label: "Cancelled Classes",
                            icon: X,
                            color: "bg-gradient-to-r from-red-500 to-pink-500",
                            activeColor: getHeaderGradient("cancelled"),
                          },
                        ].map((filter, index) => {
                          const IconComponent = filter.icon;
                          const isActive = state.callView === filter.key;
                          const classCount = {
                            upcoming: upcomingCalls.length,
                            today: todayCalls.length,
                            week: weekCalls.length,
                            completed: completedCalls.length,
                            cancelled: cancelledCalls.length,
                          }[filter.key];

                          return (
                            <motion.div
                              key={filter.key}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.4, delay: index * 0.1 }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="w-full flex justify-center" // Ensure motion.div centers its content
                            >
                              <Button
                                variant="ghost"
                                className={`w-max h-12 rounded-xl font-semibold transition-all duration-300 group ${
                                  isActive
                                    ? `${filter.activeColor} text-white shadow-lg ring-2 ring-white/30`
                                    : "text-slate-700 hover:bg-gradient-to-r hover:from-slate-50/80 hover:to-blue-50/80 hover:shadow-md"
                                }`}
                                onClick={() =>
                                  setState((prev) => ({
                                    ...prev,
                                    callView: filter.key as
                                      | "upcoming"
                                      | "today"
                                      | "week"
                                      | "completed"
                                      | "cancelled",
                                  }))
                                }
                              >
                                <div className="flex items-center">
                                  <div
                                    className={`p-2 rounded-lg mr-3 transition-all duration-300 ${
                                      isActive
                                        ? "bg-white/20"
                                        : "bg-slate-50 group-hover:bg-blue-50"
                                    }`}
                                  >
                                    <IconComponent
                                      className={`w-4 h-4 ${
                                        isActive
                                          ? "text-white"
                                          : "text-slate-600"
                                      }`}
                                    />
                                  </div>
                                  <span className="text-sm">
                                    {filter.label}
                                  </span>
                                </div>
                                <Badge
                                  variant="secondary"
                                  className={`${
                                    isActive
                                      ? "bg-white/20 text-white border-white/30"
                                      : "bg-gradient-to-r from-slate-50 to-blue-50 text-slate-600"
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

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="lg:w-3/4"
                  >
                    <Card className="bg-white/90 backdrop-blur-xl border-0 shadow-2xl rounded-3xl overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-purple-50/20" />
                      <CardHeader
                        className={`relative z-10 ${
                          state.callView === "upcoming"
                            ? "bg-gradient-to-r from-blue-500 to-blue-700"
                            : state.callView === "today"
                            ? "bg-gradient-to-r from-orange-400 to-orange-500"
                            : state.callView === "week"
                            ? "bg-gradient-to-r from-indigo-400 to-indigo-500"
                            : state.callView === "completed"
                            ? "bg-gradient-to-r from-emerald-500 to-green-500"
                            : "bg-gradient-to-r from-red-500 to-pink-500"
                        } text-white p-4`}
                      >
                        <CardTitle className="text-2xl font-bold flex items-center justify-between">
                          <div className="flex items-center">
                            <CalendarIcon className="w-7 h-7 mr-3" />
                            {state.callView === "upcoming"
                              ? "Upcoming Classes"
                              : state.callView === "today"
                              ? "Today's Classes"
                              : state.callView === "week"
                              ? "Weekly Classes"
                              : state.callView === "completed"
                              ? "Completed Classes"
                              : state.callView === "cancelled"
                              ? "Cancelled Classes"
                              : "Scheduled Classes"}
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="relative z-10 p-8 overflow-y-auto max-h-[70vh] modal-scroll-container">
                        {displayCalls.length === 0 ? (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-16"
                          >
                            <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full mx-auto mb-6 flex items-center justify-center">
                              <CalendarIcon className="w-12 h-12 text-gray-500" />
                            </div>
                            <p className="text-xl text-gray-600">
                              {state.callView === "upcoming"
                                ? "No upcoming classes scheduled"
                                : state.callView === "today"
                                ? "No classes scheduled for today"
                                : state.callView === "week"
                                ? "No classes scheduled this week"
                                : state.callView === "completed"
                                ? "No completed classes"
                                : state.callView === "cancelled"
                                ? "No cancelled classes"
                                : "No scheduled classes"}
                            </p>
                          </motion.div>
                        ) : (
                          <VerticalTimeline
                            layout="1-column-left"
                            lineColor="url(#gradient)"
                          >
                            <AnimatePresence>
                              {displayCalls.map((call, index) => {
                                const isScheduledOrRescheduled =
                                  call.status === "Scheduled" ||
                                  call.status === "Rescheduled";
                                const isCancelled = call.status === "Cancelled";

                                return (
                                  <motion.div
                                    key={`${call._id}-${call.status}-${call.date}-${index}`}
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                                    transition={{
                                      duration: 0.5,
                                      delay: index * 0.1,
                                    }}
                                  >
                                    <VerticalTimelineElement
                                      date=""
                                      iconStyle={{
                                        background: (() => {
                                          // If callView is 'today' or 'week', override the gradient for Scheduled/Rescheduled calls
                                          if (
                                            state.callView === "today" &&
                                            (call.status === "Scheduled" ||
                                              call.status === "Rescheduled")
                                          ) {
                                            return "linear-gradient(135deg, #fb923c, #f97316)"; // orange-400 to orange-500 for Today's Classes
                                          } else if (
                                            state.callView === "week" &&
                                            (call.status === "Scheduled" ||
                                              call.status === "Rescheduled")
                                          ) {
                                            return "linear-gradient(135deg, #a5b4fc, #6366f1)"; // indigo-400 to indigo-500 for Weekly Classes
                                          }
                                          // Fallback to status-based gradients
                                          switch (call.status) {
                                            case "Completed":
                                              return "linear-gradient(135deg, #10b981, #22c55e)"; // emerald-500 to green-500
                                            case "Cancelled":
                                              return "linear-gradient(135deg, #ef4444, #f472b6)"; // red-500 to pink-500
                                            case "Rescheduled":
                                              return "linear-gradient(135deg, #fb923c, #f97316)"; // orange-400 to orange-500
                                            case "Scheduled":
                                            default:
                                              return "linear-gradient(135deg, #3b82f6, #2563eb)"; // blue-500 to blue-600
                                          }
                                        })(),
                                        color: "#fff",
                                        boxShadow:
                                          "0 10px 25px rgba(99, 102, 241, 0.3)",
                                      }}
                                      contentStyle={{
                                        background: "rgba(255, 255, 255, 0.95)",
                                        border: "none",
                                        boxShadow:
                                          "0 20px 40px rgba(99, 102, 241, 0.1)",
                                        borderRadius: "24px",
                                        padding: "2rem",
                                        marginBottom: "2rem",
                                      }}
                                      contentArrowStyle={{
                                        borderRight:
                                          "7px solid rgba(255, 255, 255, 0.95)",
                                      }}
                                    >
                                      <motion.div
                                        className="cursor-pointer"
                                        onClick={() => toggleCard(call._id)}
                                        whileHover={{ scale: 1.02 }}
                                        transition={{ duration: 0.2 }}
                                      >
                                        <div className="flex justify-between items-start mb-6">
                                          <div className="flex-1">
                                            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3 mb-3">
                                              <div
                                                className={`p-2 ${getHeaderGradient(
                                                  state.callView
                                                )} rounded-xl`}
                                              >
                                                <Calendar className="w-6 h-6 text-white" />
                                              </div>
                                              {call.classType}
                                            </h3>
                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                              <Badge
                                                className={`${getStatusClass(
                                                  call
                                                )} px-4 py-2 text-sm font-semibold rounded-full`}
                                              >
                                                {getStatusText(call)}
                                              </Badge>
                                              {isScheduledOrRescheduled && (
                                                <div className="flex items-center gap-2">
                                                  <Button
                                                    size="sm"
                                                    className={`px-3 py-1 text-xs bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 ${
                                                      !isJoinLinkEnabled(
                                                        call.date,
                                                        call.startTime,
                                                        call.endTime,
                                                        call.timezone || "UTC"
                                                      )
                                                        ? "opacity-50 cursor-not-allowed"
                                                        : ""
                                                    }`}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleJoinCall(call._id);
                                                    }}
                                                    disabled={
                                                      !isJoinLinkEnabled(
                                                        call.date,
                                                        call.startTime,
                                                        call.endTime,
                                                        call.timezone || "UTC"
                                                      )
                                                    }
                                                  >
                                                    <Video className="w-3 h-3 mr-1" />
                                                    Join
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="px-3 py-1 text-xs border-2 border-purple-600 text-purple-600 hover:bg-purple-50 rounded-lg font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleCopyLink(call._id);
                                                    }}
                                                  >
                                                    <Copy className="w-3 h-3 mr-1" />
                                                    Copy
                                                  </Button>
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          <motion.div
                                            whileHover={{ scale: 1.1 }}
                                            className="p-2 bg-gray-100 rounded-full"
                                          >
                                            {call.status !== "Completed" &&
                                              (state.openCards[call._id] ? (
                                                <ChevronUp className="w-6 h-6 text-gray-600" />
                                              ) : (
                                                <ChevronDown className="w-6 h-6 text-gray-600" />
                                              ))}
                                          </motion.div>
                                        </div>

                                        <div className="flex flex-wrap gap-3">
                                          <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{
                                              duration: 0.3,
                                              delay: 0.2,
                                            }}
                                          >
                                            <Badge className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full border-0 flex items-center gap-2">
                                              <CalendarCheck className="w-4 h-4" />
                                              <span className="text-sm font-medium">
                                                {formatDateTime(call.date)}
                                              </span>
                                            </Badge>
                                          </motion.div>
                                          <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{
                                              duration: 0.3,
                                              delay: 0.25,
                                            }}
                                          >
                                            <Badge className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full border-0 flex items-center gap-2">
                                              <Timer className="w-4 h-4" />
                                              <span className="text-sm font-medium">
                                                {formatTimeRange(
                                                  call.date,
                                                  call.startTime,
                                                  call.endTime,
                                                  call.timezone || "UTC"
                                                )}
                                              </span>
                                            </Badge>
                                          </motion.div>
                                          <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{
                                              duration: 0.3,
                                              delay: 0.3,
                                            }}
                                          >
                                            <Badge className="bg-blue-100 text-blue-700 px-4 py-2 rounded-full border-0 flex items-center gap-2">
                                              <Globe className="w-4 h-4" />
                                              <span className="text-sm font-medium">
                                                {call.timezone || "UTC"}
                                              </span>
                                            </Badge>
                                          </motion.div>
                                        </div>
                                        <div className="space-y-4 mt-2">
                                          <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{
                                              duration: 0.3,
                                              delay: 0.1,
                                            }}
                                            className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl"
                                          >
                                            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                                              <User className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                              <p className="text-sm text-gray-600 font-medium">
                                                Teacher
                                              </p>
                                              <p className="text-lg font-bold text-gray-900">
                                                {call.assignedTeacher?.name ??
                                                  "Unknown Teacher"}
                                              </p>
                                            </div>
                                          </motion.div>

                                          <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{
                                              duration: 0.3,
                                              delay: 0.3,
                                            }}
                                            className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl"
                                          >
                                            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                                              <User className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                              <p className="text-sm text-gray-600 font-medium">
                                                Scheduled By
                                              </p>
                                              <Badge className="px-4 py-2 mt-2 text-sm font-semibold rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                                                {call.scheduledBy?.role ??
                                                  "Unknown"}
                                              </Badge>
                                            </div>
                                          </motion.div>
                                        </div>
                                      </motion.div>

                                      <AnimatePresence>
                                        {state.openCards[call._id] && (
                                          <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{
                                              opacity: 1,
                                              height: "auto",
                                            }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="mt-6 pt-6 border-t border-gray-200"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {isScheduledOrRescheduled &&
                                              !isCancelled &&
                                              call.status !== "Completed" && (
                                                <div className="space-y-4">
                                                  <div className="grid grid-cols-2 gap-3">
                                                    <Button
                                                      size="sm"
                                                      className="px-3 py-1 text-xs bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setState((prev) => ({
                                                          ...prev,
                                                          selectedCallId:
                                                            call._id,
                                                          showRescheduleForm:
                                                            true,
                                                        }));
                                                      }}
                                                    >
                                                      <Edit className="w-3 h-3 mr-1" />
                                                      Reschedule
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      className="px-3 py-1 text-xs bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-lg font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setState((prev) => ({
                                                          ...prev,
                                                          showCancelConfirm:
                                                            true,
                                                          cancelCallId:
                                                            call._id,
                                                        }));
                                                      }}
                                                    >
                                                      <Trash2 className="w-3 h-3 mr-1" />
                                                      Cancel
                                                    </Button>
                                                  </div>

                                                  {isScheduledOrRescheduled &&
                                                    call.documents &&
                                                    call.documents.length >
                                                      0 && (
                                                      <motion.div
                                                        initial={{
                                                          opacity: 0,
                                                          y: 10,
                                                        }}
                                                        animate={{
                                                          opacity: 1,
                                                          y: 0,
                                                        }}
                                                        transition={{
                                                          duration: 0.3,
                                                          delay: 0.5,
                                                        }}
                                                        className="flex gap-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl"
                                                      >
                                                        <Button
                                                          size="sm"
                                                          variant="outline"
                                                          className="px-3 py-1 text-xs border-2 border-amber-300 text-amber-600 hover:bg-amber-50 rounded-lg font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                                                          onClick={(e) => {
                                                            e.preventDefault();
                                                            handleViewDocument(
                                                              call._id,
                                                              call.classType
                                                            );
                                                          }}
                                                        >
                                                          <FileText className="w-3 h-3 mr-1" />
                                                          View Document
                                                        </Button>
                                                        <Button
                                                          size="sm"
                                                          variant="outline"
                                                          className="px-3 py-1 text-xs border-2 border-amber-300 text-amber-600 hover:bg-amber-50 rounded-lg font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                                                          onClick={(e) => {
                                                            e.preventDefault();
                                                            handleDownloadDocument(
                                                              call._id
                                                            );
                                                          }}
                                                        >
                                                          <Download className="w-3 h-3 mr-1" />
                                                          Download
                                                        </Button>
                                                      </motion.div>
                                                    )}
                                                </div>
                                              )}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </VerticalTimelineElement>
                                  </motion.div>
                                );
                              })}
                            </AnimatePresence>
                          </VerticalTimeline>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {state.showScheduleForm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1000]"
                  onClick={(e) => e.target === e.currentTarget && closeModal()}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 50 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 50 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="w-full max-w-5xl max-h-[90vh] overflow-hidden mt-15"
                  >
                    <Card className="bg-white/95 backdrop-blur-xl border-0 shadow-2xl rounded-3xl overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 to-purple-50/30" />
                      <CardHeader className="relative z-10 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-3xl font-bold flex items-center">
                            <Calendar className="w-8 h-8 mr-3" />
                            Schedule Demo Class
                          </CardTitle>
                          <Button
                            variant="ghost"
                            className="text-white hover:bg-white/20 rounded-full p-2"
                            onClick={closeModal}
                          >
                            <X className="w-6 h-6" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="relative z-10 p-5 max-h-[70vh] overflow-y-auto modal-scroll-container">
                        <Form {...form}>
                          <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-8"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <FormField
                                control={form.control}
                                name="classType"
                                render={({ field }) => {
                                  const selectedOption =
                                    availableClassTypeOptions.find(
                                      (option) => option.value === field.value
                                    );
                                  const IconComponent = selectedOption
                                    ? selectedOption.icon
                                    : NotebookTabs;

                                  return (
                                    <FormItem>
                                      <FormLabel className="text-lg font-semibold text-gray-800">
                                        Class Type
                                      </FormLabel>
                                      <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                      >
                                        <FormControl>
                                          <SelectTrigger className="h-14 border-2 border-gray-200 focus:border-indigo-500 rounded-xl bg-white/70 backdrop-blur-sm">
                                            <div className="flex items-center">
                                              <IconComponent className="w-5 h-5 text-indigo-500 mr-3" />
                                              <SelectValue placeholder="Select Class Type">
                                                {selectedOption
                                                  ? selectedOption.label
                                                  : "Select Class Type"}
                                              </SelectValue>
                                            </div>
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-xl rounded-xl">
                                          {availableClassTypeOptions.map(
                                            (option) => (
                                              <SelectItem
                                                key={option.value}
                                                value={option.value}
                                                className="hover:bg-indigo-50 py-3 px-4"
                                              >
                                                <div className="flex items-center">
                                                  <option.icon className="w-4 h-4 mr-2 text-indigo-500" />
                                                  {option.label}
                                                </div>
                                              </SelectItem>
                                            )
                                          )}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  );
                                }}
                              />

                              <FormField
                                control={form.control}
                                name="timezone"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-lg font-semibold text-gray-800">
                                      Timezone
                                    </FormLabel>
                                    <Select
                                      onValueChange={field.onChange}
                                      value={field.value}
                                      onOpenChange={() => {
                                        // Reset search when dropdown opens
                                        setTimezoneSearch("");
                                      }}
                                    >
                                      <FormControl>
                                        <SelectTrigger className="h-14 border-2 border-gray-200 focus:ring-2 focus:ring-green-500 rounded-xl bg-white/70 backdrop-blur-sm">
                                          <div className="flex items-center">
                                            <Clock className="w-5 h-5 text-green-600 mr-3" />
                                            <SelectValue placeholder="Select Timezone" />
                                          </div>
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent className="bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-xl rounded-xl max-h-60 overflow-y-auto">
                                        <div className="sticky top-0 bg-white/95 z-10 p-3 border-b border-gray-200">
                                          <div className="relative">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                                            <Input
                                              placeholder="Search timezones..."
                                              value={timezoneSearch}
                                              onChange={(e) =>
                                                setTimezoneSearch(
                                                  e.target.value
                                                )
                                              }
                                              className="pl-10 h-12 border-2 border-gray-200 focus:ring-2 focus:ring-green-500 rounded-xl"
                                              onKeyDown={(e) =>
                                                e.stopPropagation()
                                              } // Prevent key events from bubbling to Select
                                            />
                                            {timezoneSearch && (
                                              <button
                                                type="button"
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                onClick={() =>
                                                  setTimezoneSearch("")
                                                }
                                              >
                                                <X className="w-5 h-5" />
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                        <div className="pt-2">
                                          {filteredTimezones.length > 0 ? (
                                            filteredTimezones.map((tz) => (
                                              <SelectItem
                                                key={tz.value}
                                                value={tz.value}
                                                className="hover:bg-green-50 py-3 px-4 cursor-pointer"
                                              >
                                                {tz.label}
                                              </SelectItem>
                                            ))
                                          ) : (
                                            <div className="p-4 text-center text-gray-500">
                                              No timezones found
                                            </div>
                                          )}
                                        </div>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-lg font-semibold text-gray-800">
                                      Date
                                    </FormLabel>
                                    <Popover
                                      open={state.isDatePickerOpen}
                                      onOpenChange={(open) =>
                                        setState((prev) => ({
                                          ...prev,
                                          isDatePickerOpen: open,
                                        }))
                                      }
                                    >
                                      <PopoverTrigger asChild>
                                        <FormControl>
                                          <Button
                                            variant="outline"
                                            className={cn(
                                              "w-full h-14 border-2 border-gray-200 focus:border-indigo-500 rounded-xl bg-white/70 backdrop-blur-sm justify-start text-left font-normal",
                                              !field.value && "text-gray-500"
                                            )}
                                          >
                                            <CalendarIcon className="w-5 h-5 text-indigo-500 mr-3" />
                                            {field.value
                                              ? format(field.value, "PPP")
                                              : "Pick a date"}
                                          </Button>
                                        </FormControl>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0 bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-xl rounded-xl">
                                        <CalendarComponent
                                          mode="single"
                                          selected={field.value}
                                          onSelect={(date) => {
                                            field.onChange(date);
                                            setState((prev) => ({
                                              ...prev,
                                              isDatePickerOpen: false,
                                            }));
                                          }}
                                          disabled={(date: Date) =>
                                            date <
                                            new Date(
                                              new Date().setHours(0, 0, 0, 0)
                                            )
                                          }
                                          initialFocus
                                        />
                                      </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <FormField
                                control={form.control}
                                name="startTime"
                                render={({ field }) => {
                                  const selectedDate = form.watch("date");
                                  const selectedTimezone =
                                    form.watch("timezone") || moment.tz.guess(); // Default to user's local timezone
                                  const allTimeSlots =
                                    generateTimeSlots(selectedTimezone);
                                  const filteredTimeSlots = filterTimeSlots(
                                    selectedDate,
                                    allTimeSlots,
                                    selectedTimezone
                                  );

                                  return (
                                    <FormItem>
                                      <FormLabel className="text-lg font-semibold text-gray-800">
                                        Time Slot
                                      </FormLabel>
                                      <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        disabled={
                                          !selectedDate || !selectedTimezone
                                        }
                                      >
                                        <FormControl>
                                          <SelectTrigger className="h-14 border-2 border-gray-200 focus:ring-2 focus:ring-indigo-500 rounded-xl bg-white/70 backdrop-blur-sm">
                                            <div className="flex items-center">
                                              <Clock className="w-5 h-5 text-indigo-600 mr-3" />
                                              <SelectValue placeholder="Select Time Slot" />
                                            </div>
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-xl rounded-xl max-h-60 overflow-y-auto">
                                          {filteredTimeSlots.map((slot) => (
                                            <SelectItem
                                              key={slot.slot}
                                              value={slot.slot}
                                              className="hover:bg-indigo-50 py-3 px-4"
                                            >
                                              {slot.slot}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  );
                                }}
                              />

                              <FormField
                                control={form.control}
                                name="meetingType"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-lg font-semibold text-gray-800">
                                      Meeting Type
                                    </FormLabel>
                                    <FormControl>
                                      <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                      >
                                        <SelectTrigger className="h-14 border-2 border-gray-200 focus:border-purple-500 rounded-xl bg-white/70 backdrop-blur-sm">
                                          <div className="flex items-center">
                                            <Video className="w-5 h-5 text-blue-500 mr-3" />
                                            <SelectValue placeholder="Select meeting type" />
                                          </div>
                                        </SelectTrigger>
                                        <SelectContent className="bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-xl rounded-xl max-h-60">
                                          <SelectItem
                                            value="zoom"
                                            className="hover:bg-indigo-50 transition-all duration-300 py-3 px-4 cursor-pointer"
                                          >
                                            Zoom Meeting
                                          </SelectItem>
                                          <SelectItem
                                            value="external"
                                            className="hover:bg-purple-50 transition-all duration-300 py-3 px-4 cursor-pointer"
                                          >
                                            External Meeting
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <AnimatePresence>
                              {form.watch("meetingType") === "zoom" && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <FormField
                                    control={form.control}
                                    name="zoomLink"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-lg font-semibold text-gray-800">
                                          Zoom Meeting Link
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            {...field}
                                            value={field.value || ""}
                                            placeholder="🔗 Paste Zoom meeting link"
                                            className="h-14 border-2 border-gray-200 focus:border-indigo-500 rounded-xl bg-white/70 backdrop-blur-sm"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="mt-3"
                                  >
                                    <Link
                                      href="#"
                                      onClick={handleZoomLinkClick}
                                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1.5 transition-colors duration-200 cursor-pointer"
                                    >
                                      <FaCalendarCheck className="w-4 h-4" />
                                      Create a Zoom Meeting
                                    </Link>
                                  </motion.div>
                                </motion.div>
                              )}
                              {form.watch("meetingType") === "external" && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <FormField
                                    control={form.control}
                                    name="meetingLink"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-lg font-semibold text-gray-800">
                                          External Meeting Link
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            {...field}
                                            value={field.value || ""}
                                            placeholder="🔗 Enter meeting link (e.g., https://meet.example.com)"
                                            className="h-14 border-2 border-gray-200 focus:border-indigo-500 rounded-xl bg-white/70 backdrop-blur-sm"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </motion.div>
                              )}
                            </AnimatePresence>

                            <FormItem>
                              <FormLabel className="text-lg font-semibold text-gray-800">
                                Student Emails
                              </FormLabel>
                              <div className="space-y-4">
                                {/* Email Input Field */}
                                <div className="flex items-center gap-3">
                                  <div className="relative flex-1">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <Input
                                      value={currentEmailInput}
                                      onChange={(e) =>
                                        setCurrentEmailInput(e.target.value)
                                      }
                                      onKeyPress={handleEmailInputKeyPress}
                                      placeholder="Enter student email address"
                                      className="h-14 pl-12 pr-4 border-2 border-gray-200 focus:border-green-500 rounded-xl bg-white/70 backdrop-blur-sm"
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    onClick={handleAddEmail}
                                    disabled={
                                      !currentEmailInput.trim() ||
                                      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                                        currentEmailInput.trim()
                                      )
                                    }
                                    className="h-14 px-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                  >
                                    <Plus className="w-5 h-5 mr-2" />
                                    Add
                                  </Button>
                                </div>

                                {/* Email Tags/Chips */}
                                {form
                                  .watch("studentEmails")
                                  .filter((email) => email.trim() !== "")
                                  .length > 0 && (
                                  <div className="space-y-3">
                                    <p className="text-sm font-medium text-gray-600">
                                      Added Emails:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                      {form
                                        .watch("studentEmails")
                                        .map((email, index) => ({
                                          email,
                                          index,
                                        }))
                                        .filter(
                                          ({ email }) => email.trim() !== ""
                                        )
                                        .map(({ email, index }) => (
                                          <motion.div
                                            key={index}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                            className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-full px-4 py-2 shadow-sm"
                                          >
                                            <Mail className="w-4 h-4 text-blue-600" />
                                            <span className="text-sm font-medium text-blue-800 max-w-[200px] truncate">
                                              {email}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                removeEmailField(index)
                                              }
                                              className="ml-1 p-1 hover:bg-red-100 rounded-full transition-colors duration-200 group"
                                            >
                                              <X className="w-4 h-4 text-red-500 group-hover:text-red-700" />
                                            </button>
                                          </motion.div>
                                        ))}
                                    </div>
                                  </div>
                                )}

                                {/* Validation Message */}
                                {form.formState.errors.studentEmails && (
                                  <p className="text-red-600 font-medium bg-red-50/80 p-3 rounded-xl">
                                    {form.formState.errors.studentEmails
                                      .message ||
                                      "At least one valid email is required"}
                                  </p>
                                )}
                              </div>
                            </FormItem>

                            <FormItem>
                              <FormLabel className="text-lg font-semibold text-gray-800">
                                Upload Documents (Optional)
                              </FormLabel>
                              <FormControl>
                                <div className="flex flex-col gap-4">
                                  {/* Drag and Drop Zone */}
                                  <label
                                    htmlFor="documents"
                                    className={cn(
                                      "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-white/70 backdrop-blur-sm transition-all duration-300",
                                      state.documents.length > 0
                                        ? "border-amber-500 hover:bg-amber-50"
                                        : "border-gray-300 hover:bg-gray-50"
                                    )}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      const files = e.dataTransfer.files;
                                      if (files) {
                                        handleFileChange({
                                          target: { files },
                                        } as React.ChangeEvent<HTMLInputElement>);
                                      }
                                    }}
                                  >
                                    <input
                                      id="documents"
                                      type="file"
                                      multiple
                                      accept=".pdf,.ppt,.pptx,.doc,.docx"
                                      onChange={handleFileChange}
                                      className="hidden"
                                    />
                                    <div className="flex flex-col items-center gap-2">
                                      <Upload className="w-8 h-8 text-amber-500" />
                                      <p className="text-sm font-medium text-gray-600">
                                        Drag & drop files or{" "}
                                        <span className="text-amber-600 font-semibold">
                                          browse
                                        </span>
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        Supported formats: PDF, PPT, PPTX, DOC,
                                        DOCX (Max 500MB)
                                      </p>
                                    </div>
                                  </label>

                                  {/* Uploaded Files List */}
                                  {state.documents.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      {state.documents.map((file, index) => (
                                        <motion.div
                                          key={index}
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          className="flex items-center justify-between gap-2 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl shadow-sm"
                                        >
                                          <div className="flex items-center gap-2 truncate">
                                            <FileText className="w-5 h-5 text-amber-600" />
                                            <span className="text-sm font-medium text-gray-700 truncate max-w-[40rem]">
                                              {file.name}
                                            </span>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            className="p-1 text-red-600 hover:bg-red-200 rounded-full"
                                            onClick={() =>
                                              removeDocument(index)
                                            }
                                          >
                                            <X className="w-4 h-4" />
                                          </Button>
                                        </motion.div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </FormControl>
                            </FormItem>

                            <div className="flex justify-end gap-4">
                              <Button
                                type="button"
                                variant="outline"
                                className="border-2 border-gray-300 text-gray-700 rounded-xl px-8 py-3"
                                onClick={closeModal}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                disabled={state.formLoading}
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl px-8 py-3 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
                              >
                                {state.formLoading ? (
                                  <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Scheduling...
                                  </>
                                ) : (
                                  <>
                                    <Calendar className="w-5 h-5 mr-2" />
                                    Schedule Class
                                  </>
                                )}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {state.showRescheduleForm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1000]"
                  onClick={(e) => e.target === e.currentTarget && closeModal()}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 50 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 50 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="w-full max-w-lg"
                  >
                    <Card className="bg-white/95 backdrop-blur-xl border-0 shadow-2xl rounded-3xl overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 to-purple-50/30" />
                      <CardHeader className="relative z-10 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-8">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-3xl font-bold flex items-center">
                            <Edit className="w-8 h-8 mr-3" />
                            Reschedule Class
                          </CardTitle>
                          <Button
                            variant="ghost"
                            className="text-white hover:bg-white/20 rounded-full p-2 cursor-pointer"
                            onClick={closeModal}
                          >
                            <X className="w-6 h-6" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="relative z-10 p-8 max-h-[70vh] overflow-y-auto modal-scroll-container">
                        <Form {...rescheduleForm}>
                          <form
                            onSubmit={rescheduleForm.handleSubmit(
                              onRescheduleSubmit
                            )}
                            className="space-y-8"
                          >
                            <FormField
                              control={rescheduleForm.control}
                              name="timezone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-lg font-semibold text-gray-800">
                                    Timezone
                                  </FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    onOpenChange={() => {
                                      setTimezoneSearch("");
                                    }}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="h-14 border-2 border-gray-200 focus:border-green-500 rounded-xl bg-white/70 backdrop-blur-sm">
                                        <div className="flex items-center">
                                          <Clock className="w-5 h-5 text-green-500 mr-3" />
                                          <SelectValue placeholder="Select Timezone" />
                                        </div>
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-xl rounded-xl max-h-60 overflow-y-auto">
                                      <div className="sticky top-0 bg-white/95 z-10 p-3 border-b border-gray-200">
                                        <div className="relative">
                                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                                          <Input
                                            placeholder="Search timezones..."
                                            value={timezoneSearch}
                                            onChange={(e) =>
                                              setTimezoneSearch(e.target.value)
                                            }
                                            className="pl-10 h-12 border-2 border-gray-200 focus:ring-2 focus:ring-green-500 rounded-xl"
                                            onKeyDown={(e) =>
                                              e.stopPropagation()
                                            }
                                          />
                                          {timezoneSearch && (
                                            <button
                                              type="button"
                                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                              onClick={() =>
                                                setTimezoneSearch("")
                                              }
                                            >
                                              <X className="w-5 h-5" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      <div className="pt-2">
                                        {filteredTimezones.length > 0 ? (
                                          filteredTimezones.map((tz) => (
                                            <SelectItem
                                              key={tz.value}
                                              value={tz.value}
                                              className="hover:bg-green-50 py-3 px-4 cursor-pointer"
                                            >
                                              {tz.label}
                                            </SelectItem>
                                          ))
                                        ) : (
                                          <div className="p-4 text-center text-gray-500">
                                            No timezones found
                                          </div>
                                        )}
                                      </div>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={rescheduleForm.control}
                              name="date"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-lg font-semibold text-gray-800">
                                    Date
                                  </FormLabel>
                                  <Popover
                                    open={state.isRescheduleDatePickerOpen}
                                    onOpenChange={(open) =>
                                      setState((prev) => ({
                                        ...prev,
                                        isRescheduleDatePickerOpen: open,
                                      }))
                                    }
                                  >
                                    <PopoverTrigger asChild>
                                      <FormControl>
                                        <Button
                                          variant="outline"
                                          className={cn(
                                            "w-full h-14 border-2 border-gray-200 focus:border-indigo-500 rounded-xl bg-white/70 backdrop-blur-sm justify-start text-left font-normal",
                                            !field.value && "text-gray-500"
                                          )}
                                        >
                                          <CalendarIcon className="w-5 h-5 text-indigo-500 mr-3" />
                                          {field.value
                                            ? format(field.value, "PPP")
                                            : "Pick a date"}
                                        </Button>
                                      </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-xl rounded-xl">
                                      <CalendarComponent
                                        mode="single"
                                        selected={field.value}
                                        onSelect={(date) => {
                                          field.onChange(date);
                                          setState((prev) => ({
                                            ...prev,
                                            isRescheduleDatePickerOpen: false,
                                          }));
                                        }}
                                        disabled={(date: Date) =>
                                          date <
                                          new Date(
                                            new Date().setHours(0, 0, 0, 0)
                                          )
                                        }
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={rescheduleForm.control}
                              name="startTime"
                              render={({ field }) => {
                                const selectedDate =
                                  rescheduleForm.watch("date");
                                const selectedTimezone =
                                  rescheduleForm.watch("timezone");
                                const allTimeSlots = generateTimeSlots(
                                  selectedTimezone || "UTC"
                                );
                                const filteredTimeSlots = filterTimeSlots(
                                  selectedDate,
                                  allTimeSlots,
                                  selectedTimezone || "UTC"
                                );

                                return (
                                  <FormItem>
                                    <FormLabel className="text-lg font-semibold text-gray-800">
                                      Time Slot
                                    </FormLabel>
                                    <Select
                                      onValueChange={field.onChange}
                                      value={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger className="h-14 border-2 border-gray-200 focus:border-purple-500 rounded-xl bg-white/70 backdrop-blur-sm">
                                          <div className="flex items-center">
                                            <Clock className="w-5 h-5 text-purple-500 mr-3" />
                                            <SelectValue placeholder="Select Time Slot" />
                                          </div>
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent className="bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-xl rounded-xl max-h-60 overflow-y-auto">
                                        {filteredTimeSlots.map((slot, idx) => (
                                          <SelectItem
                                            key={idx}
                                            value={slot.slot}
                                            className="hover:bg-purple-50 py-3 px-4"
                                          >
                                            {slot.slot}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                );
                              }}
                            />

                            <div className="flex justify-end gap-4">
                              <Button
                                type="button"
                                variant="outline"
                                className="border-2 border-gray-300 text-gray-700 rounded-xl px-8 py-3"
                                onClick={closeModal}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                disabled={state.formLoading}
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl px-8 py-3 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
                              >
                                {state.formLoading ? (
                                  <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Rescheduling...
                                  </>
                                ) : (
                                  <>
                                    <Edit className="w-5 h-5 mr-2" />
                                    Reschedule Class
                                  </>
                                )}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {state.showCancelConfirm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1000]"
                  onClick={(e) => e.target === e.currentTarget && closeModal()}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 50 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 50 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="w-full max-w-md"
                  >
                    <Card className="bg-white/95 backdrop-blur-xl border-0 shadow-2xl rounded-3xl overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 to-purple-50/30" />
                      <CardHeader className="relative z-10 bg-gradient-to-r from-red-600 to-pink-600 text-white p-8">
                        <CardTitle className="text-3xl font-bold flex items-center justify-center">
                          <Trash2 className="w-8 h-8 mr-3" />
                          Cancel Class
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="relative z-10 p-8">
                        <p className="text-lg text-gray-800 mb-8">
                          Are you sure you want to cancel this class? This
                          action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-4">
                          <Button
                            variant="outline"
                            className="border-2 border-gray-300 text-gray-700 rounded-xl px-8 py-3"
                            onClick={closeModal}
                          >
                            No, Keep Class
                          </Button>
                          <Button
                            className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-xl px-8 py-3 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
                            onClick={() => handleCancelCall(state.cancelCallId)}
                          >
                            <Trash2 className="w-5 h-5 mr-2" />
                            Yes, Cancel Class
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {state.selectedDocument && (
              <DocumentPopup
                topic={state.selectedDocument.topic}
                documentUrl={state.selectedDocument.documentUrl}
                documentType={state.selectedDocument.documentType}
                zoomLink={state.selectedDocument.zoomLink}
                onClose={() =>
                  setState((prev) => ({ ...prev, selectedDocument: null }))
                }
                isOpen={!!state.selectedDocument}
              />
            )}
          </motion.div>
        </div>
      </div>
      <style jsx global>{`
        .modal-scroll-container::-webkit-scrollbar {
          display: none;
        }
        .modal-scroll-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}

export default function ScheduleCall() {
  return (
    <Suspense
      fallback={
        <div>
          <Loader />
        </div>
      }
    >
      <ScheduleCallContent />
    </Suspense>
  );
}
