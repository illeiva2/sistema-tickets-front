import { CheckCircle2, CircleDashed, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

type ModuleStatus = "available" | "limited" | "preparing";

const STATUS_LABELS: Record<ModuleStatus, string> = {
  available: "Disponible",
  limited: "Cobertura básica",
  preparing: "En preparación",
};

interface ModulePreviewCardProps {
  code: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  status?: ModuleStatus;
}

export function ModulePreviewCard({
  code,
  title,
  description,
  icon: Icon,
  href,
  status = "preparing",
}: ModulePreviewCardProps) {
  const titleId = `ops-module-${code.toLowerCase()}`;
  const isAvailable = status === "available";

  return (
    <Link
      className="ops-module-card"
      data-status={status}
      to={href}
      aria-labelledby={titleId}
    >
      <div className="ops-module-card__topline">
        <span>{code}</span>
        <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
      </div>
      <h3 id={titleId}>{title}</h3>
      <p>{description}</p>
      <div className="ops-module-card__status">
        {isAvailable ? (
          <CheckCircle2 size={13} aria-hidden="true" />
        ) : (
          <CircleDashed size={13} aria-hidden="true" />
        )}
        <span>Abrir módulo · {STATUS_LABELS[status]}</span>
      </div>
    </Link>
  );
}
