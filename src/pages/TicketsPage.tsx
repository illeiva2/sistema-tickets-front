import React from "react";
import {
  TicketsEmptyState,
  TicketCardSkeleton,
  Button,
} from "@/components/ui";
import {
  Plus,
  Search,
  AlertTriangle,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTickets, useAuth } from "../hooks";
import toast from "react-hot-toast";
import api from "../lib/api";
import {
  TICKET_STATUS_LABEL as STATUS_LABEL,
  TICKET_PRIORITY_LABEL as PRIORITY_LABEL,
} from "../constants/ticketLabels";
import {
  TICKET_CATEGORY_LABEL,
  TICKET_CATEGORY_GLYPH,
  TICKET_CATEGORY_STYLE,
  ALL_CATEGORIES,
} from "../constants/ticketCategories";

type TabId = "active" | "resolved" | "closed" | "all";

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}

const STATUS_DOT: Record<string, string> = {
  OPEN: "bg-status-open",
  IN_PROGRESS: "bg-status-progress",
  RESOLVED: "bg-status-resolved",
  CLOSED: "bg-status-closed",
};

const PRIORITY_DOT: Record<string, string> = {
  LOW: "bg-priority-low",
  MEDIUM: "bg-priority-medium",
  HIGH: "bg-priority-high",
  URGENT: "bg-priority-urgent",
};

// ─── Fila de tabla ────────────────────────────────────────────────────────────

