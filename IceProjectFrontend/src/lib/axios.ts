import axios from "axios";
import { getCookie, setCookie, deleteCookie } from "cookies-next";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 
           process.env.NEXT_PUBLIC_API_BASE_URL || 
           "https://pwa-backend-fxw6.onrender.com",
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  },
});

// Token refresh state
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Utility to decode JWT and check expiration
const isTokenExpiringSoon = (token: string): boolean => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    
    const payload = JSON.parse(atob(parts[1]));
    const exp = payload.exp;
    
    if (!exp) return false;
    
    // Check if token expires in less than 5 minutes
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = exp - now;
    
    return timeUntilExpiry < 300; // 5 minutes
  } catch (error) {
    return false;
  }
};

// Function to refresh the access token
const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const refreshToken = typeof window !== "undefined" 
      ? localStorage.getItem("refreshToken") 
      : null;
    
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "https://pwa-backend-fxw6.onrender.com"}/auth/refresh`,
      { refreshToken }
    );

    const newAccessToken = response.data.accessToken;
    
    if (newAccessToken) {
      setCookie("token", newAccessToken);
      localStorage.setItem("token", newAccessToken);
      localStorage.setItem("accessToken", newAccessToken);
      return newAccessToken;
    }
    
    return null;
  } catch (error) {
    console.error("Token refresh failed:", error);
    return null;
  }
};

api.interceptors.request.use(
  async (config) => {
    // Prefer cookie token; fallback to localStorage tokens when cookies are missing
    let token: string | undefined | null = getCookie("token") as
      | string
      | undefined
      | null;
    
    if (!token && typeof window !== "undefined") {
      try {
        token =
          (window.localStorage.getItem("token") ||
            window.localStorage.getItem("accessToken")) ?? undefined;
      } catch {
        // ignore storage access issues
      }
    }

    // Debug logging for OAuth requests
    if (config.url?.includes("/qbo/oauth/start")) {
      console.log("OAuth request interceptor:", {
        hasToken: !!token,
        token:
          token && typeof token === "string"
            ? `${token.substring(0, 20)}...`
            : null,
        url: config.url,
        method: config.method,
      });
    }

    // Check if token is expiring soon and refresh it
    if (token && typeof token === "string" && isTokenExpiringSoon(token)) {
      if (!isRefreshing) {
        isRefreshing = true;
        
        try {
          const newToken = await refreshAccessToken();
          if (newToken) {
            token = newToken;
            processQueue(null, newToken);
          } else {
            processQueue(new Error("Token refresh failed"), null);
          }
        } catch (error) {
          processQueue(error, null);
          throw error;
        } finally {
          isRefreshing = false;
        }
      } else {
        // Wait for the token refresh to complete
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            if (newToken) {
              config.headers.Authorization = `Bearer ${newToken}`;
            }
            return config;
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    // If the response includes an accessToken, store it
    const accessToken = response.data?.accessToken;
    if (accessToken) {
      setCookie("token", accessToken);
      localStorage.setItem("token", accessToken);
      localStorage.setItem("accessToken", accessToken); // Also store with the expected key
    }

    // If the response includes a refreshToken, store it
    const refreshToken = response.data?.refreshToken;
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
    }

    // Store user data if available
    if (response.data?.user) {
      localStorage.setItem("user", JSON.stringify(response.data.user));
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (!error.response) {
      // Network error
      return Promise.reject({
        response: {
          status: 0,
          data: { message: "Network error. Please check your connection." },
        },
      });
    }

    // Handle 401 errors with token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      const requestUrl = error.config?.url || "";
      
      // If this is the login or refresh attempt itself failing, do not retry
      if (/\/auth\/(login|refresh)$/i.test(requestUrl)) {
        // For login failures, leave handling to the caller
        if (/\/auth\/login$/i.test(requestUrl)) {
          return Promise.reject(error);
        }
        // For refresh failures, logout the user
        deleteCookie("token");
        localStorage.removeItem("token");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }

      // Try to refresh the token
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        
        if (newToken) {
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } else {
          // Refresh failed, logout user
          processQueue(new Error("Token refresh failed"), null);
          deleteCookie("token");
          localStorage.removeItem("token");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          if (typeof window !== "undefined" && window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
          return Promise.reject(error);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Refresh failed, logout user
        deleteCookie("token");
        localStorage.removeItem("token");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
