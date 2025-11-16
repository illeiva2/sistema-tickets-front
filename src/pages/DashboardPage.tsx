import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
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

const DashboardPage: React.FC = () => {
  const { stats, isLoading, refreshStats } = useDashboard();
  // const { user } = useAuth(); // Not used currently

  // Determinar el tipo de dashboard según el rol
  // Role-based variables for future use
  // const isUser = user?.role === 'USER';
  // const isAgent = user?.role === 'AGENT';
  // const isAdmin = user?.role === 'ADMIN';

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
        <Card className="rounded-lg shadow-sm border-t-4 text-white border-blue-500 bg-blue-500 dark:bg-blue-950/20">
          <CardHeader className="items-center space-y-1 pb-0 px-3 pt-2">
            <Ticket className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <CardTitle className="text-sm font-medium text-center pl-2">
              Tickets Abiertos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-2 px-6 pb-6">
            <div className="text-3xl font-bold tracking-tight">
              {stats?.openTickets || 0}
            </div>
            <p className="mt-1 text-xs text-muted-foreground inline-flex text-white items-center justify-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +2 desde ayer
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-sm border-t-4 text-white border-amber-500 bg-amber-500 dark:bg-amber-950/20">
          <CardHeader className="items-center space-y-1 pb-0 px-3 pt-2">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <CardTitle className="text-sm font-medium text-center pl-2">
              En Progreso
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-2 px-6 pb-6">
            <div className="text-3xl font-bold tracking-tight">
              {stats?.inProgressTickets || 0}
            </div>
            <p className="mt-1 text-xs text-muted-foreground inline-flex text-white items-center justify-center">
              <TrendingUp className="h-3 w-3 mr-1 text-blue-500" />
              -1 desde ayer
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-sm border-t-4 text-white border-green-500 bg-green-500 dark:bg-green-950/20">
          <CardHeader className="items-center space-y-1 pb-0 px-3 pt-2">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <CardTitle className="text-sm font-medium text-center pl-2">
              Resueltos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-2 px-6 pb-6">
            <div className="text-3xl font-bold tracking-tight">
              {stats?.resolvedTickets || 0}
            </div>
            <p className="mt-1 text-xs text-muted-foreground inline-flex text-white items-center justify-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +5 esta semana
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-sm border-t-4 text-white border-slate-500 bg-slate-500 dark:bg-slate-900/30">
          <CardHeader className="items-center space-y-1 pb-0 px-3 pt-2">
            <XCircle className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            <CardTitle className="text-sm font-medium text-center pl-2">
              Cerrados
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center pt-2 px-6 pb-6">
            <div className="text-3xl font-bold tracking-tight">
              {stats?.closedTickets || 0}
            </div>
            <p className="mt-1 text-xs text-muted-foreground inline-flex text-white  items-center justify-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +12 este mes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-lg shadow-sm border-t-4 text-white border-indigo-500 bg-indigo-500 dark:bg-indigo-950/20">
          <CardHeader className="px-6 pt-4">
            <CardTitle className="flex items-center space-x-2">
              <Users size={20} />
              <span>Usuarios Activos</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-3xl font-bold tracking-tight">
              {stats?.totalUsers || 0}
            </div>
            <p className="mt-1 text-sm text-muted-foreground text-white">
              {stats?.activeAgents || 0} agentes,{" "}
              {Math.max(
                0,
                (stats?.totalUsers || 0) - (stats?.activeAgents || 0),
              )}{" "}
              administradores
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-sm border-t-4 text-white border-red-500 bg-red-500 dark:bg-red-950/20">
          <CardHeader className="px-6 pt-4">
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle size={20} />
              <span>Tickets Urgentes</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center px-6 pb-6">
            <div className="text-3xl font-bold text-black dark:text-red-400 tracking-tight">
              {stats?.urgentTickets || 0}
            </div>
            <p className="text-sm text-muted-foreground text-white">
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
          <div className="divide-y">
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
                      <p className="text-sm font-medium leading-none">
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
              <p className="text-sm text-muted-foreground">
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
