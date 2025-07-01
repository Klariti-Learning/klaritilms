"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Target,
  User,
  Calendar,
  Book,
  Film,
  PenTool,
  Mic,
  Headphones,
  BookOpen,
  Download,
  Video,
  CheckCircle,
  FilePlus,
  X,
  CalendarCheck,
  Search,
  Upload,
  Folder,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { ApiError } from "@/types";
import DocumentPopup from "@/components/DocumentPopup";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import dayjs from "dayjs";
import moment from "moment-timezone";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { FileText, FileSpreadsheet, FileImage, File } from "lucide-react";

interface Resource {
  name: string;
  url: string;
}

interface Worksheet {
  id: string;
  type: string;
  url: string;
  fileId: string;
  name: string;
  uploadedBy: string;
  uploadedAt: string;
}

interface Lesson {
  lessonId: string;
  title: string;
  format: string;
  resources: Resource[];
  learningGoals: string[];
  worksheets: Worksheet[];
}

interface Chapter {
  title: string;
  lessons: Lesson[];
}

interface Course {
  _id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  targetAudience: string;
  duration: string;
  createdBy: { name: string };
  createdAt: string;
  lastUpdatedAt?: string;
  chapters?: Chapter[];
}

interface ScheduledCall {
  lessonTitle: string;
  date: string;
  startTime: string;
  endTime: string;
  days: string[];
  repeat: boolean;
  status: string;
  timezone: string;
  type: string;
  zoomLink?: string;
  meetingLink?: string;
  lessonId: string;
  _id: string;
  classType: string;
  previousDate?: string;
  previousStartTime?: string;
  previousEndTime?: string;
}

interface ScheduleResponse {
  calls: ScheduledCall[];
  schedule: {
    scheduleStatus: string;
    scheduleDuration: string;
  };
}

interface SelectedDocument {
  topic: string;
  documentUrl: string;
  documentType: string;
}

interface RescheduleFormData {
  meetingType: string;
  meetingLink: string;
  zoomLink: string;
  timezone: string;
  startTime: string;
  startDate: string;
  days: string[];
  repeat: boolean;
  useExistingLink: boolean;
  classType: string;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  isFolder: boolean;
}

const timelineIcons = [Book, Film, PenTool, Mic, Headphones];

type FileType = "pdf" | "doc" | "ppt" | "image" | "other";
type SelectionMode = "local" | "drive" | undefined;

export default function CourseDetails() {
  const { user, loading: authLoading, deviceId } = useAuth();
  const router = useRouter();
  const { courseId } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [scheduledCalls, setScheduledCalls] = useState<ScheduleResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openLessons, setOpenLessons] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [selectedDocument, setSelectedDocument] =
    useState<SelectedDocument | null>(null);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState<ScheduledCall | null>(null);
  const [rescheduleFormData, setRescheduleFormData] =
    useState<RescheduleFormData>({
      meetingType: "zoom",
      meetingLink: "",
      zoomLink: "",
      timezone: moment.tz.guess(),
      startTime: "12:00",
      startDate: moment().format("YYYY-MM-DD"),
      days: [],
      repeat: false,
      useExistingLink: true,
      classType: "",
    });
  const [formErrors, setFormErrors] = useState<Partial<RescheduleFormData>>({});
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [timezoneSearch, setTimezoneSearch] = useState("");
  const [filteredTimezones, setFilteredTimezones] = useState<string[]>(
    moment.tz.names()
  );
  const [isAddWorksheetModalOpen, setIsAddWorksheetModalOpen] = useState(false);
  const [isViewWorksheetsModalOpen, setIsViewWorksheetsModalOpen] =
    useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDriveFile, setSelectedDriveFile] = useState<DriveFile | null>(
    null
  );
  const fileTypes: {
    type: FileType;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  }[] = [
    { type: "pdf", icon: FileText, label: "PDF" },
    { type: "doc", icon: FileText, label: "Document" },
    { type: "ppt", icon: FileSpreadsheet, label: "Presentation" },
    { type: "image", icon: FileImage, label: "Image" },
    { type: "other", icon: File, label: "Other" },
  ];
  const [selectedFileType, setSelectedFileType] = useState<
    FileType | undefined
  >(undefined);
  const [isDeleteWorksheetModalOpen, setIsDeleteWorksheetModalOpen] =
    useState(false);
  const [selectedWorksheet, setSelectedWorksheet] = useState<Worksheet | null>(
    null
  );
  const [isDriveFilesModalOpen, setIsDriveFilesModalOpen] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [isFetchingDriveFiles, setIsFetchingDriveFiles] = useState(false);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(undefined);

