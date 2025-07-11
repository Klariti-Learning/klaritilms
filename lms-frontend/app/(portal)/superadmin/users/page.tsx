// "use client";

// import { useState, useEffect, useCallback } from "react";
// import { useAuth } from "@/lib/auth";
// import { Card } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { useRouter } from "next/navigation";
// import { toast } from "react-hot-toast";
// import { ApiError } from "@/types";
// import {
//   Mail,
//   Phone,
//   Book,
//   Crown,
//   ShieldCheck,
//   ShieldAlert,
//   Users as UsersIcon,
//   GraduationCap,
//   UserCheck,
//   AlertTriangle,
// } from "lucide-react";
// import api from "@/lib/api";
// import { motion, AnimatePresence } from "framer-motion";
// import Image from "next/image";
// import Loader from "@/components/Loader";

// interface User {
//   _id: string;
//   name: string;
//   email: string;
//   phone: string;
//   role?: { roleName: string };
//   profileImage?: string | null;
//   subjects?: string[];
//   employeeId?: string;
//   studentId?: string;
//   gender?: string;
// }

// export default function Users() {
//   const { user } = useAuth();
//   const [users, setUsers] = useState<User[]>([]);
//   const [loading, setLoading] = useState(true);
//   const router = useRouter();

//   const handleUnauthorized = useCallback(() => {
//     console.debug("[Users] Handling unauthorized access");
//     localStorage.removeItem("token");
//     localStorage.removeItem("userId");
//     localStorage.removeItem("isLoggedIn");
//     localStorage.removeItem("deviceId");
//     toast.error("Session expired. Please log in again.");
//     router.push("/login");
//   }, [router]);

//   const fetchUsers = useCallback(async () => {
//     if (!user) {
//       handleUnauthorized();
//       return;
//     }
//     try {
//       const deviceId = localStorage.getItem("deviceId");
//       const token = localStorage.getItem("token");
//       if (!deviceId || !token) {
//         console.debug("[Users] Missing deviceId or token", { deviceId, token });
//         handleUnauthorized();
//         return;
//       }
//       const response = await api.get("/admin/users", {
//         headers: {
//           "Device-Id": deviceId,
//           Authorization: `Bearer ${token}`,
//         },
//       });
//       setUsers(response.data.users || []);
//     } catch (error) {
//       const apiError = error as ApiError;
//       console.error("[Users] Failed to fetch users:", apiError);
//       if (apiError.response?.status === 401) {
//         handleUnauthorized();
//       } else {
//         const errorMessage =
//           apiError.response?.data?.message || "Failed to fetch users";
//         toast.error(errorMessage);
//       }
//     } finally {
//       setLoading(false);
//     }
//   }, [user, handleUnauthorized]);

//   useEffect(() => {
//     if (
//       !user ||
//       !["Admin", "Super Admin"].includes(user.role?.roleName || "")
//     ) {
//       console.debug("[Users] Redirecting due to invalid role or no user", {
//         user: !!user,
//         role: user?.role?.roleName,
//       });
//       handleUnauthorized();
//       router.push("/my-learnings");
//       return;
//     }
//     fetchUsers();
//   }, [user, router, handleUnauthorized, fetchUsers]);

//   const getProfileImage = (user: User): string => {
//     if (user.profileImage) {
//       return user.profileImage;
//     }
//     if (user.gender) {
//       if (user.gender.toLowerCase() === "male") {
//         return "https://res.cloudinary.com/dlie87ah0/image/upload/v1746686671/male_nwqqzv.jpg";
//       }
//       if (user.gender.toLowerCase() === "female") {
//         return "https://res.cloudinary.com/dlie87ah0/image/upload/v1746686670/small_f1yzjb.png";
//       }
//     }
//     return "https://res.cloudinary.com/dlie87ah0/image/upload/v1746686670/small_f1yzjb.png";
//   };

//   const getRoleBadgeStyles = (roleName: string) => {
//     switch (roleName) {
//       case "Admin":
//         return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white";
//       case "Super Admin":
//         return "bg-gradient-to-r from-purple-600 to-pink-600 text-white";
//       case "Teacher":
//         return "bg-gradient-to-r from-orange-400 to-orange-600 text-white";
//       case "Student":
//         return "bg-gradient-to-r from-green-400 to-green-600 text-white";
//       default:
//         return "bg-amber-100 text-amber-700";
//     }
//   };

