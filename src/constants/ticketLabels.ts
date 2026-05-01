export const TICKET_STATUS_LABEL: Record<string, string> = {
  OPEN: "Abierto",
  IN_PROGRESS: "En progreso",
  RESOLVED: "Resuelto",
  CLOSED: "Cerrado",
};

export const TICKET_PRIORITY_LABEL: Record<string, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  URGENT: "Urgente",
};

// Estilos de los badges de estado y prioridad. Usan los tokens semánticos
// (--status-* y --priority-*) que cambian con cada theme + modo, así que
// no hace falta declarar variantes light/dark a mano.
export const TICKET_STATUS_STYLE: Record<string, string> = {
  OPEN: "text-status-open bg-status-open/10 border border-status-open/30",
  IN_PROGRESS:
    "text-status-progress bg-status-progress/10 border border-status-progress/30",
  RESOLVED:
    "text-status-resolved bg-status-resolved/10 border border-status-resolved/30",
  CLOSED:
    "text-status-closed bg-status-closed/10 border border-status-closed/30",
};

export const TICKET_PRIORITY_STYLE: Record<string, string> = {
  LOW: "text-priority-low bg-priority-low/10 border border-priority-low/30",
  MEDIUM:
    "text-priority-medium bg-priority-medium/10 border border-priority-medium/30",
  HIGH: "text-priority-high bg-priority-high/10 border border-priority-high/30",
  URGENT:
    "text-priority-urgent bg-priority-urgent/10 border border-priority-urgent/30 font-semibold",
};

export const statusLabel = (status?: string | null) =>
  (status && TICKET_STATUS_LABEL[status]) || "—";

export const priorityLabel = (priority?: string | null) =>
  (priority && TICKET_PRIORITY_LABEL[priority]) || "—";
