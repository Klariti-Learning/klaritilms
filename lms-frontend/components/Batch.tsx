"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import toast from "react-hot-toast";
import { ApiError, UserDetails } from "@/types";
import Image from "next/image";
import { Book, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import Loader from "@/components/Loader";

export default function Batch() {
  const { user, loading: authLoading, deviceId } = useAuth();
  const [teacher, setTeacher] = useState<UserDetails | null>(null);
  const [peers, setPeers] = useState<UserDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleUnauthorized = useCallback(() => {
    console.debug("[Batch] Handling unauthorized access");
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("isLoggedIn");
    router.push("/login");
  }, [router]);

  const fetchBatch = useCallback(async () => {
    if (!user || !deviceId) return;
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      if (!token) {
        handleUnauthorized();
        return;
      }

      const res = await api.get(`/users/students/${user._id}/peers`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Device-Id": deviceId,
        },
      });
      setTeacher(res.data.teacher);
      setPeers(res.data.fellowStudents);
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[Batch] Failed to fetch batch data:", apiError);
      const errorMessage =
        apiError.response?.data?.message || "Failed to fetch batch data";
      setError(errorMessage);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [user, deviceId, handleUnauthorized]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user?.role?.roleName !== "Student") {
      console.debug("[Batch] Redirecting to login", {
        user: !!user,
        role: user?.role?.roleName,
        authLoading,
      });
      handleUnauthorized();
      return;
    }
    console.debug("[Batch] Fetching batch data", { userId: user._id });
    fetchBatch();
  }, [user, authLoading, router, fetchBatch, handleUnauthorized]);

  const handleCardClick = (studentId: string | undefined) => {
    if (!studentId) {
      toast.error("Invalid student ID");
      console.error("Invalid student ID:", studentId);
      return;
    }
    router.push(`/student/${studentId}`);
  };

  if (authLoading || (!user && loading)) {
    return (
      <div className="text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-400 rounded-full blur-xl opacity-20 animate-pulse"></div>
          <Loader
            height="80"
            width="80"
            color="#2563eb"
            ariaLabel="triangle-loading"
            wrapperStyle={{}}
            wrapperClass=""
            visible={true}
          />
          <p className="mt-6 text-blue-700 font-medium text-lg">
            Loading your batch...
          </p>
        </div>
      </div>
    );
  }

  if (!user || user.role?.roleName !== "Student") {
    return null;
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      >
        <div className="text-center">
          <div className="p-4 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border-0">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Error Loading Batch
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                fetchBatch();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              Try Again
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
    >
      <div className="w-full max-w-3xl bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-6 sm:p-8 border-0">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-500">
          My Batch
        </h1>
        {/* Teacher Section */}
        <h3 className="text-2xl font-bold mb-4 text-gray-900">My Teacher</h3>
        {teacher ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            whileHover={{ scale: 1.02 }}
          >
            <Card
              className="relative bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all cursor-pointer overflow-hidden mb-8"
              onClick={() => router.push(`/student/teacher`)}
              role="button"
              aria-label={`View profile of ${teacher.name}`}
            >
              {teacher.employeeId && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="absolute top-4 right-4 px-4 py-2 rounded-lg shadow-lg font-semibold text-white bg-gradient-to-r from-orange-400 to-orange-600"
                >
                  {teacher.employeeId}
                </motion.div>
              )}
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <Image
                    src={teacher.profileImage || "/default-profile.png"}
                    alt={teacher.name}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-full object-cover border-4 border-indigo-200 shadow-lg"
                  />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {teacher.name}
                    </h3>
                  </div>
                </div>
                <div className="space-y-4">
                  <motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, delay: 0.1 }}
  className="bg-blue-50 rounded-xl p-4 hover:bg-blue-100 transition-colors"
>
  <div className="flex-1">
    <div className="flex items-center gap-2">
      <Book className="w-6 h-6 text-indigo-500 shrink-0" />
      <p className="text-sm font-medium text-gray-600">Subjects:</p>
      <div className="flex flex-wrap gap-2">
        {teacher.subjects?.length ? (
          teacher.subjects.map((subject, index) => (
            <div
              key={index}
              className="flex items-center px-3 py-1 rounded-full text-sm font-medium text-indigo-700 bg-indigo-100/30 border border-indigo-200 hover:bg-indigo-100/50 transition-colors"
            >
              {subject}
            </div>
          ))
        ) : (
          <span className="text-gray-600 text-sm font-medium">None</span>
        )}
      </div>
    </div>
  </div>
</motion.div>
                </div>
              </div>
            </Card>
          </motion.div>
        ) : (
          <p className="mb-8 text-gray-600 font-medium">No teacher assigned</p>
        )}
        {/* Peers Section */}
        <h3 className="text-2xl font-bold mb-4 text-gray-900">My Peers</h3>
        {peers.length === 0 ? (
          <p className="text-gray-600 font-medium">No peers found</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {peers.map((peer) => (
              <motion.div
                key={peer._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                whileHover={{ scale: 1.02 }}
              >
                <Card
                  className="relative bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all cursor-pointer overflow-hidden"
                  onClick={() => handleCardClick(peer._id)}
                  role="button"
                  aria-label={`View profile of ${peer.name}`}
                >
                  {peer.studentId && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                      className="absolute top-4 right-4 px-4 py-2 rounded-lg shadow-lg font-semibold text-white bg-gradient-to-r from-green-400 to-green-600"
                    >
                      {peer.studentId}
                    </motion.div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <Image
                        src={peer.profileImage || "/default-profile.png"}
                        alt={peer.name}
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-full object-cover border-4 border-indigo-200 shadow-lg"
                      />
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          {peer.name}
                        </h3>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        className="bg-blue-50 rounded-xl p-4 hover:bg-blue-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <Book className="w-6 h-6 text-indigo-500 shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-600">
                                Subjects:
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {peer.subjects?.length ? (
                                peer.subjects.map((subject, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-indigo-700 bg-indigo-100/30 border border-indigo-200 hover:bg-indigo-100/50 transition-colors"
                                  >
                                    {subject}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-600 text-sm font-medium">
                                  None
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}