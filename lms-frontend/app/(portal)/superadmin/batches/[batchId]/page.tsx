// "use client";

// import { useCallback, useEffect, useState } from "react";
// import { useRouter, useParams } from "next/navigation";
// import { motion, AnimatePresence } from "framer-motion";
// import {
//   ChevronDown,
//   ChevronUp,
//   Clock,
//   Target,
//   User,
//   Calendar,
//   Book,
//   Film,
//   PenTool,
//   Mic,
//   Headphones,
//   BookOpen,
//   Download,
//   Video,
//   CheckCircle,
//   Mail,
//   Phone,
//   GraduationCap,
//   X,
//   ArrowLeft,
//   Users,
//   PlayCircle,
//   FileText,
//   Award,
//   Sparkles,
//   Star,
//   Zap,
// } from "lucide-react";
// import { Card, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { useAuth } from "@/lib/auth";
// import api from "@/lib/api";
// import toast from "react-hot-toast";
// import type { ApiError } from "@/types";
// import DocumentPopup from "@/components/DocumentPopup";
// import Image from "next/image";

// interface Teacher {
//   _id: string;
//   name: string;
//   email: string;
//   phone: string;
//   subjects: string[];
//   profileImage?: string;
// }

// interface Resource {
//   name: string;
//   url: string;
// }

// interface Worksheet {
//   id: string;
//   type: string;
//   url: string;
//   fileId: string;
//   name: string;
//   uploadedBy: string;
//   uploadedAt: string;
// }

// interface Lesson {
//   lessonId: string;
//   title: string;
//   format: string;
//   resources: Resource[];
//   learningGoals: string[];
//   worksheets: Worksheet[];
// }

// interface Chapter {
//   title: string;
//   lessons: Lesson[];
// }

// interface Course {
//   _id: string;
//   courseId: string;
//   courseTitle: string;
//   title: string;
//   targetAudience: string;
//   duration: string;
//   createdBy: { name: string };
//   createdAt: string;
//   lastUpdatedAt?: string;
//   chapters: Chapter[];
//   assignedTeachers: Teacher[];
// }

// interface ScheduledCall {
//   lessonTitle: string;
//   date: string;
//   startTime: string;
//   endTime: string;
//   days: string[];
//   repeat: boolean;
//   status: string;
//   timezone: string;
//   type: string;
//   zoomLink?: string;
//   meetingLink?: string;
//   lessonId: string;
//   _id: string;
//   classType: string;
//   previousDate?: string;
//   previousStartTime?: string;
//   previousEndTime?: string;
//   callDuration?: string;
// }

// interface ScheduleResponse {
//   calls: ScheduledCall[];
//   schedule: {
//     scheduleStatus: string;
//     scheduleDuration: string;
//   };
// }

// interface SelectedDocument {
//   topic: string;
//   documentUrl: string;
//   documentType: string;
// }

// const timelineIcons = [Book, Film, PenTool, Mic, Headphones];

// export default function CourseDetails() {
//   const { user, loading: authLoading } = useAuth();
//   const router = useRouter();
//   const { batchId } = useParams();

