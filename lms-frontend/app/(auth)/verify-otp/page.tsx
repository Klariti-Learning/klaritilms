"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import OTPInput from "@/components/OTPInput";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { Loader2, StepForward } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import { maskEmail, maskPhone } from "@/lib/utils";
import { ApiError } from "@/types";
import SuspenseFallback from "@/components/SuspenseFallback";

export function VerifyOTPContent() {
  const { setUser, deviceId } = useAuth();
  const [emailOTP, setEmailOTP] = useState("");
  const [phoneOTP, setPhoneOTP] = useState("");
  const [errors, setErrors] = useState({
    emailOTP: "",
    phoneOTP: "",
    verify: "",
    resendEmail: "",
    resendPhone: "",
  });
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState({
    email: 60,
    phone: 60,
  });
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitTimer, setRateLimitTimer] = useState(0);
  const searchParams = useSearchParams();
  const router = useRouter();
  const Logo =
    "https://res.cloudinary.com/dlie87ah0/image/upload/v1745815677/logo5_olvuok.jpg";

  const verificationId = searchParams.get("verificationId") || "";
  const userId = searchParams.get("userId") || "";
  const type = searchParams.get("type") || "login";

  const userEmail = localStorage.getItem("userEmail") || "";
  const userPhone = localStorage.getItem("userPhone") || "";
  const userIdentifier = localStorage.getItem("userIdentifier") || "";
  const identifierType = localStorage.getItem("identifierType") || "";

  const maskedEmail = maskEmail(userEmail || userIdentifier);
  const maskedPhone = maskPhone(userPhone || userIdentifier);

  const getOtpMessage = () => {
    if (identifierType === "email") {
      return `Please enter the OTP sent to your ${maskedEmail}.`;
    }
    return `Please enter the OTP sent to your ${maskedPhone}.`;
  };

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    if (resendCooldown.email > 0) {
      timers.push(
        setInterval(() => {
          setResendCooldown((prev) => ({ ...prev, email: prev.email - 1 }));
        }, 1000)
      );
    }
    if (resendCooldown.phone > 0) {
      timers.push(
        setInterval(() => {
          setResendCooldown((prev) => ({ ...prev, phone: prev.phone - 1 }));
        }, 1000)
      );
    }
    return () => timers.forEach(clearInterval);
  }, [resendCooldown]);

  useEffect(() => {
    if (rateLimitTimer > 0) {
      const timer = setInterval(() => {
        setRateLimitTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (rateLimitTimer === 0) {
      setIsRateLimited(false);
    }
  }, [rateLimitTimer]);

  const validateOTP = (otp: string, type: "email" | "phone") => {
    if (!otp.match(/^\d{6}$/)) {
      setErrors((prev) => ({
        ...prev,
        [`${type}OTP`]: `${
          type.charAt(0).toUpperCase() + type.slice(1)
        } OTP must be a 6-digit number`,
      }));
      return false;
    }
    setErrors((prev) => ({ ...prev, [`${type}OTP`]: "" }));
    return true;
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({
      emailOTP: "",
      phoneOTP: "",
      verify: "",
      resendEmail: "",
      resendPhone: "",
    });
    setLoading(true);

    if (type === "signup") {
      const emailValid = validateOTP(emailOTP, "email");
      const phoneValid = validateOTP(phoneOTP, "phone");
      if (!emailValid || !phoneValid) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.post(
          "/auth/verify-otp",
          {
            verificationId,
            emailOTP,
            phoneOTP,
          },
          {
            headers: { "Device-Id": deviceId },
          }
        );
        const token = res.data.token;
        localStorage.setItem("token", token);
        localStorage.setItem("deviceId", deviceId);
        localStorage.setItem("userId", res.data.user._id);
        localStorage.setItem("isLoggedIn", "true");
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        api.defaults.headers.common["Device-Id"] = deviceId;

        localStorage.removeItem("userEmail");
        localStorage.removeItem("userPhone");
        localStorage.removeItem("userIdentifier");
        localStorage.removeItem("identifierType");
        setEmailOTP("");
        setPhoneOTP("");
        setUser(res.data.user);
        toast.success("Registration successful!");
        router.push("/timezone-setup");
      } catch (error) {
        const errorMsg = error as ApiError;
          const errorData =  errorMsg.response?.data?.message ||
            "Failed to verify OTPs. Please try again."
        
        console.error("OTP verification error:", errorData);
        setErrors({ ...errors, verify: errorData });
        toast.error(errorData);
      } finally {
        setLoading(false);
      }
    } else {
      const otp = emailOTP || phoneOTP;
      if (!validateOTP(otp, emailOTP ? "email" : "phone")) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.post(
          "/auth/verify-login-otp",
          { userId, otp },
          {
            headers: { "Device-Id": deviceId },
          }
        );
        const token = res.data.token;
        localStorage.setItem("token", token);
        localStorage.setItem("isVerified", "true");
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("deviceId", deviceId);
        localStorage.setItem("userId", userId);

        localStorage.removeItem("userIdentifier");
        localStorage.removeItem("identifierType");

        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        api.defaults.headers.common["Device-Id"] = deviceId;

        setEmailOTP("");
        setPhoneOTP("");
        toast.success("Login successful!");

        const user = res.data.user;
        setUser(user);
        const roleName = user.role?.roleName.toLowerCase().replace(/\s+/g, '');
        if (!roleName) {
          router.push("/my-learnings");
        } else if (
          (roleName === "student" || roleName === "teacher") &&
          (user.isFirstLogin || !user.isTimezoneSet)
        ) {
          router.push("/timezone-setup");
        } else if (roleName === "admin" || roleName === "superadmin") {
          router.push(`/${roleName}`);
        } else {
          router.push(`/${roleName}`);
        }
      } catch (error) {
        const errorMsg = error as ApiError;
          const errorData =  errorMsg.response?.data?.message || "Invalid OTP. Please try again.";
         
        console.error("OTP verification error:", errorData);
        setErrors({
          ...errors,
          [emailOTP ? "emailOTP" : "phoneOTP"]: errorData,
        });
        toast.error(errorData);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleResend = async (method: "email" | "phone") => {
    if (loading || isRateLimited || resendCooldown[method] > 0) return;
    setErrors({
      ...errors,
      [`resend${method.charAt(0).toUpperCase() + method.slice(1)}`]: "",
    });
    setLoading(true);

    try {
      if (type === "signup") {
        await api.post(
          "/auth/resend-otp",
          { verificationId, method },
          {
            headers: { "Device-Id": deviceId },
          }
        );
      } else {
        await api.post(
          "/auth/resend-login-otp",
          { userId },
          {
            headers: { "Device-Id": deviceId },
          }
        );
      }
      setResendCooldown((prev) => ({ ...prev, [method]: 60 }));
      toast.success(`New OTP sent to your ${method}.`);
    } catch (error) {
        const errorMsg = error as ApiError;
         
      if (errorMsg && errorMsg.response?.status === 429) {
        setIsRateLimited(true);
        setRateLimitTimer(900);
        setResendCooldown((prev) => ({ ...prev, [method]: 900 }));
        toast.error("Too many OTP requests. Please wait 15 minutes.");
      } else {
        const errorMsg =error as ApiError;
        const errorData = errorMsg.response?.data?.message || `Failed to resend ${method} OTP.`
        setErrors({
          ...errors,
          [`resend${method.charAt(0).toUpperCase() + method.slice(1)}`]: errorData,
        });
        toast.error(errorData);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card
        className="w-full max-w-[400px] bg-white border-2 border-[#dddd] rounded-3xl transition-all mt-20"
        style={{
          transform:
            "perspective(1000px) rotateX(2deg) rotateY(2deg) translateY(0)",
          boxShadow: "6px 6px 0 0 #dddd",
          border: "1px solid #eeee",
          transition:
            "transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out, border 0.3s ease-in-out",
        }}
        onMouseEnter={(e) => {
          const card = e.currentTarget;
          card.style.transform =
            "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(-8px)";
          card.style.boxShadow = "12px 12px 0 0 #dddd";
          card.style.border = "1px solid #eeee";
        }}
        onMouseLeave={(e) => {
          const card = e.currentTarget;
          card.style.transform =
            "perspective(1000px) rotateX(2deg) rotateY(2deg) translateY(0)";
          card.style.boxShadow = "6px 6px 0 0 #dddd";
          card.style.border = "1px solid #eeee";
        }}
      >
        <CardHeader className="pt-3">
          <div className="flex items-center space-x-2 mb-2">
            <Image
              src={Logo}
              alt="Klariti Logo"
              width={50}
              height={60}
              className="object-contain"
            />
            <CardTitle className="text-3xl font-bold text-gray-900">
              Verify OTP
            </CardTitle>
          </div>
          {type !== "signup" && (
            <p className="text-md text-gray-600">{getOtpMessage()}</p>
          )}
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <form onSubmit={handleVerify} className="space-y-6">
            {type === "signup" ? (
              <>
                <div>
                  <p className="text-md text-gray-600 mb-2">
                    Please enter the OTP sent to your {maskedEmail}.
                  </p>
                  <OTPInput
                    length={6}
                    value={emailOTP}
                    onChange={setEmailOTP}
                    verified={false}
                    disabled={loading}
                    prefix="email"
                  />
                  {errors.emailOTP && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.emailOTP}
                    </p>
                  )}
                  <div className="text-start text-sm text-gray-500 font-medium mt-2">
                    {isRateLimited ? (
                      <span>
                        Too many OTP requests, please wait for{" "}
                        {formatTimer(rateLimitTimer)}
                      </span>
                    ) : resendCooldown.email > 0 ? (
                      <span>
                        Resend OTP in{" "}
                        <span className="font-semibold">
                          {resendCooldown.email}s
                        </span>
                      </span>
                    ) : (
                      <>
                        Didn&apos;t receive a code?{" "}
                        <Button
                          onClick={() => handleResend("email")}
                          variant="ghost"
                          className="text-blue-600 p-0 h-auto font-medium cursor-pointer inline"
                          disabled={loading || isRateLimited}
                        >
                          Resend{" "}
                          <StepForward className="inline relative right-1" />
                        </Button>
                      </>
                    )}
                  </div>
                  {errors.resendEmail && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.resendEmail}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-md text-gray-600 mb-2">
                    Please enter the OTP sent to your {maskedPhone}.
                  </p>
                  <OTPInput
                    length={6}
                    value={phoneOTP}
                    onChange={setPhoneOTP}
                    verified={false}
                    disabled={loading}
                    prefix="phone"
                  />
                  {errors.phoneOTP && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.phoneOTP}
                    </p>
                  )}
                  <div className="text-start text-sm text-gray-500 font-medium mt-2">
                    {isRateLimited ? (
                      <span>
                        Too many OTP requests, please wait for{" "}
                        {formatTimer(rateLimitTimer)}
                      </span>
                    ) : resendCooldown.phone > 0 ? (
                      <span>
                        Resend OTP in{" "}
                        <span className="font-semibold">
                          {resendCooldown.phone}s
                        </span>
                      </span>
                    ) : (
                      <>
                        Didnt receive a code?{" "}
                        <Button
                          onClick={() => handleResend("phone")}
                          variant="ghost"
                          className="text-blue-600 p-0 h-auto font-medium cursor-pointer inline"
                          disabled={loading || isRateLimited}
                        >
                          Resend{" "}
                          <StepForward className="inline relative right-1" />
                        </Button>
                      </>
                    )}
                  </div>
                  {errors.resendPhone && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.resendPhone}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div>
                <OTPInput
                  length={6}
                  value={emailOTP || phoneOTP}
                  onChange={emailOTP ? setEmailOTP : setPhoneOTP}
                  verified={false}
                  disabled={loading}
                  prefix="login"
                />
                {(errors.emailOTP || errors.phoneOTP) && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.emailOTP || errors.phoneOTP}
                  </p>
                )}
                <div className="text-start text-sm text-gray-500 font-medium mt-2">
                  {isRateLimited ? (
                    <span>
                      Too many OTP requests, please wait for{" "}
                      {formatTimer(rateLimitTimer)}
                    </span>
                  ) : resendCooldown.email > 0 ? (
                    <span>
                      Resend OTP in{" "}
                      <span className="font-semibold">
                        {resendCooldown.email}s
                      </span>
                    </span>
                  ) : (
                    <>
                      Didn&apos;t receive a code?
                      <Button
                        onClick={() => handleResend("email")}
                        variant="ghost"
                        className="text-blue-600 p-0 h-auto font-medium cursor-pointer inline"
                        disabled={loading || isRateLimited}
                      >
                        Resend{" "}
                        <StepForward className="inline relative right-1" />
                      </Button>
                    </>
                  )}
                </div>
                {errors.resendEmail && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.resendEmail}
                  </p>
                )}
              </div>
            )}
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg cursor-pointer"
              disabled={
                loading || (type === "signup" && (!emailOTP || !phoneOTP))
              }
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify OTP"
              )}
            </Button>
            {errors.verify && (
              <p className="text-red-500 text-sm mt-4">{errors.verify}</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyOTP() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <VerifyOTPContent />
    </Suspense>
  );
}