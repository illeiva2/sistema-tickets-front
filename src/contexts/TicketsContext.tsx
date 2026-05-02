import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import api from "../lib/api";
import toast from "react-hot-toast";

interface Ticket {
  id: string;
  ticketNumber: number;
  title: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  category?: "SOFTWARE" | "HARDWARE" | "RED" | "ERP" | "OTRO" | null;
  isRead: boolean;
  requesterId: string;
  assigneeId?: string;
  dueAt?: string | null;
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
  category?: string;
  requesterId?: string;
  assigneeId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: string;
}

interface FetchOverrides {
  filters?: TicketFilters;
  page?: number;
  pageSize?: number;
}

interface TicketsContextValue {
  tickets: Ticket[];
  isLoading: boolean;
  total: number;
  page: number;
  pageSize: number;
  filters: TicketFilters;
  fetchTickets: (overrides?: FetchOverrides) => Promise<void>;
  createTicket: (ticketData: {
    title: string;
    description: string;
    priority: string;
    category?: string;
  }) => Promise<Ticket>;
  updateTicket: (id: string, updates: Partial<Ticket>) => Promise<Ticket>;
  deleteTicket: (id: string) => Promise<void>;
  getTicketById: (id: string) => Promise<Ticket | null>;
  addComment: (ticketId: string, message: string) => Promise<any>;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setFilters: (filters: TicketFilters) => void;
}

const TicketsContext = createContext<TicketsContextValue | null>(null);

export const TicketsProvider = ({ children }: { children: ReactNode }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<TicketFilters>({});

  const fetchTickets = useCallback(
    async (overrides?: FetchOverrides) => {
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
      // Intencionalmente no dependemos de filters/page/pageSize para evitar
      // cambiar la identidad de fetchTickets en cada render.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [],
  );

  const createTicket = useCallback(
    async (ticketData: {
      title: string;
      description: string;
      priority: string;
      category?: string;
    }) => {
      try {
        setIsLoading(true);
        const response = await api.post("/api/tickets", ticketData);
        const newTicket = response.data.data;

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
        const ticket = response.data.data;
        if (ticket) {
          // Marcar como leído en el state compartido (si está en la lista
          // actual). Antes lo hacíamos via window.dispatchEvent + listener
          // en otras instancias del hook; ahora la lista es única.
          setTickets((prev) =>
            prev.map((t) => (t.id === id ? { ...t, isRead: true } : t)),
          );
        }
        return ticket;
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
      const errMessage =
        error.response?.data?.error?.message || "Error al agregar comentario";
      toast.error(errMessage);
      throw error;
    }
  }, []);

  const value: TicketsContextValue = {
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

  return (
    <TicketsContext.Provider value={value}>{children}</TicketsContext.Provider>
  );
};

export const useTickets = (): TicketsContextValue => {
  const ctx = useContext(TicketsContext);
  if (!ctx) {
    throw new Error("useTickets must be used within a TicketsProvider");
  }
  return ctx;
};
