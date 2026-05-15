import React from "react";
import { Card, CardHeader, CardTitle, CardContent, Badge } from "@/components/ui";
import {
  Inbox,
  AlertTriangle,
  Clock,
  Repeat,
  TrendingUp,
  AlarmClock,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import type { AdminDashboardData } from "../../types/dashboard";
import { TicketRow, KpiCard, formatHours, formatPercent } from "./shared";
import NewsSection from "../NewsSection";
import {
  TICKET_PRIORITY_LABEL,
  TICKET_STATUS_LABEL,
} from "../../constants/ticketLabels";

const PRIORITY_COLOR: Record<string, string> = {
  LOW: "#22C55E",
  MEDIUM: "#EAB308",
  HIGH: "#F97316",
  URGENT: "#EF4444",
};

const AdminDashboard: React.FC<{ data: AdminDashboardData }> = ({ data }) => {
  const priorityChartData = (
    ["LOW", "MEDIUM", "HIGH", "URGENT"] as const
  ).map((k) => ({
    name: TICKET_PRIORITY_LABEL[k],
    value: data.byPriority[k],
    color: PRIORITY_COLOR[k],
  }));

  return (
    <div className="space-y-6">
      {/* KPIs operativos: estados (4) + alertas (3) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Abiertos"
          value={data.totalsByStatus.OPEN}
          tone="blue"
        />
        <KpiCard
          label="En progreso"
          value={data.totalsByStatus.IN_PROGRESS}
          tone="amber"
        />
        <KpiCard
          label="Resueltos"
          value={data.totalsByStatus.RESOLVED}
          tone="green"
        />
        <KpiCard
          label="Cerrados"
          value={data.totalsByStatus.CLOSED}
          tone="slate"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label="Sin asignar"
          value={data.unassignedCount}
          tone={data.unassignedCount > 0 ? "amber" : "default"}
          icon={<Inbox size={16} className="text-amber-500" />}
        />
        <KpiCard
          label="Urgentes activos"
          value={data.urgentActiveCount}
          tone={data.urgentActiveCount > 0 ? "red" : "default"}
          icon={
            <AlertTriangle
              size={16}
              className={data.urgentActiveCount > 0 ? "text-red-500" : "text-muted-foreground"}
            />
          }
        />
        <KpiCard
          label="Vencidos por SLA"
          value={data.overdueCount ?? 0}
          tone={(data.overdueCount ?? 0) > 0 ? "red" : "default"}
          icon={
            <AlarmClock
              size={16}
              className={(data.overdueCount ?? 0) > 0 ? "text-red-500" : "text-muted-foreground"}
            />
          }
          hint="Activos con dueAt vencido"
        />
      </div>

      {/* KPIs sectoriales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label="Tiempo prom. de respuesta"
          value={formatHours(data.avgResponseHours)}
          icon={<Clock size={16} className="text-blue-500" />}
          hint="De creación a primera asignación"
        />
        <KpiCard
          label="Tiempo prom. de resolución"
          value={formatHours(data.avgResolutionHours)}
          icon={<Clock size={16} className="text-emerald-500" />}
          hint="De creación a resolución"
        />
        <KpiCard
          label="Tasa de reapertura"
          value={formatPercent(data.reopenRate)}
          icon={<Repeat size={16} className="text-orange-500" />}
          hint="Reabiertos / resueltos en el período"
        />
      </div>

      {/* Tendencia + prioridad */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp size={16} />
              Creados vs resueltos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.createdVsResolvedTrend}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    fontSize={11}
                    tickFormatter={(d: string) => d.slice(5)}
                  />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="created"
                    name="Creados"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="resolved"
                    name="Resueltos"
                    stroke="#22C55E"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Activos por prioridad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
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
          </CardContent>
        </Card>
      </div>

      {/* Carga por agente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Carga por agente</CardTitle>
        </CardHeader>
        <CardContent>
          {data.agentsLoad.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay agentes activos.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground uppercase">
                    <th className="py-2 pr-4">Agente</th>
                    <th className="py-2 pr-4">Activos</th>
                    <th className="py-2 pr-4">Resueltos en período</th>
                    <th className="py-2 pr-4">Prom. resolución</th>
                  </tr>
                </thead>
                <tbody>
                  {data.agentsLoad.map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="py-2 pr-4">
                        <div className="font-medium">{a.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {a.email}
                        </div>
                      </td>
                      <td className="py-2 pr-4 font-medium">{a.activeCount}</td>
                      <td className="py-2 pr-4">{a.resolvedInPeriod}</td>
                      <td className="py-2 pr-4">
                        {formatHours(a.avgResolutionHours)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vencidos por SLA */}
        {(data.overdueCount ?? 0) > 0 && (
          <Card className="border-red-200/70 dark:border-red-900/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-red-700 dark:text-red-300">
                <AlarmClock size={16} />
                Vencidos por SLA (top 10)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {(data.overdueTickets ?? []).map((t) => (
                  <TicketRow key={t.id} ticket={t} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sin asignar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Inbox size={16} />
              Sin asignar (top 10)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.unassignedTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay tickets sin asignar.
              </p>
            ) : (
              <div className="space-y-1">
                {data.unassignedTickets.map((t) => (
                  <TicketRow key={t.id} ticket={t} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top requesters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Top reportadores en el período
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topRequesters.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todavía no hay tickets en el período.
              </p>
            ) : (
              <div className="space-y-1">
                {data.topRequesters.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {u.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {u.email}
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {u.count}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <NewsSection />
      </div>

      {/* Status legend (visual hint) */}
      <p className="text-xs text-muted-foreground text-center">
        Estados:{" "}
        {(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const)
          .map((s) => `${TICKET_STATUS_LABEL[s]} (${data.totalsByStatus[s]})`)
          .join(" · ")}
      </p>
    </div>
  );
};

export default AdminDashboard;
