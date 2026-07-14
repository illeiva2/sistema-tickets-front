import { Activity, CalendarClock, CheckCircle2, Wrench } from "lucide-react";
import type { ItMaintenance, MaintenancePagination } from "../types";

interface MaintenanceMetricsProps {
  items: ItMaintenance[];
  pagination?: MaintenancePagination;
}

export function MaintenanceMetrics({
  items,
  pagination,
}: MaintenanceMetricsProps) {
  const scheduled = items.filter((item) => item.status === "SCHEDULED").length;
  const inProgress = items.filter(
    (item) => item.status === "IN_PROGRESS",
  ).length;
  const completed = items.filter((item) => item.status === "COMPLETED").length;

  return (
    <div className="maintenance-metrics" aria-label="Resumen de mantenimientos">
      <article>
        <Wrench size={18} aria-hidden="true" />
        <span>Registros</span>
        <strong>{pagination?.total ?? items.length}</strong>
        <small>Total para el filtro actual</small>
      </article>
      <article data-tone="scheduled">
        <CalendarClock size={18} aria-hidden="true" />
        <span>Programados</span>
        <strong>{scheduled}</strong>
        <small>Visibles en esta página</small>
      </article>
      <article data-tone="active">
        <Activity size={18} aria-hidden="true" />
        <span>En curso</span>
        <strong>{inProgress}</strong>
        <small>Intervenciones abiertas</small>
      </article>
      <article data-tone="complete">
        <CheckCircle2 size={18} aria-hidden="true" />
        <span>Completados</span>
        <strong>{completed}</strong>
        <small>Visibles en esta página</small>
      </article>
    </div>
  );
}
