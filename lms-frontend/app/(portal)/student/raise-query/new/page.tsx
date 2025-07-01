"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { AnimatePresence, motion } from "framer-motion";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { ApiError } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CreateTicketPage = () => {
const { user, loading: authLoading, deviceId } = useAuth();
  const router = useRouter();
  const [issueRelatedTo, setIssueRelatedTo] =
    useState<string>("Customer Support");
  const [subject, setSubject] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [descriptionError, setDescriptionError] = useState<string>("");
  const [isVisibleToTeacher, setIsVisibleToTeacher] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [currentFont, setCurrentFont] = useState<string>("Arial");
  const [currentFontSize, setCurrentFontSize] = useState<string>("14");
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [isUnderline, setIsUnderline] = useState<boolean>(false);
  const [isTeacherChangeModalOpen, setIsTeacherChangeModalOpen] =
    useState<boolean>(false);
  const [isClassPauseModalOpen, setIsClassPauseModalOpen] =
    useState<boolean>(false);
  const [isTimeChangeModalOpen, setIsTimeChangeModalOpen] =
    useState<boolean>(false);
  const [selectedTeacherReason, setSelectedTeacherReason] =
    useState<string>("");
  const [selectedTimeReason, setSelectedTimeReason] = useState<string>("");
  const [modalDescription, setModalDescription] = useState<string>("");
  const [modalDescriptionError, setModalDescriptionError] =
    useState<string>("");
  const [error, setError] = useState<string>("");
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUnauthorized = useCallback(() => {
  console.debug("[CreateTicketPage] Handling unauthorized access");
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

  const updateFormattingState = () => {
    setIsBold(document.queryCommandState("bold"));
    setIsItalic(document.queryCommandState("italic"));
    setIsUnderline(document.queryCommandState("underline"));
  };

  const getPlainText = (html: string) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  };

  const handleDescriptionInput = () => {
    if (editorRef.current) {
      const plainText = getPlainText(editorRef.current.innerHTML);
      if (plainText.length > 1000) {
        setDescriptionError("Description cannot exceed 1000 characters.");
        const truncatedText = plainText.slice(0, 1000);
        editorRef.current.innerText = truncatedText;
        setDescription(truncatedText);
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      } else {
        setDescriptionError("");
        setDescription(plainText);
      }
      updateFormattingState();
    }
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (editorRef.current) {
      const plainText = getPlainText(editorRef.current.innerHTML);
      if (
        plainText.length >= 1000 &&
        e.key !== "Backspace" &&
        e.key !== "Delete"
      ) {
        e.preventDefault();
      }
    }
  };

  const handleModalDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const text = e.target.value;
    if (text.length > 200) {
      setModalDescriptionError("Description cannot exceed 200 characters.");
      setModalDescription(text.slice(0, 200));
    } else {
      setModalDescriptionError("");
      setModalDescription(text);
    }
  };

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  if (editorRef.current) {
    setDescription(getPlainText(editorRef.current.innerHTML));
  }

  if (!description || description.trim() === "") {
    setError("Description is required.");
    return;
  }

  const issueTypeMap: { [key: string]: string } = {
    "Customer Support": "Other",
    "Technical Support": "Technical",
    Billing: "Payment",
    Other: "Other",
  };

  const formData = new FormData();
  formData.append("issueType", issueTypeMap[issueRelatedTo]);
  formData.append(
    "description",
    subject ? `${subject}: ${description}` : description
  );
  formData.append("visibleToTeacher", isVisibleToTeacher.toString());
  if (file) {
    formData.append("file", file);
  }

  try {
    const token = localStorage.getItem("token");
    if (!token || !deviceId) {
      handleUnauthorized();
      return;
    }
    await api.post("/tickets/raise", formData, {
      headers: {
        "Device-Id": deviceId,
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });
    toast.success("Ticket raised successfully!");
    router.push("/student/raise-query?success=true");
  } catch (error) {
    const apiError = error as ApiError;
    console.error("[CreateTicketPage] Ticket submission error:", apiError);
    if (apiError.response?.status === 401) {
      handleUnauthorized();
    } else {
      setError(apiError.response?.data?.message || "Failed to raise ticket");
    }
  }
};

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 2 * 1024 * 1024) {
        setError("File size must be less than 2MB.");
        return;
      }
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!allowedTypes.includes(selectedFile.type)) {
        alert("Only JPEG, JPG, PNG, PDF, and DOCX files are allowed.");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleClearFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const selectAllContent = () => {
    if (editorRef.current) {
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };

  const applyFormatting = (format: "bold" | "italic" | "underline") => {
    if (editorRef.current) {
      selectAllContent();
      document.execCommand(format, false, undefined);
      editorRef.current.focus();
      setDescription(editorRef.current.innerHTML);
      updateFormattingState();
      window.getSelection()?.removeAllRanges();
    }
  };

  const applyFont = (font: string) => {
    if (editorRef.current) {
      selectAllContent();
      document.execCommand("fontName", false, font);
      setCurrentFont(font);
      editorRef.current.focus();
      setDescription(editorRef.current.innerHTML);
      window.getSelection()?.removeAllRanges();
    }
  };

  const applyFontSize = (size: string) => {
    if (editorRef.current) {
      selectAllContent();
      const sizeMap: { [key: string]: string } = {
        "12": "2",
        "14": "3",
        "16": "4",
      };
      const mappedSize = sizeMap[size] || "3";
      document.execCommand("fontSize", false, mappedSize);
      setCurrentFontSize(size);
      editorRef.current.focus();
      setDescription(editorRef.current.innerHTML);
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleTeacherChangeRequest = () => {
    setIsTeacherChangeModalOpen(true);
  };

  const handleClassPause = () => {
    setIsClassPauseModalOpen(true);
  };

  const handleTimeChangeRequest = () => {
    setIsTimeChangeModalOpen(true);
  };

const handleTeacherChangeSubmit = async (
  e: React.FormEvent<HTMLFormElement>
) => {
  e.preventDefault();
  if (!selectedTeacherReason) {
    alert("Please select a reason.");
    return;
  }

  const descriptionText = `${selectedTeacherReason}${
    modalDescription ? `: ${modalDescription}` : ""
  }`;
  if (descriptionText.length < 10) {
    setModalDescriptionError(
      "Description must be at least 10 characters long."
    );
    return;
  }

  try {
    const token = localStorage.getItem("token");
    if (!token || !deviceId) {
      handleUnauthorized();
      return;
    }
    await api.post(
      "/tickets/raise-teacher-change",
      { description: descriptionText },
      {
        headers: {
          "Device-Id": deviceId,
          Authorization: `Bearer ${token}`,
        },
      }
    );
    toast.success("Teacher change request raised successfully!");
    setIsTeacherChangeModalOpen(false);
    setSelectedTeacherReason("");
    setModalDescription("");
    setModalDescriptionError("");
    router.push("/student/raise-query?success=true&type=teacher-change");
  } catch (error) {
    const apiError = error as ApiError;
    console.error(
      "[CreateTicketPage] Teacher change request error:",
      apiError
    );
    if (apiError.response?.status === 401) {
      handleUnauthorized();
    } else {
      setError(
        apiError.response?.data?.message ||
          "Failed to raise teacher change request"
      );
    }
  }
};

const handleTimeChangeSubmit = async (
  e: React.FormEvent<HTMLFormElement>
) => {
  e.preventDefault();
  if (!selectedTimeReason) {
    alert("Please select a reason.");
    return;
  }

  const descriptionText = `${selectedTimeReason}${
    modalDescription ? `: ${modalDescription}` : ""
  }`;
  if (descriptionText.length < 10) {
    setModalDescriptionError(
      "Description must be at least 10 characters long."
    );
    return;
  }

  try {
    const token = localStorage.getItem("token");
    if (!token || !deviceId) {
      handleUnauthorized();
      return;
    }
    await api.post(
      "/tickets/raise-timezone-change",
      { description: descriptionText },
      {
        headers: {
          "Device-Id": deviceId,
          Authorization: `Bearer ${token}`,
        },
      }
    );
    toast.success("Time change request raised successfully!");
    setIsTimeChangeModalOpen(false);
    setSelectedTimeReason("");
    setModalDescription("");
    setModalDescriptionError("");
    router.push("/student/raise-query?success=true&type=time-change");
  } catch (error) {
    const apiError = error as ApiError;
    console.error("[CreateTicketPage] Time change request error:", apiError);
    if (apiError.response?.status === 401) {
      handleUnauthorized();
    } else {
      setError(
        apiError.response?.data?.message ||
          "Failed to raise time change request"
      );
    }
  }
};

const handleClassPauseSubmit = async (
  e: React.FormEvent<HTMLFormElement>
) => {
  e.preventDefault();

  try {
    const token = localStorage.getItem("token");
    if (!token || !deviceId) {
      handleUnauthorized();
      return;
    }
    await api.post(
      "/tickets/raise-class-pause",
      {},
      {
        headers: {
          "Device-Id": deviceId,
          Authorization: `Bearer ${token}`,
        },
      }
    );
    toast.success("Class pause request raised successfully!");
    setIsClassPauseModalOpen(false);
    router.push("/student/raise-query?success=true&type=class-pause");
  } catch (error) {
    const apiError = error as ApiError;
    console.error("[CreateTicketPage] Class pause request error:", apiError);
    if (apiError.response?.status === 401) {
      handleUnauthorized();
    } else {
      setError(
        apiError.response?.data?.message ||
          "Failed to raise class pause request"
      );
    }
  }
};

  return (
    <div className="p-4 sm:p-6 bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen mt-10 font-sans ml-20">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center space-x-3 mb-6">
          <button
            onClick={() => router.push("/student/raise-query")}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            aria-label="Go back"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            Raise a Ticket
          </h1>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg shadow-sm animate-slide-in">
            {error}
          </div>
        )}

        <div className="flex flex-col items-center mb-6">
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            <span className="text-md font-semibold text-sky-600 mr-2 mt-1 sm:mr-4">
              Quick Actions:
            </span>
            <button
              onClick={handleTeacherChangeRequest}
              className="text-white text-sm font-semibold bg-gradient-to-r from-sky-500 to-blue-600 border border-sky-500 rounded-full px-4 py-2 hover:from-yellow-500 hover:to-yellow-600 hover:border-yellow-500 hover:scale-105 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-yellow-500 shadow-sm cursor-pointer"
            >
              Teacher Change Request
            </button>
            <button
              onClick={handleTimeChangeRequest}
              className="text-white text-sm font-semibold bg-gradient-to-r from-sky-500 to-blue-600 border border-sky-500 rounded-full px-4 py-2 hover:from-green-500 hover:to-green-600 hover:border-green-500 hover:scale-105 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm cursor-pointer"
            >
              Time Change Request
            </button>
            <button
              onClick={handleClassPause}
              className="text-white text-sm font-semibold bg-gradient-to-r from-sky-500 to-blue-600 border border-sky-500 rounded-full px-4 py-2 hover:from-red-500 hover:to-red-600 hover:border-red-500 hover:scale-105 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm cursor-pointer"
            >
              Class Pause
            </button>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-200">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                My issue is related to:
              </label>
              <Select value={issueRelatedTo} onValueChange={setIssueRelatedTo}>
                <SelectTrigger className="w-full text-left text-sm text-gray-600 bg-white border border-gray-300 rounded-lg px-4 py-2.5 transition-all duration-200 ease-in-out hover:bg-gray-50 hover:scale-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm cursor-pointer">
                  <SelectValue placeholder="Select an issue type" />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-lg shadow-lg border border-gray-200 animate-slide-in">
                  <SelectItem
                    value="Customer Support"
                    className="text-left text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 cursor-pointer"
                  >
                    Customer Support
                  </SelectItem>
                  <SelectItem
                    value="Technical Support"
                    className="text-left text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 cursor-pointer"
                  >
                    Technical Support
                  </SelectItem>
                  <SelectItem
                    value="Billing"
                    className="text-left text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 cursor-pointer"
                  >
                    Billing
                  </SelectItem>
                  <SelectItem
                    value="Other"
                    className="text-left text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 cursor-pointer"
                  >
                    Other
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Issue Subject"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ease-in-out hover:bg-gray-50 shadow-sm"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <div className="border border-gray-300 rounded-lg bg-white shadow-sm">
                <div className="flex items-center justify-start bg-gray-50 p-2 border-b border-gray-200">
                  <button
                    type="button"
                    onClick={() => applyFormatting("bold")}
                    className={`p-2 mx-1 text-gray-600 rounded-md transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                      isBold
                        ? "bg-blue-100 border border-blue-500 text-blue-700"
                        : "hover:bg-gray-200"
                    }`}
                    title="Bold"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 13h3a3 3 0 003-3V7a3 3 0 00-3-3H9v9zm0 0h4a3 3 0 013 3v2a3 3 0 01-3 3H9v-8z"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("italic")}
                    className={`p-2 mx-1 text-gray-600 rounded-md transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                      isItalic
                        ? "bg-blue-100 border border-blue-500 text-blue-700"
                        : "hover:bg-gray-200"
                    }`}
                    title="Italic"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4h-4l4 16h4l-4-16z"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyFormatting("underline")}
                    className={`p-2 mx-1 text-gray-600 rounded-md transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                      isUnderline
                        ? "bg-blue-100 border border-blue-500 text-blue-700"
                        : "hover:bg-gray-200"
                    }`}
                    title="Underline"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 20h16M6 4v8a6 6 0 0012 0V4"
                      />
                    </svg>
                  </button>
                  <Select value={currentFont} onValueChange={applyFont}>
                    <SelectTrigger className="p-2 mx-1 text-sm text-gray-600 bg-white border border-gray-300 rounded-md transition-all duration-200 ease-in-out hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-left cursor-pointer">
                      <SelectValue placeholder="Select font" />
                    </SelectTrigger>
                    <SelectContent className="bg-white rounded-lg shadow-lg border border-gray-200 animate-slide-in">
                      <SelectItem
                        value="Arial"
                        className="text-left text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 cursor-pointer"
                      >
                        Arial
                      </SelectItem>
                      <SelectItem
                        value="Times New Roman"
                        className="text-left text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 cursor-pointer"
                      >
                        Times New Roman
                      </SelectItem>
                      <SelectItem
                        value="Helvetica"
                        className="text-left text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 cursor-pointer"
                      >
                        Helvetica
                      </SelectItem>
                      <SelectItem
                        value="Georgia"
                        className="text-left text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 cursor-pointer"
                      >
                        Georgia
                      </SelectItem>
                      <SelectItem
                        value="Verdana"
                        className="text-left text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 cursor-pointer"
                      >
                        Verdana
                      </SelectItem>
                      <SelectItem
                        value="Courier New"
                        className="text-left text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 cursor-pointer"
                      >
                        Courier New
                      </SelectItem>
                      <SelectItem
                        value="Comic Sans MS"
                        className="text-left text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 cursor-pointer"
                      >
                        Comic Sans MS
                      </SelectItem>
                      <SelectItem
                        value="Trebuchet MS"
                        className="text-left text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 cursor-pointer"
                      >
                        Trebuchet MS
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={currentFontSize} onValueChange={applyFontSize}>
                    <SelectTrigger className="p-2 mx-1 text-sm text-gray-600 bg-white border border-gray-300 rounded-md transition-all duration-200 ease-in-out hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-left cursor-pointer">
                      <SelectValue placeholder="Select font size" />
                    </SelectTrigger>
                    <SelectContent className="bg-white rounded-lg shadow-lg border border-gray-200 animate-slide-in">
                      <SelectItem
                        value="12"
                        className="text-left text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 cursor-pointer"
                      >
                        12
                      </SelectItem>
                      <SelectItem
                        value="14"
                        className="text-left text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 cursor-pointer"
                      >
                        14
                      </SelectItem>
                      <SelectItem
                        value="16"
                        className="text-left text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 cursor-pointer"
                      >
                        16
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div
                  id="description"
                  ref={editorRef}
                  contentEditable
                  className="w-full p-4 text-gray-600 text-sm border-none focus:ring-2 focus:ring-blue-500 rounded-b-lg shadow-inner outline-none bg-white min-h-[12rem] max-h-[12rem] overflow-y-auto"
                  style={{
                    fontFamily: currentFont,
                    fontSize: `${currentFontSize}px`,
                  }}
                  onInput={handleDescriptionInput}
                  onKeyDown={handleDescriptionKeyDown}
                  onClick={updateFormattingState}
                  onKeyUp={updateFormattingState}
                  data-placeholder="Describe your issue in detail..."
                />
              </div>
              {descriptionError && (
                <p className="text-red-500 text-sm mt-2 animate-slide-in">
                  {descriptionError}
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="flex items-center space-x-2 ">
                <input
                  type="checkbox"
                  checked={isVisibleToTeacher}
                  onChange={(e) => setIsVisibleToTeacher(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-offset-0 transition-colors duration-200 cursor-pointer"
                />
                <span className="text-sm font-semibold text-gray-700">
                  Make this ticket visible to your teacher
                </span>
              </label>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Attachment (DOCX, JPEG, PNG, PDF, 2MB)
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".docx,.jpeg,.jpg,.png,.pdf"
                  className="hidden"
                  id="file-upload"
                  ref={fileInputRef}
                />
                <label
                  htmlFor="file-upload"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg px-4 py-2 hover:from-blue-700 hover:to-blue-800 hover:scale-105 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
                >
                  Choose File
                </label>
                <span className="text-gray-500 text-sm flex items-center space-x-2">
                  {file?.name ?? "No file chosen"}
                  {file && (
                    <button
                      onClick={handleClearFile}
                      className="text-white bg-red-500 hover:bg-red-600 rounded-full w-5 h-5 flex items-center justify-center transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 ml-2 cursor-pointer"
                      title="Remove file"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        className="w-3 h-3"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-gradient-to-r from-blue-900 to-blue-800 text-white font-semibold py-2.5 px-6 rounded-lg hover:from-blue-800 hover:to-blue-700 hover:scale-105 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md cursor-pointer"
              >
                Submit Ticket
              </button>
            </div>
          </form>
        </div>

        <AnimatePresence>
          {isTeacherChangeModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
              onClick={() => setIsTeacherChangeModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-md relative"
                onClick={(e: React.MouseEvent<HTMLDivElement>) =>
                  e.stopPropagation()
                }
              >
                <button
                  onClick={() => setIsTeacherChangeModalOpen(false)}
                  className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  aria-label="Close modal"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4">
                    <div className="w-12 h-12 rounded-full border-2 border-blue-200 flex items-center justify-center text-blue-500 text-xl font-semibold bg-blue-50">
                      i
                    </div>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
                    Change Teacher Request
                  </h2>
                  <form onSubmit={handleTeacherChangeSubmit} className="w-full">
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2 text-left">
                        Reason <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={selectedTeacherReason}
                        onValueChange={setSelectedTeacherReason}
                      >
                        <SelectTrigger className="w-full text-left text-sm text-gray-600 bg-white border border-gray-300 rounded-lg px-4 py-2.5 transition-all duration-200 ease-in-out hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm cursor-pointer">
                          <SelectValue placeholder="Select Reason" />
                        </SelectTrigger>
                        <SelectContent className="bg-white rounded-lg shadow-lg border border-gray-200 animate-slide-in">
                          <SelectItem
                            value="My teacher is not responding"
                            className="text-left text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 cursor-pointer"
                          >
                            My teacher is not responding
                          </SelectItem>
                          <SelectItem
                            value="My teacher's teaching style is incompatible with me"
                            className="text-left text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 cursor-pointer"
                          >
                            My teacher&apos;s teaching style is incompatible
                            with me
                          </SelectItem>
                          <SelectItem
                            value="My teacher is always late to class"
                            className="text-left text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 cursor-pointer"
                          >
                            My teacher is always late to class
                          </SelectItem>
                          <SelectItem
                            value="My teacher is not helping me grow"
                            className="text-left text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 cursor-pointer"
                          >
                            My teacher is not helping me grow
                          </SelectItem>
                          <SelectItem
                            value="Others"
                            className="text-left text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 cursor-pointer"
                          >
                            Others
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2 text-left">
                        Description
                      </label>
                      <textarea
                        value={modalDescription}
                        onChange={handleModalDescriptionChange}
                        placeholder="Enter your description here..."
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ease-in-out hover:bg-gray-50 shadow-sm resize-none h-[6rem]"
                      />
                      {modalDescriptionError && (
                        <p className="text-red-500 text-sm mt-2 animate-slide-in">
                          {modalDescriptionError}
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="submit"
                        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-2 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 hover:scale-105 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
                      >
                        Submit
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsTeacherChangeModalOpen(false)}
                        className="bg-gray-200 text-gray-700 font-semibold py-2 px-6 rounded-lg hover:bg-gray-300 hover:scale-105 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 shadow-sm cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}

          {isTimeChangeModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
              onClick={() => setIsTimeChangeModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-md relative"
                onClick={(e: React.MouseEvent<HTMLDivElement>) =>
                  e.stopPropagation()
                }
              >
                <button
                  onClick={() => setIsTimeChangeModalOpen(false)}
                  className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  aria-label="Close modal"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4">
                    <div className="w-12 h-12 rounded-full border-2 border-blue-200 flex items-center justify-center text-blue-500 text-xl font-semibold bg-blue-50">
                      i
                    </div>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
                    Change Class Time Request
                  </h2>
                  <form onSubmit={handleTimeChangeSubmit} className="w-full">
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-2 text-left">
                        Reason <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={selectedTimeReason}
                        onValueChange={setSelectedTimeReason}
                      >
                        <SelectTrigger className="w-full text-left text-sm text-gray-600 bg-white border border-gray-300 rounded-lg px-4 py-2.5 transition-all duration-200 ease-in-out hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm cursor-pointer">
                          <SelectValue placeholder="Select Reason" />
                        </SelectTrigger>
                        <SelectContent className="bg-white rounded-lg shadow-lg border border-gray-200 animate-slide-in">
                          <SelectItem
                            value="Current time conflicts with my schedule"
                            className="text-left text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 cursor-pointer"
                          >
                            Current time conflicts with my schedule
                          </SelectItem>
                          <SelectItem
                            value="I need an earlier class time"
                            className="text-left text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 cursor-pointer"
                          >
                            I need an earlier class time
                          </SelectItem>
                          <SelectItem
                            value="I need a later class time"
                            className="text-left text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 cursor-pointer"
                          >
                            I need a later class time
                          </SelectItem>
                          <SelectItem
                            value="The current time is inconvenient"
                            className="text-left text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 cursor-pointer"
                          >
                            The current time is inconvenient
                          </SelectItem>
                          <SelectItem
                            value="Others"
                            className="text-left text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 cursor-pointer"
                          >
                            Others
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2 text-left">
                        Description
                      </label>
                      <textarea
                        value={modalDescription}
                        onChange={handleModalDescriptionChange}
                        placeholder="Enter your description here..."
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ease-in-out hover:bg-gray-50 shadow-sm resize-none h-[6rem]"
                      />
                      {modalDescriptionError && (
                        <p className="text-red-500 text-sm mt-2 animate-slide-in">
                          {modalDescriptionError}
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="submit"
                        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-2 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 hover:scale-105 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
                      >
                        Submit
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsTimeChangeModalOpen(false)}
                        className="bg-gray-200 text-gray-700 font-semibold py-2 px-6 rounded-lg hover:bg-gray-300 hover:scale-105 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 shadow-sm cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}

          {isClassPauseModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
              onClick={() => setIsClassPauseModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-md relative"
                onClick={(e: React.MouseEvent<HTMLDivElement>) =>
                  e.stopPropagation()
                }
              >
                <button
                  onClick={() => setIsClassPauseModalOpen(false)}
                  className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  aria-label="Close modal"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className="w-6 h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4">
                    <div className="w-12 h-12 rounded-full border-2 border-blue-200 flex items-center justify-center text-blue-500 text-xl font-semibold bg-blue-50">
                      i
                    </div>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3">
                    Pause Class Request
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600 mb-4">
                    You will not be able to attend any Learn, Practice, or
                    Performance classes during the pause period. Are you sure
                    you want to pause your classes?
                  </p>
                  <form onSubmit={handleClassPauseSubmit}>
                    <div className="flex justify-end space-x-3 gap-2">
                      <button
                        type="submit"
                        className="bg-gradient-to-r from-sky-600 to-sky-700 text-white font-semibold py-2.5 px-6 rounded-lg hover:from-sky-700 hover:to-sky-800 hover:scale-105 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm cursor-pointer"
                      >
                        Yes, Pause it!
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsClassPauseModalOpen(false)}
                        className="bg-gray-200 text-gray-700 font-semibold py-2.5 px-6 rounded-lg hover:bg-gray-300 hover:scale-105 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 shadow-sm cursor-pointer"
                      >
                        No, Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="fixed bottom-6 right-6 flex flex-col space-y-3">
          <button
            className="bg-gradient-to-r from-red-500 to-red-600 text-white w-12 h-12 rounded-full flex items-center justify-center hover:from-red-600 hover:to-red-700 hover:scale-110 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 shadow-md cursor-pointer"
            aria-label="Open notes"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-2m-2 0V3a1 1 0 00-1-1h-4a1 1 0 00-1-1v2m-2 7h8m-8 4h4"
              />
            </svg>
          </button>
          <button
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white w-12 h-12 rounded-full flex items-center justify-center hover:from-blue-700 hover:to-blue-800 hover:scale-110 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md cursor-pointer"
            aria-label="Open chat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </button>
        </div>

        <style jsx>{`
          [contenteditable][data-placeholder]:empty:before {
            content: attr(data-placeholder);
            color: #9ca3af;
            pointer-events: none;
          }
          [contenteditable] {
            overflow-y: auto !important;
            max-height: 12rem;
          }
          textarea {
            resize: none !important;
          }
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

export default CreateTicketPage;
