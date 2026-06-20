import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks";
import toast from "react-hot-toast";

const OAuthHandler: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleOAuthCallback } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processOAuth = async () => {
      try {
        const accessToken = searchParams.get("accessToken");
        const refreshToken = searchParams.get("refreshToken");
        const userParam = searchParams.get("user");

        if (!accessToken || !userParam) {
          setError("Parámetros de autenticación incompletos");
          return;
        }

        try {
          const user = JSON.parse(decodeURIComponent(userParam));

          if (refreshToken) {
            await handleOAuthCallback(accessToken, refreshToken, user);
          } else {
            const encodedUser = encodeURIComponent(JSON.stringify(user));
            navigate(`/register?user=${encodedUser}&token=${accessToken}`, { replace: true });
          }
        } catch {
          setError("Error procesando datos del usuario");
        }
      } catch {
        setError("Error procesando la autenticación");
      } finally {
        setIsProcessing(false);
      }
    };

    processOAuth();
  }, [searchParams, navigate, handleOAuthCallback]);

  // Si hay error, mostrar mensaje y redirigir
  useEffect(() => {
    if (error && !isProcessing) {
      toast.error(error);
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2000);
    }
  }, [error, isProcessing, navigate]);

  // Mostrar loading mientras se procesa
  if (isProcessing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Procesando autenticación de Google...</p>
        </div>
      </div>
    );
  }

  // Mostrar error si lo hay
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-16 w-16 text-red-500 mx-auto mb-4">❌</div>
          <h2 className="text-xl font-semibold mb-2">Error de Autenticación</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <p className="text-sm text-muted-foreground">Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  return null;
};

export default OAuthHandler;