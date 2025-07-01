"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import toast from "react-hot-toast";
import api from "@/lib/api";
import VideoPlayerPopup from "@/components/VideoPlayerPopup";
import { Recording, ApiError } from "@/types";

export default function RecordingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(
    null
  );
  const [isVideoPopupOpen, setIsVideoPopupOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }

    const fetchRecordings = async () => {
      try {
        const deviceId = localStorage.getItem("deviceId");
        if (!deviceId) {
          toast.error("Device ID not found");
          router.push("/login");
          return;
        }
        const response = await api.get("/recordings", {
          headers: { "Device-Id": deviceId },
        });
        setRecordings(response.data.recordings);
      } catch (error) {
        const apiError = error as ApiError;
        toast.error(
          apiError.response?.data?.message || "Failed to fetch recordings"
        );
      }
    };

    fetchRecordings();
  }, [user, loading, router]);

  const handleViewRecording = (recording: Recording) => {
    setSelectedRecording(recording);
    setIsVideoPopupOpen(true);
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Recordings</CardTitle>
        </CardHeader>
        <CardContent>
          {recordings.length === 0 ? (
            <p>No recordings available</p>
          ) : (
            <div className="grid gap-4">
              {recordings.map((recording: Recording) => (
                <Card key={recording._id}>
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold">{recording.title}</h3>
                    <p>Uploaded by: {recording.uploadedBy}</p>
                    <p>
                      Uploaded on:{" "}
                      {new Date(recording.createdAt).toLocaleDateString()}
                    </p>
                    <Button
                      onClick={() => handleViewRecording(recording)}
                      className="mt-2 bg-blue-600 hover:bg-blue-700"
                    >
                      View Recording
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedRecording && (
        <VideoPlayerPopup
          isOpen={isVideoPopupOpen}
          onClose={() => setIsVideoPopupOpen(false)}
          videoUrl={selectedRecording.url}
          title={selectedRecording.title}
        />
      )}
    </div>
  );
}
