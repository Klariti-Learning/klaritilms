"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import toast from "react-hot-toast";
import Image from "next/image";
import {
  User,
  Mail,
  Book,
  Calendar,
  Heart,
  Star,
  Phone,
  Crown,
} from "lucide-react";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Loader from "@/components/Loader";
import { ApiError } from "@/types";

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role?: { roleName: string };
  profileImage?: string | null;
  subjects?: string[];
  employeeId?: string;
  studentId?: string;
  gender?: string;
  joinDate?: string;
  profile?: {
    bio?: string;
    about?: string;
    hobbies?: string[];
    skills?: string[];
    accomplishments?: string[];
    qualifications?: string;
  };
}

export default function UserProfile() {
  const { user, loading: authLoading } = useAuth();
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const handleUnauthorized = useCallback(() => {
    console.debug("[UserProfile] Handling unauthorized access");
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("deviceId");
    toast.error("Session expired. Please log in again.");
    router.push("/login");
  }, [router]);

  const fetchUser = useCallback(async () => {
    if (!user) {
      handleUnauthorized();
      return;
    }
    try {
      const deviceId = localStorage.getItem("deviceId");
      const token = localStorage.getItem("token");
      if (!deviceId || !token) {
        console.debug("[UserProfile] Missing deviceId or token", {
          deviceId,
          token,
        });
        handleUnauthorized();
        return;
      }
      const res = await api.get(`/admin/users/${userId}`, {
        headers: {
          "Device-Id": deviceId,
          Authorization: `Bearer ${token}`,
        },
      });
      setUserData(res.data.user);
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[UserProfile] Failed to fetch user data:", apiError);
      const errorMessage =
        apiError.response?.data?.message || "Failed to fetch user data";
      toast.error(errorMessage);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        const errorMessage =
          apiError.response?.data?.message || "Failed to fetch user data";
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized, user, userId]);

  useEffect(() => {
    if (authLoading) return;

    if (
      !user ||
      !["Admin", "Super Admin"].includes(user.role?.roleName || "")
    ) {
      console.debug(
        "[UserProfile] Redirecting due to invalid role or no user",
        {
          user: !!user,
          role: user?.role?.roleName,
          authLoading,
        }
      );
      handleUnauthorized();
      router.push("/my-learnings");
      return;
    }
    fetchUser();
  }, [user, router, userId, handleUnauthorized, fetchUser, authLoading]);

  const getProfileImage = (user: UserProfile): string => {
    if (user.profileImage) {
      return user.profileImage;
    }
    if (user.gender) {
      if (user.gender.toLowerCase() === "male") {
        return "https://res.cloudinary.com/dlie87ah0/image/upload/v1746686671/male_nwqqzv.jpg";
      }
      if (user.gender.toLowerCase() === "female") {
        return "https://res.cloudinary.com/dlie87ah0/image/upload/v1746686670/small_f1yzjb.png";
      }
    }
    return "https://res.cloudinary.com/dlie87ah0/image/upload/v1746686670/neutral_profile_g7zqmx.png";
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

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-gray-100">
        <p className="text-gray-600 text-lg">User not found</p>
      </div>
    );
  }

  const getBadgeStyles = (roleName: string) => {
    switch (roleName) {
      case "Admin":
        return "bg-gradient-to-r from-blue-400 to-blue-600";
      case "Super Admin":
        return "bg-gradient-to-r from-purple-500 to-purple-700";
      case "Teacher":
        return "bg-gradient-to-r from-orange-400 to-orange-600";
      case "Student":
        return "bg-gradient-to-r from-green-400 to-green-600";
      default:
        return "bg-gradient-to-r from-amber-400 to-amber-600";
    }
  };

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
        aria-label="User profile"
        style={{
          boxShadow:
            "0 15px 40px rgba(0, 0, 0, 0.1), 0 5px 15px rgba(0, 0, 0, 0.05)",
        }}
      >
        {(userData.employeeId || userData.studentId) && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className={`absolute top-4 right-4 px-4 py-2 rounded-lg shadow-lg font-semibold text-white ${getBadgeStyles(
              userData.role?.roleName || ""
            )}`}
          >
            {userData.employeeId &&
            ["Admin", "Super Admin"].includes(userData.role?.roleName || "") ? (
              <div className="flex items-center gap-2">
                <span>{userData.employeeId}</span>
                <Crown className="w-5 h-5 text-yellow-300" />
              </div>
            ) : (
              userData.employeeId || userData.studentId
            )}
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
              src={getProfileImage(userData)}
              alt={userData.name || "User"}
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
              {userData.role?.roleName === "Student"
                ? "Academic Info"
                : "Professional Info"}
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
                    {userData.name}
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
                    {userData.email || "Not set"}
                  </p>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="flex items-center bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
              >
                <Phone className="w-6 h-6 text-indigo-500" />
                <div className="flex-1 ml-4">
                  <p className="text-sm font-medium text-gray-600">Phone</p>
                  <p className="mt-1 text-gray-800 text-lg font-medium">
                    {userData.phone || "Not set"}
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
                  <p className="text-sm font-medium text-gray-600">Gender</p>
                  <p className="mt-1 text-gray-800 text-lg font-medium">
                    {userData.gender || "Not set"}
                  </p>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="flex items-center bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
              >
                <User className="w-6 h-6 text-indigo-500" />
                <div className="flex-1 ml-4">
                  <p className="text-sm font-medium text-gray-600">Role</p>
                  <p className="mt-1 text-gray-800 text-lg font-medium">
                    {userData.role?.roleName || "Not assigned"}
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
                    {userData.subjects?.join(", ") || "Not set"}
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
                    {userData.joinDate
                      ? new Date(userData.joinDate).toLocaleDateString()
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
                    {userData.profile?.qualifications || "Not set"}
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
                    {userData.profile?.bio || "Not set"}
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
                    {userData.profile?.about || "Not set"}
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
                    {userData.profile?.hobbies?.join(", ") || "Not set"}
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
                    {userData.profile?.skills?.join(", ") || "Not set"}
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
                    {userData.profile?.accomplishments?.join(", ") || "Not set"}
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
