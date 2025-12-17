import React, { useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  DashboardCardSkeleton,
  Button,
} from "@/components/ui";
import {
  Ticket,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Users,
  AlertTriangle,
  RefreshCcw,
} from "lucide-react";
import { useDashboard } from "../hooks";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const DashboardPage: React.FC = () => {
  const { stats, isLoading, refreshStats } = useDashboard();

  // Datos para gráficos
  const ticketStatusData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Abiertos", value: stats.openTickets, color: "#3B82F6" },
      { name: "En Progreso", value: stats.inProgressTickets, color: "#F59E0B" },
      { name: "Resueltos", value: stats.resolvedTickets, color: "#22C55E" },
      { name: "Cerrados", value: stats.closedTickets, color: "#64748B" },
    ];
  }, [stats]);

  const priorityData = useMemo(() => {
    // Si tuviéramos desglose por prioridad en stats, lo usaríamos aquí.
    // Como ejemplo, simulamos distribución basada en el total o si la API lo provee en el futuro.
    // Por ahora usamos datos mockeados o derivados si existieran.
    // Asumiremos que 'urgentTickets' es un dato real y el resto se distribuye para el ejemplo visual
    // Idealmente el backend debería devolver un desglose.
    if (!stats) return [];

    // Mock parcial para visualización, excepto urgentes que sí tenemos
    const total = stats.totalTickets || 0;
    const urgent = stats.urgentTickets || 0;
    const others = Math.max(0, total - urgent);

    // Distribuir 'others' arbitrariamente solo para demo visual si no hay data real
    const high = Math.floor(others * 0.3);
    const medium = Math.floor(others * 0.5);
    const low = others - high - medium;

    return [
      { name: "Urgente", value: urgent, color: "#EF4444" },
      { name: "Alta", value: high, color: "#F97316" },
      { name: "Media", value: medium, color: "#EAB308" },
      { name: "Baja", value: low, color: "#22C55E" },
    ].filter(d => d.value > 0);
  }, [stats]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded shadow-lg">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-sm" style={{ color: payload[0].color }}>
            {payload[0].name}: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Resumen de tickets y métricas del sistema
          </p>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <DashboardCardSkeleton key={i} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[300px] bg-muted rounded animate-pulse"></div>
          <div className="h-[300px] bg-muted rounded animate-pulse"></div>
        </div>

        {/* Recent Activity Skeleton */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-muted rounded-full animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
                    <div className="h-3 bg-muted rounded animate-pulse w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatRelative = (iso?: string) => {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours} horas`;
    const days = Math.floor(hours / 24);
    return `hace ${days} días`;
  };

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
            <div className="text-3xl font-bold tracking-tight">
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
            <div className="text-3xl font-bold tracking-tight">
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
            <div className="text-3xl font-bold tracking-tight">
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
            <div className="text-3xl font-bold tracking-tight">
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
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-lg shadow-sm border-l-4 border-indigo-500">
          <CardHeader className="px-6 pt-4">
            <CardTitle className="flex items-center space-x-2">
              <Users size={20} className="text-indigo-500" />
              <span>Usuarios Activos</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-3xl font-bold tracking-tight text-indigo-700 dark:text-indigo-300">
              {stats?.totalUsers || 0}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {stats?.activeAgents || 0} agentes,{" "}
              {Math.max(
                0,
                (stats?.totalUsers || 0) - (stats?.activeAgents || 0),
              )}{" "}
              administradores
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-sm border-l-4 border-red-500">
          <CardHeader className="px-6 pt-4">
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle size={20} className="text-red-500" />
              <span>Tickets Urgentes</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center px-6 pb-6">
            <div className="text-3xl font-bold text-red-600 dark:text-red-400 tracking-tight">
              {stats?.urgentTickets || 0}
            </div>
            <p className="text-sm text-muted-foreground">
              Requieren atención inmediata
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="px-3 pt-2 pb-5">
          <CardTitle className="pl-2">Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent className="px-3">
          <div className="divide-y text-slate-400">
            {stats?.recentActivity?.length ? (
              stats.recentActivity.map((a) => {
                const color =
                  a.type === "ticket_created"
                    ? "bg-blue-500"
                    : a.type === "ticket_resolved"
                      ? "bg-green-500"
                      : a.type === "ticket_updated"
                        ? "bg-yellow-500"
                        : "bg-purple-500";
                const title =
                  a.type === "ticket_created"
                    ? "Nuevo ticket creado"
                    : a.type === "ticket_resolved"
                      ? "Ticket resuelto"
                      : a.type === "ticket_updated"
                        ? "Ticket actualizado"
                        : "Comentario agregado";
                return (
                  <div key={a.id} className="py-3 flex items-start space-x-3">
                    <div className={`mt-1 w-2 h-2 ${color} rounded-full`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-none text-foreground">
                        {title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {a.description || a.type}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelative(a.timestamp)}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground pl-2">
                Sin actividad reciente
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