//   const [course, setCourse] = useState<Course | null>(null);
//   const [courseId, setCourseId] = useState<string | null>(null);
//   const [scheduledCalls, setScheduledCalls] = useState<ScheduleResponse | null>(
//     null
//   );
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [openLessons, setOpenLessons] = useState<{ [key: string]: boolean }>(
//     {}
//   );
//   const [selectedDocument, setSelectedDocument] =
//     useState<SelectedDocument | null>(null);
//   const [isTeachersModalOpen, setIsTeachersModalOpen] = useState(false);

//   const handleUnauthorized = useCallback(() => {
//     console.debug("[CourseDetails] Handling unauthorized access");
//     localStorage.removeItem("token");
//     localStorage.removeItem("userId");
//     localStorage.removeItem("isLoggedIn");
//     localStorage.removeItem("deviceId");
//     toast.error("Session expired. Please log in again.");
//     router.push("/login");
//   }, [router]);

//   const fetchCourseAndSchedule = useCallback(async () => {
//     if (!user) {
//       handleUnauthorized();
//       return;
//     }

//     if (!batchId) {
//       setError("No batch ID provided");
//       setLoading(false);
//       return;
//     }

//     setLoading(true);
//     setError(null);
//     try {
//       const deviceId = localStorage.getItem("deviceId");
//       const token = localStorage.getItem("token");
//       if (!deviceId || !token) {
//         console.debug("[CourseDetails] Missing deviceId or token", {
//           deviceId,
//           token,
//         });
//         handleUnauthorized();
//         return;
//       }

//       const scheduleResponse = await api.get(
//         `/schedule/batch/${batchId}/calls`
//       );
//       const batchData = scheduleResponse.data.batch;
//       if (!batchData) throw new Error("Batch data not found in response");

//       const fetchedCourseId = batchData.courseId;
//       if (!fetchedCourseId)
//         throw new Error("Course ID not found in batch data");
//       setCourseId(fetchedCourseId);

//       const courseResponse = await api.get(`/courses/${fetchedCourseId}`);
//       const teachersResponse = await api.get(
//         `/courses/course/${fetchedCourseId}/assigned-teachers`
//       );
//       const courseData: Course = {
//         ...courseResponse.data,
//         chapters: courseResponse.data.chapters || [],
//         assignedTeachers: Array.isArray(teachersResponse.data.assignedTeachers)
//           ? teachersResponse.data.assignedTeachers
//           : [],
//       };
//       if (!courseData) throw new Error("Course data is empty or undefined");

//       const processedCourseData: Course = {
//         ...courseData,
//         chapters: courseData.chapters.map((chapter: Chapter) => {
//           if (!chapter.lessons || !Array.isArray(chapter.lessons)) {
//             console.warn(
//               `Lessons for chapter "${
//                 chapter.title || "Untitled"
//               }" is undefined or not an array, initializing as empty array`
//             );
//             return { ...chapter, lessons: [] };
//           }

//           return {
//             ...chapter,
//             lessons: chapter.lessons.map((lesson: Lesson) => {
//               lesson.worksheets = lesson.worksheets || [];
//               const updatedWorksheets = lesson.worksheets.map(
//                 (ws: Worksheet) => ({
//                   id: ws.id || ws.fileId,
//                   type: ws.type,
//                   url: ws.url,
//                   fileId: ws.fileId,
//                   name: ws.name,
//                   uploadedBy: ws.uploadedBy,
//                   uploadedAt: ws.uploadedAt,
//                 })
//               );
//               return {
//                 ...lesson,
//                 worksheets: updatedWorksheets,
//               };
//             }),
//           };
//         }),
//       };

//       const transformedCalls = (batchData.calls || []).map(
//         (call: ScheduledCall) => ({
//           ...call,
//           scheduleId: call._id,
//         })
//       );

//       let updatedCourseData: Course = { ...processedCourseData };

//       for (const call of transformedCalls) {
//         try {
//           const lessonExists = updatedCourseData.chapters.some((chapter) =>
//             chapter.lessons.some((lesson) => lesson.lessonId === call.lessonId)
//           );
//           if (!lessonExists) {
//             console.warn(
//               `No lesson found for lessonId: ${call.lessonId}, skipping worksheet merge`
//             );
//             continue;
//           }

//           const worksheetResponse = await api.get(
//             `/courses/${fetchedCourseId}/lesson/${call.lessonId}/worksheets`
//           );
//           const fetchedWorksheets: Worksheet[] =
//             worksheetResponse.data.worksheets || [];

//           updatedCourseData = {
//             ...updatedCourseData,
//             chapters: updatedCourseData.chapters.map((chapter: Chapter) => ({
//               ...chapter,
//               lessons: chapter.lessons.map((lesson: Lesson) => {
//                 if (lesson.lessonId === call.lessonId) {
//                   const mergedWorksheets = [
//                     ...(lesson.worksheets || []),
//                     ...fetchedWorksheets.filter(
//                       (ws: Worksheet) =>
//                         !lesson.worksheets.some(
//                           (existingWs: Worksheet) =>
//                             existingWs.fileId === ws.fileId
//                         )
//                     ),
//                   ].map((ws: Worksheet) => ({
//                     id: ws.id || ws.fileId,
//                     type: ws.type,
//                     url: ws.url,
//                     fileId: ws.fileId,
//                     name: ws.name,
//                     uploadedBy: ws.uploadedBy,
//                     uploadedAt: ws.uploadedAt,
//                   }));
//                   return { ...lesson, worksheets: mergedWorksheets };
//                 }
//                 return lesson;
//               }),
//             })),
//           };
//         } catch (worksheetError) {
//           console.error(
//             `Failed to fetch worksheets for lesson ${call.lessonId}:`,
//             worksheetError
//           );
//         }
//       }

//       setCourse(updatedCourseData);
//       setScheduledCalls({
//         calls: transformedCalls,
//         schedule: batchData.schedule || {
//           scheduleStatus: "Unknown",
//           scheduleDuration: "Unknown",
//         },
//       });
//     } catch (error) {
//       const apiError = error as ApiError;
//       console.error(
//         "[CourseDetails] Failed to fetch course or schedule:",
//         apiError
//       );
//       if (apiError.response?.status === 401) {
//         handleUnauthorized();
//       } else {
//         const errorMessage =
//           apiError.response?.data?.message ||
//           "Failed to fetch course or schedule details";
//         setError(errorMessage);
//         toast.error(errorMessage);
//       }
//     } finally {
//       setLoading(false);
//     }
//   }, [user, batchId, handleUnauthorized]);

//   useEffect(() => {
//     if (authLoading) return;
//     if (
//       !user ||
//       !["Admin", "Super Admin"].includes(user.role?.roleName || "")
//     ) {
//       console.debug(
//         "[CourseDetails] Redirecting due to invalid role or no user",
//         {
//           user: !!user,
//           role: user?.role?.roleName,
//           authLoading,
//         }
//       );
//       handleUnauthorized();
//       router.push("/my-learnings");
//       return;
//     }
//     fetchCourseAndSchedule();
//   }, [
//     user,
//     authLoading,
//     batchId,
//     fetchCourseAndSchedule,
//     handleUnauthorized,
//     router,
//   ]);

//   const toggleLesson = (chapterIndex: number, lessonIndex: number) => {
//     const lessonKey = `${chapterIndex}-${lessonIndex}`;
//     setOpenLessons((prev) => ({
//       ...prev,
//       [lessonKey]: !prev[lessonKey],
//     }));
//   };

//   const getDocumentType = (url: string): string => {
//     const extension = url.split(".").pop()?.toLowerCase();
//     return extension || "unknown";
//   };

//   const transformGoogleDriveUrlToDownload = (url: string): string => {
//     const fileIdMatch = url.match(/\/d\/(.+?)(\/|$)/);
//     if (fileIdMatch && fileIdMatch[1]) {
//       return `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
//     }
//     return url;
//   };

//   const formatDate = (date: string): string => {
//     return new Date(date).toLocaleDateString("en-GB", {
//       day: "2-digit",
//       month: "2-digit",
//       year: "numeric",
//     });
//   };

//   const formatTime = (time: string): string => {
//     const [hours, minutes] = time.split(":");
//     const date = new Date();
//     date.setHours(Number.parseInt(hours), Number.parseInt(minutes));
//     return date.toLocaleTimeString("en-US", {
//       hour: "2-digit",
//       minute: "2-digit",
//       hour12: true,
//     });
//   };

//   const handleViewLesson = (lesson: Lesson) => {
//     if (lesson.resources && lesson.resources.length > 0) {
//       const resource = lesson.resources[0];
//       setSelectedDocument({
//         topic: lesson.title,
//         documentUrl: resource.url,
//         documentType: getDocumentType(resource.url),
//       });
//     } else {
//       toast.error("No resources available for this lesson");
//     }
//   };

//   const handleDownloadLesson = (lesson: Lesson) => {
//     if (lesson.resources && lesson.resources.length > 0) {
//       const resource = lesson.resources[0];
//       let downloadUrl = resource.url;
//       if (resource.url.includes("drive.google.com")) {
//         downloadUrl = transformGoogleDriveUrlToDownload(resource.url);
//       } else {
//         downloadUrl = `/api/documents/proxy?url=${encodeURIComponent(
//           resource.url
//         )}`;
//       }
//       const link = document.createElement("a");
//       link.href = downloadUrl;
//       link.download =
//         resource.name ||
//         `lesson-${lesson.title}.${getDocumentType(resource.url)}`;
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//       toast.success("Lesson download initiated!");
//     } else {
//       toast.error("No resources available for this lesson");
//     }
//   };

//   const handleJoinMeeting = (call: ScheduledCall) => {
//     const meetingUrl = call.type === "zoom" ? call.zoomLink : call.meetingLink;
//     if (meetingUrl) {
//       window.open(meetingUrl, "_blank");
//     } else {
//       toast.error("No meeting link available");
//     }
//   };

//   const getStatusStyle = (status: string) => {
//     switch (status.toLowerCase()) {
//       case "scheduled":
//         return "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300";
//       case "rescheduled":
//         return "bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 border border-amber-300";
//       case "cancelled":
//         return "bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300";
//       case "completed":
//         return "bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border border-emerald-300";
//       default:
//         return "bg-gradient-to-r from-slate-100 to-slate-200 text-slate-800 border border-slate-300";
//     }
//   };

//   const isScheduled = scheduledCalls?.calls && scheduledCalls.calls.length > 0;

//   if (authLoading || loading) {
//     return (
//       <div className="fixed inset-0 flex items-center justify-center bg-gray-100/80">
//         <motion.div
//           initial={{ opacity: 0, scale: 0.8 }}
//           animate={{ opacity: 1, scale: 1 }}
//           transition={{ duration: 0.5 }}
//           className="flex flex-col items-center space-y-4"
//         >
//           <svg viewBox="0 0 24 24">
//             <circle
//               cx="12"
//               cy="12"
//               r="10"
//               stroke="currentColor"
//               strokeWidth="4"
//               fill="none"
//             />
//             <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
//           </svg>
//         </motion.div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-red-50 to-rose-100">
//         <motion.div
//           initial={{ opacity: 0, y: -20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.5 }}
//           className="bg-white border border-red-200 p-6 rounded-xl shadow-lg max-w-md w-full"
//         >
//           <div className="flex items-center space-x-3 mb-4">
//             <div className="w-8 h-8 bg-gradient-to-r from-red-100 to-red-200 rounded-full flex items-center justify-center">
//               <X className="w-4 h-4 text-red-600" />
//             </div>
//             <h3 className="text-lg font-semibold text-red-800">Error</h3>
//           </div>
//           <p className="text-red-700">{error}</p>
//         </motion.div>
//       </div>
//     );
//   }

//   if (!course) {
//     return (
//       <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-blue-100">
//         <motion.div
//           initial={{ opacity: 0, scale: 0.8 }}
//           animate={{ opacity: 1, scale: 1 }}
//           transition={{ duration: 0.5 }}
//           className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md w-full border border-blue-200"
//         >
//           <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
//             <BookOpen className="w-6 h-6 text-blue-600" />
//           </div>
//           <h2 className="text-xl font-semibold text-slate-800 mb-2">
//             Course Not Found
//           </h2>
//           <p className="text-slate-600">
//             The course you&apos;re looking for doesn&apos;t exist or you
//             don&apos;t have access to it.
//           </p>
//         </motion.div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pt-16">
//       <style jsx global>{`
//         .scrollbar-hide::-webkit-scrollbar {
//           display: none;
//         }
//         .scrollbar-hide {
//           scrollbar-width: none;
//           -ms-overflow-style: none;
//         }
//         .timeline-line {
//           background: linear-gradient(
//             to bottom,
//             #3b82f6,
//             #6366f1,
//             #8b5cf6,
//             #a855f7,
//             #c084fc,
//             #d8b4fe,
//             #c084fc,
//             #a855f7,
//             #8b5cf6,
//             #6366f1,
//             #3b82f6
//           );
//           box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
//         }
//         .glass-card {
//           background: rgba(255, 255, 255, 0.9);
//           backdrop-filter: blur(10px);
//           border: 1px solid rgba(255, 255, 255, 0.5);
//         }
//       `}</style>

//       <div className="max-w-6xl mx-auto px-6 py-6">
//         {/* Header */}
//         <motion.div
//           initial={{ opacity: 0, y: -20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.5 }}
//           className="mb-6"
//         >
//           <Button
//             onClick={() =>
//               router.push(`/superadmin/courses/${courseId}/batches/${batchId}/`)
//             }
//             variant="outline"
//             className="mb-4 bg-white/80 border-blue-200 text-slate-700 hover:bg-blue-50 shadow-sm backdrop-blur-sm"
//           >
//             <ArrowLeft className="w-4 h-4 mr-2" />
//             Back to Batch
//           </Button>

//           <div className="flex items-center space-x-4 mb-4">
//             <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
//               <Sparkles className="w-6 h-6 text-white" />
//             </div>
//             <div>
//               <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
//                 {course.title}
//               </h1>
//               <p className="text-slate-600">Course Details & Schedule</p>
//             </div>
//           </div>

//           {/* Course Metadata */}
//           <div className="flex flex-wrap gap-2">
//             <Badge className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300 px-3 py-1 text-sm shadow-sm">
//               <Target className="w-3 h-3 mr-1" />
//               {course.targetAudience}
//             </Badge>
//             <Badge className="bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border border-emerald-300 px-3 py-1 text-sm shadow-sm">
//               <Clock className="w-3 h-3 mr-1" />
//               {isScheduled
//                 ? `${scheduledCalls?.schedule.scheduleDuration} (${
//                     scheduledCalls?.calls[0]?.timezone || "N/A"
//                   })`
//                 : course.duration}
//             </Badge>
//             <Badge className="bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300 px-3 py-1 text-sm shadow-sm">
//               <User className="w-3 h-3 mr-1" />
//               {course.createdBy.name}
//             </Badge>
//             <Badge className="bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 border border-amber-300 px-3 py-1 text-sm shadow-sm">
//               <Calendar className="w-3 h-3 mr-1" />
//               {new Date(course.createdAt).toLocaleDateString("en-GB")}
//             </Badge>
//             {isScheduled && scheduledCalls?.calls[0]?.callDuration && (
//               <Badge className="bg-gradient-to-r from-rose-100 to-rose-200 text-rose-800 border border-rose-300 px-3 py-1 text-sm shadow-sm">
//                 <Clock className="w-3 h-3 mr-1" />
//                 {scheduledCalls.calls[0].callDuration}
//               </Badge>
//             )}
//           </div>
//         </motion.div>

//         <div className="flex flex-col lg:flex-row gap-6">
//           {/* Teachers Sidebar */}
//           <motion.div
//             initial={{ opacity: 0, x: -50 }}
//             animate={{ opacity: 1, x: 0 }}
//             transition={{ duration: 0.6, delay: 0.2 }}
//             className="lg:w-1/3 lg:sticky lg:top-8 lg:self-start"
//           >
//             <Card className="glass-card shadow-lg border border-blue-200/50">
//               <CardContent className="p-5">
//                 <div className="flex items-center space-x-3 mb-5">
//                   <div className="w-8 h-8 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
//                     <Users className="w-4 h-4 text-blue-600" />
//                   </div>
//                   <div>
//                     <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
//                       Assigned Teachers
//                     </h2>
//                     <p className="text-slate-500 text-xs">
//                       Your learning guides
//                     </p>
//                   </div>
//                 </div>

//                 {course.assignedTeachers.length === 0 ? (
//                   <div className="text-center py-8">
//                     <div className="w-12 h-12 bg-gradient-to-r from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
//                       <User className="w-6 h-6 text-slate-400" />
//                     </div>
//                     <p className="text-slate-500 text-sm">
//                       No teachers assigned
//                     </p>
//                   </div>
//                 ) : (
//                   <div className="space-y-4">
//                     {course.assignedTeachers
//                       .slice(0, 1)
//                       .map((teacher, index) => (
//                         <motion.div
//                           key={teacher._id}
//                           initial={{ opacity: 0, y: 20 }}
//                           animate={{ opacity: 1, y: 0 }}
//                           transition={{ duration: 0.4, delay: index * 0.1 }}
//                           className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 hover:shadow-md transition-all duration-200"
//                         >
//                           <div className="flex items-center space-x-3 mb-3">
//                             {teacher.profileImage ? (
//                               <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-blue-300">
//                                 <Image
//                                   width={40}
//                                   height={40}
//                                   src={
//                                     teacher.profileImage || "/placeholder.svg"
//                                   }
//                                   alt={teacher.name}
//                                   className="object-cover w-full h-full"
//                                 />
//                               </div>
//                             ) : (
//                               <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
//                                 <User className="w-5 h-5 text-white" />
//                               </div>
//                             )}
//                             <div>
//                               <h3 className="font-medium text-slate-900 text-sm">
//                                 {teacher.name}
//                               </h3>
//                               <p className="text-xs text-slate-500">
//                                 {teacher.email}
//                               </p>
//                             </div>
//                           </div>

//                           <div className="space-y-2 text-xs">
//                             <div className="flex items-center text-slate-600 bg-white/70 p-2 rounded border border-blue-100">
//                               <Mail className="w-3 h-3 mr-2 text-blue-500" />
//                               {teacher.email}
//                             </div>
//                             <div className="flex items-center text-slate-600 bg-white/70 p-2 rounded border border-blue-100">
//                               <Phone className="w-3 h-3 mr-2 text-blue-500" />
//                               {teacher.phone || "N/A"}
//                             </div>
//                             <div className="flex items-start gap-2 bg-white/70 p-2 rounded border border-blue-100">
//                               <GraduationCap className="w-3 h-3 text-blue-500 mt-0.5" />
//                               <div className="flex flex-wrap gap-1">
//                                 {teacher.subjects
//                                   ?.slice(0, 2)
//                                   .map((subject, idx) => (
//                                     <span
//                                       key={idx}
//                                       className="inline-block bg-gradient-to-r from-blue-200 to-indigo-200 text-blue-800 text-xs px-2 py-0.5 rounded-full"
//                                     >
//                                       {subject}
//                                     </span>
//                                   ))}
//                                 {teacher.subjects?.length > 2 && (
//                                   <span className="inline-block bg-gradient-to-r from-slate-200 to-slate-300 text-slate-700 text-xs px-2 py-0.5 rounded-full">
//                                     +{teacher.subjects.length - 2}
//                                   </span>
//                                 )}
//                               </div>
//                             </div>
//                           </div>
//                         </motion.div>
//                       ))}

//                     {course.assignedTeachers.length > 1 && (
//                       <Button
//                         onClick={() => setIsTeachersModalOpen(true)}
//                         variant="outline"
//                         className="w-full bg-white/80 border-blue-300 text-blue-700 hover:bg-blue-50 shadow-sm backdrop-blur-sm"
//                         size="sm"
//                       >
//                         <Users className="w-3 h-3 mr-2" />
//                         View All ({course.assignedTeachers.length})
//                       </Button>
//                     )}
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           </motion.div>

//           {/* Course Content with Timeline */}
//           <motion.div
//             initial={{ opacity: 0, x: 50 }}
//             animate={{ opacity: 1, x: 0 }}
//             transition={{ duration: 0.6, delay: 0.4 }}
//             className="lg:w-2/3"
//           >
//             <div className="relative">
//               {/* Enhanced Timeline Line */}
//               <div className="absolute left-6 top-0 bottom-0 w-1 timeline-line rounded-full"></div>

//               {course.chapters && course.chapters.length > 0 ? (
//                 course.chapters.map((chapter, chapterIndex) => {
//                   const IconComponent =
//                     timelineIcons[chapterIndex % timelineIcons.length];
//                   const gradients = [
//                     "from-blue-400 to-blue-600",
//                     "from-emerald-400 to-emerald-600",
//                     "from-purple-400 to-purple-600",
//                     "from-amber-400 to-amber-600",
//                     "from-rose-400 to-rose-600",
//                   ];
//                   const currentGradient =
//                     gradients[chapterIndex % gradients.length];

//                   return (
//                     <div key={chapterIndex} className="relative mb-8">
//                       {/* Chapter Header */}
//                       <div className="flex items-center gap-4 mb-4">
//                         <div
//                           className={`relative w-12 h-12 bg-gradient-to-br ${currentGradient} rounded-xl flex items-center justify-center shadow-lg z-10`}
//                         >
//                           <IconComponent className="w-5 h-5 text-white" />
//                         </div>
//                         <div>
//                           <h2 className="text-lg font-semibold text-slate-900">
//                             {chapter.title}
//                           </h2>
//                           <div className="flex items-center space-x-1">
//                             <Star className="w-3 h-3 text-amber-500" />
//                             <p className="text-slate-500 text-sm">
//                               {chapter.lessons.length} lessons
//                             </p>
//                           </div>
//                         </div>
//                       </div>

//                       {/* Lessons */}
//                       <div className="ml-16">
//                         {chapter.lessons.length > 0 ? (
//                           <Card className="glass-card shadow-lg border border-purple-200/50">
//                             <CardContent className="p-5">
//                               <div className="flex justify-between items-center mb-4">
//                                 <div className="flex items-center space-x-2">
//                                   <Zap className="w-4 h-4 text-amber-500" />
//                                   <span className="font-medium text-slate-700 text-sm">
//                                     Course Content
//                                   </span>
//                                 </div>
//                                 <Badge className="bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 px-2 py-1 text-xs border border-slate-300">
//                                   {chapter.lessons.length} Lessons
//                                 </Badge>
//                               </div>

//                               <div className="space-y-3">
//                                 {chapter.lessons.map((lesson, lessonIndex) => {
//                                   const scheduledCall =
//                                     scheduledCalls?.calls.find(
//                                       (call) =>
//                                         call.lessonId === lesson.lessonId
//                                     );
//                                   const isCompleted =
//                                     scheduledCall?.status.toLowerCase() ===
//                                     "completed";
//                                   const isCancelled =
//                                     scheduledCall?.status.toLowerCase() ===
//                                     "cancelled";
//                                   const hasLearningGoals =
//                                     lesson.learningGoals &&
//                                     lesson.learningGoals.length > 0;
//                                   const lessonKey = `${chapterIndex}-${lessonIndex}`;
//                                   const isOpen = openLessons[lessonKey];

//                                   return (
//                                     <motion.div
//                                       key={lessonIndex}
//                                       initial={{ opacity: 0, x: -20 }}
//                                       animate={{ opacity: 1, x: 0 }}
//                                       transition={{ delay: lessonIndex * 0.05 }}
//                                       className="bg-gradient-to-r from-white to-blue-50/50 rounded-lg border border-blue-200 hover:shadow-md transition-all duration-200"
//                                     >
//                                       <div className="p-4">
//                                         {/* Status Badge */}
//                                         {isScheduled && scheduledCall && (
//                                           <div className="flex justify-end mb-2">
//                                             <Badge
//                                               className={`${getStatusStyle(
//                                                 scheduledCall.status
//                                               )} text-xs px-2 py-1 shadow-sm`}
//                                             >
//                                               {isCompleted && (
//                                                 <CheckCircle className="w-3 h-3 mr-1" />
//                                               )}
//                                               {scheduledCall.status}
//                                             </Badge>
//                                           </div>
//                                         )}

//                                         {/* Lesson Header */}
//                                         <div className="flex items-center justify-between mb-3">
//                                           <div className="flex items-center space-x-3">
//                                             <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
//                                             <h3 className="font-medium text-slate-900 text-sm">
//                                               {lesson.title}
//                                             </h3>
//                                           </div>

//                                           {hasLearningGoals && (
//                                             <button
//                                               onClick={() =>
//                                                 toggleLesson(
//                                                   chapterIndex,
//                                                   lessonIndex
//                                                 )
//                                               }
//                                               className="w-6 h-6 bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-300 rounded-full flex items-center justify-center hover:from-blue-200 hover:to-indigo-200 transition-colors duration-200"
//                                             >
//                                               <motion.div
//                                                 animate={{
//                                                   rotate: isOpen ? 180 : 0,
//                                                 }}
//                                                 transition={{ duration: 0.2 }}
//                                               >
//                                                 {isOpen ? (
//                                                   <ChevronUp className="w-3 h-3 text-blue-600" />
//                                                 ) : (
//                                                   <ChevronDown className="w-3 h-3 text-blue-600" />
//                                                 )}
//                                               </motion.div>
//                                             </button>
//                                           )}
//                                         </div>

//                                         {/* Lesson Meta */}
//                                         <div className="flex flex-wrap items-center gap-2 mb-3">
//                                           {isScheduled && scheduledCall && (
//                                             <>
//                                               <div className="flex items-center space-x-1 bg-gradient-to-r from-blue-50 to-blue-100 px-2 py-1 rounded-full border border-blue-200">
//                                                 <Calendar className="w-3 h-3 text-blue-600" />
//                                                 <span className="text-xs font-medium text-blue-700">
//                                                   {formatDate(
//                                                     scheduledCall.date
//                                                   )}
//                                                 </span>
//                                               </div>
//                                               {!isCompleted && !isCancelled && (
//                                                 <div className="flex items-center space-x-1 bg-gradient-to-r from-emerald-50 to-emerald-100 px-2 py-1 rounded-full border border-emerald-200">
//                                                   <Clock className="w-3 h-3 text-emerald-600" />
//                                                   <span className="text-xs font-medium text-emerald-700">
//                                                     {formatTime(
//                                                       scheduledCall.startTime
//                                                     )}{" "}
//                                                     –{" "}
//                                                     {formatTime(
//                                                       scheduledCall.endTime
//                                                     )}
//                                                   </span>
//                                                 </div>
//                                               )}
//                                             </>
//                                           )}
//                                         </div>

//                                         {/* Lesson Actions */}
//                                         <div className="flex flex-wrap gap-2">
//                                           {lesson.resources &&
//                                             lesson.resources.length > 0 && (
//                                               <>
//                                                 <Button
//                                                   onClick={() =>
//                                                     handleViewLesson(lesson)
//                                                   }
//                                                   className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md"
//                                                   size="sm"
//                                                 >
//                                                   <PlayCircle className="w-3 h-3 mr-1" />
//                                                   View Lesson
//                                                 </Button>
//                                                 <Button
//                                                   onClick={() =>
//                                                     handleDownloadLesson(lesson)
//                                                   }
//                                                   className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md"
//                                                   size="sm"
//                                                 >
//                                                   <Download className="w-3 h-3 mr-1" />
//                                                   Download
//                                                 </Button>
//                                               </>
//                                             )}

//                                           {isScheduled &&
//                                             scheduledCall &&
//                                             !isCompleted &&
//                                             !isCancelled && (
//                                               <Button
//                                                 onClick={() =>
//                                                   handleJoinMeeting(
//                                                     scheduledCall
//                                                   )
//                                                 }
//                                                 className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-md"
//                                                 size="sm"
//                                               >
//                                                 <Video className="w-3 h-3 mr-1" />
//                                                 Join
//                                               </Button>
//                                             )}
//                                         </div>

//                                         {/* Learning Goals */}
//                                         <AnimatePresence>
//                                           {hasLearningGoals && isOpen && (
//                                             <motion.div
//                                               initial={{
//                                                 height: 0,
//                                                 opacity: 0,
//                                               }}
//                                               animate={{
//                                                 height: "auto",
//                                                 opacity: 1,
//                                               }}
//                                               exit={{ height: 0, opacity: 0 }}
//                                               transition={{
//                                                 duration: 0.3,
//                                                 ease: "easeInOut",
//                                               }}
//                                               className="mt-3 pt-3 border-t border-blue-200"
//                                             >
//                                               <div className="flex items-center space-x-2 mb-2">
//                                                 <Award className="w-3 h-3 text-amber-600" />
//                                                 <h4 className="font-medium text-slate-700 text-sm">
//                                                   Learning Goals
//                                                 </h4>
//                                               </div>
//                                               <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-3 rounded border border-amber-200">
//                                                 <ul className="space-y-1">
//                                                   {lesson.learningGoals.map(
//                                                     (goal, goalIndex) => (
//                                                       <li
//                                                         key={goalIndex}
//                                                         className="flex items-start space-x-2 text-xs text-slate-700"
//                                                       >
//                                                         <div className="w-1 h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
//                                                         <span>{goal}</span>
//                                                       </li>
//                                                     )
//                                                   )}
//                                                 </ul>
//                                               </div>
//                                             </motion.div>
//                                           )}
//                                         </AnimatePresence>
//                                       </div>
//                                     </motion.div>
//                                   );
//                                 })}
//                               </div>
//                             </CardContent>
//                           </Card>
//                         ) : (
//                           <Card className="glass-card shadow-lg border border-slate-200">
//                             <CardContent className="p-6 text-center">
//                               <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
//                               <p className="text-slate-500 text-sm">
//                                 No lessons available in this chapter.
//                               </p>
//                             </CardContent>
//                           </Card>
//                         )}
//                       </div>
//                     </div>
//                   );
//                 })
//               ) : (
//                 <Card className="glass-card shadow-lg border border-slate-200">
//                   <CardContent className="p-8 text-center">
//                     <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-3" />
//                     <h3 className="text-lg font-medium text-slate-700 mb-2">
//                       No Content Available
//                     </h3>
//                     <p className="text-slate-500">
//                       This course doesn&apos;t have any chapters or lessons yet.
//                     </p>
//                   </CardContent>
//                 </Card>
//               )}
//             </div>
//           </motion.div>
//         </div>
//       </div>

//       {/* Document Popup */}
//       <AnimatePresence>
//         {selectedDocument && (
//           <DocumentPopup
//             isOpen={!!selectedDocument}
//             onClose={() => setSelectedDocument(null)}
//             topic={selectedDocument.topic}
//             documentUrl={selectedDocument.documentUrl}
//             documentType={selectedDocument.documentType}
//           />
//         )}
//       </AnimatePresence>

//       {/* Teachers Modal */}
//       <AnimatePresence>
//         {isTeachersModalOpen && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             transition={{ duration: 0.3 }}
//             className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
//             onClick={() => setIsTeachersModalOpen(false)}
//           >
//             <motion.div
//               initial={{ scale: 0.95, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.95, opacity: 0 }}
//               transition={{ duration: 0.2 }}
//               className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden border border-blue-200"
//               onClick={(e) => e.stopPropagation()}
//             >
//               <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4">
//                 <div className="flex items-center justify-between">
//                   <div className="flex items-center space-x-3">
//                     <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
//                       <Users className="w-4 h-4 text-white" />
//                     </div>
//                     <div>
//                       <h2 className="text-lg font-semibold text-white">
//                         All Assigned Teachers
//                       </h2>
//                       <p className="text-blue-100 text-sm">
//                         Meet your learning team
//                       </p>
//                     </div>
//                   </div>
//                   <Button
//                     variant="ghost"
//                     size="sm"
//                     onClick={() => setIsTeachersModalOpen(false)}
//                     className="hover:bg-white/20 text-white rounded-full p-2"
//                   >
//                     <X className="w-4 h-4" />
//                   </Button>
//                 </div>
//               </div>

//               <div className="p-6 max-h-[60vh] overflow-y-auto scrollbar-hide">
//                 {course.assignedTeachers.length === 0 ? (
//                   <div className="text-center py-12">
//                     <User className="w-12 h-12 text-slate-400 mx-auto mb-4" />
//                     <p className="text-slate-500">
//                       No teachers assigned to this course.
//                     </p>
//                   </div>
//                 ) : (
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                     {course.assignedTeachers.map((teacher, index) => (
//                       <motion.div
//                         key={teacher._id}
//                         initial={{ opacity: 0, y: 20 }}
//                         animate={{ opacity: 1, y: 0 }}
//                         transition={{ duration: 0.4, delay: index * 0.1 }}
//                         className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 hover:shadow-md transition-all duration-200"
//                       >
//                         <div className="flex items-center space-x-3 mb-3">
//                           {teacher.profileImage ? (
//                             <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-blue-300">
//                               <Image
//                                 width={40}
//                                 height={40}
//                                 src={teacher.profileImage || "/placeholder.svg"}
//                                 alt={teacher.name}
//                                 className="object-cover w-full h-full"
//                               />
//                             </div>
//                           ) : (
//                             <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
//                               <User className="w-5 h-5 text-white" />
//                             </div>
//                           )}
//                           <div>
//                             <h3 className="font-medium text-slate-900 text-sm">
//                               {teacher.name}
//                             </h3>
//                             <p className="text-slate-500 text-xs">
//                               {teacher.email}
//                             </p>
//                           </div>
//                         </div>

//                         <div className="space-y-2 text-xs">
//                           <div className="flex items-center text-slate-600 bg-white/70 p-2 rounded border border-blue-100">
//                             <Phone className="w-3 h-3 mr-2 text-blue-500" />
//                             {teacher.phone || "N/A"}
//                           </div>
//                           <div className="bg-white/70 p-2 rounded border border-blue-100">
//                             <div className="flex items-center mb-1">
//                               <GraduationCap className="w-3 h-3 text-blue-500 mr-1" />
//                               <span className="text-slate-600 font-medium">
//                                 Subjects
//                               </span>
//                             </div>
//                             <div className="flex flex-wrap gap-1">
//                               {teacher.subjects?.map((subject, idx) => (
//                                 <span
//                                   key={idx}
//                                   className="inline-block bg-gradient-to-r from-blue-200 to-indigo-200 text-blue-800 text-xs px-2 py-0.5 rounded-full"
//                                 >
//                                   {subject}
//                                 </span>
//                               )) || (
//                                 <span className="text-slate-500 text-xs">
//                                   No subjects assigned
//                                 </span>
//                               )}
//                             </div>
//                           </div>
//                         </div>
//                       </motion.div>
//                     ))}
//                   </div>
//                 )}
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </div>
//   );
// }

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
  Mail,
  Phone,
  GraduationCap,
  X,
  ArrowLeft,
  Users,
  PlayCircle,
  FileText,
  Award,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import toast from "react-hot-toast";
import type { ApiError } from "@/types";
import DocumentPopup from "@/components/DocumentPopup";
import Image from "next/image";

interface Teacher {
  _id: string;
  name: string;
  email: string;
  phone: string;
  subjects: string[];
  profileImage?: string;
}

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
  chapters: Chapter[];
  assignedTeachers: Teacher[];
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
  callDuration?: string;
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

const timelineIcons = [Book, Film, PenTool, Mic, Headphones];

export default function CourseDetails() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { batchId } = useParams();

  const [course, setCourse] = useState<Course | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [scheduledCalls, setScheduledCalls] = useState<ScheduleResponse | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openLessons, setOpenLessons] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [selectedDocument, setSelectedDocument] =
    useState<SelectedDocument | null>(null);
  const [isTeachersModalOpen, setIsTeachersModalOpen] = useState(false);

  const handleUnauthorized = useCallback(() => {
    console.debug("[CourseDetails] Handling unauthorized access");
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("deviceId");
    toast.error("Session expired. Please log in again.");
    router.push("/login");
  }, [router]);

  const fetchCourseAndSchedule = useCallback(async () => {
    if (!user) {
      handleUnauthorized();
      return;
    }

    if (!batchId) {
      setError("No batch ID provided");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const deviceId = localStorage.getItem("deviceId");
      const token = localStorage.getItem("token");
      if (!deviceId || !token) {
        console.debug("[CourseDetails] Missing deviceId or token", {
          deviceId,
          token,
        });
        handleUnauthorized();
        return;
      }

      const scheduleResponse = await api.get(
        `/schedule/batch/${batchId}/calls`
      );
      const batchData = scheduleResponse.data.batch;
      if (!batchData) throw new Error("Batch data not found in response");

      const fetchedCourseId = batchData.courseId;
      if (!fetchedCourseId)
        throw new Error("Course ID not found in batch data");
      setCourseId(fetchedCourseId);

      const courseResponse = await api.get(`/courses/${fetchedCourseId}`);
      const teachersResponse = await api.get(
        `/courses/course/${fetchedCourseId}/assigned-teachers`
      );
      const courseData: Course = {
        ...courseResponse.data,
        chapters: courseResponse.data.chapters || [],
        assignedTeachers: Array.isArray(teachersResponse.data.assignedTeachers)
          ? teachersResponse.data.assignedTeachers
          : [],
      };
      if (!courseData) throw new Error("Course data is empty or undefined");

      const processedCourseData: Course = {
        ...courseData,
        chapters: courseData.chapters.map((chapter: Chapter) => {
          if (!chapter.lessons || !Array.isArray(chapter.lessons)) {
            console.warn(
              `Lessons for chapter "${
                chapter.title || "Untitled"
              }" is undefined or not an array, initializing as empty array`
            );
            return { ...chapter, lessons: [] };
          }

          return {
            ...chapter,
            lessons: chapter.lessons.map((lesson: Lesson) => {
              lesson.worksheets = lesson.worksheets || [];
              const updatedWorksheets = lesson.worksheets.map(
                (ws: Worksheet) => ({
                  id: ws.id || ws.fileId,
                  type: ws.type,
                  url: ws.url,
                  fileId: ws.fileId,
                  name: ws.name,
                  uploadedBy: ws.uploadedBy,
                  uploadedAt: ws.uploadedAt,
                })
              );
              return {
                ...lesson,
                worksheets: updatedWorksheets,
              };
            }),
          };
        }),
      };

      const transformedCalls = (batchData.calls || []).map(
        (call: ScheduledCall) => ({
          ...call,
          scheduleId: call._id,
        })
      );

      let updatedCourseData: Course = { ...processedCourseData };

      for (const call of transformedCalls) {
        try {
          const lessonExists = updatedCourseData.chapters.some((chapter) =>
            chapter.lessons.some((lesson) => lesson.lessonId === call.lessonId)
          );
          if (!lessonExists) {
            console.warn(
              `No lesson found for lessonId: ${call.lessonId}, skipping worksheet merge`
            );
            continue;
          }

          const worksheetResponse = await api.get(
            `/courses/${fetchedCourseId}/lesson/${call.lessonId}/worksheets`
          );
          const fetchedWorksheets: Worksheet[] =
            worksheetResponse.data.worksheets || [];

          updatedCourseData = {
            ...updatedCourseData,
            chapters: updatedCourseData.chapters.map((chapter: Chapter) => ({
              ...chapter,
              lessons: chapter.lessons.map((lesson: Lesson) => {
                if (lesson.lessonId === call.lessonId) {
                  const mergedWorksheets = [
                    ...(lesson.worksheets || []),
                    ...fetchedWorksheets.filter(
                      (ws: Worksheet) =>
                        !lesson.worksheets.some(
                          (existingWs: Worksheet) =>
                            existingWs.fileId === ws.fileId
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

      setCourse(updatedCourseData);
      setScheduledCalls({
        calls: transformedCalls,
        schedule: batchData.schedule || {
          scheduleStatus: "Unknown",
          scheduleDuration: "Unknown",
        },
      });
    } catch (error) {
      const apiError = error as ApiError;
      console.error(
        "[CourseDetails] Failed to fetch course or schedule:",
        apiError
      );
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        const errorMessage =
          apiError.response?.data?.message ||
          "Failed to fetch course or schedule details";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [user, batchId, handleUnauthorized]);

  useEffect(() => {
    if (authLoading) return;
    if (
      !user ||
      !["Admin", "Super Admin"].includes(user.role?.roleName || "")
    ) {
      console.debug(
        "[CourseDetails] Redirecting due to invalid role or no user",
        {
          user: !!user,
          role: user?.role?.roleName,
          authLoading,
        }
      );
      handleUnauthorized();
      router.push("/my-learnings");
      return;
    }
    fetchCourseAndSchedule();
  }, [
    user,
    authLoading,
    batchId,
    fetchCourseAndSchedule,
    handleUnauthorized,
    router,
  ]);

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
    date.setHours(Number.parseInt(hours), Number.parseInt(minutes));
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

  const handleJoinMeeting = (call: ScheduledCall) => {
    const meetingUrl = call.type === "zoom" ? call.zoomLink : call.meetingLink;
    if (meetingUrl) {
      window.open(meetingUrl, "_blank");
    } else {
      toast.error("No meeting link available");
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled":
        return "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300";
      case "rescheduled":
        return "bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 border border-amber-300";
      case "cancelled":
        return "bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300";
      case "completed":
        return "bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border border-emerald-300";
      default:
        return "bg-gradient-to-r from-slate-100 to-slate-200 text-slate-800 border border-slate-300";
    }
  };

  const isScheduled = scheduledCalls?.calls && scheduledCalls.calls.length > 0;

  if (authLoading || loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center space-y-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
            className="h-10 w-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg"
          >
            <Sparkles className="w-5 h-5 text-white" />
          </motion.div>
          <p className="text-slate-700 font-medium">
            Loading course details...
          </p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-red-50 to-rose-100">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white border border-red-200 p-6 rounded-xl shadow-lg max-w-md w-full"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-red-100 to-red-200 rounded-full flex items-center justify-center">
              <X className="w-4 h-4 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-red-800">Error</h3>
          </div>
          <p className="text-red-700">{error}</p>
        </motion.div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-blue-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md w-full border border-blue-200"
        >
          <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            Course Not Found
          </h2>
          <p className="text-slate-600">
            The course you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have access to it.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pt-16">
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .timeline-line {
          background: linear-gradient(
            to bottom,
            #3b82f6,
            #6366f1,
            #8b5cf6,
            #a855f7,
            #c084fc,
            #d8b4fe,
            #c084fc,
            #a855f7,
            #8b5cf6,
            #6366f1,
            #3b82f6
          );
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.5);
        }
      `}</style>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <Button
            onClick={() =>
              router.push(`/superadmin/courses/${courseId}/batches/${batchId}/`)
            }
            variant="outline"
            className="mb-4 bg-white/80 border-blue-200 text-slate-700 hover:bg-blue-50 shadow-sm backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Batch
          </Button>

          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                {course.title}
              </h1>
              <p className="text-slate-600">Course Details & Schedule</p>
            </div>
          </div>

          {/* Course Metadata */}
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300 px-3 py-1 text-sm shadow-sm">
              <Target className="w-3 h-3 mr-1" />
              {course.targetAudience}
            </Badge>
            <Badge className="bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border border-emerald-300 px-3 py-1 text-sm shadow-sm">
              <Clock className="w-3 h-3 mr-1" />
              {isScheduled
                ? `${scheduledCalls?.schedule.scheduleDuration} (${
                    scheduledCalls?.calls[0]?.timezone || "N/A"
                  })`
                : course.duration}
            </Badge>
            <Badge className="bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-300 px-3 py-1 text-sm shadow-sm">
              <User className="w-3 h-3 mr-1" />
              {course.createdBy.name}
            </Badge>
            <Badge className="bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 border border-amber-300 px-3 py-1 text-sm shadow-sm">
              <Calendar className="w-3 h-3 mr-1" />
              {new Date(course.createdAt).toLocaleDateString("en-GB")}
            </Badge>
            {isScheduled && scheduledCalls?.calls[0]?.callDuration && (
              <Badge className="bg-gradient-to-r from-rose-100 to-rose-200 text-rose-800 border border-rose-300 px-3 py-1 text-sm shadow-sm">
                <Clock className="w-3 h-3 mr-1" />
                {scheduledCalls.calls[0].callDuration}
              </Badge>
            )}
          </div>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Teachers Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:w-1/3 lg:sticky lg:top-8 lg:self-start"
          >
            <Card className="glass-card shadow-lg border border-blue-200/50">
              <CardContent className="p-5">
                <div className="flex items-center space-x-3 mb-5">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                      Assigned Teachers
                    </h2>
                    <p className="text-slate-500 text-xs">
                      Your learning guides
                    </p>
                  </div>
                </div>

                {course.assignedTeachers.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gradient-to-r from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-3">
                      <User className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-slate-500 text-sm">
                      No teachers assigned
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {course.assignedTeachers
                      .slice(0, 1)
                      .map((teacher, index) => (
                        <motion.div
                          key={teacher._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.1 }}
                          className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 hover:shadow-md transition-all duration-200"
                        >
                          <div className="flex items-center space-x-3 mb-3">
                            {teacher.profileImage ? (
                              <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-blue-300">
                                <Image
                                  width={40}
                                  height={40}
                                  src={
                                    teacher.profileImage || "/placeholder.svg"
                                  }
                                  alt={teacher.name}
                                  className="object-cover w-full h-full"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-white" />
                              </div>
                            )}
                            <div>
                              <h3 className="font-medium text-slate-900 text-sm">
                                {teacher.name}
                              </h3>
                              <p className="text-xs text-slate-500">
                                {teacher.email}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2 text-xs">
                            <div className="flex items-center text-slate-600 bg-white/70 p-2 rounded border border-blue-100">
                              <Mail className="w-3 h-3 mr-2 text-blue-500" />
                              {teacher.email}
                            </div>
                            <div className="flex items-center text-slate-600 bg-white/70 p-2 rounded border border-blue-100">
                              <Phone className="w-3 h-3 mr-2 text-blue-500" />
                              {teacher.phone || "N/A"}
                            </div>
                            <div className="flex items-start gap-2 bg-white/70 p-2 rounded border border-blue-100">
                              <GraduationCap className="w-3 h-3 text-blue-500 mt-0.5" />
                              <div className="flex flex-wrap gap-1">
                                {teacher.subjects
                                  ?.slice(0, 2)
                                  .map((subject, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-block bg-gradient-to-r from-blue-200 to-indigo-200 text-blue-800 text-xs px-2 py-0.5 rounded-full"
                                    >
                                      {subject}
                                    </span>
                                  ))}
                                {teacher.subjects?.length > 2 && (
                                  <span className="inline-block bg-gradient-to-r from-slate-200 to-slate-300 text-slate-700 text-xs px-2 py-0.5 rounded-full">
                                    +{teacher.subjects.length - 2}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}

                    {course.assignedTeachers.length > 1 && (
                      <Button
                        onClick={() => setIsTeachersModalOpen(true)}
                        variant="outline"
                        className="w-full bg-white/80 border-blue-300 text-blue-700 hover:bg-blue-50 shadow-sm backdrop-blur-sm"
                        size="sm"
                      >
                        <Users className="w-3 h-3 mr-2" />
                        View All ({course.assignedTeachers.length})
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Course Content with Timeline */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="lg:w-2/3"
          >
            <div className="relative">
              {/* Enhanced Timeline Line */}
              <div className="absolute left-6 top-0 bottom-0 w-1 timeline-line rounded-full"></div>

              {course.chapters && course.chapters.length > 0 ? (
                course.chapters.map((chapter, chapterIndex) => {
                  const IconComponent =
                    timelineIcons[chapterIndex % timelineIcons.length];
                  const gradients = [
                    "from-blue-400 to-blue-600",
                    "from-emerald-400 to-emerald-600",
                    "from-purple-400 to-purple-600",
                    "from-amber-400 to-amber-600",
                    "from-rose-400 to-rose-600",
                  ];
                  const currentGradient =
                    gradients[chapterIndex % gradients.length];

                  return (
                    <div key={chapterIndex} className="relative mb-8">
                      {/* Chapter Header */}
                      <div className="flex items-center gap-4 mb-4">
                        <div
                          className={`relative w-12 h-12 bg-gradient-to-br ${currentGradient} rounded-xl flex items-center justify-center shadow-lg z-10`}
                        >
                          <IconComponent className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-slate-900">
                            {chapter.title}
                          </h2>
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 text-amber-500" />
                            <p className="text-slate-500 text-sm">
                              {chapter.lessons.length} lessons
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Lessons */}
                      <div className="ml-16">
                        {chapter.lessons.length > 0 ? (
                          <Card className="glass-card shadow-lg border border-purple-200/50">
                            <CardContent className="p-5">
                              <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center space-x-2">
                                  <Zap className="w-4 h-4 text-amber-500" />
                                  <span className="font-medium text-slate-700 text-sm">
                                    Course Content
                                  </span>
                                </div>
                                <Badge className="bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 px-2 py-1 text-xs border border-slate-300">
                                  {chapter.lessons.length} Lessons
                                </Badge>
                              </div>

                              <div className="space-y-3">
                                {chapter.lessons.map((lesson, lessonIndex) => {
                                  const scheduledCall =
                                    scheduledCalls?.calls.find(
                                      (call) =>
                                        call.lessonId === lesson.lessonId
                                    );
                                  const isCompleted =
                                    scheduledCall?.status.toLowerCase() ===
                                    "completed";
                                  const isCancelled =
                                    scheduledCall?.status.toLowerCase() ===
                                    "cancelled";
                                  const hasLearningGoals =
                                    lesson.learningGoals &&
                                    lesson.learningGoals.length > 0;
                                  const lessonKey = `${chapterIndex}-${lessonIndex}`;
                                  const isOpen = openLessons[lessonKey];

                                  return (
                                    <motion.div
                                      key={lessonIndex}
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: lessonIndex * 0.05 }}
                                      className="bg-gradient-to-r from-white to-blue-50/50 rounded-lg border border-blue-200 hover:shadow-md transition-all duration-200"
                                    >
                                      <div className="p-4">
                                        {/* Status Badge */}
                                        {isScheduled && scheduledCall && (
                                          <div className="flex justify-end mb-2">
                                            <Badge
                                              className={`${getStatusStyle(
                                                scheduledCall.status
                                              )} text-xs px-2 py-1 shadow-sm`}
                                            >
                                              {isCompleted && (
                                                <CheckCircle className="w-3 h-3 mr-1" />
                                              )}
                                              {scheduledCall.status}
                                            </Badge>
                                          </div>
                                        )}

                                        {/* Lesson Header */}
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center space-x-3">
                                            <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
                                            <h3 className="font-medium text-slate-900 text-sm">
                                              {lesson.title}
                                            </h3>
                                          </div>

                                          {hasLearningGoals && (
                                            <button
                                              onClick={() =>
                                                toggleLesson(
                                                  chapterIndex,
                                                  lessonIndex
                                                )
                                              }
                                              className="w-6 h-6 bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-300 rounded-full flex items-center justify-center hover:from-blue-200 hover:to-indigo-200 transition-colors duration-200"
                                            >
                                              <motion.div
                                                animate={{
                                                  rotate: isOpen ? 180 : 0,
                                                }}
                                                transition={{ duration: 0.2 }}
                                              >
                                                {isOpen ? (
                                                  <ChevronUp className="w-3 h-3 text-blue-600" />
                                                ) : (
                                                  <ChevronDown className="w-3 h-3 text-blue-600" />
                                                )}
                                              </motion.div>
                                            </button>
                                          )}
                                        </div>

                                        {/* Lesson Meta */}
                                        <div className="flex flex-wrap items-center gap-2 mb-3">
                                          {isScheduled && scheduledCall && (
                                            <>
                                              <div className="flex items-center space-x-1 bg-gradient-to-r from-blue-50 to-blue-100 px-2 py-1 rounded-full border border-blue-200">
                                                <Calendar className="w-3 h-3 text-blue-600" />
                                                <span className="text-xs font-medium text-blue-700">
                                                  {formatDate(
                                                    scheduledCall.date
                                                  )}
                                                </span>
                                              </div>
                                              {!isCompleted && !isCancelled && (
                                                <div className="flex items-center space-x-1 bg-gradient-to-r from-emerald-50 to-emerald-100 px-2 py-1 rounded-full border border-emerald-200">
                                                  <Clock className="w-3 h-3 text-emerald-600" />
                                                  <span className="text-xs font-medium text-emerald-700">
                                                    {formatTime(
                                                      scheduledCall.startTime
                                                    )}{" "}
                                                    –{" "}
                                                    {formatTime(
                                                      scheduledCall.endTime
                                                    )}
                                                  </span>
                                                </div>
                                              )}
                                            </>
                                          )}
                                        </div>

                                        {/* Lesson Actions */}
                                        <div className="flex flex-wrap gap-2">
                                          {lesson.resources &&
                                            lesson.resources.length > 0 && (
                                              <>
                                                <Button
                                                  onClick={() =>
                                                    handleViewLesson(lesson)
                                                  }
                                                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md"
                                                  size="sm"
                                                >
                                                  <PlayCircle className="w-3 h-3 mr-1" />
                                                  View Lesson
                                                </Button>
                                                <Button
                                                  onClick={() =>
                                                    handleDownloadLesson(lesson)
                                                  }
                                                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md"
                                                  size="sm"
                                                >
                                                  <Download className="w-3 h-3 mr-1" />
                                                  Download
                                                </Button>
                                              </>
                                            )}

                                          {isScheduled &&
                                            scheduledCall &&
                                            !isCompleted &&
                                            !isCancelled && (
                                              <Button
                                                onClick={() =>
                                                  handleJoinMeeting(
                                                    scheduledCall
                                                  )
                                                }
                                                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-md"
                                                size="sm"
                                              >
                                                <Video className="w-3 h-3 mr-1" />
                                                Join
                                              </Button>
                                            )}
                                        </div>

                                        {/* Learning Goals */}
                                        <AnimatePresence>
                                          {hasLearningGoals && isOpen && (
                                            <motion.div
                                              initial={{
                                                height: 0,
                                                opacity: 0,
                                              }}
                                              animate={{
                                                height: "auto",
                                                opacity: 1,
                                              }}
                                              exit={{ height: 0, opacity: 0 }}
                                              transition={{
                                                duration: 0.3,
                                                ease: "easeInOut",
                                              }}
                                              className="mt-3 pt-3 border-t border-blue-200"
                                            >
                                              <div className="flex items-center space-x-2 mb-2">
                                                <Award className="w-3 h-3 text-amber-600" />
                                                <h4 className="font-medium text-slate-700 text-sm">
                                                  Learning Goals
                                                </h4>
                                              </div>
                                              <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-3 rounded border border-amber-200">
                                                <ul className="space-y-1">
                                                  {lesson.learningGoals.map(
                                                    (goal, goalIndex) => (
                                                      <li
                                                        key={goalIndex}
                                                        className="flex items-start space-x-2 text-xs text-slate-700"
                                                      >
                                                        <div className="w-1 h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                                        <span>{goal}</span>
                                                      </li>
                                                    )
                                                  )}
                                                </ul>
                                              </div>
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>
                        ) : (
                          <Card className="glass-card shadow-lg border border-slate-200">
                            <CardContent className="p-6 text-center">
                              <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                              <p className="text-slate-500 text-sm">
                                No lessons available in this chapter.
                              </p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <Card className="glass-card shadow-lg border border-slate-200">
                  <CardContent className="p-8 text-center">
                    <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-slate-700 mb-2">
                      No Content Available
                    </h3>
                    <p className="text-slate-500">
                      This course doesn&apos;t have any chapters or lessons yet.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Document Popup */}
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

      {/* Teachers Modal */}
      <AnimatePresence>
        {isTeachersModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsTeachersModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden border border-blue-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        All Assigned Teachers
                      </h2>
                      <p className="text-blue-100 text-sm">
                        Meet your learning team
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsTeachersModalOpen(false)}
                    className="hover:bg-white/20 text-white rounded-full p-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto scrollbar-hide">
                {course.assignedTeachers.length === 0 ? (
                  <div className="text-center py-12">
                    <User className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500">
                      No teachers assigned to this course.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {course.assignedTeachers.map((teacher, index) => (
                      <motion.div
                        key={teacher._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-center space-x-3 mb-3">
                          {teacher.profileImage ? (
                            <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-blue-300">
                              <Image
                                width={40}
                                height={40}
                                src={teacher.profileImage || "/placeholder.svg"}
                                alt={teacher.name}
                                className="object-cover w-full h-full"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-white" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-medium text-slate-900 text-sm">
                              {teacher.name}
                            </h3>
                            <p className="text-slate-500 text-xs">
                              {teacher.email}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex items-center text-slate-600 bg-white/70 p-2 rounded border border-blue-100">
                            <Phone className="w-3 h-3 mr-2 text-blue-500" />
                            {teacher.phone || "N/A"}
                          </div>
                          <div className="bg-white/70 p-2 rounded border border-blue-100">
                            <div className="flex items-center mb-1">
                              <GraduationCap className="w-3 h-3 text-blue-500 mr-1" />
                              <span className="text-slate-600 font-medium">
                                Subjects
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {teacher.subjects?.map((subject, idx) => (
                                <span
                                  key={idx}
                                  className="inline-block bg-gradient-to-r from-blue-200 to-indigo-200 text-blue-800 text-xs px-2 py-0.5 rounded-full"
                                >
                                  {subject}
                                </span>
                              )) || (
                                <span className="text-slate-500 text-xs">
                                  No subjects assigned
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
