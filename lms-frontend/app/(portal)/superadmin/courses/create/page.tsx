"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import { ChevronDown, ChevronUp, ArrowLeft, Plus, X, Target, Clock, GripVertical, BookOpen, FileText, Users, Calendar, Sparkles } from 'lucide-react'
import { DndProvider, useDrag, useDrop, type DragSourceMonitor } from "react-dnd"
import { HTML5Backend } from "react-dnd-html5-backend"
import Loader from "@/components/Loader"
import type { ApiError } from "@/types"

interface GoogleDriveFile {
  id: string
  name: string
  mimeType: string
  webViewLink?: string
}

interface Chapter {
  title: string | null
  lessons: Lesson[]
}

interface Lesson {
  title: string | null
  format: string | null
  resources: (File | GoogleDriveFile)[]
  worksheets: (File | GoogleDriveFile)[]
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

const ItemTypes = {
  CHAPTER: "chapter",
  LESSON: "lesson",
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
        <div className="absolute left-[-32px] top-1/2 transform -translate-y-1/2 hidden group-hover:block z-10">
          <div className="bg-white rounded-lg shadow-lg p-2 border border-gray-200">
            <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
          </div>
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
        <div className="absolute left-[-32px] top-1/2 transform -translate-y-1/2 hidden group-hover:block z-10">
          <div className="bg-white rounded-lg shadow-lg p-2 border border-gray-200">
            <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
          </div>
        </div>
      )}
      {children}
    </div>
  )
}

