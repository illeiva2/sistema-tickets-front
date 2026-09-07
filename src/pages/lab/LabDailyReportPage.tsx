import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui";
import { labApi, labError, labKeys } from "@/features/lab/api";
import { exportarCsv, type ColumnaCsv } from "@/features/lab/export";
import { fmtInt, fmtNumber, toDateInput } from "@/features/lab/format";
import { ExportButton } from "@/features/lab/components/LabLayout";
import { LabFetchingHint, LabProgressBar, LabTableSkeleton } from "@/features/lab/components/Loading";
import type { DailyReportDto, DailyReportRowDto } from "@/features/lab/types";

/**
 * Reporte de análisis diario del molino: la planilla que hoy se llena a mano,
 * generada desde las mediciones. Filas = turno × producto; columnas = los
 * análisis de los cinco equipos; cada celda es el promedio del día.
 */

const CLASE_CONTROL =
  "px-2 py-1 text-[12.5px] border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary";

const sumarDias = (yyyyMmDd: string, dias: number): string => {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const f = new Date(y, m - 1, d);
  f.setDate(f.getDate() + dias);
  return toDateInput(f);
};

const fmtFechaLarga = (yyyyMmDd: string): string => {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export const LabDailyReportPage: React.FC = () => {
  const [fecha, setFecha] = React.useState(() => toDateInput(new Date()));
  const hoy = toDateInput(new Date());

  const q = useQuery({
    queryKey: labKeys.dailyReport(fecha),
    queryFn: () => labApi.samples.dailyReport(fecha),
  });

  React.useEffect(() => {
    if (q.error) toast.error(`Error cargando el reporte: ${labError(q.error)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.error ? labError(q.error) : null]);

  const data = q.data;
  const columnas = data?.columns ?? [];

  const csv = (r: DailyReportDto): ColumnaCsv<DailyReportRowDto>[] => [
    { header: "Turno", value: (f) => f.turno },
    { header: "Producto", value: (f) => f.producto },
    { header: "Muestras", value: (f) => f.samples.join(" ") },
    { header: "Mediciones", value: (f) => f.measurements, decimals: 0 },
    ...r.columns.map<ColumnaCsv<DailyReportRowDto>>((c) => ({
      header: c.unit ? `${c.label} (${c.unit})` : c.label,
      value: (f) => f.values[c.code] ?? null,
      decimals: c.decimals,
    })),
  ];

  // Filas agrupadas por turno, en el orden de la planilla.
  const grupos = React.useMemo(() => {
    if (!data) return [];
    return data.turnos
      .map((t) => ({ turno: t, filas: data.rows.filter((r) => r.turno === t) }))
      .filter((g) => g.filas.length > 0);
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Reporte de análisis diario</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5 max-w-prose">
            El mismo formato de la planilla del molino, generado desde las mediciones: un renglón por
            turno y producto, el promedio del día en cada análisis. El día arranca con el turno noche
            anterior (22:00) y termina a las 22:00.
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setFecha((f) => sumarDias(f, -1))}
            aria-label="Día anterior"
          >
            <ChevronLeft size={14} />
          </Button>
          <input
            type="date"
            className={CLASE_CONTROL}
            value={fecha}
            max={hoy}
            onChange={(e) => e.target.value && setFecha(e.target.value)}
            aria-label="Fecha del reporte"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setFecha((f) => sumarDias(f, 1))}
            disabled={fecha >= hoy}
            aria-label="Día siguiente"
          >
            <ChevronRight size={14} />
          </Button>
          {fecha !== hoy && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[11.5px]" onClick={() => setFecha(hoy)}>
              Hoy
            </Button>
          )}
        </div>
      </div>

      <div className="border border-border bg-card rounded-lg overflow-hidden">
        <LabProgressBar active={q.isFetching} />
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-semibold capitalize">{fmtFechaLarga(fecha)}</h3>
            {data && (
              <span className="text-[11.5px] text-muted-foreground tabular-nums">
                {fmtInt(data.totalMeasurements)} mediciones · {fmtInt(data.rows.length)} renglones
              </span>
            )}
            <LabFetchingHint active={q.isFetching && !q.isPending} />
          </div>
          <ExportButton
            onClick={() => {
              if (!data) return;
              exportarCsv(data.rows, csv(data), `reporte_diario_${fecha}`);
              toast.success("Reporte exportado");
            }}
            disabled={!data || data.rows.length === 0}
          />
        </div>

        {q.isPending ? (
          <LabTableSkeleton rows={8} cols={8} />
        ) : !data || data.rows.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            Sin mediciones entre las 22:00 del día anterior y las 22:00 de este día.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-10">
                <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/40 backdrop-blur">
                  <th className="font-medium pl-4 pr-2 py-2 whitespace-nowrap">Producto</th>
                  <th className="font-medium px-2 py-2 whitespace-nowrap">Muestras</th>
                  <th className="font-medium px-2 py-2 text-right whitespace-nowrap">Medic.</th>
                  {columnas.map((c) => (
                    <th key={c.code} className="font-medium px-2 py-2 text-right whitespace-nowrap" title={c.source}>
                      {c.label}
                      {c.unit && <span className="normal-case tracking-normal ml-0.5">({c.unit})</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grupos.map((g) => (
                  <React.Fragment key={g.turno}>
                    <tr className="bg-muted/20 border-b border-border">
                      <td
                        colSpan={3 + columnas.length}
                        className="pl-4 pr-2 py-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        {g.turno}
                      </td>
                    </tr>
                    {g.filas.map((f) => (
                      <tr key={`${f.turno}|${f.producto}`} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                        <td className="py-2 pl-4 pr-2 text-[12.5px] font-medium whitespace-nowrap">{f.producto}</td>
                        <td className="px-2 py-2 text-[11.5px] font-mono whitespace-nowrap">
                          {f.samples.length > 0 ? (
                            f.samples.join(" ")
                          ) : (
                            <span className="text-muted-foreground font-sans">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right text-[12px] tabular-nums text-muted-foreground">
                          {f.measurements}
                        </td>
                        {columnas.map((c) => {
                          const v = f.values[c.code];
                          return (
                            <td key={c.code} className="px-2 py-2 text-right text-[12.5px] tabular-nums">
                              {v === undefined ? (
                                <span className="text-muted-foreground/60">—</span>
                              ) : (
                                fmtNumber(v, c.decimals)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11.5px] text-muted-foreground max-w-prose">
        El producto de cada renglón sale de la muestra registrada cuando la medición está enlazada; si
        no, del nombre de harina del equipo o del texto que se tipeó como muestra. Lo que no se
        reconoce queda en “Sin identificar”. A medida que el laboratorio registre muestras y tipee la
        accesión, el reporte se vuelve exacto solo.
      </p>
    </div>
  );
};

export default LabDailyReportPage;
