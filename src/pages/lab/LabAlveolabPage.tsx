import React from "react";
import { useQueries } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui";
import { KpiCard } from "@/components/dashboards/shared";
import { labApi, labError, labKeys } from "@/features/lab/api";
import { exportarCsv, type ColumnaCsv } from "@/features/lab/export";
import { fmtDate, fmtDateTime, fmtInt, fmtNumber, fmtRelative } from "@/features/lab/format";
import { ExportButton } from "@/features/lab/components/LabLayout";
import {
  LabChartBox,
  LabFetchingHint,
  LabKpiSkeletons,
  LabProgressBar,
  LabTableSkeleton,
} from "@/features/lab/components/Loading";
import type { AlveolabFilters, AlveolabMeasurementDto } from "@/features/lab/types";

/**
 * AlveoLab (Chopin) — alveógrafo.
 *
 * Vista enfocada en la reología de la masa. La métrica cabecera es W (fuerza
 * panadera, 10⁻⁴ J); P es la tenacidad, L la extensibilidad, P/L la
 * configuración de la curva, Ie la elasticidad y G el hinchamiento. Una fila por
 * prueba (Test): el AlveoLab guarda cada ensayo en su base SQL CE.
 */

const PAGE_SIZE = 50;
const COLOR = "#f59e0b";

const CLASE_CONTROL =
  "px-2 py-1 text-[12.5px] border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary";

const CSV: ColumnaCsv<AlveolabMeasurementDto>[] = [
  { header: "Fecha y hora", value: (m) => fmtDateTime(m.analyzedAt) },
  { header: "Muestra", value: (m) => m.sampleCode ?? "" },
  { header: "Harina", value: (m) => m.flourType ?? "" },
  { header: "W (10-4 J)", value: (m) => m.w },
  { header: "P (mmH2O)", value: (m) => m.p },
  { header: "L (mm)", value: (m) => m.l },
  { header: "P/L", value: (m) => m.pl },
  { header: "Ie (%)", value: (m) => m.ie },
  { header: "G", value: (m) => m.g },
];

