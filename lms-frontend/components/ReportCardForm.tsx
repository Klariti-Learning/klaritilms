"use client";

import { useState, useEffect, ChangeEvent, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Star, Calendar, Clock } from "lucide-react";
import { ApiError } from "@/types";

interface ReportCard {
  _id: string;
  studentId: string;
  teacherId: string;
  rating: number;
  comments?: string;
  date?: string;
  createdAt: string;
}

export default function ReportCardForm() {
  const { user, loading: authLoading, deviceId } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comments, setComments] = useState("");
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [studentName, setStudentName] = useState<string>("Student");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [showForm, setShowForm] = useState(true);
  const router = useRouter();
  const params = useParams();
  const studentId = params.studentId as string;

  const handleCommentsChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setComments(e.target.value);
  };

  const handleUnauthorized = useCallback(() => {
    console.debug("[ReportCardForm] Handling unauthorized access");
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
      console.debug(
        "[ReportCardForm] Redirecting due to invalid role or no user",
        {
          user: !!user,
          role: user?.role?.roleName,
          authLoading,
        }
      );
      handleUnauthorized();
    }
  }, [user, authLoading, router, handleUnauthorized]);

  useEffect(() => {
    if (authLoading || !user?._id || !studentId) {
      setFetching(true);
      if (!studentId) {
        console.debug("[ReportCardForm] Invalid studentId", { studentId });
        toast.error("Invalid student ID");
        router.push("/");
      }
      return;
    }

    const fetchStudentDetails = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token || !deviceId) {
          console.debug(
            "[ReportCardForm] Missing token or deviceId in fetchStudentDetails",
            {
              token,
              deviceId,
            }
          );
          handleUnauthorized();
          return;
        }

        const res = await api.get(`/users/students/${studentId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Device-Id": deviceId,
          },
        });
        if (res.data && res.data.name) {
          setStudentName(res.data.name);
        } else {
          throw new Error("Invalid student data received");
        }
      } catch (error) {
        const apiError = error as ApiError;
        console.error(
          "[ReportCardForm] Error fetching student details:",
          apiError
        );
        if (apiError.response?.status === 401) {
          handleUnauthorized();
        } else if (apiError.response?.status === 404) {
          toast.error("Student not found");
          setStudentName("Student");
        } else {
          toast.error(
            apiError.response?.data?.message ||
              "Failed to fetch student details"
          );
        }
      }
    };

    const fetchReportCards = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token || !deviceId) {
          console.debug(
            "[ReportCardForm] Missing token or deviceId in fetchReportCards",
            {
              token,
              deviceId,
            }
          );
          handleUnauthorized();
          return;
        }

        const res = await api.get(`/users/report-cards/${studentId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Device-Id": deviceId,
          },
        });
        if (!Array.isArray(res.data)) {
          throw new Error("Invalid report card data received");
        }
        setReportCards(
          res.data.sort(
            (a: ReportCard, b: ReportCard) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
      } catch (error) {
        const apiError = error as ApiError;
        console.error(
          "[ReportCardForm] Error fetching report cards:",
          apiError
        );
        if (apiError.response?.status === 401) {
          handleUnauthorized();
        } else {
          toast.error(
            apiError.response?.data?.message || "Failed to fetch report cards"
          );
        }
      }
    };

    const fetchData = async () => {
      setFetching(true);
      try {
        await Promise.all([fetchStudentDetails(), fetchReportCards()]);
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [authLoading, user, router, studentId, deviceId, handleUnauthorized]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authLoading) {
      toast.error("Please wait, authentication is not ready");
      return;
    }
    if (rating < 1 || rating > 5) {
      toast.error("Please select a rating between 1 and 5");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token || !deviceId) {
        console.debug(
          "[ReportCardForm] Missing token or deviceId in handleSubmit",
          {
            token,
            deviceId,
          }
        );
        handleUnauthorized();
        return;
      }

      await api.post(
        "/users/report-card",
        {
          studentId,
          rating,
          comments,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Device-Id": deviceId,
          },
        }
      );
      toast.success("Report card submitted successfully");
      const res = await api.get(`/users/report-cards/${studentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Device-Id": deviceId,
        },
      });
      if (!Array.isArray(res.data)) {
        throw new Error("Invalid report card data received");
      }
      setReportCards(
        res.data.sort(
          (a: ReportCard, b: ReportCard) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
      setRating(0);
      setComments("");
      setShowForm(false);
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[ReportCardForm] Error submitting report card:", apiError);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        toast.error(
          apiError.response?.data?.message || "Failed to submit report card"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number, interactive = false) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-8 h-8 cursor-pointer transition-colors duration-200 ${
            interactive
              ? i <= (hoverRating || rating)
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300"
              : i <= rating
              ? "text-yellow-400 fill-yellow-400"
              : "text-gray-300"
          }`}
          onClick={
            interactive
              ? (e) => {
                  e.stopPropagation();
                  setRating(i);
                }
              : undefined
          }
          onMouseEnter={
            interactive
              ? (e) => {
                  e.stopPropagation();
                  setHoverRating(i);
                }
              : undefined
          }
          onMouseLeave={
            interactive
              ? (e) => {
                  e.stopPropagation();
                  setHoverRating(0);
                }
              : undefined
          }
        />
      );
    }
    return <div className="flex space-x-1">{stars}</div>;
  };

  const handleNewReport = () => {
    setShowForm(true);
    setRating(0);
    setComments("");
  };

  const handleViewReports = () => {
    setShowForm(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
    >
      <div className="w-full max-w-3xl p-8">
        <motion.h2
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-extrabold text-center mb-10 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-blue-500 to-purple-600"
        >
          {studentName} Progress Report
        </motion.h2>

        <div className="relative bg-white rounded-3xl p-8 shadow-md">
          {showForm ? (
            <div className="flex flex-col">
              <div className="mt-4 text-right">
                <button
                  onClick={handleViewReports}
                  className="text-sm text-gray-500 hover:text-gray-700 hover:underline transition-colors duration-200 cursor-pointer"
                >
                  See Previous Reports
                </button>
              </div>
              <h3 className="text-2xl text-gray-800 mb-4">Submit New Report</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label
                    htmlFor="rating"
                    className="text-lg font-medium text-gray-700"
                  >
                    Rating
                  </Label>
                  <div className="mt-2">{renderStars(rating, true)}</div>
                </div>
                <div>
                  <Label
                    htmlFor="comments"
                    className="text-lg font-medium text-gray-700"
                  >
                    Comments (Optional)
                  </Label>
                  <textarea
                    id="comments"
                    value={comments}
                    onChange={handleCommentsChange}
                    className="mt-2 h-40 w-full rounded-lg border border-gray-300 bg-white p-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 shadow-sm resize-none"
                    placeholder="Add your feedback here..."
                    maxLength={500}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-full py-3 text-lg font-semibold transition-all duration-200"
                >
                  {loading ? "Submitting..." : "Submit Report"}
                </Button>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl text-gray-800">Previous Reports</h3>
                <Button
                  onClick={handleNewReport}
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-full py-2 px-4 text-md font-semibold transition-all duration-200 cursor-pointer"
                >
                  New Report
                </Button>
              </div>
              {fetching ? (
                <p className="text-gray-600">Loading reports...</p>
              ) : reportCards.length === 0 ? (
                <p className="text-gray-600">
                  No reports found for this student.
                </p>
              ) : (
                reportCards.map((report) => (
                  <div
                    key={report._id}
                    className="bg-gray-50 p-6 rounded-lg shadow-sm"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Calendar className="w-5 h-5 text-indigo-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-600">
                              Date
                            </p>
                            <p className="text-lg font-medium text-gray-800">
                              {report.createdAt
                                ? new Date(
                                    report.createdAt
                                  ).toLocaleDateString()
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Clock className="w-5 h-5 text-indigo-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-600">
                              Time
                            </p>
                            <p className="text-lg font-medium text-gray-800">
                              {report.createdAt
                                ? new Date(report.createdAt).toLocaleTimeString(
                                    [],
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">
                          Rating
                        </p>
                        {renderStars(report.rating)}
                      </div>
                      {report.comments && (
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-2">
                            Comments
                          </p>
                          <p className="text-gray-800 bg-white p-4 rounded-lg shadow-sm">
                            {report.comments}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
