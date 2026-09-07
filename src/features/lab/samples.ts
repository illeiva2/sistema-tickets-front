import type { LabSite, SampleFieldDefDto } from "./types";

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
