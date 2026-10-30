export type SurveyAction =
  | "create"
  | "assign"
  | "update"
  | "unchanged"
  | "conflict";

export type SurveyItemKind = "person" | "computer" | "phone" | "line";

/** Una corrección aplicada a lo que escribieron. */
export interface SurveyFix {
  field: "hostname" | "device" | "number";
  from: string;
  to: string;
  // auto: el autocorrector; manual: la corrigió IT.
  source: "auto" | "manual";
}

/**
 * Lo que se puede corregir a mano en un ítem: una corrección por clave, que vale
 * para todas las respuestas que dicen lo mismo (responses).
 */
export type SurveyEdit = { key: string; from: string; responses: number } & (
  | { scope: "hostname"; tag: string }
  | { scope: "phone" | "computer"; brand: string; model: string }
  | { scope: "number"; number: string }
);

export interface SurveyItem {
  kind: SurveyItemKind;
  key: string;
  title: string;
  detail: string | null;
  action: SurveyAction;
  holder: string | null;
  notes: string[];
  // Filas de la planilla (la 1 es la de los títulos).
  rows: number[];
  fixes?: SurveyFix[];
  edits?: SurveyEdit[];
  // Nombres para elegir: las computadoras que la persona ya tiene asignadas.
  suggestions?: string[];
  // El nombre sirve de etiqueta pero no sigue el estándar: se puede confirmar.
  confirmName?: boolean;
}

export interface SurveySector {
  // Clave de la corrección del sector.
  key: string;
  value: string;
  responses: number;
  departmentId: string | null;
  source: "auto" | "manual" | null;
}

export interface SurveyIssue {
  row: number;
  message: string;
}

export interface SurveyNote {
  row: number;
  name: string;
  otherEquipment: string | null;
  comments: string | null;
}

export interface SurveyPreview {
  planHash: string;
  responses: number;
  counts: Record<SurveyAction, number>;
  sectors: SurveySector[];
  departments: Array<{ id: string; name: string }>;
  items: SurveyItem[];
  issues: SurveyIssue[];
  notes: SurveyNote[];
  corrections: SurveyCorrection[];
}

/** Resumen de las correcciones de la vista previa. */
export interface SurveyCorrection {
  scope: "hostname" | "phone" | "computer" | "number";
  key: string;
  from: string;
  to: string;
  source: "auto" | "manual";
  // En cuántas respuestas se aplica.
  responses: number;
  // Autocorrector de nombres: el valor que lo deja como lo escribieron.
  undo?: { tag: string };
}

/** Lo que se guarda: null deshace la corrección. */
export type SurveyCorrectionInput =
  | { scope: "hostname"; key: string; value: { tag: string } | null }
  | {
      scope: "phone" | "computer";
      key: string;
      value: { brand: string; model: string } | null;
    }
  | { scope: "number"; key: string; value: { number: string } | null }
  | {
      scope: "sector";
      key: string;
      value: { departmentId: string | null } | null;
    };

export interface SurveyApplied {
  people: { created: number; updated: number };
  assets: { created: number; assigned: number; updated: number };
  lines: { created: number; assigned: number; updated: number };
}

export interface SurveyApplyResult {
  applied: SurveyApplied;
  preview: SurveyPreview;
}

export const SURVEY_ACTION_LABELS: Record<SurveyAction, string> = {
  create: "Se crea",
  assign: "Se asigna",
  update: "Se completa",
  unchanged: "Sin cambios",
  conflict: "Revisar",
};

// Después de importar: lo que se hizo.
export const SURVEY_APPLIED_LABELS: Record<SurveyAction, string> = {
  create: "Creado",
  assign: "Asignado",
  update: "Completado",
  unchanged: "Sin cambios",
  conflict: "Revisar",
};

export const SURVEY_KINDS: Array<{ kind: SurveyItemKind; label: string }> = [
  { kind: "person", label: "Personas" },
  { kind: "computer", label: "Computadoras" },
  { kind: "phone", label: "Celulares" },
  { kind: "line", label: "Líneas" },
];
