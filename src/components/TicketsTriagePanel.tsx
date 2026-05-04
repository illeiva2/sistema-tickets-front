import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Inbox,
  AlertCircle,
  Mail,
  ArrowRight,
} from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../hooks";

interface TriageCounts {
  fresh: number;
  unassigned: number;
  unread: number;
  mine: number;
}

// Panel destacado para AGENT/ADMIN que muestra de un vistazo:
// - tickets sin leer NI asignar (los mas urgentes, rojo)
// - tickets sin asignar (ambar)
// - tickets sin leer (azul)
// Cada card linkea a /tickets con el filtro pre-aplicado.
const TicketsTriagePanel: React.FC = () => {
  const { user } = useAuth();
  const isStaff = user?.role === "AGENT" || user?.role === "ADMIN";
  const [counts, setCounts] = useState<TriageCounts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isStaff) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const resp = await api.get("/api/tickets/triage-counts");
        if (!cancelled) setCounts(resp.data?.data ?? null);
      } catch {
        if (!cancelled) setCounts(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isStaff]);

  if (!isStaff) return null;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-lg bg-muted/40 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!counts) return null;

  // Si todo esta a cero, mostramos un estado tranquilo en lugar de tres
  // cards vacias.
  const allClear =
    counts.fresh === 0 && counts.unassigned === 0 && counts.unread === 0;

  if (allClear) {
    return (
      <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-800/40 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
          ✓
        </div>
        <div>
          <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
            Bandeja al día
          </p>
          <p className="text-[12.5px] text-emerald-800/80 dark:text-emerald-200/70">
            No hay tickets sin asignar ni sin leer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <TriageCard
        tone="danger"
        icon={<AlertCircle size={20} />}
        count={counts.fresh}
        label="Sin leer ni asignar"
        sublabel="Nuevos, nadie los miró"
        to="/tickets?filter=fresh"
        emphasis
      />
      <TriageCard
        tone="warning"
        icon={<Inbox size={20} />}
        count={counts.unassigned}
        label="Sin asignar"
        sublabel="Esperando un técnico"
        to="/tickets?filter=unassigned"
      />
      <TriageCard
        tone="info"
        icon={<Mail size={20} />}
        count={counts.unread}
        label="Sin leer"
        sublabel="No los abriste todavía"
        to="/tickets?filter=unread"
      />
    </div>
  );
};

interface TriageCardProps {
  tone: "danger" | "warning" | "info";
  icon: React.ReactNode;
  count: number;
  label: string;
  sublabel: string;
  to: string;
  emphasis?: boolean;
}

const TONE_CLASSES: Record<TriageCardProps["tone"], string> = {
  danger:
    "border-rose-200/70 bg-rose-50/60 hover:bg-rose-50 hover:border-rose-300 dark:bg-rose-950/20 dark:border-rose-800/50 dark:hover:bg-rose-950/40",
  warning:
    "border-amber-200/70 bg-amber-50/60 hover:bg-amber-50 hover:border-amber-300 dark:bg-amber-950/20 dark:border-amber-800/50 dark:hover:bg-amber-950/40",
  info:
    "border-sky-200/70 bg-sky-50/60 hover:bg-sky-50 hover:border-sky-300 dark:bg-sky-950/20 dark:border-sky-800/50 dark:hover:bg-sky-950/40",
};

const TONE_TEXT: Record<TriageCardProps["tone"], string> = {
  danger: "text-rose-700 dark:text-rose-300",
  warning: "text-amber-700 dark:text-amber-300",
  info: "text-sky-700 dark:text-sky-300",
};

const TONE_DOT: Record<TriageCardProps["tone"], string> = {
  danger: "bg-rose-500",
  warning: "bg-amber-500",
  info: "bg-sky-500",
};

const TriageCard: React.FC<TriageCardProps> = ({
  tone,
  icon,
  count,
  label,
  sublabel,
  to,
  emphasis,
}) => {
  const isZero = count === 0;
  const isHot = !isZero && emphasis;

  return (
    <Link
      to={to}
      className={`group relative rounded-lg border px-4 py-3 transition-all ${TONE_CLASSES[tone]} ${
        isZero ? "opacity-70" : ""
      } ${isHot ? "ring-1 ring-rose-300/50 dark:ring-rose-700/50" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className={`shrink-0 ${TONE_TEXT[tone]} relative`}>
          {icon}
          {isHot && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full rounded-full ${TONE_DOT[tone]} opacity-75 animate-ping`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${TONE_DOT[tone]}`}
              />
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-semibold tabular-nums ${TONE_TEXT[tone]}`}
            >
              {count}
            </span>
            <span className="text-[13px] font-medium text-foreground truncate">
              {label}
            </span>
          </div>
          <p className="text-[11.5px] text-muted-foreground mt-0.5 truncate">
            {sublabel}
          </p>
        </div>
        <ArrowRight
          size={14}
          className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity self-center"
        />
      </div>
    </Link>
  );
};

export default TicketsTriagePanel;
