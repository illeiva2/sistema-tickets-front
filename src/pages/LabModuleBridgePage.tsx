import React from "react";
import { ExternalLink, FlaskConical, Wifi } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useModules } from "../contexts/ModulesContext";

/**
 * Pantalla puente hacia el módulo de laboratorio (GlutenLab).
 *
 * El módulo no vive en esta app: corre on-premise en el servidor del molino,
 * porque los instrumentos escriben directo a esa base y no se puede mover.
 * Por eso esto es un enlace y no un iframe: Chrome bloquea la navegación de
 * subframes desde un origen público hacia una IP privada (Local Network
 * Access), así que embeberlo rompería justo para el operador de planta.
 *
 * Todavía NO está definido el hostname final ni el handoff de sesión: hasta que
 * eso exista, esta pantalla explica el estado en vez de mandar a un 404.
 */
const LAB_URL = import.meta.env.VITE_LAB_MODULE_URL as string | undefined;

const LabModuleBridgePage: React.FC = () => {
  const { has, isLoading, levelOf } = useModules();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // El permiso real lo valida el backend; esto es solo para no mostrar una
  // pantalla que no corresponde.
  if (!has("glutenlab")) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <FlaskConical size={22} />
        <h1 className="text-xl font-semibold">Laboratorio de calidad</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Mediciones de los Glutomatic y del NIR IM 9500H. Tu nivel de acceso:{" "}
        <strong>{levelOf("glutenlab")}</strong>.
      </p>

      <div className="rounded-lg border border-border p-4 space-y-3">
        <div className="flex items-start gap-2 text-sm">
          <Wifi size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            Este módulo corre en el servidor del molino. Desde la red de la
            empresa abre directo; desde afuera pasa por el acceso remoto.
          </p>
        </div>

        {LAB_URL ? (
          <a
            href={LAB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm"
          >
            Abrir laboratorio <ExternalLink size={14} />
          </a>
        ) : (
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Acceso todavía no configurado
            </p>
            <p className="text-amber-700 dark:text-amber-300 mt-1">
              Falta definir la dirección pública del módulo. Cuando esté, se
              configura en la variable <code>VITE_LAB_MODULE_URL</code> del
              deploy del front.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabModuleBridgePage;
