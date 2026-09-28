import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui";
import { labApi, labError, labKeys } from "@/features/lab/api";
import { exportarCsv, type ColumnaCsv } from "@/features/lab/export";
import { fmtInt, fmtNumber, toDateInput } from "@/features/lab/format";
import { ExportButton } from "@/features/lab/components/LabLayout";
import { LabFetchingHint, LabProgressBar, LabTableSkeleton } from "@/features/lab/components/Loading";
import { NoLigaBadge } from "@/features/lab/components/NoLigaBadge";
import type { DailyReportColumnDto, DailyReportDto, DailyReportRowDto } from "@/features/lab/types";

/**
 * Reporte de análisis diario del molino: la planilla M.M.LC.P.02, generada
 * desde las muestras internas registradas. La grilla es fija como en el papel
 * (15 productos por turno, vacíos si no hubo muestra), un renglón por muestra
 * con su hora y lote, y las columnas agrupadas igual que el formato, con las
 * que se cargan a mano al lado de las del NIR. Al final de cada turno, lo que
 * se midió sin registrar la muestra.
 */

const CLASE_CONTROL =
  "px-2 py-1 text-[12.5px] border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary";

const SECCION_LABEL: Record<DailyReportColumnDto["section"], string> = {
  fq: "Ensayos físicos / químicos",
  reo: "Ensayos reológicos",
};

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

/** Encabezados de dos niveles (sección y grupo) a partir del orden de las columnas. */
const agrupar = (cols: DailyReportColumnDto[]) => {
  const secciones: { key: string; label: string; n: number }[] = [];
  const grupos: { key: string; label: string; n: number }[] = [];
  for (const c of cols) {
    const s = secciones[secciones.length - 1];
    if (s && s.key === c.section) s.n++;
    else secciones.push({ key: c.section, label: SECCION_LABEL[c.section], n: 1 });
    const g = grupos[grupos.length - 1];
    const gk = `${c.section}|${c.group}`;
    if (g && g.key === gk) g.n++;
    else grupos.push({ key: gk, label: c.group, n: 1 });
  }
  return { secciones, grupos };
};

const CLAVE_GLUTEN_HUMEDO = "GLUTOMATIC|Gluten húmedo";

const Celda: React.FC<{ f: DailyReportRowDto; c: DailyReportColumnDto }> = ({ f, c }) => {
  if (c.key === CLAVE_GLUTEN_HUMEDO && f.noLiga) return <NoLigaBadge compact />;
  const v = f.values[c.key];
  if (v === undefined) return <span className="text-muted-foreground/40">—</span>;
  const dudoso = f.implausible.includes(c.key);
  return (
    <span
      className={dudoso ? "text-amber-700 dark:text-amber-300" : undefined}
      title={dudoso ? "Fuera del rango de calibración" : undefined}
    >
      {fmtNumber(v, c.decimals)}
    </span>
  );
};

