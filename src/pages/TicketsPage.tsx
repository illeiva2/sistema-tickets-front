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
import { Plus, Search, Filter } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTickets, useAuth } from "../hooks";
import toast from "react-hot-toast";
import api from "../lib/api";

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

  // Función para reabrir un ticket
  const handleReopenTicket = async (ticketId: string) => {
    try {
      const comment = prompt(
        "Por favor, proporciona un comentario explicando por qué reabres este ticket:",
      );
      if (!comment || comment.trim() === "") {
        toast.error("Debes proporcionar un comentario para reabrir el ticket");
        return;
      }

      // Llamar a la API para reabrir el ticket
      const response = await api.post(`/api/tickets/${ticketId}/reopen`, {
        comment: comment.trim(),
      });

      if (response.data.success) {
        toast.success("Ticket reabierto correctamente");

        // Recargar los tickets para reflejar el cambio
        await fetchTickets({ filters, page, pageSize });
      } else {
        throw new Error(
          response.data.error?.message || "Error al reabrir el ticket",
        );
      }
    } catch (error) {
      console.error("Error reopening ticket:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al reabrir el ticket",
      );
    }
  };

  // Cargar tickets al montar y refetch con debounce cuando cambian filtros
  React.useEffect(() => {
    // Inicializar desde URL si hay parámetros
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

  // Extraer valores de filtros para evitar expresiones complejas en useEffect
  const sortBy = (filters as any).sortBy;
  const sortDir = (filters as any).sortDir;

  React.useEffect(() => {
    const handle = setTimeout(() => {
      fetchTickets({ filters, page: 1, pageSize });
      setPage(1);
    }, 250);
    return () => clearTimeout(handle);
  }, [filters, fetchTickets, pageSize, setPage]);

  // Sincronizar URL con estado
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

  // No early return on loading to preserve input focus

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tickets</h1>
          <p className="text-sm text-muted-foreground">
            Gestión y seguimiento de tickets del sistema
          </p>
        </div>
        <Button
          size="sm"
          className="px-2 py-1 text-sm"
          onClick={() => navigate("/tickets/new")}
        >
          <Plus size={16} className="mr-2" />
          Nuevo Ticket
        </Button>
      </div>

      {/* Filtros básicos */}
      <Card>
        <CardHeader className="px-3 pt-2 pb-3">
          <CardTitle className="flex items-center space-x-2 pl-2">
            <Filter size={18} />
            <span className="text-base">Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Buscar tickets..."
                value={filters.q || ""}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <select
              value={filters.status || ""}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="px-3 py-2 border rounded-md dark:text-gray-400 text-gray-5000 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todos los estados</option>
              <option value="OPEN">Abierto</option>
              <option value="IN_PROGRESS">En progreso</option>
              <option value="RESOLVED">Resuelto</option>
              <option value="CLOSED">Cerrado</option>
            </select>
            <select
              value={filters.priority || ""}
              onChange={(e) =>
                setFilters({ ...filters, priority: e.target.value })
              }
              className="px-3 py-2 border rounded-md dark:text-gray-400 text-gray-5000 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Todas las prioridades</option>
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
              <option value="URGENT">Urgente</option>
            </select>
            {/* Orden */}
            <select
              value={(filters as any).sortBy || "createdAt"}
              onChange={(e) =>
                setFilters({ ...filters, sortBy: e.target.value as any })
              }
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 dark:text-gray-400 text-gray-5000 focus:ring-primary"
            >
              <option value="createdAt">Fecha creación</option>
              <option value="updatedAt">Fecha actualización</option>
              <option value="title">Título</option>
              <option value="priority">Prioridad</option>
              <option value="status">Estado</option>
            </select>
            <select
              value={(filters as any).sortDir || "desc"}
              onChange={(e) =>
                setFilters({ ...filters, sortDir: e.target.value as any })
              }
              className="px-3 py-2 border rounded-md dark:text-gray-400 text-gray-5000 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>

            <Button
              variant="outline"
              onClick={() => {
                const cleared = {
                  q: "",
                  status: "",
                  priority: "",
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
          </div>
        </CardContent>
      </Card>

      {/* Lista de tickets */}
      <Card>
        <CardHeader className="px-3 pt-2 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="pl-2 text-base px-2">
              Lista de Tickets
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {total} tickets encontrados
            </span>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
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
            <div className="space-y-6">
              {/* Tickets Abiertos */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-blue-600 border-b border-blue-200 pb-2">
                  Tickets Abiertos (
                  {tickets.filter((t) => t.status !== "CLOSED").length})
                </h3>
                <div className="space-y-3">
                  {tickets
                    .filter((ticket) => ticket.status !== "CLOSED")
                    .map((ticket) => (
                      <div
                        key={ticket.id}
                        className="border rounded-lg p-3 hover:shadow-md transition-shadow bg-white"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold text-lg">
                                #
                                {ticket.ticketNumber
                                  ?.toString()
                                  .padStart(5, "0")}{" "}
                                - {ticket.title}
                              </h3>
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  ticket.priority === "URGENT"
                                    ? "bg-red-500 text-white"
                                    : ticket.priority === "HIGH"
                                      ? "bg-orange-500 text-white"
                                      : ticket.priority === "MEDIUM"
                                        ? "bg-yellow-500 text-white"
                                        : "bg-green-500 text-white"
                                }`}
                              >
                                {ticket.priority}
                              </span>
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  ticket.status === "OPEN"
                                    ? "bg-blue-500 text-white"
                                    : ticket.status === "IN_PROGRESS"
                                      ? "bg-purple-500 text-white"
                                      : ticket.status === "RESOLVED"
                                        ? "bg-green-500 text-white"
                                        : "bg-gray-500 text-white"
                                }`}
                              >
                                {ticket.status}
                              </span>
                            </div>
                            <p className="text-muted-foreground mb-3">
                              {ticket.description}
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span>
                                Solicitante: {ticket.requester?.name || "N/A"}
                              </span>
                              {ticket.assignee && (
                                <span>Asignado a: {ticket.assignee.name}</span>
                              )}
                              <span>
                                Creado:{" "}
                                {new Date(
                                  ticket.createdAt,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/tickets/${ticket.id}`)}
                            >
                              Ver Detalle
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Tickets Cerrados */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-600 border-b border-gray-200 pb-2">
                  Tickets Cerrados (
                  {tickets.filter((t) => t.status === "CLOSED").length})
                </h3>
                <div className="space-y-2">
                  {tickets
                    .filter((ticket) => ticket.status === "CLOSED")
                    .map((ticket) => (
                      <div
                        key={ticket.id}
                        className="border rounded-lg p-3 hover:shadow-sm transition-shadow bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-medium text-base">
                                #
                                {ticket.ticketNumber
                                  ?.toString()
                                  .padStart(5, "0")}{" "}
                                - {ticket.title}
                              </h4>
                              <span className="px-2 py-1 text-xs rounded-full bg-gray-500 text-white">
                                {ticket.status}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span>
                                Solicitante: {ticket.requester?.name || "N/A"}
                              </span>
                              <span>
                                Cerrado:{" "}
                                {new Date(
                                  ticket.updatedAt,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/tickets/${ticket.id}`)}
                            >
                              Ver Detalle
                            </Button>
                            {/* Solo mostrar botón Reabrir para AGENT y ADMIN */}
                            {(user?.role === "AGENT" ||
                              user?.role === "ADMIN") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReopenTicket(ticket.id)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                Reabrir
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Tamaño y paginación */}
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                Items por página:
              </span>
              <select
                className="px-2 py-1 border rounded-md text-sm"
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
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground mr-4">
                  Mostrando {(page - 1) * pageSize + 1} a{" "}
                  {Math.min(page * pageSize, total)} de {total} tickets
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  <span className="px-3 py-1 text-sm">
                    Página {page} de {Math.ceil(total / pageSize)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage(Math.min(Math.ceil(total / pageSize), page + 1))
                    }
                    disabled={page >= Math.ceil(total / pageSize)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TicketsPage;
