"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import toast from "react-hot-toast";
import { ApiError, UserDetails } from "@/types";
import Image from "next/image";
import { Book, IdCard } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import Loader from "@/components/Loader";

export default function StudentList() {
  const { user, loading: authLoading, deviceId } = useAuth();
  const [students, setStudents] = useState<UserDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const handleUnauthorized = useCallback(() => {
    console.debug("[StudentList] Handling unauthorized access");
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("deviceId");
    toast.error("Session expired. Please log in again.");
    router.push("/login");
  }, [router]);

  useEffect(() => {
    if (authLoading) return; 
    if (!user || user.role?.roleName !== "Teacher") {
      console.debug("[StudentList] Redirecting due to invalid role or no user", {
        user: !!user,
        role: user?.role?.roleName,
        authLoading,
      });
      handleUnauthorized();
      return;
    }

    const fetchStudents = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token || !deviceId) {
          console.debug("[StudentList] Missing token or deviceId in fetchStudents", {
            token,
            deviceId,
          });
          handleUnauthorized();
          return;
        }

        const res = await api.get(`/users/teachers/${user._id}/students`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Device-Id": deviceId,
          },
        });
        if (!Array.isArray(res.data)) {
          throw new Error("Invalid student data received");
        }
        setStudents(res.data);
      } catch (error) {
        const apiError = error as ApiError;
        console.error("[StudentList] Error fetching students:", apiError);
        if (apiError.response?.status === 401) {
          handleUnauthorized();
        } else {
          toast.error(apiError.response?.data?.message || "Failed to fetch students");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [user, authLoading, deviceId, router, handleUnauthorized]);

  const handleCardClick = (studentId: string) => {
    if (!studentId) {
      toast.error("Invalid student ID");
      console.error("Invalid student ID:", studentId);
      return;
    }
    router.push(`/teacher/student/${studentId}`);
  };

  const handleReportCardClick = (studentId: string) => {
    if (!studentId) {
      toast.error("Invalid student ID");
      console.error("Invalid student ID:", studentId);
      return;
    }
    router.push(`/teacher/report-card/${studentId}`);
  };

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

  if (!students.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-gray-100">
        <p className="text-gray-600 text-lg">No students assigned</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 ml-20"
    >
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl p-6 sm:p-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-500">
          My Students
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {students.map((student) => (
            <motion.div
              key={student._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              whileHover={{ scale: 1.02 }}
            >
              <Card
                className="relative bg-white border-2 border-[#dddd] rounded-3xl transition-all cursor-pointer overflow-hidden min-w-[250px]"
                style={{
                  transform:
                    "perspective(1000px) rotateX(2deg) rotateY(2deg) translateY(0)",
                  boxShadow: "6px 6px 0 0 #dddd",
                  border: "1px solid #eeee",
                  transition:
                    "transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out, border 0.3s ease-in-out",
                }}
                onMouseEnter={(e) => {
                  const card = e.currentTarget;
                  card.style.transform =
                    "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(-8px)";
                  card.style.boxShadow = "12px 12px 0 0 #dddd";
                  card.style.border = "1px solid #eeee";
                }}
                onMouseLeave={(e) => {
                  const card = e.currentTarget;
                  card.style.transform =
                    "perspective(1000px) rotateX(2deg) rotateY(2deg) translateY(0)";
                  card.style.boxShadow = "6px 6px 0 0 #dddd";
                  card.style.border = "1px solid #eeee";
                }}
                onClick={() => handleCardClick(student._id)}
                role="button"
                aria-label={`View profile of ${student.name}`}
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
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <Image
                      src={student.profileImage || "/default-profile.png"}
                      alt={student.name}
                      width={64}
                      height={64}
                      className="w-16 h-16 rounded-full object-cover border-4 border-indigo-200 shadow-lg"
                    />
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {student.name}
                      </h3>
                    </div>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="flex items-center bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
                  >
                    <Book className="w-6 h-6 text-indigo-500" />
                    <div className="flex-1 ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        Subjects
                      </p>
                      <p className="mt-1 text-gray-800 text-lg font-medium">
                        {student.subjects?.join(", ") || "None"}
                      </p>
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="mt-4"
                  >
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReportCardClick(student._id);
                      }}
                      className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white cursor-pointer"
                    >
                      <IdCard /> Report Card
                    </Button>
                  </motion.div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
