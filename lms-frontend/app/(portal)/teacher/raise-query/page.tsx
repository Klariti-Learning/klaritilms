"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api from "@/lib/api";
import {
  Plus,
  Filter,
  SortAsc,
  ChevronDown,
  TicketIcon,
  Clock,
  User,
  FileText,
  CheckCircle,
  AlertCircle,
  XCircle,
  Check,
  Star,
} from "lucide-react";
import type { ApiError, Ticket } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const useDebounce = <T extends (ticketId: string, rating: number) => void>(
  callback: T,
  delay: number
) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (ticketId: string, rating: number) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        callback(ticketId, rating);
      }, delay);
    },
    [callback, delay]
  );
};

const RaiseQueryPage = () => {
  const { user, loading: authLoading, deviceId } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Raised Date");
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [selectedRatings, setSelectedRatings] = useState<{
    [key: string]: number;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  const handleUnauthorized = useCallback(() => {
    console.debug("[RaiseQueryPage] Handling unauthorized access");
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
        "[RaiseQueryPage] Redirecting due to invalid role or no user",
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
    const fetchTickets = async () => {
      if (!user?._id) return;
      try {
        const token = localStorage.getItem("token");
        if (!token || !deviceId) {
          console.debug(
            "[RaiseQueryPage] Missing token or deviceId in fetchTickets",
            { token, deviceId }
          );
          handleUnauthorized();
          return;
        }
        const response = await api.get(`/tickets?page=${page}&limit=${limit}`);
        const { tickets: fetchedTickets, pages } = response.data;
        setTickets(fetchedTickets || []);
        setTotalPages(pages || 1);
      } catch (error) {
        const apiError = error as ApiError;
        console.error("[RaiseQueryPage] Error fetching tickets:", apiError);
        if (apiError.response?.status === 401) {
          handleUnauthorized();
        } else {
          toast.error(
            apiError.response?.data?.message || "Failed to load tickets"
          );
        }
        setTickets([]);
      }
    };
    fetchTickets();
  }, [user, page, deviceId, handleUnauthorized]);

  const submitRating = useCallback(
    async (ticketId: string, rating: number) => {
      try {
        const token = localStorage.getItem("token");
        if (!token || !deviceId) {
          console.debug(
            "[RaiseQueryPage] Missing token or deviceId in submitRating",
            { token, deviceId }
          );
          handleUnauthorized();
          return;
        }
        setIsSubmitting((prev) => ({ ...prev, [ticketId]: true }));
        await api.put(`/tickets/${ticketId}/rate`, { rating });
        setTickets((prevTickets) =>
          prevTickets.map((ticket) =>
            ticket._id === ticketId ? { ...ticket, rating } : ticket
          )
        );
        toast.success("Rating submitted successfully");
      } catch (error) {
        const apiError = error as ApiError;
        console.error("[RaiseQueryPage] Error submitting rating:", apiError);
        if (apiError.response?.status === 401) {
          handleUnauthorized();
        } else {
          toast.error(
            apiError.response?.data?.message || "Failed to submit rating"
          );
        }
        setSelectedRatings((prev) => {
          const newRatings = { ...prev };
          delete newRatings[ticketId];
          return newRatings;
        });
      } finally {
        setIsSubmitting((prev) => ({ ...prev, [ticketId]: false }));
      }
    },
    [deviceId, handleUnauthorized]
  );

  const debouncedSubmitRating = useDebounce(submitRating, 500);

  const handleRatingClick = (ticketId: string, rating: number) => {
    setSelectedRatings((prev) => ({ ...prev, [ticketId]: rating }));
    debouncedSubmitRating(ticketId, rating);
  };

  const handleCreateNewTicket = () => {
    router.push("/teacher/raise-query/new");
  };

  const handleClearFilters = () => {
    setStatusFilter("All");
    setCategoryFilter("All");
    setSortBy("Raised Date");
  };

  const toggleExpandTicket = (ticketId: string) => {
    setExpandedTicketId(expandedTicketId === ticketId ? null : ticketId);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getLastActivity = (ticket: Ticket) => {
    return ticket.updatedAt && ticket.updatedAt !== ticket.createdAt
      ? formatDate(ticket.updatedAt)
      : formatDate(ticket.createdAt);
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return <AlertCircle className="w-4 h-4" />;
      case "in-progress":
        return <Clock className="w-4 h-4" />;
      case "resolved":
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <XCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "in-progress":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "resolved":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const sortOptions = [
    { value: "Raised Date", label: "Raised Date", icon: Clock },
    { value: "Recently Updated", label: "Recently Updated", icon: AlertCircle },
    { value: "Category", label: "Category", icon: Filter },
    { value: "Status", label: "Status", icon: CheckCircle },
  ];

  const statusOptions = [
    { value: "All", label: "All Status", icon: TicketIcon },
    { value: "Open", label: "Open", icon: AlertCircle },
    { value: "In-progress", label: "In Progress", icon: Clock },
    { value: "Resolved", label: "Resolved", icon: CheckCircle },
  ];

  const categoryOptions = [
    { value: "All", label: "All Categories", icon: Filter },
    { value: "Parent Tickets", label: "Parent Tickets", icon: User },
    { value: "Customer Support", label: "Customer Support", icon: FileText },
    { value: "Technical", label: "Technical", icon: FileText },
    { value: "Payment", label: "Payment", icon: FileText },
    { value: "Timezone Change Request", label: "Timezone Change Request", icon: Clock },
    { value: "Other", label: "Other", icon: FileText },
  ];

  const filteredTickets = useMemo(() => {
    return tickets
      .filter((ticket) => {
        if (statusFilter === "All") return true;
        return ticket.status.toLowerCase() === statusFilter.toLowerCase();
      })
      .filter((ticket) => {
        if (categoryFilter === "All") return true;
        return ticket.issueType.toLowerCase() === categoryFilter.toLowerCase();
      })
      .sort((a, b) => {
        if (sortBy === "Raised Date" || sortBy === "Raised at") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else if (sortBy === "Recently Updated") {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        } else if (sortBy === "Category") {
          return a.issueType.localeCompare(b.issueType);
        } else if (sortBy === "Status") {
          return a.status.localeCompare(b.status);
        }
        return 0;
      });
  }, [tickets, statusFilter, categoryFilter, sortBy]);

  return (
    <div className="min-h-screen bg-blue-50 p-4 md:p-6 lg:p-8 ">
      <div className="max-w-7xl mx-auto">
        {/* Header with welcome banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mt-4 overflow-hidden rounded-2xl bg-blue-600 p-8 text-white shadow-xl flex justify-between items-center"
        >
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-4 right-4 opacity-30">
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-blue-300 rounded-full animate-pulse"></div>
              <div className="w-3 h-3 bg-blue-300 rounded-full animate-pulse delay-75"></div>
              <div className="w-3 h-3 bg-blue-300 rounded-full animate-pulse delay-150"></div>
            </div>
          </div>
          <div className="relative flex flex-col">
            <div className="flex items-center gap-3">
              <TicketIcon className="w-10 h-10 text-white-400" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 bg-clip-text text-white">
                Teacher Support Tickets
              </h1>
            </div>
            <p className="text-lg text-gray-300 mt-2">
              Manage your support requests and track their progress
            </p>
          </div>
        </motion.div>

        <motion.div className="flex mt-4 mb-4 justify-end">
          <Button
            onClick={handleCreateNewTicket}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-base z-10"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create New Ticket
          </Button>
        </motion.div>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between">
              <div className="flex flex-wrap gap-5 items-center">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <SortAsc className="w-6 h-5 text-blue-500" />
                    <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                      Sort:
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="min-w-[160px] justify-between bg-white border-blue-200 hover:bg-blue-50 hover:border-blue-300 shadow-sm rounded-xl px-6 py-3 h-auto cursor-pointer"
                      >
                        <div className="flex items-center gap-1">
                          {(() => {
                            const option = sortOptions.find(
                              (opt) => opt.value === sortBy
                            );
                            const IconComponent = option?.icon || Clock;
                            return (
                              <>
                                <IconComponent className="w-4 h-4 text-blue-500" />
                                <span className="text-sm font-medium text-gray-700">
                                  {option?.label}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                        <ChevronDown className="w-4 h-4 text-blue-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-[180px] bg-white border-blue-200 shadow-xl rounded-xl p-2"
                    >
                      {sortOptions.map((option) => {
                        const IconComponent = option.icon;
                        return (
                          <DropdownMenuItem
                            key={option.value}
                            onClick={() => setSortBy(option.value)}
                            className="flex items-center justify-between cursor-pointer px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <IconComponent className="w-4 h-4 text-blue-500" />
                              <span className="text-sm font-medium text-gray-700">
                                {option.label}
                              </span>
                            </div>
                            {sortBy === option.value && (
                              <Check className="w-4 h-4 text-blue-600" />
                            )}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                      Status:
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="min-w-[140px] justify-between bg-white border-blue-200 hover:bg-blue-50 hover:border-blue-300 shadow-sm rounded-xl px-4 py-3 h-auto cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          {(() => {
                            const option = statusOptions.find(
                              (opt) => opt.value === statusFilter
                            );
                            const IconComponent = option?.icon || TicketIcon;
                            return (
                              <>
                                <IconComponent className="w-4 h-4 text-blue-500" />
                                <span className="text-sm font-medium text-gray-700">
                                  {option?.label}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                        <ChevronDown className="w-4 h-4 text-blue-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-[160px] bg-white border-blue-200 shadow-xl rounded-xl p-2"
                    >
                      {statusOptions.map((option) => {
                        const IconComponent = option.icon;
                        return (
                          <DropdownMenuItem
                            key={option.value}
                            onClick={() => setStatusFilter(option.value)}
                            className="flex items-center justify-between cursor-pointer px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <IconComponent className="w-4 h-4 text-blue-500" />
                              <span className="text-sm font-medium text-gray-700">
                                {option.label}
                              </span>
                            </div>
                            {statusFilter === option.value && (
                              <Check className="w-4 h-4 text-blue-600" />
                            )}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                    Category:
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="min-w-[200px] justify-between bg-white border-blue-200 hover:bg-blue-50 hover:border-blue-300 shadow-sm rounded-xl px-4 py-3 h-auto cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          {(() => {
                            const option = categoryOptions.find(
                              (opt) => opt.value === categoryFilter
                            );
                            const IconComponent = option?.icon || Filter;
                            return (
                              <>
                                <IconComponent className="w-4 h-4 text-blue-500" />
                                <span className="text-sm font-medium text-gray-700 truncate">
                                  {option?.label}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                        <ChevronDown className="w-4 h-4 text-blue-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-[240px] bg-white border-blue-200 shadow-xl rounded-xl p-3 max-h-[300px] overflow-y-auto scrollbar-hidden"
                    >
                      {categoryOptions.map((option) => {
                        const IconComponent = option.icon;
                        return (
                          <DropdownMenuItem
                            key={option.value}
                            onClick={() => setCategoryFilter(option.value)}
                            className="flex items-center justify-between cursor-pointer px-4 py-3 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            <div className="flex items-center gap-3 w-full">
                              <IconComponent className="w-4 h-4 text-blue-500 flex-shrink-0" />
                              <span className="text-sm font-medium text-gray-700 truncate">
                                {option.label}
                              </span>
                            </div>
                            {categoryFilter === option.value && (
                              <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            )}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <Button
                  onClick={handleClearFilters}
                  variant="outline"
                  className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 font-semibold px-6 py-3 whitespace-nowrap rounded-xl shadow-sm"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {filteredTickets.length > 0 ? (
            filteredTickets.map((ticket) => (
              <motion.div
                key={ticket._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Card
                  className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  <CardContent
                    className="p-6"
                    onClick={(e) => {
                      if (!(e.target as HTMLElement).closest(".star-rating")) {
                        toggleExpandTicket(ticket._id);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-blue-100 rounded-xl">
                            <TicketIcon className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                              Ticket {ticket.ticketNumber}
                            </h3>
                            <p className="text-gray-700 mb-3 leading-relaxed">
                              {ticket.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>
                                  Created: {formatDate(ticket.createdAt)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                <span>
                                  Last Activity: {getLastActivity(ticket)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <Badge
                            className={`${getStatusColor(
                              ticket.status
                            )} border flex items-center gap-2 px-3 py-1.5 text-sm font-medium`}
                          >
                            {getStatusIcon(ticket.status)}
                            {ticket.status}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-blue-600 border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium"
                          >
                            {ticket.issueType}
                          </Badge>
                          {ticket.teacher && (
                            <Badge
                              variant="outline"
                              className="text-indigo-600 border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium"
                            >
                              Assigned to: {ticket.teacher.name}
                            </Badge>
                          )}
                        </div>

                        {ticket.status === "Resolved" && (
                          <div className="star-rating flex items-center gap-3 pt-3 border-t border-gray-200">
                            <span className="text-sm font-semibold text-gray-700">
                              Rate this support:
                            </span>
                            {isSubmitting[ticket._id] ? (
                              <span className="text-sm text-blue-500">
                                Submitting...
                              </span>
                            ) : (
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRatingClick(ticket._id, star);
                                    }}
                                    className={`w-6 h-6 cursor-pointer transition-all duration-200 ${
                                      star <=
                                      (selectedRatings[ticket._id] ||
                                        ticket.rating ||
                                        0)
                                        ? "text-yellow-400 fill-yellow-400 scale-110"
                                        : "text-gray-300 hover:text-yellow-300 hover:scale-105"
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="ml-6">
                        <ChevronDown
                          className={`w-6 h-6 text-blue-400 transform transition-transform duration-300 ${
                            expandedTicketId === ticket._id ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedTicketId === ticket._id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="mt-6 pt-6 border-t border-gray-200"
                        >
                          <h4 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-500" />
                            Ticket Details
                          </h4>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-4">
                              <div>
                                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                  Ticket No.
                                </span>
                                <p className="text-sm text-gray-900 font-mono bg-blue-50 px-3 py-2 rounded-lg mt-2">
                                  {ticket.ticketNumber}
                                </p>
                              </div>
                              <div>
                                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                  Issue Type
                                </span>
                                <p className="text-sm text-gray-900 mt-2">
                                  {ticket.issueType}
                                </p>
                              </div>
                              <div>
                                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                  Visible to Teacher
                                </span>
                                <p className="text-sm text-gray-900 mt-2">
                                  {ticket.visibleToTeacher ? "Yes" : "No"}
                                </p>
                              </div>
                              <div>
                                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                  Assigned Teacher
                                </span>
                                <p className="text-sm text-gray-900 mt-2">
                                  {ticket.teacher?.name || "Not Assigned"}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div>
                                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                  Student
                                </span>
                                <p className="text-sm text-gray-900 mt-2">
                                  {ticket.user.name} ({ticket.user.email})
                                </p>
                              </div>
                              <div>
                                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                  Response
                                </span>
                                <p className="text-sm text-gray-900 mt-2 bg-blue-50 p-4 rounded-lg leading-relaxed">
                                  {ticket.response || "No response yet"}
                                </p>
                              </div>
                              {ticket.fileUrl && (
                                <div>
                                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                    Attachment
                                  </span>
                                  <div className="mt-2">
                                    <a
                                      href={ticket.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                    >
                                      <FileText className="w-4 h-4" />
                                      View Attachment
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          ) : (
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-16 text-center">
                <TicketIcon className="w-20 h-20 text-blue-200 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  No tickets found
                </h3>
                <p className="text-gray-600 mb-8 text-lg">
                  {statusFilter !== "All" || categoryFilter !== "All"
                    ? "Try adjusting your filters"
                    : "You haven't created any support tickets yet"}
                </p>
                <Button
                  onClick={handleCreateNewTicket}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-base rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Ticket
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center mt-8 space-x-4">
            <Button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="bg-blue-600 text-white py-2 px-4 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-all duration-200 cursor-pointer"
            >
              Previous
            </Button>
            <span className="text-gray-700 font-semibold">
              Page {page} of {totalPages}
            </span>
            <Button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="bg-blue-600 text-white py-2 px-4 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-all duration-200 cursor-pointer"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RaiseQueryPage;