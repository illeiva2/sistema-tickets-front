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
  SdmaticStatsDto,
  SdmaticMeasurementDto,
  SdmaticTrendPointDto,
  SdmaticFilters,
  AlveolabStatsDto,
  AlveolabMeasurementDto,
  AlveolabTrendPointDto,
  AlveolabFilters,
  SampleKindDto,
  SampleDto,
  SampleDetailDto,
  SamplesSummaryDto,
  SampleFilters,
  SamplesPage,
  CreateSampleInput,
  UpdateSampleInput,
  RelinkResultDto,
  SampleFieldDefDto,
  FieldDefInput,
  FieldDefUpdateInput,
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

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await api.post<{ success: boolean; data: T }>(`${BASE}${path}`, body);
  return res.data.data;
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await api.patch<{ success: boolean; data: T }>(`${BASE}${path}`, body);
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

  sdmatic: {
    stats: (f: SdmaticFilters = {}) =>
      get<SdmaticStatsDto>("/sdmatic/stats", {
        from: f.from,
        to: f.to,
        sampleCodeContains: f.sampleCodeContains,
      }),
    measurements: (f: SdmaticFilters = {}) =>
      get<PagedResult<SdmaticMeasurementDto>>("/sdmatic/measurements", { ...f }),
    trend: (f: SdmaticFilters = {}) =>
      get<SdmaticTrendPointDto[]>("/sdmatic/trend", {
        from: f.from,
        to: f.to,
        sampleCodeContains: f.sampleCodeContains,
      }),
  },

  alveolab: {
    stats: (f: AlveolabFilters = {}) =>
      get<AlveolabStatsDto>("/alveolab/stats", {
        from: f.from,
        to: f.to,
        sampleCodeContains: f.sampleCodeContains,
      }),
    measurements: (f: AlveolabFilters = {}) =>
      get<PagedResult<AlveolabMeasurementDto>>("/alveolab/measurements", { ...f }),
    trend: (f: AlveolabFilters = {}) =>
      get<AlveolabTrendPointDto[]>("/alveolab/trend", {
        from: f.from,
        to: f.to,
        sampleCodeContains: f.sampleCodeContains,
      }),
  },

  /** Registro de muestras: el catálogo de campos viene del backend, no se hardcodea. */
  samples: {
    kinds: (includeInactive = false) =>
      get<SampleKindDto[]>("/samples/kinds", includeInactive ? { includeInactive: true } : undefined),
    summary: () => get<SamplesSummaryDto>("/samples/summary"),
    list: (f: SampleFilters = {}) => get<SamplesPage>("/samples", { ...f }),
    /** La ficha: la muestra más sus análisis enlazados, crudos. */
    get: (accession: string) => get<SampleDetailDto>(`/samples/${encodeURIComponent(accession)}`),
    create: (input: CreateSampleInput) => post<SampleDto>("/samples", input),
    update: (id: string, input: UpdateSampleInput) =>
      patch<SampleDto>(`/samples/${encodeURIComponent(id)}`, input),
    /** Re-enlaza mediciones sueltas cuya accesión ahora existe (MANAGEMENT). */
    relink: (days = 30) => post<RelinkResultDto>(`/samples/relink?days=${days}`, {}),
    createField: (kindId: string, input: FieldDefInput) =>
      post<SampleFieldDefDto>(`/samples/kinds/${encodeURIComponent(kindId)}/fields`, input),
    updateField: (id: string, input: FieldDefUpdateInput) =>
      patch<SampleFieldDefDto>(`/samples/fields/${encodeURIComponent(id)}`, input),
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
  sdmaticStats: (f: SdmaticFilters) => ["lab", "sdmatic", "stats", f] as const,
  sdmaticTrend: (f: SdmaticFilters) => ["lab", "sdmatic", "trend", f] as const,
  sdmaticMeasurements: (f: SdmaticFilters) => ["lab", "sdmatic", "measurements", f] as const,
  alveolabStats: (f: AlveolabFilters) => ["lab", "alveolab", "stats", f] as const,
  alveolabTrend: (f: AlveolabFilters) => ["lab", "alveolab", "trend", f] as const,
  alveolabMeasurements: (f: AlveolabFilters) => ["lab", "alveolab", "measurements", f] as const,
  /** Prefijo para invalidar todo lo de muestras tras registrar o editar. */
  samplesAll: ["lab", "samples"] as const,
  samplesKinds: ["lab", "samples", "kinds"] as const,
  /** Catálogo completo, con campos desactivados: solo para administrarlo. */
  samplesKindsAll: ["lab", "samples", "kinds", "all"] as const,
  samplesSummary: ["lab", "samples", "summary"] as const,
  samples: (f: SampleFilters) => ["lab", "samples", "list", f] as const,
  sample: (accession: string) => ["lab", "samples", "one", accession] as const,
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
