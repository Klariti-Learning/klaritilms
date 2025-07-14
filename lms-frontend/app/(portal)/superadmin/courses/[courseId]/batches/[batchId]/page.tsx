"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Target,
  X,
  UserIcon,
  ChevronLeft,
  Calendar,
  Globe,
  Clock4,
  Users,
  GraduationCap,
  Sparkles,
  BookOpen,
  MapPin,
  CheckCircle,
  AlertCircle,
  XCircle,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth"
import api from "@/lib/api"
import toast from "react-hot-toast"
import type { ApiError } from "@/types"
import { FaBook, FaFileAlt, FaFilePdf, FaFileVideo } from "react-icons/fa"
import Image from "next/image"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faUpRightFromSquare } from "@fortawesome/free-solid-svg-icons"

interface Lesson {
  lessonId: string
  title: string
  learningGoals: string[]
  format?: string
  resources?: { name: string }[]
  worksheets?: { name: string }[]
}

interface Chapter {
  title: string
  lessons: Lesson[]
}

interface Course {
  courseId: string
  _id: string
  title: string
  chapters: Chapter[]
  targetAudience: string
  duration: string
  createdAt: string
}

interface Student {
  _id: string
  name: string
  email: string
  phone?: string
  profileImage?: string
  subjects?: string[]
}

interface ScheduledCall {
  lessonId: string
  lessonTitle: string
  chapterTitle: string
  date: string
  startTime: string
  endTime: string
  duration: string
  days: string[]
  repeat: boolean
  status: string
  timezone: string
  previousDate?: string | null
  previousStartTime?: string | null
  previousEndTime?: string | null
  callDuration?: string | null
  updatedAt: string
}

interface ScheduleResponse {
  calls: ScheduledCall[]
  schedule: {
    scheduleStatus: string
    scheduleDuration: string
  }
}

interface Batch {
  _id: string
  name: string
  courseId?: string
  courseTitle?: string
  studentIds: Student[]
  createdAt: string
}