//   const getBadgeStyles = (roleName: string) => {
//     switch (roleName) {
//       case "Admin":
//         return "bg-gradient-to-r from-blue-400 to-blue-600";
//       case "Super Admin":
//         return "bg-gradient-to-r from-purple-500 to-purple-700";
//       case "Teacher":
//         return "bg-gradient-to-r from-orange-400 to-orange-600";
//       case "Student":
//         return "bg-gradient-to-r from-green-400 to-green-600";
//       default:
//         return "bg-gradient-to-r from-amber-400 to-amber-600";
//     }
//   };

//   const handleCardClick = (userId: string) => {
//     router.push(`/superadmin/users/${userId}`);
//   };

//   const admins = users
//     .filter((u) => ["Admin", "Super Admin"].includes(u.role?.roleName || ""))
//     .sort((a, b) => {
//       if (a.role?.roleName === "Super Admin") return -1;
//       if (b.role?.roleName === "Super Admin") return 1;
//       return 0;
//     });
//   const teachers = users.filter((u) => u.role?.roleName === "Teacher");
//   const students = users.filter((u) => u.role?.roleName === "Student");
//   const noRole = users.filter((u) => !u.role);

//   if (loading) {
//     return (
//       <Loader
//         height="80"
//         width="80"
//         color="#ff0000"
//         ariaLabel="triangle-loading"
//         wrapperStyle={{}}
//         wrapperClass=""
//         visible={true}
//         fullScreen={true}
//       />
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 mt-10 p-6">
//       <div className="max-w-7xl mx-auto">
//         {/* Header */}
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.6 }}
//           className="text-center mb-8"
//         >
//           <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
//             <UsersIcon className="w-8 h-8 text-white" />
//           </div>
//           <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-2">
//             User Management
//           </h1>
//           <p className="text-gray-600 text-lg">
//             Manage all users across your platform
//           </p>
//         </motion.div>

//         {users.length === 0 ? (
//           <div className="text-center py-12">
//             <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
//               <UsersIcon className="w-10 h-10 text-gray-400" />
//             </div>
//             <p className="text-gray-600 text-lg font-medium">No users found.</p>
//           </div>
//         ) : (
//           <div className="space-y-8">
//             {/* Stats Cards */}
//             <motion.div
//               initial={{ opacity: 0, y: 20 }}
//               animate={{ opacity: 1, y: 0 }}
//               transition={{ duration: 0.6, delay: 0.2 }}
//               className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
//             >
//               <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20 shadow-lg">
//                 <div className="text-2xl font-bold text-purple-600">
//                   {admins.length}
//                 </div>
//                 <div className="text-sm text-gray-600 font-medium">Admins</div>
//               </div>
//               <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20 shadow-lg">
//                 <div className="text-2xl font-bold text-orange-600">
//                   {teachers.length}
//                 </div>
//                 <div className="text-sm text-gray-600 font-medium">
//                   Teachers
//                 </div>
//               </div>
//               <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20 shadow-lg">
//                 <div className="text-2xl font-bold text-green-600">
//                   {students.length}
//                 </div>
//                 <div className="text-sm text-gray-600 font-medium">
//                   Students
//                 </div>
//               </div>
//               <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20 shadow-lg">
//                 <div className="text-2xl font-bold text-amber-600">
//                   {noRole.length}
//                 </div>
//                 <div className="text-sm text-gray-600 font-medium">
//                   Unassigned
//                 </div>
//               </div>
//             </motion.div>

