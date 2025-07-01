"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  ApiError,
  RawUser,
  AssignRoleState,
  User,
  UserSelections,
} from "@/types";
import {
  UserIcon,
  Mail,
  Phone,
  ShieldAlert,
  FileText,
  Globe,
  Clock,
  Book,
  Calendar,
} from "lucide-react";
import { Triangle } from "react-loader-spinner";

export default function AssignRole() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<AssignRoleState>({
    users: [],
    selections: {},
    fetchLoading: true,
    isDropdownScrolling: false,
    loading: false,
  });
  const router = useRouter();

  const subjects = ["Phonics", "Creative Writing", "Public Speaking"];

  const formatDate = (dateString: string): string => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      }).format(new Date(dateString));
    } catch {
      return "Unknown";
    }
  };

  const handleUnauthorized = useCallback(() => {
    console.debug("[AssignTeachers] Handling unauthorized access");
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("deviceId");
    toast.error("Session expired. Please log in again.");
    router.push("/login");
  }, [router]);


const fetchUsers = useCallback(async () => {
      if (!user) {
      handleUnauthorized();
      return;
    }
  setState((prev) => ({ ...prev, fetchLoading: true }));
  try {
    const deviceId = localStorage.getItem("deviceId");
    const token = localStorage.getItem("token");
    if (!deviceId || !token) {
      console.debug("[AssignRole] Missing deviceId or token", { deviceId, token });
      handleUnauthorized();
      return;
    }
    const response = await api.get("/admin/users", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Device-Id": deviceId,
      },
    });
    if (!response.data || !Array.isArray(response.data.users)) {
      throw new Error("Invalid response structure: users array not found");
    }
    const usersWithoutRole: User[] = response.data.users
      .filter((u: RawUser): u is RawUser => {
        return (
          u &&
          typeof u === "object" &&
          typeof u._id === "string" &&
          typeof u.name === "string" &&
          typeof u.email === "string" &&
          (!u.role || u.role === null || typeof u.role === "string")
        );
      })
      .map((u: RawUser) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        phone: u.phone || "",
        role:
          typeof u.role === "string"
            ? { roleName: u.role }
            : u.role || { roleName: "Unknown" },
        profileImage: u.profileImage || "",
        timezone: u.timezone || "",
        timeSlot: u.preferredTimeSlots?.[0] || "",
        subjects: u.subjects || [],
        createdAt: u.joinDate || u.createdAt || new Date().toISOString(),
        isFirstLogin: u.isFirstLogin,
        isTimezoneSet: u.isTimezoneSet,
      }));
    const selections: { [userId: string]: UserSelections } = {};
    usersWithoutRole.forEach((u) => {
      selections[u._id] = {
        selectedRole: "",
        selectedSubjects: [],
        selectedTeacherId: "",
        teachers: [],
        errors: {},
        isRolePopoverOpen: false,
        loading: false,
      };
    });
    setState((prev) => ({
      ...prev,
      users: usersWithoutRole,
      selections,
      fetchLoading: false,
    }));
  } catch (error) {
    const apiError = error as ApiError;
    console.error("[AssignRole] Failed to fetch users:", apiError);
    const errorMessage =
      apiError.response?.data?.message || "Failed to fetch users";
    toast.error(errorMessage);
    if (apiError.response?.status === 401) {
      handleUnauthorized();
    }
    setState((prev) => ({ ...prev, fetchLoading: false }));
  }
},[handleUnauthorized, user]);

 useEffect(() => {
    if (authLoading) return;
    if (
      !user ||
      !["Admin", "Super Admin"].includes(user.role?.roleName || "")
    ) {
      console.debug("[AssignRole] Redirecting due to invalid role or no user", {
        user: !!user,
        role: user?.role?.roleName,
        authLoading,
      });
      handleUnauthorized();
      return;
    }
  fetchUsers();
}, [user, authLoading, fetchUsers, handleUnauthorized]);

  useEffect(() => {
    let dropdownScrollTimeout: NodeJS.Timeout;

    const handleDropdownScroll = () => {
      setState((prev) => ({ ...prev, isDropdownScrolling: true }));
      clearTimeout(dropdownScrollTimeout);
      dropdownScrollTimeout = setTimeout(() => {
        setState((prev) => ({ ...prev, isDropdownScrolling: false }));
      }, 1000);
    };

    const dropdownContainers = document.querySelectorAll(
      ".dropdown-scroll-container"
    );

    dropdownContainers.forEach((container) => {
      container.addEventListener("scroll", handleDropdownScroll);
    });

    return () => {
      dropdownContainers.forEach((container) => {
        container.removeEventListener("scroll", handleDropdownScroll);
      });
      clearTimeout(dropdownScrollTimeout);
    };
  }, [state.users.length]);

  const fetchTeachers = async (userId: string, subject: string) => {
     if (!user) {
      handleUnauthorized();
      return;
    }
    try {
         const deviceId = localStorage.getItem("deviceId");
      const token = localStorage.getItem("token");
      if (!deviceId || !token) {
        console.debug(
          "[AssignRole] Missing deviceId or token in fetchTeachers",
          {
            deviceId,
            token,
          }
        );
        handleUnauthorized();
        return;
      }
      const response = await api.get(`/auth/teachers?subject=${subject}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Device-Id": localStorage.getItem("deviceId") || "unknown",
        },
      });

      const teachers: User[] = (response.data.teachers || []).map(
        (t: RawUser) => ({
          _id: t._id,
          name: t.name,
          email: t.email,
          phone: t.phone || "",
          role: { roleName: "Teacher" },
          profileImage: t.profileImage || "",
          timezone: t.timezone || "",
          timeSlot: t.preferredTimeSlots?.[0] || "",
          subjects: t.subjects || [],
          createdAt: t.joinDate || t.createdAt || new Date().toISOString(),
          isFirstLogin: t.isFirstLogin,
          isTimezoneSet: t.isTimezoneSet,
        })
      );

      setState((prev) => ({
        ...prev,
        selections: {
          ...prev.selections,
          [userId]: {
            ...prev.selections[userId],
            teachers,
            selectedTeacherId: "",
          },
        },
      }));
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[AssignRole] Failed to fetch teachers:", apiError);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        const errorMessage =
          apiError.response?.data?.message || "Failed to fetch teachers";
        toast.error(errorMessage);
      }
      setState((prev) => ({
        ...prev,
        selections: {
          ...prev.selections,
          [userId]: {
            ...prev.selections[userId],
            teachers: [],
            selectedTeacherId: "",
          },
        },
      }));
    }
  };

  const validateInputs = (userId: string) => {
    const errors: { [key: string]: string } = {};
    const userSelection = state.selections[userId];
    if (!userId) errors.userId = "Please select a user";
    if (!userSelection.selectedRole) errors.role = "Please select a role";
    if (
      ["Teacher", "Student"].includes(userSelection.selectedRole) &&
      userSelection.selectedSubjects.length === 0
    ) {
      errors.subjects = "Please select at least one subject";
    }
    if (userSelection.selectedRole === "Student") {
      if (!userSelection.selectedTeacherId) {
        errors.teacherId = "Please select a teacher";
      }
    }
    return errors;
  };

const handleAssignRole = async (userId: string) => {
    if (!user) {
      handleUnauthorized();
      return;
    }
  setState((prev) => ({
    ...prev,
    selections: {
      ...prev.selections,
      [userId]: {
        ...prev.selections[userId],
        loading: true,
        errors: {},
      },
    },
  }));

  const errors = validateInputs(userId);
  if (Object.keys(errors).length > 0) {
    setState((prev) => ({
      ...prev,
      selections: {
        ...prev.selections,
        [userId]: {
          ...prev.selections[userId],
          errors,
          loading: false,
        },
      },
    }));
    return;
  }

  try {
    const deviceId = localStorage.getItem("deviceId");
    const token = localStorage.getItem("token");
    if (!deviceId || !token) {
      console.debug("[AssignRole] Missing deviceId or token", { deviceId, token });
      handleUnauthorized();
      return;
    }

    const userSelection = state.selections[userId];
    const isSuperAdmin = user?.role?.roleName === "Super Admin";
    const apiEndpoint = isSuperAdmin && userSelection.selectedRole === "Admin"
      ? "/admin/create-admin"
      : "/admin/assign-role";

    const payload = {
      userId,
      roleName: userSelection.selectedRole,
      subjects: userSelection.selectedSubjects,
      teacherId:
        userSelection.selectedRole === "Student"
          ? userSelection.selectedTeacherId
          : undefined,
      ...(apiEndpoint === "/admin/create-admin" && { isSuperAdmin : false }),
    };

    await api.post(
      apiEndpoint,
      payload,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Device-Id": localStorage.getItem("deviceId") || "unknown",
        },
      }
    );
    toast.success("Role assigned successfully!");
    setState((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u._id !== userId),
      selections: Object.fromEntries(
        Object.entries(prev.selections).filter(([id]) => id !== userId)
      ),
    }));
  } catch (error) {
      const apiError = error as ApiError;
      console.error("[AssignRole] Failed to assign role:", apiError);
      const errorMessage =
        apiError.response?.data?.message ||
        "Failed to assign role and subjects";
      toast.error(errorMessage);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      }
      setState((prev) => ({
        ...prev,
        selections: {
          ...prev.selections,
          [userId]: {
            ...prev.selections[userId],
            loading: false,
          },
        },
      }));
    }
  };

  const toggleSubject = (userId: string, subject: string) => {
    setState((prev) => {
      const userSelection = prev.selections[userId];
      const newSubjects = userSelection.selectedSubjects.includes(subject)
        ? userSelection.selectedSubjects.filter((s) => s !== subject)
        : [...userSelection.selectedSubjects, subject];

      if (userSelection.selectedRole === "Student" && newSubjects.length > 0) {
        fetchTeachers(userId, newSubjects[0]);
      } else {
        return {
          ...prev,
          selections: {
            ...prev.selections,
            [userId]: {
              ...userSelection,
              selectedSubjects: newSubjects,
              selectedTeacherId: "",
              teachers: [],
              errors: { ...userSelection.errors, subjects: "" },
            },
          },
        };
      }

      return {
        ...prev,
        selections: {
          ...prev.selections,
          [userId]: {
            ...userSelection,
            selectedSubjects: newSubjects,
            selectedTeacherId: "",
            errors: { ...userSelection.errors, subjects: "" },
          },
        },
      };
    });
  };

  const getRoleBadgeStyles = () => {
    return "bg-amber-100 text-amber-700";
  };

  const togglePopover = (userId: string, value: boolean) => {
    setState((prev) => ({
      ...prev,
      selections: {
        ...prev.selections,
        [userId]: {
          ...prev.selections[userId],
          isRolePopoverOpen: value,
        },
      },
    }));
  };

  if (authLoading) {
    return (
      <Triangle
        height="80"
        width="80"
        color="#ff0000"
        ariaLabel="triangle-loading"
        wrapperStyle={{}}
        wrapperClass=""
        visible={true}
      />
    );
  }

if (!user || !["Admin", "Super Admin"].includes(user.role?.roleName || "")) {
  handleUnauthorized();
  return null;
}

  const isSuperAdmin = user.role?.roleName === "Super Admin";
  const roleOptions = [
    { value: "Student", label: "Student" },
    { value: "Teacher", label: "Teacher" },
    ...(isSuperAdmin
      ? [{ value: "Admin", label: "Admin" }]
      : []),
  ];

  return (
    <div className="p-8 bg-gray-100 min-h-screen mt-10 ml-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto"
      >
        {state.users.length > 0 && (
          <h2 className="text-3xl font-extrabold mb-8 text-gray-900">
            Assign Roles to Users
          </h2>
        )}
        {state.fetchLoading ? (
          <p className="text-gray-500 text-lg font-medium text-center py-6">
            Loading users...
          </p>
        ) : state.users.length === 0 ? (
          <p className="text-gray-500 text-lg font-medium text-center py-6">
            No new users registered
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <AnimatePresence>
              {state.users.map((u) => {
                const userSelection = state.selections[u._id] || {
                  selectedRole: "",
                  selectedSubjects: [],
                  selectedTeacherId: "",
                  teachers: [],
                  errors: {},
                  isRolePopoverOpen: false,
                  loading: false,
                };
                return (
                  <motion.div
                    key={u._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <Card
                      className={`w-full bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl shadow-md transition-all duration-300 hover:shadow-lg hover:border-blue-400 cursor-pointer ${
                        userSelection.selectedRole === "Student" &&
                        userSelection.selectedSubjects.length > 0
                          ? "md:w-[calc(100%+4rem)]"
                          : ""
                      }`}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                          <UserIcon className="w-6 h-6 text-blue-600" />
                          <span className="truncate">{u.name}</span>
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.2 }}
                            title="Role Not Assigned"
                          >
                            <ShieldAlert
                              className="w-5 h-5 text-amber-600 hover:scale-110 transition-transform duration-200"
                              aria-label="No Role Assigned"
                            />
                          </motion.span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-6 pb-6">
                        <div className="space-y-4">
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                            className="flex items-center gap-2 text-sm text-gray-600"
                          >
                            <Mail className="w-5 h-5 text-gray-500" />
                            <span className="truncate">{u.email}</span>
                          </motion.div>
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                            className="flex items-center gap-2 text-sm text-gray-600"
                          >
                            <Phone className="w-5 h-5 text-gray-500" />
                            <span>{u.phone || "Not provided"}</span>
                          </motion.div>
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.3 }}
                            className="flex items-center gap-2"
                          >
                            <Badge className={getRoleBadgeStyles()}>
                              Not Assigned
                            </Badge>
                          </motion.div>
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.4 }}
                            className="relative"
                          >
                            <Popover
                              open={userSelection.isRolePopoverOpen}
                              onOpenChange={(open: boolean) =>
                                togglePopover(u._id, open)
                              }
                            >
                              <PopoverTrigger asChild>
                                <motion.div
                                  className={`flex items-center border-2 rounded-xl overflow-hidden cursor-pointer bg-white ${
                                    userSelection.errors.role
                                      ? "border-red-500"
                                      : "border-gray-200 hover:border-blue-400"
                                  }`}
                                  whileHover={{ scale: 1.02 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <FileText className="w-5 h-5 text-gray-400 ml-3" />
                                  <span
                                    className={`w-full p-3 text-left font-medium ${
                                      userSelection.selectedRole
                                        ? "text-gray-800"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    {userSelection.selectedRole ||
                                      "Select Role"}
                                  </span>
                                </motion.div>
                              </PopoverTrigger>
                              <PopoverContent
                                className="bg-white shadow-xl rounded-xl border border-gray-200 p-1 overflow-hidden w-[200px] z-50"
                                side="bottom"
                                align="start"
                                sideOffset={5}
                              >
                                <div
                                  className="max-h-48 overflow-y-auto dropdown-scroll-container py-1"
                                  style={{
                                    scrollbarWidth: "thin",
                                    scrollbarColor: `${
                                      state.isDropdownScrolling
                                        ? "rgba(99, 102, 241, 0.5) transparent"
                                        : "transparent transparent"
                                    }`,
                                  }}
                                >
                                  <style jsx global>{`
                                    .dropdown-scroll-container::-webkit-scrollbar {
                                      width: ${state.isDropdownScrolling
                                        ? "6px"
                                        : "3px"};
                                      transition: width 0.3s ease;
                                    }
                                    .dropdown-scroll-container::-webkit-scrollbar-track {
                                      background: transparent;
                                    }
                                    .dropdown-scroll-container::-webkit-scrollbar-thumb {
                                      background: ${state.isDropdownScrolling
                                        ? "rgba(99, 102, 241, 0.5)"
                                        : "rgba(99, 102, 241, 0.2)"};
                                      border-radius: 10px;
                                      transition: background 0.3s ease;
                                    }
                                    .dropdown-scroll-container::-webkit-scrollbar-thumb:hover {
                                      background: rgba(99, 102, 241, 0.8);
                                    }
                                  `}</style>
                                  {roleOptions.length === 0 ? (
                                    <div className="px-4 py-2 text-gray-600 w-full">
                                      No roles available
                                    </div>
                                  ) : (
                                    roleOptions.map((option) => (
                                      <motion.div
                                        key={option.value}
                                        className="px-4 py-3 hover:bg-gradient-to-r hover:from-indigo-100 hover:to-purple-100 cursor-pointer text-gray-800 w-full rounded-lg font-medium"
                                        whileHover={{ scale: 1.02 }}
                                        transition={{ duration: 0.2 }}
                                        onClick={() => {
                                          setState((prev) => {
                                            const newSelections = {
                                              ...prev.selections,
                                              [u._id]: {
                                                ...prev.selections[u._id],
                                                selectedRole: option.value,
                                                selectedSubjects: [],
                                                selectedTeacherId: "",
                                                teachers: [],
                                                isRolePopoverOpen: false,
                                              },
                                            };
                                            if (
                                              option.value === "Student" &&
                                              prev.selections[u._id]
                                                .selectedSubjects.length > 0
                                            ) {
                                              fetchTeachers(
                                                u._id,
                                                prev.selections[u._id]
                                                  .selectedSubjects[0]
                                              );
                                            }
                                            return {
                                              ...prev,
                                              selections: newSelections,
                                            };
                                          });
                                        }}
                                      >
                                        {option.label}
                                      </motion.div>
                                    ))
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                            {userSelection.errors.role && (
                              <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-red-500 text-sm mt-2"
                              >
                                {userSelection.errors.role}
                              </motion.p>
                            )}
                          </motion.div>
                          {["Teacher", "Student"].includes(
                            userSelection.selectedRole
                          ) && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: 0.5 }}
                            >
                              <div className="flex flex-col space-y-3">
                                <label className="text-sm font-medium text-gray-700">
                                  Select Subjects
                                </label>
                                <div className="flex flex-wrap gap-6">
                                  {subjects.map((subject) => (
                                    <motion.div
                                      key={subject}
                                      className="flex items-center space-x-2"
                                      whileHover={{ scale: 1.05 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <Checkbox
                                        id={`${u._id}-${subject}`}
                                        checked={userSelection.selectedSubjects.includes(
                                          subject
                                        )}
                                        onCheckedChange={() =>
                                          toggleSubject(u._id, subject)
                                        }
                                        disabled={false}
                                        className="h-5 w-5 border-gray-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <label
                                        htmlFor={`${u._id}-${subject}`}
                                        className="text-sm font-medium text-gray-700 cursor-pointer"
                                      >
                                        {subject}
                                      </label>
                                    </motion.div>
                                  ))}
                                </div>
                                {userSelection.errors.subjects && (
                                  <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-red-500 text-sm mt-2"
                                  >
                                    {userSelection.errors.subjects}
                                  </motion.p>
                                )}
                              </div>
                            </motion.div>
                          )}
                          {userSelection.selectedRole === "Student" &&
                            userSelection.selectedSubjects.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.6 }}
                              >
                                <div className="flex flex-col space-y-3">
                                  <label className="text-sm font-medium text-gray-700">
                                    Select Teacher
                                  </label>
                                  {userSelection.teachers.length === 0 ? (
                                    <div className="text-gray-600 text-sm">
                                      No teachers available
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                      {userSelection.teachers.map((teacher) => (
                                        <motion.div
                                          key={teacher._id}
                                          initial={{ opacity: 0, y: 20 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ duration: 0.4 }}
                                          whileHover={{
                                            scale: 1.05,
                                            boxShadow:
                                              "0 10px 20px rgba(0,0,0,0.1)",
                                          }}
                                        >
                                          <Card
                                            className={`bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl shadow-md transition-all duration-300 w-full flex flex-col justify-between ${
                                              userSelection.selectedTeacherId ===
                                              teacher._id
                                                ? "border-blue-500 bg-blue-50 shadow-lg"
                                                : "hover:border-blue-400 hover:shadow-lg"
                                            }`}
                                            onClick={() =>
                                              setState((prev) => ({
                                                ...prev,
                                                selections: {
                                                  ...prev.selections,
                                                  [u._id]: {
                                                    ...prev.selections[u._id],
                                                    selectedTeacherId:
                                                      teacher._id,
                                                    errors: {
                                                      ...prev.selections[u._id]
                                                        .errors,
                                                      teacherId: "",
                                                    },
                                                  ascended: true,
                                                  },
                                                },
                                              }))
                                            }
                                          >
                                            <CardContent className="p-6 flex flex-col items-center space-y-4 text-center">
                                              <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ duration: 0.3 }}
                                              >
                                                <Image
                                                  src={
                                                    teacher.profileImage ||
                                                    "https://via.placeholder.com/80"
                                                  }
                                                  alt={`${teacher.name}'s profile`}
                                                  width={80}
                                                  height={80}
                                                  className="rounded-full object-cover border-2 border-gray-200"
                                                  unoptimized
                                                />
                                              </motion.div>
                                              <h3 className="text-lg font-semibold text-gray-900">
                                                {teacher.name}
                                              </h3>
                                              <div className="space-y-2 text-sm text-gray-600 w-full">
                                                <motion.div
                                                  initial={{
                                                    opacity: 0,
                                                    x: -10,
                                                  }}
                                                  animate={{ opacity: 1, x: 0 }}
                                                  transition={{
                                                    duration: 0.3,
                                                    delay: 0.1,
                                                  }}
                                                  className="flex items-center justify-center gap-2"
                                                >
                                                  <Book className="w-4 h-4 text-blue-500" />
                                                  <span>
                                                    {teacher.subjects &&
                                                    teacher.subjects.length > 0
                                                      ? teacher.subjects.join(
                                                          ", "
                                                        )
                                                      : "None"}
                                                  </span>
                                                </motion.div>
                                                <motion.div
                                                  initial={{
                                                    opacity: 0,
                                                    x: -10,
                                                  }}
                                                  animate={{ opacity: 1, x: 0 }}
                                                  transition={{
                                                    duration: 0.3,
                                                    delay: 0.2,
                                                  }}
                                                  className="flex items-center justify-center gap-4"
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <Globe className="w-4 h-4 text-blue-500" />
                                                    <span>
                                                      {teacher.timezone ||
                                                        "Not set"}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-blue-500" />
                                                    <span>
                                                      {teacher.timeSlot ||
                                                        "Not set"}
                                                    </span>
                                                  </div>
                                                </motion.div>
                                                <motion.div
                                                  initial={{
                                                    opacity: 0,
                                                    x: -10,
                                                  }}
                                                  animate={{ opacity: 1, x: 0 }}
                                                  transition={{
                                                    duration: 0.3,
                                                    delay: 0.3,
                                                  }}
                                                  className="flex items-center justify-center gap-2"
                                                >
                                                  <Calendar className="w-4 h-4 text-blue-500" />
                                                  <span>
                                                    {teacher.createdAt
                                                      ? formatDate(
                                                          teacher.createdAt
                                                        )
                                                      : "Unknown"}
                                                  </span>
                                                </motion.div>
                                              </div>
                                            </CardContent>
                                          </Card>
                                        </motion.div>
                                      ))}
                                    </div>
                                  )}
                                  {userSelection.errors.teacherId && (
                                    <motion.p
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      className="text-red-500 text-sm mt-2"
                                    >
                                      {userSelection.errors.teacherId}
                                    </motion.p>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.7 }}
                            className="mt-6"
                          >
                            <Button
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors duration-300 cursor-pointer"
                              onClick={() => handleAssignRole(u._id)}
                              disabled={userSelection.loading}
                            >
                              {userSelection.loading
                                ? "Assigning..."
                                : "Assign Role"}
                            </Button>
                          </motion.div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}