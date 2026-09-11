import type { SavedViewConfig } from "@/lib/uiPreferences";
import { fmtDateTime, fmtNumber } from "./format";
import { SITE_LABEL, SOURCE_LABEL, SOURCE_ORDER, SOURCE_SHORT } from "./samples";
import type { AnalysisColumnDto, GridSampleDto, LabFieldType, SampleKindDto } from "./types";

/**
 * Modelo de columnas de la grilla de análisis.
 *
 * Tres familias, todas elegibles por el usuario: las fijas de la muestra, los
 * campos de la ficha (que salen del catálogo configurable: un campo nuevo en
 * "Campos" aparece acá solo) y los análisis (un parámetro de un equipo, que
 * salen del catálogo que manda el backend). El id de columna es lo que se
 * guarda en el perfil: `accession`, `f:<key>`, `a:<source|code>`.
 */

export const VIEW_KEY = "lab.analysis-grid";

export type GrupoColumna = "fijo" | "ficha" | "analisis";
export type TipoColumna = "texto" | "numero" | "fecha";

export interface ColumnaGrid {
  id: string;
  label: string;
  grupo: GrupoColumna;
  /** Encabezado del grupo en el selector: "Fijas", "Ficha · Recepción de grano", "NIR". */
  grupoLabel: string;
  tipo: TipoColumna;
  unit?: string;
  decimals?: number;
  /** Valor crudo, para ordenar y exportar. `undefined` = sin dato (ordena al final). */
  valor: (r: GridSampleDto) => string | number | undefined;
  /** Valor formateado, para mostrar. */
  texto: (r: GridSampleDto) => string;
  /** Siempre visible y primera: es la identidad de la fila. */
  fija?: boolean;
}

const fijo = (
  id: string,
  label: string,
  tipo: TipoColumna,
  valor: ColumnaGrid["valor"],
  texto?: ColumnaGrid["texto"],
  fija = false,
): ColumnaGrid => ({
  id,
  label,
  grupo: "fijo",
  grupoLabel: "Muestra",
  tipo,
  valor,
  texto: texto ?? ((r) => String(valor(r) ?? "")),
  fija,
});

export const COLUMNAS_FIJAS: ColumnaGrid[] = [
  fijo("accession", "Accesión", "texto", (r) => r.accession, undefined, true),
  fijo("sampledAt", "Fecha de toma", "fecha", (r) => r.sampledAt, (r) => fmtDateTime(r.sampledAt)),
  fijo("site", "Laboratorio", "texto", (r) => SITE_LABEL[r.site]),
  fijo("kind", "Tipo de muestra", "texto", (r) => r.kind.name),
  fijo("displayName", "Nombre", "texto", (r) => r.displayName),
  fijo("conditions", "Alteraciones", "texto", (r) => (r.conditions ?? []).join(" · ") || undefined),
  fijo(
    "analyses",
    "Equipos",
    "texto",
    (r) =>
      SOURCE_ORDER.filter((s) => (r.analyses?.[s] ?? 0) > 0)
        .map((s) => SOURCE_SHORT[s])
        .join(" ") || undefined,
  ),
  fijo("createdBy", "Registró", "texto", (r) => r.createdBy.name),
  fijo("notes", "Notas", "texto", (r) => r.notes ?? undefined),
];

const valorCampo = (r: GridSampleDto, key: string, tipo: LabFieldType): string | number | undefined => {
  const v = r.fields?.[key];
  if (v === undefined || v === null || v === "" || v === false) return undefined;
  if (v === true) return "Sí";
  if (tipo === "NUMBER") {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : String(v);
  }
  return String(v);
};

export const construirColumnas = (
  kinds: SampleKindDto[],
  analysis: AnalysisColumnDto[],
): ColumnaGrid[] => {
  // Un campo por key: si "lote" existe en dos tipos de muestra, es UNA columna.
  const porKey = new Map<string, { label: string; tipo: LabFieldType; tipos: string[] }>();
  for (const k of kinds) {
    for (const f of k.fields) {
      if (!f.isActive) continue;
      const e = porKey.get(f.key);
      if (e) e.tipos.push(k.name);
      else porKey.set(f.key, { label: f.label, tipo: f.type, tipos: [k.name] });
    }
  }
  const ficha: ColumnaGrid[] = [...porKey].map(([key, d]) => ({
    id: `f:${key}`,
    label: d.label,
    grupo: "ficha",
    grupoLabel: d.tipos.length === 1 ? `Ficha · ${d.tipos[0]}` : "Ficha",
    tipo: d.tipo === "NUMBER" ? "numero" : d.tipo === "DATETIME" ? "fecha" : "texto",
    valor: (r) => valorCampo(r, key, d.tipo),
    texto: (r) => {
      const v = valorCampo(r, key, d.tipo);
      if (v === undefined) return "";
      return d.tipo === "DATETIME" ? fmtDateTime(String(v)) : String(v);
    },
  }));

  const analisis: ColumnaGrid[] = analysis.map((c) => ({
    id: `a:${c.key}`,
    label: c.label,
    grupo: "analisis",
    grupoLabel: SOURCE_LABEL[c.source] ?? c.source,
    tipo: "numero",
    unit: c.unit,
    decimals: c.decimals,
    valor: (r) => r.values?.[c.key],
    texto: (r) => fmtNumber(r.values?.[c.key], c.decimals),
  }));

  return [...COLUMNAS_FIJAS, ...ficha, ...analisis];
};

/**
 * Lo que ve quien nunca personalizó: pensado para comercio de granos, con la
 * recepción (empresa, camión, CTG) y los análisis que definen el precio.
 */
export const VISTA_SUGERIDA: SavedViewConfig = {
  columns: [
    "accession",
    "sampledAt",
    "f:empresa",
    "f:procedencia",
    "f:patente",
    "f:acoplado",
    "f:ctg",
    "a:NIR|Proteína DryBasis",
    "a:NIR|Humedad AsIs",
    "a:GLUTOMATIC|Gluten húmedo",
    "a:NIR|Peso específico",
    "a:FN|Falling Number",
    "a:ALVEOLAB|W",
    "conditions",
  ],
  sort: [{ id: "sampledAt", desc: true }],
};

/**
 * Descarta ids que ya no existen (un campo que se desactivó) y garantiza la
 * accesión primera. Se aplica tanto a la vista guardada como a la sugerida:
 * la sugerida nombra campos de la ficha que alguien puede haber renombrado.
 */
export const sanearVista = (cfg: SavedViewConfig, disponibles: ColumnaGrid[]): SavedViewConfig => {
  const ids = new Set(disponibles.map((c) => c.id));
  const columns = ["accession", ...cfg.columns.filter((id) => id !== "accession" && ids.has(id))];
  const sort = (cfg.sort ?? []).filter((s) => columns.includes(s.id)).slice(0, 3);
  return { ...cfg, columns, sort };
};

/** Clave del análisis detrás de un id de columna ("a:NIR|Proteína DryBasis" → "NIR|Proteína DryBasis"). */
export const claveAnalisis = (id: string): string | null => (id.startsWith("a:") ? id.slice(2) : null);