//             {/* Admins Section */}
//             {admins.length > 0 && (
//               <motion.section
//                 initial={{ opacity: 0, y: 20 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 transition={{ duration: 0.5, delay: 0.3 }}
//               >
//                 <div className="flex items-center gap-3 mb-6">
//                   <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-700 rounded-xl flex items-center justify-center">
//                     <Crown className="w-4 h-4 text-white" />
//                   </div>
//                   <h2 className="text-2xl font-bold text-gray-900">
//                     Administrators
//                   </h2>
//                   <div className="flex-1 h-px bg-gradient-to-r from-purple-200 to-transparent"></div>
//                 </div>
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
//                   <AnimatePresence>
//                     {admins.map((u, index) => (
//                       <motion.div
//                         key={u._id}
//                         initial={{ opacity: 0, y: 20 }}
//                         animate={{ opacity: 1, y: 0 }}
//                         exit={{ opacity: 0, y: -20 }}
//                         transition={{ duration: 0.3, delay: index * 0.05 }}
//                         whileHover={{ y: -4, scale: 1.02 }}
//                         className="cursor-pointer"
//                       >
//                         <Card className="relative bg-white border-0 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
//                           <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

//                           {u.employeeId && (
//                             <div
//                               className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-semibold text-white ${getBadgeStyles(
//                                 u.role?.roleName || ""
//                               )} shadow-lg`}
//                             >
//                               <div className="flex items-center gap-1">
//                                 <span>{u.employeeId}</span>
//                                 <Crown className="w-3 h-3 text-yellow-300" />
//                               </div>
//                             </div>
//                           )}

//                           <div className="p-4">
//                             <div className="flex items-center gap-3 mb-4">
//                               <div className="relative">
//                                 <Image
//                                   src={getProfileImage(u) || "/placeholder.svg"}
//                                   alt={u.name}
//                                   width={40}
//                                   height={40}
//                                   className="w-10 h-10 rounded-full object-cover border-3 border-white shadow-md group-hover:scale-110 transition-transform duration-300"
//                                 />
//                                 <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white">
//                                   <ShieldCheck className="w-2 h-2 text-white m-0.5" />
//                                 </div>
//                               </div>
//                               <div className="flex-1 min-w-0">
//                                 <h3 className="font-semibold text-gray-900 truncate group-hover:text-purple-600 transition-colors">
//                                   {u.name}
//                                 </h3>
//                                 <Badge
//                                   className={`${getRoleBadgeStyles(
//                                     u.role?.roleName || ""
//                                   )} text-xs mt-1`}
//                                 >
//                                   {u.role?.roleName}
//                                 </Badge>
//                               </div>
//                             </div>
//                           </div>
//                         </Card>
//                       </motion.div>
//                     ))}
//                   </AnimatePresence>
//                 </div>
//               </motion.section>
//             )}

//             {/* Teachers Section */}
//             {teachers.length > 0 && (
//               <motion.section
//                 initial={{ opacity: 0, y: 20 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 transition={{ duration: 0.5, delay: 0.4 }}
//               >
//                 <div className="flex items-center gap-3 mb-6">
//                   <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
//                     <GraduationCap className="w-4 h-4 text-white" />
//                   </div>
//                   <h2 className="text-2xl font-bold text-gray-900">Teachers</h2>
//                   <div className="flex-1 h-px bg-gradient-to-r from-orange-200 to-transparent"></div>
//                 </div>
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
//                   <AnimatePresence>
//                     {teachers.map((u, index) => (
//                       <motion.div
//                         key={u._id}
//                         initial={{ opacity: 0, y: 20 }}
//                         animate={{ opacity: 1, y: 0 }}
//                         exit={{ opacity: 0, y: -20 }}
//                         transition={{ duration: 0.3, delay: index * 0.05 }}
//                         whileHover={{ y: -4, scale: 1.02 }}
//                         className="cursor-pointer"
//                       >
//                         <Card className="relative bg-white border-0 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
//                           <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

//                           {u.employeeId && (
//                             <div
//                               className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-semibold text-white ${getBadgeStyles(
//                                 u.role?.roleName || ""
//                               )} shadow-lg`}
//                             >
//                               {u.employeeId}
//                             </div>
//                           )}

//                           <div className="p-4">
//                             <div className="flex items-center gap-3 mb-4">
//                               <div className="relative">
//                                 <Image
//                                   src={getProfileImage(u) || "/placeholder.svg"}
//                                   alt={u.name}
//                                   width={40}
//                                   height={40}
//                                   className="w-10 h-10 rounded-full object-cover border-3 border-white shadow-md group-hover:scale-110 transition-transform duration-300"
//                                 />
//                                 <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white">
//                                   <ShieldCheck className="w-2 h-2 text-white m-0.5" />
//                                 </div>
//                               </div>
//                               <div className="flex-1 min-w-0">
//                                 <h3 className="font-semibold text-gray-900 truncate group-hover:text-orange-600 transition-colors">
//                                   {u.name}
//                                 </h3>
//                                 <Badge
//                                   className={`${getRoleBadgeStyles(
//                                     u.role?.roleName || ""
//                                   )} text-xs mt-1`}
//                                 >
//                                   {u.role?.roleName}
//                                 </Badge>
//                               </div>
//                             </div>
//                             <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-2 border border-orange-100">
//                               <div className="flex items-center gap-2">
//                                 <Book className="w-4 h-4 text-orange-600" />
//                                 <p className="text-xs text-gray-700 font-medium truncate">
//                                   {u.subjects?.join(", ") || "No subjects"}
//                                 </p>
//                               </div>
//                             </div>
//                           </div>
//                         </Card>
//                       </motion.div>
//                     ))}
//                   </AnimatePresence>
//                 </div>
//               </motion.section>
//             )}

//             {/* Students Section */}
//             {students.length > 0 && (
//               <motion.section
//                 initial={{ opacity: 0, y: 20 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 transition={{ duration: 0.5, delay: 0.5 }}
//               >
//                 <div className="flex items-center gap-3 mb-6">
//                   <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
//                     <UserCheck className="w-4 h-4 text-white" />
//                   </div>
//                   <h2 className="text-2xl font-bold text-gray-900">Students</h2>
//                   <div className="flex-1 h-px bg-gradient-to-r from-green-200 to-transparent"></div>
//                 </div>
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
//                   <AnimatePresence>
//                     {students.map((u, index) => (
//                       <motion.div
//                         key={u._id}
//                         initial={{ opacity: 0, y: 20 }}
//                         animate={{ opacity: 1, y: 0 }}
//                         exit={{ opacity: 0, y: -20 }}
//                         transition={{ duration: 0.3, delay: index * 0.05 }}
//                         whileHover={{ y: -4, scale: 1.02 }}
//                         className="cursor-pointer"
//                       >
//                         <Card className="relative bg-white border-0 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
//                           <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

//                           {u.studentId && (
//                             <div
//                               className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-semibold text-white ${getBadgeStyles(
//                                 u.role?.roleName || ""
//                               )} shadow-lg`}
//                             >
//                               {u.studentId}
//                             </div>
//                           )}

//                           <div className="p-4">
//                             <div className="flex items-center gap-3 mb-4">
//                               <div className="relative">
//                                 <Image
//                                   src={getProfileImage(u) || "/placeholder.svg"}
//                                   alt={u.name}
//                                   width={40}
//                                   height={40}
//                                   className="w-10 h-10 rounded-full object-cover border-3 border-white shadow-md group-hover:scale-110 transition-transform duration-300"
//                                 />
//                                 <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white">
//                                   <ShieldCheck className="w-2 h-2 text-white m-0.5" />
//                                 </div>
//                               </div>
//                               <div className="flex-1 min-w-0">
//                                 <h3 className="font-semibold text-gray-900 truncate group-hover:text-green-600 transition-colors">
//                                   {u.name}
//                                 </h3>
//                                 <Badge
//                                   className={`${getRoleBadgeStyles(
//                                     u.role?.roleName || ""
//                                   )} text-xs mt-1`}
//                                 >
//                                   {u.role?.roleName}
//                                 </Badge>
//                               </div>
//                             </div>
//                             <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-2 border border-green-100">
//                               <div className="flex items-center gap-2">
//                                 <Book className="w-4 h-4 text-green-600" />
//                                 <p className="text-xs text-gray-700 font-medium truncate">
//                                   {u.subjects?.join(", ") || "No subjects"}
//                                 </p>
//                               </div>
//                             </div>
//                           </div>
//                         </Card>
//                       </motion.div>
//                     ))}
//                   </AnimatePresence>
//                 </div>
//               </motion.section>
//             )}

