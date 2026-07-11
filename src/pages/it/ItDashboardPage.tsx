import React from "react";
import {
  Activity,
  AlertTriangle,
  Radar,
  ShieldCheck,
  Smartphone,
  Ticket,
  Wrench,
} from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
} from "@/components/ui";

/**
 * Panel IT — dashboard único de la sección Gestión IT (AGENT/ADMIN).
 * Por ahora es el esqueleto de los 6 widgets del diseño: cada uno muestra
 * datos placeholder hasta que exista `GET /it-dashboard/summary`.
 */

interface WidgetCardProps {
  icon: React.ReactNode;
  title: string;
  caption: string;
  children: React.ReactNode;
}

const WidgetCard: React.FC<WidgetCardProps> = ({
  icon,
  title,
  caption,
  children,
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <span className="text-muted-foreground" aria-hidden>
        {icon}
      </span>
    </CardHeader>
    <CardContent>
      {children}
      <p className="mt-3 text-xs text-muted-foreground">{caption}</p>
    </CardContent>
  </Card>
);

const PlaceholderValue: React.FC<{ suffix?: string }> = ({ suffix }) => (
  <div className="flex items-baseline gap-1.5">
    <span className="text-2xl font-bold text-muted-foreground">—</span>
    {suffix && (
      <span className="text-sm text-muted-foreground">{suffix}</span>
    )}
  </div>
);

const ItDashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Encabezado estilo terminal */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Panel IT</h1>
          <Badge variant="secondary">En preparación</Badge>
        </div>
        <p className="mt-2 font-mono text-xs text-muted-foreground sm:text-sm">
          &gt; PANEL EN PREPARACIÓN — LOS WIDGETS SE CONECTAN EN LAS PRÓXIMAS
          ETAPAS_
        </p>
      </div>

      {/* Widgets */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <WidgetCard
          icon={<Radar size={16} />}
          title="Equipos en línea"
          caption="Se alimenta del agente de monitoreo, todavía sin desplegar."
        >
          <PlaceholderValue suffix="de — con agente" />
          <Skeleton className="mt-3 h-1.5 w-full" />
        </WidgetCard>

        <WidgetCard
          icon={<AlertTriangle size={16} />}
          title="Alertas de hardware"
          caption="Umbrales previstos: disco al 90 % y batería debajo del 60 %."
        >
          <PlaceholderValue />
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge variant="outline">Disco &gt; 90 %</Badge>
            <Badge variant="outline">Batería &lt; 60 %</Badge>
          </div>
        </WidgetCard>

        <WidgetCard
          icon={<Wrench size={16} />}
          title="Mantenimientos"
          caption="Preventivos vencidos y programados para los próximos 7 días."
        >
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Vencidos</span>
              <span className="font-semibold text-muted-foreground">—</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Próximos 7 días</span>
              <span className="font-semibold text-muted-foreground">—</span>
            </div>
          </div>
        </WidgetCard>

        <WidgetCard
          icon={<ShieldCheck size={16} />}
          title="Garantías por vencer"
          caption="Equipos cuya garantía vence dentro de los próximos 90 días."
        >
          <PlaceholderValue suffix="equipos" />
          <Skeleton className="mt-3 h-1.5 w-2/3" />
        </WidgetCard>

        <WidgetCard
          icon={<Smartphone size={16} />}
          title="Costo de líneas"
          caption="Total mensual de líneas corporativas y evolución de 6 meses."
        >
          <PlaceholderValue suffix="ARS / mes" />
          <div className="mt-3 flex h-8 items-end gap-1" aria-hidden>
            {[35, 55, 45, 70, 60, 80].map((h, i) => (
              <Skeleton
                key={i}
                className="w-full rounded-sm"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </WidgetCard>

        <WidgetCard
          icon={<Ticket size={16} />}
          title="Tickets IT abiertos"
          caption="Tickets abiertos asignados al equipo técnico."
        >
          <PlaceholderValue suffix="abiertos" />
          <Skeleton className="mt-3 h-1.5 w-1/2" />
        </WidgetCard>
      </div>

      {/* Estado general del panel */}
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={<Activity className="h-12 w-12" />}
            title="El panel todavía no tiene datos"
            description="A medida que se activen los módulos de inventario, personal, líneas, red y monitoreo, acá vas a ver la foto completa del estado de IT, actualizada cada 30 segundos."
            className="py-6"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ItDashboardPage;
