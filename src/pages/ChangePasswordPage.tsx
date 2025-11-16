import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { useAuth } from "../hooks";
import api from "../lib/api";
import toast from "react-hot-toast";

interface PasswordStrength {
  score: number;
  feedback: string[];
}

const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  // Determinar si es cambio de contraseña o setup de contraseña
  const isSetupMode = searchParams.get("mode") === "setup";
  const isChangeMode = !isSetupMode;
  
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: [],
  });

  // Validar contraseña en tiempo real
  useEffect(() => {
    if (formData.newPassword) {
      const strength = validatePassword(formData.newPassword);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength({ score: 0, feedback: [] });
    }
  }, [formData.newPassword]);

  const validatePassword = (password: string): PasswordStrength => {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push("Mínimo 8 caracteres");
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Al menos una minúscula");
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Al menos una mayúscula");
    }

    if (/[0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Al menos un número");
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Al menos un carácter especial");

    }

    return { score, feedback };
  };

  const getStrengthColor = (score: number) => {
    if (score <= 2) return "text-red-500";
    if (score <= 3) return "text-orange-500";
    if (score <= 4) return "text-yellow-500";
    return "text-green-500";
  };

  const getStrengthText = (score: number) => {
    if (score <= 2) return "Débil";
    if (score <= 3) return "Media";
    if (score <= 4) return "Buena";
    return "Excelente";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (passwordStrength.score < 3) {
      toast.error("La contraseña es demasiado débil");
      return;
    }

    try {
      setIsSubmitting(true);
      
      if (isSetupMode) {
        // Setup de nueva contraseña (sin contraseña actual)
        const response = await api.post("/api/auth/setup-password", {
          newPassword: formData.newPassword,
        });
        
        if (response.data.success) {
          toast.success("Contraseña configurada correctamente");
          navigate("/");
        }
      } else {
        // Cambio de contraseña (con contraseña actual)
        const response = await api.patch("/api/users/me/password", {
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        });
        
        if (response.data.success) {
          toast.success("Contraseña cambiada correctamente");
          navigate("/");
        }
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || 
        (isSetupMode ? "Error al configurar contraseña" : "Error al cambiar contraseña");
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = (field: "current" | "new" | "confirm") => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {isSetupMode ? "Configurar Contraseña" : "Cambiar Contraseña"}
          </CardTitle>
          <p className="text-muted-foreground">
            {isSetupMode 
              ? "Crea una nueva contraseña para tu cuenta"
              : "Ingresa tu contraseña actual y la nueva contraseña"
            }
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isChangeMode && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Contraseña Actual</label>
                <div className="relative">
                  <Input
                    type={showPasswords.current ? "text" : "password"}
                    value={formData.currentPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, currentPassword: e.target.value })
                    }
                    placeholder="Ingresa tu contraseña actual"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility("current")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Nueva Contraseña</label>
              <div className="relative">
                <Input
                  type={showPasswords.new ? "text" : "password"}
                  value={formData.newPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, newPassword: e.target.value })
                  }
                  placeholder="Ingresa tu nueva contraseña"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("new")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              
              {/* Indicador de fortaleza de contraseña */}
              {formData.newPassword && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Fortaleza:</span>
                    <span className={`font-medium ${getStrengthColor(passwordStrength.score)}`}>
                      {getStrengthText(passwordStrength.score)}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-2 flex-1 rounded-full ${
                          level <= passwordStrength.score
                            ? getStrengthColor(passwordStrength.score).replace("text-", "bg-")
                            : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      />
                    ))}
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      {passwordStrength.feedback.map((feedback, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <X size={12} className="text-red-500" />
                          <span>{feedback}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {passwordStrength.score >= 3 && (
                    <div className="text-xs text-green-600 flex items-center space-x-2">
                      <Check size={12} />
                      <span>Contraseña válida</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Confirmar Nueva Contraseña</label>
              <div className="relative">
                <Input
                  type={showPasswords.confirm ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  placeholder="Confirma tu nueva contraseña"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility("confirm")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || passwordStrength.score < 3}
            >
              {isSubmitting
                ? (isSetupMode ? "Configurando..." : "Cambiando...")
                : (isSetupMode ? "Configurar Contraseña" : "Cambiar Contraseña")
              }
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate("/")}
            >
              Cancelar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChangePasswordPage;