//             {/* No Role Section */}
//             {noRole.length > 0 && (
//               <motion.section
//                 initial={{ opacity: 0, y: 20 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 transition={{ duration: 0.5, delay: 0.6 }}
//               >
//                 <div className="flex items-center gap-3 mb-6">
//                   <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
//                     <AlertTriangle className="w-4 h-4 text-white" />
//                   </div>
//                   <h2 className="text-2xl font-bold text-gray-900">
//                     Unassigned Users
//                   </h2>
//                   <div className="flex-1 h-px bg-gradient-to-r from-amber-200 to-transparent"></div>
//                 </div>
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
//                   <AnimatePresence>
//                     {noRole.map((u, index) => (
//                       <motion.div
//                         key={u._id}
//                         initial={{ opacity: 0, y: 20 }}
//                         animate={{ opacity: 1, y: 0 }}
//                         exit={{ opacity: 0, y: -20 }}
//                         transition={{ duration: 0.3, delay: index * 0.05 }}
//                         whileHover={{ y: -4, scale: 1.02 }}
//                         className="cursor-pointer"
//                       >
//                         <Card className="relative bg-white border-0 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
//                           <div
//                             className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
//                             onClick={() => handleCardClick(u._id)}
//                           ></div>

//                           {/* Clickable area for card navigation - excludes button */}
//                           <div
//                             className="p-4 pb-2 relative z-10"
//                             onClick={() => handleCardClick(u._id)}
//                           >
//                             <div className="flex items-center gap-3 mb-4">
//                               <div className="relative">
//                                 <Image
//                                   src={getProfileImage(u) || "/placeholder.svg"}
//                                   alt={u.name}
//                                   width={40}
//                                   height={40}
//                                   className="w-10 h-10 rounded-full object-cover border-3 border-white shadow-md group-hover:scale-110 transition-transform duration-300"
//                                 />
//                                 <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-white">
//                                   <ShieldAlert className="w-2 h-2 text-white m-0.5" />
//                                 </div>
//                               </div>
//                               <div className="flex-1 min-w-0">
//                                 <h3 className="font-semibold text-gray-900 truncate group-hover:text-amber-600 transition-colors">
//                                   {u.name}
//                                 </h3>
//                                 <Badge
//                                   className={`${getRoleBadgeStyles(
//                                     ""
//                                   )} text-xs mt-1`}
//                                 >
//                                   Not Assigned
//                                 </Badge>
//                               </div>
//                             </div>

//                             <div className="space-y-2 mb-4">
//                               <div className="flex items-center gap-2 text-xs text-gray-600">
//                                 <Mail className="w-3 h-3" />
//                                 <span className="truncate">{u.email}</span>
//                               </div>
//                               <div className="flex items-center gap-2 text-xs text-gray-600">
//                                 <Phone className="w-3 h-3" />
//                                 <span>{u.phone}</span>
//                               </div>
//                             </div>
//                           </div>

//                           {/* Button area - positioned above overlay */}
//                           {u._id !== user?._id && (
//                             <div className="px-4 pb-4 relative z-20">
//                               <Button
//                                 aria-label={`Assign role for ${u.name}`}
//                                 className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
//                                 onClick={() =>
//                                   router.push(
//                                     `/superadmin/assign-role?userId=${u._id}`
//                                   )
//                                 }
//                                 data-testid="assign-role-btn"
//                               >
//                                 Assign Role
//                               </Button>
//                             </div>
//                           )}
//                         </Card>
//                       </motion.div>
//                     ))}
//                   </AnimatePresence>
//                 </div>
//               </motion.section>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { ApiError } from "@/types";
import {
  Mail,
  Phone,
  Book,
  Crown,
  ShieldCheck,
  ShieldAlert,
  Users as UsersIcon,
  GraduationCap,
  UserCheck,
  AlertTriangle,
} from "lucide-react";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Loader from "@/components/Loader";

