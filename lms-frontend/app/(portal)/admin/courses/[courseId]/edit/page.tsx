"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth } from "@/lib/auth"
import api from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import { BsFileEarmarkPdf, BsFiletypePptx, BsFiletypeMp3, BsFiletypeMp4 } from "react-icons/bs"
import { FaRegFileWord, FaFile, FaBook } from "react-icons/fa"
import { AiOutlineFileJpg } from "react-icons/ai"
import {
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Plus,
  X,
  Target,
  Clock,
  RotateCcw,
  GripVertical,
  BookOpen,
  Award,
  Shield,
  Settings,
  FileText,
  Sparkles,
  Star,
  Zap,
  Upload,
  Cloud,
} from "lucide-react"
import { DndProvider, useDrag, useDrop, type DragSourceMonitor } from "react-dnd"
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
  public_id: string
}

interface LessonResponse {
  title: string | null
  format: string | null
  resources: ResourceResponse[]
  worksheets: ResourceResponse[]
  learningGoals: (string | null)[]
}

interface ChapterResponse {
  title: string | null
  lessons: LessonResponse[]
}

interface CourseResponse {
  title: string | null
  chapters: ChapterResponse[]
  targetAudience: string | null
  duration: string | null
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
    collect: (monitor: DragSourceMonitor) => ({
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
        <motion.div
          className="absolute left-[-32px] top-1/2 transform -translate-y-1/2 hidden group-hover:block"
          whileHover={{ scale: 1.1 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md border border-indigo-300">
            <GripVertical className="w-4 h-4 text-white cursor-move" />
          </div>
        </motion.div>
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
    collect: (monitor: DragSourceMonitor) => ({
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
        <motion.div
          className="absolute left-[-32px] top-1/2 transform -translate-y-1/2 hidden group-hover:block"
          whileHover={{ scale: 1.1 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <div className="w-6 h-6 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-md flex items-center justify-center shadow-sm border border-cyan-300">
            <GripVertical className="w-3 h-3 text-white cursor-move" />
          </div>
        </motion.div>
      )}
      {children}
    </div>
  )
}

export default function EditCourse() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const courseId = params.courseId as string
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
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [openGoals, setOpenGoals] = useState<{ [key: string]: boolean }>({})
  const [openLessons, setOpenLessons] = useState<{ [key: string]: boolean }>({})
  const [openResources, setOpenResources] = useState<{
    [key: string]: boolean
  }>({})
  const [openWorksheets, setOpenWorksheets] = useState<{
    [key: string]: boolean
  }>({})
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

  const handleUnauthorized = useCallback(() => {
    console.debug("[EditCourse] Handling unauthorized access")
    localStorage.removeItem("token")
    localStorage.removeItem("userId")
    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem("deviceId")
    setErrors({ auth: "Session expired. Please log in again." })
    router.push("/login")
  }, [router])

  useEffect(() => {
    if (authLoading) return
    if (!user || !["Admin", "Super Admin"].includes(user.role?.roleName || "")) {
      console.debug("[EditCourse] Redirecting due to invalid role or no user", {
        user: !!user,
        role: user?.role?.roleName,
        authLoading,
      })
      handleUnauthorized()
      return
    }

    const fetchCourse = async () => {
      setFetchLoading(true)
      try {
        const token = localStorage.getItem("token")
        const deviceId = localStorage.getItem("deviceId")
        if (!token || !deviceId) {
          console.debug("[EditCourse] Missing token or deviceId", {
            token,
            deviceId,
          })
          handleUnauthorized()
          return
        }

        const response = await api.get(`/courses/${courseId}`)
        const course: CourseResponse = response.data
        const courseData: FormState = {
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
                public_id: res.public_id,
              })),
              worksheets: lesson.worksheets.map((ws: ResourceResponse) => ({
                url: ws.url,
                name: ws.name,
                type: ws.type,
                public_id: ws.public_id,
              })),
              learningGoals: lesson.learningGoals,
            })),
          })),
          targetAudience: course.targetAudience,
          duration: course.duration,
        }
        setFormState(courseData)
        setOriginalCourseData(courseData)
      } catch (error) {
        const apiError = error as ApiError
        console.error("[EditCourse] Failed to fetch course:", apiError)
        if (apiError.response?.status === 401) {
          handleUnauthorized()
        } else {
          setErrors({
            fetch: apiError.response?.data?.message || "Failed to fetch course data",
          })
        }
      } finally {
        setFetchLoading(false)
      }
    }

    fetchCourse()
  }, [user, courseId, authLoading, handleUnauthorized])

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

  const fetchDriveFiles = async (folderId: string, format: string | null) => {
    try {
      setIsFetchingDriveFiles(true)
      const token = localStorage.getItem("token")
      const deviceId = localStorage.getItem("deviceId")
      if (!token || !deviceId) {
        console.debug("[EditCourse] Missing token or deviceId for drive files", {
          token,
          deviceId,
        })
        handleUnauthorized()
        return
      }
      const response = await api.get(`/drive/files/${folderId}`, {
        params: {
          fileType: format ? getFileType(format) : undefined,
        },
      })
      const transformedFiles = (response.data.items || []).map((file: GoogleDriveFile) => ({
        ...file,
        name: truncateFilename(file.name),
      }))
      setDriveFiles(transformedFiles)
    } catch (error) {
      const apiError = error as ApiError
      console.error("[EditCourse] Error fetching drive files:", apiError)
      if (apiError.response?.status === 401) {
        handleUnauthorized()
      } else {
        setErrors({ drive: "Failed to fetch Google Drive files" })
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

  const getFileIcon = (format: string | null) => {
    const iconConfig = {
      video: {
        icon: BsFiletypeMp4,
        color: "text-blue-600",
        bg: "bg-gradient-to-br from-blue-100 to-blue-200",
        border: "border-blue-300",
      },
      audio: {
        icon: BsFiletypeMp3,
        color: "text-emerald-600",
        bg: "bg-gradient-to-br from-emerald-100 to-emerald-200",
        border: "border-emerald-300",
      },
      pdf: {
        icon: BsFileEarmarkPdf,
        color: "text-red-600",
        bg: "bg-gradient-to-br from-red-100 to-red-200",
        border: "border-red-300",
      },
      word: {
        icon: FaRegFileWord,
        color: "text-indigo-700",
        bg: "bg-gradient-to-br from-indigo-100 to-indigo-200",
        border: "border-indigo-300",
      },
      ppt: {
        icon: BsFiletypePptx,
        color: "text-orange-600",
        bg: "bg-gradient-to-br from-orange-100 to-orange-200",
        border: "border-orange-300",
      },
      image: {
        icon: AiOutlineFileJpg,
        color: "text-purple-600",
        bg: "bg-gradient-to-br from-purple-100 to-purple-200",
        border: "border-purple-300",
      },
      generic: {
        icon: FaFile,
        color: "text-gray-600",
        bg: "bg-gradient-to-br from-gray-100 to-gray-200",
        border: "border-gray-300",
      },
    }

    if (!format) return <FaFile className="w-6 h-6 text-gray-600" />
    if (format.includes("video")) return <BsFiletypeMp4 className="w-6 h-6 text-blue-600" />
    if (format.includes("audio")) return <BsFiletypeMp3 className="w-6 h-6 text-emerald-600" />
    if (format.includes("pdf")) return <BsFileEarmarkPdf className="w-6 h-6 text-red-600" />
    if (format.includes("document")) return <FaRegFileWord className="w-6 h-6 text-indigo-700" />
    if (format.includes("presentation")) return <BsFiletypePptx className="w-6 h-6 text-orange-600" />
    if (format.includes("image")) return <AiOutlineFileJpg className="w-6 h-6 text-purple-600" />

    const config = iconConfig[format as keyof typeof iconConfig] || iconConfig.generic
    const IconComponent = config.icon

    return (
      <div
        className={`w-12 h-12 ${config.bg} rounded-xl flex items-center justify-center shadow-sm border ${config.border}`}
      >
        <IconComponent className={`w-6 h-6 ${config.color}`} />
      </div>
    )
  }

  const getLessonIcon = (format: string | null) => {
    const iconConfig = {
      video: {
        icon: BsFiletypeMp4,
        color: "text-blue-600",
        bg: "bg-gradient-to-br from-blue-100 to-blue-200",
        border: "border-blue-300",
      },
      audio: {
        icon: BsFiletypeMp3,
        color: "text-emerald-600",
        bg: "bg-gradient-to-br from-emerald-100 to-emerald-200",
        border: "border-emerald-300",
      },
      pdf: {
        icon: BsFileEarmarkPdf,
        color: "text-red-600",
        bg: "bg-gradient-to-br from-red-100 to-red-200",
        border: "border-red-300",
      },
      word: {
        icon: FaRegFileWord,
        color: "text-indigo-700",
        bg: "bg-gradient-to-br from-indigo-100 to-indigo-200",
        border: "border-indigo-300",
      },
      ppt: {
        icon: BsFiletypePptx,
        color: "text-orange-600",
        bg: "bg-gradient-to-br from-orange-100 to-orange-200",
        border: "border-orange-300",
      },
      image: {
        icon: AiOutlineFileJpg,
        color: "text-purple-600",
        bg: "bg-gradient-to-br from-purple-100 to-purple-200",
        border: "border-purple-300",
      },
      generic: {
        icon: FaFile,
        color: "text-gray-600",
        bg: "bg-gradient-to-br from-gray-100 to-gray-200",
        border: "border-gray-300",
      },
    }

    const config = iconConfig[format as keyof typeof iconConfig] || {
      icon: FaBook,
      color: "text-gray-600",
      bg: "bg-gradient-to-br from-gray-100 to-gray-200",
      border: "border-gray-300",
    }
    const IconComponent = config.icon

    return (
      <div
        className={`w-12 h-12 ${config.bg} rounded-xl flex items-center justify-center shadow-sm border ${config.border}`}
      >
        <IconComponent className={`w-6 h-6 ${config.color}`} />
      </div>
    )
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
      if (formState.chapters.some((chapter: Chapter) => !chapter.title || !chapter.title.trim())) {
        newErrors.chapters = "All chapter titles must be filled"
      }
      if (formState.chapters.some((chapter: Chapter) => chapter.lessons.length === 0)) {
        newErrors.lessons = "Each chapter must have at least one lesson"
      }
      if (
        formState.chapters.some((chapter: Chapter) =>
          chapter.lessons.some((lesson: Lesson) => !lesson.title || !lesson.title.trim()),
        )
      ) {
        newErrors.lessons = "All lesson titles must be filled"
      }
      if (
        formState.chapters.some((chapter: Chapter) =>
          chapter.lessons.some((lesson: Lesson) => !lesson.format || !formatOptions.includes(lesson.format)),
        )
      ) {
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
      const deviceId = localStorage.getItem("deviceId")
      if (!token || !deviceId) {
        console.debug("[EditCourse] Missing token or deviceId for submit", {
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
                formData.append(`${key}[public_id]`, res.public_id)
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
                formData.append(`${key}[public_id]`, ws.public_id)
              }
            })
          })
        })
      }

      await api.put(`/courses/edit/${courseId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      setIsSubmitted(false)
      setErrors({})
      router.push("/admin/courses")
    } catch (error) {
      const apiError = error as ApiError
      console.error("[EditCourse] Error editing course:", apiError)
      if (apiError.response?.status === 401) {
        handleUnauthorized()
      } else {
        setErrors({
          submit: apiError.response?.data?.message || "Failed to edit course",
        })
      }
      setFormLoading(false)
    }
  }

  const handleBack = () => {
    router.push("/admin/courses")
  }

  const handleReset = () => {
    if (originalCourseData) {
      setFormState(originalCourseData)
    }
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
      setSelectionMode((prev) => ({
        ...prev,
        [`${chapterIndex}-${lessonIndex}-${type}`]: null,
      }))
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
      refs.current[key].click()
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
        color="#ff0000"
        ariaLabel="triangle-loading"
        wrapperStyle={{}}
        wrapperClass=""
        visible={true}
        fullScreen={true}
      />
    )
  }

  if (!user || !["Admin", "Super Admin"].includes(user.role?.roleName || "")) {
    router.push("/login")
    return null
  }

  return (
    <TooltipProvider>
      <DndProvider backend={HTML5Backend}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50 p-4 md:p-8 mt-10 relative overflow-hidden">
          {/* Enhanced animated background */}
          <div className="absolute inset-0 overflow-hidden opacity-20">
            <motion.div
              className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-indigo-200/40 to-purple-200/40 rounded-full blur-3xl"
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{ duration: 25, repeat: Number.POSITIVE_INFINITY }}
            />
            <motion.div
              className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-br from-cyan-200/40 to-blue-200/40 rounded-full blur-3xl"
              animate={{
                scale: [1.2, 1, 1.2],
                rotate: [360, 180, 0],
                opacity: [0.4, 0.2, 0.4],
              }}
              transition={{ duration: 30, repeat: Number.POSITIVE_INFINITY }}
            />
          </div>

          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <div className="flex items-center mb-8 space-x-6">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleBack}
                        className="border-indigo-300 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 rounded-lg px-6 py-3 transition-all duration-300 shadow-sm bg-white/80 border"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-indigo-700 text-white rounded-lg px-3 py-2 shadow-lg">
                    <p>Back to Courses</p>
                  </TooltipContent>
                </Tooltip>
                {formState.title && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleReset}
                          className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800 rounded-lg px-6 py-3 transition-all duration-300 shadow-sm bg-white/80 border"
                        >
                          <RotateCcw className="w-5 h-5" />
                        </Button>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-amber-700 text-white rounded-lg px-3 py-2 shadow-lg">
                      <p>Reset to original data</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <div className="flex items-center space-x-3">
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                  >
                    <Settings className="w-7 h-7 text-indigo-600" />
                  </motion.div>
                  <h2 className="text-3xl font-bold text-gray-800">Edit Course</h2>
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{
                      duration: 1.5,
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                  >
                    <Sparkles className="w-5 h-5 text-purple-500" />
                  </motion.div>
                </div>
              </div>

              <Card className="w-full bg-white/80 backdrop-blur-sm border border-indigo-200 rounded-xl shadow-lg overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-indigo-400 via-purple-500 to-cyan-500" />

                <CardHeader className="relative">
                  <CardTitle className="text-xl font-semibold text-gray-800 flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-white" />
                    </div>
                    <span>Course Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <label
                        htmlFor="title"
                        className="text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2"
                      >
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <span>Course Title</span>
                      </label>
                      <Input
                        id="title"
                        value={formState.title || ""}
                        onChange={handleTitleChange}
                        placeholder="Enter course title"
                        className="border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg bg-white shadow-sm text-base py-3 px-4 transition-all duration-300"
                        disabled={formLoading}
                      />
                      {isSubmitted && errors.title && (
                        <motion.p
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3 }}
                          className="text-red-600 text-sm mt-2 flex items-center space-x-1"
                        >
                          <X className="w-4 h-4" />
                          <span>{errors.title}</span>
                        </motion.p>
                      )}
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <label
                        htmlFor="targetAudience"
                        className="text-sm font-semibold text-gray-700 mb-2  flex items-center space-x-2"
                      >
                        <Target className="w-4 h-4 text-cyan-600" />
                        <span>Target Audience</span>
                      </label>
                      <Select
                        value={formState.targetAudience || ""}
                        onValueChange={handleTargetAudienceChange}
                        disabled={formLoading}
                      >
                        <SelectTrigger className="border-gray-300 focus:ring-cyan-500 focus:border-cyan-500 rounded-lg bg-white shadow-sm py-3 px-4 text-base transition-all duration-300 cursor-pointer">
                          <SelectValue placeholder="Select target audience" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 shadow-lg rounded-lg">
                          {targetAudienceOptions.map((option) => (
                            <SelectItem
                              key={option}
                              value={option}
                              className="hover:bg-cyan-50 cursor-pointer rounded-md mx-1 my-0.5 transition-all duration-200"
                            >
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <label
                        htmlFor="duration"
                        className="text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2"
                      >
                        <Clock className="w-4 h-4 text-emerald-600" />
                        <span>Duration</span>
                      </label>
                      <Select
                        value={formState.duration || ""}
                        onValueChange={handleDurationChange}
                        disabled={formLoading}
                      >
                        <SelectTrigger className="border-gray-300 focus:ring-emerald-500 focus:border-emerald-500 rounded-lg bg-white shadow-sm py-3 px-4 text-base transition-all duration-300 cursor-pointer">
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 shadow-lg rounded-lg">
                          {durationOptions.map((option) => (
                            <SelectItem
                              key={option}
                              value={option}
                              className="hover:bg-emerald-50 cursor-pointer rounded-md mx-1 my-0.5 transition-all duration-200"
                            >
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <label className="text-sm font-semibold text-gray-700 mb-3 flex items-center space-x-2">
                        <BookOpen className="w-4 h-4 text-indigo-600" />
                        <span>Chapters</span>
                      </label>
                      {formState.chapters.map((chapter, chapterIndex) => (
                        <DraggableChapter
                          key={chapterIndex}
                          index={chapterIndex}
                          moveChapter={moveChapter}
                          canDrag={formState.chapters.length > 1}
                        >
                          <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: chapterIndex * 0.1 }}
                            className="border border-indigo-200 p-5 rounded-lg mt-4 space-y-4 bg-white shadow-sm relative"
                          >
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-300 via-purple-400 to-cyan-400 rounded-t-lg" />

                            <div className="flex items-center space-x-3">
                              <div className="w-9 h-9 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold shadow-sm">
                                {chapterIndex + 1}
                              </div>
                              <span className="text-sm font-semibold text-gray-700">Chapter {chapterIndex + 1}:</span>
                              <Input
                                placeholder="Chapter title"
                                value={chapter.title || ""}
                                onChange={(e) => handleChapterTitleChange(chapterIndex, e.target.value)}
                                className="flex-1 bg-white border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg shadow-sm transition-all duration-300"
                                disabled={formLoading}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeChapter(chapterIndex)}
                                disabled={formLoading}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer transition-all duration-200"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                            {isSubmitted && errors.chapters && (
                              <motion.p
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3 }}
                                className="text-red-600 text-sm mt-2 flex items-center space-x-1"
                              >
                                <X className="w-4 h-4" />
                                <span>{errors.chapters}</span>
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
                                <motion.div
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: lessonIndex * 0.05 }}
                                  className="ml-4 space-y-3 border-l-2 border-indigo-300 pl-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-r-lg p-3 shadow-sm"
                                >
                                  <div className="flex items-center space-x-3">
                                    <div className="w-7 h-7 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-md flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                                      {lessonIndex + 1}
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">Lesson {lessonIndex + 1}:</span>
                                    <Input
                                      placeholder="Lesson title"
                                      value={lesson.title || ""}
                                      onChange={(e) =>
                                        handleLessonTitleChange(chapterIndex, lessonIndex, e.target.value)
                                      }
                                      className="flex-1 bg-white border-gray-300 focus:ring-cyan-500 focus:border-cyan-500 rounded-lg shadow-sm transition-all duration-300"
                                      disabled={formLoading}
                                    />
                                    <Select
                                      value={lesson.format || ""}
                                      onValueChange={(value) =>
                                        handleLessonFormatChange(chapterIndex, lessonIndex, value)
                                      }
                                      disabled={formLoading}
                                    >
                                      <SelectTrigger className="w-36 border-gray-300 focus:ring-cyan-500 focus:border-cyan-500 rounded-lg bg-white shadow-sm cursor-pointer">
                                        <SelectValue placeholder="Format" />
                                      </SelectTrigger>
                                      <SelectContent className="bg-white border-gray-200 shadow-lg rounded-lg">
                                        {formatOptions.map((option) => (
                                          <SelectItem
                                            key={option}
                                            value={option}
                                            className="hover:bg-cyan-50 cursor-pointer rounded-md mx-1 my-0.5"
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
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                  {isSubmitted && errors.lessons && (
                                    <motion.p
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ duration: 0.3 }}
                                      className="text-red-600 text-sm mt-2 flex items-center space-x-1"
                                    >
                                      <X className="w-4 h-4" />
                                      <span>{errors.lessons}</span>
                                    </motion.p>
                                  )}
                                  {isSubmitted && errors.format && (
                                    <motion.p
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ duration: 0.3 }}
                                      className="text-red-600 text-sm mt-2 flex items-center space-x-1"
                                    >
                                      <X className="w-4 h-4" />
                                      <span>{errors.format}</span>
                                    </motion.p>
                                  )}
                                  <div className="space-y-4">
                                    {/* Resources Section */}
                                    <div>
                                      <div className="flex items-center justify-between">
                                        <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                                          <Shield className="w-4 h-4 text-cyan-600" />
                                          <span>Resources</span>
                                        </h5>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => toggleResources(chapterIndex, lessonIndex)}
                                          className="text-cyan-600 hover:text-cyan-800 hover:bg-cyan-50 rounded-lg cursor-pointer transition-all duration-200"
                                          disabled={formLoading}
                                        >
                                          {openResources[`${chapterIndex}-${lessonIndex}`] ? (
                                            <>
                                              <X className="w-4 h-4 mr-2" />
                                              Close
                                            </>
                                          ) : (
                                            <>
                                              <Plus className="w-4 h-4 mr-2" />
                                              Add Resources
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
                                              <div className="flex gap-3 mt-3">
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  onClick={() =>
                                                    setSelectionMode((prev) => ({
                                                      ...prev,
                                                      [`${chapterIndex}-${lessonIndex}-resources`]: "local",
                                                    }))
                                                  }
                                                  className="flex-1 border-cyan-300 text-cyan-700 hover:bg-cyan-50 rounded-lg cursor-pointer transition-all duration-300 shadow-sm bg-white flex items-center justify-center space-x-2"
                                                  disabled={formLoading}
                                                >
                                                  <Upload className="w-4 h-4" />
                                                  <span>Select from Local</span>
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
                                                  className="flex-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer transition-all duration-300 shadow-sm bg-white flex items-center justify-center space-x-2"
                                                  disabled={formLoading}
                                                >
                                                  <Cloud className="w-4 h-4" />
                                                  <span>Select from Google Drive</span>
                                                </Button>
                                              </div>
                                            )}
                                            {selectionMode[`${chapterIndex}-${lessonIndex}-resources`] === "local" && (
                                              <div className="grid grid-cols-4 gap-3 mt-3">
                                                {formatOptions.map((format, index) => (
                                                  <motion.div
                                                    key={format}
                                                    initial={{
                                                      opacity: 0,
                                                      scale: 0.9,
                                                    }}
                                                    animate={{
                                                      opacity: 1,
                                                      scale: 1,
                                                    }}
                                                    transition={{
                                                      delay: index * 0.05,
                                                    }}
                                                    whileHover={{
                                                      scale: 1.02,
                                                      y: -2,
                                                    }}
                                                    whileTap={{ scale: 0.98 }}
                                                  >
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        triggerFileInput(chapterIndex, lessonIndex, format, "resources")
                                                      }
                                                      className="w-full h-24 p-3 bg-white hover:bg-gradient-to-br hover:from-gray-50 hover:to-indigo-50 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 hover:border-indigo-300 flex flex-col items-center justify-center cursor-pointer group"
                                                      disabled={formLoading}
                                                    >
                                                      {getFileIcon(format)}
                                                      <span className="mt-2 text-xs font-semibold text-gray-700 group-hover:text-indigo-700 transition-colors duration-200">
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
                                              </div>
                                            )}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                      {lesson.resources.length > 0 && (
                                        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg p-3 border border-cyan-200 mt-3">
                                          <h5 className="text-sm font-semibold text-cyan-800 mb-2 flex items-center space-x-2">
                                            <Award className="w-4 h-4" />
                                            <span>Uploaded Resources</span>
                                          </h5>
                                          <ul className="space-y-2">
                                            {lesson.resources.map((resource, fileIndex) => (
                                              <motion.li
                                                key={fileIndex}
                                                initial={{
                                                  opacity: 0,
                                                  x: -10,
                                                }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{
                                                  delay: fileIndex * 0.1,
                                                }}
                                                className="flex items-center text-sm text-gray-700 bg-white p-3 rounded-lg shadow-sm border border-cyan-100"
                                              >
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
                                                <span className="ml-3 truncate flex-1 font-medium">
                                                  {resource.name}
                                                </span>
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() =>
                                                    removeFile(chapterIndex, lessonIndex, fileIndex, "resources")
                                                  }
                                                  disabled={formLoading}
                                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                                                >
                                                  <X className="w-4 h-4" />
                                                </Button>
                                              </motion.li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>

                                    {/* Worksheets Section */}
                                    <div>
                                      <div className="flex items-center justify-between">
                                        <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                                          <FileText className="w-4 h-4 text-emerald-600" />
                                          <span>Worksheets</span>
                                        </h5>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => toggleWorksheets(chapterIndex, lessonIndex)}
                                          className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg cursor-pointer transition-all duration-200"
                                          disabled={formLoading}
                                        >
                                          {openWorksheets[`${chapterIndex}-${lessonIndex}`] ? (
                                            <>
                                              <X className="w-4 h-4 mr-2" />
                                              Close
                                            </>
                                          ) : (
                                            <>
                                              <Plus className="w-4 h-4 mr-2" />
                                              Add Worksheets
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
                                              <div className="flex gap-3 mt-3">
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  onClick={() =>
                                                    setSelectionMode((prev) => ({
                                                      ...prev,
                                                      [`${chapterIndex}-${lessonIndex}-worksheets`]: "local",
                                                    }))
                                                  }
                                                  className="flex-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer transition-all duration-300 shadow-sm bg-white flex items-center justify-center space-x-2"
                                                  disabled={formLoading}
                                                >
                                                  <Upload className="w-4 h-4" />
                                                  <span>Select from Local</span>
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
                                                  className="flex-1 border-cyan-300 text-cyan-700 hover:bg-cyan-50 rounded-lg cursor-pointer transition-all duration-300 shadow-sm bg-white flex items-center justify-center space-x-2"
                                                  disabled={formLoading}
                                                >
                                                  <Cloud className="w-4 h-4" />
                                                  <span>Select from Google Drive</span>
                                                </Button>
                                              </div>
                                            )}
                                            {selectionMode[`${chapterIndex}-${lessonIndex}-worksheets`] === "local" && (
                                              <div className="grid grid-cols-4 gap-3 mt-3">
                                                {formatOptions.map((format, index) => (
                                                  <motion.div
                                                    key={format}
                                                    initial={{
                                                      opacity: 0,
                                                      scale: 0.9,
                                                    }}
                                                    animate={{
                                                      opacity: 1,
                                                      scale: 1,
                                                    }}
                                                    transition={{
                                                      delay: index * 0.05,
                                                    }}
                                                    whileHover={{
                                                      scale: 1.02,
                                                      y: -2,
                                                    }}
                                                    whileTap={{ scale: 0.98 }}
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
                                                      className="w-full h-24 p-3 bg-white hover:bg-gradient-to-br hover:from-gray-50 hover:to-emerald-50 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 hover:border-emerald-300 flex flex-col items-center justify-center cursor-pointer group"
                                                      disabled={formLoading}
                                                    >
                                                      {getFileIcon(format)}
                                                      <span className="mt-2 text-xs font-semibold text-gray-700 group-hover:text-emerald-700 transition-colors duration-200">
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
                                              </div>
                                            )}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                      {lesson.worksheets.length > 0 && (
                                        <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-3 border border-emerald-200 mt-3">
                                          <h5 className="text-sm font-semibold text-emerald-800 mb-2 flex items-center space-x-2">
                                            <Star className="w-4 h-4" />
                                            <span>Uploaded Worksheets</span>
                                          </h5>
                                          <ul className="space-y-2">
                                            {lesson.worksheets.map((worksheet, index) => (
                                              <motion.li
                                                key={index}
                                                initial={{
                                                  opacity: 0,
                                                  x: -10,
                                                }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{
                                                  delay: index * 0.1,
                                                }}
                                                className="flex items-center text-sm text-gray-700 bg-white p-3 rounded-lg shadow-sm border border-emerald-100"
                                              >
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
                                                <span className="ml-3 truncate flex-1 font-medium">
                                                  {worksheet.name}
                                                </span>
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() =>
                                                    removeFile(chapterIndex, lessonIndex, index, "worksheets")
                                                  }
                                                  disabled={formLoading}
                                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                                                >
                                                  <X className="w-4 h-4" />
                                                </Button>
                                              </motion.li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>

                                    {/* Learning Goals Section */}
                                    <div className="mt-4">
                                      <button
                                        type="button"
                                        onClick={() => toggleGoals(chapterIndex, lessonIndex)}
                                        className="flex items-center text-sm font-semibold text-gray-700 hover:text-gray-900 cursor-pointer transition-all duration-200 bg-gradient-to-r from-amber-50 to-yellow-50 px-3 py-2 rounded-lg hover:from-amber-100 hover:to-yellow-100 border border-amber-200"
                                      >
                                        <Zap className="w-4 h-4 mr-2 text-amber-600" />
                                        Learning Goals
                                        {openGoals[`${chapterIndex}-${lessonIndex}`] ? (
                                          <ChevronUp className="w-4 h-4 ml-2" />
                                        ) : (
                                          <ChevronDown className="w-4 h-4 ml-2" />
                                        )}
                                      </button>
                                      {openGoals[`${chapterIndex}-${lessonIndex}`] && (
                                        <div className="mt-3 space-y-3 bg-gradient-to-r from-amber-50 to-yellow-50 p-3 rounded-lg border border-amber-200">
                                          {lesson.learningGoals.map((goal, goalIndex) => (
                                            <motion.div
                                              key={goalIndex}
                                              initial={{ opacity: 0, y: 10 }}
                                              animate={{ opacity: 1, y: 0 }}
                                              transition={{
                                                delay: goalIndex * 0.1,
                                              }}
                                              className="flex items-center space-x-3"
                                            >
                                              <div className="w-6 h-6 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-sm">
                                                {goalIndex + 1}
                                              </div>
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
                                                className="flex-1 bg-white border-amber-300 focus:ring-amber-500 focus:border-amber-500 rounded-lg shadow-sm"
                                                disabled={formLoading}
                                              />
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeLearningGoal(chapterIndex, lessonIndex, goalIndex)}
                                                disabled={formLoading}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                                              >
                                                <X className="w-4 h-4" />
                                              </Button>
                                            </motion.div>
                                          ))}
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => addLearningGoal(chapterIndex, lessonIndex)}
                                            className="text-amber-700 hover:text-amber-800 hover:bg-amber-100 rounded-lg cursor-pointer transition-all duration-200"
                                            disabled={formLoading}
                                          >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Learning Goal
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              </DraggableLesson>
                            ))}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => addLesson(chapterIndex)}
                              disabled={formLoading}
                              className="text-cyan-600 hover:text-cyan-800 hover:bg-cyan-50 rounded-lg cursor-pointer transition-all duration-200 ml-4"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Lesson
                            </Button>
                          </motion.div>
                        </DraggableChapter>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={addChapter}
                        className="text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg ml-2 mt-4 cursor-pointer transition-all duration-200"
                        disabled={formLoading}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Chapter
                      </Button>
                    </motion.div>

                    <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                      {isSubmitted && errors.submit && (
                        <motion.p
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3 }}
                          className="text-red-600 text-sm mt-1 flex items-center space-x-1"
                        >
                          <X className="w-4 h-4" />
                          <span>{errors.submit}</span>
                        </motion.p>
                      )}
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          type="submit"
                          disabled={formLoading}
                          className="bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-700 hover:via-purple-700 hover:to-cyan-700 text-white rounded-lg px-8 py-3 transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer font-semibold"
                        >
                          {formLoading ? (
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Updating...</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <Sparkles className="w-4 h-4" />
                              <span>Update Course</span>
                            </div>
                          )}
                        </Button>
                      </motion.div>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {formState.title && (
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <div className="p-6">
                  <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-cyan-600 to-indigo-600 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-white" />
                    </div>
                    <span>Course Preview</span>
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{
                        duration: 3,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "linear",
                      }}
                    >
                      <Sparkles className="w-5 h-5 text-purple-500" />
                    </motion.div>
                  </h2>
                  <Card className="bg-white/90 backdrop-blur-sm border border-indigo-200 rounded-xl shadow-xl relative overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500" />

                    <CardContent className="pt-8 relative z-10">
                      <div className="space-y-8">
                        <div className="flex items-center space-x-4">
                          <motion.div
                            className="inline-block bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white px-8 py-4 rounded-lg text-2xl font-bold shadow-lg"
                            whileHover={{ scale: 1.02 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            {formState.title}
                          </motion.div>
                        </div>

                        {formState.chapters.length > 0 && (
                          <div>
                            <h4 className="text-lg font-semibold text-gray-800 mb-6 flex items-center space-x-2">
                              <BookOpen className="w-5 h-5 text-indigo-600" />
                              <span>Table of Contents</span>
                            </h4>
                            <ul className="space-y-6">
                              {formState.chapters.map(
                                (chapter, chapterIndex) =>
                                  chapter.title?.trim() && (
                                    <motion.li
                                      key={chapterIndex}
                                      initial={{ opacity: 0, y: 20 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: chapterIndex * 0.1 }}
                                      className="mt-4"
                                    >
                                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200 shadow-sm">
                                        <span className="font-bold text-xl text-gray-800 flex items-center space-x-3">
                                          <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold">
                                            {chapterIndex + 1}
                                          </div>
                                          <span>
                                            Chapter {chapterIndex + 1}: {chapter.title}
                                          </span>
                                        </span>
                                        {chapter.lessons.length > 0 && (
                                          <ul className="mt-4 space-y-3">
                                            {chapter.lessons.map((lesson, lessonIndex) => (
                                              <motion.li
                                                key={lessonIndex}
                                                initial={{
                                                  opacity: 0,
                                                  y: 10,
                                                }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{
                                                  duration: 0.3,
                                                  delay: lessonIndex * 0.05,
                                                }}
                                              >
                                                <div
                                                  className="group relative bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 hover:border-cyan-300 cursor-pointer"
                                                  onClick={() => toggleLesson(chapterIndex, lessonIndex)}
                                                >
                                                  <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                      {getLessonIcon(lesson.format)}
                                                      <div>
                                                        <span className="font-semibold text-gray-800">
                                                          Lesson {lessonIndex + 1}: {lesson.title || "Untitled"}
                                                        </span>
                                                        <div className="text-sm text-gray-600 mt-1">
                                                          Format: {lesson.format || "No format"}
                                                        </div>
                                                      </div>
                                                    </div>
                                                    <button
                                                      type="button"
                                                      className="text-gray-600 hover:text-gray-900 cursor-pointer transition-colors duration-200"
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
                                                        className="mt-4 space-y-4"
                                                      >
                                                        {lesson.resources.length > 0 && (
                                                          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-3 rounded-lg border border-cyan-200">
                                                            <h5 className="text-sm font-semibold text-cyan-800 mb-2 flex items-center space-x-2">
                                                              <Shield className="w-4 h-4" />
                                                              <span>Resources ({lesson.resources.length})</span>
                                                            </h5>
                                                            <ul className="space-y-2">
                                                              {lesson.resources.map((resource, fileIndex) => (
                                                                <li
                                                                  key={fileIndex}
                                                                  className="flex items-center text-sm text-gray-700 bg-white p-2 rounded-md shadow-sm"
                                                                >
                                                                  {getFileIcon(lesson.format)}
                                                                  <span className="ml-3 truncate font-medium">
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
                                                          <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-3 rounded-lg border border-emerald-200">
                                                            <h5 className="text-sm font-semibold text-emerald-800 mb-2 flex items-center space-x-2">
                                                              <FileText className="w-4 h-4" />
                                                              <span>Worksheets ({lesson.worksheets.length})</span>
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
                                                                    className="flex items-center text-sm text-gray-700 bg-white p-2 rounded-md shadow-sm"
                                                                  >
                                                                    {getFileIcon(format)}
                                                                    <span className="ml-3 truncate font-medium">
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
                                                          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-3 rounded-lg border border-amber-200">
                                                            <button
                                                              type="button"
                                                              onClick={(e) => {
                                                                e.stopPropagation()
                                                                toggleGoals(chapterIndex, lessonIndex)
                                                              }}
                                                              className="flex items-center text-sm font-semibold text-amber-800 hover:text-amber-900 cursor-pointer transition-colors duration-200"
                                                            >
                                                              <Zap className="w-4 h-4 mr-2" />
                                                              Learning Goals
                                                              {openGoals[`${chapterIndex}-${lessonIndex}`] ? (
                                                                <ChevronUp className="w-4 h-4 ml-2" />
                                                              ) : (
                                                                <ChevronDown className="w-4 h-4 ml-2" />
                                                              )}
                                                            </button>
                                                            {openGoals[`${chapterIndex}-${lessonIndex}`] && (
                                                              <ul className="list-disc ml-6 mt-3 text-sm text-gray-700 space-y-1">
                                                                {lesson.learningGoals.map(
                                                                  (goal, goalIndex) =>
                                                                    goal?.trim() && (
                                                                      <li key={goalIndex} className="font-medium">
                                                                        {goal}
                                                                      </li>
                                                                    ),
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
                                      </div>
                                    </motion.li>
                                  ),
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    {(formState.targetAudience || formState.duration) && (
                      <div className="absolute top-6 right-6 flex space-x-4">
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

        {/* Google Drive Modal - Full Screen Overlay */}
        <AnimatePresence>
          {isDriveFilesModalOpen && currentSelectionContext && (
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
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
                className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4 overflow-hidden relative border border-indigo-200"
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
                <div className="h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-500 absolute top-0 left-0 right-0" />

                <div className="flex justify-between items-center mb-6 mt-2">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-lg flex items-center justify-center">
                      <Cloud className="w-4 h-4 text-white" />
                    </div>
                    <span>Select from Google Drive</span>
                  </h2>
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
                    className="hover:bg-gray-100 rounded-lg transition-all duration-200 cursor-pointer"
                    aria-label="Close Google Drive modal"
                  >
                    <X className="w-5 h-5 text-gray-600 hover:text-red-600" />
                  </Button>
                </div>
                {isFetchingDriveFiles ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-3 border-cyan-600 border-t-transparent rounded-full animate-spin" />
                    <span className="ml-3 text-gray-700 font-medium">Loading files...</span>
                  </div>
                ) : driveFiles.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto">
                    <div className="grid grid-cols-1 gap-3">
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
                          className={`flex items-center space-x-3 p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                            selectedDriveFile?.id === file.id
                              ? "bg-cyan-50 border-cyan-400 shadow-md"
                              : "bg-gray-50 border-gray-200 hover:bg-gray-100"
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
                            <p className="text-sm font-semibold text-gray-800 truncate">{file.name}</p>
                            <p className="text-xs text-gray-600">
                              {file.mimeType.split("/")[1]?.toUpperCase() || "File"}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FaFile className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 font-medium">No files found in Google Drive.</p>
                  </div>
                )}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
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
                    className="border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg px-6 py-2 font-medium transition-all duration-200 cursor-pointer"
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
                    className="bg-gradient-to-r from-emerald-600 to-cyan-600 text-white hover:from-emerald-700 hover:to-cyan-700 rounded-lg px-6 py-2 font-medium disabled:opacity-50 transition-all duration-200 cursor-pointer shadow-md"
                  >
                    Select File
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DndProvider>
    </TooltipProvider>
  )
}
