import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { Loader2 } from "lucide-react";
import api from "../lib/api";

const OAUTH_ERROR_MESSAGE =
  "No se pudo completar el inicio de sesión con Google. Inténtalo nuevamente.";
const MISSING_CODE_MESSAGE =
  "El enlace de autenticación es inválido o está incompleto.";

type OAuthUser = Parameters<
  ReturnType<typeof useAuth>["handleOAuthCallback"]
>[2];

interface OAuthExchangeData {
  accessToken: string;
  refreshToken: string;
  user: OAuthUser;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isOAuthExchangeData = (value: unknown): value is OAuthExchangeData => {
  if (!isRecord(value) || !isRecord(value.user)) return false;

  return (
    typeof value.accessToken === "string" &&
    value.accessToken.length > 0 &&
    typeof value.refreshToken === "string" &&
    value.refreshToken.length > 0 &&
    typeof value.user.id === "string" &&
    typeof value.user.email === "string" &&
    typeof value.user.name === "string" &&
    (value.user.role === "USER" ||
      value.user.role === "AGENT" ||
      value.user.role === "ADMIN") &&
    typeof value.user.mustChangePassword === "boolean" &&
    typeof value.user.createdAt === "string" &&
    typeof value.user.updatedAt === "string"
  );
};

const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleOAuthCallback } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const exchangeStartedRef = useRef(false);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  // Retira el código de la barra y del historial antes de iniciar el canje.
  // Conserva el state interno de React Router para no romper su navegación.
  useLayoutEffect(() => {
    window.history.replaceState(
      window.history.state,
      document.title,
      window.location.pathname,
    );
  }, []);

  useEffect(() => {
    // React 18 ejecuta los efectos dos veces en StrictMode durante desarrollo.
    // El código es de un solo uso, por lo que el canje debe iniciarse una sola vez.
    if (exchangeStartedRef.current) return;
    exchangeStartedRef.current = true;

    if (oauthError) {
      setError(OAUTH_ERROR_MESSAGE);
      return;
    }

    if (!code) {
      setError(MISSING_CODE_MESSAGE);
      return;
    }

    const exchangeCode = async () => {
      try {
        const response = await api.post("/api/auth/google/exchange", { code });
        const exchangeData: unknown = response.data?.data;

        if (!isOAuthExchangeData(exchangeData)) {
          throw new Error("Invalid OAuth exchange response");
        }

        handleOAuthCallback(
          exchangeData.accessToken,
          exchangeData.refreshToken,
          exchangeData.user,
        );
      } catch {
        setError(OAUTH_ERROR_MESSAGE);
      }
    };

    void exchangeCode();
  }, [code, handleOAuthCallback, oauthError]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">
              Error de Autenticación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600 mb-4">{error}</p>
            <Button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="w-full"
            >
              Volver al Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            Completando Autenticación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-gray-600">Procesando...</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OAuthCallbackPage;
