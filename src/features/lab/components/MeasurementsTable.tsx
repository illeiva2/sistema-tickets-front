import React from "react";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { fmtDateTime, fmtNumber, isIncomplete } from "../format";
import type { MeasurementDto } from "../types";

/**
 * Tabla de mediciones de gluten.
 *
 * Solo tres columnas ordenan (fecha, muestra, gluten húmedo) porque son las
 * únicas que el backend sabe ordenar. Habilitar el resto en la UI produciría
 * clicks que no hacen nada.
 */

const ORDENABLES = new Set(["analyzedAt", "sampleCode", "wetGluten"]);

const Th: React.FC<{
  label: string;
  align?: "left" | "right";
  sortKey?: string;
  sortBy?: string;
  sortDesc?: boolean;
  onSort?: (k: string) => void;
  className?: string;
}> = ({ label, align = "left", sortKey, sortBy, sortDesc, onSort, className = "" }) => {
  const clickeable = Boolean(sortKey && onSort && ORDENABLES.has(sortKey));
  const activo = clickeable && sortBy?.toLowerCase() === sortKey?.toLowerCase();

  return (
    <th
      className={`font-medium px-2 py-2 whitespace-nowrap ${
        align === "right" ? "text-right" : "text-left"
      } ${clickeable ? "cursor-pointer select-none hover:text-foreground" : ""} ${className}`}
      onClick={clickeable ? () => onSort!(sortKey!) : undefined}
    >
      <span className={`inline-flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
        {label}
        {activo && (sortDesc ? <ChevronDown size={12} /> : <ChevronUp size={12} />)}
      </span>
    </th>
  );
};

export const MeasurementsTable: React.FC<{
  items: MeasurementDto[];
  showEquipment?: boolean;
  sortBy?: string;
  sortDesc?: boolean;
  onSort?: (k: string) => void;
  onRowClick?: (m: MeasurementDto) => void;
}> = ({ items, showEquipment = true, sortBy, sortDesc, onSort, onRowClick }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left">
      <thead className="sticky top-0 z-10">
        <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/40 backdrop-blur">
          <Th label="Fecha/Hora" sortKey="analyzedAt" sortBy={sortBy} sortDesc={sortDesc} onSort={onSort} className="pl-4" />
          <Th label="Muestra" sortKey="sampleCode" sortBy={sortBy} sortDesc={sortDesc} onSort={onSort} />
          <Th label="Método" />
          <Th label="Gluten H. (%)" align="right" sortKey="wetGluten" sortBy={sortBy} sortDesc={sortDesc} onSort={onSort} />
          <Th label="Gluten S. (%)" align="right" />
          <Th label="Índice" align="right" />
          <Th label="WBC (%)" align="right" />
          {showEquipment && <Th label="Equipo" className="pr-4" />}
        </tr>
      </thead>
      <tbody>
        {items.map((m) => {
          const incompleta = isIncomplete(m);
          return (
            <tr
              key={m.sampleId}
              onClick={onRowClick ? () => onRowClick(m) : undefined}
              className={`border-b border-border/60 transition-colors ${
                onRowClick ? "cursor-pointer" : ""
              } ${
                // Atenuada en lugar de ocultada: la medición fallida es
                // información (alguien canceló un ciclo), no ruido a esconder.
                incompleta
                  ? "text-muted-foreground/70 bg-muted/20"
                  : "hover:bg-muted/40"
              }`}
            >
              <td className="py-2.5 pl-4 pr-2 whitespace-nowrap text-[12.5px] tabular-nums">
                {fmtDateTime(m.analyzedAt)}
              </td>
              <td className="px-2 py-2.5 text-[12.5px] font-medium">
                <span className="inline-flex items-center gap-1.5">
                  {m.sampleCode || <span className="text-muted-foreground">(sin código)</span>}
                  {incompleta && (
                    <span title="Medición incompleta o con error" className="shrink-0 leading-none">
                      <AlertTriangle size={13} className="text-amber-500" aria-hidden="true" />
                      <span className="sr-only">Medición incompleta o con error</span>
                    </span>
                  )}
                </span>
              </td>
              <td className="px-2 py-2.5 text-[11.5px] text-muted-foreground">
                {m.methodName?.trim() || "—"}
              </td>
              <td className="px-2 py-2.5 text-right text-[12.5px] tabular-nums">
                {fmtNumber(m.wetGluten)}
              </td>
              <td className="px-2 py-2.5 text-right text-[12.5px] tabular-nums">
                {fmtNumber(m.dryGluten)}
              </td>
              {/* Índice a 0 decimales, igual que en el dashboard original. */}
              <td className="px-2 py-2.5 text-right text-[12.5px] tabular-nums">
                {fmtNumber(m.glutenIndex, 0)}
              </td>
              <td className="px-2 py-2.5 text-right text-[12.5px] tabular-nums">
                {fmtNumber(m.waterBindingCapacity)}
              </td>
              {showEquipment && (
                <td className="px-2 pr-4 py-2.5 text-[11.5px] text-muted-foreground whitespace-nowrap">
                  {m.instrumentName ?? m.instrumentSerial}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export default MeasurementsTable;
