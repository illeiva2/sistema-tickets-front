import { useState, useCallback } from "react";
import api from "../lib/api";
import toast from "react-hot-toast";

interface Ticket {
  id: string;
  ticketNumber: number;
  title: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  requesterId: string;
  assigneeId?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  requester: {
    id: string;
    name: string;
    email: string;
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
}

interface TicketFilters {
  q?: string;
  status?: string;
  priority?: string;
  requesterId?: string;
  assigneeId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: string;
}

// API actual devuelve { data: Ticket[], pagination: {...} }

export const useTickets = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<TicketFilters>({});

  type FetchOverrides = {
    filters?: TicketFilters;
    page?: number;
    pageSize?: number;
  };
  const fetchTickets = useCallback(async (overrides?: FetchOverrides) => {
    try {
      setIsLoading(true);
      const currentFilters = overrides?.filters ?? filters;
      const currentPage = overrides?.page ?? page;
      const currentPageSize = overrides?.pageSize ?? pageSize;
      const params = new URLSearchParams();

      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.append(key, String(value));
        }
      });

      params.append("page", String(currentPage));
      params.append("pageSize", String(currentPageSize));

      const response = await api.get(`/api/tickets?${params.toString()}`);
      // La API devuelve { success, data: { data: Ticket[], pagination: {...} } }
      const payload = response.data?.data || {};
      const list: Ticket[] = payload.data || [];
      const pagination = payload.pagination || {};

      setTickets(Array.isArray(list) ? list : []);
      setTotal(typeof pagination.total === "number" ? pagination.total : 0);
      setPage(
        typeof pagination.page === "number" ? pagination.page : currentPage,
      );
      setPageSize(
        typeof pagination.pageSize === "number"
          ? pagination.pageSize
          : currentPageSize,
      );
    } catch (error: any) {
      const message =
        error.response?.data?.error?.message || "Error al cargar tickets";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
    // Intencionalmente no dependemos de filters/page/pageSize para evitar cambiar la identidad
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createTicket = useCallback(
    async (ticketData: {
      title: string;
      description: string;
      priority: string;
    }) => {
      try {
        setIsLoading(true);
        const response = await api.post("/api/tickets", ticketData);
        const newTicket = response.data.data;

        // Agregar el nuevo ticket al inicio de la lista
        setTickets((prev) => [newTicket, ...prev]);
        setTotal((prev) => prev + 1);

        toast.success("Ticket creado exitosamente");
        return newTicket;
      } catch (error: any) {
        const message =
          error.response?.data?.error?.message || "Error al crear ticket";
        toast.error(message);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const updateTicket = useCallback(
    async (id: string, updates: Partial<Ticket>) => {
      try {
        setIsLoading(true);
        const response = await api.patch(`/api/tickets/${id}`, updates);
        const updatedTicket = response.data.data;

        // Actualizar el ticket en la lista
        setTickets((prev) =>
          prev.map((ticket) => (ticket.id === id ? updatedTicket : ticket)),
        );

        toast.success("Ticket actualizado exitosamente");
        return updatedTicket;
      } catch (error: any) {
        const message =
          error.response?.data?.error?.message || "Error al actualizar ticket";
        toast.error(message);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const deleteTicket = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      await api.delete(`/api/tickets/${id}`);

      // Remover el ticket de la lista
      setTickets((prev) => prev.filter((ticket) => ticket.id !== id));
      setTotal((prev) => prev - 1);

      toast.success("Ticket eliminado exitosamente");
    } catch (error: any) {
      const message =
        error.response?.data?.error?.message || "Error al eliminar ticket";
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTicketById = useCallback(
    async (id: string): Promise<Ticket | null> => {
      try {
        const response = await api.get(`/api/tickets/${id}`);
        return response.data.data;
      } catch (error: any) {
        const message =
          error.response?.data?.error?.message || "Error al cargar ticket";
        toast.error(message);
        return null;
      }
    },
    [],
  );

  const addComment = useCallback(async (ticketId: string, message: string) => {
    try {
      const response = await api.post(`/api/tickets/${ticketId}/comments`, {
        message,
      });
      const newComment = response.data.data;
      // Actualizar ticket en memoria si está cargado en la lista (opcional)
      setTickets((prev) =>
        prev.map((t) => {
          if (t.id !== ticketId) return t;
          const comments = (t as any).comments
            ? [...(t as any).comments, newComment]
            : [newComment];
          return { ...(t as any), comments } as any;
        }),
      );
      return newComment;
    } catch (error: any) {
      const message =
        error.response?.data?.error?.message || "Error al agregar comentario";
      toast.error(message);
      throw error;
    }
  }, []);

  // No auto-fetch: controlado desde las páginas para evitar bucles y pérdidas de foco

  return {
    tickets,
    isLoading,
    total,
    page,
    pageSize,
    filters,
    fetchTickets,
    createTicket,
    updateTicket,
    deleteTicket,
    getTicketById,
    addComment,
    setPage,
    setPageSize,
    setFilters,
  };
};
