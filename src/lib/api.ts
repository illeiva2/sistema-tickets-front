import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import toast from "react-hot-toast";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const REFRESH_PATH = "/api/auth/refresh";
const AUTH_BYPASS_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/auth/logout",
  "/api/auth/google",
  "/api/auth/setup-password",
];

type RetryableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

let refreshPromise: Promise<string> | null = null;
let lastRateLimitToastAt = 0;
const RATE_LIMIT_TOAST_COOLDOWN_MS = 5000;

const notifyRateLimited = () => {
  const now = Date.now();
  if (now - lastRateLimitToastAt < RATE_LIMIT_TOAST_COOLDOWN_MS) return;
  lastRateLimitToastAt = now;
  toast.error("Demasiadas solicitudes, esperá unos segundos.");
};

const isAuthBypassed = (url: string | undefined) => {
  if (!url) return false;
  return AUTH_BYPASS_PATHS.some((p) => url.includes(p));
};

const emitLogout = () => {
  window.dispatchEvent(new Event("auth:logout"));
};

const performRefresh = async (): Promise<string> => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      throw new Error("missing refresh token");
    }

    const response = await axios.post(`${API_URL}${REFRESH_PATH}`, {
      refreshToken,
    });

    const newAccessToken = response.data?.data?.accessToken as string | undefined;
    if (!newAccessToken) {
      throw new Error("refresh response without accessToken");
    }

    localStorage.setItem("accessToken", newAccessToken);
    return newAccessToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as RetryableConfig | undefined;

    if (status === 429) {
      notifyRateLimited();
      return Promise.reject(error);
    }

    if (status === 401 && original && !original._retried && !isAuthBypassed(original.url)) {
      original._retried = true;

      try {
        const newAccessToken = await performRefresh();
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${newAccessToken}`;
        return api.request(original as AxiosRequestConfig);
      } catch {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        emitLogout();
      }
    }

    return Promise.reject(error);
  },
);

export default api;