export default function BatchDetails() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const batchId = params.batchId as string

  const [batch, setBatch] = useState<Batch | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [scheduledCalls, setScheduledCalls] = useState<ScheduleResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewModal, setPreviewModal] = useState<Course | null>(null)
  const [openLessons, setOpenLessons] = useState<{ [key: string]: boolean }>({})
  const modalRef = useRef<HTMLDivElement>(null)

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem("token")
    localStorage.removeItem("userId")
    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem("deviceId")
    setError("Session expired. Please log in again.")
    router.push("/login")
  }, [router])

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role?.roleName !== "Super Admin") {

      handleUnauthorized()
      return
    }
  }, [user, authLoading, handleUnauthorized, router])

  useEffect(() => {
    const fetchBatchAndCourse = async () => {
      setLoading(true)
      setError(null)
      try {
        const deviceId = localStorage.getItem("deviceId")
        const token = localStorage.getItem("token")
        if (!deviceId || !token) {
          handleUnauthorized()
          return
        }

        const batchResponse = await api.get("/courses/batches/admin")
        const fetchedBatch = batchResponse.data?.batches?.find((b: Batch) => b._id === batchId)

        if (!fetchedBatch) {
          throw new Error("Batch not found")
        }
        setBatch(fetchedBatch)

        if (fetchedBatch.courseId) {
          const courseResponse = await api.get(`/courses/${fetchedBatch.courseId}`)
          const fetchedCourse = courseResponse.data
          if (!fetchedCourse) {
            throw new Error("Course not found")
          }

          setCourse(fetchedCourse)

          const validLessonIds =
            fetchedCourse.chapters
              ?.flatMap((chapter: Chapter) => chapter.lessons.map((lesson: Lesson) => lesson.lessonId))
              .filter(Boolean) || []

          const scheduleResponse = await api.get(`/schedule/batch/${batchId}/calls?_=${Date.now()}`)

          const scheduleData = scheduleResponse.data?.batch || {
            calls: [],
            schedule: {
              scheduleStatus: "N/A",
              scheduleDuration: "N/A",
            },
          }

          const filteredCalls = Array.isArray(scheduleData.calls)
            ? validLessonIds.length > 0
              ? scheduleData.calls.filter((call: ScheduledCall) =>
                  call.lessonId ? validLessonIds.includes(call.lessonId) : false,
                )
              : scheduleData.calls
            : []

          const latestCallsMap = new Map<string, ScheduledCall>()
          filteredCalls.forEach((call: ScheduledCall) => {
            if (call.lessonId) {
              const existingCall = latestCallsMap.get(call.lessonId)
              if (!existingCall || new Date(call.updatedAt) > new Date(existingCall.updatedAt)) {
                latestCallsMap.set(call.lessonId, call)
              }
            }
          })

          setScheduledCalls({
            calls: Array.from(latestCallsMap.values()),
            schedule: {
              scheduleStatus: scheduleData.schedule?.scheduleStatus || "N/A",
              scheduleDuration: scheduleData.schedule?.scheduleDuration || "N/A",
            },
          })
        } else {
          throw new Error("No course associated with this batch")
        }
      } catch (error) {
        const apiError = error as ApiError
        console.error("[BatchDetails] Failed to fetch batch details:", apiError)
        if (apiError.response?.status === 401) {
          handleUnauthorized()
        } else {
          const errorMessage =
            apiError.response?.data?.message || apiError.message || "Failed to fetch batch, course, or schedule details"
          setError(errorMessage)
          toast.error(errorMessage)
        }
      } finally {
        setLoading(false)
      }
    }

    if (user && user.role?.roleName === "Super Admin" && batchId) {
      fetchBatchAndCourse()
    }
  }, [user, batchId, handleUnauthorized])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setPreviewModal(null)
        setOpenLessons({})
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const toggleLesson = (chapterIndex: number, lessonIndex: number) => {
    const key = `${chapterIndex}-${lessonIndex}`
    setOpenLessons((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const getLessonIcon = () => <FaBook className="w-4 h-4 text-purple-500" />

  const getFileIcon = (format?: string) => {
    switch (format?.toLowerCase()) {
      case "pdf":
        return <FaFilePdf className="w-4 h-4 text-red-500" />
      case "video":
        return <FaFileVideo className="w-4 h-4 text-blue-500" />
      default:
        return <FaFileAlt className="w-4 h-4 text-gray-500" />
    }
  }

  const truncateText = (text: string, maxLength = 20) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength - 3) + "..."
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(":")
    const date = new Date()
    date.setHours(Number.parseInt(hours), Number.parseInt(minutes))
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Scheduled":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "Completed":
        return <CheckCircle className="w-4 h-4 text-blue-600" />
      case "Rescheduled":
        return <RotateCcw className="w-4 h-4 text-yellow-600" />
      case "Cancelled":
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Scheduled":
        return "bg-green-100 text-green-700 border-green-200"
      case "Completed":
        return "bg-blue-100 text-blue-700 border-blue-200"
      case "Rescheduled":
        return "bg-yellow-100 text-yellow-700 border-yellow-200"
      case "Cancelled":
        return "bg-red-100 text-red-700 border-red-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  const isScheduled = scheduledCalls?.calls && Array.isArray(scheduledCalls.calls) && scheduledCalls.calls.length > 0

  const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  const activeDaysText = scheduledCalls?.calls?.[0]?.days
    ? weekdays.every((day) => scheduledCalls.calls[0].days.includes(day))
      ? "Everyday"
      : scheduledCalls.calls[0].days.join(", ")
    : "N/A"

  if (authLoading || loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
          className="h-16 w-16"
        >
          <div className="h-16 w-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
        </motion.div>
      </div>
    )
  }

  if (!user || !user.role || user.role.roleName !== "Super Admin") {
    return null
  }

  if (!batch || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center p-8 bg-white rounded-2xl shadow-lg border"
        >
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <X className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">{error || "Batch Not Found"}</h2>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            {error ? "An error occurred while fetching the batch details." : "The requested batch could not be found."}
          </p>
          <Button
            onClick={() => router.push(`/superadmin/courses/${params.courseId}/preview`)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-8 py-3"
          >
            Back to Preview
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen mt-15 bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push(`/superadmin/courses/${params.courseId}/preview`)}
                className="text-gray-600 hover:bg-gray-100 rounded-full p-2"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-blue-600 mb-1">{batch.name}</h1>
                <p className="text-gray-600 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {batch.studentIds.length} Students Enrolled
                </p>
              </div>
            </div>
            {isScheduled && (
              <Badge className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium">Scheduled</Badge>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Students</h2>
                    <p className="text-gray-600 text-sm">Manage your batch students</p>
                  </div>
                </div>
                {course && (
                  <Button
                    onClick={() => setPreviewModal(course)}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 flex items-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    Preview Course
                  </Button>
                )}
              </div>

              {batch.studentIds.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <Users className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">No Students Yet</h3>
                  <p className="text-gray-600">Students will appear here once they enroll in this batch.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {batch.studentIds.map((student, index) => (
                    <motion.div
                      key={student._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Card className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardContent className="p-4 text-center">
                          <div className="mb-3">
                            {student.profileImage ? (
                              <Image
                                src={student.profileImage || "/placeholder.svg"}
                                alt={student.name}
                                width={60}
                                height={60}
                                className="w-15 h-15 rounded-full object-cover mx-auto border-2 border-gray-200"
                              />
                            ) : (
                              <div className="w-15 h-15 rounded-full bg-gray-100 flex items-center justify-center mx-auto border-2 border-gray-200">
                                <UserIcon className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <h3 className="font-semibold text-gray-900 mb-1" title={student.name}>
                            {student.name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-1 truncate">{student.email}</p>
                          {student.phone && <p className="text-sm text-gray-600 mb-2 truncate">{student.phone}</p>}
                          {student.subjects && student.subjects.length > 0 && (
                            <div className="flex flex-wrap gap-1 justify-center">
                              {student.subjects.slice(0, 2).map((subject, idx) => (
                                <Badge
                                  key={idx}
                                  className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full border-0"
                                >
                                  {subject}
                                </Badge>
                              ))}
                              {student.subjects.length > 2 && (
                                <Badge className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full border-0">
                                  +{student.subjects.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {isScheduled && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Schedule Details</h2>
                      <p className="text-gray-600 text-sm">View and manage class schedules</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push(`/superadmin/batches/${batchId}`)}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faUpRightFromSquare} className="w-4 h-4" />
                    Open Full Schedule
                  </Button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Clock4 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-blue-600 font-medium">Call Duration</p>
                        <p className="text-lg font-semibold text-blue-800">
                          {scheduledCalls?.calls[0]?.callDuration || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Globe className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-green-600 font-medium">Timezone</p>
                        <p className="text-lg font-semibold text-green-800">
                          {scheduledCalls?.calls[0]?.timezone || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Clock className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-purple-600 font-medium">Total Duration</p>
                        <p className="text-lg font-semibold text-purple-800">
                          {scheduledCalls?.schedule.scheduleDuration || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-orange-600 font-medium">Active Days</p>
                        <p className="text-lg font-semibold text-orange-800">{activeDaysText}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-blue-600 text-white">
                          <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4" />
                              Lesson
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              Date
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Time
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left font-semibold text-sm uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              Status
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {scheduledCalls &&
                          (() => {
                            const chapterGroups =
                              course?.chapters
                                ?.map((chapter) => ({
                                  chapter,
                                  calls: scheduledCalls.calls.filter((call) => call.chapterTitle === chapter.title),
                                }))
                                .filter((group) => group.calls.length > 0) || []

                            return chapterGroups.map((group, groupIndex) => [
                              <tr key={`chapter-${groupIndex}`} className="bg-gray-50">
                                <td
                                  colSpan={4}
                                  className="px-6 py-3 font-semibold text-blue-600 border-l-4 border-blue-500"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                                      {groupIndex + 1}
                                    </div>
                                    {group.chapter.title}
                                  </div>
                                </td>
                              </tr>,
                              ...group.calls.map((call, callIndex) => {
                                const isCancelled = call.status === "Cancelled"
                                const isRescheduled = call.status === "Rescheduled"
                                return (
                                  <motion.tr
                                    key={`call-${groupIndex}-${callIndex}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: callIndex * 0.1 }}
                                    className={`hover:bg-gray-50 transition-colors duration-200 ${
                                      isCancelled ? "opacity-60" : ""
                                    }`}
                                  >
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        <div>
                                          <p
                                            className={`font-medium ${
                                              isCancelled ? "line-through text-gray-500" : "text-gray-900"
                                            }`}
                                          >
                                            {call.lessonTitle === "Unknown Lesson"
                                              ? `Lesson ${callIndex + 1}`
                                              : truncateText(call.lessonTitle, 30)}
                                          </p>
                                          <p className="text-sm text-gray-500">Duration: {call.callDuration}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="space-y-1">
                                        {isRescheduled && call.previousDate && (
                                          <div className="text-sm text-gray-400 line-through italic">
                                            {formatDate(call.previousDate)}
                                          </div>
                                        )}
                                        <div
                                          className={`font-medium ${
                                            isCancelled ? "line-through text-gray-500" : "text-gray-900"
                                          }`}
                                        >
                                          {formatDate(call.date)}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="space-y-1">
                                        {isRescheduled && call.previousStartTime && call.previousEndTime && (
                                          <div className="text-sm text-gray-400 line-through italic">
                                            {formatTime(call.previousStartTime)} - {formatTime(call.previousEndTime)}
                                          </div>
                                        )}
                                        <div
                                          className={`font-medium ${
                                            isCancelled ? "line-through text-gray-500" : "text-gray-900"
                                          }`}
                                        >
                                          {formatTime(call.startTime)} - {formatTime(call.endTime)}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                        {getStatusIcon(call.status)}
                                        <Badge
                                          className={`${getStatusBadgeClass(
                                            call.status,
                                          )} px-3 py-1 rounded-full text-xs font-medium border`}
                                        >
                                          {call.status}
                                        </Badge>
                                      </div>
                                    </td>
                                  </motion.tr>
                                )
                              }),
                            ])
                          })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <AnimatePresence>
          {previewModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            >
              <motion.div
                ref={modalRef}
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ duration: 0.3, type: "spring", damping: 20 }}
                className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-hidden relative"
              >
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Course Preview</h2>
                      <p className="text-gray-600 text-sm">Detailed course content overview</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setPreviewModal(null)
                      setOpenLessons({})
                    }}
                    className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-2"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="overflow-y-auto max-h-[calc(90vh-120px)] scrollbar-hide">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg mb-4">
                      <Sparkles className="w-4 h-4" />
                      <span className="font-semibold">{previewModal.title}</span>
                      <Sparkles className="w-4 h-4" />
                    </div>
                    {(previewModal.targetAudience || previewModal.duration) && (
                      <div className="flex justify-center gap-3">
                        {previewModal.targetAudience && (
                          <Badge className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full border-0">
                            <Target className="w-3 h-3 mr-1" />
                            {previewModal.targetAudience}
                          </Badge>
                        )}
                        {previewModal.duration && (
                          <Badge className="bg-green-100 text-green-700 px-3 py-1 rounded-full border-0">
                            <Clock className="w-3 h-3 mr-1" />
                            {previewModal.duration}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {previewModal.chapters && previewModal.chapters.length > 0 ? (
                    <div>
                      <div className="text-center mb-6">
                        <h3 className="text-lg font-semibold text-blue-600 mb-2">Table of Contents</h3>
                        <div className="w-16 h-0.5 bg-blue-600 rounded-full mx-auto"></div>
                      </div>

                      <div className="space-y-4">
                        {previewModal.chapters.map((chapter, chapterIndex) =>
                          chapter.title?.trim() ? (
                            <div key={chapterIndex} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                                  {chapterIndex + 1}
                                </div>
                                <h4 className="font-semibold text-gray-900">{chapter.title}</h4>
                              </div>

                              {chapter.lessons.length > 0 && (
                                <div className="space-y-2">
                                  {chapter.lessons.map((lesson, lessonIndex) => (
                                    <div key={lessonIndex} className="bg-white rounded-lg p-3 border border-gray-100">
                                      <div
                                        className="flex items-center justify-between cursor-pointer"
                                        onClick={() => toggleLesson(chapterIndex, lessonIndex)}
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
                                            {getLessonIcon()}
                                          </div>
                                          <span className="font-medium text-gray-800 text-sm">
                                            Lesson {lessonIndex + 1}: {lesson.title || "Untitled"}
                                          </span>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-gray-400 hover:text-gray-600 p-1"
                                        >
                                          {openLessons[`${chapterIndex}-${lessonIndex}`] ? (
                                            <ChevronUp className="w-4 h-4" />
                                          ) : (
                                            <ChevronDown className="w-4 h-4" />
                                          )}
                                        </Button>
                                      </div>

                                      <AnimatePresence>
                                        {openLessons[`${chapterIndex}-${lessonIndex}`] && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="mt-3 pt-3 border-t border-gray-200"
                                          >
                                            {lesson.learningGoals?.length > 0 && (
                                              <div className="mb-3">
                                                <h5 className="font-medium text-gray-700 mb-2 text-sm">
                                                  🎯 Learning Goals
                                                </h5>
                                                <ul className="space-y-1">
                                                  {lesson.learningGoals.map((goal: string, index: number) =>
                                                    goal?.trim() ? (
                                                      <li
                                                        key={index}
                                                        className="flex items-start gap-2 text-sm text-gray-600"
                                                      >
                                                        <span className="w-1 h-1 bg-purple-400 rounded-full mt-2 flex-shrink-0"></span>
                                                        {goal}
                                                      </li>
                                                    ) : null,
                                                  )}
                                                </ul>
                                              </div>
                                            )}

                                            {Array.isArray(lesson.resources) && lesson.resources.length > 0 && (
                                              <div className="mb-3">
                                                <h5 className="font-medium text-gray-700 mb-2 text-sm">📎 Resources</h5>
                                                <div className="grid gap-2">
                                                  {lesson.resources.map((file, fileIndex) => (
                                                    <div
                                                      key={fileIndex}
                                                      className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                                                    >
                                                      {getFileIcon(lesson.format)}
                                                      <span className="text-sm text-gray-600 truncate">
                                                        {file.name}
                                                      </span>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}

                                            {Array.isArray(lesson.worksheets) && lesson.worksheets.length > 0 && (
                                              <div>
                                                <h5 className="font-medium text-gray-700 mb-2 text-sm">
                                                  📝 Worksheets
                                                </h5>
                                                <div className="grid gap-2">
                                                  {lesson.worksheets.map((worksheet, fileIndex) => (
                                                    <div
                                                      key={fileIndex}
                                                      className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                                                    >
                                                      {getFileIcon(lesson.format)}
                                                      <span className="text-sm text-gray-600 truncate">
                                                        {worksheet.name}
                                                      </span>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : null,
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600">No chapters available for this course.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}
