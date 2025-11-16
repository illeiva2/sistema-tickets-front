import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import OAuthHandler from "./OAuthHandler";
import DashboardPage from "../pages/DashboardPage";

const OAuthWrapper: React.FC = () => {
  const [searchParams] = useSearchParams();
  
  // Verificar si hay parámetros de OAuth
  const hasOAuthParams = searchParams.get("accessToken") && searchParams.get("user");
  
  // Si hay parámetros de OAuth, usar OAuthHandler
  if (hasOAuthParams) {
    return <OAuthHandler />;
  }
  
  // Si no hay parámetros de OAuth, mostrar el dashboard normal
  return <DashboardPage />;
};

export default OAuthWrapper;