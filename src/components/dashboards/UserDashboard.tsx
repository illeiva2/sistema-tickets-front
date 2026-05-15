import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import {
  Ticket,
  AlertCircle,
  Clock,
  ListChecks,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  AreaChart,
  Area,
  PieChart,
  Pie,
} from "recharts";
import type { UserDashboardData } from "../../types/dashboard";
import {
  TICKET_PRIORITY_LABEL,
  TICKET_STATUS_LABEL,
} from "../../constants/ticketLabels";
import { TicketRow, KpiCard, formatHours } from "./shared";
import NewsSection from "../NewsSection";

const PRIORITY_COLOR: Record<string, string> = {
  LOW: "hsl(var(--priority-low))",
  MEDIUM: "hsl(var(--priority-medium))",
  HIGH: "hsl(var(--priority-high))",
  URGENT: "hsl(var(--priority-urgent))",
};

const STATUS_COLOR: Record<string, string> = {
  OPEN: "hsl(var(--status-open))",
  IN_PROGRESS: "hsl(var(--status-progress))",
  RESOLVED: "hsl(var(--status-resolved))",
  CLOSED: "hsl(var(--status-closed))",
};

const UserDashboard: React.FC<{ data: UserDashboardData }> = ({ data }) => {
  const { myActiveByPriority, myStatusBreakdown, myResolutionTrend } = data;
  const urgent = myActiveByPriority.URGENT;

  const priorityChartData = (
    ["LOW", "MEDIUM", "HIGH", "URGENT"] as const
  ).map((k) => ({
    name: TICKET_PRIORITY_LABEL[k],
    value: myActiveByPriority[k],
    color: PRIORITY_COLOR[k],
  }));

  const statusChartData = (
    ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const
  )
    .map((k) => ({
      name: TICKET_STATUS_LABEL[k],
      value: myStatusBreakdown?.[k] ?? 0,
      color: STATUS_COLOR[k],
    }))
    .filter((d) => d.value > 0);

  const totalLifetime =
    (myStatusBreakdown?.OPEN ?? 0) +
    (myStatusBreakdown?.IN_PROGRESS ?? 0) +
    (myStatusBreakdown?.RESOLVED ?? 0) +
    (myStatusBreakdown?.CLOSED ?? 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Mis tickets activos"
          value={data.myActiveCount}
          tone="blue"
          icon={<Ticket size={16} className="text-blue-500" />}
        />
        <KpiCard
          label="Urgentes propios"
          value={urgent}
          tone={urgent > 0 ? "red" : "default"}
          icon={
            <AlertCircle
              size={16}
              className={
                urgent > 0 ? "text-red-500" : "text-muted-foreground"
              }
            />
          }
        />
        <KpiCard
          label="Esperando que cierre"
          value={data.myResolvedPendingClose.length}
          tone={data.myResolvedPendingClose.length > 0 ? "amber" : "default"}
          icon={<ListChecks size={16} className="text-amber-500" />}
          hint="Resueltos por el equipo"
        />
        <KpiCard
          label="Tiempo prom. de resolución"
          value={formatHours(data.avgResolutionHours)}
          tone="green"
          icon={<Clock size={16} className="text-emerald-500" />}
          hint="Mis tickets en el período"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie de status (todos los míos) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Mis tickets por estado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusChartData.length === 0 || totalLifetime === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                Aún no creaste tickets.
              </div>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={80}
                      paddingAngle={2}
                      label={(entry: any) => entry.value}
                    >
                      {statusChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: any) => [value, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center -mt-2">
                  {statusChartData.map((d) => (
                    <span
                      key={d.name}
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: d.color }}
                      />
                      {d.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bar de prioridad (activos) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Activos por prioridad
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.myActiveCount === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                No tenés tickets activos.
              </div>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {priorityChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trend de resoluciones */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp size={15} />
              Resoluciones en el período
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(myResolutionTrend ?? []).every((p) => p.resolved === 0) ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                Aún no hay resoluciones en el período.
              </div>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={myResolutionTrend ?? []}>
                    <defs>
                      <linearGradient id="userResolved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--status-resolved))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--status-resolved))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      fontSize={10}
                      tickFormatter={(d: string) => d.slice(5)}
                    />
                    <YAxis fontSize={10} allowDecimals={false} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="resolved"
                      name="Resueltos"
                      stroke="hsl(var(--status-resolved))"
                      strokeWidth={2}
                      fill="url(#userResolved)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Listas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Esperando tu confirmación
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.myResolvedPendingClose.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tenés tickets resueltos esperando confirmación.
              </p>
            ) : (
              <div className="space-y-1">
                {data.myResolvedPendingClose.map((t) => (
                  <TicketRow key={t.id} ticket={t} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mis tickets recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {data.myRecentTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todavía no creaste tickets.
              </p>
            ) : (
              <div className="space-y-1">
                {data.myRecentTickets.map((t) => (
                  <TicketRow key={t.id} ticket={t} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <NewsSection />
      </div>
    </div>
  );
};

export default UserDashboard;
