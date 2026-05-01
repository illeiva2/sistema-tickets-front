import React, { useEffect, useState } from "react";
import {
  PlusCircle,
  ArrowRightLeft,
  CheckCircle2,
  UserPlus2,
  Flag,
  RotateCcw,
  Activity,
  Pencil,
  type LucideIcon,
} from "lucide-react";
import api from "../lib/api";

export interface AuditLogEntry {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  actorId: string;
  meta: Record<string, any> | null;
  createdAt: string;
  actor: { id: string; name: string; email: string } | null;
}

interface Props {
  ticketId: string;
  /** Cualquier valor cambiante que fuerce refetch (ej: ticket.updatedAt). */
  refreshKey?: number | string;
}

const ACTION_ICON: Record<string, LucideIcon> = {
  ticket_created: PlusCircle,
  ticket_updated: Pencil,
  ticket_assigned_updated: UserPlus2,
  ticket_priority_updated: Flag,
  ticket_resolved: CheckCircle2,
  ticket_claimed: UserPlus2,
  ticket_reopened: RotateCcw,
  ticket_closed: ArrowRightLeft,
};

const ACTION_LABEL: Record<string, string> = {
  ticket_created: "creó el ticket",
  ticket_updated: "actualizó el ticket",
  ticket_assigned_updated: "cambió la asignación",
  ticket_priority_updated: "cambió la prioridad",
  ticket_resolved: "resolvió el ticket",
  ticket_claimed: "tomó el ticket",
  ticket_reopened: "reabrió el ticket",
  ticket_closed: "cerró el ticket",
};

const formatRelative = (iso: string): string => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 30) return `hace ${Math.floor(diff / 86400)} d`;
  return new Date(iso).toLocaleDateString();
};

const TicketTimeline: React.FC<Props> = ({ ticketId, refreshKey }) => {
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLogs(null);
    setError(null);
    (async () => {
      try {
        const resp = await api.get(`/api/tickets/${ticketId}/audit`);
        if (!cancelled) setLogs(resp.data?.data ?? []);
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.response?.data?.error?.message || "No se pudo cargar la actividad",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ticketId, refreshKey]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <Activity size={13} />
        <span>Actividad</span>
      </div>

      {error && (
        <div className="text-xs text-destructive">{error}</div>
      )}

      {!logs && !error && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-2.5">
              <div className="w-5 h-5 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                <div className="h-2.5 bg-muted/60 rounded animate-pulse w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {logs && logs.length === 0 && (
        <div className="text-xs text-muted-foreground italic">
          Todavía no hay actividad registrada.
        </div>
      )}

      {logs && logs.length > 0 && (
        <ol className="relative space-y-3 pl-1">
          {/* línea vertical sutil entre los puntos */}
          <span
            aria-hidden
            className="absolute left-[9px] top-1 bottom-1 w-px bg-border"
          />
          {logs.map((log) => {
            const Icon = ACTION_ICON[log.action] ?? Activity;
            const verb = ACTION_LABEL[log.action] ?? log.action.replace(/_/g, " ");
            const actor = log.actor?.name ?? "Sistema";
            return (
              <li key={log.id} className="relative flex gap-2.5">
                <div className="relative z-10 w-[19px] h-[19px] rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground shrink-0">
                  <Icon size={11} />
                </div>
                <div className="flex-1 min-w-0 -mt-0.5">
                  <div className="text-[12.5px] leading-snug">
                    <span className="font-medium text-foreground">{actor}</span>{" "}
                    <span className="text-muted-foreground">{verb}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {formatRelative(log.createdAt)}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export default TicketTimeline;