export default function CreateCourse() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [formLoading, setFormLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formState, setFormState] = useState<FormState>({
    title: null,
    chapters: [],
    targetAudience: null,
    duration: null,
  })
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

  const formatOptions = ["video", "audio", "pdf", "word", "ppt", "image", "generic"]
  const targetAudienceOptions = ["Beginner", "Intermediate", "Advanced"]
  const durationOptions = ["1 Week", "2 Weeks", "3 Weeks", "4 Weeks", "1 Month", "2 Months", "3 Months", "6 Months"]

  const handleUnauthorized = useCallback(() => {
    console.debug("[CreateCourse] Handling unauthorized access")
    localStorage.removeItem("token")
    localStorage.removeItem("userId")
    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem("deviceId")
    setErrors({ auth: "Session expired. Please log in again." })
    router.push("/login")
  }, [router])

  const fetchDriveFiles = async (folderId: string, format: string | null) => {
    try {
      setIsFetchingDriveFiles(true)
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
      console.error("Error fetching drive files:", error)
      setErrors({ drive: "Failed to fetch Google Drive files" })
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
      // Check for empty chapter titles
      if (formState.chapters.some((chapter) => !chapter.title || !chapter.title.trim())) {
        newErrors.chapters = "All chapter titles must be filled"
      }

      // Check for empty lesson titles
      if (
        formState.chapters.some((chapter) => chapter.lessons.some((lesson) => !lesson.title || !lesson.title.trim()))
      ) {
        newErrors.lessons = "All lesson titles must be filled"
      }

      // Check for missing formats
      if (
        formState.chapters.some((chapter) =>
          chapter.lessons.some((lesson) => !lesson.format || !formatOptions.includes(lesson.format)),
        )
      ) {
        newErrors.format = "All lessons must have a format selected"
      }
    }
    return newErrors
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitted(true)
    setErrors({})

    const newErrors = validateForm()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setFormLoading(false)
      return
    }

    setFormLoading(true)

    try {
      const deviceId = localStorage.getItem("deviceId")
      const token = localStorage.getItem("token")
      if (!deviceId || !token) {
        console.debug("[CreateCourse] Missing deviceId or token", {
          deviceId,
          token,
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
            lesson.resources.forEach((res) => {
              const key = `resources[${chapterIndex}][${lessonIndex}]`
              if (res instanceof File) {
                formData.append(key, res)
              } else if (res && res.id) {
                formData.append(`${key}[id]`, res.id)
                formData.append(`${key}[name]`, res.name)
                formData.append(`${key}[mimeType]`, res.mimeType)
                if (res.webViewLink) formData.append(`${key}[url]`, res.webViewLink)
              }
            })
            lesson.worksheets.forEach((ws) => {
              const key = `worksheets[${chapterIndex}][${lessonIndex}]`
              if (ws instanceof File) {
                formData.append(key, ws)
              } else if (ws && ws.id) {
                formData.append(`${key}[id]`, ws.id)
                formData.append(`${key}[name]`, ws.name)
                formData.append(`${key}[mimeType]`, ws.mimeType)
                if (ws.webViewLink) formData.append(`${key}[url]`, ws.webViewLink)
              }
            })
          })
        })
      }

      await api.post("/courses/create", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      setIsSubmitted(false)
      setErrors({})
      router.push("/superadmin/courses")
    } catch (error) {
      const apiError = error as ApiError
      console.error("[CreateCourse] Error creating course:", apiError.response?.data?.message || apiError.message)
      if (apiError.response?.status === 401) {
        handleUnauthorized()
      } else {
        setErrors({
          submit: apiError.response?.data?.message || "Failed to create course",
        })
      }
    } finally {
      setFormLoading(false)
    }
  }

  const handleBack = () => {
    router.push("/superadmin/courses")
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
    setFormState((prev) => ({ ...prev, targetAudience: value }))
    setErrors({})
    setIsSubmitted(false)
  }

  const handleDurationChange = (value: string) => {
    setFormState((prev) => ({ ...prev, duration: value }))
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

  useEffect(() => {
    if (authLoading) return
    if (!user || !["Admin", "Super Admin"].includes(user.role?.roleName || "")) {
      console.debug("[CreateCourse] Redirecting due to invalid role or no user", {
        user: !!user,
        role: user?.role?.roleName,
        authLoading,
      })
      handleUnauthorized()
      return
    }
  }, [user, authLoading, handleUnauthorized])

  if (authLoading) {
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pt-16">
          {/* Header Section */}
          <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleBack}
                        className="border-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 rounded-xl px-4 py-2 transition-all duration-300 shadow-sm hover:shadow-md"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Back to Courses</p>
                    </TooltipContent>
                  </Tooltip>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      Create New Course
                    </h1>
                    <p className="text-gray-600 mt-1">Build engaging learning experiences</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-6 h-6 text-yellow-500" />
                  <span className="text-sm font-medium text-gray-600">Course Builder</span>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-8 py-8">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Form Section */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-6"
              >
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl rounded-3xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8">
                    <CardTitle className="text-2xl font-bold flex items-center space-x-3">
                      <BookOpen className="w-7 h-7" />
                      <span>Course Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-8">
                      {/* Course Title */}
                      <div className="space-y-3">
                        <label
                          htmlFor="title"
                          className="text-lg font-semibold text-gray-800 flex items-center space-x-2"
                        >
                          <FileText className="w-5 h-5 text-blue-600" />
                          <span>Course Title</span>
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

                      {/* Target Audience & Duration */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <label className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                            <Users className="w-5 h-5 text-green-600" />
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
                            <Calendar className="w-5 h-5 text-purple-600" />
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

                      {/* Chapters Section */}
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <label className="text-xl font-bold text-gray-800">Course Structure</label>
                          <Button
                            type="button"
                            onClick={addChapter}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
                            disabled={formLoading}
                          >
                            <Plus className="w-5 h-5 mr-2" />
                            Add Chapter
                          </Button>
                        </div>

                        <div className="space-y-6">
                          {formState.chapters.map((chapter, chapterIndex) => (
                            <DraggableChapter
                              key={chapterIndex}
                              index={chapterIndex}
                              moveChapter={moveChapter}
                              canDrag={formState.chapters.length > 1}
                            >
                              <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                  duration: 0.4,
                                  delay: chapterIndex * 0.1,
                                }}
                                className="bg-gradient-to-r from-gray-50 to-blue-50 border-2 border-gray-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
                              >
                                <div className="flex items-center space-x-4 mb-6">
                                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-lg">
                                    Chapter {chapterIndex + 1}
                                  </div>
                                  <Input
                                    placeholder="Enter chapter title..."
                                    value={chapter.title || ""}
                                    onChange={(e) => handleChapterTitleChange(chapterIndex, e.target.value)}
                                    className="flex-1 h-12 text-lg border-2 border-gray-200 focus:border-blue-500 rounded-xl bg-white/70"
                                    disabled={formLoading}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeChapter(chapterIndex)}
                                    disabled={formLoading}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded-xl p-3"
                                  >
                                    <X className="w-5 h-5" />
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

                                {/* Lessons */}
                                <div className="space-y-4">
                                  {chapter.lessons.map((lesson, lessonIndex) => (
                                    <DraggableLesson
                                      key={lessonIndex}
                                      chapterIndex={chapterIndex}
                                      lessonIndex={lessonIndex}
                                      moveLesson={moveLesson}
                                      canDrag={chapter.lessons.length > 1}
                                    >
                                      <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{
                                          duration: 0.3,
                                          delay: lessonIndex * 0.05,
                                        }}
                                        className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl p-5 ml-8 shadow-md hover:shadow-lg transition-all duration-300"
                                      >
                                        <div className="flex items-center space-x-3 mb-4">
                                          <div className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-3 py-1 rounded-lg font-semibold text-sm">
                                            Lesson {lessonIndex + 1}
                                          </div>
                                          <Input
                                            placeholder="Enter lesson title..."
                                            value={lesson.title || ""}
                                            onChange={(e) =>
                                              handleLessonTitleChange(chapterIndex, lessonIndex, e.target.value)
                                            }
                                            className="flex-1 h-10 border-2 border-gray-200 focus:border-green-500 rounded-lg bg-white/70"
                                            disabled={formLoading}
                                          />
                                          <Select
                                            value={lesson.format || ""}
                                            onValueChange={(value) =>
                                              handleLessonFormatChange(chapterIndex, lessonIndex, value)
                                            }
                                            disabled={formLoading}
                                          >
                                            <SelectTrigger className="w-36 h-10 border-2 border-gray-200 focus:border-green-500 rounded-lg bg-white/70">
                                              <SelectValue placeholder="Format" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-xl rounded-lg">
                                              {formatOptions.map((option) => (
                                                <SelectItem key={option} value={option} className="hover:bg-green-50">
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
                                            className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg p-2"
                                          >
                                            <X className="w-4 h-4" />
                                          </Button>
                                        </div>

                                        {isSubmitted && errors.lessons && (
                                          <motion.p
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="text-red-500 text-sm font-medium mb-3"
                                          >
                                            {errors.lessons}
                                          </motion.p>
                                        )}
                                        {isSubmitted && errors.format && (
                                          <motion.p
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="text-red-500 text-sm font-medium mb-3"
                                          >
                                            {errors.format}
                                          </motion.p>
                                        )}

                                        {/* Resources & Worksheets */}
                                        <div className="space-y-6 mb-4">
                                          {/* Resources */}
                                          <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                              <h5 className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                                                <FileText className="w-4 h-4 text-blue-600" />
                                                <span>Resources</span>
                                              </h5>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleResources(chapterIndex, lessonIndex)}
                                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg px-3 py-1"
                                                disabled={formLoading}
                                              >
                                                {openResources[`${chapterIndex}-${lessonIndex}`] ? (
                                                  <>
                                                    <X className="w-4 h-4 mr-1" />
                                                    Close
                                                  </>
                                                ) : (
                                                  <>
                                                    <Plus className="w-4 h-4 mr-1" />
                                                    Add
                                                  </>
                                                )}
                                              </Button>
                                            </div>

                                            <AnimatePresence>
                                              {openResources[`${chapterIndex}-${lessonIndex}`] && (
                                                <motion.div
                                                  initial={{ opacity: 0, height: 0 }}
                                                  animate={{ opacity: 1, height: "auto" }}
                                                  exit={{ opacity: 0, height: 0 }}
                                                  transition={{ duration: 0.3 }}
                                                  className="space-y-3"
                                                >
                                                  {!selectionMode[`${chapterIndex}-${lessonIndex}-resources`] && (
                                                    <div className="grid grid-cols-2 gap-3">
                                                      <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() =>
                                                          setSelectionMode((prev) => ({
                                                            ...prev,
                                                            [`${chapterIndex}-${lessonIndex}-resources`]: "local",
                                                          }))
                                                        }
                                                        className="w-full border-2 border-blue-200 text-blue-700 hover:bg-blue-50 rounded-lg text-sm py-2 px-4"
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
                                                        className="w-full border-2 border-blue-200 text-blue-700 hover:bg-blue-50 rounded-lg text-sm py-2 px-4"
                                                        disabled={formLoading}
                                                      >
                                                        Select from Google Drive
                                                      </Button>
                                                    </div>
                                                  )}

                                                  {selectionMode[`${chapterIndex}-${lessonIndex}-resources`] ===
                                                    "local" && (
                                                    <motion.div
                                                      className="grid grid-cols-3 gap-2"
                                                      initial="hidden"
                                                      animate="visible"
                                                      variants={{
                                                        hidden: {
                                                          opacity: 0,
                                                        },
                                                        visible: {
                                                          opacity: 1,
                                                          transition: {
                                                            staggerChildren: 0.05,
                                                          },
                                                        },
                                                      }}
                                                    >
                                                      {formatOptions.map((format) => (
                                                        <motion.div
                                                          key={format}
                                                          variants={{
                                                            hidden: {
                                                              opacity: 0,
                                                              scale: 0.8,
                                                              y: 10,
                                                            },
                                                            visible: {
                                                              opacity: 1,
                                                              scale: 1,
                                                              y: 0,
                                                            },
                                                          }}
                                                          transition={{
                                                            type: "spring",
                                                            stiffness: 400,
                                                            damping: 25,
                                                          }}
                                                        >
                                                          <button
                                                            type="button"
                                                            onClick={() =>
                                                              triggerFileInput(
                                                                chapterIndex,
                                                                lessonIndex,
                                                                format,
                                                                "resources",
                                                              )
                                                            }
                                                            className="w-full p-3 bg-white hover:bg-blue-50 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border-2 border-gray-200 hover:border-blue-300 flex flex-col items-center justify-center group"
                                                            disabled={formLoading}
                                                          >
                                                            {getFileIcon(format)}
                                                            <span className="mt-1 text-xs font-medium text-gray-600 group-hover:text-blue-600">
                                                              {format === "image"
                                                                ? "Image"
                                                                : format === "generic"
                                                                  ? "Any"
                                                                  : format.charAt(0).toUpperCase() + format.slice(1)}
                                                            </span>
                                                          </button>
                                                          <input
                                                            type="file"
                                                            accept={getFileAccept(format)}
                                                            onChange={(e) =>
                                                              handleFileChange(
                                                                chapterIndex,
                                                                lessonIndex,
                                                                e,
                                                                "resources",
                                                              )
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
                                              <div className="space-y-2">
                                                {lesson.resources.map((resource, index) => (
                                                  <div
                                                    key={index}
                                                    className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-200"
                                                  >
                                                    <div className="flex items-center space-x-2">
                                                      {getFileIcon(lesson.format)}
                                                      <span className="text-sm font-medium text-gray-700 truncate">
                                                        {resource.name}
                                                      </span>
                                                    </div>
                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() =>
                                                        removeFile(chapterIndex, lessonIndex, index, "resources")
                                                      }
                                                      disabled={formLoading}
                                                      className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg p-1"
                                                    >
                                                      <X className="w-3 h-3" />
                                                    </Button>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>

                                          {/* Worksheets */}
                                          <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                              <h5 className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                                                <FileText className="w-4 h-4 text-green-600" />
                                                <span>Worksheets</span>
                                              </h5>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleWorksheets(chapterIndex, lessonIndex)}
                                                className="text-green-600 hover:text-green-800 hover:bg-green-100 rounded-lg px-3 py-1"
                                                disabled={formLoading}
                                              >
                                                {openWorksheets[`${chapterIndex}-${lessonIndex}`] ? (
                                                  <>
                                                    <X className="w-4 h-4 mr-1" />
                                                    Close
                                                  </>
                                                ) : (
                                                  <>
                                                    <Plus className="w-4 h-4 mr-1" />
                                                    Add
                                                  </>
                                                )}
                                              </Button>
                                            </div>

                                            <AnimatePresence>
                                              {openWorksheets[`${chapterIndex}-${lessonIndex}`] && (
                                                <motion.div
                                                  initial={{ opacity: 0, height: 0 }}
                                                  animate={{ opacity: 1, height: "auto" }}
                                                  exit={{ opacity: 0, height: 0 }}
                                                  transition={{ duration: 0.3 }}
                                                  className="space-y-3"
                                                >
                                                  {!selectionMode[`${chapterIndex}-${lessonIndex}-worksheets`] && (
                                                    <div className="grid grid-cols-2 gap-3">
                                                      <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() =>
                                                          setSelectionMode((prev) => ({
                                                            ...prev,
                                                            [`${chapterIndex}-${lessonIndex}-worksheets`]: "local",
                                                          }))
                                                        }
                                                        className="w-full border-2 border-green-200 text-green-700 hover:bg-green-50 rounded-lg text-sm py-2 px-4"
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
                                                        className="w-full border-2 border-green-200 text-green-700 hover:bg-green-50 rounded-lg text-sm py-2 px-4"
                                                        disabled={formLoading}
                                                      >
                                                        Select from Google Drive
                                                      </Button>
                                                    </div>
                                                  )}

                                                  {selectionMode[`${chapterIndex}-${lessonIndex}-worksheets`] ===
                                                    "local" && (
                                                    <motion.div
                                                      className="grid grid-cols-3 gap-2"
                                                      initial="hidden"
                                                      animate="visible"
                                                      variants={{
                                                        hidden: {
                                                          opacity: 0,
                                                        },
                                                        visible: {
                                                          opacity: 1,
                                                          transition: {
                                                            staggerChildren: 0.05,
                                                          },
                                                        },
                                                      }}
                                                    >
                                                      {formatOptions.map((format) => (
                                                        <motion.div
                                                          key={format}
                                                          variants={{
                                                            hidden: {
                                                              opacity: 0,
                                                              scale: 0.8,
                                                              y: 10,
                                                            },
                                                            visible: {
                                                              opacity: 1,
                                                              scale: 1,
                                                              y: 0,
                                                            },
                                                          }}
                                                          transition={{
                                                            type: "spring",
                                                            stiffness: 400,
                                                            damping: 25,
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
                                                            className="w-full p-3 bg-white hover:bg-green-50 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border-2 border-gray-200 hover:border-green-300 flex flex-col items-center justify-center group"
                                                            disabled={formLoading}
                                                          >
                                                            {getFileIcon(format)}
                                                            <span className="mt-1 text-xs font-medium text-gray-600 group-hover:text-green-600">
                                                              {format === "image"
                                                                ? "Image"
                                                                : format === "generic"
                                                                  ? "Any"
                                                                  : format.charAt(0).toUpperCase() + format.slice(1)}
                                                            </span>
                                                          </button>
                                                          <input
                                                            type="file"
                                                            accept={getFileAccept(format)}
                                                            onChange={(e) =>
                                                              handleFileChange(
                                                                chapterIndex,
                                                                lessonIndex,
                                                                e,
                                                                "worksheets",
                                                              )
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
                                              <div className="space-y-2">
                                                {lesson.worksheets.map((worksheet, index) => (
                                                  <div
                                                    key={index}
                                                    className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200"
                                                  >
                                                    <div className="flex items-center space-x-2">
                                                      {getFileIcon(lesson.format)}
                                                      <span className="text-sm font-medium text-gray-700 truncate">
                                                        {worksheet.name}
                                                      </span>
                                                    </div>
                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() =>
                                                        removeFile(chapterIndex, lessonIndex, index, "worksheets")
                                                      }
                                                      disabled={formLoading}
                                                      className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg p-1"
                                                    >
                                                      <X className="w-3 h-3" />
                                                    </Button>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {isSubmitted && errors.resources && (
                                          <motion.p
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="text-red-500 text-sm font-medium mb-3"
                                          >
                                            {errors.resources}
                                          </motion.p>
                                        )}

                                        {/* Learning Goals */}
                                        <div className="mt-6 pt-4 border-t border-gray-200">
                                          <button
                                            type="button"
                                            onClick={() => toggleGoals(chapterIndex, lessonIndex)}
                                            className="flex items-center text-sm font-semibold text-purple-600 hover:text-purple-800 bg-purple-100 hover:bg-purple-200 px-4 py-3 rounded-lg transition-all duration-200 w-full justify-between"
                                          >
                                            <div className="flex items-center">
                                              <Target className="w-4 h-4 mr-2" />
                                              Learning Goals
                                            </div>
                                            {openGoals[`${chapterIndex}-${lessonIndex}`] ? (
                                              <ChevronUp className="w-4 h-4" />
                                            ) : (
                                              <ChevronDown className="w-4 h-4" />
                                            )}
                                          </button>

                                          {openGoals[`${chapterIndex}-${lessonIndex}`] && (
                                            <div className="mt-3 space-y-3">
                                              {lesson.learningGoals.map((goal, goalIndex) => (
                                                <div key={goalIndex} className="flex items-center space-x-2">
                                                  <Input
                                                    placeholder="Enter learning goal..."
                                                    value={goal || ""}
                                                    onChange={(e) =>
                                                      handleLearningGoalChange(
                                                        chapterIndex,
                                                        lessonIndex,
                                                        goalIndex,
                                                        e.target.value,
                                                      )
                                                    }
                                                    className="flex-1 h-10 border-2 border-purple-200 focus:border-purple-500 rounded-lg bg-white/70"
                                                    disabled={formLoading}
                                                  />
                                                  <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                      removeLearningGoal(chapterIndex, lessonIndex, goalIndex)
                                                    }
                                                    disabled={formLoading}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg p-2"
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
                                                className="text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded-lg px-3 py-2"
                                                disabled={formLoading}
                                              >
                                                <Plus className="w-4 h-4 mr-1" />
                                                Add Goal
                                              </Button>
                                            </div>
                                          )}
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
                                    className="text-green-600 hover:text-green-800 hover:bg-green-100 rounded-lg px-4 py-2 ml-8"
                                  >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Lesson
                                  </Button>
                                </div>
                              </motion.div>
                            </DraggableChapter>
                          ))}
                        </div>
                      </div>

                      {/* Submit Button */}
                      <div className="flex justify-end space-x-4 pt-6">
                        {isSubmitted && errors.submit && (
                          <motion.p
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-red-500 text-sm font-medium"
                          >
                            {errors.submit}
                          </motion.p>
                        )}
                        <Button
                          type="submit"
                          disabled={formLoading}
                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                        >
                          {formLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                              Creating Course...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-5 h-5 mr-2" />
                              Create Course
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Preview Section */}
              {formState.title && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="space-y-6"
                >
                  <div className="sticky top-32">
                    <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center space-x-3">
                      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-2 rounded-xl">
                        <BookOpen className="w-6 h-6 text-white" />
                      </div>
                      <span>Course Preview</span>
                    </h2>

                    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-2xl rounded-3xl overflow-hidden">
                      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 p-8 relative overflow-hidden">
                        <div className="absolute inset-0 bg-black/10"></div>
                        <div className="relative z-10">
                          <h3 className="text-3xl font-bold text-white mb-4">{formState.title}</h3>
                          <div className="flex flex-wrap gap-3">
                            {formState.targetAudience && (
                              <div className="flex items-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-white font-medium">
                                <Users className="w-4 h-4 mr-2" />
                                {formState.targetAudience}
                              </div>
                            )}
                            {formState.duration && (
                              <div className="flex items-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-white font-medium">
                                <Clock className="w-4 h-4 mr-2" />
                                {formState.duration}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <CardContent className="p-8">
                        {formState.chapters.length > 0 && (
                          <div className="space-y-6">
                            <h4 className="text-2xl font-bold text-gray-800 mb-6">Course Structure</h4>
                            <div className="space-y-6">
                              {formState.chapters.map(
                                (chapter, chapterIndex) =>
                                  chapter.title?.trim() && (
                                    <motion.div
                                      key={chapterIndex}
                                      initial={{ opacity: 0, y: 20 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{
                                        duration: 0.4,
                                        delay: chapterIndex * 0.1,
                                      }}
                                      className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-6 border-2 border-gray-200"
                                    >
                                      <h5 className="text-xl font-bold text-gray-800 mb-4 flex items-center space-x-3">
                                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1 rounded-lg text-sm font-bold">
                                          Chapter {chapterIndex + 1}
                                        </div>
                                        <span>{chapter.title}</span>
                                      </h5>

                                      {chapter.lessons.length > 0 && (
                                        <div className="space-y-4">
                                          {chapter.lessons.map((lesson, lessonIndex) => (
                                            <motion.div
                                              key={lessonIndex}
                                              initial={{ opacity: 0, x: 20 }}
                                              animate={{ opacity: 1, x: 0 }}
                                              transition={{
                                                duration: 0.3,
                                                delay: lessonIndex * 0.05,
                                              }}
                                              className="bg-white/80 backdrop-blur-sm rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200"
                                            >
                                              <div
                                                className="flex items-center justify-between cursor-pointer"
                                                onClick={() => toggleLesson(chapterIndex, lessonIndex)}
                                              >
                                                <div className="flex items-center space-x-3">
                                                  {getLessonIcon(lesson.format)}
                                                  <div>
                                                    <h6 className="font-semibold text-gray-800">
                                                      Lesson {lessonIndex + 1}: {lesson.title || "Untitled"}
                                                    </h6>
                                                    <p className="text-sm text-gray-600">
                                                      Format: {lesson.format || "Not specified"}
                                                    </p>
                                                  </div>
                                                </div>
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  size="sm"
                                                  className="text-gray-600 hover:text-gray-900"
                                                >
                                                  {openLessons[`${chapterIndex}-${lessonIndex}`] ? (
                                                    <ChevronUp className="w-5 h-5" />
                                                  ) : (
                                                    <ChevronDown className="w-5 h-5" />
                                                  )}
                                                </Button>
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
                                                    {/* Resources Preview */}
                                                    {lesson.resources.length > 0 && (
                                                      <div className="bg-blue-50 rounded-lg p-4">
                                                        <h6 className="text-sm font-semibold text-blue-800 mb-2 flex items-center space-x-2">
                                                          <FileText className="w-4 h-4" />
                                                          <span>Resources ({lesson.resources.length})</span>
                                                        </h6>
                                                        <div className="grid grid-cols-2 gap-2">
                                                          {lesson.resources.map((resource, fileIndex) => (
                                                            <div
                                                              key={fileIndex}
                                                              className="flex items-center space-x-2 text-sm text-blue-700 bg-white/50 rounded-lg p-2"
                                                            >
                                                              {getFileIcon(
                                                                resource instanceof File
                                                                  ? lesson.format
                                                                  : resource.mimeType?.includes("pdf")
                                                                    ? "pdf"
                                                                    : resource.mimeType?.includes("document")
                                                                      ? "word"
                                                                      : resource.mimeType?.includes("presentation")
                                                                        ? "ppt"
                                                                        : resource.mimeType?.includes("image")
                                                                          ? "image"
                                                                          : resource.mimeType?.includes("video")
                                                                            ? "video"
                                                                            : resource.mimeType?.includes("audio")
                                                                              ? "audio"
                                                                              : "generic",
                                                              )}
                                                              <span className="truncate">{resource.name}</span>
                                                            </div>
                                                          ))}
                                                        </div>
                                                      </div>
                                                    )}

                                                    {/* Worksheets Preview */}
                                                    {lesson.worksheets.length > 0 && (
                                                      <div className="bg-green-50 rounded-lg p-4">
                                                        <h6 className="text-sm font-semibold text-green-800 mb-2 flex items-center space-x-2">
                                                          <FileText className="w-4 h-4" />
                                                          <span>Worksheets ({lesson.worksheets.length})</span>
                                                        </h6>
                                                        <div className="grid grid-cols-2 gap-2">
                                                          {lesson.worksheets.map((worksheet, fileIndex) => (
                                                            <div
                                                              key={fileIndex}
                                                              className="flex items-center space-x-2 text-sm text-green-700 bg-white/50 rounded-lg p-2"
                                                            >
                                                              {getFileIcon(
                                                                worksheet instanceof File
                                                                  ? lesson.format
                                                                  : worksheet.mimeType?.includes("pdf")
                                                                    ? "pdf"
                                                                    : worksheet.mimeType?.includes("document")
                                                                      ? "word"
                                                                      : worksheet.mimeType?.includes("presentation")
                                                                        ? "ppt"
                                                                        : worksheet.mimeType?.includes("image")
                                                                          ? "image"
                                                                          : worksheet.mimeType?.includes("video")
                                                                            ? "video"
                                                                            : worksheet.mimeType?.includes("audio")
                                                                              ? "audio"
                                                                              : "generic",
                                                              )}
                                                              <span className="truncate">{worksheet.name}</span>
                                                            </div>
                                                          ))}
                                                        </div>
                                                      </div>
                                                    )}

                                                    {/* Learning Goals Preview */}
                                                    {lesson.learningGoals.some((goal) => goal?.trim()) && (
                                                      <div className="bg-purple-50 rounded-lg p-4">
                                                        <button
                                                          type="button"
                                                          onClick={(e) => {
                                                            e.stopPropagation()
                                                            toggleGoals(chapterIndex, lessonIndex)
                                                          }}
                                                          className="flex items-center text-sm font-semibold text-purple-800 hover:text-purple-900 mb-2"
                                                        >
                                                          <Target className="w-4 h-4 mr-2" />
                                                          Learning Goals
                                                          {openGoals[`${chapterIndex}-${lessonIndex}`] ? (
                                                            <ChevronUp className="w-4 h-4 ml-2" />
                                                          ) : (
                                                            <ChevronDown className="w-4 h-4 ml-2" />
                                                          )}
                                                        </button>
                                                        {openGoals[`${chapterIndex}-${lessonIndex}`] && (
                                                          <ul className="list-disc list-inside space-y-1 text-sm text-purple-700">
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
                                            </motion.div>
                                          ))}
                                        </div>
                                      )}
                                    </motion.div>
                                  ),
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Google Drive Modal */}
          <AnimatePresence>
            {isDriveFilesModalOpen && currentSelectionContext && (
              <motion.div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
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
                  className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden"
                  initial={{ scale: 0.9, opacity: 0, y: 50 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 50 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      Select from Google Drive
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
                      className="hover:bg-gray-100 rounded-xl p-2"
                    >
                      <X className="w-6 h-6 text-gray-600 hover:text-red-500" />
                    </Button>
                  </div>

                  {isFetchingDriveFiles ? (
                    <div className="flex flex-col items-center justify-center py-16 space-y-4">
                      <Loader height="60" width="60" color="#3b82f6" ariaLabel="loading" visible={true} />
                      <p className="text-lg font-medium text-gray-600">Loading files from Google Drive...</p>
                    </div>
                  ) : driveFiles.length > 0 ? (
                    <div className="max-h-96 overflow-y-auto space-y-3 mb-8">
                      {driveFiles.map((file, index) => (
                        <motion.div
                          key={file.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`flex items-center space-x-4 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                            selectedDriveFile?.id === file.id
                              ? "bg-blue-50 border-blue-400 shadow-lg"
                              : "bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
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
                            <p className="font-semibold text-gray-800 truncate">{file.name}</p>
                            <p className="text-sm text-gray-600">
                              {file.mimeType.split("/")[1]?.toUpperCase() || "File"}
                            </p>
                          </div>
                          {selectedDriveFile?.id === file.id && (
                            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <FaFile className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-600">No files found in Google Drive</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Try selecting a different format or check your Google Drive folder
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-4">
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
                      className="border-2 border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl px-6 py-3 font-medium"
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
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-6 py-3 font-medium disabled:opacity-50 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      Select File
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DndProvider>
    </TooltipProvider>
  )
}