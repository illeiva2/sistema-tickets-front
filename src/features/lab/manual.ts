import { fmtNumber } from "./format";
import { MANUAL_PARAMS } from "./samples";
import type {
  ManualCapsulaDto,
  ManualCenizasDto,
  ManualMeasurementInput,
  SampleDetailDto,
  SampleMeasurementDto,
  SampleMeasurementParamDto,
} from "./types";

/**
 * Análisis manual con el esquema de la planilla del laboratorio (R.GCA Análisis
 * Fisico-quimicos): humedad en estufa y cenizas en mufla por cápsula, más los
 * valores sueltos (termobalanza, colorímetro, PMG).
 *
 * Las cuentas son las del backend (src/lib/labManual.ts), que es el que guarda
 * los resultados; acá se repiten solo para mostrarlos mientras se tipea:
 *   humedad (%) = (cápsula vacía + muestra − cápsula final) / muestra × 100
 *   cenizas (%, base seca) = (cápsula final − cápsula vacía) / muestra × 100 × 100 / (100 − humedad)
 * Las cenizas usan la humedad de la estufa; si no hubo estufa, la que se cargue en cenizas.
 */

export const HUMEDAD_ESTUFA = "Humedad estufa";
/** Código histórico del resultado de cenizas (ya había cargas con él antes de las cápsulas). */
export const CENIZAS = "Cenizas estufa";

const DEF = new Map(MANUAL_PARAMS.map((p) => [p.code, p]));

const DECIMAL = /^[+-]?(\d+([.,]\d*)?|[.,]\d+)$/;

/** Lo tipeado a número, con coma o punto decimal. Vacío → null; lo que no es un número → NaN. */
export const aNumero = (texto: string | undefined): number | null => {
  const t = (texto ?? "").replace(/\s+/g, "");
  if (t === "") return null;
  if (!DECIMAL.test(t)) return Number.NaN;
  return Number(t.replace(",", "."));
};

/** El texto guardado (con punto) como lo lee el laboratorio: con coma y sin tocar los decimales. */
export const conComa = (texto: string): string => texto.replace(".", ",");

const pesos = (c: ManualCapsulaDto | undefined) => {
  const vacia = aNumero(c?.vacia);
  const muestra = aNumero(c?.muestra);
  const final = aNumero(c?.final);
  if (vacia === null || muestra === null || final === null) return null;
  if (![vacia, muestra, final].every(Number.isFinite) || !(muestra > 0)) return null;
  return { vacia, muestra, final };
};

/** Humedad en estufa (%), o null mientras falte algún peso. */
export const humedadEstufa = (c: ManualCapsulaDto | undefined): number | null => {
  const p = pesos(c);
  return p ? ((p.vacia + p.muestra - p.final) / p.muestra) * 100 : null;
};

/** La humedad para pasar las cenizas a base seca: la de la estufa o, si no hubo, la cargada en cenizas. */
export const humedadParaCenizas = (
  humedad: ManualCapsulaDto | undefined,
  cenizas: ManualCenizasDto | undefined,
): number | null => {
  const estufa = humedadEstufa(humedad);
  if (estufa !== null) return estufa;
  const cargada = aNumero(cenizas?.humedad);
  return cargada !== null && Number.isFinite(cargada) ? cargada : null;
};

/** Cenizas en base seca (%), o null mientras falte algún peso o la humedad. */
export const cenizasBaseSeca = (c: ManualCenizasDto | undefined, humedad: number | null): number | null => {
  const p = pesos(c);
  if (!p || humedad === null || !(humedad < 100)) return null;
  return ((p.final - p.vacia) / p.muestra) * 100 * (100 / (100 - humedad));
};

// ─── Ficha ───────────────────────────────────────────────────────────────────

export const etiquetaManual = (code: string): string => DEF.get(code)?.label ?? code;

/**
 * Un valor de análisis manual como se cargó, nunca redondeado:
 * - lo tipeado, con sus decimales y los ceros del final ("14,30");
 * - lo calculado con las cápsulas, con los decimales de la planilla (humedad 2, cenizas 3);
 * - lo cargado antes de que se guardara lo tipeado, con todos los decimales del número.
 */
export const textoManual = (m: SampleMeasurementDto, p: SampleMeasurementParamDto): string => {
  const tipeado = m.manualInput?.values?.[p.code];
  if (tipeado !== undefined) return conComa(tipeado);
  const def = DEF.get(p.code);
  if (m.manualInput && def?.kind === "calculado") return fmtNumber(p.value, def.decimals);
  return conComa(String(p.value));
};

/** Una línea con lo cargado en una cápsula, para la ficha: "cápsula I · vacía 14,3716 g · …". */
export const detalleCapsula = (c: ManualCenizasDto, conHumedad = false): string => {
  const partes: string[] = [];
  if (c.capsula) partes.push(`cápsula ${c.capsula}`);
  if (c.vacia) partes.push(`vacía ${conComa(c.vacia)} g`);
  if (c.muestra) partes.push(`muestra ${conComa(c.muestra)} g`);
  partes.push(c.final ? `final ${conComa(c.final)} g` : "falta el peso final");
  if (conHumedad && c.humedad) partes.push(`humedad ${conComa(c.humedad)} %`);
  return partes.join(" · ");
};

/** El análisis manual de la muestra: el último, si quedaron varios de antes de que fuera uno solo. */
export const ultimoManual = (sample: SampleDetailDto): SampleMeasurementDto | null => {
  let ultimo: SampleMeasurementDto | null = null;
  for (const m of sample.measurements) {
    if (m.source !== "MANUAL") continue;
    if (!ultimo || new Date(m.analyzedAt).getTime() >= new Date(ultimo.analyzedAt).getTime()) ultimo = m;
  }
  return ultimo;
};

