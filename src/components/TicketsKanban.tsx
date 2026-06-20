import React, { useState } from "react";
import {
  Hash,
  AlertTriangle,
  MessageSquare,
  ChevronRight,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Button } from "@/components/ui";
import { TICKET_STATUS_LABEL } from "../constants/ticketLabels";
import {
  TICKET_CATEGORY_GLYPH,
  TICKET_CATEGORY_LABEL,
  TICKET_CATEGORY_STYLE,
} from "../constants/ticketCategories";
import { formatSla, slaToneClasses } from "../lib/sla";
import Avatar from "./Avatar";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

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
  /** Callback al soltar una card en otra columna. El receptor decide
   *  qué endpoint llamar y cómo manejar transiciones que requieren
   *  comentario (cerrar / reabrir). */
  onTransition?: (
    ticketId: string,
    from: TicketStatus,
    to: TicketStatus,
  ) => void | Promise<void>;
  showClaim: boolean;
  showReopen: boolean;
  canDrag: boolean;
}

// ─── Card del ticket ──────────────────────────────────────────────────────────

interface CardProps {
  ticket: any;
  onNavigate: (id: string) => void;
  onClaim?: (id: string) => void;
  claimingId: string | null;
  onReopen?: (id: string) => void;
  showClaim: boolean;
  showReopen: boolean;
  canDrag: boolean;
  /** Cuando se renderiza dentro del DragOverlay, no usar listeners. */
  asOverlay?: boolean;
}

const TicketCardContent: React.FC<{
  ticket: any;
  onNavigate?: (id: string) => void;
  onClaim?: (id: string) => void;
  claimingId?: string | null;
  onReopen?: (id: string) => void;
  showClaim?: boolean;
  showReopen?: boolean;
  asOverlay?: boolean;
}> = ({
  ticket,
  onClaim,
  claimingId,
  onReopen,
  showClaim,
  showReopen,
  asOverlay,
}) => {
  const isUrgent = ticket.priority === "URGENT";
  const isUnread = !ticket.isRead;
  const isClaiming = claimingId === ticket.id;
  const sla = formatSla(ticket.dueAt, ticket.status);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
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

      <div
        className={`text-[13px] leading-snug line-clamp-2 ${
          isUnread ? "font-semibold" : "font-normal"
        }`}
      >
        {ticket.title}
      </div>

      {(sla.tone === "danger" ||
        sla.tone === "warning" ||
        ticket.category) && (
        <div className="flex items-center gap-1.5 flex-wrap">
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

      {((showClaim && !ticket.assignee) || showReopen) && !asOverlay ? (
        <div
          className="flex items-center gap-1 pt-2 border-t border-border"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
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
          <span className="ml-auto text-muted-foreground/50">
            <ChevronRight size={12} />
          </span>
        </div>
      ) : null}
    </div>
  );
};

const TicketCard: React.FC<CardProps> = ({
  ticket,
  onNavigate,
  onClaim,
  claimingId,
  onReopen,
  showClaim,
  showReopen,
  canDrag,
  asOverlay,
}) => {
  const isUnread = !ticket.isRead;
  const draggable = useDraggable({
    id: ticket.id,
    data: { ticket },
    disabled: !canDrag || asOverlay,
  });

  const style: React.CSSProperties = {
    opacity: !asOverlay && draggable.isDragging ? 0.4 : 1,
    cursor: canDrag ? "grab" : "pointer",
  };

  return (
    <div
      ref={canDrag && !asOverlay ? draggable.setNodeRef : undefined}
      style={style}
      onClick={() => !asOverlay && onNavigate(ticket.id)}
      className={`group bg-card border rounded-md p-2.5 transition-shadow ${
        asOverlay ? "shadow-2xl ring-2 ring-primary/40" : "hover:shadow-sm hover:border-primary/30"
      } ${isUnread ? "border-primary/40 bg-primary/[0.02]" : "border-border"}`}
      {...(canDrag && !asOverlay ? draggable.attributes : {})}
      {...(canDrag && !asOverlay ? draggable.listeners : {})}
    >
      {canDrag && !asOverlay && (
        <div className="absolute -top-1 -left-1 opacity-0 group-hover:opacity-60 transition-opacity pointer-events-none">
          <GripVertical size={11} className="text-muted-foreground" />
        </div>
      )}
      <TicketCardContent
        ticket={ticket}
        onClaim={onClaim}
        claimingId={claimingId}
        onReopen={onReopen}
        showClaim={showClaim}
        showReopen={showReopen}
        asOverlay={asOverlay}
      />
    </div>
  );
};

// ─── Columna ──────────────────────────────────────────────────────────────────

const KanbanColumn: React.FC<{
  status: TicketStatus;
  accent: string;
  tickets: any[];
  isDragging: boolean;
  children: React.ReactNode;
}> = ({ status, accent, tickets, isDragging, children }) => {
  const droppable = useDroppable({ id: status });
  const isOver = droppable.isOver;

  return (
    <div
      ref={droppable.setNodeRef}
      className={`flex flex-col rounded-lg border-t-2 bg-muted/20 transition-colors ${accent} ${
        isDragging
          ? isOver
            ? "ring-2 ring-primary ring-offset-1 bg-primary/5"
            : "ring-1 ring-border/40"
          : "border border-border"
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h3 className="text-[12.5px] font-semibold tracking-tight">
          {TICKET_STATUS_LABEL[status]}
        </h3>
        <span className="text-[10.5px] font-mono text-muted-foreground tabular-nums">
          {tickets.length}
        </span>
      </div>
      <div className="flex flex-col gap-2 p-2 min-h-[120px]">{children}</div>
    </div>
  );
};

// ─── Kanban ──────────────────────────────────────────────────────────────────

const TicketsKanban: React.FC<KanbanProps> = ({
  tickets,
  onNavigate,
  onClaim,
  claimingId,
  onReopen,
  onTransition,
  showClaim,
  showReopen,
  canDrag,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Sensor con activationDistance para que un click corto navegue al detalle
  // y solo dispare drag si se mueve > 5px.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const grouped = COLUMNS.reduce<Record<TicketStatus, any[]>>(
    (acc, col) => {
      acc[col.id] = tickets.filter((t) => t.status === col.id);
      return acc;
    },
    { OPEN: [], IN_PROGRESS: [], RESOLVED: [], CLOSED: [] },
  );

  const activeTicket = activeId
    ? tickets.find((t) => t.id === activeId)
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const ticketId = String(active.id);
    const targetStatus = String(over.id) as TicketStatus;
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    const fromStatus = ticket.status as TicketStatus;
    if (fromStatus === targetStatus) return;
    onTransition?.(ticketId, fromStatus, targetStatus);
  };

  const content = (
    <div className="overflow-x-auto p-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 min-w-[280px]">
        {COLUMNS.map((col) => {
          const items = grouped[col.id];
          return (
            <KanbanColumn
              key={col.id}
              status={col.id}
              accent={col.accent}
              tickets={items}
              isDragging={Boolean(activeId)}
            >
              {items.length === 0 ? (
                <div className="text-[11px] text-muted-foreground text-center py-6 italic">
                  {canDrag && activeId ? "soltá acá" : "sin tickets"}
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
                    canDrag={canDrag}
                  />
                ))
              )}
            </KanbanColumn>
          );
        })}
      </div>
    </div>
  );

  if (!canDrag) return content;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      {content}
      <DragOverlay>
        {activeTicket ? (
          <TicketCard
            ticket={activeTicket}
            onNavigate={() => {}}
            claimingId={null}
            showClaim={false}
            showReopen={false}
            canDrag={false}
            asOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default TicketsKanban;
