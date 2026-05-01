import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import QuietProLayout from "./layouts/QuietProLayout";
import WorkshopLayout from "./layouts/WorkshopLayout";

// Wrapper que ramifica al layout adecuado segun el theme activo.
// Cada layout maneja su propia version de NavLinks, drawer mobile,
// dropdown de usuario, etc; lo comun esta extraido a layouts/_shared.tsx.
const Layout: React.FC = () => {
  const { theme } = useTheme();
  return theme === "workshop" ? <WorkshopLayout /> : <QuietProLayout />;
};

export default Layout;
