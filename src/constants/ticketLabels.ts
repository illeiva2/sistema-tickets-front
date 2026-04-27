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

export const TICKET_STATUS_STYLE: Record<string, string> = {
  OPEN: "text-blue-600 bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
  IN_PROGRESS: "text-purple-600 bg-purple-50 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800",
  RESOLVED: "text-emerald-600 bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
  CLOSED: "text-gray-500 bg-gray-50 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
};

export const TICKET_PRIORITY_STYLE: Record<string, string> = {
  LOW: "text-green-600 bg-green-50 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
  MEDIUM: "text-yellow-700 bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
  HIGH: "text-orange-600 bg-orange-50 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
  URGENT: "text-red-600 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 font-semibold",
};

export const statusLabel = (status?: string | null) =>
  (status && TICKET_STATUS_LABEL[status]) || "—";

export const priorityLabel = (priority?: string | null) =>
  (priority && TICKET_PRIORITY_LABEL[priority]) || "—";
