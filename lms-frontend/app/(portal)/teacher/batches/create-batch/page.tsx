"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  X,
  User,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  Users,
  UserPlus,
  Sparkles,
  Mail,
  Phone,
  Award,
  Filter,
  SortAsc,
  Zap,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"
import api from "@/lib/api"
import toast from "react-hot-toast"
import { DotLottieReact } from "@lottiefiles/dotlottie-react"
import type { ApiError } from "@/types"
import Image from "next/image"

interface Student {
  _id: string
  name: string
  email: string
  phone?: string
  profileImage?: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 15,
    },
  },
}

const cardHoverVariants = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.03,
    y: -8,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
}

export default function CreateBatch() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [batchName, setBatchName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [fetchLoading, setFetchLoading] = useState(true)
  const [createLoading, setCreateLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState(false)
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user || user.role?.roleName !== "Teacher") {
      router.push("/login")
    }
  }, [user, router])

  useEffect(() => {
    const fetchStudents = async () => {
      setFetchLoading(true)
      setError(null)
      try {
        const token = localStorage.getItem("token")
        if (!token) {
          throw new Error("No authentication token found")
        }
        const response = await api.get(`/schedule/students?teacherId=${user?._id}`)
        const fetchedStudents = response.data.students || []
        setStudents(fetchedStudents)
        setFilteredStudents(fetchedStudents)
      } catch (error) {
        const apiError = error as ApiError;
        setError(apiError.response?.data?.message || "Failed to fetch students");
        toast.error(apiError.response?.data?.message || "Failed to fetch students");
      } finally {
        setFetchLoading(false)
      }
    }

    if (user && user.role?.roleName === "Teacher") {
      fetchStudents()
    } else if (!authLoading) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const handler = setTimeout(() => {
      const lowerQuery = searchQuery.toLowerCase()
      const filtered = students.filter(
        (student) =>
          student.name.toLowerCase().includes(lowerQuery) ||
          student.email.toLowerCase().includes(lowerQuery) ||
          (student.phone || "").toLowerCase().includes(lowerQuery),
      )
      setFilteredStudents(filtered)
    }, 300)

    return () => clearTimeout(handler)
  }, [searchQuery, students])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (confirmModal && modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setConfirmModal(false)
        setBatchName("")
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [confirmModal])

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    )
  }

  const handleCreateBatch = async () => {
    if (!batchName.trim()) {
      toast.error("Batch name is required")
      return
    }
    if (selectedStudents.length === 0) {
      toast.error("At least one student must be selected")
      return
    }

    setCreateLoading(true)
    try {
      await api.post("/courses/batch/create", {
        name: batchName,
        studentIds: selectedStudents,
        teacherId: user?._id,
      })
      toast.success("Batch created successfully")
      router.push("/teacher/courses?tab=batch")
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(apiError.response?.data?.message || "Failed to create batch");
    } finally {
      setCreateLoading(false)
      setConfirmModal(false)
      setBatchName("")
    }
  }

  const truncateText = (text: string, maxLength = 18) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength - 3) + "..."
  }

  if (authLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 via-transparent to-purple-100/20"></div>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)",
              backgroundSize: "60px 60px",
            }}
          ></div>
        </div>
        <motion.div
          className="relative flex flex-col items-center space-y-6"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              className="h-16 w-16"
            >
              <div className="h-full w-full rounded-full border-4 border-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-1">
                <div className="h-full w-full rounded-full bg-white"></div>
              </div>
            </motion.div>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-xl"
            ></motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <h3 className="text-xl font-bold text-gray-800 mb-2">Loading Students</h3>
            <p className="text-gray-600">Preparing your workspace...</p>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  if (!user || user.role?.roleName !== "Teacher") {
    router.push("/login")
    return null
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6 mt-8 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-purple-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-blue-200/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-200/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 opacity-30">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 25%, rgba(99, 102, 241, 0.08) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.08) 0%, transparent 50%)",
            backgroundSize: "60px 60px",
          }}
        ></div>
      </div>

      <motion.div
        className="relative max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Enhanced Header Section */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col lg:flex-row justify-between items-start mb-8 gap-6"
        >
          <div className="flex items-center gap-6">
            <motion.div whileHover={{ scale: 1.05, rotate: -5 }} whileTap={{ scale: 0.95 }} className="relative">
              <Button
                variant="ghost"
                onClick={() => router.push("/teacher/courses")}
                className="relative text-gray-600 hover:text-gray-800 hover:bg-white/60 rounded-xl p-3 transition-all duration-300 border border-gray-200 hover:border-gray-300 backdrop-blur-sm group overflow-hidden shadow-md"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <ChevronLeft className="w-5 h-5 relative z-10" />
              </Button>
            </motion.div>
            <div>
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="flex items-center gap-2 mb-1"
              >
                <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
                <span className="text-yellow-600 font-semibold">Batch Creator</span>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 tracking-tight leading-tight"
              >
                Create New Batch
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, type: "spring" }}
                className="text-gray-700 text-lg mt-1 font-medium"
              >
                Select students and build your perfect batch
              </motion.p>
            </div>
          </div>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-4 bg-white/80 backdrop-blur-2xl rounded-xl px-6 py-3 border border-gray-200 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg shadow-md">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-gray-800 font-bold text-lg">{students.length}</p>
                  <p className="text-gray-600 text-xs">Available</p>
                </div>
              </div>
              <div className="w-px h-6 bg-gray-300"></div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg shadow-md">
                  <UserPlus className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-gray-800 font-bold text-lg">{selectedStudents.length}</p>
                  <p className="text-gray-600 text-xs">Selected</p>
                </div>
              </div>
            </div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="relative">
              <Button
                onClick={() => setConfirmModal(true)}
                disabled={createLoading || selectedStudents.length === 0}
                className="h-12 px-8 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 hover:from-emerald-700 hover:via-green-700 hover:to-teal-700 text-white rounded-xl shadow-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center gap-2">
                  <motion.div
                    animate={selectedStudents.length > 0 ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 2, repeat: selectedStudents.length > 0 ? Number.POSITIVE_INFINITY : 0 }}
                  >
                    <Zap className="w-5 h-5" />
                  </motion.div>
                  Create Batch
                </div>
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Enhanced Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative bg-gradient-to-r from-red-50 to-pink-50 backdrop-blur-2xl border border-red-200 rounded-2xl p-6 mb-6 shadow-lg overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-100/50 to-pink-100/50 animate-pulse"></div>
            <div className="relative flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                className="p-2 bg-red-100 rounded-xl"
              >
                <AlertCircle className="w-6 h-6 text-red-600" />
              </motion.div>
              <div>
                <h3 className="text-red-700 font-bold text-lg mb-1">System Alert</h3>
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Enhanced Search Section */}
        <motion.div
          variants={itemVariants}
          className="relative bg-white/80 backdrop-blur-2xl rounded-2xl shadow-lg border border-gray-200 p-6 mb-6 overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-purple-50/50 to-pink-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg"
                >
                  <Search className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Find Students</h2>
                  <p className="text-gray-600 text-sm">Search by name, email, or phone</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-300"
                >
                  <Filter className="w-4 h-4 text-gray-600" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-300"
                >
                  <SortAsc className="w-4 h-4 text-gray-600" />
                </motion.button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Search by student name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-12 pr-12 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-300 bg-white/80 backdrop-blur-sm text-gray-800 placeholder-gray-500 shadow-md"
              />
              {searchQuery && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hover:bg-gray-100 rounded-lg p-2 transition-all duration-300"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                  </Button>
                </motion.div>
              )}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Students Grid */}
        {fetchLoading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <motion.div
              className="relative flex flex-col items-center space-y-6"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  className="h-16 w-16"
                >
                  <div className="h-full w-full rounded-full border-4 border-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-1">
                    <div className="h-full w-full rounded-full bg-white"></div>
                  </div>
                </motion.div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-xl"
                ></motion.div>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center"
              >
                <h3 className="text-xl font-bold text-gray-800 mb-2">Loading Students</h3>
                <p className="text-gray-600">Fetching available students...</p>
              </motion.div>
            </motion.div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="text-center mt-16"
          >
            <div className="mx-auto w-80 h-80">
              <DotLottieReact
                src="https://lottie.host/3dbd1dd9-1fa6-4176-b31c-d78f20294a85/WjSa8Bg9Y7.lottie"
                loop
                autoplay
              />
            </div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold text-gray-800 mb-3"
            >
              No Students Available
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-gray-600 max-w-md mx-auto"
            >
              No students are assigned to you. Contact an admin to assign students.
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            variants={itemVariants}
            className="relative bg-white/80 backdrop-blur-2xl rounded-2xl shadow-lg border border-gray-200 p-6 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-purple-50/50 to-pink-50/50 animate-pulse"></div>

            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                    className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg"
                  >
                    <Users className="w-6 h-6 text-white" />
                  </motion.div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Available Students</h2>
                    <p className="text-gray-600 text-sm">
                      {selectedStudents.length} of {filteredStudents.length} students selected
                    </p>
                  </div>
                </div>

                {selectedStudents.length > 0 && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-gradient-to-r from-emerald-100 to-teal-100 backdrop-blur-sm rounded-xl px-4 py-2 border border-emerald-200"
                  >
                    <span className="text-emerald-700 font-bold">{selectedStudents.length} Selected</span>
                  </motion.div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                <AnimatePresence>
                  {filteredStudents.map((student, index) => (
                    <motion.div
                      key={student._id}
                      variants={cardHoverVariants}
                      initial="rest"
                      whileHover="hover"
                      animate="rest"
                      exit={{ opacity: 0, scale: 0.8, y: 20 }}
                      transition={{ duration: 0.3, delay: index * 0.02 }}
                      className="group relative"
                      ref={(el) => {
                        if (el) cardRefs.current.set(student._id, el)
                      }}
                    >
                      <Card
                        className={`overflow-hidden backdrop-blur-2xl border-2 rounded-2xl shadow-md h-full cursor-pointer transition-all duration-300 relative ${
                          selectedStudents.includes(student._id)
                            ? "bg-gradient-to-br from-emerald-100 to-teal-100 border-emerald-300 ring-2 ring-emerald-200"
                            : "bg-gradient-to-br from-white to-gray-50 border-gray-200 hover:border-blue-300"
                        }`}
                        onClick={() => handleStudentSelect(student._id)}
                      >
                        {/* Selection glow effect */}
                        <div
                          className={`absolute inset-0 bg-gradient-to-r from-emerald-100/50 via-teal-100/50 to-blue-100/50 opacity-0 transition-opacity duration-300 rounded-2xl ${
                            selectedStudents.includes(student._id) ? "opacity-100" : "group-hover:opacity-50"
                          }`}
                        ></div>

                        <CardContent className="p-4 h-full flex flex-col relative z-10">
                          {/* Selection indicator */}
                          <div className="absolute top-2 right-2 z-20">
                            <motion.div
                              animate={selectedStudents.includes(student._id) ? { scale: [1, 1.2, 1] } : {}}
                              transition={{ duration: 0.5 }}
                              className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-all duration-300 ${
                                selectedStudents.includes(student._id)
                                  ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                                  : "bg-gray-200 group-hover:bg-blue-300"
                              }`}
                            >
                              <CheckCircle className="w-3 h-3 text-white" />
                            </motion.div>
                          </div>

                          {/* Profile Section */}
                          <div className="flex items-center justify-center mb-3">
                            {student.profileImage ? (
                              <div className="relative">
                                <motion.div whileHover={{ scale: 1.1 }} className="relative">
                                  <Image
                                    src={student.profileImage || "/placeholder.svg"}
                                    alt={student.name}
                                    width={64}
                                    height={64}
                                    className={`w-16 h-16 rounded-xl object-cover border-2 shadow-lg transition-all duration-300 ${
                                      selectedStudents.includes(student._id)
                                        ? "border-emerald-400"
                                        : "border-gray-300 group-hover:border-blue-400"
                                    }`}
                                  />
                                  <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-emerald-500/20 to-transparent"></div>
                                </motion.div>
                                <div
                                  className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-md border border-white transition-all duration-300 ${
                                    selectedStudents.includes(student._id)
                                      ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                                      : "bg-gray-200 group-hover:bg-blue-400"
                                  }`}
                                >
                                  <Award className="w-3 h-3 text-white" />
                                </div>
                              </div>
                            ) : (
                              <div className="relative">
                                <motion.div
                                  whileHover={{ scale: 1.1 }}
                                  className={`w-16 h-16 rounded-xl bg-gradient-to-br flex items-center justify-center border-2 shadow-lg backdrop-blur-sm transition-all duration-300 ${
                                    selectedStudents.includes(student._id)
                                      ? "from-emerald-200 to-teal-200 border-emerald-400"
                                      : "from-gray-100 to-gray-200 border-gray-300 group-hover:border-blue-400 group-hover:from-blue-100 group-hover:to-indigo-100"
                                  }`}
                                >
                                  <User
                                    className={`w-8 h-8 transition-colors duration-300 ${
                                      selectedStudents.includes(student._id)
                                        ? "text-emerald-600"
                                        : "text-gray-500 group-hover:text-blue-600"
                                    }`}
                                  />
                                </motion.div>
                                <div
                                  className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-md border border-white transition-all duration-300 ${
                                    selectedStudents.includes(student._id)
                                      ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                                      : "bg-gray-200 group-hover:bg-blue-400"
                                  }`}
                                >
                                  <Award className="w-3 h-3 text-white" />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Student Info */}
                          <div className="text-center mb-3 flex-grow">
                            <motion.h3
                              whileHover={{ scale: 1.05 }}
                              className={`text-lg font-bold mb-2 transition-colors duration-300 ${
                                selectedStudents.includes(student._id)
                                  ? "text-emerald-700"
                                  : "text-gray-800 group-hover:text-blue-700"
                              }`}
                              title={student.name}
                            >
                              {truncateText(student.name, 14)}
                            </motion.h3>

                            <div className="space-y-2">
                              <div className="flex items-center justify-center gap-2 text-gray-600 bg-gray-50 rounded-lg p-2 backdrop-blur-sm">
                                <Mail className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                <span className="text-xs truncate max-w-[100px]" title={student.email}>
                                  {student.email}
                                </span>
                              </div>

                              {student.phone && (
                                <div className="flex items-center justify-center gap-2 text-gray-600 bg-gray-50 rounded-lg p-2 backdrop-blur-sm">
                                  <Phone className="w-3 h-3 text-green-500 flex-shrink-0" />
                                  <span className="text-xs">{student.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}

        {/* Enhanced Confirmation Modal */}
        <AnimatePresence>
          {confirmModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
            >
              <motion.div
                ref={modalRef}
                initial={{ scale: 0.8, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 50 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="bg-white/95 backdrop-blur-2xl rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-200 relative overflow-hidden"
              >
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 animate-pulse"></div>

                <div className="relative text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg"
                  >
                    <Zap className="w-8 h-8 text-white" />
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-2xl font-bold text-gray-800 mb-2"
                  >
                    Create New Batch
                  </motion.h2>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mb-4"
                  >
                    <Input
                      type="text"
                      placeholder="Enter batch name..."
                      value={batchName}
                      onChange={(e) => setBatchName(e.target.value)}
                      className="w-full h-12 rounded-xl border-2 border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all duration-300 bg-white/80 backdrop-blur-sm text-gray-800 placeholder-gray-500 shadow-md"
                    />
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-gray-600 mb-6 leading-relaxed"
                  >
                    You have selected{" "}
                    <span className="font-bold text-emerald-600 text-xl">{selectedStudents.length}</span>{" "}
                    {selectedStudents.length === 1 ? "student" : "students"} for this batch.
                    <br />
                    <span className="text-sm text-gray-500 mt-1 block">This will create a new learning group.</span>
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex gap-3"
                  >
                    <Button
                      variant="outline"
                      onClick={() => {
                        setConfirmModal(false)
                        setBatchName("")
                      }}
                      className="flex-1 h-12 border-2 border-gray-300 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateBatch}
                      disabled={createLoading || !batchName.trim()}
                      className="flex-1 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold shadow-lg transition-all duration-300 disabled:opacity-50 relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative flex items-center gap-2">
                        <motion.div
                          animate={createLoading ? { rotate: 360 } : {}}
                          transition={{ duration: 1, repeat: createLoading ? Number.POSITIVE_INFINITY : 0 }}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </motion.div>
                        {createLoading ? "Creating..." : "Create Batch"}
                      </div>
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
