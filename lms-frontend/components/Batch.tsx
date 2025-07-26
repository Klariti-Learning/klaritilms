"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import toast from "react-hot-toast";
import { ApiError, BatchSingle, BatchDetails } from "@/types";
import { Star, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import Loader from "@/components/Loader";
import { CardContent } from "@mui/material";
import Announcements from "./Announcements";
import UpcomingEvents from "./UpcomingEvents";
import GroupChat from "./GroupChat";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import SuspenseFallback from "@/components/SuspenseFallback";

export function BatchContent() {
  const { user, loading: authLoading, deviceId } = useAuth();
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [batch, setBatch] = useState<BatchSingle | null>(null);
  const [batches, setBatches] = useState<BatchDetails[]>([]);
  const searchParams = useSearchParams();

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
      const res = await api.get(`/courses/batches/student`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Device-Id": deviceId,
        },
      });
      setBatches(res.data.batches);
      setBatch(res.data.batches[0]);
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

  const handleBatchBtnClick = (batchId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("batchid", batchId);
    router.push(`?${params.toString()}`);
    console.log(params.get("batchid"));
    return params.get("batchid");
  };

  const fetchBatchDetailById = async (batchId: string) => {
    setBatch(null);
    const current_batchId = handleBatchBtnClick(batchId);
    try {
      const res = await api.get(`/courses/batches/student?batchId=${current_batchId}`);
      setBatch(res.data.batches[0]);
    } catch (e) {
      console.log(e);
      setError("Please Try Again... Error Getting Batch Detail");
    }
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
      className="min-h-screen bg-blue-50 flex items-center justify-center"
    >
      <section className="my-batch-parent-container w-full min-h-dvh max-h-auto relative">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-8 overflow-hidden rounded-2xl bg-[#487CEF] p-6 text-white shadow-xl"
        >
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 bg-white/20 backdrop-blur-sm rounded-lg">
                  <Star className="w-5 h-5 text-yellow-300" />
                </div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  My Batch
                </h1>
              </div>
              <p className="text-blue-100 text-sm md:text-base">
                This is your learning group. Stay connected with your classmates!
              </p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-1 text-blue-100 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm"></div>
            </div>
          </div>
        </motion.div>

        <div className="cards-wrapper w-full grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Card
            className="bg-blue-50 p-1 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-all transform hover:scale-105 overflow-hidden cursor-pointer w-full h-fit flex flex-col justify-between relative"
          >
            <CardContent className="relative flex flex-col justify-between z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-gray-600 font-semibold">
                    Total Students in Batch
                  </h3>
                </div>
                <svg
                  width="43"
                  height="44"
                  viewBox="0 0 43 44"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect y="0.948608" width="42" height="42" rx="5" fill="#005EFF" />
                  <circle cx="35.5" cy="7.44861" r="6.5" fill="#D7E5FD" fillOpacity="0.24" />
                  <path
                    d="M11.5 15.9486L17 13.9486L22.5 15.9486L20 17.4486V18.9486C20 18.9486 19.333 18.4486 17 18.4486C14.667 18.4486 14 18.9486 14 18.9486V17.4486L11.5 15.9486ZM11.5 15.9486V19.9486"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M20 18.4486V19.3376C20 21.0556 18.657 22.4486 17 22.4486C15.343 22.4486 14 21.0556 14 19.3376V18.4486M24.318 20.9786C24.318 20.9786 24.803 20.6256 26.5 20.6256C28.197 20.6256 28.682 20.9776 28.682 20.9776M24.318 20.9786V19.9486L22.5 18.9486L26.5 17.4486L30.5 18.9486L28.682 19.9486V20.9776M24.318 20.9786V21.2666C24.318 21.8453 24.5479 22.4003 24.9571 22.8095C25.3663 23.2187 25.9213 23.4486 26.5 23.4486C27.0787 23.4486 27.6337 23.2187 28.0429 22.8095C28.4521 22.4003 28.682 21.8453 28.682 21.2666V20.9776M25 29.9486H28.705C29.478 29.9486 30.092 29.5726 30.644 29.0466C31.774 27.9706 29.919 27.1106 29.212 26.6896C28.5832 26.3185 27.8851 26.0803 27.1606 25.9896C26.4362 25.899 25.7008 25.9578 25 26.1626M13.385 25.8746C12.442 26.4016 9.969 27.4766 11.475 28.8216C12.211 29.4786 13.03 29.9486 14.061 29.9486H19.939C20.969 29.9486 21.789 29.4786 22.525 28.8216C24.031 27.4766 21.558 26.4016 20.615 25.8746C18.403 24.6396 15.597 24.6396 13.385 25.8746Z"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="flex items-center justify-between">
                <span>{batch?.totalStudents || "0"}</span>
              </div>
            </CardContent>
          </Card>

          <Card
            className="bg-green-50 p-1 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-all transform hover:scale-105 overflow-hidden cursor-pointer w-full h-fit flex flex-col justify-between relative"
          >
            <CardContent className="relative flex flex-col justify-between z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-gray-600 font-semibold">
                    Total Classes Taken
                  </h3>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="42"
                  height="43"
                  viewBox="0 0 42 43"
                  fill="none"
                >
                  <rect y="0.948608" width="42" height="42" rx="5" fill="#00B7B7" />
                  <circle cx="35.5" cy="7.44861" r="6.5" fill="#D7E5FD" fillOpacity="0.24" />
                  <path
                    d="M27 11.9486H15C13.9 11.9486 13 12.8486 13 13.9486V29.9486C13 31.0486 13.9 31.9486 15 31.9486H27C28.1 31.9486 29 31.0486 29 29.9486V13.9486C29 12.8486 28.1 11.9486 27 11.9486ZM15 13.9486H20V21.9486L17.5 20.4486L15 21.9486V13.9486Z"
                    fill="white"
                  />
                </svg>
              </div>
              <div className="flex items-center justify-between">
                <span>{batch?.completedClasses || "0"}/{batch?.totalClasses || "0"}</span>
              </div>
            </CardContent>
          </Card>

          <Card
            className="bg-pink-50 p-1 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-all transform hover:scale-105 overflow-hidden cursor-pointer w-full h-fit flex flex-col justify-between relative"
          >
            <CardContent className="relative flex flex-col justify-between z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-gray-600 font-semibold">
                    Total Lessons Taken
                  </h3>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="42"
                  height="43"
                  viewBox="0 0 42 43"
                  fill="none"
                >
                  <rect y="0.948608" width="42" height="42" rx="5" fill="#FF00C6" />
                  <circle cx="35.5" cy="7.44861" r="6.5" fill="#D7E5FD" fillOpacity="0.24" />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M19 12.9486C19.6667 12.9486 20.3333 13.2019 21 13.7086C21.6667 13.2019 22.3333 12.9486 23 12.9486H29C29.5304 12.9486 30.0391 13.1593 30.4142 13.5344C30.7893 13.9095 31 14.4182 31 14.9486V27.9486C31 28.479 30.7893 28.9877 30.4142 29.3628C30.0391 29.7379 29.5304 29.9486 29 29.9486H22C22 30.5006 21.55 30.9486 21 30.9486C20.45 30.9486 20 30.4986 20 29.9486H13C12.4696 29.9486 11.9609 29.7379 11.5858 29.3628C11.2107 28.9877 11 28.479 11 27.9486V14.9486C11 14.4182 11.2107 13.9095 11.5858 13.5344C11.9609 13.1593 12.4696 12.9486 13 12.9486H19ZM19 14.9486H13V27.9486H20V15.9486C20 15.3986 19.55 14.9486 19 14.9486ZM29 14.9486H23C22.45 14.9486 22 15.3986 22 15.9486V27.9486H29V14.9486Z"
                    fill="white"
                  />
                </svg>
              </div>
              <div className="flex items-center justify-between">
                <strong>{batch?.completedLessons || "0"}/{batch?.totalLessons || "0"}</strong>
              </div>
            </CardContent>
          </Card>

          <Card
            className="bg-yellow-50 p-1 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-all transform hover:scale-105 overflow-hidden cursor-pointer w-full h-fit flex flex-col justify-between relative"
          >
            <CardContent className="relative flex flex-col justify-between z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-gray-600 font-semibold">
                    Total Hours Spent
                  </h3>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="43"
                  height="44"
                  viewBox="0 0 43 44"
                  fill="none"
                >
                  <rect y="0.948608" width="42" height="42" rx="5" fill="#E4B200" />
                  <circle cx="35.5" cy="7.44861" r="6.5" fill="#D7E5FD" fillOpacity="0.24" />
                  <path
                    d="M26 13.2886C27.5083 14.1595 28.7629 15.4091 29.6398 16.9139C30.5167 18.4187 30.9854 20.1264 30.9994 21.868C31.0135 23.6095 30.5725 25.3246 29.72 26.8433C28.8676 28.3621 27.6332 29.6318 26.1392 30.5269C24.6452 31.422 22.9434 31.9114 21.2021 31.9467C19.4608 31.9819 17.7406 31.5618 16.2116 30.7279C14.6826 29.8939 13.3979 28.6751 12.4847 27.1921C11.5715 25.7091 11.0614 24.0133 11.005 22.2726L11 21.9486L11.005 21.6246C11.061 19.8976 11.5635 18.2146 12.4636 16.7396C13.3637 15.2646 14.6307 14.0481 16.1409 13.2085C17.6511 12.3689 19.3531 11.935 21.081 11.9491C22.8089 11.9631 24.5036 12.4246 26 13.2886ZM21 15.9486C20.7551 15.9487 20.5187 16.0386 20.3356 16.2013C20.1526 16.3641 20.0357 16.5884 20.007 16.8316L20 16.9486V21.9486L20.009 22.0796C20.0318 22.2531 20.0997 22.4176 20.206 22.5566L20.293 22.6566L23.293 25.6566L23.387 25.7386C23.5624 25.8747 23.778 25.9485 24 25.9485C24.222 25.9485 24.4376 25.8747 24.613 25.7386L24.707 25.6556L24.79 25.5616C24.9261 25.3862 24.9999 25.1706 24.9999 24.9486C24.9999 24.7267 24.9261 24.511 24.79 24.3356L24.707 24.2416L22 21.5336V16.9486L21.993 16.8316C21.9643 16.5884 21.8474 16.3641 21.6644 16.2013C21.4813 16.0386 21.2449 15.9487 21 15.9486Z"
                    fill="white"
                  />
                </svg>
              </div>
              <div className="flex items-center justify-between">
                <span>{batch?.completedHours || "0"}/{batch?.totalHours || "0"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
        {batches.length > 0 &&
          <Tabs value={batch?._id} onValueChange={(value) => fetchBatchDetailById(value)} className="my-4">
            <TabsList className="flex gap-4 bg-white rounded-lg shadow-lg px-4 py-8 w-fit">
              {batches?.map((eachbatch) => (
                <TabsTrigger
                  key={eachbatch._id}
                  value={eachbatch._id}
                  className={`px-4 py-4 rounded-lg shadow ${batch?._id === eachbatch._id ? "bg-[#487CEF] text-white" : "hover:bg-blue-50 hover:scale-105 bg-white text-black shadow-md"
                    }`}
                >
                  {eachbatch.courseTitle[0].toUpperCase()}{eachbatch.courseTitle.slice(1)} Batch
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }

        <div className="batchstudents-announcements grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 col-span-2 shadow-md rounded-lg">
            <div className="batch-student-card-header flex items-center gap-x-5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="42"
                height="43"
                viewBox="0 0 42 43"
                fill="none"
              >
                <rect y="0.627991" width="42" height="42" rx="5" fill="#005EFF" />
                <ellipse cx="35.5" cy="6.9336" rx="6.5" ry="6.30561" fill="#D7E5FD" fillOpacity="0.24" />
                <path
                  d="M20.25 21C21.6424 21 22.9777 20.4469 23.9623 19.4623C24.9469 18.4777 25.5 17.1424 25.5 15.75C25.5 14.3576 24.9469 13.0223 23.9623 12.0377C22.9777 11.0531 21.6424 10.5 20.25 10.5C18.8576 10.5 17.5223 11.0531 16.5377 12.0377C15.5531 13.0223 15 14.3576 15 15.75C15 17.1424 15.5531 18.4777 16.5377 19.4623C17.5223 20.4469 18.8576 21 20.25 21ZM13.875 22.5C13.1788 22.5 12.5111 22.7766 12.0188 23.2688C11.5266 23.7611 11.25 24.4288 11.25 25.125V25.5C11.25 27.2948 12.3923 28.8127 14.0138 29.8447C15.6442 30.8827 17.8515 31.5 20.25 31.5C20.809 31.4995 21.3552 31.467 21.8888 31.4025C21.1394 30.7695 20.5373 29.9803 20.1247 29.0904C19.7121 28.2004 19.4989 27.231 19.5 26.25C19.5 24.8625 19.9185 23.5725 20.637 22.5H13.875ZM31.875 26.25C31.875 27.7418 31.2824 29.1726 30.2275 30.2275C29.1726 31.2824 27.7418 31.875 26.25 31.875C24.7582 31.875 23.3274 31.2824 22.2725 30.2275C21.2176 29.1726 20.625 27.7418 20.625 26.25C20.625 24.7582 21.2176 23.3274 22.2725 22.2725C23.3274 21.2176 24.7582 20.625 26.25 20.625C27.7418 20.625 29.1726 21.2176 30.2275 22.2725C31.2824 23.3274 31.875 24.7582 31.875 26.25ZM25.716 22.6035L25.011 24.7245H22.7655C22.2172 24.7245 21.993 25.428 22.44 25.7452L24.2445 27.0255L23.5477 29.1195C23.3767 29.6348 23.964 30.0697 24.4072 29.7555L26.25 28.4482L28.0928 29.7555C28.536 30.0705 29.1233 29.6355 28.9523 29.1195L28.2547 27.0255L30.06 25.7452C30.5077 25.428 30.2827 24.7245 29.7345 24.7245H27.489L26.784 22.6035C26.613 22.0905 25.887 22.0905 25.716 22.6035Z"
                  fill="white"
                />
              </svg>
              <div>
                <h3 className="text-xl font-semibold text-[#1447E6]">Batch Students</h3>
                <p className="text-md text-[#868484]">Together as one span batch.</p>
              </div>
            </div>
            {batch ? (
              <div className="border-[2px] border-gray-300 rounded-lg mt-4">
                <div className="table-header flex border-gray-300 justify-between pl-10 px-6 border-b-2 p-4 font-bold">
                  <h3>Name</h3>
                  <h3>Attendance</h3>
                </div>
                <ul className="student-list py-4 pl-4 pr-10">
                  {batch?.allStudentsAttendance?.map((student, index) => {
                    return (
                      <li
                        className={`${index + 1 === batch?.allStudentsAttendance?.length ? "border-b-[0px]" : "border-b-[1px]"} border-gray-300`}
                        key={student.studentId}
                      >
                        <div className="list-data flex justify-between pb-4 pt-4">
                          <div className="flex items-center gap-2 pl-4">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="39"
                              height="39"
                              viewBox="0 0 39 39"
                              fill="none"
                            >
                              <rect x="0.5" y="1.5" width="35" height="35" rx="17.5" fill="white" />
                              <rect x="0.5" y="1.5" width="35" height="35" rx="17.5" stroke="#C3C3C3" />
                              <path
                                d="M18 19C18.9518 19 19.8823 18.7178 20.6737 18.1889C21.4651 17.6601 22.0819 16.9085 22.4462 16.0292C22.8104 15.1498 22.9057 14.1822 22.72 13.2486C22.5343 12.3151 22.076 11.4576 21.403 10.7846C20.7299 10.1115 19.8724 9.65316 18.9389 9.46747C18.0053 9.28178 17.0377 9.37709 16.1583 9.74133C15.279 10.1056 14.5274 10.7224 13.9986 11.5138C13.4697 12.3052 13.1875 13.2357 13.1875 14.1875C13.1875 15.4639 13.6945 16.6879 14.597 17.5905C15.4996 18.493 16.7236 19 18 19ZM18 20.375C15.0171 20.375 9.0625 22.2175 9.0625 25.875V28.625H26.9375V25.875C26.9375 22.2175 20.9829 20.375 18 20.375Z"
                                fill="#2688FF"
                              />
                              <g clipPath="url(#clip0_500_2305)">
                                <path
                                  d="M29 23C24.5817 23 21 26.5817 21 31C21 35.4183 24.5817 39 29 39C33.4183 39 37 35.4183 37 31C37 26.5817 33.4183 23 29 23ZM29.0527 25.7988L30.3135 29.7353L34.4453 29.8281L31.0908 32.2422L32.2793 36.2012L28.9463 33.7568L25.5488 36.1113L26.8437 32.1855L23.5547 29.6816L27.6885 29.7002L29.0527 25.7988Z"
                                  fill="#F4B33B"
                                />
                              </g>
                              <defs>
                                <clipPath id="clip0_500_2305">
                                  <rect width="16" height="16" fill="white" transform="translate(21 23)" />
                                </clipPath>
                              </defs>
                            </svg>
                            <h6 className="font-semibold">{student?.name}</h6>
                          </div>
                          <h6 className="pr-4">{student?.attendancePercentage}</h6>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div className="text-gray-500 font-semibold text-center">
                There is no batch to display
              </div>
            )}
          </div>

          <div className="bg-white col-span-1 lg:col-span-3 shadow-md rounded-lg announcements">
            <Announcements />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 mt-6 gap-6">
          <div className="col-span-2">
            <UpcomingEvents batchId={batch?._id} />
          </div>
          <div className="col-span-2">
            <GroupChat />
          </div>
        </div>

        {batch === null && (
          <div className="fixed inset-0 bg-white/70 backdrop-blur-sm flex justify-center items-center">
            <div className="text-2xl font-medium">
              <Loader />
            </div>
          </div>
        )}
      </section>
    </motion.div>
  );
}

export default function Batch() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <BatchContent />
    </Suspense>
  );
}
