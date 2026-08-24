import React from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { labApi, labError, labKeys } from "@/features/lab/api";
import { exportarCsv, type ColumnaCsv } from "@/features/lab/export";
import { fmtDate, fmtInt, fmtNumber, toDateInput } from "@/features/lab/format";
import { ExportButton } from "@/features/lab/components/LabLayout";
import {
  LabChartBox,
  LabFetchingHint,
  LabProgressBar,
} from "@/features/lab/components/Loading";
import type { MonthlyTrendPointDto, TrendPointDto } from "@/features/lab/types";

/**
 * Vista de supervisión: tendencias en el tiempo, sin tabla de mediciones.
 *
 * Un color por parámetro, consistente con la vista del NIR: el ámbar es siempre
 * el parámetro primario. Son hex literales, igual que en los dashboards del
 * repo — los tokens de theme no alcanzan para series categóricas.
 */
const COLOR = {
  wet: "#f59e0b",
  dry: "#10b981",
  wbc: "#8b5cf6",
  idx: "#0ea5e9",
};

const PERIODOS = [
  { v: 7, label: "Últimos 7 días" },
  { v: 30, label: "Últimos 30 días" },
  { v: 90, label: "Últimos 90 días" },
  { v: 180, label: "Últimos 180 días" },
  { v: 365, label: "Último año" },
];

const CLASE_CONTROL =
  "px-2 py-1 text-[12.5px] border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary";

const CSV_DIARIO: ColumnaCsv<TrendPointDto>[] = [
  { header: "Fecha", value: (p) => p.date },
  { header: "Muestras", value: (p) => p.count, decimals: 0 },
  { header: "Gluten húmedo (%)", value: (p) => p.avgWetGluten },
  { header: "Gluten seco (%)", value: (p) => p.avgDryGluten },
  { header: "Índice de gluten", value: (p) => p.avgGlutenIndex, decimals: 1 },
  { header: "Retención de agua (%)", value: (p) => p.avgWBC },
];

const CSV_MENSUAL: ColumnaCsv<MonthlyTrendPointDto>[] = [
  { header: "Año", value: (p) => p.year, decimals: 0 },
  { header: "Mes", value: (p) => p.month, decimals: 0 },
  { header: "Muestras", value: (p) => p.count, decimals: 0 },
  { header: "Gluten húmedo (%)", value: (p) => p.avgWetGluten },
  { header: "Gluten seco (%)", value: (p) => p.avgDryGluten },
  { header: "Índice de gluten", value: (p) => p.avgGlutenIndex, decimals: 1 },
  { header: "Retención de agua (%)", value: (p) => p.avgWBC },
];