// ─── Formulario ──────────────────────────────────────────────────────────────

export interface CapsulaForm {
  capsula: string;
  vacia: string;
  muestra: string;
  final: string;
}

export interface CenizasForm extends CapsulaForm {
  humedad: string;
}

export interface ManualForm {
  /** Por código, como se tipea (con coma). */
  values: Record<string, string>;
  humedad: CapsulaForm;
  cenizas: CenizasForm;
}

const CAMPOS_CAPSULA = ["capsula", "vacia", "muestra", "final"] as const;

const capsulaDe = (c: ManualCapsulaDto | undefined): CapsulaForm => ({
  capsula: c?.capsula ?? "",
  vacia: c?.vacia ? conComa(c.vacia) : "",
  muestra: c?.muestra ? conComa(c.muestra) : "",
  final: c?.final ? conComa(c.final) : "",
});

/**
 * Lo que muestra el formulario al abrir: lo tipeado, si se guardó; en las cargas
 * anteriores al formulario por cápsulas solo hay números, y se muestran con
 * todos sus decimales.
 */
export const formularioInicial = (m: SampleMeasurementDto | null | undefined): ManualForm => {
  const t = m?.manualInput;
  const form: ManualForm = {
    values: {},
    humedad: capsulaDe(t?.humedad),
    cenizas: { ...capsulaDe(t?.cenizas), humedad: t?.cenizas?.humedad ? conComa(t.cenizas.humedad) : "" },
  };
  if (t) {
    for (const [code, v] of Object.entries(t.values ?? {})) form.values[code] = conComa(v);
  } else {
    for (const p of m?.params ?? []) form.values[p.code] = conComa(String(p.value));
  }
  return form;
};

const tieneDatos = (c: Partial<CenizasForm>) => Object.values(c).some((v) => (v ?? "").trim() !== "");

/** ¿Hay algo para guardar? Alcanza con haber empezado una cápsula. */
export const hayAlgo = (form: ManualForm, codigos: string[]): boolean =>
  codigos.some((c) => (form.values[c] ?? "").trim() !== "") || tieneDatos(form.humedad) || tieneDatos(form.cenizas);

const PESOS: [keyof CapsulaForm, number, number][] = [
  ["vacia", 0, 500],
  ["muestra", 0, 100],
  ["final", 0, 500],
];

/** Lo mismo que valida el backend, para marcarlo en el campo antes de enviar. Claves "values.<código>", "humedad.final"… */
export const erroresManual = (form: ManualForm, codigos: string[]): Record<string, string> => {
  const e: Record<string, string> = {};
  for (const code of codigos) {
    const n = aNumero(form.values[code]);
    if (n === null) continue;
    const def = DEF.get(code);
    if (Number.isNaN(n)) e[`values.${code}`] = "Tiene que ser un número";
    else if (def && (n < def.min || n > def.max)) e[`values.${code}`] = `Entre ${def.min} y ${def.max}`;
  }
  for (const bloque of ["humedad", "cenizas"] as const) {
    const c = form[bloque];
    if (c.capsula.trim().length > 12) e[`${bloque}.capsula`] = "Hasta 12 caracteres";
    for (const [campo, min, max] of PESOS) {
      const n = aNumero(c[campo]);
      if (n === null) continue;
      if (Number.isNaN(n)) e[`${bloque}.${campo}`] = "Tiene que ser un número";
      else if (!(n > min && n <= max)) e[`${bloque}.${campo}`] = `Entre ${min} y ${max} g`;
    }
  }
  const estufa = humedadEstufa(form.humedad);
  const cargada = aNumero(form.cenizas.humedad);
  if (estufa === null && cargada !== null && !(cargada >= 0 && cargada < 100)) {
    e["cenizas.humedad"] = Number.isNaN(cargada) ? "Tiene que ser un número" : "Entre 0 y 100 %";
  }
  if (estufa !== null && !(estufa >= 0 && estufa < 100)) {
    e["humedad.final"] = `La humedad da ${fmtNumber(estufa, 2)} %: revisá los pesos`;
  }
  const cenizas = cenizasBaseSeca(form.cenizas, humedadParaCenizas(form.humedad, form.cenizas));
  if (cenizas !== null && !(cenizas >= 0 && cenizas <= 100)) {
    e["cenizas.final"] = `Las cenizas dan ${fmtNumber(cenizas, 2)} %: revisá los pesos`;
  }
  return e;
};

const texto = (s: string): string | undefined => (s.trim() === "" ? undefined : s.trim());

const capsulaACuerpo = (c: CapsulaForm): ManualCapsulaDto | null => {
  const out: ManualCapsulaDto = {};
  for (const k of CAMPOS_CAPSULA) {
    const v = texto(c[k]);
    if (v !== undefined) out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
};

/**
 * El cuerpo a enviar: los textos como se tipearon (el backend los normaliza sin
 * tocar los decimales). La humedad de cenizas solo viaja si no hay estufa.
 */
export const cuerpoManual = (form: ManualForm, codigos: string[], analyzedAt: string): ManualMeasurementInput => {
  const values: Record<string, string | null> = {};
  for (const code of codigos) values[code] = texto(form.values[code] ?? "") ?? null;
  const cenizas: ManualCenizasDto | null = capsulaACuerpo(form.cenizas);
  const humedadCenizas = humedadEstufa(form.humedad) === null ? texto(form.cenizas.humedad) : undefined;
  return {
    analyzedAt,
    values,
    humedad: capsulaACuerpo(form.humedad),
    cenizas: humedadCenizas !== undefined ? { ...(cenizas ?? {}), humedad: humedadCenizas } : cenizas,
  };
};
