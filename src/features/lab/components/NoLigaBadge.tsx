import React from "react";

/**
 * "No liga": el Glutomatic no formó gluten y la prueba quedó guardada en 0.
 * Es un resultado de calidad importante, distinto de "todavía sin Glutomatic",
 * y hasta ahora el laboratorio lo anotaba a mano en notas. Va en rojo y no en
 * ámbar a propósito: no es una alteración del grano, es un resultado.
 */
export const NoLigaBadge: React.FC<{ compact?: boolean; className?: string }> = ({ compact, className = "" }) => (
  <span
    className={`inline-flex items-center align-middle rounded border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-300 ${className}`}
    title="No liga: el Glutomatic no formó gluten (la prueba quedó en 0)"
    aria-label="No liga: el Glutomatic no formó gluten"
  >
    {compact ? "NL" : "No liga"}
  </span>
);

export default NoLigaBadge;