interface User {
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
}

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const handleUnauthorized = useCallback(() => {
    console.debug("[Users] Handling unauthorized access");
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
    try {
      const deviceId = localStorage.getItem("deviceId");
      const token = localStorage.getItem("token");
      if (!deviceId || !token) {
        console.debug("[Users] Missing deviceId or token", { deviceId, token });
        handleUnauthorized();
        return;
      }
      const response = await api.get("/admin/users", {
        headers: {
          "Device-Id": deviceId,
          Authorization: `Bearer ${token}`,
        },
      });
      setUsers(response.data.users || []);
    } catch (error) {
      const apiError = error as ApiError;
      console.error("[Users] Failed to fetch users:", apiError);
      if (apiError.response?.status === 401) {
        handleUnauthorized();
      } else {
        const errorMessage =
          apiError.response?.data?.message || "Failed to fetch users";
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [user, handleUnauthorized]);

  useEffect(() => {
    if (
      !user ||
      !["Admin", "Super Admin"].includes(user.role?.roleName || "")
    ) {
      console.debug("[Users] Redirecting due to invalid role or no user", {
        user: !!user,
        role: user?.role?.roleName,
      });
      handleUnauthorized();
      router.push("/my-learnings");
      return;
    }
    fetchUsers();
  }, [user, router, handleUnauthorized, fetchUsers]);

  const getProfileImage = (user: User): string => {
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
    return "https://res.cloudinary.com/dlie87ah0/image/upload/v1746686670/small_f1yzjb.png";
  };

  const getRoleBadgeStyles = (roleName: string) => {
    switch (roleName) {
      case "Admin":
        return "bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white";
      case "Super Admin":
        return "bg-gradient-to-r from-[#6B46C1] to-[#A855F7] text-white";
      case "Teacher":
        return "bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] text-white";
      case "Student":
        return "bg-gradient-to-r from-[#10B981] to-[#34D399] text-white";
      default:
        return "bg-amber-100 text-amber-700";
    }
  };

  const getBadgeStyles = (roleName: string) => {
    switch (roleName) {
      case "Admin":
        return "bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6]";
      case "Super Admin":
        return "bg-gradient-to-r from-[#6B46C1] to-[#A855F7]";
      case "Teacher":
        return "bg-gradient-to-r from-[#FBBF24] to-[#F59E0B]";
      case "Student":
        return "bg-gradient-to-r from-[#10B981] to-[#34D399]";
      default:
        return "bg-gradient-to-r from-[#FBBF24] to-[#F59E0B]";
    }
  };

  const handleCardClick = (userId: string) => {
    router.push(`/admin/users/${userId}`);
  };

  const admins = users
    .filter((u) => ["Admin", "Super Admin"].includes(u.role?.roleName ?? ""))
    .sort((a, b) => {
      if (a.role?.roleName === "Super Admin") return -1;
      if (b.role?.roleName === "Super Admin") return 1;
      return 0;
    });
  const teachers = users.filter((u) => u.role?.roleName === "Teacher");
  const students = users.filter((u) => u.role?.roleName === "Student");
  const noRole = users.filter((u) => !u.role);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6F0FA] via-[#F0F4FF] to-[#DDE7F9] mt-10 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] rounded-2xl mb-4 shadow-lg">
            <UsersIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#3B82F6] via-[#8B5CF6] to-[#A855F7] bg-clip-text text-transparent mb-2">
            User Management
          </h1>
          <p className="text-gray-600 text-lg">
            Manage all users across your platform
          </p>
        </motion.div>

        {users.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UsersIcon className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-600 text-lg font-medium">No users found.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
            >
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20 shadow-lg">
                <div className="text-2xl font-bold text-[#8B5CF6]">
                  {admins.length}
                </div>
                <div className="text-sm text-gray-600 font-medium">Admins</div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20 shadow-lg">
                <div className="text-2xl font-bold text-[#FBBF24]">
                  {teachers.length}
                </div>
                <div className="text-sm text-gray-600 font-medium">
                  Teachers
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20 shadow-lg">
                <div className="text-2xl font-bold text-[#10B981]">
                  {students.length}
                </div>
                <div className="text-sm text-gray-600 font-medium">
                  Students
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20 shadow-lg">
                <div className="text-2xl font-bold text-[#FBBF24]">
                  {noRole.length}
                </div>
                <div className="text-sm text-gray-600 font-medium">
                  Unassigned
                </div>
              </div>
            </motion.div>

            {/* Admins Section */}
            {admins.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-r from-[#6B46C1] to-[#A855F7] rounded-xl flex items-center justify-center">
                    <Crown className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Administrators
                  </h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-[#6B46C1]/20 to-transparent"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <AnimatePresence>
                    {admins.map((u, index) => (
                      <motion.div
                        key={u._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ y: -4, scale: 1.02 }}
                        className="cursor-pointer"
                      >
                        <Card className="relative bg-white border-0 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                          <div
                            className="absolute inset-0 bg-gradient-to-r from-[#6B46C1]/10 to-[#A855F7]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            onClick={() => handleCardClick(u._id)}
                          ></div>

                          {u.employeeId && (
                            <div
                              className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-semibold text-white ${getBadgeStyles(
                                u.role?.roleName || ""
                              )} shadow-lg`}
                            >
                              <div className="flex items-center gap-1">
                                <span>{u.employeeId}</span>
                                <Crown className="w-3 h-3 text-yellow-300" />
                              </div>
                            </div>
                          )}

                          <div
                            className="p-4"
                            onClick={() => handleCardClick(u._id)}
                          >
                            <div className="flex items-center gap-3 mb-4">
                              <div className="relative">
                                <Image
                                  src={getProfileImage(u) || "/placeholder.svg"}
                                  alt={u.name}
                                  width={40}
                                  height={40}
                                  className="w-10 h-10 rounded-full object-cover border-3 border-white shadow-md group-hover:scale-110 transition-transform duration-300"
                                />
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white">
                                  <ShieldCheck className="w-2 h-2 text-white m-0.5" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 truncate group-hover:text-[#8B5CF6] transition-colors">
                                  {u.name}
                                </h3>
                                <Badge
                                  className={`${getRoleBadgeStyles(
                                    u.role?.roleName || ""
                                  )} text-xs mt-1`}
                                >
                                  {u.role?.roleName}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.section>
            )}

            {/* Teachers Section */}
            {teachers.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] rounded-xl flex items-center justify-center">
                    <GraduationCap className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Teachers</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-[#FBBF24]/20 to-transparent"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <AnimatePresence>
                    {teachers.map((u, index) => (
                      <motion.div
                        key={u._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ y: -4, scale: 1.02 }}
                        className="cursor-pointer"
                      >
                        <Card className="relative bg-white border-0 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                          <div
                            className="absolute inset-0 bg-gradient-to-r from-[#FBBF24]/10 to-[#F59E0B]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            onClick={() => handleCardClick(u._id)}
                          ></div>

                          {u.employeeId && (
                            <div
                              className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-semibold text-white ${getBadgeStyles(
                                u.role?.roleName || ""
                              )} shadow-lg`}
                            >
                              {u.employeeId}
                            </div>
                          )}

                          <div
                            className="p-4"
                            onClick={() => handleCardClick(u._id)}
                          >
                            <div className="flex items-center gap-3 mb-4">
                              <div className="relative">
                                <Image
                                  src={getProfileImage(u) || "/placeholder.svg"}
                                  alt={u.name}
                                  width={40}
                                  height={40}
                                  className="w-10 h-10 rounded-full object-cover border-3 border-white shadow-md group-hover:scale-110 transition-transform duration-300"
                                />
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white">
                                  <ShieldCheck className="w-2 h-2 text-white m-0.5" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 truncate group-hover:text-[#FBBF24] transition-colors">
                                  {u.name}
                                </h3>
                                <Badge
                                  className={`${getRoleBadgeStyles(
                                    u.role?.roleName || ""
                                  )} text-xs mt-1`}
                                >
                                  {u.role?.roleName}
                                </Badge>
                              </div>
                            </div>
                            <div className="bg-gradient-to-r from-[#FEF3C7] to-[#FDE68A] rounded-xl p-2 border border-yellow-100">
                              <div className="flex items-center gap-2">
                                <Book className="w-4 h-4 text-[#F59E0B]" />
                                <p className="text-xs text-gray-700 font-medium truncate">
                                  {u.subjects?.join(", ") || "No subjects"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.section>
            )}

            {/* Students Section */}
            {students.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-r from-[#10B981] to-[#34D399] rounded-xl flex items-center justify-center">
                    <UserCheck className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Students</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-[#10B981]/20 to-transparent"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <AnimatePresence>
                    {students.map((u, index) => (
                      <motion.div
                        key={u._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ y: -4, scale: 1.02 }}
                        className="cursor-pointer"
                      >
                        <Card className="relative bg-white border-0 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                          <div
                            className="absolute inset-0 bg-gradient-to-r from-[#10B981]/10 to-[#34D399]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            onClick={() => handleCardClick(u._id)}
                          ></div>

                          {u.studentId && (
                            <div
                              className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-semibold text-white ${getBadgeStyles(
                                u.role?.roleName || ""
                              )} shadow-lg`}
                            >
                              {u.studentId}
                            </div>
                          )}

                          <div
                            className="p-4"
                            onClick={() => handleCardClick(u._id)}
                          >
                            <div className="flex items-center gap-3 mb-4">
                              <div className="relative">
                                <Image
                                  src={getProfileImage(u) || "/placeholder.svg"}
                                  alt={u.name}
                                  width={40}
                                  height={40}
                                  className="w-10 h-10 rounded-full object-cover border-3 border-white shadow-md group-hover:scale-110 transition-transform duration-300"
                                />
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white">
                                  <ShieldCheck className="w-2 h-2 text-white m-0.5" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 truncate group-hover:text-[#10B981] transition-colors">
                                  {u.name}
                                </h3>
                                <Badge
                                  className={`${getRoleBadgeStyles(
                                    u.role?.roleName || ""
                                  )} text-xs mt-1`}
                                >
                                  {u.role?.roleName}
                                </Badge>
                              </div>
                            </div>
                            <div className="bg-gradient-to-r from-[#D1FAE5] to-[#A7F3D0] rounded-xl p-2 border border-green-100">
                              <div className="flex items-center gap-2">
                                <Book className="w-4 h-4 text-[#10B981]" />
                                <p className="text-xs text-gray-700 font-medium truncate">
                                  {u.subjects?.join(", ") || "No subjects"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.section>
            )}

            {/* No Role Section */}
            {noRole.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Unassigned Users
                  </h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-[#FBBF24]/20 to-transparent"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <AnimatePresence>
                    {noRole.map((u, index) => (
                      <motion.div
                        key={u._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ y: -4, scale: 1.02 }}
                        className="cursor-pointer"
                      >
                        <Card className="relative bg-white border-0 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                          <div
                            className="absolute inset-0 bg-gradient-to-r from-[#FBBF24]/10 to-[#F59E0B]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            onClick={() => handleCardClick(u._id)}
                          ></div>

                          {/* Clickable area for card navigation - excludes button */}
                          <div
                            className="p-4 pb-2 relative z-10"
                            onClick={() => handleCardClick(u._id)}
                          >
                            <div className="flex items-center gap-3 mb-4">
                              <div className="relative">
                                <Image
                                  src={getProfileImage(u) || "/placeholder.svg"}
                                  alt={u.name}
                                  width={40}
                                  height={40}
                                  className="w-10 h-10 rounded-full object-cover border-3 border-white shadow-md group-hover:scale-110 transition-transform duration-300"
                                />
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-white">
                                  <ShieldAlert className="w-2 h-2 text-white m-0.5" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 truncate group-hover:text-[#FBBF24] transition-colors">
                                  {u.name}
                                </h3>
                                <Badge
                                  className={`${getRoleBadgeStyles(
                                    ""
                                  )} text-xs mt-1`}
                                >
                                  Not Assigned
                                </Badge>
                              </div>
                            </div>
                            <div className="space-y-2 mb-4">
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <Mail className="w-3 h-3" />
                                <span className="truncate">{u.email}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <Phone className="w-3 h-3" />
                                <span>{u.phone}</span>
                              </div>
                            </div>
                          </div>

                          {/* Button area - positioned above overlay */}
                          {u._id !== user?._id && (
                            <div className="px-4 pb-4 relative z-20">
                              <Button
                                aria-label={`Assign role for ${u.name}`}
                                className="w-full bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] hover:from-[#FBBF24]/90 hover:to-[#F59E0B]/90 text-white text-xs py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                                onClick={() =>
                                  router.push(
                                    `/admin/assign-role?userId=${u._id}`
                                  )
                                }
                                data-testid="assign-role-btn"
                              >
                                Assign Role
                              </Button>
                            </div>
                          )}
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
