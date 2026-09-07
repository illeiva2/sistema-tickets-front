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

// ─── FN 1000 (Falling Number) ────────────────────────────────────────────────

export interface FnStatsDto {
  count: number;
  withFallingNumber: number;
  avgFallingNumber: number | null;
  minFallingNumber: number | null;
  maxFallingNumber: number | null;
  firstAt: string | null;
  lastAt: string | null;
}

export interface FnMeasurementDto {
  measurementId: string;
  sampleCode: string | null;
  analyzedAt: string;
  /** Canal en que se corrió la muestra: "Izq" / "Der". El equipo corre dos en paralelo. */
  channel: string;
  fallingNumber: number | null;
  liquefactionNumber: number | null;
  temp: number | null;
  pressure: number | null;
}

export interface FnTrendPointDto {
  date: string;
  avgFallingNumber: number | null;
  count: number;
}

export interface FnFilters {
  from?: string;
  to?: string;
  sampleCodeContains?: string;
  page?: number;
  pageSize?: number;
}

// ─── SDmatic 2 (almidón dañado) ──────────────────────────────────────────────

export interface SdmaticStatsDto {
  count: number;
  withUcd: number;
  avgUcd: number | null;
  minUcd: number | null;
  maxUcd: number | null;
  firstAt: string | null;
  lastAt: string | null;
}

export interface SdmaticMeasurementDto {
  measurementId: string;
  sampleCode: string | null;
  analyzedAt: string;
  /** Almidón dañado, unidad UCD (la métrica principal). */
  ucd: number | null;
  /** UCD corregido por proteína; null si no se cargó proteína. */
  ucdc: number | null;
  iodineAbsorption: number | null;
  humidity: number | null;
  protein: number | null;
}

export interface SdmaticTrendPointDto {
  date: string;
  avgUcd: number | null;
  count: number;
}

export interface SdmaticFilters {
  from?: string;
  to?: string;
  sampleCodeContains?: string;
  page?: number;
  pageSize?: number;
}

// ─── Registro de muestras ────────────────────────────────────────────────────
// La muestra se registra una vez y recibe una accesión corta (M-0012-4) que el
// operario tipea en cada instrumento. El esquema de la ficha es configurable:
// los campos vienen del backend (SampleKindDto.fields), no están hardcodeados.

export type LabSite = "MOLINO" | "ACOPIO";
export type LabFieldType = "TEXT" | "NUMBER" | "SELECT" | "DATETIME";

export interface SampleFieldDefDto {
  id: string;
  kindId: string;
  /** Clave estable del valor dentro de `SampleDto.fields`. */
  key: string;
  label: string;
  type: LabFieldType;
  required: boolean;
  /** Opciones de un SELECT. Viene como JSON; puede ser null en los demás tipos. */
  options: string[] | null;
  /** Participa del nombre descriptivo auto-generado. */
  inName: boolean;
  namePrefix: string | null;
  placeholder: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface SampleKindDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  /** Laboratorio propuesto al elegir este tipo; el operario puede cambiarlo. */
  defaultSite: LabSite | null;
  sortOrder: number;
  isActive: boolean;
  fields: SampleFieldDefDto[];
}

export type SampleFieldValues = Record<string, string | number>;

export interface SampleDto {
  id: string;
  accession: string;
  site: LabSite;
  seq: number;
  kindId: string;
  /** Momento de la TOMA (no del registro). */
  sampledAt: string;
  displayName: string;
  fields: SampleFieldValues;
  notes: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  kind: { id: string; code: string; name: string };
  createdBy: { id: string; name: string };
}

export interface SamplesSummaryDto {
  total: number;
  today: number;
  last7d: number;
  bySite: Partial<Record<LabSite, number>>;
}

export interface SampleFilters {
  site?: LabSite;
  kindId?: string;
  /** Accesión (tolera tipeo) o texto libre contra el nombre. */
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface SamplesPage extends PagedResult<SampleDto> {
  /** Aviso no bloqueante, p. ej. "ese número no es una accesión válida". */
  warning?: string;
}

export interface CreateSampleInput {
  kindId: string;
  site: LabSite;
  sampledAt?: string;
  fields: Record<string, unknown>;
  notes?: string | null;
}

export interface UpdateSampleInput {
  sampledAt?: string;
  fields?: Record<string, unknown>;
  notes?: string | null;
}

// ─── AlveoLab (alveógrafo Chopin) ────────────────────────────────────────────

export interface AlveolabStatsDto {
  count: number;
  withW: number;
  /** Fuerza panadera (10⁻⁴ J), la métrica principal. */
  avgW: number | null;
  minW: number | null;
  maxW: number | null;
  /** Tenacidad P (mmH₂O). */
  avgP: number | null;
  /** Extensibilidad L (mm). */
  avgL: number | null;
  /** Configuración de la curva P/L (cociente). */
  avgPL: number | null;
  /** Índice de elasticidad Ie (%). */
  avgIe: number | null;
  firstAt: string | null;
  lastAt: string | null;
}

export interface AlveolabMeasurementDto {
  measurementId: string;
  sampleCode: string | null;
  analyzedAt: string;
  /** Tipo de harina, tal como lo clasifica el AlveoLab (ProductType). */
  flourType: string | null;
  w: number | null;
  p: number | null;
  l: number | null;
  pl: number | null;
  ie: number | null;
  g: number | null;
}

export interface AlveolabTrendPointDto {
  date: string;
  avgW: number | null;
  count: number;
}

export interface AlveolabFilters {
  from?: string;
  to?: string;
  sampleCodeContains?: string;
  page?: number;
  pageSize?: number;
}
