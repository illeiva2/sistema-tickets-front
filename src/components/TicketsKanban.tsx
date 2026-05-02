import React from "react";
import { Hash, AlertTriangle, MessageSquare, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";
import { TICKET_STATUS_LABEL } from "../constants/ticketLabels";
import {
  TICKET_CATEGORY_GLYPH,
  TICKET_CATEGORY_LABEL,
  TICKET_CATEGORY_STYLE,
} from "../constants/ticketCategories";
import { formatSla, slaToneClasses } from "../lib/sla";
import Avatar from "./Avatar";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

const COLUMNS: Array<{ id: TicketStatus; accent: string }> = [
  { id: "OPEN", accent: "border-t-status-open" },
  { id: "IN_PROGRESS", accent: "border-t-status-progress" },
  { id: "RESOLVED", accent: "border-t-status-resolved" },
  { id: "CLOSED", accent: "border-t-status-closed" },
];

const PRIORITY_DOT: Record<string, string> = {
  LOW: "bg-priority-low",
  MEDIUM: "bg-priority-medium",
  HIGH: "bg-priority-high",
  URGENT: "bg-priority-urgent",
};

interface KanbanProps {
  tickets: any[];
  onNavigate: (id: string) => void;
  onClaim?: (id: string) => void;
  claimingId: string | null;
  onReopen?: (id: string) => void;
  showClaim: boolean;
  showReopen: boolean;
}

const TicketCard: React.FC<{
  ticket: any;
  onNavigate: (id: string) => void;
  onClaim?: (id: string) => void;
  claimingId: string | null;
  onReopen?: (id: string) => void;
  showClaim: boolean;
  showReopen: boolean;
}> = ({
  ticket,
  onNavigate,
  onClaim,
  claimingId,
  onReopen,
  showClaim,
  showReopen,
}) => {
  const isUrgent = ticket.priority === "URGENT";
  const isUnread = !ticket.isRead;
  const isClaiming = claimingId === ticket.id;
  const sla = formatSla(ticket.dueAt, ticket.status);

  return (
    <button
      type="button"
      onClick={() => onNavigate(ticket.id)}
      className={`group w-full text-left bg-card border rounded-md p-2.5 transition-all hover:shadow-sm hover:border-primary/30 ${
        isUnread ? "border-primary/40 bg-primary/[0.02]" : "border-border"
      }`}
    >
      {/* Top row: #number + priority */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="flex items-center gap-1 text-[10.5px] font-mono text-muted-foreground tabular-nums">
          <Hash size={9} />
          {ticket.ticketNumber?.toString().padStart(5, "0")}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {isUrgent && (
            <AlertTriangle size={11} className="text-priority-urgent" />
          )}
          <span
            className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[ticket.priority]}`}
            title={ticket.priority}
          />
        </div>
      </div>

      {/* Title */}
      <div
        className={`text-[13px] leading-snug mb-2 line-clamp-2 ${
          isUnread ? "font-semibold" : "font-normal"
        }`}
      >
        {ticket.title}
      </div>

      {/* Tags row: SLA badge + category */}
      {(sla.tone === "danger" ||
        sla.tone === "warning" ||
        ticket.category) && (
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          {(sla.tone === "danger" || sla.tone === "warning") && (
            <span
              className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${slaToneClasses[sla.tone]}`}
            >
              {sla.text}
            </span>
          )}
          {ticket.category && (
            <span
              className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border ${TICKET_CATEGORY_STYLE[ticket.category as keyof typeof TICKET_CATEGORY_STYLE] || ""}`}
            >
              <span aria-hidden>
                {TICKET_CATEGORY_GLYPH[ticket.category as keyof typeof TICKET_CATEGORY_GLYPH]}
              </span>
              {TICKET_CATEGORY_LABEL[ticket.category as keyof typeof TICKET_CATEGORY_LABEL]}
            </span>
          )}
        </div>
      )}

      {/* Footer: requester/assignee + comments */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {ticket.assignee ? (
            <>
              <Avatar
                name={ticket.assignee.name}
                email={ticket.assignee.email}
                size={18}
              />
              <span className="text-[11px] text-muted-foreground truncate">
                {ticket.assignee.name}
              </span>
            </>
          ) : ticket.status !== "CLOSED" ? (
            <span className="text-[10.5px] font-medium text-priority-medium">
              sin asignar
            </span>
          ) : (
            <span className="text-[10.5px] text-muted-foreground">—</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10.5px] text-muted-foreground shrink-0">
          {ticket._count?.comments > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <MessageSquare size={10} />
              {ticket._count.comments}
            </span>
          )}
        </div>
      </div>

      {/* Inline actions (solo si aplica). Stop propagation para no navegar al detalle. */}
      {(showClaim && !ticket.assignee) || showReopen ? (
        <div
          className="flex items-center gap-1 mt-2 pt-2 border-t border-border"
          onClick={(e) => e.stopPropagation()}
        >
          {showClaim && !ticket.assignee && (
            <Button
              variant="secondary"
              size="sm"
              disabled={isClaiming}
              className="h-6 px-2 text-[10.5px]"
              onClick={() => onClaim?.(ticket.id)}
            >
              {isClaiming ? "…" : "Reclamar"}
            </Button>
          )}
          {showReopen && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10.5px] text-primary hover:text-primary/80"
              onClick={() => onReopen?.(ticket.id)}
            >
              Reabrir
            </Button>
          )}
          <span className="ml-auto text-muted-foreground/50 group-hover:text-muted-foreground">
            <ChevronRight size={12} />
          </span>
        </div>
      ) : null}
    </button>
  );
};

const TicketsKanban: React.FC<KanbanProps> = ({
  tickets,
  onNavigate,
  onClaim,
  claimingId,
  onReopen,
  showClaim,
  showReopen,
}) => {
  const grouped = COLUMNS.reduce<Record<TicketStatus, any[]>>(
    (acc, col) => {
      acc[col.id] = tickets.filter((t) => t.status === col.id);
      return acc;
    },
    { OPEN: [], IN_PROGRESS: [], RESOLVED: [], CLOSED: [] },
  );

  return (
    <div className="overflow-x-auto p-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 min-w-[280px]">
        {COLUMNS.map((col) => {
          const items = grouped[col.id];
          return (
            <div
              key={col.id}
              className={`flex flex-col rounded-lg border-t-2 bg-muted/20 border-border ${col.accent}`}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <h3 className="text-[12.5px] font-semibold tracking-tight">
                  {TICKET_STATUS_LABEL[col.id]}
                </h3>
                <span className="text-[10.5px] font-mono text-muted-foreground tabular-nums">
                  {items.length}
                </span>
              </div>
              <div className="flex flex-col gap-2 p-2 min-h-[120px]">
                {items.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground text-center py-6 italic">
                    sin tickets
                  </div>
                ) : (
                  items.map((t) => (
                    <TicketCard
                      key={t.id}
                      ticket={t}
                      onNavigate={onNavigate}
                      onClaim={onClaim}
                      claimingId={claimingId}
                      onReopen={onReopen}
                      showClaim={showClaim}
                      showReopen={showReopen}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TicketsKanban;
