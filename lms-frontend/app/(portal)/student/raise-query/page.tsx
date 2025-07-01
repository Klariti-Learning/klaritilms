"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api from "@/lib/api";
import {
  Star,
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
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [selectedRatings, setSelectedRatings] = useState<{
    [key: string]: number;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState<{ [key: string]: boolean }>(
    {}
  );

  const handleUnauthorized = useCallback(() => {
    console.debug("[RaiseQueryPage] Handling unauthorized access");
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("isLoggedIn");
    toast.error("Session expired. Please log in again.");
    router.push("/login");
  }, [router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !user?.role || user?.role?.roleName !== "Student") {
      handleUnauthorized();
    }
  }, [user, authLoading, router, handleUnauthorized]);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token || !deviceId) {
          handleUnauthorized();
          return;
        }
        const response = await api.get("/tickets");
        const data = response.data.tickets || [];
        setTickets([...data]);
      } catch (error) {
        console.error("[RaiseQueryPage] Error fetching tickets:", error);
        const errorMessage = error as ApiError;
        if (errorMessage.response?.status === 401) {
          handleUnauthorized();
        } else {
          toast.error(
            errorMessage.response?.data?.message || "Failed to load tickets"
          );
        }
      }
    };

    fetchTickets();
  }, [deviceId, handleUnauthorized]);

  const submitRating = useCallback(
    async (ticketId: string, rating: number) => {
      try {
        const token = localStorage.getItem("token");
        if (!token || !deviceId) {
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
        console.error("[RaiseQueryPage] Error submitting rating:", error);
        const errorMessage = error as ApiError;
        if (errorMessage.response?.status === 401) {
          handleUnauthorized();
        } else {
          toast.error(
            errorMessage.response?.data?.message || "Failed to submit rating"
          );
          setSelectedRatings((prev) => {
            const newRatings = { ...prev };
            delete newRatings[ticketId];
            return newRatings;
          });
        }
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
    router.push("/student/raise-query/new");
  };

  const handleClearFilters = () => {
    setStatusFilter("All");
    setCategoryFilter("All");
    setSortBy("Raised Date");
    setSearchTerm("");
  };

  const toggleExpandTicket = (ticketId: string) => {
    setExpandedTicketId(expandedTicketId === ticketId ? null : ticketId);
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
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "in-progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
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
    {
      value: "Teacher Change Request",
      label: "Teacher Change Request",
      icon: User,
    },
    {
      value: "Timezone Change Request",
      label: "Timezone Change Request",
      icon: Clock,
    },
    { value: "Other", label: "Other", icon: FileText },
  ];

  const filteredTickets = tickets
    .filter((ticket) => {
      if (statusFilter === "All") return true;
      return ticket.status.toLowerCase() === statusFilter.toLowerCase();
    })
    .filter((ticket) => {
      if (categoryFilter === "All") return true;
      return ticket.issueType.toLowerCase() === categoryFilter.toLowerCase();
    })
    .filter((ticket) => {
      if (!searchTerm) return true;
      return (
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.issueType.toLowerCase().includes(searchTerm.toLowerCase())
      );
    })
    .sort((a, b) => {
      if (sortBy === "Raised Date" || sortBy === "Raised at") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      } else if (sortBy === "Recently Updated") {
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      } else if (sortBy === "Category") {
        return a.issueType.localeCompare(b.issueType);
      } else if (sortBy === "Status") {
        return a.status.localeCompare(b.status);
      }
      return 0;
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-6 lg:p-8 mt-16">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">
                Support Tickets
              </h1>
              <p className="text-lg text-gray-600">
                Manage your support requests and track their progress
              </p>
            </div>
            <Button
              onClick={handleCreateNewTicket}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-base"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Ticket
            </Button>
          </div>
        </div>

        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between">
              <div className="flex flex-wrap gap-5 items-center">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <SortAsc className="w-6 h-5 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                      Sort:
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="min-w-[160px] justify-between bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm rounded-xl px-6 py-3 h-auto cursor-pointer"
                      >
                        <div className="flex items-center gap-1">
                          {(() => {
                            const option = sortOptions.find(
                              (opt) => opt.value === sortBy
                            );
                            const IconComponent = option?.icon || Clock;
                            return (
                              <>
                                <IconComponent className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">
                                  {option?.label}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-[180px] bg-white border-gray-200 shadow-xl rounded-xl p-2"
                    >
                      {sortOptions.map((option) => {
                        const IconComponent = option.icon;
                        return (
                          <DropdownMenuItem
                            key={option.value}
                            onClick={() => setSortBy(option.value)}
                            className="flex items-center justify-between cursor-pointer px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <IconComponent className="w-4 h-4 text-gray-500" />
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
                    <Filter className="w-5 h-5 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                      Status:
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="min-w-[140px] justify-between bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm rounded-xl px-4 py-3 h-auto cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          {(() => {
                            const option = statusOptions.find(
                              (opt) => opt.value === statusFilter
                            );
                            const IconComponent = option?.icon || TicketIcon;
                            return (
                              <>
                                <IconComponent className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">
                                  {option?.label}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-[160px] bg-white border-gray-200 shadow-xl rounded-xl p-2"
                    >
                      {statusOptions.map((option) => {
                        const IconComponent = option.icon;
                        return (
                          <DropdownMenuItem
                            key={option.value}
                            onClick={() => setStatusFilter(option.value)}
                            className="flex items-center justify-between cursor-pointer px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <IconComponent className="w-4 h-4 text-gray-500" />
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
                        className="min-w-[200px] justify-between bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm rounded-xl px-4 py-3 h-auto cursor-pointer" // Increased min-width
                      >
                        <div className="flex items-center gap-2">
                          {(() => {
                            const option = categoryOptions.find(
                              (opt) => opt.value === categoryFilter
                            );
                            const IconComponent = option?.icon || Filter;
                            return (
                              <>
                                <IconComponent className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700 truncate">
                                  {option?.label}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-[240px] bg-white border-gray-200 shadow-xl rounded-xl p-3 max-h-[300px] overflow-y-auto scrollbar-hidden" // Increased width, added max-height and scrollbar-hidden
                    >
                      {categoryOptions.map((option) => {
                        const IconComponent = option.icon;
                        return (
                          <DropdownMenuItem
                            key={option.value}
                            onClick={() => setCategoryFilter(option.value)}
                            className="flex items-center justify-between cursor-pointer px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-3 w-full">
                              <IconComponent className="w-4 h-4 text-gray-500 flex-shrink-0" />
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
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden">
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
                              Ticket #{ticket.ticketNumber}
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
                            className="text-gray-600 border-gray-300 px-3 py-1.5 text-sm font-medium"
                          >
                            {ticket.issueType}
                          </Badge>
                          {ticket.teacher && (
                            <Badge
                              variant="outline"
                              className="text-purple-600 border-purple-200 bg-purple-50 px-3 py-1.5 text-sm font-medium"
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
                              <span className="text-sm text-gray-500">
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
                                        ? "text-yellow-500 fill-yellow-500 scale-110"
                                        : "text-gray-300 hover:text-yellow-400 hover:scale-105"
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
                          className={`w-6 h-6 text-gray-400 transform transition-transform duration-300 ${
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
                            <FileText className="w-5 h-5" />
                            Ticket Details
                          </h4>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-4">
                              <div>
                                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                  Ticket ID
                                </span>
                                <p className="text-sm text-gray-900 font-mono bg-gray-100 px-3 py-2 rounded-lg mt-2">
                                  {ticket._id}
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
                                <p className="text-sm text-gray-900 mt-2 bg-gray-100 p-4 rounded-lg leading-relaxed">
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
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-16 text-center">
                <TicketIcon className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  No tickets found
                </h3>
                <p className="text-gray-600 mb-8 text-lg">
                  {searchTerm ||
                  statusFilter !== "All" ||
                  categoryFilter !== "All"
                    ? "Try adjusting your filters or search terms"
                    : "You haven't created any support tickets yet"}
                </p>
                <Button
                  onClick={handleCreateNewTicket}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-8 py-4 text-base rounded-xl"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Ticket
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default RaiseQueryPage;
