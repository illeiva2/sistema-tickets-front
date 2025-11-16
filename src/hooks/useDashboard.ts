import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import { useAuth } from "./useAuth";

interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  urgentTickets: number;
  totalUsers: number;
  activeAgents: number;
  recentActivity: Array<{
    id: string;
    type:
      | "ticket_created"
      | "ticket_updated"
      | "ticket_resolved"
      | "comment_added";
    description: string;
    timestamp: string;
    ticketId?: string;
    userId?: string;
    userName?: string;
  }>;
}

export const useDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchDashboardStats = useCallback(async () => {
    try {
      setIsLoading(true);

      // Endpoint diferenciado según el rol
      let endpoint = "/api/dashboard/stats";
      if (user?.role === "AGENT") {
        endpoint = "/api/dashboard/agent-stats";
      } else if (user?.role === "USER") {
        endpoint = "/api/dashboard/user-stats";
      }

      const response = await api.get(endpoint);
      setStats(response.data.data);
    } catch (error: any) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    console.log("useDashboard useEffect triggered, user:", user?.role);
    if (user) {
      fetchDashboardStats();
    }
  }, [user, fetchDashboardStats]);

  const refreshStats = () => {
    fetchDashboardStats();
  };

  return {
    stats,
    isLoading,
    refreshStats,
  };
};
