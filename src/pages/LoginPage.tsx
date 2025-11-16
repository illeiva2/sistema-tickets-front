import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui";
import { useAuth } from "../hooks";
import { Chrome, Trash2, AlertCircle, Info, UserPlus, Mail, Lock } from "lucide-react";
import { clearAuthData } from "../utils/clearAuth";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});

type LoginForm = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const { login, loginWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [showRegisterInfo, setShowRegisterInfo] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setError(null);
      setIsGoogleUser(false);
      await login(data);
    } catch (error: any) {
      const errorCode = error?.response?.data?.error?.code;
      const errorMessage = error?.response?.data?.error?.message;

      if (errorCode === "GOOGLE_OAUTH_USER") {
        setIsGoogleUser(true);
        setError(errorMessage);
      } else {
        setError(errorMessage || "Error al iniciar sesión");
      }
    }
  };

  const handleClearAuth = () => {
    clearAuthData();
    window.location.reload();
  };

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      setIsGoogleUser(false);
      await loginWithGoogle();
    } catch (error: any) {
      setError("Error al iniciar sesión con Google");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Iniciar Sesión</CardTitle>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Accede a tu cuenta o regístrate con Google
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  {...register("email")}
                  type="email"
                  placeholder="Email"
                  className={`pl-10 ${errors.email ? "border-red-500" : ""}`}
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  {...register("password")}
                  type="password"
                  placeholder="Contraseña"
                  className={`pl-10 ${errors.password ? "border-red-500" : ""}`}
                />
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div
                className={`p-3 rounded-md text-sm ${
                  isGoogleUser
                    ? "bg-blue-50 border border-blue-200 text-blue-800"
                    : "bg-red-50 border border-red-200 text-red-800"
                }`}
              >
                <div className="flex items-start gap-2">
                  {isGoogleUser ? (
                    <Info className="h-4 w-4 mt-0.5 text-blue-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mt-0.5 text-red-600" />
                  )}
                  <div>
                    <p className="font-medium">
                      {isGoogleUser
                        ? "Usuario de Google detectado"
                        : "Error de autenticación"}
                    </p>
                    <p className="mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Google OAuth user suggestion */}
            {isGoogleUser && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="flex items-center gap-2 text-blue-800">
                  <Chrome className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Solución recomendada:
                  </span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  Usa &quot;Continuar con Google&quot; para acceder a tu cuenta,
                  o configura una contraseña personal después del primer login.
                </p>
              </div>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Iniciando..." : "Iniciar Sesión"}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">
                  O continuar con
                </span>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleLogin}
                className="w-full"
              >
                <Chrome className="mr-2 h-4 w-4" />
                Continuar con Google
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRegisterInfo(!showRegisterInfo)}
                className="w-full"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                ¿Nuevo usuario? Regístrate
              </Button>
            </div>

            {/* Información de registro */}
            {showRegisterInfo && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center gap-2 text-blue-800 mb-2">
                  <Info className="h-4 w-4" />
                  <span className="text-sm font-medium">Registro de Usuarios</span>
                </div>
                <div className="text-sm text-blue-700 space-y-2">
                  <p>
                    • El registro solo está disponible para usuarios con dominio corporativo autorizado
                  </p>
                  <p>
                    • Usa &quot;Continuar con Google&quot; para crear tu cuenta
                  </p>
                  <p>
                    • Después del primer login, podrás configurar una contraseña personal
                  </p>
                  <p>
                    • Los usuarios existentes pueden iniciar sesión con email y contraseña
                  </p>
                </div>
              </div>
            )}

            {/* Debug button - solo en desarrollo */}
            {import.meta.env.DEV && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearAuth}
                className="w-full mt-2 text-xs text-gray-500 hover:text-red-600"
              >
                <Trash2 className="mr-2 h-3 w-3" />
                Limpiar datos de autenticación (Debug)
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
