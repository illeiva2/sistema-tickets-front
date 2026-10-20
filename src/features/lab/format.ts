/**
 * Formateo del módulo de laboratorio. Portado del dashboard original sin
 * cambiar comportamiento: los decimales de cada magnitud son decisiones que el
 * laboratorio ya tiene internalizadas, y "limpiarlas" sería una regresión
 * silenciosa en números que la gente lee todos los días.
 */

/** Placeholder de dato ausente en todo el módulo. Es un em dash, no un guion. */
export const VACIO = "—";

/*
 * Formateadores armados una sola vez. `toLocaleString("es-AR", {...})` arma uno
 * nuevo en cada llamada y es 30 a 40 veces más caro: en una grilla de 500
 * muestras eran más de 3.000 llamadas por dibujo, medio segundo de página
 * congelada. El resultado es el mismo carácter por carácter.
 */
const FMT_FECHA_HORA = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const FMT_FECHA = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
const FMT_ENTERO = new Intl.NumberFormat("es-AR");
const FMT_DECIMALES = new Map<number, Intl.NumberFormat>();

const conDecimales = (decimals: number): Intl.NumberFormat => {
  let f = FMT_DECIMALES.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat("es-AR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    FMT_DECIMALES.set(decimals, f);
  }
  return f;
};

/** Con una fecha inválida `format` tira error; `toLocaleString` devolvía "Invalid Date", y se mantiene. */
const fechaCon = (f: Intl.DateTimeFormat, iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(d) : f.format(d);
};

export const fmtDateTime = (iso: string | null | undefined): string =>
  iso ? fechaCon(FMT_FECHA_HORA, iso) : VACIO;

/** Fecha corta con año de dos cifras: 24/08/26. */
export const fmtDate = (iso: string | null | undefined): string => (iso ? fechaCon(FMT_FECHA, iso) : VACIO);

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
  return conDecimales(decimals).format(n);
};

export const fmtInt = (n: number | null | undefined): string =>
  n === null || n === undefined ? VACIO : FMT_ENTERO.format(n);

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
 * ¿Vale la pena pedirle datos al servidor con esta fecha (YYYY-MM-DD)?
 *
 * Mientras se tipea, un campo de fecha pasa por vacío (día o mes a medio
 * escribir) y por años como 0002, 0020 y 0202 antes de llegar a 2026. Ninguno
 * es un filtro que alguien quiera aplicar: se acepta del 2000 al año que viene.
 */
export const fechaAplicable = (valor: string, hoy: Date = new Date()): boolean => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!m) return false;
  const anio = Number(m[1]);
  if (anio < 2000 || anio > hoy.getFullYear() + 1) return false;
  const d = new Date(anio, Number(m[2]) - 1, Number(m[3]));
  return d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]);
};

/**
 * Una medición sin gluten húmedo (null o 0) es incompleta: el ciclo se canceló
 * o falló. No es una medición con resultado cero.
 */
export const isIncomplete = (m: { wetGluten: number | null }): boolean =>
  !m.wetGluten || m.wetGluten === 0;
