import React from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, X } from "lucide-react";
import { labApi, labError, labKeys } from "../api";
import { fmtDateTime, fmtNumber, isIncomplete } from "../format";
import { LabTableSkeleton } from "./Loading";

/**
 * Detalle de una medición. Modal inline siguiendo el patrón del repo (no hay
 * componente Dialog compartido).
 */

const Metrica: React.FC<{ label: string; value: string; unit?: string }> = ({
  label,
  value,
  unit,
}) => (
  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
    <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
      {label}
    </div>
    <div className="text-lg font-semibold tabular-nums mt-0.5">
      {value}
      {unit && <span className="text-xs text-muted-foreground ml-0.5">{unit}</span>}
    </div>
  </div>
);

export const MeasurementDetailModal: React.FC<{
  sampleId: number | null;
  onClose: () => void;
}> = ({ sampleId, onClose }) => {
  const { data, isPending, error } = useQuery({
    queryKey: labKeys.details(sampleId ?? 0),
    queryFn: () => labApi.details(sampleId!),
    enabled: sampleId !== null,
  });

  // Escape cierra, y se bloquea el scroll del fondo mientras está abierto.
  React.useEffect(() => {
    if (sampleId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previo;
    };
  }, [sampleId, onClose]);

  if (sampleId === null) return null;

  const m = data?.measurement;

  return (
    <div
      className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border sticky top-0 bg-card">
          <h3 className="text-base font-semibold">
            {m ? `Medición #${m.sampleId} — ${m.sampleCode || "(sin código)"}` : "Detalle de medición"}
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {isPending && <LabTableSkeleton rows={4} cols={4} />}

          {error && (
            <div className="rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3 text-sm">
              <p className="font-medium text-red-800 dark:text-red-200">
                No se pudo cargar el detalle
              </p>
              <p className="text-red-700 dark:text-red-300 font-mono text-xs mt-1">
                {labError(error)}
              </p>
            </div>
          )}

          {m && (
            <>
              {isIncomplete(m) && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
                  <p className="text-amber-800 dark:text-amber-200">
                    Esta medición tiene resultados en cero. Probablemente el ciclo se
                    canceló o no completó correctamente.
                  </p>
                </div>
              )}

              <div className="text-[12.5px] text-muted-foreground">
                {fmtDateTime(m.analyzedAt)} · {m.instrumentName ?? m.instrumentSerial}
                {m.methodName?.trim() && ` · ${m.methodName.trim()}`}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Metrica label="Gluten húmedo" value={fmtNumber(m.wetGluten)} unit="%" />
                <Metrica label="Gluten seco" value={fmtNumber(m.dryGluten)} unit="%" />
                <Metrica label="Índice de gluten" value={fmtNumber(m.glutenIndex, 0)} />
                <Metrica label="Retención de agua" value={fmtNumber(m.waterBindingCapacity)} unit="%" />
              </div>

              {/* La calibración del equipo vive en una tabla del SQL del molino
                  que el espejo no replica. Se dice, en lugar de mostrar una
                  sección vacía que parezca un error. */}
              <p className="text-[11.5px] text-muted-foreground border-t border-border pt-3">
                Los datos de calibración del equipo no están disponibles en este panel:
                quedan en el servidor del molino y no se replican a la nube.
              </p>

              <div>
                <h4 className="text-sm font-semibold mb-2">
                  Análisis previos del mismo código ({data.sameSampleHistory.length})
                </h4>
                {data.sameSampleHistory.length === 0 ? (
                  <p className="text-[12.5px] text-muted-foreground">
                    No hay otros análisis con este código de muestra.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/20">
                          <th className="font-medium px-3 py-1.5">Fecha</th>
                          <th className="font-medium px-3 py-1.5 text-right">Gluten H. (%)</th>
                          <th className="font-medium px-3 py-1.5 text-right">Gluten S. (%)</th>
                          <th className="font-medium px-3 py-1.5 text-right">Índice</th>
                          <th className="font-medium px-3 py-1.5 text-right">WBC (%)</th>
                          <th className="font-medium px-3 py-1.5">Equipo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {data.sameSampleHistory.map((h) => (
                          <tr
                            key={h.sampleId}
                            className={isIncomplete(h) ? "text-muted-foreground/70" : ""}
                          >
                            <td className="px-3 py-1.5 text-[12px] tabular-nums whitespace-nowrap">
                              {fmtDateTime(h.analyzedAt)}
                            </td>
                            <td className="px-3 py-1.5 text-right text-[12px] tabular-nums">{fmtNumber(h.wetGluten)}</td>
                            <td className="px-3 py-1.5 text-right text-[12px] tabular-nums">{fmtNumber(h.dryGluten)}</td>
                            <td className="px-3 py-1.5 text-right text-[12px] tabular-nums">{fmtNumber(h.glutenIndex, 0)}</td>
                            <td className="px-3 py-1.5 text-right text-[12px] tabular-nums">{fmtNumber(h.waterBindingCapacity)}</td>
                            <td className="px-3 py-1.5 text-[11.5px] text-muted-foreground">
                              {h.instrumentName ?? h.instrumentSerial}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MeasurementDetailModal;
