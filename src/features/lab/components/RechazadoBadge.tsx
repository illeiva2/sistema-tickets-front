import React from "react";

/**
 * Camión rechazado. Es un hecho de la recepción (el camión se fue sin
 * descargar), no una alteración del grano ni un resultado de un equipo: por eso
 * tiene su propia marca, más fuerte que "No liga", y lleva el motivo en el
 * tooltip para no tener que abrir la ficha.
 */
export const RechazadoBadge: React.FC<{ reason?: string | null; compact?: boolean; className?: string }> = ({
  reason,
  compact,
  className = "",
}) => {
  const texto = reason ? `Camión rechazado: ${reason}` : "Camión rechazado";
  return (
    <span
      className={`inline-flex items-center align-middle rounded bg-red-600 dark:bg-red-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white ${className}`}
      title={texto}
      aria-label={texto}
    >
      {compact ? "RCH" : "Rechazado"}
    </span>
  );
};

export default RechazadoBadge;