export const LabAlveolabPage: React.FC = () => {
  const [filtros, setFiltros] = React.useState<AlveolabFilters>({ pageSize: PAGE_SIZE });
  const [texto, setTexto] = React.useState("");

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      const limpio = texto.trim();
      setFiltros((f) =>
        (f.sampleCodeContains ?? "") === limpio
          ? f
          : { ...f, sampleCodeContains: limpio || undefined, pageSize: PAGE_SIZE },
      );
    }, 300);
    return () => window.clearTimeout(t);
  }, [texto]);

  const [statsQ, trendQ, medQ] = useQueries({
    queries: [
      { queryKey: labKeys.alveolabStats(filtros), queryFn: () => labApi.alveolab.stats(filtros) },
      { queryKey: labKeys.alveolabTrend(filtros), queryFn: () => labApi.alveolab.trend(filtros) },
      { queryKey: labKeys.alveolabMeasurements(filtros), queryFn: () => labApi.alveolab.measurements(filtros) },
    ],
  });

  const errores = [statsQ.error, trendQ.error, medQ.error].filter(Boolean);
  React.useEffect(() => {
    if (errores.length > 0) toast.error(`Error cargando AlveoLab: ${labError(errores[0])}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errores.length > 0 ? labError(errores[0]) : null]);

  const stats = statsQ.data;
  const items = medQ.data?.items ?? [];
  const total = medQ.data?.total ?? 0;

  const datosGrafico = React.useMemo(
    () =>
      (trendQ.data ?? []).map((p) => ({
        date: fmtDate(p.date),
        "Fuerza W (10⁻⁴ J)": p.avgW ?? null,
      })),
    [trendQ.data],
  );

  const hayFiltros = Boolean(filtros.from || filtros.to || filtros.sampleCodeContains);
  const limpiar = () => {
    setTexto("");
    setFiltros({ pageSize: PAGE_SIZE });
  };

  return (
    <div className="space-y-4">
      {/* ─── Filtros ──────────────────────────────────────────────────── */}
      <div className="border border-border bg-card rounded-lg overflow-hidden">
        <LabProgressBar active={statsQ.isFetching || medQ.isFetching} />
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-muted/20">
          <label className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            Desde
            <input
              type="date"
              className={CLASE_CONTROL}
              value={filtros.from ?? ""}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, from: e.target.value || undefined, pageSize: PAGE_SIZE }))
              }
            />
          </label>
          <label className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            Hasta
            <input
              type="date"
              className={CLASE_CONTROL}
              value={filtros.to ?? ""}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, to: e.target.value || undefined, pageSize: PAGE_SIZE }))
              }
            />
          </label>
          <div className="relative flex-1 min-w-[170px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por muestra: 3/0, 4/0, Tapera…"
              className={`${CLASE_CONTROL} w-full pl-8`}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>
          {hayFiltros && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11.5px] text-muted-foreground"
              onClick={limpiar}
            >
              <X size={12} className="mr-1" />
              Limpiar
            </Button>
          )}
          <div className="ml-auto">
            <LabFetchingHint active={statsQ.isFetching && !statsQ.isPending} />
          </div>
        </div>
      </div>

      {/* ─── Indicadores ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {statsQ.isPending ? (
          <LabKpiSkeletons count={4} />
        ) : stats && stats.count === 0 ? (
          <div className="sm:col-span-2 lg:col-span-4 border border-border bg-card rounded-lg p-8 text-center text-sm text-muted-foreground">
            Sin mediciones para el filtro aplicado
          </div>
        ) : (
          <>
            <KpiCard
              label="Pruebas en filtro"
              value={fmtInt(stats?.count)}
              tone="blue"
              hint={stats?.lastAt ? `última: ${fmtRelative(stats.lastAt)}` : undefined}
            />
            <KpiCard
              label="Fuerza W prom."
              value={
                <>
                  {fmtNumber(stats?.avgW, 0)}
                  <span className="text-base text-muted-foreground ml-0.5">×10⁻⁴J</span>
                </>
              }
              hint={
                stats?.minW != null
                  ? `rango ${fmtNumber(stats.minW, 0)} – ${fmtNumber(stats.maxW, 0)}`
                  : undefined
              }
            />
            <KpiCard
              label="Config. P/L prom."
              value={fmtNumber(stats?.avgPL, 2)}
              hint={
                stats?.avgP != null && stats?.avgL != null
                  ? `P ${fmtNumber(stats.avgP, 0)} · L ${fmtNumber(stats.avgL, 0)}`
                  : undefined
              }
            />
            <KpiCard
              label="Elasticidad Ie prom."
              value={
                <>
                  {fmtNumber(stats?.avgIe, 1)}
                  <span className="text-base text-muted-foreground ml-0.5">%</span>
                </>
              }
            />
          </>
        )}
      </div>

      {stats && stats.count > 0 && (
        <p className="text-[11.5px] text-muted-foreground">
          Promedios sobre las <strong>{fmtInt(stats.count)}</strong> pruebas que cumplen el
          filtro
          {stats.firstAt && stats.lastAt && ` · ${fmtDate(stats.firstAt)} a ${fmtDate(stats.lastAt)}`}
        </p>
      )}

      {/* ─── Evolución ───────────────────────────────────────────────── */}
      <div className="border border-border bg-card rounded-lg overflow-hidden">
        <LabProgressBar active={trendQ.isFetching} />
        <div className="flex items-start justify-between gap-2 px-3 py-2 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold">Evolución de la fuerza panadera</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Promedio de W por día, en 10⁻⁴ J.</p>
          </div>
          <ExportButton
            onClick={() => {
              exportarCsv(trendQ.data ?? [], [
                { header: "Fecha", value: (p) => p.date },
                { header: "Fuerza W prom. (10-4 J)", value: (p) => p.avgW, decimals: 0 },
                { header: "Pruebas", value: (p) => p.count, decimals: 0 },
              ], "alveolab_tendencia");
              toast.success("Tendencia exportada");
            }}
            disabled={(trendQ.data ?? []).length === 0}
          />
        </div>
        <div className="p-3">
          <LabChartBox height={300} loading={trendQ.isPending} empty={datosGrafico.length === 0}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datosGrafico} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} domain={["auto", "auto"]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="Fuerza W (10⁻⁴ J)"
                  stroke={COLOR}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </LabChartBox>
        </div>
      </div>

      {/* ─── Tabla ───────────────────────────────────────────────────── */}
      <div className="border border-border bg-card rounded-lg overflow-hidden">
        <LabProgressBar active={medQ.isFetching} />
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-sm font-semibold shrink-0">Mediciones</h2>
            <span className="text-[11.5px] text-muted-foreground tabular-nums">
              {items.length} de {fmtInt(total)}
            </span>
          </div>
          <ExportButton
            onClick={() => {
              exportarCsv(items, CSV, "alveolab_mediciones");
              toast.success(`${items.length} mediciones exportadas`);
            }}
            disabled={items.length === 0}
            title={
              items.length < total
                ? `Exporta las ${items.length} cargadas. Usá "Mostrar más" para el resto.`
                : "Descargar en CSV"
            }
          />
        </div>

        {medQ.isPending ? (
          <LabTableSkeleton rows={8} cols={8} />
        ) : items.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            Sin mediciones para el filtro aplicado
          </div>
        ) : (
          <>
            <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10">
                  <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/40 backdrop-blur">
                    <th className="font-medium pl-4 pr-2 py-2 whitespace-nowrap">Fecha/hora</th>
                    <th className="font-medium px-2 py-2">Muestra</th>
                    <th className="font-medium px-2 py-2 text-right whitespace-nowrap" title="Fuerza panadera (10⁻⁴ J)">W</th>
                    <th className="font-medium px-2 py-2 text-right whitespace-nowrap" title="Tenacidad (mmH₂O)">P</th>
                    <th className="font-medium px-2 py-2 text-right whitespace-nowrap" title="Extensibilidad (mm)">L</th>
                    <th className="font-medium px-2 py-2 text-right" title="Configuración de la curva">P/L</th>
                    <th className="font-medium px-2 py-2 text-right whitespace-nowrap" title="Índice de elasticidad (%)">Ie</th>
                    <th className="font-medium px-2 pr-4 py-2 text-right" title="Índice de hinchamiento">G</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((m) => (
                    <tr
                      key={m.measurementId}
                      className="border-b border-border/60 hover:bg-muted/40 transition-colors"
                    >
                      <td className="py-2.5 pl-4 pr-2 whitespace-nowrap text-[12.5px] tabular-nums">
                        {fmtDateTime(m.analyzedAt)}
                      </td>
                      <td className="px-2 py-2.5 text-[12.5px] font-medium">
                        {m.sampleCode || <span className="text-muted-foreground">(sin código)</span>}
                      </td>
                      <td className="px-2 py-2.5 text-right text-[12.5px] tabular-nums font-medium">
                        {fmtNumber(m.w, 0)}
                      </td>
                      <td className="px-2 py-2.5 text-right text-[12.5px] tabular-nums">
                        {fmtNumber(m.p, 0)}
                      </td>
                      <td className="px-2 py-2.5 text-right text-[12.5px] tabular-nums">
                        {fmtNumber(m.l, 0)}
                      </td>
                      <td className="px-2 py-2.5 text-right text-[12.5px] tabular-nums">
                        {fmtNumber(m.pl, 2)}
                      </td>
                      <td className="px-2 py-2.5 text-right text-[12.5px] tabular-nums">
                        {fmtNumber(m.ie, 1)}
                      </td>
                      <td className="px-2 pr-4 py-2.5 text-right text-[12.5px] tabular-nums">
                        {fmtNumber(m.g, 1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {items.length < total && (
              <div className="px-3 py-2 border-t border-border bg-muted/20 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-[11.5px]"
                  onClick={() =>
                    setFiltros((f) => ({ ...f, pageSize: (f.pageSize ?? PAGE_SIZE) + PAGE_SIZE }))
                  }
                  disabled={medQ.isFetching}
                >
                  {medQ.isFetching ? "Cargando…" : `Mostrar más (${fmtInt(total - items.length)} restantes)`}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LabAlveolabPage;
