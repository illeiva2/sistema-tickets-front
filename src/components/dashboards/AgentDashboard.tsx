import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import {
  ListTodo,
  CheckCircle,
  Clock,
  Inbox,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import type { AgentDashboardData } from "../../types/dashboard";
import { TICKET_PRIORITY_LABEL } from "../../constants/ticketLabels";
import { TicketRow, KpiCard, formatHours } from "./shared";
import NewsSection from "../NewsSection";

const PRIORITY_COLOR: Record<string, string> = {
  LOW: "hsl(var(--priority-low))",
  MEDIUM: "hsl(var(--priority-medium))",
  HIGH: "hsl(var(--priority-high))",
  URGENT: "hsl(var(--priority-urgent))",
};

const AgentDashboard: React.FC<{ data: AgentDashboardData }> = ({ data }) => {
  const { myResolutionTrend, unassignedTickets } = data;

  // Distribución de prioridad de los sin asignar (para "qué me espera").
  const unassignedByPriority = (
    ["LOW", "MEDIUM", "HIGH", "URGENT"] as const
  ).map((k) => ({
    name: TICKET_PRIORITY_LABEL[k],
    value: unassignedTickets.filter((t) => t.priority === k).length,
    color: PRIORITY_COLOR[k],
  }));

  const trendIsEmpty = (myResolutionTrend ?? []).every((p) => p.resolved === 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="En progreso"
          value={data.myInProgressCount}
          tone="blue"
          icon={<ListTodo size={16} className="text-blue-500" />}
        />
        <KpiCard
          label="Resueltos esperando cierre"
          value={data.myResolvedActiveCount}
          tone="amber"
          icon={<CheckCircle size={16} className="text-amber-500" />}
        />
        <KpiCard
          label="Resueltos en el período"
          value={data.resolvedInPeriodCount}
          tone="green"
          icon={<CheckCircle size={16} className="text-emerald-500" />}
        />
        <KpiCard
          label="Tiempo prom. de resolución"
          value={formatHours(data.avgResolutionHours)}
          tone="slate"
          icon={<Clock size={16} className="text-slate-500" />}
          hint="Mis tickets en el período"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp size={15} />
              Mis resoluciones en el período
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendIsEmpty ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                Aún no resolviste tickets en el período.
              </div>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={myResolutionTrend ?? []}>
                    <defs>
                      <linearGradient id="agentResolved" x1="0" y1="0" x2="0" y2="1">
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
                      fill="url(#agentResolved)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Sin asignar por prioridad
            </CardTitle>
          </CardHeader>
          <CardContent>
            {unassignedTickets.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                No hay tickets sin asignar.
              </div>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={unassignedByPriority}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {unassignedByPriority.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
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
            <CardTitle className="text-base flex items-center gap-2">
              <ListTodo size={16} />
              Mi cola
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.myActiveTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tenés tickets asignados activos.
              </p>
            ) : (
              <div className="space-y-1">
                {data.myActiveTickets.map((t) => (
                  <TicketRow key={t.id} ticket={t} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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

        <NewsSection />
      </div>
    </div>
  );
};

export default AgentDashboard;
