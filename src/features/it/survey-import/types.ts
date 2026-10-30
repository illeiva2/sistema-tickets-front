export type SurveyAction =
  | "create"
  | "assign"
  | "update"
  | "unchanged"
  | "conflict";

export type SurveyItemKind = "person" | "computer" | "phone" | "line";

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
}

export interface SurveySector {
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
}

export interface SurveyApplied {
  people: { created: number; updated: number };
  assets: { created: number; assigned: number; updated: number };
  lines: { created: number; assigned: number; updated: number };
}

export interface SurveyApplyResult {
  applied: SurveyApplied;
  preview: SurveyPreview;
}

// Sector del formulario → sector del sistema (null: sin sector).
export type SurveySectorMap = Record<string, string | null>;

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
