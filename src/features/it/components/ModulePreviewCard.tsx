import { CircleDashed, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface ModulePreviewCardProps {
  code: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

export function ModulePreviewCard({
  code,
  title,
  description,
  icon: Icon,
  href,
}: ModulePreviewCardProps) {
  const titleId = `ops-module-${code.toLowerCase()}`;

  return (
    <Link className="ops-module-card" to={href} aria-labelledby={titleId}>
      <div className="ops-module-card__topline">
        <span>{code}</span>
        <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
      </div>
      <h3 id={titleId}>{title}</h3>
      <p>{description}</p>
      <div className="ops-module-card__status">
        <CircleDashed size={13} aria-hidden="true" />
        <span>Abrir módulo · En preparación</span>
      </div>
    </Link>
  );
}
