/**
 * Exportación a CSV del módulo de laboratorio.
 *
 * Escrito a mano porque el repo no tiene ninguna utilidad de exportación ni
 * librería del rubro (ni papaparse, ni xlsx, ni file-saver). Son ~60 líneas;
 * agregar una dependencia para esto no se justifica.
 *
 * Dos decisiones que deciden si el archivo se abre bien o queda ilegible:
 *
 * 1. SEPARADOR `;` — Excel en configuración regional española/argentina espera
 *    punto y coma. Con coma, toda la fila aterriza en una sola celda y el
 *    usuario concluye que la exportación está rota.
 * 2. BOM UTF-8 — sin él, Excel lee el archivo como ANSI y "Índice de gluten"
 *    aparece como "Ãndice". Con acentos en casi todos los encabezados, esto no
 *    es cosmético.
 *
 * Los números van con coma decimal, igual que en pantalla: si se exportan con
 * punto, Excel los toma como texto y no se pueden promediar.
 */

export interface ColumnaCsv<T> {
  header: string;
  /** Valor crudo. Los números se formatean con coma decimal; el resto va como texto. */
  value: (row: T) => string | number | null | undefined;
  /** Decimales para valores numéricos. Por defecto 2. */
  decimals?: number;
}

const SEPARADOR = ";";

/**
 * Neutraliza inyección de fórmulas. Un valor que arranca con = + - @ lo
 * interpreta Excel como fórmula al abrir el archivo. Acá los códigos de muestra
 * los tipea una persona en el instrumento, así que es improbable, pero el
 * archivo se comparte por mail y la guarda cuesta una línea.
 */
const neutralizar = (s: string): string =>
  /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;

const celda = (v: string | number | null | undefined, decimals: number): string => {
  if (v === null || v === undefined) return "";

  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "";
    // Coma decimal, sin separador de miles: el punto de miles confundiría a
    // Excel sobre dónde termina el número.
    return v.toFixed(decimals).replace(".", ",");
  }

  const texto = neutralizar(String(v));
  // Se entrecomilla solo si hace falta, y las comillas internas se duplican.
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};

export function toCsv<T>(rows: T[], columnas: ColumnaCsv<T>[]): string {
  const cabecera = columnas.map((c) => celda(c.header, 0)).join(SEPARADOR);
  const cuerpo = rows.map((r) =>
    columnas.map((c) => celda(c.value(r), c.decimals ?? 2)).join(SEPARADOR),
  );
  return [cabecera, ...cuerpo].join("\r\n");
}

/** Nombre con fecha y hora local, para que dos exportaciones del mismo día no se pisen. */
export const nombreArchivo = (base: string): string => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${base}_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(
    d.getHours(),
  )}${p(d.getMinutes())}.csv`;
};

/** Dispara la descarga. Mismo patrón de blob que ya usa FileManagementPage. */
export function descargarCsv(contenido: string, nombre: string): void {
  // ﻿ es el BOM. Va primero en el Blob, no concatenado al string, para que
  // no se cuele en la primera celda si alguien parsea el CSV con otra cosa.
  const blob = new Blob(["﻿", contenido], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Sin esto el blob queda retenido en memoria hasta que se recarga la pestaña.
  URL.revokeObjectURL(url);
}

export function exportarCsv<T>(
  rows: T[],
  columnas: ColumnaCsv<T>[],
  base: string,
): void {
  descargarCsv(toCsv(rows, columnas), nombreArchivo(base));
}
