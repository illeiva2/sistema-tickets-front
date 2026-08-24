import React from "react";
import { useInfiniteQuery, useQueries, useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui";
import { KpiCard } from "@/components/dashboards/shared";
import { labApi, labError, labKeys } from "@/features/lab/api";
import { exportarCsv, type ColumnaCsv } from "@/features/lab/export";
import { fmtDateTime, fmtInt, fmtNumber, fmtRelative } from "@/features/lab/format";
import { ExportButton } from "@/features/lab/components/LabLayout";
import GlutenFilters, { hayFiltrosActivos } from "@/features/lab/components/GlutenFilters";
import MeasurementsTable from "@/features/lab/components/MeasurementsTable";
import MeasurementDetailModal from "@/features/lab/components/MeasurementDetailModal";
import {
  LabFetchingHint,
  LabKpiSkeletons,
  LabProgressBar,
  LabTableSkeleton,
  useTicker,
} from "@/features/lab/components/Loading";
import type { MeasurementDto, MeasurementsFilters } from "@/features/lab/types";

const PAGE_SIZE = 50;

/** Un equipo que no reporta hace más de dos días es una anomalía, no un filtro vacío. */
const VIEJO_MS = 2 * 24 * 60 * 60 * 1000;

const COLUMNAS_CSV: ColumnaCsv<MeasurementDto>[] = [
  { header: "Fecha y hora", value: (m) => fmtDateTime(m.analyzedAt) },
  { header: "Muestra", value: (m) => m.sampleCode },
  { header: "Método", value: (m) => m.methodName?.trim() ?? "" },
  { header: "Gluten húmedo (%)", value: (m) => m.wetGluten },
  { header: "Gluten seco (%)", value: (m) => m.dryGluten },
  { header: "Índice de gluten", value: (m) => m.glutenIndex, decimals: 0 },
  { header: "Retención de agua (%)", value: (m) => m.waterBindingCapacity },
  { header: "Equipo", value: (m) => m.instrumentName ?? m.instrumentSerial },
  { header: "Serial", value: (m) => m.instrumentSerial },
];

export const LabOperatorPage: React.FC = () => {
  const [filtros, setFiltros] = React.useState<MeasurementsFilters>({
    sortBy: "analyzedAt",
    sortDesc: true,
  });
  const [detalle, setDetalle] = React.useState<number | null>(null);

  // Mantiene vivos los textos de tiempo relativo ("hace 3 min").
  useTicker(1000);

  const conFiltros = hayFiltrosActivos(filtros);

  const equiposQ = useQuery({
    queryKey: labKeys.equipment,
    queryFn: labApi.equipment,
    staleTime: 5 * 60_000,
  });
  const metodosQ = useQuery({
    queryKey: labKeys.methods,
    queryFn: labApi.methods,
    staleTime: 5 * 60_000,
  });
  const resumenQ = useQuery({
    queryKey: labKeys.summary,
    queryFn: labApi.summary,
    staleTime: 30_000,
  });
  const statsQ = useQuery({
    queryKey: labKeys.stats(filtros),
    queryFn: () => labApi.stats(filtros),
  });

  const equipos = equiposQ.data ?? [];
  const seleccionado = equipos.find((e) => e.serial === filtros.instrumentSerial);

  /**
   * Frescura por equipo: se pide SIN filtros a propósito. Si arrastrara el
   * filtro de fecha, un equipo caído aparecería simplemente como "sin datos en
   * el período" y se perdería justo la señal que interesa.
   */
  const frescuraQ = useQueries({
    queries: equipos.map((e) => ({
      queryKey: labKeys.stats({ instrumentSerial: e.serial }),
      queryFn: () => labApi.stats({ instrumentSerial: e.serial }),
      staleTime: 60_000,
    })),
  });

  /**
   * Promedios por harina, con triple condición:
   *   1. hay un equipo seleccionado,
   *   2. el backend devolvió alguna harina conocida,
   *   3. ese equipo es el del molino.
   * En acopio los códigos son campos y camiones, así que clasificar por prefijo
   * de harina daría números sin sentido.
   */
  const esMolino = Boolean(
    seleccionado && /molino/i.test(`${seleccionado.displayName} ${seleccionado.location ?? ""}`),
  );
  const harinasQ = useQuery({
    queryKey: labKeys.flour(filtros),
    queryFn: () => labApi.flourStats(filtros),
    enabled: esMolino,
  });

  const medQ = useInfiniteQuery({
    queryKey: labKeys.measurements({ ...filtros, pageSize: PAGE_SIZE }),
    queryFn: ({ pageParam }) =>
      labApi.measurements({ ...filtros, page: pageParam as number, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (ultima, todas) => {
      const cargadas = todas.reduce((n, p) => n + p.items.length, 0);
      return cargadas < ultima.total ? todas.length + 1 : undefined;
    },
    // Auto-refresco solo con una página cargada. Con varias, refrescar
    // recargaría todas: caro contra este backend, y la lista salta.
    //
    // Dos minutos y no los 30 segundos del dashboard original: los datos solo
    // pueden cambiar cuando corre el agente del molino, que es cada 5 minutos.
    // Refrescar cada 30 s significaba que 9 de cada 10 consultas volvían con lo
    // mismo, y cada una agrega ~2 s de trabajo contra la base. El indicador de
    // frescura ya dice hace cuánto es el último dato, así que la información
    // que se pierde es nula.
    refetchInterval: (q) => (q.state.data?.pages.length === 1 ? 120_000 : false),
  });

  const items = React.useMemo(
    () => medQ.data?.pages.flatMap((p) => p.items) ?? [],
    [medQ.data],
  );
  const total = medQ.data?.pages[0]?.total ?? 0;

  // Los errores se avisan una vez por cambio de error, no en cada render.
  const errores = [equiposQ.error, metodosQ.error, statsQ.error, medQ.error].filter(Boolean);
  React.useEffect(() => {
    if (errores.length > 0) toast.error(`Error cargando datos: ${labError(errores[0])}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errores.length > 0 ? labError(errores[0]) : null]);

  const ordenar = (col: string) =>
    setFiltros((f) => ({
      ...f,
      sortBy: col,
      sortDesc: f.sortBy === col ? !f.sortDesc : true,
    }));

  const cargandoKpis = conFiltros ? statsQ.isPending : resumenQ.isPending;
  const stats = statsQ.data;
  const resumen = resumenQ.data;

  return (
    <div className="space-y-4">
      {conFiltros && stats && (
        <p className="text-[11.5px] text-muted-foreground">
          Los indicadores se calculan sobre las <strong>{fmtInt(stats.count)}</strong>{" "}
          mediciones que cumplen el filtro, no sobre las cargadas en la tabla.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cargandoKpis ? (
          <LabKpiSkeletons count={4} />
        ) : conFiltros && stats ? (
          <>
            <KpiCard
              label="Muestras en filtro"
              value={fmtInt(stats.count)}
              tone="blue"
              hint={stats.lastMeasurementAt ? `última: ${fmtRelative(stats.lastMeasurementAt)}` : undefined}
            />
            <KpiCard
              label="Gluten húmedo prom."
              value={
                <>
                  {fmtNumber(stats.avgWetGluten)}
                  <span className="text-base text-muted-foreground ml-0.5">%</span>
                </>
              }
              hint={
                stats.minWetGluten !== null
                  ? `rango ${fmtNumber(stats.minWetGluten)} – ${fmtNumber(stats.maxWetGluten)}`
                  : undefined
              }
            />
            <KpiCard
              label="Índice gluten prom."
              value={fmtNumber(stats.avgGlutenIndex, 1)}
              hint={
                stats.minGlutenIndex !== null
                  ? `rango ${fmtNumber(stats.minGlutenIndex, 1)} – ${fmtNumber(stats.maxGlutenIndex, 1)}`
                  : undefined
              }
            />
            <KpiCard
              label="Incompletas en filtro"
              value={fmtInt(stats.incompleteCount)}
              tone={stats.incompleteCount > 0 ? "amber" : "default"}
              hint={
                stats.incompleteCount > 0
                  ? `de ${fmtInt(stats.count)} · requieren revisión`
                  : "sin errores"
              }
            />
          </>
        ) : (
          <>
            <KpiCard label="Muestras hoy" value={fmtInt(resumen?.samplesToday)} tone="blue" />
            <KpiCard label="Esta semana" value={fmtInt(resumen?.samplesThisWeek)} />
            <KpiCard
              label="Gluten húmedo prom. (7d)"
              value={
                <>
                  {fmtNumber(resumen?.avgWetGlutenLast7Days)}
                  <span className="text-base text-muted-foreground ml-0.5">%</span>
                </>
              }
            />
            <KpiCard
              label="Índice gluten prom. (7d)"
              value={fmtNumber(resumen?.avgGlutenIndexLast7Days, 1)}
              hint={
                resumen?.lastMeasurementAt
                  ? `última medición ${fmtRelative(resumen.lastMeasurementAt)}`
                  : undefined
              }
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ─── Equipos ─────────────────────────────────────────────────── */}
        <div className="border border-border bg-card rounded-lg overflow-hidden self-start">
          <div className="px-3 py-2 border-b border-border">
            <h2 className="text-sm font-semibold">Equipos</h2>
          </div>
          <div className="p-3 space-y-2">
            {equiposQ.isPending && <LabTableSkeleton rows={2} cols={2} />}
            {equipos.map((e, i) => {
              const st = frescuraQ[i]?.data;
              const ultima = st?.lastMeasurementAt ?? null;
              const viejo = ultima ? Date.now() - new Date(ultima).getTime() > VIEJO_MS : false;
              const activo = filtros.instrumentSerial === e.serial;

              return (
                <button
                  key={e.serial}
                  onClick={() =>
                    setFiltros((f) => ({
                      ...f,
                      instrumentSerial: activo ? undefined : e.serial,
                    }))
                  }
                  className={`w-full text-left rounded-md border px-3 py-2 transition-colors ${
                    activo
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-medium">{e.displayName}</span>
                    {/* Se lee del DTO y no se fuerza a "Activo": el dashboard
                        original lo tenía hardcodeado y ocultaba un equipo dado
                        de baja. */}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        e.isActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {e.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {e.location && `${e.location} · `}
                    {fmtInt(e.totalSamples)} mediciones
                  </div>
                  <div
                    className={`text-[11px] mt-0.5 ${
                      viejo ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {ultima
                      ? `${viejo ? "⚠ " : ""}última medición ${fmtRelative(ultima)}`
                      : frescuraQ[i]?.isPending
                        ? "consultando…"
                        : "sin mediciones registradas"}
                  </div>
                  <div className="text-[11px] mt-1 text-primary">
                    {activo ? "✓ Filtrando" : "Filtrar"}
                  </div>
                </button>
              );
            })}
          </div>

          {esMolino && harinasQ.data && harinasQ.data.some((f) => f.flour !== "Otras") && (
            <div className="border-t border-border">
              <div className="px-3 py-2">
                <h3 className="text-sm font-semibold">Promedios por harina</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {conFiltros
                    ? "Según los filtros aplicados (mismo conjunto que los indicadores)"
                    : "Histórico completo"}
                </p>
              </div>
              {harinasQ.data.every((f) => f.count === 0) ? (
                <div className="px-3 pb-3 text-[12px] text-muted-foreground">
                  Sin mediciones de este equipo en el período filtrado.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground border-y border-border bg-muted/20">
                        <th className="font-medium pl-3 pr-2 py-1.5">Harina</th>
                        <th className="font-medium px-2 py-1.5 text-right">Muestras</th>
                        <th className="font-medium px-2 py-1.5 text-right">GH %</th>
                        <th className="font-medium px-2 py-1.5 text-right">GS %</th>
                        <th className="font-medium px-2 py-1.5 text-right">Índice</th>
                        <th className="font-medium px-2 pr-3 py-1.5 text-right">WBC %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {harinasQ.data.map((f) => (
                        <tr
                          key={f.flour}
                          className={f.flour === "Otras" ? "text-muted-foreground/70" : ""}
                        >
                          <td className="pl-3 pr-2 py-1.5 text-[12px] font-medium">{f.flour}</td>
                          <td className="px-2 py-1.5 text-right text-[12px] tabular-nums">{fmtInt(f.count)}</td>
                          <td className="px-2 py-1.5 text-right text-[12px] tabular-nums">{fmtNumber(f.avgWetGluten)}</td>
                          <td className="px-2 py-1.5 text-right text-[12px] tabular-nums">{fmtNumber(f.avgDryGluten)}</td>
                          <td className="px-2 py-1.5 text-right text-[12px] tabular-nums">{fmtNumber(f.avgGlutenIndex, 1)}</td>
                          <td className="px-2 pr-3 py-1.5 text-right text-[12px] tabular-nums">{fmtNumber(f.avgWBC)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Filtros + tabla ─────────────────────────────────────────── */}
        <div className="lg:col-span-2 border border-border bg-card rounded-lg overflow-hidden">
          <LabProgressBar active={medQ.isFetching || statsQ.isFetching} />

          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-sm font-semibold shrink-0">Mediciones</h2>
              <span className="text-[11.5px] text-muted-foreground tabular-nums shrink-0">
                {items.length} de {fmtInt(total)}
              </span>
              <LabFetchingHint active={medQ.isFetching && !medQ.isPending} />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <ExportButton
                onClick={() => {
                  exportarCsv(items, COLUMNAS_CSV, "laboratorio_gluten");
                  toast.success(`${items.length} mediciones exportadas`);
                }}
                disabled={items.length === 0}
                title={
                  items.length < total
                    ? `Exporta las ${items.length} mediciones cargadas. Usá "Cargar más" para incluir el resto.`
                    : "Descargar en CSV"
                }
              />
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[11.5px]"
                onClick={() => medQ.refetch()}
                disabled={medQ.isFetching}
                title="Refrescar ahora"
              >
                <RefreshCw size={12} className={medQ.isFetching ? "animate-spin" : ""} />
              </Button>
            </div>
          </div>

          <GlutenFilters
            equipment={equipos}
            methods={metodosQ.data ?? []}
            value={filtros}
            onChange={setFiltros}
          />

          {medQ.isPending ? (
            <LabTableSkeleton rows={8} cols={7} />
          ) : items.length === 0 ? (
            <div className="px-4 py-12 text-center space-y-3">
              <div className="text-sm font-medium">Sin mediciones para los filtros aplicados</div>
              {conFiltros && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFiltros({ sortBy: "analyzedAt", sortDesc: true })}
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="max-h-[560px] overflow-y-auto">
                <MeasurementsTable
                  items={items}
                  sortBy={filtros.sortBy}
                  sortDesc={filtros.sortDesc}
                  onSort={ordenar}
                  onRowClick={(m) => setDetalle(m.sampleId)}
                />
              </div>
              {medQ.hasNextPage && (
                <div className="px-3 py-2 border-t border-border bg-muted/20 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-3 text-[11.5px]"
                    onClick={() => medQ.fetchNextPage()}
                    disabled={medQ.isFetchingNextPage}
                  >
                    {medQ.isFetchingNextPage
                      ? "Cargando…"
                      : `Cargar más (${fmtInt(total - items.length)} restantes)`}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <MeasurementDetailModal sampleId={detalle} onClose={() => setDetalle(null)} />
    </div>
  );
};

export default LabOperatorPage;