function TicketTableRow({
  ticket,
  onNavigate,
  onClaim,
  claimingId,
  onReopen,
  showClaim,
  showReopen,
}: {
  ticket: any;
  onNavigate: (id: string) => void;
  onClaim?: (id: string) => void;
  claimingId: string | null;
  onReopen?: (id: string) => void;
  showClaim: boolean;
  showReopen: boolean;
}) {
  const isUrgent = ticket.priority === "URGENT";
  const isUnread = !ticket.isRead;
  const isClaiming = claimingId === ticket.id;

  return (
    <tr
      className={`group cursor-pointer border-b border-border/60 transition-colors hover:bg-muted/40 ${
        isUnread ? "bg-primary/[0.025]" : ""
      }`}
      onClick={() => onNavigate(ticket.id)}
    >
      {/* # ticket number */}
      <td className="py-2.5 pl-4 pr-2 align-middle whitespace-nowrap">
        <div className="flex items-center gap-2">
          {isUnread && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-primary inline-block shrink-0"
              title="Sin leer"
            />
          )}
          <span className="font-mono text-[11.5px] text-muted-foreground tabular-nums">
            #{ticket.ticketNumber?.toString().padStart(5, "0")}
          </span>
        </div>
      </td>

      {/* status dot */}
      <td className="py-2.5 px-2 align-middle whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${STATUS_DOT[ticket.status] || "bg-muted"}`}
            title={STATUS_LABEL[ticket.status]}
          />
          <span className="text-[11.5px] text-muted-foreground hidden md:inline">
            {STATUS_LABEL[ticket.status]}
          </span>
        </div>
      </td>

      {/* title */}
      <td className="py-2.5 px-2 align-middle min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {isUrgent && (
            <AlertTriangle
              size={13}
              className="text-priority-urgent shrink-0"
            />
          )}
          <span
            className={`text-sm truncate ${
              isUnread ? "font-semibold" : "font-normal"
            }`}
          >
            {ticket.title}
          </span>
          {ticket.category && (
            <span
              className={`hidden md:inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded-md border shrink-0 ${TICKET_CATEGORY_STYLE[ticket.category as keyof typeof TICKET_CATEGORY_STYLE] || ""}`}
              title={TICKET_CATEGORY_LABEL[ticket.category as keyof typeof TICKET_CATEGORY_LABEL]}
            >
              <span aria-hidden>
                {TICKET_CATEGORY_GLYPH[ticket.category as keyof typeof TICKET_CATEGORY_GLYPH]}
              </span>
              {TICKET_CATEGORY_LABEL[ticket.category as keyof typeof TICKET_CATEGORY_LABEL]}
            </span>
          )}
          {ticket._count?.comments > 0 && (
            <span className="hidden sm:inline-flex items-center gap-0.5 text-[11px] text-muted-foreground shrink-0">
              <MessageSquare size={11} />
              {ticket._count.comments}
            </span>
          )}
        </div>
      </td>

      {/* priority chip */}
      <td className="py-2.5 px-2 align-middle whitespace-nowrap hidden lg:table-cell">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[ticket.priority] || "bg-muted"}`}
          />
          <span
            className={`text-[11.5px] ${
              isUrgent
                ? "text-priority-urgent font-medium"
                : "text-muted-foreground"
            }`}
          >
            {PRIORITY_LABEL[ticket.priority]}
          </span>
        </div>
      </td>

      {/* requester */}
      <td className="py-2.5 px-2 align-middle whitespace-nowrap hidden md:table-cell">
        <span className="text-[12px] text-muted-foreground truncate max-w-[140px] block">
          {ticket.requester?.name || "—"}
        </span>
      </td>

      {/* assignee */}
      <td className="py-2.5 px-2 align-middle whitespace-nowrap hidden xl:table-cell">
        {ticket.assignee ? (
          <span className="text-[12px] text-foreground/80 truncate max-w-[140px] block">
            {ticket.assignee.name}
          </span>
        ) : ticket.status !== "CLOSED" ? (
          <span className="text-[11.5px] font-medium text-priority-medium">
            sin asignar
          </span>
        ) : (
          <span className="text-[11.5px] text-muted-foreground">—</span>
        )}
      </td>

      {/* time */}
      <td className="py-2.5 px-2 align-middle whitespace-nowrap text-[11.5px] text-muted-foreground hidden sm:table-cell">
        {timeAgo(ticket.updatedAt || ticket.createdAt)}
      </td>

      {/* actions */}
      <td
        className="py-2.5 pl-2 pr-4 align-middle whitespace-nowrap text-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end gap-1">
          {showClaim && !ticket.assignee && (
            <Button
              variant="secondary"
              size="sm"
              disabled={isClaiming}
              className="h-7 px-2 text-[11.5px]"
              onClick={() => onClaim?.(ticket.id)}
            >
              {isClaiming ? "…" : "Reclamar"}
            </Button>
          )}
          {showReopen && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11.5px] text-primary hover:text-primary/80"
              onClick={() => onReopen?.(ticket.id)}
            >
              Reabrir
            </Button>
          )}
          <span className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
            <ChevronRight size={14} />
          </span>
        </div>
      </td>
    </tr>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

const TicketsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    tickets,
    isLoading,
    total,
    page,
    pageSize,
    filters,
    fetchTickets,
    setPage,
    setFilters,
    setPageSize,
  } = useTickets();

  const [searchParams, setSearchParams] = useSearchParams();
  const [claimingId, setClaimingId] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<TabId>("active");

  const handleClaim = async (ticketId: string) => {
    if (claimingId) return;
    try {
      setClaimingId(ticketId);
      const resp = await api.patch(`/api/tickets/${ticketId}/claim`);
      if (resp.data.success) {
        toast.success("¡Ticket reclamado! Ahora está asignado a ti.");
        fetchTickets({ filters, page, pageSize });
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "Error al reclamar ticket",
      );
    } finally {
      setClaimingId(null);
    }
  };

  const handleReopen = async (ticketId: string) => {
    const comment = prompt(
      "Proporciona un comentario explicando por qué reabres este ticket:",
    );
    if (!comment?.trim()) {
      toast.error("Debes proporcionar un comentario para reabrir el ticket");
      return;
    }
    try {
      const response = await api.post(`/api/tickets/${ticketId}/reopen`, {
        comment: comment.trim(),
      });
      if (response.data.success) {
        toast.success("Ticket reabierto correctamente");
        await fetchTickets({ filters, page, pageSize });
      }
    } catch (error: any) {
      toast.error(
        error instanceof Error ? error.message : "Error al reabrir el ticket",
      );
    }
  };

  React.useEffect(() => {
    const sp: Record<string, string> = Object.fromEntries(
      searchParams.entries(),
    );
    const initialFilters = {
      q: sp.q ?? filters.q,
      status: sp.status ?? filters.status,
      priority: sp.priority ?? filters.priority,
      sortBy: (sp.sortBy as any) ?? (filters as any).sortBy,
      sortDir: (sp.sortDir as any) ?? (filters as any).sortDir,
    } as any;
    const initialPage = sp.page ? Number(sp.page) : page;
    const initialPageSize = sp.pageSize ? Number(sp.pageSize) : pageSize;
    if (sp.pageSize) setPageSize(initialPageSize);
    if (sp.page) setPage(initialPage);
    setFilters(initialFilters);
    fetchTickets({
      filters: initialFilters,
      page: initialPage,
      pageSize: initialPageSize,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortBy = (filters as any).sortBy;
  const sortDir = (filters as any).sortDir;

  React.useEffect(() => {
    const handle = setTimeout(() => {
      fetchTickets({ filters, page: 1, pageSize });
      setPage(1);
    }, 250);
    return () => clearTimeout(handle);
  }, [filters, fetchTickets, pageSize, setPage]);

  React.useEffect(() => {
    const sp = new URLSearchParams();
    if (filters.q) sp.set("q", String(filters.q));
    if (filters.status) sp.set("status", String(filters.status));
    if (filters.priority) sp.set("priority", String(filters.priority));
    if (sortBy) sp.set("sortBy", String(sortBy));
    if (sortDir) sp.set("sortDir", String(sortDir));
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));
    setSearchParams(sp, { replace: true });
  }, [filters, page, pageSize, setSearchParams, sortBy, sortDir]);

  React.useEffect(() => {
    const handler = () => {
      fetchTickets({ filters, page, pageSize });
    };
    window.addEventListener("ticket:read", handler);
    return () => window.removeEventListener("ticket:read", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page, pageSize]);

  const activeTickets =
    tickets?.filter(
      (t: any) => t.status === "OPEN" || t.status === "IN_PROGRESS",
    ) ?? [];
  const resolvedTickets =
    tickets?.filter((t: any) => t.status === "RESOLVED") ?? [];
  const closedTickets =
    tickets?.filter((t: any) => t.status === "CLOSED") ?? [];

  const isAgentOrAdmin = user?.role === "AGENT" || user?.role === "ADMIN";
  const isAgent = user?.role === "AGENT";

  const counts: Record<TabId, number> = {
    active: activeTickets.length,
    resolved: resolvedTickets.length,
    closed: closedTickets.length,
    all: tickets?.length ?? 0,
  };

  const visibleTickets =
    tab === "active"
      ? activeTickets
      : tab === "resolved"
        ? resolvedTickets
        : tab === "closed"
          ? closedTickets
          : (tickets ?? []);

  const TABS: Array<{ id: TabId; label: string }> = [
    { id: "active", label: "Activos" },
    { id: "resolved", label: "Resueltos" },
    { id: "closed", label: "Cerrados" },
    { id: "all", label: "Todos" },
  ];

  const hasFilters =
    !!filters.q ||
    !!filters.status ||
    !!filters.priority ||
    !!(filters as any).category ||
    !!(filters as any).assigneeId;

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground mb-1">
            <span>Workspace</span>
            <ChevronRight size={11} className="opacity-60" />
            <span className="text-foreground">Tickets</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Tickets</h1>
        </div>
        <Button
          size="sm"
          className="h-8 px-3 text-sm"
          onClick={() => navigate("/tickets/new")}
        >
          <Plus size={15} className="mr-1.5" />
          Nuevo ticket
        </Button>
      </div>

      {/* Toolbar: tabs + filtros inline */}
      <div className="border border-border bg-card rounded-lg overflow-hidden">
        {/* Tabs row */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border gap-2">
          <div className="flex items-center gap-1 overflow-x-auto">
            {TABS.map((t) => {
              const active = t.id === tab;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 text-[12.5px] px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                    active
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {t.label}
                  <span className="font-mono text-[10.5px] tabular-nums opacity-70">
                    {counts[t.id]}
                  </span>
                </button>
              );
            })}
          </div>
          <span className="text-[11.5px] text-muted-foreground hidden sm:inline whitespace-nowrap">
            {total} en total
          </span>
        </div>

        {/* Filtros compactos */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border bg-muted/20">
          <div className="relative flex-1 min-w-[180px]">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Buscar tickets…"
              value={filters.q || ""}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              className="w-full pl-8 pr-3 py-1 text-[12.5px] border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <select
            value={filters.priority || ""}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="px-2 py-1 text-[12.5px] border border-border rounded-md bg-background"
          >
            <option value="">Prioridad</option>
            <option value="URGENT">Urgente</option>
            <option value="HIGH">Alta</option>
            <option value="MEDIUM">Media</option>
            <option value="LOW">Baja</option>
          </select>
          <select
            value={(filters as any).category || ""}
            onChange={(e) =>
              setFilters({ ...filters, category: e.target.value } as any)
            }
            className="px-2 py-1 text-[12.5px] border border-border rounded-md bg-background"
          >
            <option value="">Categoría</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {TICKET_CATEGORY_GLYPH[c]} {TICKET_CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
          {isAgentOrAdmin && (
            <select
              value={(filters as any).assigneeId || ""}
              onChange={(e) =>
                setFilters({ ...filters, assigneeId: e.target.value })
              }
              className="px-2 py-1 text-[12.5px] border border-border rounded-md bg-background"
            >
              <option value="">Asignación</option>
              <option value="null">Sin asignar</option>
              <option value={user!.id}>Asignados a mí</option>
            </select>
          )}
          <select
            value={(filters as any).sortDir || "desc"}
            onChange={(e) =>
              setFilters({ ...filters, sortDir: e.target.value as any })
            }
            className="px-2 py-1 text-[12.5px] border border-border rounded-md bg-background"
          >
            <option value="desc">Más recientes</option>
            <option value="asc">Más antiguos</option>
          </select>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11.5px] text-muted-foreground"
              onClick={() => {
                const cleared = {
                  q: "",
                  status: "",
                  priority: "",
                  category: "",
                  sortBy: "createdAt",
                  sortDir: "desc",
                } as any;
                setFilters(cleared);
                setPage(1);
                fetchTickets({ filters: cleared, page: 1, pageSize });
              }}
            >
              Limpiar
            </Button>
          )}
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <TicketCardSkeleton key={i} />
            ))}
          </div>
        ) : !tickets || tickets.length === 0 ? (
          <div className="p-6">
            <TicketsEmptyState
              action={
                <Button onClick={() => navigate("/tickets/new")}>
                  <Plus size={16} className="mr-2" />
                  Crear Primer Ticket
                </Button>
              }
            />
          </div>
        ) : visibleTickets.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            No hay tickets en{" "}
            <span className="font-medium text-foreground">
              {TABS.find((x) => x.id === tab)?.label.toLowerCase()}
            </span>
            .
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/20">
                  <th className="font-medium pl-4 pr-2 py-2 w-0">#</th>
                  <th className="font-medium px-2 py-2 w-0">Estado</th>
                  <th className="font-medium px-2 py-2">Título</th>
                  <th className="font-medium px-2 py-2 w-0 hidden lg:table-cell">
                    Prioridad
                  </th>
                  <th className="font-medium px-2 py-2 w-0 hidden md:table-cell">
                    Solicitante
                  </th>
                  <th className="font-medium px-2 py-2 w-0 hidden xl:table-cell">
                    Asignado
                  </th>
                  <th className="font-medium px-2 py-2 w-0 hidden sm:table-cell">
                    Actualizado
                  </th>
                  <th className="font-medium pl-2 pr-4 py-2 w-0 text-right">
                    {/* acciones */}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleTickets.map((ticket: any) => (
                  <TicketTableRow
                    key={ticket.id}
                    ticket={ticket}
                    onNavigate={(id) => navigate(`/tickets/${id}`)}
                    onClaim={handleClaim}
                    claimingId={claimingId}
                    onReopen={handleReopen}
                    showClaim={isAgent && tab !== "closed" && tab !== "resolved"}
                    showReopen={
                      isAgentOrAdmin && (tab === "resolved" || tab === "closed")
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer con paginación */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] text-muted-foreground">Por página</span>
            <select
              className="px-1.5 py-0.5 border border-border rounded-md text-[11.5px] bg-background"
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                setPageSize(newSize);
                setPage(1);
                fetchTickets({ filters, page: 1, pageSize: newSize });
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          {total > pageSize && (
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] text-muted-foreground hidden sm:inline">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de{" "}
                {total}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[11.5px]"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                ←
              </Button>
              <span className="text-[11.5px] tabular-nums">
                {page}/{Math.ceil(total / pageSize)}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[11.5px]"
                onClick={() =>
                  setPage(Math.min(Math.ceil(total / pageSize), page + 1))
                }
                disabled={page >= Math.ceil(total / pageSize)}
              >
                →
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketsPage;
