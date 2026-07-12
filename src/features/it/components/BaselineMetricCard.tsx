import type { LucideIcon } from "lucide-react";

interface BaselineMetricCardProps {
  id: string;
  code: string;
  label: string;
  note: string;
  value: number;
  icon: LucideIcon;
  tone: "cyan" | "amber" | "neutral";
}

export function BaselineMetricCard({
  id,
  code,
  label,
  note,
  value,
  icon: Icon,
  tone,
}: BaselineMetricCardProps) {
  return (
    <article
      className="ops-metric-card"
      data-tone={tone}
      role="listitem"
      aria-labelledby={`ops-metric-${id}`}
    >
      <div className="ops-metric-card__header">
        <span className="ops-metric-card__code">{code}</span>
        <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
      </div>
      <strong className="ops-metric-card__value">
        {value.toLocaleString("es-AR")}
      </strong>
      <h3 id={`ops-metric-${id}`} className="ops-metric-card__label">
        {label}
      </h3>
      <p className="ops-metric-card__note">{note}</p>
      <span className="ops-metric-card__source">Baseline manual</span>
    </article>
  );
}
