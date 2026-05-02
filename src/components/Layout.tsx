import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import QuietProLayout from "./layouts/QuietProLayout";
import WorkshopLayout from "./layouts/WorkshopLayout";
import CommandPalette from "./CommandPalette";

// Wrapper que ramifica al layout adecuado segun el theme activo.
// Cada layout maneja su propia version de NavLinks, drawer mobile,
// dropdown de usuario, etc; lo comun esta extraido a layouts/_shared.tsx.
// El CommandPalette se monta a este nivel para que el atajo Cmd/Ctrl+K
// funcione en cualquier ruta protegida sin importar el layout activo.
const Layout: React.FC = () => {
  const { theme } = useTheme();
  return (
    <>
      {theme === "workshop" ? <WorkshopLayout /> : <QuietProLayout />}
      <CommandPalette />
    </>
  );
};

export default Layout;
