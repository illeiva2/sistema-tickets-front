import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks";

const SetupPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Redirigir a ChangePasswordPage en modo setup
    if (user) {
      navigate("/change-password?mode=setup", { replace: true });
    }
  }, [user, navigate]);

  // Mostrar loading mientras redirige
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirigiendo...</p>
      </div>
    </div>
  );
};

export default SetupPasswordPage;
