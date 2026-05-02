export type TicketCategory =
  | "SOFTWARE"
  | "HARDWARE"
  | "RED"
  | "ERP"
  | "OTRO";

export const TICKET_CATEGORY_LABEL: Record<TicketCategory, string> = {
  SOFTWARE: "Software",
  HARDWARE: "Hardware",
  RED: "Red",
  ERP: "ERP",
  OTRO: "Otro",
};

// Iconos compactos en estilo "símbolo" (alineado al prototipo de design).
export const TICKET_CATEGORY_GLYPH: Record<TicketCategory, string> = {
  SOFTWARE: "◇",
  HARDWARE: "▤",
  RED: "≋",
  ERP: "◈",
  OTRO: "◯",
};

// Estilo del badge por categoría: paleta neutra que se mezcla bien con
// los themes (Quiet Pro / Workshop) y no compite con prioridad/estado.
export const TICKET_CATEGORY_STYLE: Record<TicketCategory, string> = {
  SOFTWARE: "text-violet-700 bg-violet-50 border-violet-200 dark:text-violet-300 dark:bg-violet-950/30 dark:border-violet-800/60",
  HARDWARE: "text-slate-700 bg-slate-50 border-slate-200 dark:text-slate-300 dark:bg-slate-900/40 dark:border-slate-700",
  RED: "text-cyan-700 bg-cyan-50 border-cyan-200 dark:text-cyan-300 dark:bg-cyan-950/30 dark:border-cyan-800/60",
  ERP: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-800/60",
  OTRO: "text-muted-foreground bg-muted border-border",
};

export const categoryLabel = (category?: string | null): string =>
  (category && TICKET_CATEGORY_LABEL[category as TicketCategory]) || "Sin categoría";

export const categoryGlyph = (category?: string | null): string =>
  (category && TICKET_CATEGORY_GLYPH[category as TicketCategory]) || "·";

export const ALL_CATEGORIES: TicketCategory[] = [
  "SOFTWARE",
  "HARDWARE",
  "RED",
  "ERP",
  "OTRO",
];
