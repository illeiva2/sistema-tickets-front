import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { ListTodo, CheckCircle, Clock, Inbox } from "lucide-react";
import type { AgentDashboardData } from "../../types/dashboard";
import { TicketRow, KpiCard, formatHours } from "./shared";

const AgentDashboard: React.FC<{ data: AgentDashboardData }> = ({ data }) => {
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
      </div>
    </div>
  );
};

export default AgentDashboard;
