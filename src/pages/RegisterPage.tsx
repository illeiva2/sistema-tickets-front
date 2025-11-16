import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { User, Mail, Shield } from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";

interface RegisterForm {
  name: string;
  email: string;
  role: "USER" | "AGENT" | "ADMIN";
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Obtener datos del usuario de Google desde los parámetros de URL
  const googleUserData = searchParams.get("user");
  const accessToken = searchParams.get("token");
  
  const [formData, setFormData] = useState<RegisterForm>({
    name: "",
    email: "",
    role: "USER",
  });

  useEffect(() => {
    if (googleUserData && accessToken) {
      try {
        const userData = JSON.parse(decodeURIComponent(googleUserData));
        setFormData({
          name: userData.name || "",
          email: userData.email || "",
          role: "USER", // Por defecto USER, solo ADMIN puede cambiar roles
        });
      } catch (error) {
        console.error("Error parsing Google user data:", error);
        toast.error("Error al procesar datos de Google");
        navigate("/login");
      }
    } else {
      // Si no hay datos de Google, redirigir al login
      navigate("/login");
    }
  }, [googleUserData, accessToken, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const response = await api.post("/api/auth/register", {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        googleAccessToken: accessToken,
      });

      if (response.data.success) {
        toast.success("Usuario registrado exitosamente");
        
        // Guardar token y redirigir a setup de contraseña
        localStorage.setItem("accessToken", response.data.data.accessToken);
        localStorage.setItem("refreshToken", response.data.data.refreshToken);
        localStorage.setItem("user", JSON.stringify(response.data.data.user));
        
        navigate("/setup-password");
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || "Error al registrar usuario";
      toast.error(message);
      
      if (error.response?.status === 403) {
        // Usuario no autorizado para este dominio
        toast.error("Tu dominio de email no está autorizado para registrarse");
        navigate("/login");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof RegisterForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!googleUserData || !accessToken) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Completar Registro</CardTitle>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Completa tu información para finalizar el registro
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Nombre completo"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                  className="pl-10"
                  disabled
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                El email no se puede modificar
              </p>
            </div>

            <div>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <select
                  value={formData.role}
                  onChange={(e) => handleInputChange("role", e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md pl-10 bg-background"
                  required
                >
                  <option value="USER">Usuario</option>
                  <option value="AGENT">Agente</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Selecciona tu rol en el sistema
              </p>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Registrando..." : "Completar Registro"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/login")}
              className="w-full"
            >
              Cancelar
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center gap-2 text-blue-800 mb-2">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Información Importante</span>
            </div>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• Solo usuarios con dominio corporativo autorizado pueden registrarse</p>
              <p>• Después del registro, deberás configurar una contraseña personal</p>
              <p>• Podrás acceder tanto con Google como con email y contraseña</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterPage;