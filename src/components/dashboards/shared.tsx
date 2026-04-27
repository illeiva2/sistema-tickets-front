import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui";
import {
  TICKET_STATUS_LABEL,
  TICKET_PRIORITY_LABEL,
  TICKET_STATUS_STYLE,
  TICKET_PRIORITY_STYLE,
} from "../../constants/ticketLabels";
import type { DashboardTicket } from "../../types/dashboard";

export const formatHours = (hours: number | null): string => {
  if (hours == null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${hours.toFixed(1)} h`;
  const days = hours / 24;
  if (days < 30) return `${days.toFixed(1)} d`;
  return `${(days / 30).toFixed(1)} m`;
};

export const formatPercent = (ratio: number | null): string =>
  ratio == null ? "—" : `${(ratio * 100).toFixed(1)} %`;

export const padTicketNumber = (n: number) => n.toString().padStart(5, "0");

export const TicketRow: React.FC<{ ticket: DashboardTicket }> = ({ ticket }) => (
  <Link
    to={`/tickets/${ticket.id}`}
    className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
  >
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-mono">
          #{padTicketNumber(ticket.ticketNumber)}
        </span>
        <span className="text-sm font-medium truncate">{ticket.title}</span>
      </div>
      <div className="text-xs text-muted-foreground mt-0.5 truncate">
        {ticket.requester?.name || "—"}
        {ticket.assignee && ` · ${ticket.assignee.name}`}
      </div>
    </div>
    <div className="flex items-center gap-1 shrink-0">
      <Badge
        variant="outline"
        className={`text-[10px] px-1.5 py-0 ${TICKET_PRIORITY_STYLE[ticket.priority] || ""}`}
      >
        {TICKET_PRIORITY_LABEL[ticket.priority]}
      </Badge>
      <Badge
        variant="outline"
        className={`text-[10px] px-1.5 py-0 ${TICKET_STATUS_STYLE[ticket.status] || ""}`}
      >
        {TICKET_STATUS_LABEL[ticket.status]}
      </Badge>
    </div>
  </Link>
);

export const KpiCard: React.FC<{
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "blue" | "amber" | "green" | "red" | "slate";
  icon?: React.ReactNode;
}> = ({ label, value, hint, tone = "default", icon }) => {
  const toneClass: Record<string, string> = {
    default: "border-l-slate-300",
    blue: "border-l-blue-500",
    amber: "border-l-amber-500",
    green: "border-l-emerald-500",
    red: "border-l-red-500",
    slate: "border-l-slate-500",
  };
  return (
    <div
      className={`rounded-lg border border-l-4 ${toneClass[tone]} bg-card p-4 shadow-sm`}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </div>
        {icon}
      </div>
      <div className="text-2xl font-bold tracking-tight mt-1">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
};
