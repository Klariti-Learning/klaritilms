"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import toast from "react-hot-toast";
import api from "@/lib/api";
import moment from "moment-timezone";
import { ApiError } from "@/types";
import Loader from "@/components/Loader";

interface TimeSlot {
  value: string;
  label: string;
}

interface Timezone {
  value: string;
  label: string;
}

const generateTimeSlots = (timezone: string): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const start = moment.tz("2025-01-01 00:00", timezone);
  for (let i = 0; i < 24 * 60; i += 40) {
    const startTime = start.clone().add(i, "minutes");
    const endTime = startTime.clone().add(40, "minutes");
    slots.push({
      value: startTime.format("HH:mm"),
      label: `${startTime.format("HH:mm")} - ${endTime.format("HH:mm")}`,
    });
  }
  return slots;
};

const getTimezones = (): Timezone[] => {
  return moment.tz
    .names()
    .filter((tz) => /^[^/]+\/[^/]+$/.test(tz))
    .map((tz) => ({ value: tz.trim(), label: tz.trim() }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

export default function TimezoneSetup() {
  const { user, deviceId, loading } = useAuth();
  const router = useRouter();
  const [timezone, setTimezone] = useState<string>("");
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const Logo =
    "https://res.cloudinary.com/dlie87ah0/image/upload/v1745815677/logo5_olvuok.jpg";

  const allTimezones = useMemo(() => getTimezones(), []);
  const timeSlotsMemo = useMemo(() => generateTimeSlots(timezone), [timezone]);

  const handleTimeSlotToggle = useCallback((value: string) => {
    setTimeSlots([value]);
  }, []);

  const handleSubmit = async () => {
    if (!timezone) {
      setError("Please select a timezone");
      toast.error("Please select a timezone");
      return;
    }
    if (timeSlots.length !== 1) {
      setError("Please select exactly one time slot");
      toast.error("Please select exactly one time slot");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await api.post(
        "/auth/timezone-setup",
        { timezone, preferredTimeSlots: timeSlots },
        {
          headers: { "Device-Id": deviceId },
        }
      );
      toast.success("Timezone and time slot set successfully");
      const roleName = user?.role?.roleName.toLowerCase().replace(/\s+/g, '') || "student";
      router.push(`/${roleName}`);
    } catch (error) {
      const apiError = error as ApiError;
      const errorMsg =
        apiError.response?.data?.message || "Failed to set timezone";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!loading && (!user || !user.role)) {
      router.push("/my-learnings");
    } else if (loading) {
      return;
    } else if (user && user.isTimezoneSet && !user.isFirstLogin) {
      const roleName = user.role?.roleName.toLowerCase().replace(/\s+/g, '');
      router.push(roleName === "student" ? "/student" : `/${roleName}`);
    }
  }, [user, loading, router]);

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
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card
        className="w-full max-w-[480px] bg-white border border-gray-100 rounded-xl transition-all duration-300 mt-16"
        style={{
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
        }}
      >
        <CardHeader className="pt-4">
          <div className="flex justify-start">
            <Image
              src={Logo}
              alt="Klariti Logo"
              width={48}
              height={56}
              className="object-contain"
            />
          </div>
          <CardTitle className="text-start text-xl font-semibold text-gray-800 pt-2">
            Set Your Timezone
          </CardTitle>
          <p className="text-start text-sm text-gray-500 mt-1">
            Select your timezone and a preferred time slot.
          </p>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="space-y-5">
            <div>
              <Label
                htmlFor="timezone"
                className="block text-sm font-medium text-gray-600 mb-1.5"
              >
                Timezone
              </Label>
              <Select
                key={timezone}
                onValueChange={(value) => {
                  setTimezone(value);
                  setTimeSlots([]);
                }}
                value={timezone}
              >
                <SelectTrigger
                  id="timezone"
                  className="w-full border border-gray-100 rounded-lg focus:ring-0 focus:border-blue-400 bg-white px-3 py-2 text-gray-600 hover:bg-gray-50 transition-all duration-200 cursor-pointer"
                >
                  <SelectValue placeholder="Select a timezone" />
                </SelectTrigger>
                <SelectContent className="timezone-dropdown bg-white border border-gray-100 rounded-lg shadow-sm max-h-[300px] overflow-y-auto z-[9999]">
                  {allTimezones.map((tz) => (
                    <SelectItem
                      key={tz.value}
                      value={tz.value}
                      className="px-3 py-1.5 text-gray-600 text-center hover:bg-gray-50 focus:bg-gray-100 transition-colors duration-60 cursor-pointer"
                    >
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {timezone && (
              <div className="time-slot-grid">
                <Label className="block text-sm font-medium text-gray-600 mb-1.5">
                  Preferred Time Slot
                </Label>
                <div
                  className="time-slot-container grid grid-cols-4 gap-2 max-h-60 overflow-y-auto p-2 bg-white border border-gray-100 rounded-lg"
                  style={{
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                  }}
                >
                  {timeSlotsMemo.map((slot) => (
                    <div
                      key={slot.value}
                      className={`relative p-2.5 bg-white border border-gray-100 rounded-md text-center text-sm text-gray-600 cursor-pointer transition-all duration-100 ${
                        timeSlots.includes(slot.value)
                          ? "bg-green-300 border-green-400 shadow-md scale-95"
                          : "hover:bg-gray-50 hover:shadow-sm hover:scale-105"
                      }`}
                      onClick={() => handleTimeSlotToggle(slot.value)}
                    >
                      <Checkbox
                        id={slot.value}
                        checked={timeSlots.includes(slot.value)}
                        onCheckedChange={() => handleTimeSlotToggle(slot.value)}
                        className="absolute opacity-0"
                      />
                      <span>{slot.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!timezone && (
              <p className="text-sm text-gray-400 text-center time-slot-placeholder">
                Select a timezone to choose a time slot
              </p>
            )}
            {error && (
              <p className="text-red-500 text-sm error-message">{error}</p>
            )}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 rounded-lg transition-all duration-100 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <style>
        {`
          .timezone-dropdown {
            animation: dropdown-open 60ms ease-in-out;
            will-change: transform, opacity;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
            
          .timezone-dropdown::-webkit-scrollbar {
            display: none;
          }
          .timezone-dropdown[data-state="closed"] {
            animation: dropdown-close 60ms ease-in-out;
            will-change: transform, opacity;
          }
          .time-slot-grid {
            animation: fade-in 100ms ease-in-out;
            will-change: transform, opacity;
          }
          .time-slot-placeholder {
            animation: fade-in 100ms ease-in-out;
            will-change: transform, opacity;
          }
          .error-message {
            animation: fade-in 60ms ease-in-out;
            will-change: transform, opacity;
          }
          .time-slot-container {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .time-slot-container::-webkit-scrollbar {
            display: none;
          }
          @keyframes dropdown-open {
            from {
              opacity: 0;
              transform: scaleY(0.98) translateY(-3px);
            }
            to {
              opacity: 1;
              transform: scaleY(1) translateY(0);
            }
          }
          @keyframes dropdown-close {
            from {
              opacity: 1;
              transform: scaleY(1) translateY(0);
            }
            to {
              opacity: 0;
              transform: scaleY(0.98) translateY(-3px);
            }
          }
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(2px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
}
