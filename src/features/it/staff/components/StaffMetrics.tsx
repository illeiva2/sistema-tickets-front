import { Briefcase, CalendarClock, UserRoundCheck, Users } from "lucide-react";
import type { StaffPagination, StaffPerson } from "../types";

interface StaffMetricsProps {
  people: StaffPerson[];
  pagination?: StaffPagination;
}

export function StaffMetrics({ people, pagination }: StaffMetricsProps) {
  const metrics = [
    {
      id: "total",
      label: "Total filtrado",
      value: pagination?.total ?? people.length,
      detail: "Según la consulta actual",
      icon: Users,
      tone: "cyan",
    },
    {
      id: "active",
      label: "Activos visibles",
      value: people.filter((person) => person.status === "ACTIVE").length,
      detail: "En esta página",
      icon: UserRoundCheck,
      tone: "cyan",
    },
    {
      id: "leave",
      label: "De licencia",
      value: people.filter((person) => person.status === "ON_LEAVE").length,
      detail: "En esta página",
      icon: CalendarClock,
      tone: "amber",
    },
    {
      id: "terminated",
      label: "Desvinculados",
      value: people.filter((person) => person.status === "TERMINATED").length,
      detail: "En esta página",
      icon: Briefcase,
      tone: "muted",
    },
  ] as const;

  return (
    <section className="staff-metrics" aria-label="Métricas del padrón laboral">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <article key={metric.id} data-tone={metric.tone}>
            <div className="staff-metric__topline">
              <span>{metric.label}</span>
              <Icon size={17} strokeWidth={1.6} aria-hidden="true" />
            </div>
            <strong>{metric.value.toLocaleString("es-AR")}</strong>
            <p>{metric.detail}</p>
          </article>
        );
      })}
    </section>
  );
}
