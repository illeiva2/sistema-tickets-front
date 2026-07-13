import React, { useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Chrome, Shield } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { useAuth } from "../hooks";

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const [isStarting, setIsStarting] = useState(false);

  // La ruta ya no acepta datos de identidad ni credenciales por query string.
  useLayoutEffect(() => {
    window.history.replaceState(
      window.history.state,
      document.title,
      window.location.pathname,
    );
  }, []);

  const handleGoogleRegistration = () => {
    setIsStarting(true);
    loginWithGoogle();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Acceso de IT</CardTitle>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Ingresá con una cuenta corporativa previamente habilitada
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            onClick={handleGoogleRegistration}
            disabled={isStarting}
            className="w-full"
          >
            <Chrome className="mr-2 h-4 w-4" />
            {isStarting ? "Redirigiendo..." : "Continuar con Google"}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/login", { replace: true })}
            className="w-full"
          >
            Volver al login
          </Button>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center gap-2 text-blue-800 mb-2">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Registro corporativo</span>
            </div>
            <p className="text-sm text-blue-700">
              Sólo las cuentas provisionadas como AGENT o ADMIN por IT pueden
              autenticarse. El dominio por sí solo no concede acceso.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterPage;
