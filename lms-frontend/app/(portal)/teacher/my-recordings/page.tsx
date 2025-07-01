"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Recording, ScheduledCall, ApiError } from "@/types";
import Loader from "@/components/Loader";

export default function Recordings() {
  const { user, loading: authLoading } = useAuth();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [calls, setCalls] = useState<ScheduledCall[]>([]);
  const [selectedCallId, setSelectedCallId] = useState("");
  const [recordingFiles, setRecordingFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const fetchRecordings = async () => {
      try {
        const response = await api.get("/recordings", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Device-Id": localStorage.getItem("deviceId"),
          },
        });
        setRecordings(response.data.recordings);
      } catch (error) {
        const apiError = error as ApiError;
        toast.error(
          apiError.response?.data?.message || "Failed to fetch recordings"
        );
      }
    };

    const fetchCalls = async () => {
      try {
        const response = await api.get("/schedule/calls?page=1&limit=50", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Device-Id": localStorage.getItem("deviceId"),
          },
        });
        setCalls(
          response.data.calls.filter(
            (call: ScheduledCall) =>
              call.status === "Completed" &&
              ["Phonics", "Content Writing"].includes(call.classType)
          )
        );
      } catch (error) {
        const apiError = error as ApiError;
        toast.error(
          apiError.response?.data?.message || "Failed to fetch completed calls"
        );
      }
    };

    fetchRecordings();
    fetchCalls();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter((file) => {
        if (file.type === "video/mp4" && file.size <= 500 * 1024 * 1024) {
          return true;
        } else {
          toast.error(`"${file.name}" must be an MP4 file under 500MB`);
          return false;
        }
      });
      setRecordingFiles((prev) => [...prev, ...files]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files).filter((file) => {
        if (file.type === "video/mp4" && file.size <= 500 * 1024 * 1024) {
          return true;
        } else {
          toast.error(`"${file.name}" must be an MP4 file under 500MB`);
          return false;
        }
      });
      setRecordingFiles((prev) => [...prev, ...files]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeFile = (index: number) => {
    setRecordingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!selectedCallId || recordingFiles.length === 0) {
      toast.error("Please select a call and upload at least one file");
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < recordingFiles.length; i++) {
        const file = recordingFiles[i];
        const formData = new FormData();
        formData.append("recording", file);

        const response = await api.post(
          `/recording/upload-recording/${selectedCallId}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Device-Id": localStorage.getItem("deviceId"),
              "Content-Type": "multipart/form-data",
            },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const progress = Math.round(
                  (progressEvent.loaded * 100) / progressEvent.total
                );
                setUploadProgress((prev) =>
                  Math.max(
                    prev,
                    (i / recordingFiles.length) * 100 +
                      progress / recordingFiles.length
                  )
                );
              }
            },
          }
        );

        setRecordings((prev) => [...prev, response.data.recording]);
      }

      setSelectedCallId("");
      setRecordingFiles([]);
      setUploadProgress(100);
      toast.success("Recordings uploaded successfully!");
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(
        apiError.response?.data?.message || "Failed to upload recordings"
      );
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  if (authLoading) {
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

  if (!user || user.role?.roleName !== "Teacher") {
    router.push("/login");
    return null;
  }

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload Recording</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Select value={selectedCallId} onValueChange={setSelectedCallId}>
              <SelectTrigger>
                <SelectValue placeholder="Select Completed Class" />
              </SelectTrigger>
              <SelectContent>
                {calls.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No completed Phonics or Content Writing classes
                  </SelectItem>
                ) : (
                  calls.map((call) => (
                    <SelectItem key={call._id} value={call._id}>
                      {call.classType} |{" "}
                      {new Date(call.date).toLocaleDateString()} |{" "}
                      {call.startTime}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center ${
                isDragging
                  ? "border-indigo-600 bg-indigo-50"
                  : "border-gray-300"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <p className="text-gray-500 mb-2">
                {isDragging
                  ? "Drop your files here"
                  : "Drag and drop MP4 files here or click to select"}
              </p>
              <Input
                type="file"
                accept="video/mp4"
                multiple
                onChange={handleFileChange}
                className="hidden"
                ref={fileInputRef}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                Select Files
              </Button>
            </div>

            {recordingFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Selected Files:</p>
                {recordingFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={loading}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {loading && (
              <div className="mt-4">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-gray-500 mt-2">
                  Uploading: {uploadProgress.toFixed(0)}%
                </p>
              </div>
            )}

            {selectedCallId && recordingFiles.length > 0 && (
              <Button
                onClick={handleUpload}
                disabled={loading}
                className="w-full"
              >
                {loading
                  ? "Uploading..."
                  : `Upload ${recordingFiles.length} Recording${
                      recordingFiles.length > 1 ? "s" : ""
                    }`}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Recordings</CardTitle>
        </CardHeader>
        <CardContent>
          {recordings.length === 0 ? (
            <p className="text-gray-500">No recordings uploaded</p>
          ) : (
            <div className="space-y-4">
              {recordings.map((recording) => (
                <motion.div
                  key={recording._id}
                  className="border rounded-lg p-4 shadow-sm"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-lg font-semibold">
                    Recording for Call ID: {recording.callId}
                  </p>
                  <p className="text-sm text-gray-500">
                    Uploaded: {new Date(recording.uploadedAt).toLocaleString()}
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => window.open(recording.url, "_blank")}
                  >
                    View Recording
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
