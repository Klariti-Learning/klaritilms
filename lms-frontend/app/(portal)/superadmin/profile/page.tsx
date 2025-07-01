"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Pencil,
  User,
  Mail,
  Phone,
  MapPin,
  Book,
  Award,
  Star,
  Heart,
  Check,
  X,
  Briefcase,
  Bolt,
  Crown,
} from "lucide-react";
import profile from "../../../../public/Assests/small.png";
import api from "@/lib/api";
import { ApiError, UserDetails } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/lib/UserContext";
import toast from "react-hot-toast";
import Loader from "@/components/Loader";

export default function SuperAdminProfile() {
  const { user, loading: authLoading, deviceId } = useAuth();
  const { userDetails, setUserDetails } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserDetails | null>(null);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [userLoading, setUserLoading] = useState(true);
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const [animatedPieData, setAnimatedPieData] = useState([
    { name: "Completed", value: 0 },
    { name: "Remaining", value: 100 },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingHobbies, setPendingHobbies] = useState<string[]>([]);
  const [pendingSkills, setPendingSkills] = useState<string[]>([]);
  const [pendingAccomplishments, setPendingAccomplishments] = useState<
    string[]
  >([]);
  const [pendingQualifications, setPendingQualifications] = useState<string[]>(
    []
  );
  const [pendingExperience, setPendingExperience] = useState<
    { title: string; institution: string; duration: string }[]
  >([]);
  const [experienceErrors, setExperienceErrors] = useState<
    { title: string; institution: string; duration: string }[]
  >([]);
  const [errors, setErrors] = useState<{ [key: string]: string[] }>({
    hobbies: [],
    skills: [],
    accomplishments: [],
    qualifications: [],
  });
  const router = useRouter();

  const handleUnauthorized = useCallback(() => {
  console.debug("[SuperAdminProfile] Handling unauthorized access");
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("deviceId");
  setErrors({
    ...errors,
    auth: ["Session expired. Please log in again."],
  });
  toast.error("Session expired. Please log in again.");
  router.push("/login");
}, [router, errors]);

  useEffect(() => {
    const fetchUserDetails = async () => {
      setUserLoading(true);
      try {
        const token = localStorage.getItem("token");
      if (!token || !deviceId) {
        console.debug("[SuperAdminProfile] Missing token or deviceId", { token, deviceId });
        handleUnauthorized();
        return;
      }
        const response = await api.get("/auth/me", {
          headers: { "Device-Id": deviceId },
        });
        setUserDetails(response.data.user);
        setUserLoading(false);
      } catch (error) {
      const apiError = error as ApiError;
      console.error("[SuperAdminProfile] Error fetching user details:", apiError);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        toast.error(apiError.response?.data?.message || "Failed to fetch user details");
        setErrors({
          ...errors,
          fetch: [apiError.response?.data?.message || "Failed to fetch user details"],
        });
      }
    } finally {
      setUserLoading(false);
    }
  };

    if (user && deviceId) {
      fetchUserDetails();
    }
  }, [user, deviceId, setUserDetails, handleUnauthorized, errors]);

  const calculateCompletion = (details: UserDetails | null) => {
    if (!details) return 0;
    const fields = [
      details.name,
      details.email,
      details.phone,
      details.gender,
      details.role?.roleName,
      details.address,
      details.profileImage,
      details.profile?.bio,
      details.profile?.hobbies?.length ? details.profile.hobbies : null,
      details.profile?.skills?.length ? details.profile.skills : null,
      details.profile?.about,
      details.profile?.accomplishments?.length
        ? details.profile.accomplishments
        : null,
      details.profile?.qualifications?.length
        ? details.profile.qualifications
        : null,
      details.profile?.experience?.length ? details.profile.experience : null,
      details.joinDate,
    ];
    const totalFields = fields.length;
    const filledFields = fields.filter(
      (field) => field != null && field !== ""
    ).length;
    return Math.round((filledFields / totalFields) * 100);
  };

  const completionPercentage = calculateCompletion(formData);

  useEffect(() => {
    let start = 0;
    const duration = 1200;
    let startTime: number | null = null;

    const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuint(progress);

      start = easedProgress * completionPercentage;
      const currentPercentage = Math.round(start);

      setAnimatedPercentage(currentPercentage);
      setAnimatedPieData([
        { name: "Completed", value: currentPercentage },
        { name: "Remaining", value: 100 - currentPercentage },
      ]);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [completionPercentage]);

  const getPieColor = (percentage: number) => {
    if (percentage < 25) return ["#EF4444", "#E5E7EB"];
    if (percentage < 50) return ["#FBBF24", "#E5E7EB"];
    if (percentage < 75) return ["#F97316", "#E5E7EB"];
    return ["#10B981", "#E5E7EB"];
  };

  const COLORS = getPieColor(animatedPercentage);

useEffect(() => {
  if (authLoading) return;
  if (!user || !["Admin", "Super Admin"].includes(user.role?.roleName || "")) {
    console.debug("[SuperAdminProfile] Redirecting due to invalid role or no user", {
      user: !!user,
      role: user?.role?.roleName,
      authLoading,
    });
    handleUnauthorized();
    return;
  }
}, [user, authLoading, handleUnauthorized, router]);

  useEffect(() => {
    if (userDetails) {
      setFormData({
        ...userDetails,
        role: userDetails.role || { roleName: "Super Admin" },
        profile: userDetails.profile || {
          bio: "",
          hobbies: [],
          skills: [],
          about: "",
          accomplishments: [],
          qualifications: [],
          enrollmentStatus: "Active",
          experience: [],
        },
      });
      setPreviewImage(userDetails.profileImage || null);
    }
  }, [userDetails]);

  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      setIsScrolling(true);
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => setIsScrolling(false), 1000);
    };

    const container = document.querySelector(".scroll-container");
    if (container) container.addEventListener("scroll", handleScroll);

    return () => {
      if (container) container.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!["image/jpeg", "image/png"].includes(file.type)) {
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        return;
      }
      setProfileImage(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: keyof UserDetails,
    subField?: keyof UserDetails["profile"]
  ) => {
    const { value } = e.target;
    setFormData((prev) => {
      if (!prev) return prev;
      if (subField) {
        return {
          ...prev,
          profile: { ...prev.profile, [subField]: value },
        };
      }
      return { ...prev, [field]: value };
    });
  };

  const handleArrayChange = (
    field: keyof UserDetails | keyof UserDetails["profile"],
    index: number,
    value: string,
    subField?: keyof UserDetails["profile"],
    isPending?: boolean
  ) => {
    if (isPending) {
      if (subField === "hobbies") {
        setPendingHobbies((prev) => {
          const updated = [...prev];
          updated[index] = value;
          return updated;
        });
        setErrors((prev) => ({
          ...prev,
          hobbies: prev.hobbies.map((err, i) => (i === index ? "" : err)),
        }));
      } else if (subField === "skills") {
        setPendingSkills((prev) => {
          const updated = [...prev];
          updated[index] = value;
          return updated;
        });
        setErrors((prev) => ({
          ...prev,
          skills: prev.skills.map((err, i) => (i === index ? "" : err)),
        }));
      } else if (subField === "accomplishments") {
        setPendingAccomplishments((prev) => {
          const updated = [...prev];
          updated[index] = value;
          return updated;
        });
        setErrors((prev) => ({
          ...prev,
          accomplishments: prev.accomplishments.map((err, i) =>
            i === index ? "" : err
          ),
        }));
      } else if (subField === "qualifications") {
        setPendingQualifications((prev) => {
          const updated = [...prev];
          updated[index] = value;
          return updated;
        });
        setErrors((prev) => ({
          ...prev,
          qualifications: prev.qualifications.map((err, i) =>
            i === index ? "" : err
          ),
        }));
      }
    } else {
      setFormData((prev) => {
        if (!prev) return prev;
        if (subField) {
          const updatedArray = [
            ...((prev.profile[subField] as string[]) || []),
          ];
          updatedArray[index] = value;
          return {
            ...prev,
            profile: { ...prev.profile, [subField]: updatedArray },
          };
        }
        const updatedArray = [...((prev[field] as string[]) || [])];
        updatedArray[index] = value;
        return { ...prev, [field]: updatedArray };
      });
    }
  };

  const handleExperienceChange = (
    index: number,
    key: keyof UserDetails["profile"]["experience"][number],
    value: string,
    isPending: boolean = false
  ) => {
    if (isPending) {
      setPendingExperience((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [key]: value };
        return updated;
      });
      setExperienceErrors((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [key]: "" };
        return updated;
      });
    } else {
      setFormData((prev) => {
        if (!prev) return prev;
        const updatedExperience = prev.profile.experience
          ? [...prev.profile.experience]
          : [];
        updatedExperience[index] = {
          ...updatedExperience[index],
          [key]: value,
        };
        return {
          ...prev,
          profile: { ...prev.profile, experience: updatedExperience },
        };
      });
    }
  };

  const addArrayItem = (
    field: keyof UserDetails | keyof UserDetails["profile"],
    subField?: keyof UserDetails["profile"]
  ) => {
    if (subField === "hobbies") {
      setPendingHobbies((prev) => [...prev, ""]);
      setErrors((prev) => ({ ...prev, hobbies: [...prev.hobbies, ""] }));
    } else if (subField === "skills") {
      setPendingSkills((prev) => [...prev, ""]);
      setErrors((prev) => ({ ...prev, skills: [...prev.skills, ""] }));
    } else if (subField === "accomplishments") {
      setPendingAccomplishments((prev) => [...prev, ""]);
      setErrors((prev) => ({
        ...prev,
        accomplishments: [...prev.accomplishments, ""],
      }));
    } else if (subField === "qualifications") {
      setPendingQualifications((prev) => [...prev, ""]);
      setErrors((prev) => ({
        ...prev,
        qualifications: [...prev.qualifications, ""],
      }));
    }
  };

  const addExperienceItem = () => {
    setPendingExperience((prev) => [
      ...prev,
      { title: "", institution: "", duration: "" },
    ]);
    setExperienceErrors((prev) => [
      ...prev,
      { title: "", institution: "", duration: "" },
    ]);
  };

  const confirmArrayItem = (
    field: keyof UserDetails["profile"],
    index: number,
    subField: keyof UserDetails["profile"]
  ) => {
    const value = (
      subField === "hobbies"
        ? pendingHobbies
        : subField === "skills"
        ? pendingSkills
        : subField === "accomplishments"
        ? pendingAccomplishments
        : pendingQualifications
    )[index];

    if (!value.trim()) {
      setErrors((prev) => ({
        ...prev,
        [subField]: prev[subField].map((err, i) =>
          i === index ? "Please enter a valid value." : err
        ),
      }));
      return;
    }

    setFormData((prev) => {
      if (!prev) return prev;
      const updatedArray = [
        ...((prev.profile[subField] as string[]) || []),
        value,
      ];
      return {
        ...prev,
        profile: { ...prev.profile, [subField]: updatedArray },
      };
    });

    if (subField === "hobbies") {
      setPendingHobbies((prev) => prev.filter((_, i) => i !== index));
      setErrors((prev) => ({
        ...prev,
        hobbies: prev.hobbies.filter((_, i) => i !== index),
      }));
    } else if (subField === "skills") {
      setPendingSkills((prev) => prev.filter((_, i) => i !== index));
      setErrors((prev) => ({
        ...prev,
        skills: prev.skills.filter((_, i) => i !== index),
      }));
    } else if (subField === "accomplishments") {
      setPendingAccomplishments((prev) => prev.filter((_, i) => i !== index));
      setErrors((prev) => ({
        ...prev,
        accomplishments: prev.accomplishments.filter((_, i) => i !== index),
      }));
    } else if (subField === "qualifications") {
      setPendingQualifications((prev) => prev.filter((_, i) => i !== index));
      setErrors((prev) => ({
        ...prev,
        qualifications: prev.qualifications.filter((_, i) => i !== index),
      }));
    }
  };

  const cancelArrayItem = (
    field: keyof UserDetails["profile"],
    index: number,
    subField: keyof UserDetails["profile"]
  ) => {
    if (subField === "hobbies") {
      setPendingHobbies((prev) => prev.filter((_, i) => i !== index));
      setErrors((prev) => ({
        ...prev,
        hobbies: prev.hobbies.filter((_, i) => i !== index),
      }));
    } else if (subField === "skills") {
      setPendingSkills((prev) => prev.filter((_, i) => i !== index));
      setErrors((prev) => ({
        ...prev,
        skills: prev.skills.filter((_, i) => i !== index),
      }));
    } else if (subField === "accomplishments") {
      setPendingAccomplishments((prev) => prev.filter((_, i) => i !== index));
      setErrors((prev) => ({
        ...prev,
        accomplishments: prev.accomplishments.filter((_, i) => i !== index),
      }));
    } else if (subField === "qualifications") {
      setPendingQualifications((prev) => prev.filter((_, i) => i !== index));
      setErrors((prev) => ({
        ...prev,
        qualifications: prev.qualifications.filter((_, i) => i !== index),
      }));
    }
  };

  const confirmExperienceItem = (index: number) => {
    const experience = pendingExperience[index];
    if (
      !experience.title.trim() ||
      !experience.institution.trim() ||
      !experience.duration.trim()
    ) {
      setExperienceErrors((prev) => {
        const updated = [...prev];
        updated[index] = {
          title: experience.title.trim() ? "" : "Please enter a valid title.",
          institution: experience.institution.trim()
            ? ""
            : "Please enter a valid institution.",
          duration: experience.duration.trim()
            ? ""
            : "Please enter a valid duration.",
        };
        return updated;
      });
      return;
    }

    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        profile: {
          ...prev.profile,
          experience: [...(prev.profile.experience || []), experience],
        },
      };
    });
    setPendingExperience((prev) => prev.filter((_, i) => i !== index));
    setExperienceErrors((prev) => prev.filter((_, i) => i !== index));
  };

  const cancelExperienceItem = (index: number) => {
    setPendingExperience((prev) => prev.filter((_, i) => i !== index));
    setExperienceErrors((prev) => prev.filter((_, i) => i !== index));
  };

  const removeArrayItem = (
    field: keyof UserDetails | keyof UserDetails["profile"],
    index: number,
    subField?: keyof UserDetails["profile"]
  ) => {
    setFormData((prev) => {
      if (!prev) return prev;
      if (subField) {
        const updatedArray = [...((prev.profile[subField] as string[]) || [])];
        updatedArray.splice(index, 1);
        return {
          ...prev,
          profile: { ...prev.profile, [subField]: updatedArray },
        };
      }
      const updatedArray = [...((prev[field] as string[]) || [])];
      updatedArray.splice(index, 1);
      return { ...prev, [field]: updatedArray };
    });
  };

  const removeExperienceItem = (index: number) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const updatedExperience = prev.profile.experience
        ? [...prev.profile.experience]
        : [];
      updatedExperience.splice(index, 1);
      return {
        ...prev,
        profile: { ...prev.profile, experience: updatedExperience },
      };
    });
  };

  const handleSave = async () => {
    if (!formData) return;
    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !formData.gender
    ) {
      toast.error("Please fill all required fields");
      return;
    }
    if (
      pendingHobbies.length > 0 ||
      pendingSkills.length > 0 ||
      pendingAccomplishments.length > 0 ||
      pendingQualifications.length > 0 ||
      pendingExperience.length > 0
    ) {
      toast.error("Please confirm or cancel all pending items");
      return;
    }
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      toast.error("Please fix form errors");
      return;
    }
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
    if (!token || !deviceId) {
      console.debug("[SuperAdminProfile] Missing token or deviceId for save", { token, deviceId });
      handleUnauthorized();
      return;
    }

      const updatedFormData = {
        ...formData,
        role: {
          roleName:
            userDetails?.role?.roleName || formData.role?.roleName || "Super Admin",
        },
      };
      const response = await api.put("/auth/update", updatedFormData, {
        headers: { "Device-Id": deviceId },
      });
      let updatedUser: UserDetails = response.data.user;
      updatedUser = {
        ...updatedUser,
        role: {
          roleName:
            userDetails?.role?.roleName ||
            formData.role?.roleName ||
            (typeof updatedUser.role === "object" &&
              updatedUser.role?.roleName) ||
            "Super Admin",
        },
      };
      if (profileImage) {
        const formDataImage = new FormData();
        formDataImage.append("profileImage", profileImage);
        const imageResponse = await api.post(
          "/auth/update-image",
          formDataImage,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              "Device-Id": deviceId,
            },
          }
        );
        updatedUser = {
          ...updatedUser,
          profileImage: imageResponse.data.profileImage,
        };
      }
      setUserDetails(updatedUser);
      setPreviewImage(updatedUser.profileImage || null);
      setIsEditing(false);
      toast.success("Profile updated successfully");
    } catch (error) {
    const apiError = error as ApiError;
    console.error("[SuperAdminProfile] Error updating profile:", apiError);
    if (apiError.response?.status === 401) {
      handleUnauthorized();
    } else {
      toast.error(apiError.response?.data?.message || "Failed to update profile");
      setErrors({
        ...errors,
        submit: [apiError.response?.data?.message || "Failed to update profile"],
      });
    }
  } finally {
    setIsSaving(false);
  }
};

  const validateForm = (data: UserDetails) => {
    const errors: { [key: string]: string } = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = "Invalid email format";
    }
    if (!/^\+\d{10,15}$/.test(data.phone)) {
      errors.phone = "Invalid phone number format";
    }
    return errors;
  };

  if (authLoading || userLoading) {
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

  if (!userDetails || !formData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">
          Unable to load profile details. Please try logging in again.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
    >
      <div
        className={`relative w-full max-w-3xl rounded-3xl p-6 sm:p-8 overflow-y-auto max-h-[80vh] scroll-container transition-all duration-300 ease-in-out transform hover:scale-[1.01] ${
          isEditing
            ? "bg-gradient-to-br from-indigo-100 to-blue-100 border-2 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
            : "bg-white shadow-xl"
        }`}
        style={{
          boxShadow: isEditing
            ? ""
            : "0 15px 40px rgba(0, 0, 0, 0.1), 0 5px 15px rgba(0, 0, 0, 0.05)",
          scrollbarWidth: "thin",
          scrollbarColor: `${
            isScrolling
              ? "rgba(99, 102, 241, 0.5) transparent"
              : "transparent transparent"
          }`,
        }}
      >
        <style jsx>{`
          .scroll-container::-webkit-scrollbar {
            width: ${isScrolling ? "6px" : "0px"};
            transition: width 0.3s ease;
          }
          .scroll-container::-webkit-scrollbar-track {
            background: transparent;
          }
          .scroll-container::-webkit-scrollbar-thumb {
            background: ${isScrolling
              ? "rgba(99, 102, 241, 0.5)"
              : "transparent"};
            border-radius: 10px;
            transition: background 0.3s ease;
          }
          .scroll-container::-webkit-scrollbar-thumb:hover {
            background: rgba(99, 102, 241, 0.8);
          }
        `}</style>
        {userDetails.employeeId && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className={`absolute top-4 right-4 px-4 py-2 rounded-lg shadow-lg font-semibold text-white flex items-center gap-2 ${
              isEditing
                ? "bg-gradient-to-r from-yellow-600 to-amber-600"
                : "bg-gradient-to-r from-yellow-500 to-amber-500"
            }`}
          >
            <Crown className="w-5 h-5" />
            {userDetails.employeeId}
          </motion.div>
        )}
        <h1
          className={`text-3xl sm:text-4xl font-extrabold text-center mb-8 bg-clip-text text-transparent ${
            isEditing
              ? "bg-gradient-to-r from-indigo-700 to-blue-600"
              : "bg-gradient-to-r from-indigo-600 to-blue-500"
          }`}
        >
         Super Admin Profile
        </h1>
        <div className="flex flex-col sm:flex-row items-center justify-evenly mb-8 gap-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative group"
          >
            <Image
              src={previewImage || userDetails.profileImage || profile}
              alt="Profile"
              className={`w-32 h-32 rounded-full object-cover transition-all duration-300 ${
                isEditing
                  ? "border-4 border-white shadow-lg group-hover:ring-4 group-hover:ring-indigo-300"
                  : "border-4 border-white shadow-lg group-hover:border-indigo-400 cursor-pointer"
              }`}
              width={128}
              height={128}
            />
            {isEditing && (
              <label className="absolute bottom-0 right-0 bg-indigo-500 text-white p-2.5 rounded-full cursor-pointer hover:bg-indigo-600 transition-all duration-300 transform group-hover:scale-110 shadow-[0_0_10px_rgba(99,102,241,0.5)]">
                <Pencil className="w-5 h-5" />
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
            )}
          </motion.div>
          <div className="flex flex-col items-center">
            <h2
              className={`text-lg font-semibold ${
                isEditing ? "text-indigo-600" : "text-blue-600"
              }`}
            >
              Profile Completion
            </h2>
            <div className="relative w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={animatedPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={50}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    animationDuration={1200}
                    animationEasing="ease-in-out"
                    className="cursor-pointer"
                  >
                    {animatedPieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    wrapperStyle={{ zIndex: 1000, left: "115px" }}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "10px",
                      padding: "10px 14px",
                      boxShadow: "0 6px 16px rgba(0, 0, 0, 0.2)",
                      fontSize: "15px",
                      fontWeight: "bold",
                      transition: "all 0.2s ease",
                    }}
                    formatter={(value: number, name: string) => [
                      `${value}%`,
                      name,
                    ]}
                    offset={20}
                  />
                </PieChart>
              </ResponsiveContainer>
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xl font-bold ${
                  isEditing ? "text-indigo-600" : "text-blue-600"
                }`}
              >
                {animatedPercentage}%
              </motion.span>
            </div>
          </div>
        </div>
        <Tabs defaultValue="personal" className="w-full">
          <TabsList
            className={`grid w-full grid-cols-3 rounded-lg ${
              isEditing
                ? "bg-indigo-200"
                : "bg-gradient-to-r from-indigo-100 to-blue-100"
            }`}
          >
            <TabsTrigger
              value="personal"
              className={`${
                isEditing
                  ? "data-[state=active]:bg-indigo-500 data-[state=active]:text-white"
                  : "data-[state=active]:bg-white data-[state=active]:shadow-sm"
              } transition-all duration-300 cursor-pointer`}
            >
              Personal Info
            </TabsTrigger>
            <TabsTrigger
              value="work"
              className={`${
                isEditing
                  ? "data-[state=active]:bg-indigo-500 data-[state=active]:text-white"
                  : "data-[state=active]:bg-white data-[state=active]:shadow-sm"
              } transition-all duration-300 cursor-pointer`}
            >
              Work Info
            </TabsTrigger>
            <TabsTrigger
              value="additional"
              className={`${
                isEditing
                  ? "data-[state=active]:bg-indigo-500 data-[state=active]:text-white"
                  : "data-[state=active]:bg-white data-[state=active]:shadow-sm"
              } transition-all duration-300 cursor-pointer`}
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
                <User
                  className={`w-6 h-6 ${
                    isEditing ? "text-indigo-600" : "text-indigo-500"
                  }`}
                />
                <div className="flex-1 ml-4">
                  <Label
                    className={`text-sm font-medium ${
                      isEditing ? "text-indigo-600" : "text-gray-600"
                    }`}
                  >
                    Name *
                  </Label>
                  {isEditing ? (
                    <Input
                      value={formData.name}
                      onChange={(e) => handleInputChange(e, "name")}
                      placeholder="Enter your name"
                      className="mt-1 border-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200 hover:scale-[1.01]"
                      required
                    />
                  ) : (
                    <p className="mt-1 text-gray-800 text-lg font-medium">
                      {userDetails.name}
                    </p>
                  )}
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="flex items-center bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
              >
                <Mail
                  className={`w-6 h-6 ${
                    isEditing ? "text-indigo-600" : "text-indigo-500"
                  }`}
                />
                <div className="flex-1 ml-4">
                  <Label
                    className={`text-sm font-medium ${
                      isEditing ? "text-indigo-600" : "text-gray-600"
                    }`}
                  >
                    Email *
                  </Label>
                  {isEditing ? (
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange(e, "email")}
                      placeholder="Enter your email"
                      className="mt-1 border-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200 hover:scale-[1.01]"
                      required
                    />
                  ) : (
                    <p className="mt-1 text-gray-800 text-lg font-medium">
                      {userDetails.email}
                    </p>
                  )}
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="flex items-center bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
              >
                <Phone
                  className={`w-6 h-6 ${
                    isEditing ? "text-indigo-600" : "text-indigo-500"
                  }`}
                />
                <div className="flex-1 ml-4">
                  <Label
                    className={`text-sm font-medium ${
                      isEditing ? "text-indigo-600" : "text-gray-600"
                    }`}
                  >
                    Phone *
                  </Label>
                  {isEditing ? (
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange(e, "phone")}
                      placeholder="Enter your phone number"
                      className="mt-1 border-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200 hover:scale-[1.01]"
                      required
                    />
                  ) : (
                    <p className="mt-1 text-gray-800 text-lg font-medium">
                      {userDetails.phone}
                    </p>
                  )}
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="flex items-center bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
              >
                <User
                  className={`w-6 h-6 ${
                    isEditing ? "text-indigo-600" : "text-indigo-500"
                  }`}
                />
                <div className="flex-1 ml-4">
                  <Label
                    className={`text-sm font-medium ${
                      isEditing ? "text-indigo-600" : "text-gray-600"
                    }`}
                  >
                    Gender *
                  </Label>
                  {isEditing ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Select
                        value={formData.gender}
                        onValueChange={(value) =>
                          setFormData((prev) =>
                            prev ? { ...prev, gender: value } : prev
                          )
                        }
                      >
                        <SelectTrigger
                          className={`mt-1 border-indigo-300 bg-white text-gray-800 rounded-xl focus:ring-2 focus:ring-indigo-400 hover:bg-indigo-50 transition-all duration-300 hover:scale-[1.01] cursor-pointer shadow-sm ${
                            isEditing ? "ring-1 ring-indigo-200" : ""
                          }`}
                        >
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-indigo-200 rounded-xl shadow-lg">
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <SelectItem
                              value="male"
                              className="hover:bg-indigo-50 text-gray-800 transition-colors duration-200 cursor-pointer"
                            >
                              Male
                            </SelectItem>
                            <SelectItem
                              value="female"
                              className="hover:bg-indigo-50 text-gray-800 transition-colors duration-200 cursor-pointer"
                            >
                              Female
                            </SelectItem>
                            <SelectItem
                              value="other"
                              className="hover:bg-indigo-50 text-gray-800 transition-colors duration-200 cursor-pointer"
                            >
                              Other
                            </SelectItem>
                          </motion.div>
                        </SelectContent>
                      </Select>
                    </motion.div>
                  ) : (
                    <p className="mt-1 text-gray-800 text-lg font-medium">
                      {userDetails.gender}
                    </p>
                  )}
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
                className="flex items-center bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
              >
                <Bolt
                  className={`w-6 h-6 ${
                    isEditing ? "text-indigo-600" : "text-indigo-500"
                  }`}
                />
                <div className="flex-1 ml-4">
                  <Label
                    className={`text-sm font-medium ${
                      isEditing ? "text-indigo-600" : "text-gray-600"
                    }`}
                  >
                    Role
                  </Label>
                  <p className="mt-1 text-gray-800 text-lg font-medium">
                    {userDetails?.role?.roleName || "Not set"}
                  </p>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="flex items-center bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
              >
                <MapPin
                  className={`w-6 h-6 ${
                    isEditing ? "text-indigo-600" : "text-indigo-500"
                  }`}
                />
                <div className="flex-1 ml-4">
                  <Label
                    className={`text-sm font-medium ${
                      isEditing ? "text-indigo-600" : "text-gray-600"
                    }`}
                  >
                    Address
                  </Label>
                  {isEditing ? (
                    <Input
                      value={formData.address || ""}
                      onChange={(e) => handleInputChange(e, "address")}
                      placeholder="Enter your address"
                      className="mt-1 border-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200 hover:scale-[1.01]"
                    />
                  ) : (
                    <p className="mt-1 text-gray-800 text-lg font-medium">
                      {userDetails.address || "Not set"}
                    </p>
                  )}
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
                <Book
                  className={`w-6 h-6 ${
                    isEditing ? "text-indigo-600" : "text-indigo-500"
                  }`}
                />
                <div className="flex-1 ml-4">
                  <Label
                    className={`text-sm font-medium ${
                      isEditing ? "text-indigo-600" : "text-gray-600"
                    }`}
                  >
                    Join Date
                  </Label>
                  <p className="mt-1 text-gray-800 text-lg font-medium">
                    {userDetails.joinDate
                      ? new Date(userDetails.joinDate).toLocaleDateString()
                      : "Not set"}
                  </p>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="flex items-center bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
              >
                <Briefcase
                  className={`w-6 h-6 ${
                    isEditing ? "text-indigo-600" : "text-indigo-500"
                  }`}
                />
                <div className="flex-1 ml-4">
                  <Label
                    className={`text-sm font-medium ${
                      isEditing ? "text-indigo-600" : "text-gray-600"
                    }`}
                  >
                    Experience
                  </Label>
                  {isEditing ? (
                    <div className="space-y-4 mt-5">
                      {(formData.profile.experience || []).map((exp, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                        >
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm font-medium text-indigo-600">
                                Title
                              </Label>
                              <Input
                                value={exp.title}
                                onChange={(e) =>
                                  handleExperienceChange(
                                    index,
                                    "title",
                                    e.target.value
                                  )
                                }
                                placeholder="Enter title (e.g., Senior Admin)"
                                className="mt-1 border-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 rounded-lg transition-all duration-200 hover:shadow-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-indigo-600">
                                Institution
                              </Label>
                              <Input
                                value={exp.institution}
                                onChange={(e) =>
                                  handleExperienceChange(
                                    index,
                                    "institution",
                                    e.target.value
                                  )
                                }
                                placeholder="Enter institution"
                                className="mt-1 border-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 rounded-lg transition-all duration-200 hover:shadow-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-indigo-600">
                                Duration
                              </Label>
                              <Input
                                value={exp.duration}
                                onChange={(e) =>
                                  handleExperienceChange(
                                    index,
                                    "duration",
                                    e.target.value
                                  )
                                }
                                placeholder="Enter duration (e.g., 2018-2020)"
                                className="mt-1 border-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 rounded-lg transition-all duration-200 hover:shadow-sm"
                              />
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeExperienceItem(index)}
                              className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 py-2 transition-all duration-200 transform hover:scale-105 shadow-sm"
                            >
                              Remove Experience
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                      {pendingExperience.map((exp, index) => (
                        <motion.div
                          key={`pending-experience-${index}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                        >
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm font-medium text-indigo-600">
                                Title
                              </Label>
                              <Input
                                value={exp.title}
                                onChange={(e) =>
                                  handleExperienceChange(
                                    index,
                                    "title",
                                    e.target.value,
                                    true
                                  )
                                }
                                placeholder="Enter title (e.g., Senior Admin)"
                                className="mt-1 border-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 rounded-lg transition-all duration-200 hover:shadow-sm"
                              />
                              {experienceErrors[index]?.title && (
                                <p className="text-red-500 text-sm mt-1">
                                  {experienceErrors[index].title}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-indigo-600">
                                Institution
                              </Label>
                              <Input
                                value={exp.institution}
                                onChange={(e) =>
                                  handleExperienceChange(
                                    index,
                                    "institution",
                                    e.target.value,
                                    true
                                  )
                                }
                                placeholder="Enter institution"
                                className="mt-1 border-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 rounded-lg transition-all duration-200 hover:shadow-sm"
                              />
                              {experienceErrors[index]?.institution && (
                                <p className="text-red-500 text-sm mt-1">
                                  {experienceErrors[index].institution}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-indigo-600">
                                Duration
                              </Label>
                              <Input
                                value={exp.duration}
                                onChange={(e) =>
                                  handleExperienceChange(
                                    index,
                                    "duration",
                                    e.target.value,
                                    true
                                  )
                                }
                                placeholder="Enter duration (e.g., 2018-2020)"
                                className="mt-1 border-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 rounded-lg transition-all duration-200 hover:shadow-sm"
                              />
                              {experienceErrors[index]?.duration && (
                                <p className="text-red-500 text-sm mt-1">
                                  {experienceErrors[index].duration}
                                </p>
                              )}
                            </div>
                            <div className="flex space-x-3">
                              <Button
                                size="sm"
                                onClick={() => confirmExperienceItem(index)}
                                className="bg-green-500 hover:bg-green-600 text-white rounded-lg px-4 py-2 transition-all duration-200 transform hover:scale-105 shadow-sm cursor-pointer"
                              >
                                Confirm
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => cancelExperienceItem(index)}
                                className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 py-2 transition-all duration-200 transform hover:scale-105 shadow-sm cursor-pointer"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      <Button
                        size="sm"
                        onClick={addExperienceItem}
                        className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-6 py-2 transition-all duration-200 transform hover:scale-105 shadow-md cursor-pointer"
                      >
                        Add Experience
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-1 text-gray-800 text-lg font-medium">
                      {(userDetails.profile.experience || [])
                        .map(
                          (exp: {
                            title: string;
                            institution: string;
                            duration: string;
                          }) =>
                            `${exp.title} at ${exp.institution} (${exp.duration})`
                        )
                        .join(", ") || "Not set"}
                    </p>
                  )}
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
                <User
                  className={`w-6 h-6 ${
                    isEditing ? "text-indigo-600" : "text-indigo-500"
                  }`}
                />
                <div className="flex-1 ml-4">
                  <Label
                    className={`text-sm font-medium ${
                      isEditing ? "text-indigo-600" : "text-gray-600"
                    }`}
                  >
                    Bio
                  </Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.profile?.bio || ""}
                      onChange={(e) => handleInputChange(e, "profile", "bio")}
                      placeholder="Tell us about yourself..."
                      className="mt-1 border-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200 hover:scale-[1.01] resize-none"
                      rows={4}
                    />
                  ) : (
                    <p className="mt-1 text-gray-800 text-lg font-medium">
                      {userDetails.profile?.bio || "Not set"}
                    </p>
                  )}
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="flex items-center bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
              >
                <Heart
                  className={`w-6 h-6 ${
                    isEditing ? "text-indigo-600" : "text-indigo-500"
                  }`}
                />
                <div className="flex-1 ml-4">
                  <Label
                    className={`text-sm font-medium ${
                      isEditing ? "text-indigo-600" : "text-gray-600"
                    }`}
                  >
                    Hobbies
                  </Label>
                  {isEditing ? (
                    <div className="space-y-2">
                      {(formData.profile?.hobbies || []).map((hobby, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center gap-2"
                        >
                          <Input
                            value={hobby}
                            onChange={(e) =>
                              handleArrayChange(
                                "hobbies",
                                index,
                                e.target.value,
                                "hobbies"
                              )
                            }
                            placeholder="Enter hobby"
                            className="border-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200 hover:scale-[1.01]"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() =>
                              removeArrayItem("hobbies", index, "hobbies")
                            }
                            className="h-8 w-8 bg-red-500 hover:bg-red-600 hover:scale-110 transition-all duration-200 cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      ))}
                      {pendingHobbies.map((hobby, index) => (
                        <motion.div
                          key={`pending-hobby-${index}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex flex-col gap-1"
                        >
                          <div className="flex items-center gap-2">
                            <Input
                              value={hobby}
                              onChange={(e) =>
                                handleArrayChange(
                                  "hobbies",
                                  index,
                                  e.target.value,
                                  "hobbies",
                                  true
                                )
                              }
                              placeholder="Enter hobby"
                              className="border-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200 hover:scale-[1.01]"
                            />
                            <Button
                              size="icon"
                              onClick={() =>
                                confirmArrayItem("hobbies", index, "hobbies")
                              }
                              className="h-8 w-8 bg-green-500 hover:bg-green-600 hover:scale-110 transition-all duration-200 cursor-pointer"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() =>
                                cancelArrayItem("hobbies", index, "hobbies")
                              }
                              className="h-8 w-8 bg-red-500 hover:bg-red-600 hover:scale-110 transition-all duration-200 cursor-pointer"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          {errors.hobbies[index] && (
                            <p className="text-red-500 text-sm">
                              {errors.hobbies[index]}
                            </p>
                          )}
                        </motion.div>
                      ))}
                      <Button
                        size="sm"
                        onClick={() => addArrayItem("hobbies", "hobbies")}
                        className="mt-2 bg-indigo-500 hover:bg-indigo-600 text-white transition-all duration-200 hover:scale-105 cursor-pointer"
                      >
                        Add Hobby
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-1 text-gray-800 text-lg font-medium">
                      {(userDetails.profile?.hobbies || []).join(", ") ||
                        "Not set"}
                    </p>
                  )}
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="flex items-center bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
              >
                <Star
                  className={`w-6 h-6 ${
                    isEditing ? "text-indigo-600" : "text-indigo-500"
                  }`}
                />
                <div className="flex-1 ml-4">
                  <Label
                    className={`text-sm font-medium ${
                      isEditing ? "text-indigo-600" : "text-gray-600"
                    }`}
                  >
                    Skills
                  </Label>
                  {isEditing ? (
                    <div className="space-y-2">
                      {(formData.profile?.skills || []).map((skill, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center gap-2"
                        >
                          <Input
                            value={skill}
                            onChange={(e) =>
                              handleArrayChange(
                                "skills",
                                index,
                                e.target.value,
                                "skills"
                              )
                            }
                            placeholder="Enter skill"
                            className="border-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200 hover:scale-[1.01]"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() =>
                              removeArrayItem("skills", index, "skills")
                            }
                            className="h-8 w-8 bg-red-500 hover:bg-red-600 hover:scale-110 transition-all duration-200 cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      ))}
                      {pendingSkills.map((skill, index) => (
                        <motion.div
                          key={`pending-skill-${index}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex flex-col gap-1"
                        >
                          <div className="flex items-center gap-2">
                            <Input
                              value={skill}
                              onChange={(e) =>
                                handleArrayChange(
                                  "skills",
                                  index,
                                  e.target.value,
                                  "skills",
                                  true
                                )
                              }
                              placeholder="Enter skill"
                              className="border-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200 hover:scale-[1.01]"
                            />
                            <Button
                              size="icon"
                              onClick={() =>
                                confirmArrayItem("skills", index, "skills")
                              }
                              className="h-8 w-8 bg-green-500 hover:bg-green-600 hover:scale-110 transition-all duration-200 cursor-pointer"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() =>
                                cancelArrayItem("skills", index, "skills")
                              }
                              className="h-8 w-8 bg-red-500 hover:bg-red-600 hover:scale-110 transition-all duration-200 cursor-pointer"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          {errors.skills[index] && (
                            <p className="text-red-500 text-sm">
                              {errors.skills[index]}
                            </p>
                          )}
                        </motion.div>
                      ))}
                      <Button
                        size="sm"
                        onClick={() => addArrayItem("skills", "skills")}
                        className="mt-2 bg-indigo-500 hover:bg-indigo-600 text-white transition-all duration-200 hover:scale-105 cursor-pointer"
                      >
                        Add Skill
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-1 text-gray-800 text-lg font-medium">
                      {(userDetails.profile?.skills || []).join(", ") ||
                        "Not set"}
                    </p>
                  )}
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="flex items-center bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
              >
                <User
                  className={`w-6 h-6 ${
                    isEditing ? "text-indigo-600" : "text-indigo-500"
                  }`}
                />
                <div className="flex-1 ml-4">
                  <Label
                    className={`text-sm font-medium ${
                      isEditing ? "text-indigo-600" : "text-gray-600"
                    }`}
                  >
                    About
                  </Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.profile?.about || ""}
                      onChange={(e) => handleInputChange(e, "profile", "about")}
                      placeholder="Tell us about yourself..."
                      className="mt-1 border-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200 hover:scale-[1.01] resize-none"
                      rows={4}
                    />
                  ) : (
                    <p className="mt-1 text-gray-800 text-lg font-medium">
                      {userDetails.profile?.about || "Not set"}
                    </p>
                  )}
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="flex items-center bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
              >
                <Award
                  className={`w-6 h-6 ${
                    isEditing ? "text-indigo-600" : "text-indigo-500"
                  }`}
                />
                <div className="flex-1 ml-4">
                  <Label
                    className={`text-sm font-medium ${
                      isEditing ? "text-indigo-600" : "text-gray-600"
                    }`}
                  >
                    Accomplishments
                  </Label>
                  {isEditing ? (
                    <div className="space-y-2">
                      {(formData.profile?.accomplishments || []).map(
                        (accomplishment, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center gap-2"
                          >
                            <Input
                              value={accomplishment}
                              onChange={(e) =>
                                handleArrayChange(
                                  "accomplishments",
                                  index,
                                  e.target.value,
                                  "accomplishments"
                                )
                              }
                              placeholder="Enter accomplishment"
                              className="border-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200 hover:scale-[1.01]"
                            />
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() =>
                                removeArrayItem(
                                  "accomplishments",
                                  index,
                                  "accomplishments"
                                )
                              }
                              className="h-8 w-8 bg-red-500 hover:bg-red-600 hover:scale-110 transition-all duration-200 cursor-pointer"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        )
                      )}
                      {pendingAccomplishments.map((accomplishment, index) => (
                        <motion.div
                          key={`pending-accomplishment-${index}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex flex-col gap-1"
                        >
                          <div className="flex items-center gap-2">
                            <Input
                              value={accomplishment}
                              onChange={(e) =>
                                handleArrayChange(
                                  "accomplishments",
                                  index,
                                  e.target.value,
                                  "accomplishments",
                                  true
                                )
                              }
                              placeholder="Enter accomplishment"
                              className="border-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200 hover:scale-[1.01]"
                            />
                            <Button
                              size="icon"
                              onClick={() =>
                                confirmArrayItem(
                                  "accomplishments",
                                  index,
                                  "accomplishments"
                                )
                              }
                              className="h-8 w-8 bg-green-500 hover:bg-green-600 hover:scale-110 transition-all duration-200 cursor-pointer"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() =>
                                cancelArrayItem(
                                  "accomplishments",
                                  index,
                                  "accomplishments"
                                )
                              }
                              className="h-8 w-8 bg-red-500 hover:bg-red-600 hover:scale-110 transition-all duration-200 cursor-pointer"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          {errors.accomplishments[index] && (
                            <p className="text-red-500 text-sm">
                              {errors.accomplishments[index]}
                            </p>
                          )}
                        </motion.div>
                      ))}
                      <Button
                        size="sm"
                        onClick={() =>
                          addArrayItem("accomplishments", "accomplishments")
                        }
                        className="mt-2 bg-indigo-500 hover:bg-indigo-600 text-white transition-all duration-200 hover:scale-105 cursor-pointer"
                      >
                        Add Accomplishment
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-1 text-gray-800 text-lg font-medium">
                      {(userDetails.profile?.accomplishments || []).join(
                        ", "
                      ) || "Not set"}
                    </p>
                  )}
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
                className="flex items-center bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
              >
                <Award
                  className={`w-6 h-6 ${
                    isEditing ? "text-indigo-600" : "text-indigo-500"
                  }`}
                />
                <div className="flex-1 ml-4">
                  <Label
                    className={`text-sm font-medium ${
                      isEditing ? "text-indigo-600" : "text-gray-600"
                    }`}
                  >
                    Qualifications
                  </Label>
                  {isEditing ? (
                    <div className="space-y-2">
                      {(formData.profile?.qualifications || []).map(
                        (qualification, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center gap-2"
                          >
                            <Input
                              value={qualification}
                              onChange={(e) =>
                                handleArrayChange(
                                  "qualifications",
                                  index,
                                  e.target.value,
                                  "qualifications"
                                )
                              }
                              placeholder="Enter qualification"
                              className="border-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200 hover:scale-[1.01]"
                            />
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() =>
                                removeArrayItem(
                                  "qualifications",
                                  index,
                                  "qualifications"
                                )
                              }
                              className="h-8 w-8 bg-red-500 hover:bg-red-600 hover:scale-110 transition-all duration-200 cursor-pointer"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        )
                      )}
                      {pendingQualifications.map((qualification, index) => (
                        <motion.div
                          key={`pending-qualification-${index}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex flex-col gap-1"
                        >
                          <div className="flex items-center gap-2">
                            <Input
                              value={qualification}
                              onChange={(e) =>
                                handleArrayChange(
                                  "qualifications",
                                  index,
                                  e.target.value,
                                  "qualifications",
                                  true
                                )
                              }
                              placeholder="Enter qualification"
                              className="border-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200 hover:scale-[1.01]"
                            />
                            <Button
                              size="icon"
                              onClick={() =>
                                confirmArrayItem(
                                  "qualifications",
                                  index,
                                  "qualifications"
                                )
                              }
                              className="h-8 w-8 bg-green-500 hover:bg-green-600 hover:scale-110 transition-all duration-200 cursor-pointer"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon"
                              onClick={() =>
                                cancelArrayItem(
                                  "qualifications",
                                  index,
                                  "qualifications"
                                )
                              }
                              className="h-8 w-8 bg-red-500 hover:bg-red-600 hover:scale-110 transition-all duration-200 cursor-pointer"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          {errors.qualifications[index] && (
                            <p className="text-red-500 text-sm">
                              {errors.qualifications[index]}
                            </p>
                          )}
                        </motion.div>
                      ))}
                      <Button
                        size="sm"
                        onClick={() =>
                          addArrayItem("qualifications", "qualifications")
                        }
                        className="mt-2 bg-indigo-500 hover:bg-indigo-600 text-white transition-all duration-200 hover:scale-105 cursor-pointer"
                      >
                        Add Qualification
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-1 text-gray-800 text-lg font-medium">
                      {(userDetails.profile?.qualifications || []).join(", ") ||
                        "Not set"}
                    </p>
                  )}
                </div>
              </motion.div>
            </div>
          </TabsContent>
        </Tabs>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex justify-center mt-8"
        >
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                key="editing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="flex space-x-4"
              >
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData(userDetails);
                    setPreviewImage(userDetails.profileImage || null);
                    setProfileImage(null);
                    setPendingHobbies([]);
                    setPendingSkills([]);
                    setPendingAccomplishments([]);
                    setPendingQualifications([]);
                    setPendingExperience([]);
                    setExperienceErrors([]);
                    setErrors({
                      hobbies: [],
                      skills: [],
                      accomplishments: [],
                      qualifications: [],
                    });
                  }}
                  className={`border-indigo-400 text-indigo-600 hover:bg-indigo-100 hover:scale-105 transition-all duration-200 rounded-xl px-6 py-2 cursor-pointer ${
                    isSaving ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className={`bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 hover:scale-105 transition-all duration-200 rounded-xl px-6 py-2 cursor-pointer ${
                    isSaving ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <svg
                      className="animate-spin h-5 w-5 mr-2 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  ) : null}
                  Save Changes
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="edit"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white px-8 py-3 rounded-xl hover:from-indigo-600 hover:to-blue-600 transition-all duration-300 transform hover:scale-105 hover:shadow-lg cursor-pointer"
                >
                  Edit Profile
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}
