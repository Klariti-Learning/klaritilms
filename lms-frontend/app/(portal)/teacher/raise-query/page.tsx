"use client";

import type React from "react";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { Star, ChevronDown, Check } from "lucide-react";
import type { ApiError, Ticket } from "@/types";

interface DropdownOption {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  value: string;
  onValueChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  value,
  onValueChange,
  options,
  placeholder = "Select an option",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="border border-gray-300 rounded-full px-4 py-2 text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200 hover:bg-gray-50 cursor-pointer flex items-center justify-between min-w-[120px]"
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown
          className={`h-4 w-4 ml-2 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg animate-slide-in">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onValueChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors duration-150 cursor-pointer first:rounded-t-lg last:rounded-b-lg ${
                value === option.value
                  ? "bg-blue-500 text-white"
                  : "text-gray-900 hover:bg-blue-50 hover:text-blue-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{option.label}</span>
                {value === option.value && <Check className="h-4 w-4" />}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

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
            {
              token,
              deviceId,
            }
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
            {
              token,
              deviceId,
            }
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
  }, [tickets, statusFilter, categoryFilter, sortBy]);

  // Dropdown options
  const sortOptions = [
    { value: "Raised Date", label: "Raised Date" },
    { value: "Raised at", label: "Raised at" },
    { value: "Recently Updated", label: "Recently Updated" },
    { value: "Category", label: "Category" },
    { value: "Status", label: "Status" },
  ];

  const statusOptions = [
    { value: "All", label: "All" },
    { value: "Open", label: "Open" },
    { value: "In-progress", label: "In-progress" },
    { value: "Resolved", label: "Resolved" },
  ];

  const categoryOptions = [
    { value: "All", label: "All" },
    { value: "Parent Tickets", label: "Parent Tickets" },
    { value: "Customer Support", label: "Customer Support" },
    { value: "Technical", label: "Technical" },
    { value: "Payment", label: "Payment" },
    { value: "Timezone Change Request", label: "Timezone Change Request" },
    { value: "Other", label: "Other" },
  ];

  return (
    <div className="p-4 sm:p-8 bg-gradient-to-br from-gray-100 to-gray-200 min-h-screen mt-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={handleCreateNewTicket}
            className="bg-gradient-to-r from-red-600 to-red-700 text-white uppercase font-semibold py-3 px-8 rounded-full shadow-lg hover:from-red-700 hover:to-red-800 hover:scale-105 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
          >
            Create New Ticket
          </button>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center mb-10 bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center space-x-4 mb-9 sm:mb-0">
            <span className="text-gray-800 font-semibold text-sm">
              Sort by:
            </span>
            <CustomDropdown
              value={sortBy}
              onValueChange={setSortBy}
              options={sortOptions}
              placeholder="Sort by"
              className="min-w-[180px]" // Adjust width as needed
            />
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <span className="text-gray-800 font-semibold text-sm">
                Status:
              </span>
              <CustomDropdown
                value={statusFilter}
                onValueChange={setStatusFilter}
                options={statusOptions}
                placeholder="Status"
                className="min-w-[130px]"
              />
            </div>
            <div className="flex items-center space-x-5 min-w-[200px]">
              <span className="text-gray-800 mifont-semibold text-sm">
                Category:
              </span>
              <CustomDropdown
                value={categoryFilter}
                onValueChange={setCategoryFilter}
                options={categoryOptions}
                placeholder="Category"
                className="min-w-[190px]"
              />
            </div>
            <button
              onClick={handleClearFilters}
              className="text-blue-600 text-sm font-semibold hover:text-blue-800 transition-colors duration-200 cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {filteredTickets.length > 0 ? (
            filteredTickets.map((ticket) => (
              <motion.div
                key={ticket._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 cursor-pointer"
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest(".star-rating")) {
                    toggleExpandTicket(ticket._id);
                  }
                }}
              >
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      Ticket {ticket.ticketNumber} - {ticket.description}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      <span className="font-semibold">Last Activity: </span>
                      {getLastActivity(ticket)}
                    </p>
                    <p className="text-gray-600 text-sm">
                      <span className="font-semibold">Created on: </span>
                      {formatDate(ticket.createdAt)}
                    </p>
                    <p className="text-gray-600 text-sm">
                      <span className="font-semibold">Status: </span>
                      <span
                        className={
                          ticket.status === "Open"
                            ? "bg-yellow-100 text-yellow-800 inline-block px-3 py-1 rounded-full text-xs font-medium"
                            : ticket.status === "In-progress"
                            ? "bg-blue-100 text-blue-800 inline-block px-3 py-1 rounded-full text-xs font-medium"
                            : ticket.status === "Resolved"
                            ? "bg-green-100 text-green-800 inline-block px-3 py-1 rounded-full text-xs font-medium"
                            : "bg-gray-100 text-gray-800 inline-block px-3 py-1 rounded-full text-xs font-medium"
                        }
                      >
                        {ticket.status}
                      </span>
                    </p>
                    {ticket.status === "Resolved" && (
                      <p className="text-gray-600 text-sm star-rating">
                        <span className="font-semibold">Give Rating: </span>
                        {isSubmitting[ticket._id] ? (
                          <span className="text-gray-500">Submitting...</span>
                        ) : (
                          [1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRatingClick(ticket._id, star);
                              }}
                              className={`inline-block cursor-pointer w-6 h-6 ${
                                star <=
                                (selectedRatings[ticket._id] ||
                                  ticket.rating ||
                                  0)
                                  ? "text-yellow-500 fill-yellow-500"
                                  : "text-gray-300 fill-transparent"
                              }`}
                            />
                          ))
                        )}
                      </p>
                    )}
                  </div>
                  <div>
                    <svg
                      className={`w-6 h-6 text-gray-500 transform transition-transform duration-300 ${
                        expandedTicketId === ticket._id ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedTicketId === ticket._id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-4 border-t border-gray-200 pt-4"
                    >
                      <h4 className="text-md font-semibold text-gray-800 mb-2">
                        Ticket Details
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                        <div>
                          <p>
                            <span className="font-semibold">Ticket ID: </span>
                            {ticket._id}
                          </p>
                          <p>
                            <span className="font-semibold">Issue Type: </span>
                            {ticket.issueType}
                          </p>
                        </div>
                        <div>
                          <p>
                            <span className="font-semibold">User: </span>
                            {ticket.user.name} ({ticket.user.email})
                          </p>
                          <p>
                            <span className="font-semibold">Response: </span>
                            {ticket.response || "No response yet"}
                          </p>
                          {ticket.fileUrl && (
                            <p>
                              <span className="font-semibold">
                                Attachment:{" "}
                              </span>
                              <a
                                href={ticket.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                View File
                              </a>
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          ) : (
            <p className="text-gray-600 text-center text-lg">
              No tickets found.
            </p>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center mt-8 space-x-4">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="bg-blue-600 text-white py-2 px-4 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-all duration-200 cursor-pointer"
            >
              Previous
            </button>
            <span className="text-gray-700 font-semibold">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="bg-blue-600 text-white py-2 px-4 rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition-all duration-200 cursor-pointer"
            >
              Next
            </button>
          </div>
        )}

        <style jsx>{`
          @keyframes slide-in {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-slide-in {
            animation: slide-in 0.2s ease-out;
          }
        `}</style>
      </div>
    </div>
  );
};

export default RaiseQueryPage;