const handleUnauthorized = useCallback(() => {
    console.debug("[CourseDetails] Handling unauthorized access");
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("deviceId");
    setError("Session expired. Please log in again.");
    toast.error("Session expired. Please log in again.");
    router.push("/login");
  }, [router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role?.roleName !== "Teacher") {
      console.debug("[CourseDetails] Redirecting due to invalid role or no user", {
        user: !!user,
        role: user?.role?.roleName,
        authLoading,
      });
      handleUnauthorized();
      return;
    }
  }, [user, authLoading, handleUnauthorized, router]);

  const fetchDriveFiles = async (folderId: string, fileType?: FileType) => {
    setIsFetchingDriveFiles(true);
    try {
      const token = localStorage.getItem("token");
      if (!token || !deviceId) {
        console.debug("[CourseDetails] Missing token or deviceId for fetchDriveFiles", { token, deviceId });
        handleUnauthorized();
        return;
      }
      const response = await api.get(`/drive/files/${folderId}`, {
        params: { fileType: fileType || undefined },
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setDriveFiles(response.data.items);
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        toast.error(apiError.response?.data?.message || "Failed to fetch Google Drive files");
        console.error("Error fetching Drive files:", apiError);
      }
    } finally {
      setIsFetchingDriveFiles(false);
    }
  };

  const handleSelectDriveFile = async (file: DriveFile | null) => {
    if (!file || !selectedLesson || !courseId || !course) return;

    try {
      const token = localStorage.getItem("token");
      if (!token || !deviceId) {
        console.debug("[CourseDetails] Missing token or deviceId for handleSelectDriveFile", { token, deviceId });
        handleUnauthorized();
        return;
      }

      const response = await api.post(
        `/drive/select-file`,
        {
          fileId: file.id,
          fileName: file.name,
          mimeType: file.mimeType,
          courseTitle: course.courseTitle,
          courseFolderId: process.env.GOOGLE_COURSE_FOLDER_ID,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      const { fileId, webViewLink } = response.data;
      const formData = new FormData();
      formData.append("fileId", fileId);
      formData.append("url", webViewLink);
      formData.append("type", file.mimeType.split("/").pop() || "other");
      formData.append("name", file.name);

      const uploadResponse = await api.put(
        `/courses/${courseId}/lesson/${selectedLesson.lessonId}/worksheets`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      toast.success(
        uploadResponse.data.message || "Worksheet added successfully"
      );
      await fetchWorksheets(courseId as string, selectedLesson.lessonId);
      setIsDriveFilesModalOpen(false);
      setIsAddWorksheetModalOpen(false);
      setSelectedFileType(undefined);
      setSelectedDriveFile(null);
      setSelectionMode(undefined);
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[CourseDetails] Error selecting Drive file:", apiError);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        toast.error(apiError.response?.data?.message || "Failed to add worksheet from Drive");
      }
    }
  };

  const fetchCourseAndSchedule = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
if (!token || !deviceId) {
        console.debug("[CourseDetails] Missing token or deviceId", { token, deviceId });
        handleUnauthorized();
        return;
      }

      const courseResponse = await api.get(`/courses/${courseId}`);
      let courseData = courseResponse.data;

      for (const chapter of courseData.chapters || []) {
        for (const lesson of chapter.lessons) {
          lesson.worksheets = lesson.worksheets || [];
          lesson.worksheets = lesson.worksheets.map((ws: Worksheet) => ({
            id: ws.id || ws.fileId,
            type: ws.type,
            url: ws.url,
            fileId: ws.fileId,
            name: ws.name,
            uploadedBy: ws.uploadedBy,
            uploadedAt: ws.uploadedAt,
          }));
        }
      }

      const scheduleResponse = await api.get(
        `/schedule/course/${courseId}/calls`
      );
      const transformedCalls = scheduleResponse.data.calls.map(
        (call: ScheduledCall) => ({
          ...call,
          scheduleId: call._id,
        })
      );

      for (const call of transformedCalls) {
        try {
          const worksheetResponse = await api.get(
            `/courses/${courseId}/lesson/${call.lessonId}/worksheets`
          );
          const fetchedWorksheets = worksheetResponse.data.worksheets || [];

          courseData = {
            ...courseData,
            chapters: courseData.chapters.map((chapter: Chapter) => ({
              ...chapter,
              lessons: chapter.lessons.map((lesson: Lesson) => {
                if (lesson.lessonId === call.lessonId) {
                  const mergedWorksheets = [
                    ...(lesson.worksheets || []),
                    ...fetchedWorksheets.filter(
                      (ws: Worksheet) =>
                        !lesson.worksheets.some(
                          (existingWs) => existingWs.fileId === ws.fileId
                        )
                    ),
                  ].map((ws: Worksheet) => ({
                    id: ws.id || ws.fileId,
                    type: ws.type,
                    url: ws.url,
                    fileId: ws.fileId,
                    name: ws.name,
                    uploadedBy: ws.uploadedBy,
                    uploadedAt: ws.uploadedAt,
                  }));
                  return { ...lesson, worksheets: mergedWorksheets };
                }
                return lesson;
              }),
            })),
          };
        } catch (worksheetError) {
          console.error(
            `Failed to fetch worksheets for lesson ${call.lessonId}:`,
            worksheetError
          );
        }
      }

      setCourse(courseData);
      setScheduledCalls({
        calls: transformedCalls,
        schedule: scheduleResponse.data.schedule || {
          scheduleStatus: "Unknown",
          scheduleDuration: "Unknown",
        },
      });
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[CourseDetails] Fetch error:", {
        message: apiError.response?.data?.message || apiError.message,
        status: apiError.response?.status,
      });
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        const errorMessage = apiError.response?.data?.message || "Failed to fetch course or schedule details";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [courseId, deviceId, handleUnauthorized]);

  useEffect(() => {
    fetchCourseAndSchedule();
  }, [courseId, fetchCourseAndSchedule]);

  useEffect(() => {
    const handler = setTimeout(() => {
      const lowerQuery = timezoneSearch.toLowerCase();
      const filtered = moment.tz
        .names()
        .filter((tz) => tz.toLowerCase().includes(lowerQuery));
      setFilteredTimezones(filtered);
    }, 300);

    return () => clearTimeout(handler);
  }, [timezoneSearch]);

  const toggleLesson = (chapterIndex: number, lessonIndex: number) => {
    const lessonKey = `${chapterIndex}-${lessonIndex}`;
    setOpenLessons((prev) => ({
      ...prev,
      [lessonKey]: !prev[lessonKey],
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

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(":");
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleViewLesson = (lesson: Lesson) => {
    if (lesson.resources && lesson.resources.length > 0) {
      const resource = lesson.resources[0];
      setSelectedDocument({
        topic: lesson.title,
        documentUrl: resource.url,
        documentType: getDocumentType(resource.url),
      });
    } else {
      toast.error("No resources available for this lesson");
    }
  };

  const handleDownloadLesson = (lesson: Lesson) => {
    if (lesson.resources && lesson.resources.length > 0) {
      const resource = lesson.resources[0];
      let downloadUrl = resource.url;
      if (resource.url.includes("drive.google.com")) {
        downloadUrl = transformGoogleDriveUrlToDownload(resource.url);
      } else {
        downloadUrl = `/api/documents/proxy?url=${encodeURIComponent(
          resource.url
        )}`;
      }
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download =
        resource.name ||
        `lesson-${lesson.title}.${getDocumentType(resource.url)}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Lesson download initiated!");
    } else {
      toast.error("No resources available for this lesson");
    }
  };

  const fetchWorksheets = async (courseId: string, lessonId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token || !deviceId) {
        console.debug("[CourseDetails] Missing token or deviceId for fetchWorksheets", { token, deviceId });
        handleUnauthorized();
        return;
      }
      const response = await api.get(
        `/courses/${courseId}/lesson/${lessonId}/worksheets`
      );
      const fetchedWorksheets = response.data.worksheets || [];
      setWorksheets(fetchedWorksheets);

      setCourse((prevCourse) => {
        if (!prevCourse) return prevCourse;
        const updatedChapters = prevCourse.chapters?.map((chapter) => ({
          ...chapter,
          lessons: chapter.lessons.map((lesson) => {
            if (lesson.lessonId === lessonId) {
              return {
                ...lesson,
                worksheets: fetchedWorksheets,
              };
            }
            return lesson;
          }),
        }));
        return { ...prevCourse, chapters: updatedChapters };
      });
    }catch (error) {
      const apiError = error as ApiError;
      console.error("[CourseDetails] Error fetching worksheets:", apiError);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        toast.error(apiError.response?.data?.message || "Failed to fetch worksheets");
        setWorksheets([]);
      }
    }
  };

  const handleWorksheetUpload = async (courseId: string, lessonId: string) => {
    if (!selectedFile || !selectedFileType) {
      toast.error("Please select a file type and a file");
      return;
    }

    const formData = new FormData();
    formData.append("worksheet", selectedFile);

    try {
      const token = localStorage.getItem("token");
      if (!token || !deviceId) {
        console.debug("[CourseDetails] Missing token or deviceId for handleWorksheetUpload", { token, deviceId });
        handleUnauthorized();
        return;
      }
      const response = await api.put(
        `/courses/${courseId}/lesson/${lessonId}/worksheets`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      toast.success(response.data.message || "Worksheet uploaded successfully");

      await fetchWorksheets(courseId, lessonId);

      setIsAddWorksheetModalOpen(false);
      setSelectedFile(null);
      setSelectedFileType(undefined);
      setSelectionMode(undefined);
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[CourseDetails] Upload error:", apiError);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        toast.error(apiError.response?.data?.message || "Failed to upload worksheet");
      }
    }
  };

  const handleDeleteWorksheet = async (
    courseId: string,
    lessonId: string,
    worksheetId: string
  ) => {
    try {
      const token = localStorage.getItem("token");
      if (!token || !deviceId) {
        console.debug("[CourseDetails] Missing token or deviceId for handleDeleteWorksheet", { token, deviceId });
        handleUnauthorized();
        return;
      }

      const response = await api.put(
        `/courses/${courseId}/lesson/${lessonId}/worksheets`,
        { worksheetIds: [worksheetId] },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      toast.success(response.data.message || "Worksheet deleted successfully");

      setWorksheets((prev) => prev.filter((ws) => ws.id !== worksheetId));

      setCourse((prevCourse) => {
        if (!prevCourse) return prevCourse;
        const updatedChapters = prevCourse.chapters?.map((chapter) => ({
          ...chapter,
          lessons: chapter.lessons.map((lesson) => {
            if (lesson.lessonId === lessonId) {
              return {
                ...lesson,
                worksheets: lesson.worksheets.filter(
                  (ws) => ws.id !== worksheetId
                ),
              };
            }
            return lesson;
          }),
        }));
        return { ...prevCourse, chapters: updatedChapters };
      });

      setIsDeleteWorksheetModalOpen(false);
      setSelectedWorksheet(null);
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[CourseDetails] Delete error:", apiError);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        toast.error(apiError.response?.data?.message || "Failed to delete worksheet");
      }
    }
  };

  const handleAddWorksheet = (lesson: Lesson) => {
    const scheduledCall = scheduledCalls?.calls.find(
      (call) => call.lessonId === lesson.lessonId
    );
    if (!scheduledCall) {
      toast.error("No scheduled call found for this lesson");
      return;
    }
    setSelectedLesson({ ...lesson, lessonId: scheduledCall.lessonId });
    setIsAddWorksheetModalOpen(true);
  };

  const handleViewWorksheets = async (courseId: string, lesson: Lesson) => {
    setSelectedLesson({ ...lesson });
    if (lesson.worksheets && lesson.worksheets.length > 0) {
      setWorksheets(lesson.worksheets);
    } else {
      await fetchWorksheets(courseId, lesson.lessonId);
    }
    setIsViewWorksheetsModalOpen(true);
  };

  const handleJoinMeeting = (call: ScheduledCall) => {
    const meetingUrl = call.type === "zoom" ? call.zoomLink : call.meetingLink;
    if (meetingUrl) {
      window.open(meetingUrl, "_blank");
    } else {
      toast.error("No meeting link available");
    }
  };

  const handleReschedule = (call: ScheduledCall) => {
    setSelectedCall(call);
    setRescheduleFormData({
      meetingType: call.type || "zoom",
      meetingLink: call.meetingLink || "",
      zoomLink: call.zoomLink || "",
      timezone: call.timezone || moment.tz.guess(),
      startTime: call.startTime || "12:00",
      startDate: moment(call.date).format("YYYY-MM-DD"),
      days: call.days || [moment(call.date).format("dddd")],
      repeat: call.repeat || false,
      useExistingLink: true,
      classType: call.classType || "",
    });
    setIsRescheduleModalOpen(true);
  };

  const handleCancel = (call: ScheduledCall) => {
    setSelectedCall(call);
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedCall) return;

    try {
      const token = localStorage.getItem("token");
      if (!token || !deviceId) {
        console.debug("[CourseDetails] Missing token or deviceId for handleConfirmCancel", { token, deviceId });
        handleUnauthorized();
        return;
      }
      await api.post(
        `/scheduledCalls/cancel/${selectedCall._id}/${selectedCall.lessonId}`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      setScheduledCalls((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          calls: prev.calls.map((c) =>
            c.lessonId === selectedCall.lessonId
              ? { ...c, status: "Cancelled" }
              : c
          ),
        };
      });
      toast.success("Schedule cancelled successfully");
      setIsCancelModalOpen(false);
      setSelectedCall(null);
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[CourseDetails] Cancel error:", apiError);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        toast.error(apiError.response?.data?.message || "Failed to cancel schedule");
      }
    }
  };

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
      setRescheduleFormData((prev) => ({ ...prev, startTime: formattedTime }));
      setFormErrors((prev) => ({ ...prev, startTime: undefined }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRescheduleFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSelectChange =
    (name: keyof RescheduleFormData) => (value: string) => {
      setRescheduleFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      const formattedDate = moment(date).format("YYYY-MM-DD");
      const dayOfWeek = moment(date).format("dddd");
      setRescheduleFormData((prev) => ({
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

  const handleSwitchChange =
    (field: keyof RescheduleFormData) => (checked: boolean) => {
      setRescheduleFormData((prev) => ({ ...prev, [field]: checked }));
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    };

  const validateRescheduleForm = (): boolean => {
    const errors: Partial<RescheduleFormData> = {};
    if (!rescheduleFormData.useExistingLink) {
      if (
        rescheduleFormData.meetingType === "external" &&
        !rescheduleFormData.meetingLink.trim()
      )
        errors.meetingLink = "Meeting link is required for external meetings";
      if (
        rescheduleFormData.meetingType === "zoom" &&
        !rescheduleFormData.zoomLink.trim()
      )
        errors.zoomLink = "Zoom link is required for Zoom meetings";
    }
    if (!rescheduleFormData.timezone) errors.timezone = "Timezone is required";
    if (!rescheduleFormData.startTime)
      errors.startTime = "Start time is required";
    if (!rescheduleFormData.startDate)
      errors.startDate = "Start date is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRescheduleForm() || !selectedCall) {
      toast.error("Please fix the form errors before submitting");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token || !deviceId) {
        console.debug("[CourseDetails] Missing token or deviceId for handleRescheduleSubmit", { token, deviceId });
        handleUnauthorized();
        return;
      }
      const response = await api.put(
        `/scheduledCalls/reschedule/${selectedCall._id}/${selectedCall.lessonId}`,
        rescheduleFormData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      setScheduledCalls((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          calls: prev.calls.map((c) =>
            c.lessonId === selectedCall.lessonId
              ? {
                  ...c,
                  status: "Rescheduled",
                  date: rescheduleFormData.startDate,
                  startTime: rescheduleFormData.startTime,
                  endTime: calculateEndTime(rescheduleFormData.startTime),
                  timezone: rescheduleFormData.timezone,
                  type: rescheduleFormData.meetingType,
                  zoomLink: rescheduleFormData.useExistingLink
                    ? c.zoomLink
                    : rescheduleFormData.zoomLink,
                  meetingLink: rescheduleFormData.useExistingLink
                    ? c.meetingLink
                    : rescheduleFormData.meetingLink,
                  days: rescheduleFormData.days,
                  repeat: rescheduleFormData.repeat,
                  classType: rescheduleFormData.classType,
                  previousDate: c.date,
                  previousStartTime: c.startTime,
                  previousEndTime: c.endTime,
                }
              : c
          ),
        };
      });
      toast.success(
        response.data.message || "Schedule rescheduled successfully"
      );
      setIsRescheduleModalOpen(false);
      setSelectedCall(null);
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[CourseDetails] Reschedule error:", apiError);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        toast.error(apiError.response?.data?.message || "Failed to reschedule");
      }
    }
  };

  const calculateEndTime = (startTime: string): string => {
    const [hours, minutes] = startTime.split(":").map(Number);
    const endDateTime = new Date();
    endDateTime.setHours(hours, minutes + 40);
    return `${endDateTime.getHours().toString().padStart(2, "0")}:${endDateTime
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled":
        return "bg-blue-500 text-blue-100";
      case "rescheduled":
        return "bg-orange-500 text-white";
      case "cancelled":
        return "bg-red-500 text-white";
      case "completed":
        return "bg-green-500 text-white flex items-center gap-1";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const isScheduled = scheduledCalls?.calls && scheduledCalls.calls.length > 0;

  if (authLoading || loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-white-100">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl shadow-md max-w-md w-full"
        >
          <p className="text-red-700 font-medium">{error}</p>
        </motion.div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-indigo-50 to-purple-50 mt-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Course Not Found
          </h2>
          <p className="text-gray-600 max-w-md mx-auto">
            The course you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have access to it.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 to-purple-50 p-6 md:p-8 mt-10">
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .custom-toggle {
          position: relative;
          width: 80px;
          height: 34px;
          background-color: #e5e7eb;
          border-radius: 9999px;
          transition: background-color 0.3s;
        }
        .custom-toggle.checked {
          background-color: #10b981;
        }
        .custom-toggle .handle {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 30px;
          height: 30px;
          background-color: white;
          border-radius: 50%;
          transition: transform 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          color: #1f2937;
        }
        .custom-toggle.checked .handle {
          transform: translateX(46px);
        }
        .calendar-container {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px);
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          padding: 16px;
        }
        [data-selected="true"] {
          background: linear-gradient(to right, #6366f1, #a855f7) !important;
          color: white !important;
          border-radius: 9999px !important;
        }
        [data-selected="true"]:hover {
          background: linear-gradient(to right, #4f46e5, #9333ea) !important;
        }
        .rdp-day:not([data-disabled="true"]):not([data-selected="true"]):hover {
          background-color: #e0e7ff;
          border-radius: 9999px;
        }
        [data-disabled="true"] {
          color: #d1d5db !important;
          cursor: not-allowed !important;
        }
        .timezone-search-input {
          transition: all 0.2s ease-in-out;
        }
        .timezone-search-input:focus {
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
          border-color: #6366f1;
        }
        .timezone-item:hover {
          background: linear-gradient(to right, #eef2ff, #e0e7ff) !important;
          transition: background 0.2s ease-in-out;
        }
        .MuiInputBase-root {
          border-radius: 12px !important;
          background-color: rgba(255, 255, 255, 0.5) !important;
          border: 1px solid #e5e7eb !important;
          padding: 12px 16px !important;
          height: 48px !important;
          font-size: 0.875rem !important;
          color: #374151 !important;
          transition: all 0.3s ease !important;
        }
        .MuiInputBase-root:hover {
          background-color: rgba(255, 255, 255, 0.7) !important;
          border-color: #6366f1 !important;
        }
        .MuiInputBase-root.Mui-focused {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2) !important;
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
          backdrop-filter: blur(8px) !important;
          border-radius: 12px !important;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1) !important;
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
        }
        .MuiClockNumber-root {
          color: #374151 !important;
          font-weight: 500 !important;
        }
        .MuiClockNumber-root.Mui-selected {
          background: linear-gradient(to right, #6366f1, #a855f7) !important;
          color: white !important;
        }
        .MuiButtonBase-root.MuiPickersDay-root.Mui-selected {
          background: linear-gradient(to right, #6366f1, #a855f7) !important;
        }
        .MuiTypography-root.MuiPickersToolbarText-root.Mui-selected {
          color: #6366f1 !important;
        }
        .timezone-select-trigger {
          height: 48px !important;
          padding: 12px 16px !important;
          font-size: 0.875rem !important;
          border-radius: 12px !important;
          background-color: rgba(255, 255, 255, 0.5) !important;
          border: 1px solid #e5e7eb !important;
          transition: all 0.3s ease !important;
        }
        .timezone-select-trigger:hover {
          background-color: rgba(255, 255, 255, 0.7) !important;
          border-color: #6366f1 !important;
        }
        .timezone-select-trigger:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2) !important;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          z-index: 50;
        }
        .modal-content {
          max-height: 80vh;
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .modal-content::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="mb-6 inline-block"
      >
        <Button
          onClick={() => router.push("/teacher/courses")}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg px-8 py-3 shadow-lg cursor-pointer"
        >
          Back to Courses
        </Button>
      </motion.div>

      <div className="max-w-4xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h1 className="text-4xl font-extrabold text-indigo-900 mb-6">
            {course.title}
          </h1>
          <div className="flex flex-wrap gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center bg-gradient-to-r from-blue-100 to-indigo-100 px-4 py-2 rounded-full text-sm text-blue-700 shadow-sm"
            >
              <Target className="w-4 h-4 mr-2 text-blue-600" />
              <span className="font-semibold">{course.targetAudience}</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center bg-gradient-to-r from-blue-100 to-indigo-100 px-4 py-2 rounded-full text-sm text-blue-700 shadow-sm"
            >
              <Clock className="w-4 h-4 mr-2 text-blue-600" />
              <span className="font-semibold">
                {isScheduled
                  ? `${scheduledCalls?.schedule.scheduleDuration} (${
                      scheduledCalls?.calls[0]?.timezone || "N/A"
                    })`
                  : course.duration}
              </span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center bg-gradient-to-r from-blue-100 to-indigo-100 px-4 py-2 rounded-full text-sm text-blue-700 shadow-sm"
            >
              <User className="w-4 h-4 mr-2 text-blue-600" />
              <span className="font-semibold">
                Created by: {course.createdBy.name}
              </span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center bg-gradient-to-r from-blue-100 to-indigo-100 px-4 py-2 rounded-full text-sm text-blue-700 shadow-sm"
            >
              <Calendar className="w-4 h-4 mr-2 text-blue-600" />
              <span className="font-semibold">
                Created:{" "}
                {new Date(course.createdAt).toLocaleDateString("en-GB")}
              </span>
            </motion.div>
          </div>

          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-1 bg-gradient-to-b from-pink-500 to-indigo-500 rounded-full"></div>
            {course.chapters && course.chapters.length > 0 ? (
              course.chapters.map((chapter, chapterIndex) => {
                const IconComponent =
                  timelineIcons[chapterIndex % timelineIcons.length];
                return (
                  <div key={chapterIndex} className="relative mb-12">
                    <div className="flex items-center gap-3 mb-4">
                      <motion.div
                        whileHover={{ scale: 1.2, rotate: 360 }}
                        transition={{ duration: 0.5 }}
                        className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center shadow-md"
                      >
                        <IconComponent className="w-5 h-5 text-white" />
                      </motion.div>
                      <h2 className="text-xl font-bold text-white bg-gradient-to-r from-yellow-400 to-orange-400 px-3 py-1 rounded-md">
                        {chapter.title}
                      </h2>
                    </div>
                    <div className="ml-16 w-full">
                      {chapter.lessons.length > 0 ? (
                        <Card className="bg-gradient-to-r from-white to-indigo-50 p-6 rounded-xl shadow-md border border-indigo-100">
                          <CardContent className="p-0">
                            <div className="flex justify-end mb-4">
                              <span className="text-sm font-medium text-gray-500">
                                <b>Total lessons: {chapter.lessons.length}</b>
                              </span>
                            </div>
                            <ul className="space-y-6">
                              {chapter.lessons.map((lesson, lessonIndex) => {
                                const scheduledCall =
                                  scheduledCalls?.calls.find(
                                    (call) => call.lessonId === lesson.lessonId
                                  );
                                const isCompleted =
                                  scheduledCall?.status.toLowerCase() ===
                                  "completed";
                                const isCancelled =
                                  scheduledCall?.status.toLowerCase() ===
                                  "cancelled";

                                return (
                                  <motion.li
                                    key={lessonIndex}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: lessonIndex * 0.1 }}
                                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300"
                                  >
                                    {isScheduled && scheduledCall && (
                                      <div className="flex justify-end mb-2">
                                        <span
                                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(
                                            scheduledCall.status
                                          )}`}
                                        >
                                          {isCompleted && (
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                          )}
                                          {scheduledCall.status}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <span className="w-3 h-3 bg-indigo-500 rounded-full"></span>
                                        <span className="text-lg font-semibold text-gray-800">
                                          {lesson.title}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        {isScheduled &&
                                          scheduledCall &&
                                          !isCompleted &&
                                          !isCancelled && (
                                            <span className="bg-indigo-100 text-indigo-800 text-sm font-medium px-3 py-1 rounded-full shadow-sm">
                                              {formatTime(
                                                scheduledCall.startTime
                                              )}{" "}
                                              –{" "}
                                              {formatTime(
                                                scheduledCall.endTime
                                              )}
                                            </span>
                                          )}
                                        {isScheduled &&
                                          scheduledCall &&
                                          !isCompleted &&
                                          !isCancelled && (
                                            <Button
                                              onClick={() =>
                                                handleJoinMeeting(scheduledCall)
                                              }
                                              className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg px-4 py-1 text-sm cursor-pointer"
                                            >
                                              <Video className="w-4 h-4 mr-1" />
                                              Join
                                            </Button>
                                          )}
                                        <motion.div
                                          animate={{
                                            rotate: openLessons[
                                              `${chapterIndex}-${lessonIndex}`
                                            ]
                                              ? 360
                                              : 0,
                                          }}
                                          transition={{ duration: 0.3 }}
                                          onClick={() =>
                                            toggleLesson(
                                              chapterIndex,
                                              lessonIndex
                                            )
                                          }
                                          className="cursor-pointer flex items-center justify-center w-6 h-6"
                                        >
                                          {openLessons[
                                            `${chapterIndex}-${lessonIndex}`
                                          ] ? (
                                            <ChevronUp className="w-5 h-5 text-indigo-600" />
                                          ) : (
                                            <ChevronDown className="w-5 h-5 text-indigo-600" />
                                          )}
                                        </motion.div>
                                      </div>
                                    </div>

                                    <div className="flex justify-between items-center mt-3">
                                      <div className="flex gap-4 items-center">
                                        {lesson.resources &&
                                          lesson.resources.length > 0 && (
                                            <>
                                              <motion.a
                                                href="#"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  handleViewLesson(lesson);
                                                }}
                                                className="flex items-center gap-1 text-sm text-gray-500 hover:text-orange-600 hover:underline transition-all duration-300"
                                                whileHover={{ x: 5 }}
                                              >
                                                <BookOpen className="w-4 h-4" />
                                                View Lesson
                                              </motion.a>
                                              <motion.a
                                                href="#"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  handleDownloadLesson(lesson);
                                                }}
                                                className="flex items-center gap-1 text-sm text-gray-500 hover:text-orange-600 hover:underline transition-all duration-300"
                                                whileHover={{ x: -5 }}
                                              >
                                                <Download className="w-4 h-4" />
                                                Download Lesson
                                              </motion.a>
                                            </>
                                          )}
                                        {(!isScheduled ||
                                          (isScheduled &&
                                            scheduledCall &&
                                            ![
                                              "completed",
                                              "cancelled",
                                            ].includes(
                                              scheduledCall.status.toLowerCase()
                                            ))) && (
                                          <motion.a
                                            href="#"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              handleAddWorksheet(lesson);
                                            }}
                                            className="flex items-center gap-1 text-sm text-gray-500 hover:text-orange-600 hover:underline transition-all duration-300"
                                            whileHover={{ x: -5 }}
                                          >
                                            <FilePlus className="w-4 h-4" />
                                            Add Worksheet
                                          </motion.a>
                                        )}
                                        {(lesson.worksheets.length > 0 ||
                                          (isScheduled && scheduledCall)) && (
                                          <motion.a
                                            href="#"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              handleViewWorksheets(
                                                courseId as string,
                                                lesson
                                              );
                                            }}
                                            className="flex items-center gap-1 text-sm text-gray-500 hover:text-orange-600 hover:underline transition-all duration-300"
                                            whileHover={{ x: -5 }}
                                          >
                                            <FileText className="w-4 h-4" />
                                            View Worksheets
                                          </motion.a>
                                        )}
                                      </div>
                                    </div>

                                    <AnimatePresence>
                                      {openLessons[
                                        `${chapterIndex}-${lessonIndex}`
                                      ] && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{
                                            height: "auto",
                                            opacity: 1,
                                          }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{
                                            duration: 0.4,
                                            ease: "easeInOut",
                                          }}
                                          className="mt-4 ml-6"
                                        >
                                          {lesson.learningGoals &&
                                            lesson.learningGoals.length > 0 && (
                                              <div>
                                                <p className="text-sm font-semibold text-indigo-700 mb-2">
                                                  Learning Goals:
                                                </p>
                                                <ul className="list-disc list-inside text-sm text-gray-600 space-y-2">
                                                  {lesson.learningGoals.map(
                                                    (goal, goalIndex) => (
                                                      <li
                                                        key={goalIndex}
                                                        className="pl-2"
                                                      >
                                                        {goal}
                                                      </li>
                                                    )
                                                  )}
                                                </ul>
                                              </div>
                                            )}
                                          {isScheduled &&
                                            scheduledCall &&
                                            !isCompleted &&
                                            !isCancelled && (
                                              <div className="flex gap-4 mt-4">
                                                <Button
                                                  onClick={() =>
                                                    handleReschedule(
                                                      scheduledCall
                                                    )
                                                  }
                                                  className="bg-green-500 hover:bg-green-600 text-white rounded-lg px-4 py-1 text-sm cursor-pointer"
                                                >
                                                  Reschedule
                                                </Button>
                                                <Button
                                                  onClick={() =>
                                                    handleCancel(scheduledCall)
                                                  }
                                                  className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 py-1 text-sm cursor-pointer"
                                                >
                                                  Cancel
                                                </Button>
                                              </div>
                                            )}
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                    {isScheduled && scheduledCall && (
                                      <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="inline-flex items-center bg-gradient-to-r from-blue-100 to-indigo-100 px-4 py-2 rounded-full text-sm text-blue-700 shadow-sm mt-4 ml-6"
                                      >
                                        <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                                        <span className="font-semibold">
                                          {formatDate(scheduledCall.date)}
                                        </span>
                                      </motion.div>
                                    )}
                                  </motion.li>
                                );
                              })}
                            </ul>
                          </CardContent>
                        </Card>
                      ) : (
                        <p className="text-gray-600 text-sm">
                          No lessons available.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-600 text-sm">No chapters available.</p>
            )}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {isAddWorksheetModalOpen && selectedLesson && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setIsAddWorksheetModalOpen(false)}
          >
            <motion.div
              className="modal-content fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-[640px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8"
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                className="flex justify-between items-center mb-6"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                  Add Worksheet: {selectedLesson.title}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAddWorksheetModalOpen(false);
                    setSelectedFile(null);
                    setSelectedFileType(undefined);
                    setSelectionMode(undefined);
                  }}
                  className="hover:bg-indigo-100 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </Button>
              </motion.div>
              <div className="space-y-6">
                <div>
                  <Label className="text-sm font-semibold text-gray-800">
                    Select File Type
                  </Label>
                  <div className="grid grid-cols-5 gap-3 mt-3">
                    {fileTypes.map(({ type, icon: Icon, label }) => (
                      <motion.div
                        key={type}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`flex flex-col items-center p-3 rounded-xl border cursor-pointer transition-all duration-300 ${
                          selectedFileType === type
                            ? "border-indigo-500 bg-indigo-50 shadow-md"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                        onClick={() => {
                          setSelectedFileType(type);
                          setSelectedFile(null); // Clear local file selection
                          setSelectedDriveFile(null); // Clear drive file selection
                          setSelectionMode(undefined); // Reset selection mode
                        }}
                      >
                        <Icon className="w-8 h-8 text-indigo-600" />
                        <span className="mt-2 text-xs font-medium text-gray-700">
                          {label}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Selection Mode Toggle (Only shown after file type is selected) */}
                {selectedFileType && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Label className="text-sm font-semibold text-gray-800">
                      Select Source
                    </Label>
                    <div className="flex mt-3 gap-4 bg-gray-100 rounded-full p-1">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all duration-300 ${
                          selectionMode === "local"
                            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                            : "text-gray-700 hover:bg-gray-200"
                        }`}
                        onClick={() => {
                          setSelectionMode("local");
                          setSelectedFile(null);
                          setSelectedDriveFile(null);
                        }}
                      >
                        <Upload className="w-4 h-4 inline mr-2" />
                        Upload from Local
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all duration-300 ${
                          selectionMode === "drive"
                            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                            : "text-gray-700 hover:bg-gray-200"
                        }`}
                        onClick={() => {
                          setSelectionMode("drive");
                          setSelectedFile(null);
                          setSelectedDriveFile(null);
                          fetchDriveFiles(
                            selectedFileType === "pdf" ||
                              selectedFileType === "doc" ||
                              selectedFileType === "ppt"
                              ? process.env.GOOGLE_DRIVE_DOCUMENT_FOLDER_ID ||
                                  ""
                              : selectedFileType === "image"
                              ? process.env.GOOGLE_DRIVE_DOCUMENT_FOLDER_ID ||
                                ""
                              : process.env.GOOGLE_COURSE_FOLDER_ID || "",
                            selectedFileType
                          );
                          setIsDriveFilesModalOpen(true);
                        }}
                      >
                        <Folder className="w-4 h-4 inline mr-2" />
                        Select from Google Drive
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* Local Upload Section */}
                <AnimatePresence>
                  {selectionMode === "local" && selectedFileType && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Label
                        htmlFor="worksheetFile"
                        className="text-sm font-semibold text-gray-800"
                      >
                        Upload Worksheet
                      </Label>
                      <motion.div
                        className="mt-3"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div
                          className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-300 ${
                            selectedFile
                              ? "border-indigo-500 bg-indigo-50"
                              : "border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50"
                          }`}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.currentTarget.style.borderColor = "#6366f1";
                            e.currentTarget.style.backgroundColor =
                              "rgba(99, 102, 241, 0.1)";
                          }}
                          onDragLeave={(e) => {
                            e.currentTarget.style.borderColor = selectedFile
                              ? "#6366f1"
                              : "#d1d5db";
                            e.currentTarget.style.backgroundColor = selectedFile
                              ? "rgba(99, 102, 241, 0.1)"
                              : "transparent";
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (
                              e.dataTransfer.files &&
                              e.dataTransfer.files[0]
                            ) {
                              const file = e.dataTransfer.files[0];
                              if (selectedFileType) {
                                const validTypes: Record<FileType, string[]> = {
                                  pdf: ["application/pdf"],
                                  doc: [
                                    "application/msword",
                                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                                  ],
                                  ppt: [
                                    "application/vnd.ms-powerpoint",
                                    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                                  ],
                                  image: ["image/jpeg", "image/png"],
                                  other: [],
                                };
                                if (
                                  validTypes[selectedFileType].length === 0 ||
                                  validTypes[selectedFileType].includes(
                                    file.type
                                  )
                                ) {
                                  setSelectedFile(file);
                                } else {
                                  toast.error(
                                    `Invalid file type for ${selectedFileType}`
                                  );
                                }
                              } else {
                                setSelectedFile(file);
                              }
                            }
                            e.currentTarget.style.borderColor = "#6366f1";
                            e.currentTarget.style.backgroundColor =
                              "rgba(99, 102, 241, 0.1)";
                          }}
                        >
                          <input
                            id="worksheetFile"
                            type="file"
                            accept={
                              selectedFileType
                                ? selectedFileType === "pdf"
                                  ? ".pdf"
                                  : selectedFileType === "doc"
                                  ? ".doc,.docx"
                                  : selectedFileType === "ppt"
                                  ? ".ppt,.pptx"
                                  : selectedFileType === "image"
                                  ? ".jpg,.jpeg,.png"
                                  : "*"
                                : "*"
                            }
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setSelectedFile(e.target.files[0]);
                              }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="flex flex-col items-center">
                            <motion.div
                              animate={{ y: [0, -10, 0] }}
                              transition={{
                                repeat: Infinity,
                                duration: 2,
                              }}
                            >
                              <FilePlus className="w-12 h-12 text-indigo-600" />
                            </motion.div>
                            <p className="mt-3 text-sm font-medium text-gray-700">
                              {selectedFile
                                ? selectedFile.name
                                : "Drag & drop your file here or click to browse"}
                            </p>
                            {selectedFile && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mt-3 flex items-center gap-2 bg-white/80 p-2 rounded-lg shadow-sm"
                              >
                                <span className="text-xs text-gray-600 truncate max-w-[200px]">
                                  {selectedFile.name}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedFile(null)}
                                  className="p-1 hover:bg-red-100"
                                >
                                  <X className="w-4 h-4 text-red-600" />
                                </Button>
                              </motion.div>
                            )}
                            <p className="mt-2 text-xs text-gray-500">
                              {selectedFileType
                                ? `Accepted: ${selectedFileType.toUpperCase()} files`
                                : "Any file type accepted"}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action Buttons */}
                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddWorksheetModalOpen(false);
                      setSelectedFile(null);
                      setSelectedFileType(undefined);
                      setSelectionMode(undefined);
                    }}
                    className="border-indigo-600 text-indigo-600 hover:bg-indigo-100 rounded-xl px-4 py-2 text-sm font-medium cursor-pointer"
                  >
                    Cancel
                  </Button>
                  {selectionMode === "local" && (
                    <Button
                      type="button"
                      onClick={() =>
                        handleWorksheetUpload(
                          courseId as string,
                          selectedLesson.lessonId
                        )
                      }
                      disabled={!selectedFile || !selectedFileType}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FilePlus className="w-4 h-4 mr-2" />
                      Upload Worksheet
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDriveFilesModalOpen && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setIsDriveFilesModalOpen(false)}
          >
            <motion.div
              className="modal-content fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-[600px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8"
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                className="flex justify-between items-center mb-6"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                  Select File from Google Drive
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsDriveFilesModalOpen(false);
                    setSelectedDriveFile(null); // Clear selection on close
                  }}
                  className="hover:bg-indigo-100 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </Button>
              </motion.div>

              {/* Display Selected File */}
              {selectedDriveFile && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mb-6 p-4 bg-indigo-50 rounded-lg shadow-sm border border-indigo-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-indigo-600" />
                      <div>
                        <p className="text-sm font-semibold text-gray-800 truncate max-w-[300px]">
                          {selectedDriveFile.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {selectedDriveFile.mimeType
                            .split("/")
                            .pop()
                            ?.toUpperCase() || "File"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDriveFile(null)} // Clear selected file
                      className="hover:bg-red-100 rounded-full cursor-pointer"
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                  <Button
                    onClick={() => handleSelectDriveFile(selectedDriveFile)}
                    className="mt-4 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300"
                  >
                    <FilePlus className="w-4 h-4 mr-2" />
                    Confirm Selection
                  </Button>
                </motion.div>
              )}

              {/* File List */}
              {isFetchingDriveFiles ? (
                <div className="flex items-center justify-center py-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="h-8 w-8 text-indigo-600"
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
              ) : driveFiles.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 max-h-80 overflow-y-auto no-scrollbar">
                  {driveFiles.map((file) => {
                    const Icon =
                      fileTypes.find((ft) => file.mimeType.includes(ft.type))
                        ?.icon || File;
                    return (
                      <motion.div
                        key={file.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`bg-white p-4 rounded-lg shadow-sm border cursor-pointer transition-all duration-300 ${
                          file.isFolder
                            ? "border-blue-200 bg-blue-50"
                            : selectedDriveFile?.id === file.id
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-gray-100"
                        }`}
                        onClick={() => {
                          if (file.isFolder) {
                            fetchDriveFiles(file.id, selectedFileType);
                          } else {
                            setSelectedDriveFile(file);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-6 h-6 text-indigo-600" />
                          <div>
                            <p className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {file.isFolder
                                ? "Folder"
                                : file.mimeType
                                    .split("/")
                                    .pop()
                                    ?.toUpperCase() || "File"}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-600 text-sm text-center">
                  No files or folders found in Google Drive.
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isViewWorksheetsModalOpen && selectedLesson && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setIsViewWorksheetsModalOpen(false)}
          >
            <motion.div
              className="modal-content fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-[640px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 mx-auto"
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                className="flex justify-between items-center mb-6"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                  Worksheets: {selectedLesson.title}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsViewWorksheetsModalOpen(false)}
                  className="hover:bg-gray-100 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </Button>
              </motion.div>

              <div className="space-y-4">
                {worksheets.length > 0 ? (
                  <ul className="space-y-3 max-h-80 overflow-y-auto no-scrollbar">
                    {worksheets.map((worksheet) => (
                      <motion.li
                        key={worksheet.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm border border-gray-100"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-indigo-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-800 truncate max-w-[300px]">
                              {worksheet.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              Uploaded by {worksheet.uploadedBy} on{" "}
                              {format(
                                new Date(worksheet.uploadedAt),
                                "dd/MM/yyyy"
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              let downloadUrl = worksheet.url;
                              if (worksheet.url.includes("drive.google.com")) {
                                downloadUrl = transformGoogleDriveUrlToDownload(
                                  worksheet.url
                                );
                              }
                              const link = document.createElement("a");
                              link.href = downloadUrl;
                              link.download = worksheet.name;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="border-indigo-600 text-indigo-600 hover:bg-indigo-100 rounded-lg px-3 py-1"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedWorksheet(worksheet);
                              setIsDeleteWorksheetModalOpen(true);
                            }}
                            className="border-red-600 text-red-600 hover:bg-red-100 rounded-lg px-3 py-1"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600 text-sm text-center">
                    No worksheets available for this lesson.
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedDocument && (
          <DocumentPopup
            isOpen={!!selectedDocument}
            onClose={() => setSelectedDocument(null)}
            topic={selectedDocument.topic}
            documentUrl={selectedDocument.documentUrl}
            documentType={selectedDocument.documentType}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDeleteWorksheetModalOpen && selectedWorksheet && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setIsDeleteWorksheetModalOpen(false)}
          >
            <motion.div
              className="modal-content fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-[400px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl mx-auto p-6"
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                className="flex justify-between items-center mb-4"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="text-xl font-semibold text-gray-900">
                  Confirm Worksheet Deletion
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDeleteWorksheetModalOpen(false)}
                  className="hover:bg-indigo-100 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </Button>
              </motion.div>
              <motion.p
                className="text-gray-600 mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Are you sure you want to delete the worksheet &quot;
                {selectedWorksheet.name}&quot; from &quot;
                {selectedLesson?.title}&quot;?
              </motion.p>
              <motion.div
                className="flex justify-end gap-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDeleteWorksheetModalOpen(false)}
                  className="border-indigo-600 text-indigo-600 hover:bg-indigo-100 rounded-xl px-3 py-1.5 text-sm font-medium cursor-pointer"
                >
                  Keep Worksheet
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    handleDeleteWorksheet(
                      courseId as string,
                      selectedLesson?.lessonId as string,
                      selectedWorksheet.id
                    )
                  }
                  className="bg-red-600 text-white hover:bg-red-700 rounded-xl px-4 py-1.5 text-sm font-medium cursor-pointer"
                >
                  Delete Worksheet
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isRescheduleModalOpen && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setIsRescheduleModalOpen(false)}
          >
            <motion.div
              className="modal-content fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-[600px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8"
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                className="flex justify-between items-center mb-6"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                  Reschedule: {selectedCall?.lessonTitle}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsRescheduleModalOpen(false)}
                  className="hover:bg-indigo-100 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </Button>
              </motion.div>
              <p className="text-gray-600 mb-6">
                Update the schedule details for this lesson.
              </p>
              <form onSubmit={handleRescheduleSubmit} className="space-y-6">
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Label
                    htmlFor="classType"
                    className="text-sm font-semibold text-gray-800"
                  >
                    Meeting Name (Optional)
                  </Label>
                  <motion.div
                    whileFocus={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                    className="relative mt-2"
                  >
                    <Input
                      id="classType"
                      name="classType"
                      value={rescheduleFormData.classType}
                      onChange={handleInputChange}
                      placeholder="Enter meeting name"
                      className="p-3 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white/50 transition-all duration-300"
                    />
                    <AnimatePresence>
                      {formErrors.classType && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-red-500 text-xs mt-1"
                        >
                          {formErrors.classType}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
                <motion.div
                  className="flex items-center justify-between"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Label
                    htmlFor="useExistingLink"
                    className="text-sm font-semibold text-gray-800"
                  >
                    Use Existing Meeting Link
                  </Label>
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.2 }}
                    className="cursor-pointer"
                  >
                    <div
                      className={`custom-toggle ${
                        rescheduleFormData.useExistingLink ? "checked" : ""
                      }`}
                      onClick={() =>
                        handleSwitchChange("useExistingLink")(
                          !rescheduleFormData.useExistingLink
                        )
                      }
                    >
                      <div className="handle">
                        {rescheduleFormData.useExistingLink ? "ON" : "OFF"}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
                <AnimatePresence>
                  {!rescheduleFormData.useExistingLink && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Label
                        htmlFor="meetingType"
                        className="text-sm font-semibold text-gray-800"
                      >
                        Meeting Type
                      </Label>
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                        className="mt-2"
                      >
                        <Select
                          name="meetingType"
                          value={rescheduleFormData.meetingType}
                          onValueChange={handleSelectChange("meetingType")}
                        >
                          <SelectTrigger className="p-3 w-full border border-gray-200 rounded-xl bg-white/50 focus:ring-2 focus:ring-indigo-500 transition-all duration-300 cursor-pointer">
                            <SelectValue placeholder="Select meeting type" />
                          </SelectTrigger>
                          <SelectContent className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg">
                            <SelectItem
                              value="zoom"
                              className="hover:bg-indigo-50 transition-colors cursor-pointer"
                            >
                              Zoom Meeting
                            </SelectItem>
                            <SelectItem
                              value="external"
                              className="hover:bg-indigo-50 transition-colors cursor-pointer"
                            >
                              External Meetings (Google Meet, Zoho, etc.)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {!rescheduleFormData.useExistingLink &&
                    rescheduleFormData.meetingType === "zoom" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Label
                          htmlFor="zoomLink"
                          className="text-sm font-semibold text-gray-800"
                        >
                          Zoom Meeting Link
                        </Label>
                        <motion.div
                          whileFocus={{ scale: 1.02 }}
                          transition={{ duration: 0.2 }}
                          className="relative mt-2"
                        >
                          <Input
                            id="zoomLink"
                            name="zoomLink"
                            value={rescheduleFormData.zoomLink}
                            onChange={handleInputChange}
                            placeholder="🔗 Paste Zoom meeting link"
                            className="p-3 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white/50 transition-all duration-300"
                          />
                          <AnimatePresence>
                            {formErrors.zoomLink && (
                              <motion.p
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-red-500 text-xs mt-1"
                              >
                                {formErrors.zoomLink}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      </motion.div>
                    )}
                  {!rescheduleFormData.useExistingLink &&
                    rescheduleFormData.meetingType === "external" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Label
                          htmlFor="meetingLink"
                          className="text-sm font-semibold text-gray-800"
                        >
                          External Meeting Link
                        </Label>
                        <motion.div
                          whileFocus={{ scale: 1.02 }}
                          transition={{ duration: 0.2 }}
                          className="relative mt-2"
                        >
                          <Input
                            id="meetingLink"
                            name="meetingLink"
                            value={rescheduleFormData.meetingLink}
                            onChange={handleInputChange}
                            placeholder="🔗 Paste external meeting link"
                            className="p-3 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white/50 transition-all duration-300"
                          />
                          <AnimatePresence>
                            {formErrors.meetingLink && (
                              <motion.p
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-red-500 text-xs mt-1"
                              >
                                {formErrors.meetingLink}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      </motion.div>
                    )}
                </AnimatePresence>
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <Label
                    htmlFor="startDate"
                    className="text-sm font-semibold text-gray-800"
                  >
                    Start Date
                  </Label>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                    className="relative mt-2"
                  >
                    <Popover
                      open={isCalendarOpen}
                      onOpenChange={setIsCalendarOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal p-3 h-12 border border-gray-200 rounded-xl bg-white/50 hover:bg-white/70 focus:ring-2 focus:ring-indigo-500 transition-all duration-300 cursor-pointer",
                            !rescheduleFormData.startDate && "text-gray-500"
                          )}
                        >
                          <CalendarCheck className="mr-2 h-4 w-4 text-indigo-600" />
                          {rescheduleFormData.startDate
                            ? moment(rescheduleFormData.startDate).format(
                                "MMMM D, YYYY"
                              )
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
                            selected={
                              rescheduleFormData.startDate
                                ? moment(rescheduleFormData.startDate).toDate()
                                : undefined
                            }
                            onSelect={handleDateChange}
                            disabled={(date) =>
                              moment(date).isBefore(moment(), "day")
                            }
                            initialFocus
                            className="rounded-xl"
                            components={{
                              DayContent: ({ date }) => (
                                <div
                                  className={cn(
                                    "p-2 text-center cursor-pointer",
                                    rescheduleFormData.startDate &&
                                      format(
                                        moment(
                                          rescheduleFormData.startDate
                                        ).toDate(),
                                        "yyyy-MM-dd"
                                      ) === format(date, "yyyy-MM-dd")
                                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full"
                                      : "hover:bg-indigo-100"
                                  )}
                                >
                                  {date.getDate()}
                                </div>
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
                          className="text-red-500 text-xs mt-1"
                        >
                          {formErrors.startDate}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </motion.div>
                <motion.div
                  className="flex flex-col md:flex-row gap-4"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="flex-1">
                    <Label
                      htmlFor="timezone"
                      className="text-sm font-semibold text-gray-800"
                    >
                      Timezone
                    </Label>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                      className="mt-2"
                    >
                      <Select
                        name="timezone"
                        value={rescheduleFormData.timezone}
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
                        <SelectContent className="bg-white/95 backdrop-blur rounded-xl shadow-lg max-h-80 no-scrollbar">
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
                                className="w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 bg-white/50 transition-all duration-200 timezone-search-input"
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
                                      handleSelectChange("timezone")(
                                        filteredTimezones[0]
                                      );
                                    }
                                  }
                                }}
                                autoFocus
                              />
                              {timezoneSearch && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleClearSearch();
                                    setTimeout(() => {
                                      document
                                        .getElementById("timezone-search-input")
                                        ?.focus();
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
                                <SelectItem
                                  key={tz}
                                  value={tz}
                                  className="hover:bg-indigo-50 transition-colors duration-200 cursor-pointer py-2.5 px-4 timezone-item"
                                >
                                  <div className="flex items-center justify-between">
                                    <span>{tz}</span>
                                    <span className="text-xs text-gray-500">
                                      {moment().tz(tz).format("Z")}
                                    </span>
                                  </div>
                                </SelectItem>
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
                            className="text-red-500 text-xs mt-1"
                          >
                            {formErrors.timezone}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm font-semibold text-gray-800">
                      Start Time
                    </Label>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                      className="mt-2"
                    >
                      <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <TimePicker
                          value={
                            rescheduleFormData.startTime
                              ? dayjs(rescheduleFormData.startTime, "HH:mm")
                              : null
                          }
                          onChange={handleTimeChange}
                          format="hh:mm A"
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              variant: "outlined",
                              placeholder: "Select start time",
                              InputProps: {
                                style: {
                                  borderRadius: "12px",
                                  backgroundColor: "rgba(255, 255, 255, 0.5)",
                                  border: "1px solid #e5e7eb",
                                  padding: "12px 16px",
                                  height: "48px",
                                  fontSize: "0.875rem",
                                },
                              },
                            },
                            popper: {
                              sx: {
                                "& .MuiPaper-root": {
                                  background: "rgba(255, 255, 255, 0.95)",
                                  backdropFilter: "blur(8px)",
                                  borderRadius: "12px",
                                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
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
                            className="text-red-500 text-xs mt-1"
                          >
                            {formErrors.startTime}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </div>
                </motion.div>
                <motion.div
                  className="flex justify-end gap-4"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsRescheduleModalOpen(false)}
                    className="border-indigo-600 text-indigo-600 hover:bg-indigo-100 rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-300 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl px-4 py-1.5 text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 cursor-pointer"
                  >
                    <CalendarCheck className="w-4 h-4 mr-2" />
                    Save Schedule
                  </Button>
                </motion.div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCancelModalOpen && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setIsCancelModalOpen(false)}
          >
            <motion.div
              className="modal-content fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-[400px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl mx-auto p-6"
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                className="flex justify-between items-center mb-4"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="text-xl font-semibold text-gray-900">
                  Confirm Cancellation
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="hover:bg-indigo-100 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </Button>
              </motion.div>
              <motion.p
                className="text-gray-600 mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Are you sure you want to cancel the schedule for &quot;
                {selectedCall?.lessonTitle}&quot; on{" "}
                {selectedCall && formatDate(selectedCall.date)} at{" "}
                {selectedCall && formatTime(selectedCall.startTime)}?
              </motion.p>
              <motion.div
                className="flex justify-end gap-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="border-indigo-600 text-indigo-600 hover:bg-indigo-100 rounded-xl px-3 py-1.5 text-sm font-medium cursor-pointer"
                >
                  Keep Schedule
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmCancel}
                  className="bg-red-600 text-white hover:bg-red-700 rounded-xl px-4 py-1.5 text-sm font-medium cursor-pointer"
                >
                  Cancel Schedule
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
