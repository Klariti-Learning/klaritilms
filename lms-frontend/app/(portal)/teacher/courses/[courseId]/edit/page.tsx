"use client"

import type React from "react"

import { useState, useEffect, useRef, useMemo, Suspense, useCallback } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/lib/auth"
import api from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import { BsFileEarmarkPdf, BsFiletypePptx, BsFiletypeMp3, BsFiletypeMp4 } from "react-icons/bs"
import { FaRegFileWord, FaFile, FaBook } from "react-icons/fa"
import { AiOutlineFileJpg } from "react-icons/ai"
import { ChevronDown, ChevronUp, ArrowLeft, Plus, X, Target, Clock, RotateCcw, GripVertical } from "lucide-react"
import { DndProvider, useDrag, useDrop } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import Loader from "@/components/Loader"
import type { ApiError } from "@/types"

interface Chapter {
  title: string | null
  lessons: Lesson[]
}

interface GoogleDriveFile {
  id: string
  name: string
  mimeType: string
  webViewLink?: string
}

interface Lesson {
  title: string | null
  format: string | null
  resources: (File | { url: string; name: string; type: string; public_id: string } | GoogleDriveFile)[]
  worksheets: (File | { url: string; name: string; type: string; public_id: string } | GoogleDriveFile)[]
  learningGoals: (string | null)[]
}

interface FormState {
  title: string | null
  chapters: Chapter[]
  targetAudience: string | null
  duration: string | null
}

interface DraggableChapterProps {
  index: number
  moveChapter: (fromIndex: number, toIndex: number) => void
  canDrag: boolean
  children: React.ReactNode
}

interface DraggableLessonProps {
  chapterIndex: number
  lessonIndex: number
  moveLesson: (chapterIndex: number, fromIndex: number, toIndex: number) => void
  canDrag: boolean
  children: React.ReactNode
}

interface ResourceResponse {
  url: string
  name: string
  type: string
  fileId: string
}

interface LessonResponse {
  lessonId?: string
  title: string | null
  format: string | null
  resources: ResourceResponse[]
  worksheets: ResourceResponse[]
  learningGoals: (string | null)[]
}

interface ChapterResponse {
  chapterId?: string
  title: string | null
  lessons: LessonResponse[]
}

interface CourseResponse {
  _id: string
  title: string | null
  chapters: ChapterResponse[]
  targetAudience: string | null
  duration: string | null
}

interface StudentResponse {
  _id: string
  name: string
  email: string
  profileImage?: string
}

interface Modifications {
  title?: string | null
  chapters?: ChapterResponse[]
  targetAudience?: string | null
  duration?: string | null
}

interface BatchResponse {
  _id: string
  name: string
  courseId: string
  courseDetails: CourseResponse
  students: StudentResponse[]
  teacherCourseModifications: Modifications
  batchSpecificModifications: Modifications
  studentSpecificModifications?: Array<{
    studentId: string
    title?: string | null
    chapters?: ChapterResponse[]
    targetAudience?: string | null
    duration?: string | null
  }>
}

const ItemTypes = {
  CHAPTER: "chapter",
  LESSON: "lesson",
}

const DraggableChapter: React.FC<DraggableChapterProps> = ({ index, moveChapter, canDrag, children }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.CHAPTER,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: () => canDrag,
  })

  const [, drop] = useDrop({
    accept: ItemTypes.CHAPTER,
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveChapter(item.index, index)
        item.index = index
      }
    },
  })

  drag(drop(ref))

  return (
    <div ref={ref} className={`relative group ${isDragging ? "opacity-50" : "opacity-100"}`}>
      {canDrag && (
        <div className="absolute left-[-24px] top-1/2 transform -translate-y-1/2 hidden group-hover:block">
          <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
        </div>
      )}
      {children}
    </div>
  )
}

const DraggableLesson: React.FC<DraggableLessonProps> = ({
  chapterIndex,
  lessonIndex,
  moveLesson,
  canDrag,
  children,
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.LESSON,
    item: { chapterIndex, lessonIndex },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: () => canDrag,
  })

  const [, drop] = useDrop({
    accept: ItemTypes.LESSON,
    hover: (item: { chapterIndex: number; lessonIndex: number }) => {
      if (item.chapterIndex === chapterIndex && item.lessonIndex !== lessonIndex) {
        moveLesson(chapterIndex, item.lessonIndex, lessonIndex)
        item.lessonIndex = lessonIndex
      }
    },
  })

  drag(drop(ref))

  return (
    <div ref={ref} className={`relative group ${isDragging ? "opacity-50" : "opacity-100"}`}>
      {canDrag && (
        <div className="absolute left-[-24px] top-1/2 transform -translate-y-1/2 hidden group-hover:block">
          <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
        </div>
      )}
      {children}
    </div>
  )
}

