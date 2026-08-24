import React from "react";
import { ChevronRight, Download, FlaskConical } from "lucide-react";
import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { useModules } from "@/contexts/ModulesContext";
import { Button } from "@/components/ui";

/**
 * Armazón de las tres vistas del laboratorio.
 *
 * Las pestañas son RUTAS y no estado interno: así cada vista tiene URL propia y
 * se puede mandar por chat un link a lo que estás mirando, que es la mitad de
 * para qué existe un panel compartido.
 */

const PESTANAS = [
  { to: "/modulos/laboratorio", label: "Operador", end: true },
  { to: "/modulos/laboratorio/supervisor", label: "Supervisor", end: false },
  { to: "/modulos/laboratorio/nir", label: "NIR", end: false },
];

export const LabLayout: React.FC = () => {
  const { has, isLoading, levelOf } = useModules();
  const { pathname } = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // El permiso real lo valida el backend en cada request; esto solo evita
  // mostrar una pantalla que no corresponde.
  if (!has("glutenlab")) return <Navigate to="/" replace />;

  const nivel = levelOf("glutenlab");

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground mb-1">
            <span>Módulos</span>
            <ChevronRight size={11} className="opacity-60" />
            <span className="text-foreground">Laboratorio</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <FlaskConical size={18} className="text-muted-foreground" />
            Laboratorio de calidad
          </h1>
        </div>
        {nivel && (
          <span className="text-[11.5px] text-muted-foreground shrink-0 mt-1">
            Acceso: {ETIQUETA_NIVEL[nivel] ?? nivel}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        {PESTANAS.map((p) => (
          <NavLink
            key={p.to}
            to={p.to}
            end={p.end}
            className={({ isActive }) =>
              `px-3 py-1.5 text-[12.5px] rounded-t-md transition-colors -mb-px border-b-2 ${
                isActive
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`
            }
          >
            {p.label}
          </NavLink>
        ))}
      </div>

      {/* key por ruta: al cambiar de pestaña se remonta, así no quedan filtros
          de una vista aplicados sobre los datos de otra. */}
      <div key={pathname}>
        <Outlet />
      </div>
    </div>
  );
};

const ETIQUETA_NIVEL: Record<string, string> = {
  VIEWER: "Consulta",
  QC: "Calidad",
  MANAGEMENT: "Gerencia",
};

/**
 * Botón de exportar. Se deshabilita sin filas en lugar de esconderse: si
 * desaparece, no queda claro si la exportación existe o si algo se rompió.
 */
export const ExportButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  title?: string;
}> = ({ onClick, disabled, label = "Exportar CSV", title }) => (
  <Button
    variant="outline"
    size="sm"
    className="h-7 px-2 text-[11.5px]"
    onClick={onClick}
    disabled={disabled}
    title={title ?? (disabled ? "No hay filas para exportar" : "Descargar en CSV")}
  >
    <Download size={12} className="mr-1" />
    {label}
  </Button>
);

export default LabLayout;
