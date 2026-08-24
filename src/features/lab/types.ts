// Espejo de lo que devuelve /api/glutenlab/*. Se mantienen los nombres del
// contrato original del dashboard .NET a propósito: el backend nuevo devuelve
// exactamente las mismas formas, así que el port no re-mapea nada y cualquier
// diferencia salta como error de tipos en vez de como un dato en blanco.

export interface MeasurementDto {
  sampleId: number;
  sampleCode: string;
  analyzedAt: string;
  methodName: string;
  instrumentSerial: string;
  instrumentName: string | null;
  instrumentLocation: string | null;
  wetGluten: number | null;
  dryGluten: number | null;
  glutenIndex: number | null;
  waterBindingCapacity: number | null;
}

export interface EquipmentDto {
  serial: string;
  displayName: string;
  location: string | null;
  isActive: boolean;
  totalSamples: number;
}

export interface MethodDto {
  name: string;
  totalUses: number;
}

export interface DashboardSummaryDto {
  samplesToday: number;
  samplesThisWeek: number;
  samplesThisMonth: number;
  avgWetGlutenLast7Days: number | null;
  avgGlutenIndexLast7Days: number | null;
  instrumentCount: number;
  lastMeasurementAt: string | null;
}

/** Agregados sobre el conjunto filtrado COMPLETO, no sobre la página cargada. */
export interface MeasurementStatsDto {
  count: number;
  incompleteCount: number;
  avgWetGluten: number | null;
  avgDryGluten: number | null;
  avgGlutenIndex: number | null;
  avgWaterBindingCapacity: number | null;
  minWetGluten: number | null;
  maxWetGluten: number | null;
  minGlutenIndex: number | null;
  maxGlutenIndex: number | null;
  firstMeasurementAt: string | null;
  lastMeasurementAt: string | null;
}

export interface FlourStatsDto {
  flour: string;
  count: number;
  avgWetGluten: number | null;
  avgDryGluten: number | null;
  avgGlutenIndex: number | null;
  avgWBC: number | null;
}

export interface TrendPointDto {
  date: string;
  avgWetGluten: number | null;
  avgDryGluten: number | null;
  avgGlutenIndex: number | null;
  avgWBC: number | null;
  count: number;
}

export interface MonthlyTrendPointDto {
  year: number;
  month: number;
  avgWetGluten: number | null;
  avgDryGluten: number | null;
  avgGlutenIndex: number | null;
  avgWBC: number | null;
  count: number;
}

export interface MeasurementDetailDto {
  measurement: MeasurementDto;
  sameSampleHistory: MeasurementDto[];
  /** Siempre null: los datos de calibración viven en el SQL del molino y no se espejan. */
  calibration: null;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MeasurementsFilters {
  from?: string;
  to?: string;
  instrumentSerial?: string;
  method?: string;
  sampleCodeContains?: string;
  includeIncomplete?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDesc?: boolean;
}

// ─── NIR Inframatic IM 9500H ─────────────────────────────────────────────────

export interface NirProductDto {
  productName: string;
  totalSamples: number;
  firstAt: string | null;
  lastAt: string | null;
}

export interface NirParameterValueDto {
  parameterName: string;
  moistureBasis: string | null;
  value: number | null;
}

export interface NirMeasurementDto {
  nirMeasurementId: number;
  instrumentSerial: string;
  analyzedAt: string;
  productName: string;
  sampleCode: string | null;
  /**
   * Siempre false. El espejo no replica IsLabSample: en el instrumento ese
   * check no se usa de forma confiable, así que el agente no lo manda. El
   * filtro correspondiente no existe en esta versión del panel.
   */
  isLabSample: boolean;
  parameters: NirParameterValueDto[];
}

export interface NirParameterStatsDto {
  parameterName: string;
  moistureBasis: string | null;
  count: number;
  /** Valores no positivos, excluidos del promedio: predicciones fuera del rango de calibración. */
  excluded: number;
  avg: number | null;
  min: number | null;
  max: number | null;
}

export interface NirStatsDto {
  count: number;
  firstAt: string | null;
  lastAt: string | null;
  parameters: NirParameterStatsDto[];
}

export interface NirTrendPointDto {
  date: string;
  count: number;
  averages: Record<string, number | null>;
}

export interface NirFilters {
  product?: string;
  from?: string;
  to?: string;
  sampleCodeContains?: string;
  page?: number;
  pageSize?: number;
}
