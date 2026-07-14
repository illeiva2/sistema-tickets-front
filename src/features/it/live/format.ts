export function formatHeartbeat(value?: string | null) {
  if (!value) return "Nunca";
  const seconds = Math.max(
    0,
    Math.round((Date.now() - new Date(value).getTime()) / 1000),
  );
  if (seconds < 60) return `hace ${seconds} s`;
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`;
  return `hace ${Math.floor(seconds / 86400)} d`;
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatUptime(seconds?: number | null) {
  if (seconds == null) return "—";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return days
    ? `${days} d ${hours} h`
    : hours
      ? `${hours} h ${minutes} min`
      : `${minutes} min`;
}

export function formatRam(used?: number | null, total?: number | null) {
  if (used == null || total == null || total <= 0) return "—";
  return `${(used / 1024).toFixed(1)} / ${(total / 1024).toFixed(1)} GB`;
}

export function ramPercent(used?: number | null, total?: number | null) {
  return used == null || !total ? null : Math.round((used / total) * 100);
}
