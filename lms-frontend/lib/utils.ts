import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function maskEmail(email: string): string {
  if (!email) return "";
  const [localPart, domain] = email.split("@");
  if (localPart.length <= 1) return `${localPart}*****@${domain}`;
  return `${localPart[0]}*****@${domain}`;
}

export function maskPhone(phone: string): string {
  if (!phone) return "";
  const phoneNumber = phone.replace(/^\+\d{1,2}/, "");
  if (phoneNumber.length < 3) return phoneNumber;
  return `${phoneNumber[0]}${"*".repeat(phoneNumber.length - 2)}${phoneNumber.slice(-2)}`;
}