export function EditCoursePage() {
  const { user, loading: authLoading, deviceId } = useAuth()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const courseId = params.courseId as string
  const mode = searchParams.get("mode") || "course"
  const batchId = searchParams.get("batchId")
  const studentIds = useMemo(
    () =>
      searchParams
        .get("studentIds")
        ?.split(",")
        .filter((id) => id) || [],
    [searchParams],
  )
  const [formLoading, setFormLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formState, setFormState] = useState<FormState>({
    title: null,
    chapters: [],
    targetAudience: null,
    duration: null,
  })
  const [originalCourseData, setOriginalCourseData] = useState<FormState | null>(null)
  const [batchData, setBatchData] = useState<BatchResponse | null>(null)
  const [studentData, setStudentData] = useState<StudentResponse[]>([])
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [openGoals, setOpenGoals] = useState<{ [key: string]: boolean }>({})
  const [openLessons, setOpenLessons] = useState<{ [key: string]: boolean }>({})
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const worksheetInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const formatOptions = ["video", "audio", "pdf", "word", "ppt", "image", "generic"]
  const targetAudienceOptions = ["Beginner", "Intermediate", "Advanced"]
  const durationOptions = ["1 Week", "2 Weeks", "3 Weeks", "4 Weeks", "1 Month", "2 Months", "3 Months", "6 Months"]

  const [selectionMode, setSelectionMode] = useState<{
    [key: string]: "local" | "drive" | null
  }>({})
  const [isDriveFilesModalOpen, setIsDriveFilesModalOpen] = useState(false)
  const [isFetchingDriveFiles, setIsFetchingDriveFiles] = useState(false)
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([])
  const [selectedDriveFile, setSelectedDriveFile] = useState<GoogleDriveFile | null>(null)
  const [currentSelectionContext, setCurrentSelectionContext] = useState<{
    chapterIndex: number
    lessonIndex: number
    type: "resources" | "worksheets"
    format: string | null
  } | null>(null)

  const [openResources, setOpenResources] = useState<{
    [key: string]: boolean
  }>({})
  const [openWorksheets, setOpenWorksheets] = useState<{
    [key: string]: boolean
  }>({})

  const handleUnauthorized = useCallback(() => {
    console.debug("[EditCoursePage] Handling unauthorized access")
    localStorage.removeItem("token")
    localStorage.removeItem("userId")
    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem("deviceId")
    setErrors({ auth: "Session expired. Please log in again." })
    router.push("/login")
  }, [router])

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role?.roleName !== "Teacher") {
      console.debug("[EditCoursePage] Redirecting due to invalid role or no user", {
        user: !!user,
        role: user?.role?.roleName,
        authLoading,
      })
      handleUnauthorized()
      return
    }
  }, [user, authLoading, handleUnauthorized, router])

  useEffect(() => {
    const fetchData = async () => {
      setFetchLoading(true)
      try {
        const token = localStorage.getItem("token")
        if (!token || !deviceId) {
          console.debug("[EditCoursePage] Missing token or deviceId", { token, deviceId })
          handleUnauthorized()
          return
        }

        let courseData: FormState = {
          title: null,
          chapters: [],
          targetAudience: null,
          duration: null,
        }

        if (mode === "course") {
          const courseResponse = await api.get(`/courses/${courseId}`)
          const course: CourseResponse = courseResponse.data
          courseData = {
            title: course.title,
            chapters: course.chapters.map((chapter: ChapterResponse) => ({
              title: chapter.title,
              lessons: chapter.lessons.map((lesson: LessonResponse) => ({
                title: lesson.title,
                format: lesson.format,
                resources: lesson.resources.map((res: ResourceResponse) => ({
                  url: res.url,
                  name: res.name,
                  type: res.type,
                  public_id: res.fileId,
                })),
                worksheets: lesson.worksheets.map((ws: ResourceResponse) => ({
                  url: ws.url,
                  name: ws.name,
                  type: ws.type,
                  public_id: ws.fileId,
                })),
                learningGoals: lesson.learningGoals,
              })),
            })),
            targetAudience: course.targetAudience,
            duration: course.duration,
          }
        } else if ((mode === "batch" || mode === "student") && batchId) {
          const batchResponse = await api.get(`/courses/batches/teacher/${batchId}`)
          const batch: BatchResponse = batchResponse.data
          setBatchData(batch)

          if (batch.courseId !== courseId) {
            throw new Error("Batch is not associated with the specified course")
          }

          let modifications: Modifications

          const isEmptyModifications = (mods: Modifications) =>
            (!mods.title || mods.title.trim() === "") &&
            (!mods.chapters || mods.chapters.length === 0) &&
            (!mods.targetAudience || mods.targetAudience.trim() === "") &&
            (!mods.duration || mods.duration.trim() === "")

          if (mode === "student" && studentIds.length > 0) {
            const selectedModifications = batch.studentSpecificModifications?.find((mod) =>
              studentIds.includes(mod.studentId),
            )
            modifications =
              !selectedModifications || isEmptyModifications(selectedModifications)
                ? !isEmptyModifications(batch.batchSpecificModifications)
                  ? batch.batchSpecificModifications
                  : !isEmptyModifications(batch.teacherCourseModifications)
                    ? batch.teacherCourseModifications
                    : batch.courseDetails
                : selectedModifications
          } else {
            modifications = !isEmptyModifications(batch.batchSpecificModifications)
              ? batch.batchSpecificModifications
              : !isEmptyModifications(batch.teacherCourseModifications)
                ? batch.teacherCourseModifications
                : batch.courseDetails
          }

          courseData = {
            title: modifications.title ?? batch.courseDetails.title,
            chapters: (modifications.chapters ?? batch.courseDetails.chapters).map((chapter: ChapterResponse) => ({
              title: chapter.title,
              lessons: chapter.lessons.map((lesson: LessonResponse) => ({
                title: lesson.title,
                format: lesson.format,
                resources: lesson.resources.map((res: ResourceResponse) => ({
                  url: res.url,
                  name: res.name,
                  type: res.type,
                  public_id: res.fileId,
                })),
                worksheets: lesson.worksheets.map((ws: ResourceResponse) => ({
                  url: ws.url,
                  name: ws.name,
                  type: ws.type,
                  public_id: ws.fileId,
                })),
                learningGoals: lesson.learningGoals,
              })),
            })),
            targetAudience: modifications.targetAudience ?? batch.courseDetails.targetAudience,
            duration: modifications.duration ?? batch.courseDetails.duration,
          }

          if (mode === "student" && studentIds.length > 0) {
            const selectedStudents = batch.students.filter((student) => studentIds.includes(student._id))
            setStudentData(selectedStudents)
            if (selectedStudents.length !== studentIds.length) {
              throw new Error("Some students were not found in the batch")
            }
          }
        }

        setFormState(courseData)
        setOriginalCourseData(courseData)
      } catch (error) {
        const apiError = error as ApiError
        console.error("[EditCoursePage] Fetch error:", {
          message: apiError.response?.data?.message || apiError.message,
          status: apiError.response?.status,
        })
        if (apiError.response?.status === 401) {
          handleUnauthorized()
        } else {
          setErrors({ fetch: apiError.response?.data?.message || "Failed to fetch data" })
        }
      } finally {
        setFetchLoading(false)
      }
    }

    if (user && user.role?.roleName === "Teacher") {
      fetchData()
    }
  }, [user, courseId, mode, batchId, studentIds, deviceId, handleUnauthorized])

  const fetchDriveFiles = async (folderId: string, format: string | null) => {
    try {
      setIsFetchingDriveFiles(true)
      const token = localStorage.getItem("token")
      if (!token || !deviceId) {
        console.debug("[EditCoursePage] Missing token or deviceId in fetchDriveFiles", {
          token,
          deviceId,
        })
        handleUnauthorized()
        return
      }

      const response = await api.get(`/drive/files/${folderId}`, {
        params: { fileType: format ? getFileType(format) : undefined },
      })
      const transformedFiles = (response.data.items || []).map((file: GoogleDriveFile) => ({
        ...file,
        name: truncateFilename(file.name),
      }))
      setDriveFiles(transformedFiles)
    } catch (error) {
      const apiError = error as ApiError
      console.error("[EditCoursePage] Error fetching drive files:", {
        message: apiError.response?.data?.message || apiError.message,
        status: apiError.response?.status,
      })
      if (apiError.response?.status === 401) {
        handleUnauthorized()
      } else {
        setErrors({ drive: apiError.response?.data?.message || "Failed to fetch Google Drive files" })
      }
    } finally {
      setIsFetchingDriveFiles(false)
    }
  }

  const getFileType = (format: string | null) => {
    switch (format) {
      case "pdf":
        return "pdf"
      case "word":
        return "word"
      case "ppt":
        return "ppt"
      case "image":
        return "image"
      case "video":
        return "video"
      case "audio":
        return "audio"
      case "generic":
        return ""
      default:
        return ""
    }
  }

  const truncateFilename = (name: string, maxLength = 20): string => {
    const extensionIndex = name.lastIndexOf(".")
    const extension = name.substring(extensionIndex)
    const baseName = name.substring(0, extensionIndex)
    if (baseName.length <= maxLength) return name
    const words = baseName.split(/[_ ]/)
    let result = ""
    let i = 0
    while (i < words.length && (result + words[i]).length <= maxLength) {
      result += (result ? " " : "") + words[i]
      i++
    }
    return `${result}.......${extension}`
  }

  const handleDriveFileSelect = (
    chapterIndex: number,
    lessonIndex: number,
    type: "resources" | "worksheets",
    file: GoogleDriveFile,
  ) => {
    setFormState((prev) => {
      const newChapters = [...prev.chapters]
      newChapters[chapterIndex].lessons[lessonIndex][type] = [
        ...newChapters[chapterIndex].lessons[lessonIndex][type],
        file,
      ].slice(0, 10)
      return { ...prev, chapters: newChapters }
    })
    setSelectedDriveFile(null)
    setIsDriveFilesModalOpen(false)
    setSelectionMode((prev) => ({
      ...prev,
      [`${chapterIndex}-${lessonIndex}-${type}`]: null,
    }))
    setErrors({})
    setIsSubmitted(false)
  }

  const toggleResources = (chapterIndex: number, lessonIndex: number) => {
    const key = `${chapterIndex}-${lessonIndex}`
    setOpenResources((prev) => {
      const isOpening = !prev[key]
      if (isOpening) {
        setSelectionMode((prevMode) => ({
          ...prevMode,
          [`${key}-resources`]: null,
        }))
      } else {
        setSelectionMode((prevMode) => ({
          ...prevMode,
          [`${key}-resources`]: null,
        }))
      }
      return { ...prev, [key]: !prev[key] }
    })
    setErrors({})
    setIsSubmitted(false)
  }

  const toggleWorksheets = (chapterIndex: number, lessonIndex: number) => {
    const key = `${chapterIndex}-${lessonIndex}`
    setOpenWorksheets((prev) => {
      const isOpening = !prev[key]
      if (isOpening) {
        setSelectionMode((prevMode) => ({
          ...prevMode,
          [`${key}-worksheets`]: null,
        }))
      } else {
        setSelectionMode((prevMode) => ({
          ...prevMode,
          [`${key}-worksheets`]: null,
        }))
      }
      return { ...prev, [key]: !prev[key] }
    })
    setErrors({})
    setIsSubmitted(false)
  }

  const getFileIcon = (format: string | null) => {
    if (!format) return <FaFile className="w-5 h-5 text-gray-600" />
    if (format.includes("video")) return <BsFiletypeMp4 className="w-5 h-5 text-blue-600" />
    if (format.includes("audio")) return <BsFiletypeMp3 className="w-5 h-5 text-green-600" />
    if (format.includes("pdf")) return <BsFileEarmarkPdf className="w-5 h-5 text-red-600" />
    if (format.includes("document")) return <FaRegFileWord className="w-5 h-5 text-blue-800" />
    if (format.includes("presentation")) return <BsFiletypePptx className="w-5 h-5 text-orange-600" />
    if (format.includes("image")) return <AiOutlineFileJpg className="w-5 h-5 text-purple-600" />
    switch (format) {
      case "video":
        return <BsFiletypeMp4 className="w-5 h-5 text-blue-600" />
      case "audio":
        return <BsFiletypeMp3 className="w-5 h-5 text-green-600" />
      case "pdf":
        return <BsFileEarmarkPdf className="w-5 h-5 text-red-600" />
      case "word":
        return <FaRegFileWord className="w-5 h-5 text-blue-800" />
      case "ppt":
        return <BsFiletypePptx className="w-5 h-5 text-orange-600" />
      case "image":
        return <AiOutlineFileJpg className="w-5 h-5 text-purple-600" />
      case "generic":
        return <FaFile className="w-5 h-5 text-gray-600" />
      default:
        return <FaFile className="w-5 h-5 text-gray-600" />
    }
  }

  const getLessonIcon = (format: string | null) => {
    switch (format) {
      case "video":
        return <BsFiletypeMp4 className="w-5 h-5 text-blue-500" />
      case "audio":
        return <BsFiletypeMp3 className="w-5 h-5 text-green-500" />
      case "pdf":
        return <BsFileEarmarkPdf className="w-5 h-5 text-red-500" />
      case "word":
        return <FaRegFileWord className="w-5 h-5 text-blue-700" />
      case "ppt":
        return <BsFiletypePptx className="w-5 h-5 text-orange-500" />
      case "image":
        return <AiOutlineFileJpg className="w-5 h-5 text-purple-500" />
      case "generic":
        return <FaFile className="w-5 h-5 text-gray-500" />
      default:
        return <FaBook className="w-5 h-5 text-gray-500" />
    }
  }

  const getFileAccept = (format: string | null) => {
    switch (format) {
      case "video":
        return "video/mp4"
      case "audio":
        return "audio/mpeg,audio/wav"
      case "pdf":
        return "application/pdf"
      case "word":
        return "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      case "ppt":
        return "application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
      case "image":
        return "image/jpeg,image/png,image/gif,image/avif,image/webp,image/svg+xml"
      case "generic":
        return "video/mp4,audio/mpeg,audio/wav,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png,image/gif,image/avif,image/webp,image/svg+xml"
      default:
        return ""
    }
  }

  const validateForm = (): { [key: string]: string } => {
    const newErrors: { [key: string]: string } = {}

    if (!formState.title || !formState.title.trim()) {
      newErrors.title = "Please fill the course title field"
    }
    if (!formState.targetAudience) {
      newErrors.targetAudience = "Please fill the target audience field"
    }
    if (!formState.duration) {
      newErrors.duration = "Please fill the duration field"
    }
    if (formState.chapters.length === 0) {
      newErrors.chapters = "Please add at least one chapter"
    } else {
      if (formState.chapters.some((chapter) => !chapter.title || !chapter.title.trim())) {
        newErrors.chapters = "All chapter titles must be filled"
      }
      if (formState.chapters.some((chapter) => chapter.lessons.length === 0)) {
        newErrors.lessons = "Each chapter must have at least one lesson"
      }
      if (
        formState.chapters.some((chapter) => chapter.lessons.some((lesson) => !lesson.title || !lesson.title.trim()))
      ) {
        newErrors.lessons = "All lesson titles must be filled"
      }
      if (formState.chapters.some((chapter) => chapter.lessons.some((lesson) => !lesson.format))) {
        newErrors.format = "All lessons must have a format selected"
      }
    }
    return newErrors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setIsSubmitted(true)
    setErrors({})

    const newErrors = validateForm()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setFormLoading(false)
      return
    }

    try {
      const token = localStorage.getItem("token")
      if (!token || !deviceId) {
        console.debug("[EditCoursePage] Missing token or deviceId in handleSubmit", {
          token,
          deviceId,
        })
        handleUnauthorized()
        return
      }
      const formData = new FormData()
      if (formState.title) formData.append("title", formState.title.trim())
      if (formState.targetAudience) formData.append("targetAudience", formState.targetAudience)
      if (formState.duration) formData.append("duration", formState.duration)
      if (formState.chapters.length > 0) {
        const chaptersJson = JSON.stringify(
          formState.chapters.map((chapter) => ({
            title: chapter.title?.trim() || "",
            lessons: chapter.lessons.map((lesson) => ({
              title: lesson.title?.trim() || "",
              format: lesson.format || "",
              resourceCount: lesson.resources.length,
              worksheetCount: lesson.worksheets.length,
              learningGoals: lesson.learningGoals,
            })),
          })),
        )
        formData.append("chapters", chaptersJson)

        formState.chapters.forEach((chapter, chapterIndex) => {
          chapter.lessons.forEach((lesson, lessonIndex) => {
            lesson.resources.forEach((res, resourceIndex) => {
              const key = `resources[${chapterIndex}][${lessonIndex}][${resourceIndex}]`
              if (res instanceof File) {
                formData.append(key, res)
              } else if ("id" in res) {
                formData.append(`${key}[id]`, res.id)
                formData.append(`${key}[name]`, res.name)
                formData.append(`${key}[mimeType]`, res.mimeType)
                if (res.webViewLink) formData.append(`${key}[url]`, res.webViewLink)
              } else {
                formData.append(`${key}[url]`, res.url)
                formData.append(`${key}[name]`, res.name)
                formData.append(`${key}[type]`, res.type)
                formData.append(`${key}[fileId]`, res.public_id)
              }
            })
            lesson.worksheets.forEach((ws, worksheetIndex) => {
              const key = `worksheets[${chapterIndex}][${lessonIndex}][${worksheetIndex}]`
              if (ws instanceof File) {
                formData.append(key, ws)
              } else if ("id" in ws) {
                formData.append(`${key}[id]`, ws.id)
                formData.append(`${key}[name]`, ws.name)
                formData.append(`${key}[mimeType]`, ws.mimeType)
                if (ws.webViewLink) formData.append(`${key}[url]`, ws.webViewLink)
              } else {
                formData.append(`${key}[url]`, ws.url)
                formData.append(`${key}[name]`, ws.name)
                formData.append(`${key}[type]`, ws.type)
                formData.append(`${key}[fileId]`, ws.public_id)
              }
            })
          })
        })
      }

      let apiUrl = ""
      if (mode === "course") {
        apiUrl = `courses/teacher/edit-course/${courseId}`
      } else if (mode === "batch" && batchId) {
        apiUrl = `courses/batch/course/edit/${batchId}`
        formData.append("courseId", courseId)
      } else if (mode === "student" && batchId && studentIds.length > 0) {
        apiUrl = `courses/batch/${batchId}/student/${studentIds.join(",")}`
        formData.append("courseId", courseId)
      } else {
        throw new Error("Invalid mode or missing parameters")
      }

      await api.put(apiUrl, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      setIsSubmitted(false)
      setErrors({})
      router.push("/teacher/courses")
    } catch (error) {
      const apiError = error as ApiError
      console.error("[EditCoursePage] Error editing course:", {
        message: apiError.response?.data?.message || apiError.message,
        status: apiError.response?.status,
      })
      if (apiError.response?.status === 401) {
        handleUnauthorized()
      } else {
        setErrors({ submit: apiError.response?.data?.message || "Failed to edit course" })
      }
      setFormLoading(false)
    }
  }

  const handleBack = () => router.push("/teacher/courses")

  const handleReset = () => {
    if (originalCourseData) setFormState(originalCourseData)
    setErrors({})
    setIsSubmitted(false)
    setOpenGoals({})
    setOpenLessons({})
  }

  const moveChapter = (fromIndex: number, toIndex: number) => {
    setFormState((prev) => {
      const newChapters = [...prev.chapters]
      const [movedChapter] = newChapters.splice(fromIndex, 1)
      newChapters.splice(toIndex, 0, movedChapter)
      return { ...prev, chapters: newChapters }
    })
    setErrors({})
    setIsSubmitted(false)
  }

  const moveLesson = (chapterIndex: number, fromIndex: number, toIndex: number) => {
    setFormState((prev) => {
      const newChapters = [...prev.chapters]
      const lessons = [...newChapters[chapterIndex].lessons]
      const [movedLesson] = lessons.splice(fromIndex, 1)
      lessons.splice(toIndex, 0, movedLesson)
      newChapters[chapterIndex].lessons = lessons
      return { ...prev, chapters: newChapters }
    })
    setErrors({})
    setIsSubmitted(false)
  }

  const addChapter = () => {
    setFormState((prev) => ({
      ...prev,
      chapters: [...prev.chapters, { title: null, lessons: [] }],
    }))
    setErrors({})
    setIsSubmitted(false)
  }

  const removeChapter = (chapterIndex: number) => {
    setFormState((prev) => ({
      ...prev,
      chapters: prev.chapters.filter((_, idx) => idx !== chapterIndex),
    }))
    setErrors({})
    setIsSubmitted(false)
  }

  const addLesson = (chapterIndex: number) => {
    setFormState((prev) => {
      const newChapters = [...prev.chapters]
      newChapters[chapterIndex].lessons.push({
        title: null,
        format: "pdf",
        resources: [],
        worksheets: [],
        learningGoals: [null],
      })
      return { ...prev, chapters: newChapters }
    })
    setErrors({})
    setIsSubmitted(false)
  }

  const removeLesson = (chapterIndex: number, lessonIndex: number) => {
    setFormState((prev) => {
      const newChapters = [...prev.chapters]
      newChapters[chapterIndex].lessons = newChapters[chapterIndex].lessons.filter((_, idx) => idx !== lessonIndex)
      return { ...prev, chapters: newChapters }
    })
    setErrors({})
    setIsSubmitted(false)
  }

  const addLearningGoal = (chapterIndex: number, lessonIndex: number) => {
    setFormState((prev) => {
      const newChapters = [...prev.chapters]
      newChapters[chapterIndex].lessons[lessonIndex].learningGoals.push(null)
      return { ...prev, chapters: newChapters }
    })
    setErrors({})
    setIsSubmitted(false)
  }

  const removeLearningGoal = (chapterIndex: number, lessonIndex: number, goalIndex: number) => {
    setFormState((prev) => {
      const newChapters = [...prev.chapters]
      newChapters[chapterIndex].lessons[lessonIndex].learningGoals = newChapters[chapterIndex].lessons[
        lessonIndex
      ].learningGoals.filter((_, idx) => idx !== goalIndex)
      return { ...prev, chapters: newChapters }
    })
    setErrors({})
    setIsSubmitted(false)
  }

  const removeFile = (
    chapterIndex: number,
    lessonIndex: number,
    fileIndex: number,
    type: "resources" | "worksheets",
  ) => {
    setFormState((prev) => {
      const newChapters = [...prev.chapters]
      newChapters[chapterIndex].lessons[lessonIndex][type] = newChapters[chapterIndex].lessons[lessonIndex][
        type
      ].filter((_, idx) => idx !== fileIndex)
      return { ...prev, chapters: newChapters }
    })
    setErrors({})
    setIsSubmitted(false)
  }

  const handleFileChange = (
    chapterIndex: number,
    lessonIndex: number,
    e: React.ChangeEvent<HTMLInputElement>,
    type: "resources" | "worksheets",
  ) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setFormState((prev) => {
        const newChapters = [...prev.chapters]
        newChapters[chapterIndex].lessons[lessonIndex][type] = [
          ...newChapters[chapterIndex].lessons[lessonIndex][type],
          ...files,
        ].slice(0, 10)
        return { ...prev, chapters: newChapters }
      })
      setErrors({})
      setIsSubmitted(false)
    }
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({ ...prev, title: e.target.value || null }))
    setErrors({})
    setIsSubmitted(false)
  }

  const handleTargetAudienceChange = (value: string) => {
    setFormState((prev) => ({ ...prev, targetAudience: value || null }))
    setErrors({})
    setIsSubmitted(false)
  }

  const handleDurationChange = (value: string) => {
    setFormState((prev) => ({ ...prev, duration: value || null }))
    setErrors({})
    setIsSubmitted(false)
  }

  const handleChapterTitleChange = (chapterIndex: number, value: string) => {
    setFormState((prev) => {
      const newChapters = [...prev.chapters]
      newChapters[chapterIndex].title = value || null
      return { ...prev, chapters: newChapters }
    })
    setErrors({})
    setIsSubmitted(false)
  }

  const handleLessonTitleChange = (chapterIndex: number, lessonIndex: number, value: string) => {
    setFormState((prev) => {
      const newChapters = [...prev.chapters]
      newChapters[chapterIndex].lessons[lessonIndex].title = value || null
      return { ...prev, chapters: newChapters }
    })
    setErrors({})
    setIsSubmitted(false)
  }

  const handleLessonFormatChange = (chapterIndex: number, lessonIndex: number, value: string) => {
    setFormState((prev) => {
      const newChapters = [...prev.chapters]
      newChapters[chapterIndex].lessons[lessonIndex].format = value || null
      return { ...prev, chapters: newChapters }
    })
    setErrors({})
    setIsSubmitted(false)
  }

  const handleLearningGoalChange = (chapterIndex: number, lessonIndex: number, goalIndex: number, value: string) => {
    setFormState((prev) => {
      const newChapters = [...prev.chapters]
      newChapters[chapterIndex].lessons[lessonIndex].learningGoals[goalIndex] = value || null
      return { ...prev, chapters: newChapters }
    })
    setErrors({})
    setIsSubmitted(false)
  }

  const triggerFileInput = (
    chapterIndex: number,
    lessonIndex: number,
    format: string,
    type: "resources" | "worksheets",
  ) => {
    const key = `${chapterIndex}-${lessonIndex}-${format}-${type}`
    const refs = type === "resources" ? fileInputRefs : worksheetInputRefs
    if (refs.current[key]) {
      refs.current[key]!.click()
    }
  }

  const toggleGoals = (chapterIndex: number, lessonIndex: number) => {
    const key = `${chapterIndex}-${lessonIndex}`
    setOpenGoals((prev) => ({ ...prev, [key]: !prev[key] }))
    setErrors({})
    setIsSubmitted(false)
  }

  const toggleLesson = (chapterIndex: number, lessonIndex: number) => {
    const key = `${chapterIndex}-${lessonIndex}`
    setOpenLessons((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  if (authLoading || fetchLoading) {
    return (
      <Loader
        height="80"
        width="80"
        color="#4f46e5"
        ariaLabel="triangle-loading"
        wrapperStyle={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
        wrapperClass=""
        visible={true}
      />
    )
  }

  if (!user || user.role?.roleName !== "Teacher") {
    router.push("/login")
    return null
  }

  return (
    <TooltipProvider>
      <DndProvider backend={HTML5Backend}>
        <div className="p-8 bg-gray-50 min-h-screen mt-10">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
              <div className="flex items-center mb-6 space-x-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      className="border-blue-500 text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-full px-4 py-2 transition-all duration-200 shadow-sm cursor-pointer"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Back to Courses</p>
                  </TooltipContent>
                </Tooltip>
                {formState.title && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleReset}
                        className="border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-full px-4 py-2 transition-all duration-200 shadow-sm cursor-pointer"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Reset to original data</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <div>
                <h2 className="text-3xl font-extrabold text-gray-900">
                  {mode === "course"
                    ? "Edit Course"
                    : mode === "batch"
                      ? "Edit Course for Batch"
                      : "Edit Course for Students in Batch"}
                </h2>
              </div>

              {(mode === "batch" || mode === "student") && batchData && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6 mb-5"
                >
                  <Card className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 mt-3">
                    <CardContent>
                      <div className="flex items-center space-x-2">
                        <FaBook className="w-5 h-5 text-indigo-600" />
                        <span className="text-lg font-semibold text-gray-900">Batch: {batchData.name}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {mode === "student" && studentData.length > 0 && (
                    <div className="space-y-4">
                      {studentData.map((student, index) => (
                        <motion.div
                          key={student._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 20 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="relative p-4 bg-white/90 backdrop-blur-sm border rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 border-gray-200"
                        >
                          <div className="flex items-center space-x-4">
                            <Avatar className="w-10 h-10 rounded-full border-2 border-indigo-200">
                              <AvatarImage
                                src={
                                  student.profileImage ||
                                  "https://via.placeholder.com/40?text=User" ||
                                  "/placeholder.svg"
                                }
                                alt={student.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                              <AvatarFallback className="bg-indigo-100 text-indigo-600 font-semibold">
                                {student.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1 text-sm">
                              <div className="font-semibold text-gray-900">{student.name}</div>
                              <div className="text-gray-600">{student.email}</div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {errors.fetch && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="text-red-500 text-sm mb-4"
                >
                  {errors.fetch}
                </motion.p>
              )}

              <Card className="w-full bg-white border border-gray-200 rounded-2xl shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-gray-800">Course Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="title" className="text-sm font-medium text-gray-700">
                        Course Title
                      </label>
                      <Input
                        id="title"
                        value={formState.title || ""}
                        onChange={handleTitleChange}
                        placeholder="Enter an engaging course title..."
                        className="h-14 text-lg border-2 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300"
                        disabled={formLoading}
                      />
                      {isSubmitted && errors.title && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-sm font-medium"
                        >
                          {errors.title}
                        </motion.p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                          <span>Target Audience</span>
                        </label>
                        <Select
                          value={formState.targetAudience || ""}
                          onValueChange={handleTargetAudienceChange}
                          disabled={formLoading}
                        >
                          <SelectTrigger className="h-14 text-lg border-2 border-gray-200 focus:border-green-500 rounded-xl bg-white/50 backdrop-blur-sm">
                            <SelectValue placeholder="Select audience level" />
                          </SelectTrigger>
                          <SelectContent className="bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-xl rounded-xl">
                            {targetAudienceOptions.map((option) => (
                              <SelectItem key={option} value={option} className="hover:bg-green-50 text-lg py-3">
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isSubmitted && errors.targetAudience && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-red-500 text-sm font-medium"
                          >
                            {errors.targetAudience}
                          </motion.p>
                        )}
                      </div>
                      <div className="space-y-3">
                        <label className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                          <span>Duration</span>
                        </label>
                        <Select
                          value={formState.duration || ""}
                          onValueChange={handleDurationChange}
                          disabled={formLoading}
                        >
                          <SelectTrigger className="h-14 text-lg border-2 border-gray-200 focus:border-purple-500 rounded-xl bg-white/50 backdrop-blur-sm">
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                          <SelectContent className="bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-xl rounded-xl">
                            {durationOptions.map((option) => (
                              <SelectItem key={option} value={option} className="hover:bg-purple-50 text-lg py-3">
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isSubmitted && errors.duration && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-red-500 text-sm font-medium"
                          >
                            {errors.duration}
                          </motion.p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <label className="text-xl font-bold text-gray-800">Course Structure</label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={addChapter}
                          disabled={formLoading}
                          className="text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-lg cursor-pointer"
                        >
                          <Plus className="w-4 h-4 mr-1" /> Add Chapter
                        </Button>
                      </div>
                      {isSubmitted && errors.chapters && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-sm font-medium mb-4"
                        >
                          {errors.chapters}
                        </motion.p>
                      )}
                      {formState.chapters.map((chapter, chapterIndex) => (
                        <DraggableChapter
                          key={chapterIndex}
                          index={chapterIndex}
                          moveChapter={moveChapter}
                          canDrag={formState.chapters.length > 1}
                        >
                          <div className="border border-gray-200 p-4 rounded-lg mt-2 space-y-4 bg-gray-50">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-semibold text-gray-800">Chapter {chapterIndex + 1}:</span>
                              <Input
                                placeholder="Chapter title"
                                value={chapter.title || ""}
                                onChange={(e) => handleChapterTitleChange(chapterIndex, e.target.value)}
                                className="flex-1 bg-white border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-lg"
                                disabled={formLoading}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeChapter(chapterIndex)}
                                disabled={formLoading}
                                className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                            {isSubmitted && errors.chapters && (
                              <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.2 }}
                                className="text-red-500 text-sm mt-1"
                              >
                                {errors.chapters}
                              </motion.p>
                            )}

                            {chapter.lessons.map((lesson, lessonIndex) => (
                              <DraggableLesson
                                key={lessonIndex}
                                chapterIndex={chapterIndex}
                                lessonIndex={lessonIndex}
                                moveLesson={moveLesson}
                                canDrag={chapter.lessons.length > 1}
                              >
                                <div className="ml-4 space-y-2 border-l-2 border-gray-200 pl-4">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium text-gray-700">Lesson {lessonIndex + 1}:</span>
                                    <Input
                                      placeholder="Lesson title"
                                      value={lesson.title || ""}
                                      onChange={(e) =>
                                        handleLessonTitleChange(chapterIndex, lessonIndex, e.target.value)
                                      }
                                      className="flex-1 bg-white border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-lg"
                                      disabled={formLoading}
                                    />
                                    <Select
                                      value={lesson.format || ""}
                                      onValueChange={(value) =>
                                        handleLessonFormatChange(chapterIndex, lessonIndex, value)
                                      }
                                      disabled={formLoading}
                                    >
                                      <SelectTrigger className="w-32 border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-lg bg-white shadow-sm cursor-pointer">
                                        <SelectValue placeholder="Format" />
                                      </SelectTrigger>
                                      <SelectContent className="bg-white border-gray-200 shadow-lg rounded-lg">
                                        {formatOptions.map((option) => (
                                          <SelectItem
                                            key={option}
                                            value={option}
                                            className="hover:bg-gray-100 cursor-pointer"
                                          >
                                            {option === "image"
                                              ? "Image"
                                              : option === "generic"
                                                ? "Any File"
                                                : option.charAt(0).toUpperCase() + option.slice(1)}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeLesson(chapterIndex, lessonIndex)}
                                      disabled={formLoading}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full cursor-pointer"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                  {isSubmitted && errors.lessons && (
                                    <motion.p
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ duration: 0.2 }}
                                      className="text-red-500 text-sm mt-1"
                                    >
                                      {errors.lessons}
                                    </motion.p>
                                  )}
                                  {isSubmitted && errors.format && (
                                    <motion.p
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ duration: 0.2 }}
                                      className="text-red-500 text-sm mt-1"
                                    >
                                      {errors.format}
                                    </motion.p>
                                  )}
                                  <div className="space-y-4">
                                    <div>
                                      <div className="flex items-center justify-between">
                                        <h5 className="text-sm font-medium text-gray-700 mb-2">Resources</h5>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => toggleResources(chapterIndex, lessonIndex)}
                                          className="text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-lg cursor-pointer"
                                          disabled={formLoading}
                                        >
                                          {openResources[`${chapterIndex}-${lessonIndex}`] ? (
                                            <>
                                              <X className="w-4 h-4 mr-1" /> Close
                                            </>
                                          ) : (
                                            <>
                                              <Plus className="w-4 h-4 mr-1" /> Add Resources
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                      <AnimatePresence>
                                        {openResources[`${chapterIndex}-${lessonIndex}`] && (
                                          <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{
                                              opacity: 1,
                                              height: "auto",
                                            }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.3 }}
                                          >
                                            {!selectionMode[`${chapterIndex}-${lessonIndex}-resources`] && (
                                              <div className="flex gap-4 mt-2">
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  onClick={() =>
                                                    setSelectionMode((prev) => ({
                                                      ...prev,
                                                      [`${chapterIndex}-${lessonIndex}-resources`]: "local",
                                                    }))
                                                  }
                                                  className="flex-1 border-blue-500 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                                                  disabled={formLoading}
                                                >
                                                  Select from Local
                                                </Button>
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  onClick={() => {
                                                    setSelectionMode((prev) => ({
                                                      ...prev,
                                                      [`${chapterIndex}-${lessonIndex}-resources`]: "drive",
                                                    }))
                                                    setCurrentSelectionContext({
                                                      chapterIndex,
                                                      lessonIndex,
                                                      type: "resources",
                                                      format: lesson.format,
                                                    })
                                                    if (!process.env.GOOGLE_DRIVE_DOCUMENT_FOLDER_ID) {
                                                      console.error("Google Drive folder ID is not configured")
                                                      setErrors({
                                                        drive: "Google Drive folder ID is missing",
                                                      })
                                                      return
                                                    }
                                                    const folderId = process.env.GOOGLE_DRIVE_DOCUMENT_FOLDER_ID
                                                    fetchDriveFiles(folderId, lesson.format)
                                                    setIsDriveFilesModalOpen(true)
                                                  }}
                                                  className="flex-1 border-blue-500 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                                                  disabled={formLoading}
                                                >
                                                  Select from Google Drive
                                                </Button>
                                              </div>
                                            )}
                                            {selectionMode[`${chapterIndex}-${lessonIndex}-resources`] === "local" && (
                                              <motion.div
                                                className="grid grid-cols-4 gap-4"
                                                initial="hidden"
                                                animate="visible"
                                                variants={{
                                                  hidden: { opacity: 0 },
                                                  visible: {
                                                    opacity: 1,
                                                    transition: {
                                                      staggerChildren: 0.1,
                                                    },
                                                  },
                                                }}
                                              >
                                                {formatOptions.map((format, index) => (
                                                  <motion.div
                                                    key={format}
                                                    variants={{
                                                      hidden: {
                                                        opacity: 0,
                                                        scale: 0.8,
                                                        y: 20,
                                                      },
                                                      visible: {
                                                        opacity: 1,
                                                        scale: 1,
                                                        y: 0,
                                                      },
                                                    }}
                                                    transition={{
                                                      type: "spring",
                                                      stiffness: 300,
                                                      damping: 20,
                                                      delay: index * 0.1,
                                                    }}
                                                  >
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        triggerFileInput(chapterIndex, lessonIndex, format, "resources")
                                                      }
                                                      className="w-20 p-4 mt-2 bg-white hover:bg-blue-50 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 flex flex-col items-center justify-center relative group cursor-pointer"
                                                      disabled={formLoading}
                                                    >
                                                      {getFileIcon(format)}
                                                      <span className="mt-2 text-xs font-medium text-gray-600 group-hover:text-blue-600">
                                                        {format === "image"
                                                          ? "Image"
                                                          : format === "generic"
                                                            ? "Any File"
                                                            : format.charAt(0).toUpperCase() + format.slice(1)}
                                                      </span>
                                                    </button>
                                                    <input
                                                      type="file"
                                                      accept={getFileAccept(format)}
                                                      onChange={(e) =>
                                                        handleFileChange(chapterIndex, lessonIndex, e, "resources")
                                                      }
                                                      className="hidden"
                                                      ref={(el) => {
                                                        fileInputRefs.current[
                                                          `${chapterIndex}-${lessonIndex}-${format}-resources`
                                                        ] = el
                                                      }}
                                                    />
                                                  </motion.div>
                                                ))}
                                              </motion.div>
                                            )}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                      {lesson.resources.length > 0 && (
                                        <ul className="mt-2 space-y-1">
                                          {lesson.resources.map((resource, fileIndex) => (
                                            <li key={fileIndex} className="flex items-center text-sm text-gray-600">
                                              {getFileIcon(
                                                resource instanceof File
                                                  ? lesson.format
                                                  : "mimeType" in resource
                                                    ? resource.mimeType.includes("pdf")
                                                      ? "pdf"
                                                      : resource.mimeType.includes("document")
                                                        ? "word"
                                                        : resource.mimeType.includes("presentation")
                                                          ? "ppt"
                                                          : resource.mimeType.includes("image")
                                                            ? "image"
                                                            : resource.mimeType.includes("video")
                                                              ? "video"
                                                              : resource.mimeType.includes("audio")
                                                                ? "audio"
                                                                : "generic"
                                                    : resource.type,
                                              )}
                                              <span className="ml-2 truncate flex-1">{resource.name}</span>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  removeFile(chapterIndex, lessonIndex, fileIndex, "resources")
                                                }
                                                disabled={formLoading}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full cursor-pointer"
                                              >
                                                <X className="w-4 h-4" />
                                              </Button>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                    <div>
                                      <div className="flex items-center justify-between">
                                        <h5 className="text-sm font-medium text-gray-700 mb-2">Worksheets</h5>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => toggleWorksheets(chapterIndex, lessonIndex)}
                                          className="text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-lg cursor-pointer"
                                          disabled={formLoading}
                                        >
                                          {openWorksheets[`${chapterIndex}-${lessonIndex}`] ? (
                                            <>
                                              <X className="w-4 h-4 mr-1" /> Close
                                            </>
                                          ) : (
                                            <>
                                              <Plus className="w-4 h-4 mr-1" /> Add Worksheets
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                      <AnimatePresence>
                                        {openWorksheets[`${chapterIndex}-${lessonIndex}`] && (
                                          <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{
                                              opacity: 1,
                                              height: "auto",
                                            }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.3 }}
                                          >
                                            {!selectionMode[`${chapterIndex}-${lessonIndex}-worksheets`] && (
                                              <div className="flex gap-4 mt-2">
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  onClick={() =>
                                                    setSelectionMode((prev) => ({
                                                      ...prev,
                                                      [`${chapterIndex}-${lessonIndex}-worksheets`]: "local",
                                                    }))
                                                  }
                                                  className="flex-1 border-blue-500 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                                                  disabled={formLoading}
                                                >
                                                  Select from Local
                                                </Button>
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  onClick={() => {
                                                    setSelectionMode((prev) => ({
                                                      ...prev,
                                                      [`${chapterIndex}-${lessonIndex}-worksheets`]: "drive",
                                                    }))
                                                    setCurrentSelectionContext({
                                                      chapterIndex,
                                                      lessonIndex,
                                                      type: "worksheets",
                                                      format: lesson.format,
                                                    })
                                                    if (!process.env.GOOGLE_DRIVE_DOCUMENT_FOLDER_ID) {
                                                      console.error("Google Drive folder ID is not configured")
                                                      setErrors({
                                                        drive: "Google Drive folder ID is missing",
                                                      })
                                                      return
                                                    }
                                                    const folderId = process.env.GOOGLE_DRIVE_DOCUMENT_FOLDER_ID
                                                    fetchDriveFiles(folderId, lesson.format)
                                                    setIsDriveFilesModalOpen(true)
                                                  }}
                                                  className="flex-1 border-blue-500 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                                                  disabled={formLoading}
                                                >
                                                  Select from Google Drive
                                                </Button>
                                              </div>
                                            )}
                                            {selectionMode[`${chapterIndex}-${lessonIndex}-worksheets`] === "local" && (
                                              <motion.div
                                                className="grid grid-cols-4 gap-4"
                                                initial="hidden"
                                                animate="visible"
                                                variants={{
                                                  hidden: { opacity: 0 },
                                                  visible: {
                                                    opacity: 1,
                                                    transition: {
                                                      staggerChildren: 0.1,
                                                    },
                                                  },
                                                }}
                                              >
                                                {formatOptions.map((format, index) => (
                                                  <motion.div
                                                    key={format}
                                                    variants={{
                                                      hidden: {
                                                        opacity: 0,
                                                        scale: 0.8,
                                                        y: 20,
                                                      },
                                                      visible: {
                                                        opacity: 1,
                                                        scale: 1,
                                                        y: 0,
                                                      },
                                                    }}
                                                    transition={{
                                                      type: "spring",
                                                      stiffness: 300,
                                                      damping: 20,
                                                      delay: index * 0.1,
                                                    }}
                                                  >
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        triggerFileInput(
                                                          chapterIndex,
                                                          lessonIndex,
                                                          format,
                                                          "worksheets",
                                                        )
                                                      }
                                                      className="w-20 p-4 mt-2 bg-white hover:bg-blue-50 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 flex flex-col items-center justify-center relative group cursor-pointer"
                                                      disabled={formLoading}
                                                    >
                                                      {getFileIcon(format)}
                                                      <span className="mt-2 text-xs font-medium text-gray-600 group-hover:text-blue-600">
                                                        {format === "image"
                                                          ? "Image"
                                                          : format === "generic"
                                                            ? "Any File"
                                                            : format.charAt(0).toUpperCase() + format.slice(1)}
                                                      </span>
                                                    </button>
                                                    <input
                                                      type="file"
                                                      accept={getFileAccept(format)}
                                                      onChange={(e) =>
                                                        handleFileChange(chapterIndex, lessonIndex, e, "worksheets")
                                                      }
                                                      className="hidden"
                                                      ref={(el) => {
                                                        worksheetInputRefs.current[
                                                          `${chapterIndex}-${lessonIndex}-${format}-worksheets`
                                                        ] = el
                                                      }}
                                                    />
                                                  </motion.div>
                                                ))}
                                              </motion.div>
                                            )}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                      {lesson.worksheets.length > 0 && (
                                        <ul className="mt-2 space-y-1">
                                          {lesson.worksheets.map((worksheet, fileIndex) => (
                                            <li key={fileIndex} className="flex items-center text-sm text-gray-600">
                                              {getFileIcon(
                                                worksheet instanceof File
                                                  ? lesson.format
                                                  : "mimeType" in worksheet
                                                    ? worksheet.mimeType.includes("pdf")
                                                      ? "pdf"
                                                      : worksheet.mimeType.includes("document")
                                                        ? "word"
                                                        : worksheet.mimeType.includes("presentation")
                                                          ? "ppt"
                                                          : worksheet.mimeType.includes("image")
                                                            ? "image"
                                                            : worksheet.mimeType.includes("video")
                                                              ? "video"
                                                              : worksheet.mimeType.includes("audio")
                                                                ? "audio"
                                                                : "generic"
                                                    : worksheet.type,
                                              )}
                                              <span className="ml-2 truncate flex-1">{worksheet.name}</span>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  removeFile(chapterIndex, lessonIndex, fileIndex, "worksheets")
                                                }
                                                disabled={formLoading}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full cursor-pointer"
                                              >
                                                <X className="w-4 h-4" />
                                              </Button>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  </div>
                                  <div className="mt-4">
                                    <button
                                      type="button"
                                      onClick={() => toggleGoals(chapterIndex, lessonIndex)}
                                      className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 cursor-pointer"
                                    >
                                      Learning Goals
                                      {openGoals[`${chapterIndex}-${lessonIndex}`] ? (
                                        <ChevronUp className="w-4 h-4 ml-1" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4 ml-1" />
                                      )}
                                    </button>
                                    {openGoals[`${chapterIndex}-${lessonIndex}`] && (
                                      <div className="mt-2 space-y-2">
                                        {lesson.learningGoals.map((goal, goalIndex) => (
                                          <div key={goalIndex} className="flex items-center space-x-2">
                                            <Input
                                              placeholder="Enter learning goal"
                                              value={goal || ""}
                                              onChange={(e) =>
                                                handleLearningGoalChange(
                                                  chapterIndex,
                                                  lessonIndex,
                                                  goalIndex,
                                                  e.target.value,
                                                )
                                              }
                                              className="flex-1 bg-white border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-lg"
                                              disabled={formLoading}
                                            />
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => removeLearningGoal(chapterIndex, lessonIndex, goalIndex)}
                                              disabled={formLoading}
                                              className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full cursor-pointer"
                                            >
                                              <X className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        ))}
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => addLearningGoal(chapterIndex, lessonIndex)}
                                          className="text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-lg cursor-pointer"
                                          disabled={formLoading}
                                        >
                                          <Plus className="w-4 h-4 mr-1" /> Add Goal
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </DraggableLesson>
                            ))}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => addLesson(chapterIndex)}
                              disabled={formLoading}
                              className="text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-lg cursor-pointer"
                            >
                              <Plus className="w-4 h-4 mr-1" /> Add Lesson
                            </Button>
                          </div>
                        </DraggableChapter>
                      ))}
                    </div>

                    <div className="flex justify-end space-x-4">
                      {isSubmitted && errors.submit && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className="text-red-600 text-sm mt-1"
                        >
                          {errors.submit}
                        </motion.p>
                      )}
                      <Button
                        type="submit"
                        disabled={formLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-2 transition-all duration-200 shadow-sm cursor-pointer"
                      >
                        {formLoading ? "Updating..." : "Update Course"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            <AnimatePresence>
              {isDriveFilesModalOpen && currentSelectionContext && (
                <motion.div
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsDriveFilesModalOpen(false)
                    setSelectedDriveFile(null)
                    setSelectionMode((prev) => ({
                      ...prev,
                      [`${currentSelectionContext.chapterIndex}-${currentSelectionContext.lessonIndex}-${currentSelectionContext.type}`]:
                        null,
                    }))
                  }}
                >
                  <motion.div
                    className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 overflow-hidden relative border border-gray-200"
                    initial={{ scale: 0.9, opacity: 0, y: 30 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 30 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 25,
                      mass: 0.75,
                    }}
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Select from Google Drive</h2>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          setIsDriveFilesModalOpen(false)
                          setSelectedDriveFile(null)
                          setSelectionMode((prev) => ({
                            ...prev,
                            [`${currentSelectionContext.chapterIndex}-${currentSelectionContext.lessonIndex}-${currentSelectionContext.type}`]:
                              null,
                          }))
                        }}
                        className="hover:bg-gray-100 rounded-full transition-all duration-200 cursor-pointer"
                        aria-label="Close Google Drive modal"
                      >
                        <X className="w-5 h-5 text-gray-600 hover:text-red-500" />
                      </Button>
                    </div>
                    {isFetchingDriveFiles ? (
                      <Loader height="40" width="40" color="#3b82f6" ariaLabel="loading" />
                    ) : driveFiles.length > 0 ? (
                      <div className="max-h-80 overflow-y-auto overflow-x-hidden custom-scrollbar">
                        <div className="grid grid-cols-2 gap-3">
                          {driveFiles.map((file, index) => (
                            <motion.div
                              key={file.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                delay: index * 0.05,
                                type: "spring",
                                stiffness: 200,
                                damping: 20,
                              }}
                              className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                                selectedDriveFile?.id === file.id
                                  ? "bg-blue-50 border-blue-400 shadow-md"
                                  : "bg-white border-gray-200 hover:bg-gray-50"
                              }`}
                              onClick={() => setSelectedDriveFile(file)}
                            >
                              {getFileIcon(
                                file.mimeType.includes("pdf")
                                  ? "pdf"
                                  : file.mimeType.includes("document")
                                    ? "word"
                                    : file.mimeType.includes("presentation")
                                      ? "ppt"
                                      : file.mimeType.includes("image")
                                        ? "image"
                                        : file.mimeType.includes("video")
                                          ? "video"
                                          : file.mimeType.includes("audio")
                                            ? "audio"
                                            : "generic",
                              )}
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {file.mimeType.split("/")[1]?.toUpperCase() || "File"}
                                </p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <FaFile className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 font-medium">No files found in Google Drive.</p>
                      </div>
                    )}
                    <div className="flex justify-end gap-3 mt-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          setIsDriveFilesModalOpen(false)
                          setSelectedDriveFile(null)
                          setSelectionMode((prev) => ({
                            ...prev,
                            [`${currentSelectionContext.chapterIndex}-${currentSelectionContext.lessonIndex}-${currentSelectionContext.type}`]:
                              null,
                          }))
                        }}
                        className="border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg px-4 py-2 font-medium transition-all duration-200 cursor-pointer"
                        disabled={isFetchingDriveFiles}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (selectedDriveFile) {
                            handleDriveFileSelect(
                              currentSelectionContext.chapterIndex,
                              currentSelectionContext.lessonIndex,
                              currentSelectionContext.type,
                              selectedDriveFile,
                            )
                          }
                        }}
                        disabled={!selectedDriveFile || isFetchingDriveFiles}
                        className="bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 font-medium disabled:opacity-50 transition-all duration-200 cursor-pointer"
                      >
                        Select File
                      </Button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {formState.title && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
                <div className="p-6">
                  <h2 className="text-3xl font-semibold text-gray-900 mb-6">Course Preview</h2>
                  <Card className="bg-white border-gray-200 rounded-lg shadow-lg relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-20" />
                    <CardContent className="pt-6 relative z-10">
                      <div className="space-y-6">
                        <div className="flex items-center space-x-4">
                          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-lg text-xl font-bold">
                            {formState.title}
                          </div>
                        </div>

                        {formState.chapters.length > 0 && (
                          <div>
                            <h4 className="text-lg font-semibold text-gray-800 mb-4">Table of Contents</h4>
                            <ul className="space-y-6">
                              {formState.chapters.map(
                                (chapter, chapterIndex) =>
                                  chapter.title?.trim() && (
                                    <li key={chapterIndex} className="mt-2">
                                      <span className="font-bold text-xl text-gray-900">
                                        Chapter {chapterIndex + 1}: {chapter.title}
                                      </span>
                                      {chapter.lessons.length > 0 && (
                                        <ul className="mt-3 space-y-3">
                                          {chapter.lessons.map((lesson, lessonIndex) => (
                                            <motion.li
                                              key={lessonIndex}
                                              initial={{ opacity: 0, y: 20 }}
                                              animate={{ opacity: 1, y: 0 }}
                                              transition={{
                                                duration: 0.3,
                                                delay: lessonIndex * 0.1,
                                              }}
                                            >
                                              <div
                                                className="group relative bg-white p-4 rounded-lg shadow-md border-l-4 border-blue-500 hover:scale-[1.02] transition-transform cursor-pointer"
                                                onClick={() => toggleLesson(chapterIndex, lessonIndex)}
                                              >
                                                <div className="flex items-center justify-between">
                                                  <div className="flex items-center space-x-3">
                                                    {getLessonIcon(lesson.format)}
                                                    <span className="font-semibold text-gray-800">
                                                      Lesson {lessonIndex + 1}: {lesson.title || "Untitled"}{" "}
                                                      <span className="text-gray-500 text-sm">
                                                        ({lesson.format || "No format"})
                                                      </span>
                                                    </span>
                                                  </div>
                                                  <button
                                                    type="button"
                                                    className="text-gray-600 hover:text-gray-900 cursor-pointer"
                                                  >
                                                    {openLessons[`${chapterIndex}-${lessonIndex}`] ? (
                                                      <ChevronUp className="w-5 h-5" />
                                                    ) : (
                                                      <ChevronDown className="w-5 h-5" />
                                                    )}
                                                  </button>
                                                </div>
                                                <AnimatePresence>
                                                  {openLessons[`${chapterIndex}-${lessonIndex}`] && (
                                                    <motion.div
                                                      initial={{
                                                        height: 0,
                                                        opacity: 0,
                                                      }}
                                                      animate={{
                                                        height: "auto",
                                                        opacity: 1,
                                                      }}
                                                      exit={{
                                                        height: 0,
                                                        opacity: 0,
                                                      }}
                                                      transition={{
                                                        duration: 0.3,
                                                      }}
                                                      className="mt-4"
                                                    >
                                                      {lesson.resources.length > 0 && (
                                                        <div className="ml-6">
                                                          <h5 className="text-sm font-medium text-gray-700 mb-2">
                                                            Resources
                                                          </h5>
                                                          <ul className="space-y-2">
                                                            {lesson.resources.map((resource, fileIndex) => (
                                                              <li
                                                                key={fileIndex}
                                                                className="flex items-center text-sm text-gray-600"
                                                              >
                                                                {getFileIcon(lesson.format)}
                                                                <span className="ml-2 truncate">
                                                                  {resource instanceof File
                                                                    ? resource.name
                                                                    : resource.name}
                                                                </span>
                                                              </li>
                                                            ))}
                                                          </ul>
                                                        </div>
                                                      )}
                                                      {lesson.worksheets.length > 0 && (
                                                        <div className="ml-6 mt-4">
                                                          <h5 className="text-sm font-medium text-gray-700 mb-2">
                                                            Worksheets
                                                          </h5>
                                                          <ul className="space-y-2">
                                                            {lesson.worksheets.map((worksheet, fileIndex) => {
                                                              const format =
                                                                worksheet instanceof File
                                                                  ? lesson.format
                                                                  : "mimeType" in worksheet
                                                                    ? worksheet.mimeType.includes("pdf")
                                                                      ? "pdf"
                                                                      : worksheet.mimeType.includes("document")
                                                                        ? "word"
                                                                        : worksheet.mimeType.includes("presentation")
                                                                          ? "ppt"
                                                                          : worksheet.mimeType.includes("image")
                                                                            ? "image"
                                                                            : worksheet.mimeType.includes("video")
                                                                              ? "video"
                                                                              : worksheet.mimeType.includes("audio")
                                                                                ? "audio"
                                                                                : "generic"
                                                                    : worksheet.type
                                                              return (
                                                                <li
                                                                  key={fileIndex}
                                                                  className="flex items-center text-sm text-gray-600"
                                                                >
                                                                  <div className="w-5 h-5 flex items-center justify-center">
                                                                    {getFileIcon(format)}
                                                                  </div>
                                                                  <span className="ml-2 truncate">
                                                                    {worksheet instanceof File
                                                                      ? worksheet.name
                                                                      : worksheet.name}
                                                                  </span>
                                                                </li>
                                                              )
                                                            })}
                                                          </ul>
                                                        </div>
                                                      )}
                                                      {lesson.learningGoals.some((goal) => goal?.trim()) && (
                                                        <div className="ml-6 mt-4">
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation()
                                                              toggleGoals(chapterIndex, lessonIndex)
                                                            }}
                                                            className="flex items-center text-sm font-semibold text-blue-600 hover:text-blue-800 bg-blue-100 px-3 py-1 rounded-full cursor-pointer"
                                                          >
                                                            Learning Goals
                                                            {openGoals[`${chapterIndex}-${lessonIndex}`] ? (
                                                              <ChevronUp className="w-4 h-4 ml-2" />
                                                            ) : (
                                                              <ChevronDown className="w-4 h-4 ml-2" />
                                                            )}
                                                          </button>
                                                          {openGoals[`${chapterIndex}-${lessonIndex}`] && (
                                                            <ul className="list-disc ml-6 mt-3 text-sm text-gray-600 space-y-1">
                                                              {lesson.learningGoals.map(
                                                                (goal, goalIndex) =>
                                                                  goal?.trim() && <li key={goalIndex}>{goal}</li>,
                                                              )}
                                                            </ul>
                                                          )}
                                                        </div>
                                                      )}
                                                    </motion.div>
                                                  )}
                                                </AnimatePresence>
                                              </div>
                                            </motion.li>
                                          ))}
                                        </ul>
                                      )}
                                    </li>
                                  ),
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    {(formState.targetAudience || formState.duration) && (
                      <div className="absolute top-4 right-4 flex space-x-2">
                        {formState.targetAudience && (
                          <div className="flex items-center bg-blue-100 px-3 py-1 rounded-full text-sm text-blue-700 hover:bg-blue-200 transition-colors shadow-sm">
                            <Target className="w-4 h-4 mr-2 text-blue-600" />
                            <span>{formState.targetAudience}</span>
                          </div>
                        )}
                        {formState.duration && (
                          <div className="flex items-center bg-blue-100 px-3 py-1 rounded-full text-sm text-blue-700 hover:bg-blue-200 transition-colors shadow-sm">
                            <Clock className="w-4 h-4 mr-2 text-blue-600" />
                            <span>{formState.duration}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                </div>
              </motion.div>
            )}
          </div>
        </div>
        <style jsx>{`
          .custom-scrollbar {
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none; /* IE and Edge */
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 0;
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: transparent;
          }
        `}</style>
      </DndProvider>
    </TooltipProvider>
  )
}

export default function EditCourse() {
  return (
    <Suspense
      fallback={
        <div>
          <Loader />
        </div>
      }
    >
      <EditCoursePage />
    </Suspense>
  )
}
