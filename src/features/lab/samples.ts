import type { LabSite, LabSource, SampleFieldDefDto, SampleMeasurementParamDto } from "./types";

/**
 * Helpers del registro de muestras compartidos por la página y los modales.
 * Nada de esto decide reglas de negocio (eso vive en el backend): son
 * etiquetas, conversiones de fecha para los inputs y lectura de errores.
 */

export const SITE_LABEL: Record<LabSite, string> = { MOLINO: "Molino", ACOPIO: "Acopio" };
export const SITES: LabSite[] = ["MOLINO", "ACOPIO"];

/**
 * "YYYY-MM-DDTHH:mm" con componentes LOCALES, para `<input type="datetime-local">`.
 * No usar toISOString(): a la tarde en Argentina devuelve el día siguiente.
 */
export const toDateTimeLocal = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(
    d.getMinutes(),
  )}`;
};

/** Valor de un datetime-local (hora local del navegador) a ISO con zona, para el backend. */
export const localToIso = (local: string): string | null => {
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/**
 * Turno del molino según la hora de la toma: 0 noche (22–06), 1 mañana
 * (07–14), 2 tarde (15–21). Solo propone un valor por defecto; el operario
 * puede cambiarlo. Los huecos entre turnos se asignan al que arranca.
 */
export const indiceTurno = (hora: number): number =>
  hora >= 22 || hora < 7 ? 0 : hora < 15 ? 1 : 2;

/** `options` viene como JSON desde la base; acá se acota a strings. */
export const opcionesDe = (def: Pick<SampleFieldDefDto, "options">): string[] =>
  Array.isArray(def.options)
    ? def.options.filter((o): o is string => typeof o === "string")
    : [];

/** Clave bajo la que viaja el porcentaje de una casilla con porcentaje (misma convención que el backend). */
export const pctKey = (key: string): string => `${key}_pct`;

/**
 * ¿Se pide este campo con lo cargado hasta ahora? Espejo de la regla del
 * backend: sigue la cadena (Silo depende de Origen, que depende de Producto) y
 * compara el valor del controlador —en el formulario, strings; una casilla
 * marcada vale "true"— contra las opciones de la regla.
 */
export const esVisible = (
  def: SampleFieldDefDto,
  values: Record<string, string>,
  defs: SampleFieldDefDto[],
  profundidad = 0,
): boolean => {
  const regla = def.visibleWhen;
  if (!regla || !regla.field || regla.values.length === 0) return true;
  if (profundidad > 8) return false;
  const controlador = defs.find((d) => d.key === regla.field);
  if (controlador && !esVisible(controlador, values, defs, profundidad + 1)) return false;
  return regla.values.includes((values[regla.field] ?? "").trim());
};

/** Formato de un valor TEXT contra el patrón del catálogo; null = cumple (o no hay patrón válido). */
export const errorDeFormato = (def: SampleFieldDefDto, valor: string): string | null => {
  if (!def.pattern || !valor) return null;
  try {
    return new RegExp(def.pattern, "u").test(valor) ? null : (def.patternHint ?? "Formato inválido");
  } catch {
    return null;
  }
};

/**
 * Errores por campo de una respuesta 400 del backend: `details` trae
 * `{ field: "fields.turno" | "body.site", message }`. Se devuelven indexados
 * por la key pelada para poder pintarlos debajo de cada input.
 */
export const erroresDeCampos = (e: unknown): Record<string, string> => {
  const err = e as { response?: { data?: { error?: { details?: unknown } } } };
  const details = err?.response?.data?.error?.details;
  const out: Record<string, string> = {};
  if (!Array.isArray(details)) return out;
  for (const d of details as { field?: unknown; message?: unknown }[]) {
    if (typeof d?.field !== "string" || typeof d?.message !== "string") continue;
    out[d.field.replace(/^(fields|body|params)\./, "")] = d.message;
  }
  return out;
};

export const copiarAlPortapapeles = async (texto: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
};

// ─── Análisis enlazados ──────────────────────────────────────────────────────

export const SOURCE_LABEL: Record<LabSource, string> = {
  GLUTOMATIC: "Gluten",
  NIR: "NIR",
  FN: "Falling Number",
  SDMATIC: "Almidón dañado",
  ALVEOLAB: "Alveógrafo",
  MANUAL: "Manual",
};

/** Abreviatura para los chips de la lista. */
export const SOURCE_SHORT: Record<LabSource, string> = {
  GLUTOMATIC: "GL",
  NIR: "NIR",
  FN: "FN",
  SDMATIC: "AD",
  ALVEOLAB: "ALV",
  MANUAL: "MAN",
};

/** Orden del flujo del laboratorio: el NIR es el primer análisis, el más general; lo manual al final. */
export const SOURCE_ORDER: LabSource[] = ["NIR", "GLUTOMATIC", "FN", "SDMATIC", "ALVEOLAB", "MANUAL"];

/**
 * Análisis con equipos sin conexión (termobalanza, estufa, colorímetro, balanza)
 * que se cargan a mano desde la ficha. Espejo del catálogo del backend: los
 * códigos son fijos, son las columnas del reporte diario en papel.
 */
export interface ManualParamDef {
  code: string;
  label: string;
  unit?: string;
  decimals: number;
  min: number;
  max: number;
  hint?: string;
}

export const MANUAL_PARAMS: ManualParamDef[] = [
  { code: "Humedad termobalanza", label: "Humedad (termobalanza)", unit: "%", decimals: 1, min: 0, max: 100 },
  { code: "Cenizas cápsula", label: "Cenizas: cápsula", decimals: 2, min: 0, max: 1000, hint: "Como en la planilla" },
  { code: "Cenizas estufa", label: "Cenizas (estufa)", unit: "%", decimals: 2, min: 0, max: 100 },
  { code: "Cenizas cápsula ensayo", label: "Cenizas: cápsula ensayo", decimals: 2, min: 0, max: 1000, hint: "Como en la planilla" },
  { code: "Color L", label: "Color L", decimals: 1, min: 0, max: 100 },
  { code: "Color a", label: "Color a", decimals: 1, min: -100, max: 100 },
  { code: "Color b", label: "Color b", decimals: 1, min: -100, max: 100 },
  { code: "Peso de mil granos", label: "Peso de mil granos", unit: "g", decimals: 1, min: 0, max: 100, hint: "Solo trigo" },
];

/** Orden en que el laboratorio lee cada parámetro; lo que no figura va después, alfabético. */
const PARAM_ORDER: Partial<Record<LabSource, string[]>> = {
  GLUTOMATIC: ["Gluten húmedo", "Gluten seco", "Índice de gluten", "Capacidad de retención de agua"],
  FN: ["Falling Number", "Índice de licuefacción", "Temperatura", "Presión"],
  SDMATIC: [
    "Almidón dañado (UCD)",
    "Almidón dañado corregido (UCDc)",
    "Absorción de yodo",
    "Humedad",
    "Proteína",
  ],
  ALVEOLAB: ["W", "P", "L", "P/L", "Ie", "G"],
  MANUAL: MANUAL_PARAMS.map((p) => p.code),
};

export const ordenarParams = (
  source: LabSource,
  params: SampleMeasurementParamDto[],
): SampleMeasurementParamDto[] => {
  const orden = PARAM_ORDER[source] ?? [];
  const rango = (code: string) => {
    const i = orden.indexOf(code);
    return i === -1 ? orden.length : i;
  };
  return [...params].sort((a, b) => rango(a.code) - rango(b.code) || a.code.localeCompare(b.code));
};

/** Los códigos del NIR llevan la base de humedad como sufijo; se traduce. */
export const etiquetaParam = (code: string): string => {
  const sufijos: [string, string][] = [
    ["DryBasis", " (base seca)"],
    ["AsIs", " (tal cual)"],
    ["Fixed", " (base fija)"],
  ];
  for (const [sufijo, texto] of sufijos) {
    if (code.endsWith(sufijo)) return code.slice(0, -sufijo.length).trim() + texto;
  }
  return code;
};

/** Decimales con los que el laboratorio lee cada magnitud (mismos que las pestañas por equipo). */
export const decimalesParam = (code: string): number => {
  if (["W", "P", "L", "Falling Number", "Índice de gluten", "Temperatura"].includes(code)) return 0;
  if (code === "P/L") return 2;
  const manual = MANUAL_PARAMS.find((p) => p.code === code);
  if (manual) return manual.decimals;
  if (["Ie", "G", "Almidón dañado (UCD)", "Almidón dañado corregido (UCDc)"].includes(code)) return 1;
  return 2;
};

/**
 * Clave de campo a partir de la etiqueta: minúsculas, sin acentos, snake_case,
 * empieza con letra. Es una propuesta; quien administra puede corregirla antes
 * de guardar, y después queda fija.
 */
export const claveDesdeEtiqueta = (label: string): string => {
  let k = label
    .normalize("NFD")
    // Quita los diacríticos que NFD separó: "Número" → "Numero".
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  if (!/^[a-z]/.test(k)) k = `c_${k}`.slice(0, 40);
  return k;
};