export const LabSupervisorPage: React.FC = () => {
  const [dias, setDias] = React.useState(30);
  const [serial, setSerial] = React.useState("");
  const [metodo, setMetodo] = React.useState("");

  /**
   * El mismo "desde" alimenta la tendencia y las estadísticas, para que cuenten
   * y promedien exactamente el mismo conjunto. Se construye con componentes
   * locales: un toISOString() correría el día a la tarde.
   */
  const desde = React.useMemo(
    () => toDateInput(new Date(Date.now() - dias * 86_400_000)),
    [dias],
  );

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

  const params = { days: dias, instrumentSerial: serial || undefined, method: metodo || undefined };

  const [tendenciaQ, statsQ, mensualQ] = useQueries({
    queries: [
      {
        queryKey: labKeys.trend(params),
        queryFn: () => labApi.trend({ ...params, from: desde }),
      },
      {
        queryKey: labKeys.stats({ from: desde, instrumentSerial: serial || undefined, method: metodo || undefined }),
        queryFn: () =>
          labApi.stats({ from: desde, instrumentSerial: serial || undefined, method: metodo || undefined }),
      },
      {
        // Fijo en 12 meses: NO respeta el selector de período, pero sí equipo y
        // método. El subtítulo del gráfico lo dice para que nadie lo lea mal.
        queryKey: labKeys.trendMonthly({ months: 12, serial: serial || undefined, method: metodo || undefined }),
        queryFn: () =>
          labApi.trendMonthly({ months: 12, serial: serial || undefined, method: metodo || undefined }),
      },
    ],
  });

  const errores = [tendenciaQ.error, statsQ.error, mensualQ.error, equiposQ.error].filter(Boolean);
  React.useEffect(() => {
    if (errores.length > 0) toast.error(`Error cargando tendencias: ${labError(errores[0])}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errores.length > 0 ? labError(errores[0]) : null]);

  const diario = tendenciaQ.data ?? [];
  const mensual = mensualQ.data ?? [];
  const stats = statsQ.data;

  // `?? null` explícito para que recharts CORTE la línea en los huecos en vez
  // de interpolar un valor que nadie midió. Acá no se usa connectNulls, a
  // diferencia del NIR: son series densas y un hueco es información.
  const datosDiarios = React.useMemo(
    () =>
      diario.map((p) => ({
        date: fmtDate(p.date),
        count: p.count,
        "Gluten húmedo (%)": p.avgWetGluten ?? null,
        "Gluten seco (%)": p.avgDryGluten ?? null,
        "WBC (%)": p.avgWBC ?? null,
        "Índice de gluten": p.avgGlutenIndex ?? null,
      })),
    [diario],
  );

  const datosMensuales = React.useMemo(
    () =>
      mensual.map((p) => ({
        mes: new Date(p.year, p.month - 1, 1).toLocaleDateString("es-AR", {
          month: "short",
          year: "2-digit",
        }),
        "Gluten húmedo (%)": p.avgWetGluten ?? null,
        "Gluten seco (%)": p.avgDryGluten ?? null,
        "WBC (%)": p.avgWBC ?? null,
        "Índice de gluten": p.avgGlutenIndex ?? null,
      })),
    [mensual],
  );

  const cargando = tendenciaQ.isPending || mensualQ.isPending;

  return (
    <div className="space-y-4">
      {/* ─── Filtros ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border border-border rounded-lg bg-card">
        <label className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          Período
          <select
            className={CLASE_CONTROL}
            value={dias}
            onChange={(e) => setDias(Number(e.target.value))}
          >
            {PERIODOS.map((p) => (
              <option key={p.v} value={p.v}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <select className={CLASE_CONTROL} value={serial} onChange={(e) => setSerial(e.target.value)}>
          <option value="">Todos los equipos</option>
          {(equiposQ.data ?? []).map((e) => (
            <option key={e.serial} value={e.serial}>
              {e.displayName} ({e.serial})
            </option>
          ))}
        </select>

        <select className={CLASE_CONTROL} value={metodo} onChange={(e) => setMetodo(e.target.value)}>
          <option value="">Todos los métodos</option>
          {(metodosQ.data ?? []).map((m) => (
            <option key={m.name} value={m.name}>
              {m.name.trim()} ({m.totalUses})
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <LabFetchingHint active={tendenciaQ.isFetching && !tendenciaQ.isPending} />
          {stats && (
            <span className="text-[12px] text-muted-foreground tabular-nums">
              {fmtInt(stats.count)} muestras en el período
              {stats.avgWetGluten !== null && ` · gluten húmedo prom. ${fmtNumber(stats.avgWetGluten)} %`}
              {stats.avgGlutenIndex !== null && ` · índice prom. ${fmtNumber(stats.avgGlutenIndex, 1)}`}
            </span>
          )}
        </div>
      </div>

      {/* ─── Evolución diaria ─────────────────────────────────────────── */}
      <div className="border border-border bg-card rounded-lg overflow-hidden">
        <LabProgressBar active={tendenciaQ.isFetching} />
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
          <h2 className="text-sm font-semibold">Evolución de parámetros</h2>
          <ExportButton
            onClick={() => {
              exportarCsv(diario, CSV_DIARIO, "laboratorio_tendencia_diaria");
              toast.success(`${diario.length} días exportados`);
            }}
            disabled={diario.length === 0}
          />
        </div>
        <div className="p-3">
          <LabChartBox height={320} loading={cargando} empty={datosDiarios.length === 0}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datosDiarios} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis yAxisId="l" fontSize={11} domain={["auto", "auto"]} />
                {/* Eje derecho fijo 0–100: el índice de gluten es una escala
                    0-100 por definición. Compartiendo eje con los porcentajes
                    de gluten, las cuatro series quedan ilegibles. */}
                <YAxis yAxisId="r" orientation="right" fontSize={11} domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line yAxisId="l" type="monotone" dataKey="Gluten húmedo (%)" stroke={COLOR.wet} strokeWidth={2} dot={false} />
                <Line yAxisId="l" type="monotone" dataKey="Gluten seco (%)" stroke={COLOR.dry} strokeWidth={2} dot={false} />
                <Line yAxisId="l" type="monotone" dataKey="WBC (%)" stroke={COLOR.wbc} strokeWidth={2} dot={false} />
                <Line yAxisId="r" type="monotone" dataKey="Índice de gluten" stroke={COLOR.idx} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </LabChartBox>
        </div>
      </div>

      {/* ─── Promedios por mes ────────────────────────────────────────── */}
      <div className="border border-border bg-card rounded-lg overflow-hidden">
        <LabProgressBar active={mensualQ.isFetching} />
        <div className="flex items-start justify-between gap-2 px-3 py-2 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold">Promedios por mes</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Últimos 12 meses · ponderado por muestra · respeta los filtros de equipo y
              método, no el de período
            </p>
          </div>
          <ExportButton
            onClick={() => {
              exportarCsv(mensual, CSV_MENSUAL, "laboratorio_promedios_mensuales");
              toast.success(`${mensual.length} meses exportados`);
            }}
            disabled={mensual.length === 0}
          />
        </div>
        <div className="p-3">
          <LabChartBox height={280} loading={mensualQ.isPending} empty={datosMensuales.length === 0} emptyLabel="Sin datos">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datosMensuales} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" fontSize={11} />
                <YAxis yAxisId="l" fontSize={11} domain={["auto", "auto"]} />
                <YAxis yAxisId="r" orientation="right" fontSize={11} domain={[0, 100]} />
                <Tooltip />
                <Legend />
                {/* Con puntos, a diferencia del diario: son 12 valores
                    discretos y no una serie densa. */}
                <Line yAxisId="l" type="monotone" dataKey="Gluten húmedo (%)" stroke={COLOR.wet} strokeWidth={2} />
                <Line yAxisId="l" type="monotone" dataKey="Gluten seco (%)" stroke={COLOR.dry} strokeWidth={2} />
                <Line yAxisId="l" type="monotone" dataKey="WBC (%)" stroke={COLOR.wbc} strokeWidth={2} />
                <Line yAxisId="r" type="monotone" dataKey="Índice de gluten" stroke={COLOR.idx} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </LabChartBox>
        </div>
      </div>

      {/* ─── Volumen diario ──────────────────────────────────────────── */}
      <div className="border border-border bg-card rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-border">
          <h2 className="text-sm font-semibold">Volumen de mediciones por día</h2>
        </div>
        <div className="p-3">
          <LabChartBox height={220} loading={cargando} empty={datosDiarios.length === 0} emptyLabel="Sin datos">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosDiarios}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Muestras" fill={COLOR.wet} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </LabChartBox>
        </div>
      </div>

      {/* ─── Resumen de equipos ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(equiposQ.data ?? []).map((e) => {
          const activo = serial === e.serial;
          return (
            <div key={e.serial} className="border border-border bg-card rounded-lg p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{e.displayName}</h3>
                <span className="text-[11px] text-muted-foreground font-mono">S/N {e.serial}</span>
              </div>
              <p className="text-[12px] text-muted-foreground mt-1">
                Total histórico: <strong className="text-foreground">{fmtInt(e.totalSamples)}</strong>{" "}
                mediciones
              </p>
              {e.location && <p className="text-[11px] text-muted-foreground">{e.location}</p>}
              <button
                onClick={() => setSerial(activo ? "" : e.serial)}
                className="mt-2 text-[11.5px] text-primary hover:underline"
              >
                {activo
                  ? "✓ Filtrando este equipo (click para limpiar)"
                  : "Filtrar tendencias por este equipo"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LabSupervisorPage;
