import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import { useAuth } from "./useAuth";
import type { DashboardData, DashboardPeriod } from "../types/dashboard";

export const useDashboard = (period: DashboardPeriod = "30d") => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/api/dashboard?period=${period}`);
      setData(response.data.data as DashboardData);
    } catch (error: any) {
      console.error("Error fetching dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (user) fetchDashboard();
  }, [user, fetchDashboard]);

  return {
    data,
    isLoading,
    refresh: fetchDashboard,
  };
};
