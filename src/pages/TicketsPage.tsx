import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  TicketsEmptyState,
  TicketCardSkeleton,
  Button,
} from "@/components/ui";
import { Plus, Search, Filter, AlertTriangle, Eye } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTickets, useAuth } from "../hooks";
import toast from "react-hot-toast";
import api from "../lib/api";

// ─── Helpers de traducción y estilo ───────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Abierto",
  IN_PROGRESS: "En progreso",
  RESOLVED: "Resuelto",
  CLOSED: "Cerrado",
};

const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  URGENT: "Urgente",
};

const PRIORITY_STYLE: Record<string, string> = {
  LOW: "text-green-600 bg-green-50 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
  MEDIUM: "text-yellow-700 bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
  HIGH: "text-orange-600 bg-orange-50 border border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
  URGENT: "text-red-600 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 font-semibold",
};

const STATUS_STYLE: Record<string, string> = {
  OPEN: "text-blue-600 bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
  IN_PROGRESS: "text-purple-600 bg-purple-50 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800",
  RESOLVED: "text-emerald-600 bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
  CLOSED: "text-gray-500 bg-gray-50 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
};

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}

// ─── Fila de ticket compacta ──────────────────────────────────────────────────

function TicketRow({
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

  const wrapClass = [
    "relative flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all cursor-pointer group",
    isUrgent
      ? "border-red-300 bg-red-50/50 hover:bg-red-50 dark:border-red-800 dark:bg-red-950/20 dark:hover:bg-red-950/40"
      : isUnread
        ? "border-blue-300 bg-blue-50/40 hover:bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20 dark:hover:bg-blue-950/40"
        : "border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800",
  ].join(" ");

  const accentClass = [
    "absolute left-0 top-0 bottom-0 w-1 rounded-l-lg",
    isUrgent
      ? "bg-red-500"
      : isUnread
        ? "bg-blue-500"
        : ticket.status === "IN_PROGRESS"
          ? "bg-purple-400"
          : ticket.status === "RESOLVED"
            ? "bg-emerald-400"
            : ticket.status === "CLOSED"
              ? "bg-gray-300 dark:bg-gray-600"
              : "bg-blue-300",
  ].join(" ");

  return (
    <div className={wrapClass} onClick={() => onNavigate(ticket.id)}>
      <div className={accentClass} />

      <div className="flex-1 min-w-0 pl-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-muted-foreground shrink-0">
            #{ticket.ticketNumber?.toString().padStart(5, "0")}
          </span>
          {isUrgent && (
            <AlertTriangle size={13} className="text-red-500 shrink-0" />
          )}
          <span className="font-medium text-sm truncate max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
            {ticket.title}
          </span>
          {isUnread && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-100 border border-blue-300 rounded-full px-1.5 py-0.5 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block animate-pulse" />
              SIN LEER
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
          <span>{ticket.requester?.name || "—"}</span>
          {ticket.assignee && (
            <>
              <span className="opacity-40">·</span>
              <span className="flex items-center gap-1">
                <Eye size={10} />
                {ticket.assignee.name}
              </span>
            </>
          )}
          {!ticket.assignee && ticket.status !== "CLOSED" && (
            <span className="text-amber-500 font-medium">sin asignar</span>
          )}
          <span className="opacity-40">·</span>
          <span>{timeAgo(ticket.createdAt)}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${PRIORITY_STYLE[ticket.priority] || ""}`}>
          {PRIORITY_LABEL[ticket.priority] || ticket.priority}
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_STYLE[ticket.status] || ""}`}>
          {STATUS_LABEL[ticket.status] || ticket.status}
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        {showClaim && !ticket.assignee && (
          <Button
            variant="secondary"
            size="sm"
            disabled={isClaiming}
            className="text-xs h-7 px-2 flex items-center gap-1"
            onClick={() => onClaim?.(ticket.id)}
          >
            {isClaiming ? (
              <>
                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Reclamando...</span>
              </>
            ) : "Reclamar"}
          </Button>
        )}
        {showReopen && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 px-2 text-blue-600 hover:text-blue-700"
            onClick={() => onReopen?.(ticket.id)}
          >
            Reabrir
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-7 px-2"
          onClick={() => onNavigate(ticket.id)}
        >
          Ver →
        </Button>
      </div>
    </div>
  );
}

// ─── Sección de tickets ───────────────────────────────────────────────────────

function TicketSection({
  title,
  count,
  colorClass,
  children,
}: {
  title: string;
  count: number;
  colorClass: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className={`flex items-center gap-2 mb-2 pb-1.5 border-b ${colorClass}`}>
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs font-medium opacity-70 px-1.5 py-0.5 rounded-full bg-current/10">
          {count}
        </span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
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
      toast.error(error.response?.data?.error?.message || "Error al reclamar ticket");
    } finally {
      setClaimingId(null);
    }
  };

  const handleReopen = async (ticketId: string) => {
    const comment = prompt("Proporciona un comentario explicando por qué reabres este ticket:");
    if (!comment?.trim()) {
      toast.error("Debes proporcionar un comentario para reabrir el ticket");
      return;
    }
    try {
      const response = await api.post(`/api/tickets/${ticketId}/reopen`, { comment: comment.trim() });
      if (response.data.success) {
        toast.success("Ticket reabierto correctamente");
        await fetchTickets({ filters, page, pageSize });
      }
    } catch (error: any) {
      toast.error(error instanceof Error ? error.message : "Error al reabrir el ticket");
    }
  };

  React.useEffect(() => {
    const sp: Record<string, string> = Object.fromEntries(searchParams.entries());
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
    fetchTickets({ filters: initialFilters, page: initialPage, pageSize: initialPageSize });
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

  // Escuchar cuando se abre el detalle de un ticket para marcarlo como leído en la lista
  React.useEffect(() => {
    const handler = () => {
      fetchTickets({ filters, page, pageSize });
    };
    window.addEventListener("ticket:read", handler);
    return () => window.removeEventListener("ticket:read", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page, pageSize]);

  const activeTickets = tickets?.filter((t: any) => t.status === "OPEN" || t.status === "IN_PROGRESS") ?? [];
  const resolvedTickets = tickets?.filter((t: any) => t.status === "RESOLVED") ?? [];
  const closedTickets = tickets?.filter((t: any) => t.status === "CLOSED") ?? [];

  const isAgentOrAdmin = user?.role === "AGENT" || user?.role === "ADMIN";
  const isAgent = user?.role === "AGENT";


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tickets</h1>
          <p className="text-sm text-muted-foreground">Gestión y seguimiento de tickets del sistema</p>
        </div>
        <Button size="sm" className="px-2 py-1 text-sm" onClick={() => navigate("/tickets/new")}>
          <Plus size={16} className="mr-2" />
          Nuevo Ticket
        </Button>
      </div>

      <Card>
        <CardHeader className="px-3 pt-2 pb-3">
          <CardTitle className="flex items-center space-x-2 pl-2">
            <Filter size={18} />
            <span className="text-base">Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-48 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar tickets..."
                value={filters.q || ""}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                className="w-full pl-9 pr-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
              />
            </div>
            <select
              value={filters.status || ""}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-2 py-1.5 text-sm border rounded-md text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            >
              <option value="">Todos los estados</option>
              <option value="OPEN">Abierto</option>
              <option value="IN_PROGRESS">En progreso</option>
              <option value="RESOLVED">Resuelto</option>
              <option value="CLOSED">Cerrado</option>
            </select>
            <select
              value={filters.priority || ""}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="px-2 py-1.5 text-sm border rounded-md text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            >
              <option value="">Todas las prioridades</option>
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
              <option value="URGENT">Urgente</option>
            </select>
            <select
              value={(filters as any).sortDir || "desc"}
              onChange={(e) => setFilters({ ...filters, sortDir: e.target.value as any })}
              className="px-2 py-1.5 text-sm border rounded-md text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            >
              <option value="desc">Más recientes</option>
              <option value="asc">Más antiguos</option>
            </select>
            {isAgentOrAdmin && (
              <select
                value={(filters as any).assigneeId || ""}
                onChange={(e) => setFilters({ ...filters, assigneeId: e.target.value })}
                className="px-2 py-1.5 text-sm border rounded-md text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
              >
                <option value="">Cualquier asignación</option>
                <option value="null">Sin asignar</option>
                <option value={user!.id}>Asignados a mí</option>
              </select>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => {
                const cleared = { q: "", status: "", priority: "", sortBy: "createdAt", sortDir: "desc" } as any;
                setFilters(cleared);
                setPage(1);
                fetchTickets({ filters: cleared, page: 1, pageSize });
              }}
            >
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Lista de Tickets</CardTitle>
            <span className="text-xs text-muted-foreground">{total} tickets encontrados</span>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <TicketCardSkeleton key={i} />
              ))}
            </div>
          ) : !tickets || tickets.length === 0 ? (
            <TicketsEmptyState
              action={
                <Button onClick={() => navigate("/tickets/new")}>
                  <Plus size={16} className="mr-2" />
                  Crear Primer Ticket
                </Button>
              }
            />
          ) : (
            <div className="space-y-5">
              {activeTickets.length > 0 && (
                <TicketSection
                  title="Activos"
                  count={activeTickets.length}
                  colorClass="border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400"
                >
                  {activeTickets.map((ticket: any) => (
                    <TicketRow
                      key={ticket.id}
                      ticket={ticket}
                      onNavigate={(id) => navigate(`/tickets/${id}`)}
                      onClaim={handleClaim}
                      claimingId={claimingId}
                      showClaim={isAgent}
                      showReopen={false}
                    />
                  ))}
                </TicketSection>
              )}

              {resolvedTickets.length > 0 && (
                <TicketSection
                  title="Resueltos"
                  count={resolvedTickets.length}
                  colorClass="border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
                >
                  {resolvedTickets.map((ticket: any) => (
                    <TicketRow
                      key={ticket.id}
                      ticket={ticket}
                      onNavigate={(id) => navigate(`/tickets/${id}`)}
                      claimingId={claimingId}
                      showClaim={false}
                      showReopen={isAgentOrAdmin}
                      onReopen={handleReopen}
                    />
                  ))}
                </TicketSection>
              )}

              {closedTickets.length > 0 && (
                <TicketSection
                  title="Cerrados"
                  count={closedTickets.length}
                  colorClass="border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400"
                >
                  {closedTickets.map((ticket: any) => (
                    <TicketRow
                      key={ticket.id}
                      ticket={ticket}
                      onNavigate={(id) => navigate(`/tickets/${id}`)}
                      claimingId={claimingId}
                      showClaim={false}
                      showReopen={isAgentOrAdmin}
                      onReopen={handleReopen}
                    />
                  ))}
                </TicketSection>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-5 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Por página:</span>
              <select
                className="px-2 py-1 border rounded-md text-xs dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
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
                <span className="text-xs text-muted-foreground">
                  {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}
                </span>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
                  ← Anterior
                </Button>
                <span className="text-xs">Pág. {page}/{Math.ceil(total / pageSize)}</span>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPage(Math.min(Math.ceil(total / pageSize), page + 1))} disabled={page >= Math.ceil(total / pageSize)}>
                  Siguiente →
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TicketsPage;
