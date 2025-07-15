"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User, AuthContextType, ApiError } from "@/types";
import api, { setSessionRestored, isSessionRestored } from "./api";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";

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
    console.debug("[AuthProvider] Generated new deviceId:", storedDeviceId);
  } else {
    console.debug("[AuthProvider] Reusing deviceId:", storedDeviceId);
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
    console.debug("[AuthProvider] Session restoration skipped due to lock or ongoing restoration");
    return;
  }
  setIsRestoring(true);
  localStorage.setItem("sessionLock", "true");
  localStorage.setItem("sessionLockTimestamp", Date.now().toString());
  setLoading(true);

  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  const lastPath = localStorage.getItem("lastPath") || "/my-learnings";

  if (!token || !userId || isLoggedIn !== "true" || !deviceId) {
    console.warn("[AuthProvider] Missing session data:", {
      token: !!token,
      userId: !!userId,
      isLoggedIn,
      deviceId: !!deviceId,
    });
    clearSession();
    setLoading(false);
    setSessionRestored(true);
    setIsRestoring(false);
    localStorage.removeItem("sessionLock");
    router.push("/login");
    return;
  }

  try {
    console.debug("[AuthProvider] Attempting direct login with token:", token.slice(0, 10) + "...");
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

    // Delay redirection to ensure session is fully restored
    setTimeout(() => {
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
    }, 100); // Small delay to ensure state updates
  } catch (error) {
    const errorMsg = error as ApiError;
    console.error("[AuthProvider] Direct login error:", {
      message: errorMsg.response?.data?.message || errorMsg.message,
      status: errorMsg.response?.status,
    });

    if (errorMsg.response?.status === 401) {
      try {
        console.debug("[AuthProvider] Attempting token renewal for user:", userId);
        const response = await api.post("/auth/renew-token", { userId, deviceId });
        const newToken = response.data.token;
        localStorage.setItem("token", newToken);
        console.debug("[AuthProvider] Token renewed successfully");

        // Retry direct login with new token
        const retryResponse = await api.post(
          "/auth/direct-login",
          {},
          {
            headers: { Authorization: `Bearer ${newToken}`, "Device-Id": deviceId },
          }
        );
        const { user: restoredUser, token: updatedToken } = retryResponse.data;

        if (updatedToken && updatedToken !== newToken) {
          localStorage.setItem("token", updatedToken);
          console.debug("[AuthProvider] Updated token after retry");
        }

        localStorage.setItem("userId", restoredUser._id);
        localStorage.setItem("isLoggedIn", "true");
        setUser(restoredUser);
        setSessionRestored(true);

        await api.post(
          "/auth/sync-device",
          { deviceId },
          {
            headers: { "Device-Id": deviceId, Authorization: `Bearer ${updatedToken || newToken}` },
          }
        );

        // Delay redirection to ensure session is fully restored
        setTimeout(() => {
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
        }, 100);
      } catch (renewError) {
        const renewErrorMsg = renewError as ApiError;
        console.error("[AuthProvider] Token renewal failed:", {
          message: renewErrorMsg.response?.data?.message || renewErrorMsg.message,
          status: renewErrorMsg.response?.status,
        });
        clearSession();
        setLoading(false);
        setSessionRestored(true);
        router.push("/login");
        toast.error(renewErrorMsg?.response?.data?.message || "Session expired. Please log in again.");
      }
    } else {
      console.error("[AuthProvider] Non-401 error during direct login:", errorMsg);
      clearSession();
      setLoading(false);
      setSessionRestored(true);
      router.push("/login");
      toast.error(errorMsg?.response?.data?.message || "Failed to restore session. Please log in again.");
    }
  } finally {
    setLoading(false);
    setIsRestoring(false);
    localStorage.removeItem("sessionLock");
    localStorage.removeItem("sessionLockTimestamp");
  }
}, [deviceId, isRestoring, router]);


useEffect(() => {
  if (deviceId && !isSessionRestored && !isRestoring) {
    restoreSession();
  }
}, [deviceId, isRestoring, restoreSession]);

  const logout = useCallback(async () => {
    if (isLoggingOut) {
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