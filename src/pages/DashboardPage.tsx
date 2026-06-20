import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui";
import { RefreshCcw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useDashboard } from "../hooks";
import { useAuth } from "../hooks";
import Avatar from "../components/Avatar";
import UserDashboard from "../components/dashboards/UserDashboard";
import AgentDashboard from "../components/dashboards/AgentDashboard";
import AdminDashboard from "../components/dashboards/AdminDashboard";
import TicketsTriagePanel from "../components/TicketsTriagePanel";
import PinnedAnnouncementsBanner from "../components/PinnedAnnouncementsBanner";
import DepartmentResourcesPanel from "../components/DepartmentResourcesPanel";
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

const greetingFor = (date = new Date()): string => {
  const hour = date.getHours();
  if (hour < 12) return "Buen día";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
};

const firstName = (full?: string | null): string => {
  if (!full) return "";
  return full.trim().split(/\s+/)[0] ?? "";
};

const TrendChip: React.FC<{ data: any }> = ({ data }) => {
  // Si es Admin, calcula tendencia de la mitad reciente del periodo vs la primera mitad
  // usando createdVsResolvedTrend. Si no, no muestra nada.
  if (!data || data.role !== "ADMIN" || !Array.isArray(data.createdVsResolvedTrend))
    return null;
  const trend: Array<{ created: number; resolved: number }> = data.createdVsResolvedTrend;
  if (trend.length < 4) return null;

  const half = Math.floor(trend.length / 2);
  const sum = (xs: typeof trend, key: "created" | "resolved") =>
    xs.reduce((acc, t) => acc + (t[key] ?? 0), 0);

  const firstResolved = sum(trend.slice(0, half), "resolved");
  const lastResolved = sum(trend.slice(half), "resolved");
  if (firstResolved === 0 && lastResolved === 0) return null;

  const delta =
    firstResolved === 0
      ? 100
      : Math.round(((lastResolved - firstResolved) / firstResolved) * 100);

  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const tone =
    delta > 0
      ? "text-emerald-700 bg-emerald-50 border-emerald-200/70 dark:text-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800/60"
      : delta < 0
        ? "text-rose-700 bg-rose-50 border-rose-200/70 dark:text-rose-300 dark:bg-rose-950/30 dark:border-rose-800/60"
        : "text-muted-foreground bg-muted border-border";

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11.5px] font-medium border rounded-full px-2 py-0.5 ${tone}`}
      title="Resueltos en la 2da mitad del período vs la 1ra"
    >
      <Icon size={11} />
      {delta > 0 ? "+" : ""}
      {delta}% resueltos
    </span>
  );
};

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<DashboardPeriod>("30d");
  const { data, isLoading, refresh } = useDashboard(period);

  const greeting = useMemo(() => greetingFor(), []);
  const fname = firstName(user?.name);

  const headerSubtitle = (() => {
    if (!user) return "";
    if (user.role === "USER") return "Tu actividad y tickets";
    if (user.role === "AGENT") return "Tu cola de trabajo y tickets disponibles";
    return "Operación general y KPIs del sector";
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Resumen de tickets y métricas del sistema
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="px-3 py-2 text-base"
          onClick={refreshStats}
        >
          <RefreshCcw size={14} className="mr-2" /> Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-lg shadow-sm border-t-4 bg-white dark:bg-slate-950 border-blue-500">
          <CardHeader className="items-center space-y-1 pb-0 px-3 pt-2">
            <Ticket className="h-4 w-4 text-blue-500" />
            <CardTitle className="text-sm font-medium text-center pl-2">
              Tickets Abiertos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-2 px-6 pb-6">
            <div className="text-3xl font-bold tracking-tight" data-testid="dashboard-open-tickets-count">
              {stats?.openTickets || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-sm border-t-4 bg-white dark:bg-slate-950 border-amber-500">
          <CardHeader className="items-center space-y-1 pb-0 px-3 pt-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-sm font-medium text-center pl-2">
              En Progreso
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-2 px-6 pb-6">
            <div className="text-3xl font-bold tracking-tight" data-testid="dashboard-in-progress-tickets-count">
              {stats?.inProgressTickets || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-sm border-t-4 bg-white dark:bg-slate-950 border-green-500">
          <CardHeader className="items-center space-y-1 pb-0 px-3 pt-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <CardTitle className="text-sm font-medium text-center pl-2">
              Resueltos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-2 px-6 pb-6">
            <div className="text-3xl font-bold tracking-tight" data-testid="dashboard-resolved-tickets-count">
              {stats?.resolvedTickets || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-sm border-t-4 bg-white dark:bg-slate-950 border-slate-500">
          <CardHeader className="items-center space-y-1 pb-0 px-3 pt-2">
            <XCircle className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-sm font-medium text-center pl-2">
              Cerrados
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-2 px-6 pb-6">
            <div className="text-3xl font-bold tracking-tight" data-testid="dashboard-closed-tickets-count">
              {stats?.closedTickets || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Estado de Tickets */}
        <Card>
          <CardHeader>
            <CardTitle>Estado de Tickets</CardTitle>
            <CardDescription>Distribución actual de tickets por estado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ticketStatusData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {ticketStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Prioridad (Estimación/Demo) */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Prioridad</CardTitle>
            <CardDescription>Tickets clasificados por nivel de urgencia</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={user?.name} email={user?.email} size={44} />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">
                {greeting}
                {fname ? `, ${fname}` : ""}
              </h1>
              <TrendChip data={data} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {headerSubtitle}
            </p>
          </div>
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

      {/* Banner de avisos destacados (visible para todos los roles) */}
      <PinnedAnnouncementsBanner />

      {/* Panel "Para tu sector": recursos dirigidos al sector del user.
          Solo se renderiza si tiene sector asignado y hay recursos. */}
      <DepartmentResourcesPanel />

      {/* Panel de triage destacado para AGENT/ADMIN */}
      {(user?.role === "AGENT" || user?.role === "ADMIN") && (
        <TicketsTriagePanel />
      )}

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
