import React from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  CartesianGrid,
  Legend,
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
import { fmtDate, fmtDateTime, fmtInt, fmtNumber } from "@/features/lab/format";
import { ExportButton } from "@/features/lab/components/LabLayout";
import {
  LabChartBox,
  LabFetchingHint,
  LabKpiSkeletons,
  LabProgressBar,
  LabTableSkeleton,
} from "@/features/lab/components/Loading";
import type { NirFilters, NirMeasurementDto } from "@/features/lab/types";

const PAGE_SIZE = 50;

/** Se cicla con módulo: la cantidad de parámetros depende del producto. */
const COLORES = ["#f59e0b", "#0ea5e9", "#10b981", "#8b5cf6", "#ef4444", "#64748b"];

const CLASE_CONTROL =
  "px-2 py-1 text-[12.5px] border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary";

export const LabNirPage: React.FC = () => {
  const [filtros, setFiltros] = React.useState<NirFilters>({ pageSize: PAGE_SIZE });
  const [texto, setTexto] = React.useState("");

  // Debounce en el buscador. El dashboard original no lo tenía y cada tecla
  // disparaba tres consultas agregadas; es un cambio deliberado.
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

  const productosQ = useQuery({
    queryKey: labKeys.nirProducts,
    queryFn: labApi.nir.products,
    staleTime: 5 * 60_000,
  });

  // Arranca en el producto con más mediciones: es lo que el laboratorio mira
  // siempre. El guard evita pisar una selección previa.
  React.useEffect(() => {
    const p = productosQ.data;
    if (p && p.length > 0) {
      setFiltros((f) => (f.product ? f : { ...f, product: p[0].productName }));
    }
  }, [productosQ.data]);

  const habilitado = Boolean(filtros.product);

  const [statsQ, tendenciaQ, medQ] = useQueries({
    queries: [
      {
        queryKey: labKeys.nirStats(filtros),
        queryFn: () => labApi.nir.stats(filtros),
        enabled: habilitado,
      },
      {
        queryKey: labKeys.nirTrend(filtros),
        queryFn: () => labApi.nir.trend(filtros),
        enabled: habilitado,
      },
      {
        queryKey: labKeys.nirMeasurements(filtros),
        queryFn: () => labApi.nir.measurements(filtros),
        enabled: habilitado,
      },
    ],
  });

  const errores = [productosQ.error, statsQ.error, tendenciaQ.error, medQ.error].filter(Boolean);
  React.useEffect(() => {
    if (errores.length > 0) toast.error(`Error cargando NIR: ${labError(errores[0])}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errores.length > 0 ? labError(errores[0]) : null]);

  const stats = statsQ.data;
  const items = medQ.data?.items ?? [];
  const total = medQ.data?.total ?? 0;

  /**
   * Los nombres de parámetro salen de las STATS y no de las filas: cada producto
   * mide parámetros distintos, y si las columnas se derivaran de cada fila, una
   * medición que no trae un parámetro desalinearía la tabla. Una sola fuente de
   * verdad para indicadores, columnas y series del gráfico.
   */
  const nombresParam = React.useMemo(
    () => (stats?.parameters ?? []).map((p) => p.parameterName),
    [stats],
  );

  const datosGrafico = React.useMemo(
    () => (tendenciaQ.data ?? []).map((p) => ({ date: fmtDate(p.date), ...p.averages })),
    [tendenciaQ.data],
  );

  const seleccionado = (productosQ.data ?? []).find((p) => p.productName === filtros.product);
  const hayFiltrosExtra = Boolean(filtros.from || filtros.to || filtros.sampleCodeContains);

  const columnasCsv: ColumnaCsv<NirMeasurementDto>[] = React.useMemo(
    () => [
      { header: "Fecha y hora", value: (m) => fmtDateTime(m.analyzedAt) },
      { header: "Muestra", value: (m) => m.sampleCode ?? "" },
      { header: "Producto", value: (m) => m.productName },
      ...nombresParam.map((n) => ({
        header: n,
        value: (m: NirMeasurementDto) =>
          m.parameters.find((p) => p.parameterName === n)?.value ?? null,
      })),
    ],
    [nombresParam],
  );

  return (
    <div className="space-y-4">
      {/* ─── Producto y filtros ──────────────────────────────────────── */}
      <div className="border border-border bg-card rounded-lg overflow-hidden">
        <LabProgressBar active={statsQ.isFetching || medQ.isFetching} />
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">
          {productosQ.isPending ? (
            <span className="text-[12px] text-muted-foreground">Cargando productos…</span>
          ) : (
            (productosQ.data ?? []).map((p) => {
              const activo = filtros.product === p.productName;
              return (
                <button
                  key={p.productName}
                  onClick={() =>
                    setFiltros((f) => ({ ...f, product: p.productName, pageSize: PAGE_SIZE }))
                  }
                  className={`px-2.5 py-1 rounded-md text-[12.5px] border transition-colors ${
                    activo
                      ? "border-primary bg-primary/5 text-foreground font-medium"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {p.productName}
                  <span
                    className={`ml-1.5 font-mono text-[10.5px] tabular-nums ${
                      activo ? "text-primary" : "opacity-70"
                    }`}
                  >
                    {fmtInt(p.totalSamples)}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-t border-border bg-muted/20">
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
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Buscar por muestra: TAPERA, AC28…"
              className={`${CLASE_CONTROL} w-full pl-8`}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>

          {hayFiltrosExtra && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11.5px] text-muted-foreground"
              onClick={() => {
                setTexto("");
                // Preserva el producto: cambiarlo al limpiar sacaría al usuario
                // de lo que estaba mirando.
                setFiltros({ product: filtros.product, pageSize: PAGE_SIZE });
              }}
            >
              <X size={12} className="mr-1" />
              Limpiar
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <LabFetchingHint active={statsQ.isFetching && !statsQ.isPending} />
            {seleccionado?.lastAt && (
              <span className="text-[11.5px] text-muted-foreground">
                última medición {fmtDate(seleccionado.lastAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      {stats && stats.count > 0 && (
        <p className="text-[11.5px] text-muted-foreground">
          Promedios sobre las <strong>{fmtInt(stats.count)}</strong> mediciones que cumplen
          el filtro
          {stats.firstAt && stats.lastAt && ` · ${fmtDate(stats.firstAt)} a ${fmtDate(stats.lastAt)}`}
        </p>
      )}

      {/* ─── Indicadores por parámetro ───────────────────────────────── */}
      {statsQ.isPending ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <LabKpiSkeletons count={3} />
        </div>
      ) : stats && stats.count === 0 ? (
        <div className="border border-border bg-card rounded-lg p-8 text-center text-sm text-muted-foreground">
          Sin mediciones para este filtro
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(stats?.parameters ?? []).map((p) => (
            <KpiCard
              key={p.parameterName}
              label={p.parameterName}
              value={fmtNumber(p.avg)}
              tone={p.excluded > 0 ? "amber" : "default"}
              hint={
                p.min !== null ? (
                  <>
                    rango {fmtNumber(p.min)} – {fmtNumber(p.max)}
                    {p.excluded > 0 && ` · ${p.excluded} fuera de rango excluidos`}
                  </>
                ) : (
                  "sin valores válidos"
                )
              }
            />
          ))}
        </div>
      )}

      {/* ─── Evolución diaria ────────────────────────────────────────── */}
      <div className="border border-border bg-card rounded-lg overflow-hidden">
        <LabProgressBar active={tendenciaQ.isFetching} />
        <div className="flex items-start justify-between gap-2 px-3 py-2 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold">
              Evolución diaria{filtros.product ? ` — ${filtros.product}` : ""}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Promedio por día. Se excluyen los valores no positivos (fuera del rango de
              calibración).
            </p>
          </div>
        </div>
        <div className="p-3">
          <LabChartBox
            height={300}
            loading={tendenciaQ.isPending}
            empty={datosGrafico.length === 0}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datosGrafico} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} domain={["auto", "auto"]} />
                <Tooltip />
                <Legend />
                {/* connectNulls, al contrario que en Supervisor: hay parámetros
                    que no se miden todos los días, y cortar la serie en cada
                    hueco deja el gráfico ilegible. */}
                {nombresParam.map((n, i) => (
                  <Line
                    key={n}
                    type="monotone"
                    dataKey={n}
                    stroke={COLORES[i % COLORES.length]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
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
              exportarCsv(items, columnasCsv, `nir_${filtros.product ?? "todos"}`);
              toast.success(`${items.length} mediciones exportadas`);
            }}
            disabled={items.length === 0}
            title={
              items.length < total
                ? `Exporta las ${items.length} mediciones cargadas. Usá "Mostrar más" para incluir el resto.`
                : "Descargar en CSV"
            }
          />
        </div>

        {medQ.isPending ? (
          <LabTableSkeleton rows={8} cols={5} />
        ) : items.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            Sin mediciones para este filtro
          </div>
        ) : (
          <>
            <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10">
                  <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/40 backdrop-blur">
                    <th className="font-medium pl-4 pr-2 py-2 whitespace-nowrap">Fecha/hora</th>
                    <th className="font-medium px-2 py-2">Muestra</th>
                    {nombresParam.map((n) => (
                      <th key={n} className="font-medium px-2 py-2 text-right whitespace-nowrap">
                        {n}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((m) => {
                    const porNombre = new Map(
                      m.parameters.map((p) => [p.parameterName, p.value]),
                    );
                    return (
                      <tr
                        key={m.nirMeasurementId}
                        className="border-b border-border/60 hover:bg-muted/40 transition-colors"
                      >
                        <td className="py-2.5 pl-4 pr-2 whitespace-nowrap text-[12.5px] tabular-nums">
                          {fmtDateTime(m.analyzedAt)}
                        </td>
                        <td className="px-2 py-2.5 text-[12.5px]">
                          {m.sampleCode || (
                            <span className="text-muted-foreground">(sin código)</span>
                          )}
                        </td>
                        {nombresParam.map((n) => {
                          const v = porNombre.get(n) ?? null;
                          // Un valor no positivo es una predicción fuera del
                          // rango de calibración. Se excluye del promedio pero
                          // se MUESTRA en rojo: es evidencia de un problema de
                          // calibración, no ruido a esconder.
                          const fuera = v !== null && v <= 0;
                          return (
                            <td
                              key={n}
                              className={`px-2 py-2.5 text-right text-[12.5px] tabular-nums ${
                                fuera ? "text-red-600 dark:text-red-400 font-medium" : ""
                              }`}
                              title={fuera ? "Fuera del rango de calibración" : undefined}
                            >
                              {fmtNumber(v)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
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
                    // Crece el pageSize en lugar de paginar: así la tabla siempre
                    // describe el mismo conjunto que los indicadores y el gráfico.
                    setFiltros((f) => ({ ...f, pageSize: (f.pageSize ?? PAGE_SIZE) + PAGE_SIZE }))
                  }
                  disabled={medQ.isFetching}
                >
                  {medQ.isFetching
                    ? "Cargando…"
                    : `Mostrar más (${fmtInt(total - items.length)} restantes)`}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LabNirPage;
