// Helpers de SLA en el front. El back es el que setea dueAt; acá solo
// derivamos texto y "tono" (color) para los badges.

export type SlaTone = "danger" | "warning" | "ok" | "neutral";

export interface SlaInfo {
  text: string;
  tone: SlaTone;
  /** ISO con la fecha de vencimiento, para tooltip si la UI quiere mostrarla */
  dueAt: string | null;
  /** True si el ticket está vencido (dueAt en el pasado y status activo). */
  overdue: boolean;
}

const formatDuration = (ms: number): string => {
  const abs = Math.abs(ms);
  const minutes = Math.floor(abs / 60000);
  if (minutes < 1) return "menos de 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remMin = minutes % 60;
    return remMin > 0 && hours < 6 ? `${hours} h ${remMin} min` : `${hours} h`;
  }
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days} d`;
  const weeks = Math.floor(days / 7);
  return `${weeks} sem`;
};

/**
 * Calcula texto y tono para mostrar el SLA de un ticket.
 *
 * - Si está RESOLVED/CLOSED: tono neutral, no se muestra alerta.
 * - Si dueAt es null: "—".
 * - Si dueAt en el pasado: "vencido hace X" en danger.
 * - Si dueAt en menos de 4h: "vence en X" en warning.
 * - Si dueAt > 4h: "vence en X" en ok.
 */
export const formatSla = (
  dueAt: string | null | undefined,
  status: string,
): SlaInfo => {
  if (!dueAt) {
    return { text: "—", tone: "neutral", dueAt: null, overdue: false };
  }

  const isTerminal = status === "RESOLVED" || status === "CLOSED";

  if (isTerminal) {
    return {
      text: "Cerrado",
      tone: "neutral",
      dueAt,
      overdue: false,
    };
  }

  const due = new Date(dueAt).getTime();
  const now = Date.now();
  const diff = due - now;

  if (diff < 0) {
    return {
      text: `Vencido hace ${formatDuration(diff)}`,
      tone: "danger",
      dueAt,
      overdue: true,
    };
  }

  const fourHoursMs = 4 * 60 * 60 * 1000;
  return {
    text: `Vence en ${formatDuration(diff)}`,
    tone: diff < fourHoursMs ? "warning" : "ok",
    dueAt,
    overdue: false,
  };
};

export const slaToneClasses: Record<SlaTone, string> = {
  danger:
    "text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/30 dark:border-red-800/60",
  warning:
    "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-800/60",
  ok: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800/60",
  neutral: "text-muted-foreground bg-muted border-border",
};
