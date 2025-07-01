"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/types";

export default function Logout() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    const isVerified = localStorage.getItem("isVerified");
    const token = localStorage.getItem("token");
    if (!isVerified || !token) {
      router.push("/login");
    }
  }, [router]);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
    } catch (error) {
      const errorMessage = error as ApiError;
      console.error("Logout error:", errorMessage.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-[400px] bg-white border-2 border-[#dddd] rounded-3xl transition-all mt-20">
        <CardHeader className="pt-6">
          <CardTitle className="text-start text-3xl font-bold text-gray-900 break-words">
            Logout
          </CardTitle>
          <p className="text-start text-md text-black-500 mt-1">
            Are you sure you want to log out?
          </p>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <Button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-lg transition-colors cursor-pointer"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging out...
              </>
            ) : (
              "Logout"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
