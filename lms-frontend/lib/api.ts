import { ApiError } from "@/types";
import axios, { InternalAxiosRequestConfig, AxiosRequestHeaders } from "axios";

interface PendingRequest {
  resolve: (config: InternalAxiosRequestConfig) => void;
  config: InternalAxiosRequestConfig;
}

const api = axios.create({
  baseURL: "https://klaritilmstest-39565511862.asia-south2.run.app/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export let isSessionRestored = false;
let pendingRequests: PendingRequest[] = [];

const QUEUE_TIMEOUT = 10000;

export const setSessionRestored = (value: boolean) => {
  isSessionRestored = value;
  if (value && pendingRequests.length > 0) {
    pendingRequests.forEach(({ resolve, config }) => resolve(config));
    pendingRequests = [];
  }
};

api.interceptors.request.use(
  (
    config: InternalAxiosRequestConfig
  ): InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig> => {
    config.headers = config.headers || ({} as AxiosRequestHeaders);

    if (config.url?.includes("/auth/direct-login") || config.url?.includes("/auth/verify-login-otp")) {
      return config;
    }

    if (!isSessionRestored) {
      return new Promise(
        (resolve: (config: InternalAxiosRequestConfig) => void, reject) => {
          pendingRequests.push({ resolve, config });
          setTimeout(() => {
            if (
              !isSessionRestored &&
              pendingRequests.some((req) => req.config === config)
            ) {
              console.error(
                "[API] Request timeout waiting for session restoration:",
                config.url
              );
              pendingRequests = pendingRequests.filter(
                (req) => req.config !== config
              );
              reject(new Error("Session restoration timeout"));
              localStorage.setItem("isLoggedIn", "false");
            }
          }, QUEUE_TIMEOUT);
        }
      );
    }

    const token = localStorage.getItem("token");
    const deviceId = localStorage.getItem("deviceId");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn("[API] No token found for request:", config.url);
    }
    if (deviceId) {
      config.headers["Device-Id"] = deviceId;
    } else {
      console.warn("[API] No deviceId found for request:", config.url);
    }
    return config;
  },
  (error) => {
    console.error("[API] Request interceptor error:", error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {

    if (response.data.token && (response.config.url?.includes("/auth/verify-login-otp") || response.config.url?.includes("/auth/direct-login"))) {
      const currentToken = localStorage.getItem("token");
      if (response.data.token !== currentToken) {
        localStorage.setItem("token", response.data.token);
        if (response.data.user?._id) {
          localStorage.setItem("userId", response.data.user._id);
          localStorage.setItem("isLoggedIn", "true");
        }
        console.debug("[API] Updated token and user data from response:", response.config.url);
      }
    }
    return response;
  },
  async (error) => {
    console.error("[API] Response error:", {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message,
    });

    if (
      error.response?.status === 401 &&
      !error.config.url.includes("/auth/logout") &&
      !error.config._retry
    ) {
      console.debug("[API] Attempting token renewal");
      error.config._retry = true;

      const userId = localStorage.getItem("userId");
      const deviceId = localStorage.getItem("deviceId") || "unknown";

      if (userId && deviceId) {
        try {
          const response = await api.post("/auth/renew-token", { userId, deviceId });
          const newToken = response.data.token;
          localStorage.setItem("token", newToken);

          error.config.headers.Authorization = `Bearer ${newToken}`;
          return api(error.config);
        } catch (error) {
          const renewError = error as ApiError;
          console.error("[API] Token renewal failed:", renewError.response?.data?.message || renewError.message);
          localStorage.setItem("isLoggedIn", "false");
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
          return Promise.reject(renewError);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;