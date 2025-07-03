"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User, AuthContextType, ApiError } from "@/types";
import api, { setSessionRestored, isSessionRestored } from "./api";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";
import { debounce } from "lodash";

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const LOGOUT_TOAST_ID = "logout-success";
let isLoggingOut = false;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [deviceId, setDeviceId] = useState<string>("");
  const [isRestoring, setIsRestoring] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname && pathname !== "/login" && pathname !== "/timezone-setup") {
      localStorage.setItem("lastPath", pathname);
    }
  }, [pathname]);

  useEffect(() => {
    let storedDeviceId = localStorage.getItem("deviceId");
    if (!storedDeviceId) {
      storedDeviceId = uuidv4();
      localStorage.setItem("deviceId", storedDeviceId);
    }
    setDeviceId(storedDeviceId);
  }, []);

  const clearSession = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("sessionLock");
    localStorage.setItem("lastPath", "/my-learnings");
    setUser(null);
  };

  const restoreSession = useCallback(async () => {
    if (isRestoring || localStorage.getItem("sessionLock") === "true") {
      console.debug("[AuthProvider] Skipping restoreSession, already in progress or locked");
      return;
    }
    setIsRestoring(true);
    localStorage.setItem("sessionLock", "true");
    setLoading(true);

    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    const lastPath = localStorage.getItem("lastPath") || "/my-learnings";

    if (!token || !userId || isLoggedIn !== "true" || !deviceId) {
      console.debug("[AuthProvider] Invalid session data, clearing session");
      clearSession();
      setLoading(false);
      setSessionRestored(true);
      router.push("/login");
      setIsRestoring(false);
      localStorage.removeItem("sessionLock");
      return;
    }

    try {
      const response = await api.post(
        "/auth/direct-login",
        {},
        {
          headers: { Authorization: `Bearer ${token}`, "Device-Id": deviceId },
        }
      );
      const { user: restoredUser, token: newToken } = response.data;

      if (newToken && newToken !== token) {
        localStorage.setItem("token", newToken);
        console.debug("[AuthProvider] Updated token in localStorage");
      }

      localStorage.setItem("userId", restoredUser._id);
      localStorage.setItem("isLoggedIn", "true");
      setUser(restoredUser);
      setSessionRestored(true);

      await api.post(
        "/auth/sync-device",
        { deviceId },
        {
          headers: { "Device-Id": deviceId, Authorization: `Bearer ${newToken || token}` },
        }
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      const roleName = restoredUser.role?.roleName.toLowerCase().replace(/\s+/g, "");
      if (
        (roleName === "student" || roleName === "teacher") &&
        (restoredUser.isFirstLogin || !restoredUser.isTimezoneSet)
      ) {
        router.push("/timezone-setup");
        localStorage.setItem("lastPath", lastPath);
      } else {
        router.push(lastPath);
      }
    } catch (error) {
      const errorMsg = error as ApiError;
      console.error("[AuthProvider] Restore session error:", errorMsg.response?.data?.message || errorMsg.message);
      clearSession();
      setLoading(false);
      setSessionRestored(true);
      router.push("/login");
      toast.error(errorMsg?.response?.data?.message || "Session expired. Please log in again.");
    } finally {
      setLoading(false);
      setIsRestoring(false);
      localStorage.removeItem("sessionLock");
    }
  }, [deviceId, router, isRestoring]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedRestoreSession = useCallback(
    debounce(() => restoreSession(), 4000),
    [restoreSession]
  );

  useEffect(() => {
    if (deviceId && !isSessionRestored && !isRestoring) {
      debouncedRestoreSession();
    }
  }, [deviceId, isRestoring, debouncedRestoreSession]);

  const logout = useCallback(async () => {
    if (isLoggingOut) {
      console.debug("[AuthProvider] Logout already in progress, skipping");
      return;
    }
    isLoggingOut = true;
    try {
      const token = localStorage.getItem("token");
      if (token) {
        await api.post(
          "/auth/logout",
          {},
          {
            headers: {
              "Device-Id": deviceId,
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }
    } catch (error) {
      console.error("[AuthProvider] Logout error:", error);
    } finally {
      localStorage.setItem("isLoggedIn", "false");
      clearSession();
      toast.success("Logged out successfully!", { id: LOGOUT_TOAST_ID });
      router.push("/login");
      setTimeout(() => { isLoggingOut = false; }, 1000);
    }
  }, [deviceId, router]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (
        event.key === "isLoggedIn" &&
        event.newValue === "false" &&
        event.storageArea === localStorage
      ) {
        console.debug("[AuthProvider] Detected isLoggedIn set to false, proceeding with logout");
        logout();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, setUser, logout, loading, deviceId }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};