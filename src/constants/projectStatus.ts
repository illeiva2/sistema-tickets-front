import type { ProjectStatus } from "../types/projects";

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  PLANNED: "Planificado",
  IN_PROGRESS: "En curso",
  ON_HOLD: "En pausa",
  BLOCKED: "Bloqueado",
  COMPLETED: "Terminado",
  CANCELLED: "Cancelado",
};

export const PROJECT_STATUS_GLYPH: Record<ProjectStatus, string> = {
  PLANNED: "📋",
  IN_PROGRESS: "🚧",
  ON_HOLD: "⏸️",
  BLOCKED: "⛔",
  COMPLETED: "✅",
  CANCELLED: "🚫",
};

export const PROJECT_STATUS_STYLE: Record<ProjectStatus, string> = {
  PLANNED:
    "text-slate-700 bg-slate-50 border-slate-200 dark:text-slate-300 dark:bg-slate-950/30 dark:border-slate-800/60",
  IN_PROGRESS:
    "text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-300 dark:bg-sky-950/30 dark:border-sky-800/60",
  ON_HOLD:
    "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-800/60",
  BLOCKED:
    "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/30 dark:border-rose-800/60",
  COMPLETED:
    "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800/60",
  CANCELLED:
    "text-muted-foreground bg-muted border-border",
};

// Color HSL para la barra de progreso (matchea el primary del theme).
export const PROJECT_PROGRESS_BAR_BG = "bg-primary";

export const ALL_PROJECT_STATUSES: ProjectStatus[] = [
  "PLANNED",
  "IN_PROGRESS",
  "ON_HOLD",
  "BLOCKED",
  "COMPLETED",
  "CANCELLED",
];
