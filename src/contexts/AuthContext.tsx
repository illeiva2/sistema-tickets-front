import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../lib/api";

interface User {
  id: string;
  email: string;
  name: string;
  role: "USER" | "AGENT" | "ADMIN";
  department?: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
  mustChangePassword: boolean;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  handleOAuthCallback: (
    accessToken: string,
    refreshToken: string,
    userData: User,
  ) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    const bootstrap = async () => {
      const token = localStorage.getItem("accessToken");
      const userData = localStorage.getItem("user");

      if (!token || !userData) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get("/api/auth/me");
        const meUser: User = response.data.data.user;
        setUser(meUser);
        localStorage.setItem("user", JSON.stringify(meUser));

        if (meUser.mustChangePassword && window.location.pathname !== "/setup-password") {
          navigate("/setup-password", { replace: true });
        }
      } catch {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, [navigate]);

  useEffect(() => {
    const handleAuthLogout = () => {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      setUser(null);
      const path = window.location.pathname;
      if (!path.startsWith("/login") && !path.startsWith("/register") && !path.startsWith("/oauth")) {
        navigate("/login", { replace: true });
      }
    };

    window.addEventListener("auth:logout", handleAuthLogout);
    return () => window.removeEventListener("auth:logout", handleAuthLogout);
  }, [navigate]);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await api.post("/api/auth/login", credentials);
      const { accessToken, refreshToken, user: userData } = response.data.data;

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(userData));

      setUser(userData);
      toast.success("Inicio de sesión exitoso");

      if (userData.mustChangePassword) {
        navigate("/setup-password", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (error: any) {
      const message =
        error.response?.data?.error?.message || "Error al iniciar sesión";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = () => {
    window.location.href = `${api.defaults.baseURL}/api/auth/google`;
  };

  const handleOAuthCallback = (
    accessToken: string,
    refreshToken: string,
    userData: User,
  ) => {
    try {
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(userData));

      setUser(userData);
      toast.success("Inicio de sesión con Google exitoso");

      if (userData.mustChangePassword) {
        navigate("/setup-password", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch {
      toast.error("Error procesando la autenticación de Google");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      setUser(null);
      navigate("/login", { replace: true });
    }
  };

  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // Si el backend falla, igual queremos limpiar la sesión local.
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      setUser(null);
      toast.success("Sesión cerrada");
      navigate("/login", { replace: true });
    }
  };

  const refreshUser = async () => {
    try {
      const response = await api.get("/api/auth/me");
      const userData = response.data.data.user;
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
    } catch {
      // Silencioso: el interceptor maneja 401.
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    loginWithGoogle,
    logout,
    refreshUser,
    handleOAuthCallback,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
