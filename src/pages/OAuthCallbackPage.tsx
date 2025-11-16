import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Loader2 } from "lucide-react";

const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleOAuthCallback } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    const userData = searchParams.get("user");
    const isNewUser = searchParams.get("newUser") === "true";

    console.log("🔍 OAuth Callback Debug:");
    console.log("   accessToken:", accessToken ? "Presente" : "Faltante");
    console.log("   refreshToken:", refreshToken ? "Presente" : "Faltante");
    console.log("   userData:", userData);
    console.log("   isNewUser:", isNewUser);

    if (!accessToken || !userData) {
      setError("Datos de autenticación incompletos");
      return;
    }

    try {
      const user = JSON.parse(userData);
      console.log("👤 Usuario parseado:", user);
      console.log("   mustChangePassword:", user.mustChangePassword);
      console.log("   email:", user.email);
      console.log("   role:", user.role);

      if (isNewUser) {
        // Usuario nuevo, redirigir a registro
        console.log("🆕 Usuario nuevo detectado, redirigiendo a registro");
        const encodedUser = encodeURIComponent(JSON.stringify(user));
        navigate(`/register?user=${encodedUser}&token=${accessToken}`);
        return;
      }

      // Usuario existente, procesar normalmente
      if (refreshToken) {
        handleOAuthCallback(accessToken, refreshToken, user);
      } else {
        // Si no hay refreshToken, es un usuario nuevo que necesita completar registro
        console.log("🆕 Usuario sin refreshToken, redirigiendo a registro");
        const encodedUser = encodeURIComponent(JSON.stringify(user));
        navigate(`/register?user=${encodedUser}&token=${accessToken}`);
      }
    } catch (error) {
      console.error("Error parsing OAuth data:", error);
      setError("Error procesando datos de autenticación");
    }
  }, [searchParams, handleOAuthCallback, navigate]);

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
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Volver al Login
            </button>
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
