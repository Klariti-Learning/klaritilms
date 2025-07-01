"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import toast from "react-hot-toast";
import { ApiError, UserDetails } from "@/types";
import Image from "next/image";
import { User, Mail, Book, Calendar, Heart, Star } from "lucide-react";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Loader from "@/components/Loader";

export default function StudentPeerProfile() {
const { user, loading: authLoading, deviceId } = useAuth();
  const [student, setStudent] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const studentId = params.studentId as string;

const handleUnauthorized = useCallback(() => {
    console.debug("[StudentPeerProfile] Handling unauthorized access");
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("deviceId");
    toast.error("Session expired. Please log in again.");
    router.push("/login");
  }, [router]);

  useEffect(() => {
    if (authLoading) return;
    if (!studentId) {
  console.debug("[StudentPeerProfile] Invalid studentId", { studentId });
  toast.error("Invalid student ID");
  router.push("/"); 
  return;
}
    if (!user || !["Student", "Teacher"].includes(user?.role?.roleName || "")) {
     handleUnauthorized();
      return;
    }
    const fetchStudent = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token || !deviceId) {
          handleUnauthorized();
          return;
        }
        setLoading(true);
        const res = await api.get(`/users/students/${studentId}`);
        setStudent(res.data);
      } catch (error) {
        const errorMessage = error as ApiError;
        console.error("[StudentPeerProfile] Error fetching student data:", {
          errorMessage,
          errors: errorMessage.response?.data?.message || "Failed to fetch student data",
        });
        if (errorMessage.response?.status === 401) {
          handleUnauthorized();
        }else if (errorMessage.response?.status === 404) {
          toast.error("Student not found");
          setStudent(null);
        } else {
          toast.error(
            errorMessage.response?.data?.message || "Failed to fetch student data"
          );
        }
      }finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [user, router, studentId, authLoading, handleUnauthorized, deviceId]);

  if (loading) {
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
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-gray-100">
        <p className="text-gray-600 text-lg">Student not found</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 mt-5"
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-xl p-6 sm:p-8 transition-all duration-300 ease-in-out transform hover:scale-[1.01]"
        role="region"
        aria-label="Student profile"
        style={{
          boxShadow:
            "0 15px 40px rgba(0, 0, 0, 0.1), 0 5px 15px rgba(0, 0, 0, 0.05)",
        }}
      >
        {student.studentId && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="absolute top-4 right-4 px-4 py-2 rounded-lg shadow-lg font-semibold text-white bg-gradient-to-r from-green-400 to-green-600"
          >
            {student.studentId}
          </motion.div>
        )}
        <div className="flex justify-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative group"
          >
            <Image
              src={student.profileImage || "/default-profile.png"}
              alt={student.name}
              className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg group-hover:border-indigo-400 cursor-pointer transition-all duration-300"
              width={128}
              height={128}
            />
          </motion.div>
        </div>
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-lg bg-gradient-to-r from-indigo-100 to-blue-100">
            <TabsTrigger
              value="personal"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-300 cursor-pointer"
            >
              Personal Info
            </TabsTrigger>
            <TabsTrigger
              value="work"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-300 cursor-pointer"
            >
              Academic Info
            </TabsTrigger>
            <TabsTrigger
              value="additional"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-300 cursor-pointer"
            >
              Additional Info
            </TabsTrigger>
          </TabsList>
          <TabsContent value="personal">
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
              >
                <User className="w-6 h-6 text-indigo-500" />
                <div className="flex-1 ml-4">
                  <p className="text-sm font-medium text-gray-600">Name</p>
                  <p className="mt-1 text-gray-800 text-lg font-medium">
                    {student.name}
                  </p>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="flex items-center bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
              >
                <Mail className="w-6 h-6 text-indigo-500" />
                <div className="flex-1 ml-4">
                  <p className="text-sm font-medium text-gray-600">Email</p>
                  <p className="mt-1 text-gray-800 text-lg font-medium">
                    {student.email || "Not set"}
                  </p>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="flex items-center bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
              >
                <User className="w-6 h-6 text-indigo-500" />
                <div className="flex-1 ml-4">
                  <p className="text-sm font-medium text-gray-600">Gender</p>
                  <p className="mt-1 text-gray-800 text-lg font-medium">
                    {student.gender || "Not set"}
                  </p>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="flex items-center bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
              >
                <User className="w-6 h-6 text-indigo-500" />
                <div className="flex-1 ml-4">
                  <p className="text-sm font-medium text-gray-600">Role</p>
                  <p className="mt-1 text-gray-800 text-lg font-medium">
                    {student.role?.roleName || "Student"}
                  </p>
                </div>
              </motion.div>
            </div>
          </TabsContent>
          <TabsContent value="work">
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="flex items-center bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
              >
                <Book className="w-6 h-6 text-indigo-500" />
                <div className="flex-1 ml-4">
                  <p className="text-sm font-medium text-gray-600">Subjects</p>
                  <p className="mt-1 text-gray-800 text-lg font-medium">
                    {student.subjects?.join(", ") || "Not set"}
                  </p>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="flex items-center bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
              >
                <Calendar className="w-6 h-6 text-indigo-500" />
                <div className="flex-1 ml-4">
                  <p className="text-sm font-medium text-gray-600">Joined</p>
                  <p className="mt-1 text-gray-800 text-lg font-medium">
                    {student.joinDate
                      ? new Date(student.joinDate).toLocaleDateString()
                      : "Not set"}
                  </p>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
              >
                <Star className="w-6 h-6 text-indigo-500" />
                <div className="flex-1 ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Qualifications
                  </p>
                  <p className="mt-1 text-gray-800 text-lg font-medium">
                    {student.profile?.qualifications || "Not set"}
                  </p>
                </div>
              </motion.div>
            </div>
          </TabsContent>
          <TabsContent value="additional">
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
              >
                <User className="w-6 h-6 text-indigo-500" />
                <div className="flex-1 ml-4">
                  <p className="text-sm font-medium text-gray-600">Bio</p>
                  <p className="mt-1 text-gray-800 text-lg font-medium">
                    {student.profile?.bio || "Not set"}
                  </p>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="flex items-center bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
              >
                <User className="w-6 h-6 text-indigo-500" />
                <div className="flex-1 ml-4">
                  <p className="text-sm font-medium text-gray-600">About</p>
                  <p className="mt-1 text-gray-800 text-lg font-medium">
                    {student.profile?.about || "Not set"}
                  </p>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="flex items-center bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
              >
                <Heart className="w-6 h-6 text-indigo-500" />
                <div className="flex-1 ml-4">
                  <p className="text-sm font-medium text-gray-600">Hobbies</p>
                  <p className="mt-1 text-gray-800 text-lg font-medium">
                    {student.profile?.hobbies?.join(", ") || "Not set"}
                  </p>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="flex items-center bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
              >
                <Star className="w-6 h-6 text-indigo-500" />
                <div className="flex-1 ml-4">
                  <p className="text-sm font-medium text-gray-600">Skills</p>
                  <p className="mt-1 text-gray-800 text-lg font-medium">
                    {student.profile?.skills?.join(", ") || "Not set"}
                  </p>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="flex items-center bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
              >
                <Star className="w-6 h-6 text-indigo-500" />
                <div className="flex-1 ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Accomplishments
                  </p>
                  <p className="mt-1 text-gray-800 text-lg font-medium">
                    {student.profile?.accomplishments?.join(", ") || "Not set"}
                  </p>
                </div>
              </motion.div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
}
