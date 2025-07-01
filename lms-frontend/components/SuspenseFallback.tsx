"use client";

import LoadingPage from "@/components/LoadingPage";

export default function SuspenseFallback() {
  return <LoadingPage message="Loading..." color="#ff0000" />;
}