// Al imprimir queda solo la planilla, apaisada, sin el resto de la app.
const ESTILO_IMPRESION = `
@media print {
  @page { size: A4 landscape; margin: 8mm; }
  body * { visibility: hidden; }
  .reporte-diario, .reporte-diario * { visibility: visible; }
  .reporte-diario { position: absolute; left: 0; top: 0; width: 100%; }
  .reporte-diario .no-print { display: none !important; }
  .reporte-diario .reporte-scroll { max-height: none !important; overflow: visible !important; }
  .reporte-diario table { font-size: 8.5px; }
  .reporte-diario th, .reporte-diario td { padding: 2px 4px !important; }
}
`;

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
  const { secciones, grupos } = React.useMemo(() => agrupar(columnas), [columnas]);

  const csv = (r: DailyReportDto): ColumnaCsv<DailyReportRowDto>[] => [
    { header: "Turno", value: (f) => f.turno },
    { header: "Hora", value: (f) => f.hora },
    { header: "Producto", value: (f) => f.producto },
    { header: "Lote", value: (f) => f.lote },
    { header: "Muestra", value: (f) => (f.sinMuestra ? "sin registrar" : f.sample?.accession ?? null) },
    { header: "Mediciones", value: (f) => f.measurements, decimals: 0 },
    ...r.columns.map<ColumnaCsv<DailyReportRowDto>>((c) => ({
      header: `${c.group} ${c.label}${c.unit ? ` (${c.unit})` : ""}`,
      value: (f) => (c.key === CLAVE_GLUTEN_HUMEDO && f.noLiga ? "No liga" : f.values[c.key] ?? null),
      decimals: c.decimals,
    })),
  ];

  // Filas agrupadas por turno, en el orden de la planilla.
  const gruposTurno = React.useMemo(() => {
    if (!data) return [];
    return data.turnos.map((t) => ({ turno: t, filas: data.rows.filter((r) => r.turno === t) }));
  }, [data]);

  const conDatos = data ? data.rows.filter((r) => r.sample || r.measurements > 0).length : 0;
  const fijas = 4;

  return (
    <div className="space-y-4 reporte-diario">
      <style>{ESTILO_IMPRESION}</style>

      <div className="flex flex-wrap items-start justify-between gap-3 no-print">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Reporte de análisis diario</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5 max-w-prose">
            La planilla del molino, generada desde las muestras internas registradas: un renglón por
            muestra con su hora y lote, los 15 productos de cada turno siempre a la vista, y las
            columnas del formato. El día arranca con el turno noche anterior (22:00) y termina a las
            22:00.
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
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <h3 className="text-sm font-semibold capitalize">{fmtFechaLarga(fecha)}</h3>
            <span className="text-[11px] text-muted-foreground hidden print:inline">
              Reporte de análisis diario · M.M.LC.P.02
            </span>
            {data && (
              <span className="text-[11.5px] text-muted-foreground tabular-nums no-print">
                {fmtInt(data.totalSamples)} muestras · {fmtInt(data.totalMeasurements)} mediciones ·{" "}
                {fmtInt(conDatos)} renglones con datos
              </span>
            )}
            <LabFetchingHint active={q.isFetching && !q.isPending} />
          </div>
          <div className="flex items-center gap-1.5 no-print">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11.5px]"
              onClick={() => window.print()}
              disabled={!data}
            >
              <Printer size={13} className="mr-1.5" />
              Imprimir
            </Button>
            <ExportButton
              onClick={() => {
                if (!data) return;
                exportarCsv(data.rows, csv(data), `reporte_diario_${fecha}`);
                toast.success("Reporte exportado");
              }}
              disabled={!data || data.rows.length === 0}
            />
          </div>
        </div>

        {q.isPending ? (
          <LabTableSkeleton rows={8} cols={8} />
        ) : !data ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">Sin datos.</div>
        ) : (
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto reporte-scroll">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                  <th rowSpan={3} className="font-medium pl-3 pr-2 py-1.5 whitespace-nowrap border-b border-border align-bottom">
                    Hora
                  </th>
                  <th rowSpan={3} className="font-medium px-2 py-1.5 whitespace-nowrap border-b border-border align-bottom">
                    Producto
                  </th>
                  <th rowSpan={3} className="font-medium px-2 py-1.5 whitespace-nowrap border-b border-border align-bottom">
                    Lote
                  </th>
                  <th rowSpan={3} className="font-medium px-2 py-1.5 whitespace-nowrap border-b border-border align-bottom">
                    Muestra
                  </th>
                  {secciones.map((s) => (
                    <th
                      key={s.key}
                      colSpan={s.n}
                      className="font-semibold px-2 py-1.5 text-center whitespace-nowrap border-b border-l border-border"
                    >
                      {s.label}
                    </th>
                  ))}
                </tr>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30">
                  {grupos.map((g) => (
                    <th
                      key={g.key}
                      colSpan={g.n}
                      className="font-medium px-2 py-1 text-center whitespace-nowrap border-b border-l border-border"
                    >
                      {g.label}
                    </th>
                  ))}
                </tr>
                <tr className="text-[10px] text-muted-foreground bg-muted/20">
                  {columnas.map((c, i) => {
                    const primeraDelGrupo = i === 0 || columnas[i - 1].group !== c.group;
                    return (
                      <th
                        key={c.key}
                        className={`font-medium px-2 py-1 text-right whitespace-nowrap border-b border-border ${
                          primeraDelGrupo ? "border-l" : ""
                        } ${c.manual ? "italic" : ""}`}
                        title={c.manual ? "Se carga a mano desde la ficha de la muestra" : c.source}
                      >
                        {c.label}
                        {c.unit && <span className="ml-0.5 text-muted-foreground/70">({c.unit})</span>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {gruposTurno.map((g) => (
                  <React.Fragment key={g.turno}>
                    <tr className="bg-muted/20 border-b border-border">
                      <td
                        colSpan={fijas + columnas.length}
                        className="pl-3 pr-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                      >
                        {g.turno}
                      </td>
                    </tr>
                    {g.filas.map((f, idx) => {
                      const vacia = !f.sample && !f.sinMuestra;
                      return (
                        <tr
                          key={`${f.turno}|${f.producto}|${f.sample?.id ?? idx}`}
                          className={`border-b border-border/60 ${
                            vacia
                              ? "text-muted-foreground/70"
                              : f.sinMuestra
                                ? "italic bg-amber-50/40 dark:bg-amber-950/10"
                                : "hover:bg-muted/30 transition-colors"
                          }`}
                          title={
                            f.sinMuestra
                              ? "Mediciones sin muestra registrada: el producto es el que dice el equipo"
                              : undefined
                          }
                        >
                          <td className="pl-3 pr-2 py-1.5 text-[12px] tabular-nums whitespace-nowrap">
                            {f.hora ?? ""}
                          </td>
                          <td className="px-2 py-1.5 text-[12.5px] font-medium whitespace-nowrap">
                            {f.sinMuestra ? `≈ ${f.producto}` : f.producto}
                          </td>
                          <td className="px-2 py-1.5 text-[12px] whitespace-nowrap">{f.lote ?? ""}</td>
                          <td className="px-2 py-1.5 text-[11.5px] font-mono whitespace-nowrap">
                            {f.sample ? (
                              f.sample.accession
                            ) : f.sinMuestra ? (
                              <span className="font-sans text-muted-foreground">
                                sin registrar · {f.measurements} medic.
                              </span>
                            ) : (
                              ""
                            )}
                          </td>
                          {columnas.map((c, i) => {
                            const primeraDelGrupo = i === 0 || columnas[i - 1].group !== c.group;
                            return (
                              <td
                                key={c.key}
                                className={`px-2 py-1.5 text-right text-[12.5px] tabular-nums ${
                                  primeraDelGrupo ? "border-l border-border/60" : ""
                                }`}
                              >
                                {vacia ? "" : <Celda f={f} c={c} />}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11.5px] text-muted-foreground max-w-prose no-print">
        Cada renglón es una muestra interna registrada ese día, con los análisis enlazados por su
        accesión. Las columnas en cursiva (termobalanza, estufa, colorímetro, PMG) se cargan a mano
        desde la ficha de la muestra con “Análisis manual”. Los renglones con “≈” son mediciones que
        llegaron de un equipo sin muestra registrada: el producto es el que dice el equipo.
      </p>
    </div>
  );
};

export default LabDailyReportPage;
