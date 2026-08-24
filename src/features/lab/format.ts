/**
 * Formateo del módulo de laboratorio. Portado del dashboard original sin
 * cambiar comportamiento: los decimales de cada magnitud son decisiones que el
 * laboratorio ya tiene internalizadas, y "limpiarlas" sería una regresión
 * silenciosa en números que la gente lee todos los días.
 */

/** Placeholder de dato ausente en todo el módulo. Es un em dash, no un guion. */
export const VACIO = "—";

export const fmtDateTime = (iso: string | null | undefined): string => {
  if (!iso) return VACIO;
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** Fecha corta con año de dos cifras: 24/08/26. */
export const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return VACIO;
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
};

/**
 * Siempre exactamente N decimales, nunca variable. Coma decimal y punto de
 * miles (es-AR). Un 0 se formatea como "0,00" y NO como vacío: distinguir "midió
 * cero" de "no hay dato" es justamente lo que importa acá.
 */
export const fmtNumber = (
  n: number | null | undefined,
  decimals = 2,
): string => {
  if (n === null || n === undefined) return VACIO;
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const fmtInt = (n: number | null | undefined): string =>
  n === null || n === undefined ? VACIO : n.toLocaleString("es-AR");

/** Tiempo relativo abreviado: "recién", "hace 12 min", "hace 3 d". */
export const fmtRelative = (iso: string | null | undefined): string => {
  if (!iso) return VACIO;
  const seg = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seg < 5) return "recién";
  if (seg < 60) return `hace ${seg} s`;
  const min = Math.floor(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
};

/**
 * YYYY-MM-DD con los componentes LOCALES.
 *
 * No usar toISOString(): a la tarde en Argentina devuelve el día siguiente, y
 * el filtro terminaría pidiendo un rango corrido un día.
 */
export const toDateInput = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

/**
 * Una medición sin gluten húmedo (null o 0) es incompleta: el ciclo se canceló
 * o falló. No es una medición con resultado cero.
 */
export const isIncomplete = (m: { wetGluten: number | null }): boolean =>
  !m.wetGluten || m.wetGluten === 0;
