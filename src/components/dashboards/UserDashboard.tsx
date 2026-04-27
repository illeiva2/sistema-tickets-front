import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { Ticket, AlertCircle, Clock, ListChecks } from "lucide-react";
import type { UserDashboardData } from "../../types/dashboard";
import { TicketRow, KpiCard, formatHours } from "./shared";

const UserDashboard: React.FC<{ data: UserDashboardData }> = ({ data }) => {
  const { myActiveByPriority } = data;
  const urgent = myActiveByPriority.URGENT;

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
          icon={<AlertCircle size={16} className={urgent > 0 ? "text-red-500" : "text-muted-foreground"} />}
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
      </div>
    </div>
  );
};

export default UserDashboard;
