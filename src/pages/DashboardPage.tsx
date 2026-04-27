import React, { useState } from "react";
import { Button } from "@/components/ui";
import { RefreshCcw } from "lucide-react";
import { useDashboard } from "../hooks";
import { useAuth } from "../hooks";
import UserDashboard from "../components/dashboards/UserDashboard";
import AgentDashboard from "../components/dashboards/AgentDashboard";
import AdminDashboard from "../components/dashboards/AdminDashboard";
import type { DashboardPeriod } from "../types/dashboard";

const PERIOD_OPTIONS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" },
  { value: "year", label: "Este año" },
];

const SkeletonGrid: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="h-64 bg-muted rounded-lg animate-pulse" />
      <div className="h-64 bg-muted rounded-lg animate-pulse" />
    </div>
  </div>
);

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<DashboardPeriod>("30d");
  const { data, isLoading, refresh } = useDashboard(period);

  const headerSubtitle = (() => {
    if (!user) return "";
    if (user.role === "USER") return "Tu actividad y tickets";
    if (user.role === "AGENT") return "Tu cola de trabajo y tickets disponibles";
    return "Operación general y KPIs del sector";
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">{headerSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as DashboardPeriod)}
            className="px-3 py-2 border rounded-md text-sm dark:bg-gray-800 dark:border-gray-700"
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isLoading}
          >
            <RefreshCcw size={14} className="mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {isLoading || !data ? (
        <SkeletonGrid />
      ) : data.role === "USER" ? (
        <UserDashboard data={data} />
      ) : data.role === "AGENT" ? (
        <AgentDashboard data={data} />
      ) : (
        <AdminDashboard data={data} />
      )}
    </div>
  );
};

export default DashboardPage;
