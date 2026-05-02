export type DashboardPeriod = "7d" | "30d" | "90d" | "year";

export interface DashboardTicket {
  id: string;
  ticketNumber: number;
  title: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  category?: "SOFTWARE" | "HARDWARE" | "RED" | "ERP" | "OTRO" | null;
  isRead: boolean;
  dueAt?: string | null;
  createdAt: string;
  updatedAt: string;
  requester: { id: string; name: string; email: string };
  assignee: { id: string; name: string; email: string } | null;
}

export interface UserDashboardData {
  role: "USER";
  period: DashboardPeriod;
  myActiveCount: number;
  myActiveByPriority: { LOW: number; MEDIUM: number; HIGH: number; URGENT: number };
  myStatusBreakdown: { OPEN: number; IN_PROGRESS: number; RESOLVED: number; CLOSED: number };
  myResolvedPendingClose: DashboardTicket[];
  myRecentTickets: DashboardTicket[];
  avgResolutionHours: number | null;
  myResolutionTrend: Array<{ date: string; resolved: number }>;
}

export interface AgentDashboardData {
  role: "AGENT";
  period: DashboardPeriod;
  myInProgressCount: number;
  myResolvedActiveCount: number;
  resolvedInPeriodCount: number;
  myActiveTickets: DashboardTicket[];
  unassignedTickets: DashboardTicket[];
  avgResolutionHours: number | null;
  myResolutionTrend: Array<{ date: string; resolved: number }>;
}

export interface AgentLoadRow {
  id: string;
  name: string;
  email: string;
  activeCount: number;
  resolvedInPeriod: number;
  avgResolutionHours: number | null;
}

export interface AdminDashboardData {
  role: "ADMIN";
  period: DashboardPeriod;
  totalsByStatus: { OPEN: number; IN_PROGRESS: number; RESOLVED: number; CLOSED: number };
  byPriority: { LOW: number; MEDIUM: number; HIGH: number; URGENT: number };
  unassignedCount: number;
  urgentActiveCount: number;
  overdueCount: number;
  overdueTickets: DashboardTicket[];
  unassignedTickets: DashboardTicket[];
  avgResponseHours: number | null;
  avgResolutionHours: number | null;
  reopenRate: number | null;
  agentsLoad: AgentLoadRow[];
  createdVsResolvedTrend: Array<{ date: string; created: number; resolved: number }>;
  topRequesters: Array<{ id: string; name: string; email: string; count: number }>;
}

export type DashboardData =
  | UserDashboardData
  | AgentDashboardData
  | AdminDashboardData;
