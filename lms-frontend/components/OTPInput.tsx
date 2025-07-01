"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { OTPInputProps } from "@/types";

export default function OTPInput({
  length,
  value,
  onChange,
  verified = false,
  disabled = false,
  prefix = "otp",
}: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(""));

  useEffect(() => {
    if (value) {
      const newOtp = value.split("").slice(0, length);
      while (newOtp.length < length) {
        newOtp.push("");
      }
      setOtp(newOtp);
    }
  }, [value, length]);

  const handleChange = (index: number, newValue: string) => {
    if (!/^\d?$/.test(newValue)) return;

    const newOtp = [...otp];
    newOtp[index] = newValue;
    setOtp(newOtp);
    onChange(newOtp.join(""));

    if (newValue && index < length - 1) {
      const nextInput = document.getElementById(`${prefix}-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`${prefix}-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    index: number
  ) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");
    if (pastedData.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < Math.min(pastedData.length, length - index); i++) {
        newOtp[index + i] = pastedData[i];
      }
      setOtp(newOtp);
      onChange(newOtp.join(""));

      const lastFilledIndex = Math.min(
        index + pastedData.length - 1,
        length - 1
      );
      const lastInput = document.getElementById(
        `${prefix}-input-${lastFilledIndex}`
      );
      lastInput?.focus();
    }
  };

  const safeOtp = otp.length === length ? otp : new Array(length).fill("");

  return (
    <div className="flex space-x-2 justify-center">
      {safeOtp.map((digit, index) => (
        <div key={index} className="relative">
          <Input
            id={`${prefix}-input-${index}`}
            type="text"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={(e) => handlePaste(e, index)}
            disabled={disabled}
            className={`w-12 h-12 text-center text-lg border-2 rounded-md transition-all duration-200
              ${digit ? "border-blue-500" : "border-gray-300"}
              focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none
              disabled:bg-gray-100 disabled:border-gray-200 disabled:cursor-not-allowed`}
          />
          {verified && index === length - 1 && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <CheckCircle className="text-green-500 w-8 h-8" />
            </motion.div>
          )}
        </div>
      ))}
    </div>
  );
}
