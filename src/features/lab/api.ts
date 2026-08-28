import api from "@/lib/api";
import type {
  DashboardSummaryDto,
  EquipmentDto,
  FlourStatsDto,
  MeasurementDetailDto,
  MeasurementDto,
  MeasurementStatsDto,
  MeasurementsFilters,
  MethodDto,
  MonthlyTrendPointDto,
  NirFilters,
  NirMeasurementDto,
  NirProductDto,
  NirStatsDto,
  NirTrendPointDto,
  PagedResult,
  TrendPointDto,
  FnStatsDto,
  FnMeasurementDto,
  FnTrendPointDto,
  FnFilters,
} from "./types";

/**
 * Cliente del módulo de laboratorio.
 *
 * El prefijo `/api` se escribe a mano, como en todo el repo: el baseURL de axios
 * es el origen desnudo del servicio. Omitirlo devuelve 404 sin ninguna pista de
 * por qué — ya costó una sesión entera de diagnóstico.
 */

const BASE = "/api/glutenlab";

/** El backend responde `{ success, data }`. Acá se desenvuelve una sola vez. */
async function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const limpios: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params ?? {})) {
    // undefined y '' se descartan para que no viajen como `?from=` vacío, que
    // el backend interpretaría como filtro presente.
    if (v !== undefined && v !== null && v !== "") limpios[k] = v;
  }
  const res = await api.get<{ success: boolean; data: T }>(`${BASE}${path}`, {
    params: limpios,
  });
  return res.data.data;
}

/** Los filtros de agregados NO incluyen paginación ni orden: describen el conjunto, no la página. */
const soloFiltros = (f: MeasurementsFilters) => ({
  from: f.from,
  to: f.to,
  instrumentSerial: f.instrumentSerial,
  method: f.method,
  sampleCodeContains: f.sampleCodeContains,
  includeIncomplete: f.includeIncomplete,
});

export const labApi = {
  equipment: () => get<EquipmentDto[]>("/equipment"),
  methods: () => get<MethodDto[]>("/methods"),
  summary: () => get<DashboardSummaryDto>("/dashboard/summary"),

  measurements: (f: MeasurementsFilters = {}) =>
    get<PagedResult<MeasurementDto>>("/measurements", { ...f }),

  /** Mismos filtros que flourStats, para que las cards y la tabla describan el mismo conjunto. */
  stats: (f: MeasurementsFilters = {}) =>
    get<MeasurementStatsDto>("/measurements/stats", soloFiltros(f)),

  flourStats: (f: MeasurementsFilters = {}) =>
    get<FlourStatsDto[]>("/measurements/flour-stats", soloFiltros(f)),

  /**
   * Tendencia diaria. Acepta el juego COMPLETO de filtros, no solo equipo y
   * método: con una sola barra de filtros gobernando toda la vista, el gráfico
   * tiene que describir el mismo conjunto que los indicadores y la tabla.
   * `days` acota la ventana cuando no hay rango de fechas puesto.
   */
  trend: (f: MeasurementsFilters & { days?: number } = {}) =>
    get<TrendPointDto[]>("/measurements/trend", { ...soloFiltros(f), days: f.days }),

  trendMonthly: (
    p: {
      months?: number;
      serial?: string;
      method?: string;
      includeIncomplete?: boolean;
    } = {},
  ) => get<MonthlyTrendPointDto[]>("/measurements/trend/monthly", p),

  details: (sampleId: number) =>
    get<MeasurementDetailDto>(`/measurements/${sampleId}/details`),

  nir: {
    products: () => get<NirProductDto[]>("/nir/products"),
    measurements: (f: NirFilters = {}) =>
      get<PagedResult<NirMeasurementDto>>("/nir/measurements", { ...f }),
    stats: (f: NirFilters = {}) =>
      get<NirStatsDto>("/nir/stats", {
        product: f.product,
        from: f.from,
        to: f.to,
        sampleCodeContains: f.sampleCodeContains,
      }),
    trend: (f: NirFilters = {}) =>
      get<NirTrendPointDto[]>("/nir/trend", {
        product: f.product,
        from: f.from,
        to: f.to,
        sampleCodeContains: f.sampleCodeContains,
      }),
  },

  fn: {
    stats: (f: FnFilters = {}) =>
      get<FnStatsDto>("/fn/stats", {
        from: f.from,
        to: f.to,
        sampleCodeContains: f.sampleCodeContains,
      }),
    measurements: (f: FnFilters = {}) =>
      get<PagedResult<FnMeasurementDto>>("/fn/measurements", { ...f }),
    trend: (f: FnFilters = {}) =>
      get<FnTrendPointDto[]>("/fn/trend", {
        from: f.from,
        to: f.to,
        sampleCodeContains: f.sampleCodeContains,
      }),
  },
};

/** Claves de React Query. Centralizadas para poder invalidar por prefijo. */
export const labKeys = {
  all: ["lab"] as const,
  equipment: ["lab", "equipment"] as const,
  methods: ["lab", "methods"] as const,
  summary: ["lab", "summary"] as const,
  measurements: (f: MeasurementsFilters) => ["lab", "measurements", f] as const,
  stats: (f: MeasurementsFilters) => ["lab", "stats", soloFiltros(f)] as const,
  flour: (f: MeasurementsFilters) => ["lab", "flour", soloFiltros(f)] as const,
  trend: (p: unknown) => ["lab", "trend", p] as const,
  trendMonthly: (p: unknown) => ["lab", "trendMonthly", p] as const,
  details: (id: number) => ["lab", "details", id] as const,
  nirProducts: ["lab", "nir", "products"] as const,
  nirStats: (f: NirFilters) => ["lab", "nir", "stats", f] as const,
  nirTrend: (f: NirFilters) => ["lab", "nir", "trend", f] as const,
  nirMeasurements: (f: NirFilters) => ["lab", "nir", "measurements", f] as const,
  fnStats: (f: FnFilters) => ["lab", "fn", "stats", f] as const,
  fnTrend: (f: FnFilters) => ["lab", "fn", "trend", f] as const,
  fnMeasurements: (f: FnFilters) => ["lab", "fn", "measurements", f] as const,
};

/** Mensaje de error legible, con el mismo desanidado que usa el resto del repo. */
export const labError = (e: unknown): string => {
  const err = e as { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string };
  return (
    err?.response?.data?.error?.message ??
    err?.response?.data?.message ??
    err?.message ??
    "Error desconocido"
  );
};
