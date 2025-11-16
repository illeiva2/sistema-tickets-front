import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
} from "@/components/ui";
import {
  useNotificationsContext,
  type Notification,
  type NotificationPreferences,
} from "../contexts/NotificationsContext";
import {
  Mail,
  Send,
  TestTube,
  CheckCircle,
  AlertCircle,
  Bell,
  Settings,
  Eye,
  EyeOff,
  RefreshCw,
  User,
  Shield,
} from "lucide-react";
import { useAuth } from "../hooks";

export default function NotificationsPage() {
  const { user } = useAuth();
  const {
    notifications,
    preferences,
    isLoading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    updatePreferences,
    testEmailConnection,
    sendTestEmail,
  } = useNotificationsContext();

  const [activeTab, setActiveTab] = useState<
    "notifications" | "preferences" | "admin"
  >("notifications");
  const [testEmail, setTestEmail] = useState({
    to: "",
    subject: "Prueba de Sistema de Tickets",
    message: "Este es un email de prueba del sistema de tickets.",
  });

  const isAdmin = user?.role === "ADMIN";

  const handleTestConnection = async () => {
    await testEmailConnection();
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail.to) {
      alert("Por favor ingresa un email de destino");
      return;
    }
    await sendTestEmail(testEmail.to, testEmail.subject, testEmail.message);
  };

  const handlePreferenceChange = (
    key: keyof NotificationPreferences,
    value: boolean,
  ) => {
    updatePreferences({ [key]: value });
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "ticket_assigned":
        return <User className="h-4 w-4 text-blue-500" />;
      case "status_changed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "comment_added":
        return <Mail className="h-4 w-4 text-purple-500" />;
      case "priority_changed":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return "Ahora mismo";
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
    if (diffInMinutes < 1440) return `Hace ${Math.floor(diffInMinutes / 60)}h`;
    return date.toLocaleDateString("es-ES");
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="container mx-auto px-3 py-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Notificaciones
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Gestiona tus notificaciones y preferencias
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setActiveTab("notifications")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === "notifications"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <Bell className="h-4 w-4 inline mr-2" />
          Notificaciones {unreadCount > 0 && `(${unreadCount})`}
        </button>
        <button
          onClick={() => setActiveTab("preferences")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === "preferences"
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <Settings className="h-4 w-4 inline mr-2" />
          Preferencias
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab("admin")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === "admin"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Shield className="h-4 w-4 inline mr-2" />
            Administración
          </button>
        )}
      </div>

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="space-y-4">
          {/* Header with actions */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Historial de Notificaciones
            </h2>
            <div className="flex space-x-2">
              <Button
                onClick={refreshNotifications}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                Actualizar
              </Button>
              {unreadCount > 0 && (
                <Button
                  onClick={markAllAsRead}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Marcar todas como leídas
                </Button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          {isLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">
                    Cargando notificaciones...
                  </span>
                </div>
              </CardContent>
            </Card>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No hay notificaciones
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Cuando recibas notificaciones, aparecerán aquí.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`${!notification.read ? "border-blue-200 bg-blue-50 dark:bg-blue-900/20" : ""}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <h4
                            className={`font-medium ${!notification.read ? "text-blue-900 dark:text-blue-100" : "text-gray-900 dark:text-white"}`}
                          >
                            {notification.title}
                          </h4>
                          <p
                            className={`text-sm mt-1 ${!notification.read ? "text-blue-700 dark:text-blue-200" : "text-gray-600 dark:text-gray-400"}`}
                          >
                            {notification.message}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>{formatDate(notification.createdAt)}</span>
                            {notification.ticketId && (
                              <span>
                                Ticket #
                                {notification.ticketId.slice(-8).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        {!notification.read && (
                          <Button
                            onClick={() => markAsRead(notification.id)}
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === "preferences" && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Configuración de Notificaciones
          </h2>

          <Card>
            <CardHeader className="px-3 pt-2 pb-3">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                Preferencias Generales
              </CardTitle>
              <CardDescription>
                Configura cómo quieres recibir las notificaciones
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 pb-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Notificaciones por Email
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Recibir notificaciones por correo electrónico
                    </p>
                  </div>
                  <Button
                    variant={preferences?.email ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      handlePreferenceChange("email", !preferences?.email)
                    }
                    disabled={!preferences}
                  >
                    {preferences?.email ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                    {preferences?.email ? "Activado" : "Desactivado"}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Notificaciones en la App
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Mostrar notificaciones dentro de la aplicación
                    </p>
                  </div>
                  <Button
                    variant={preferences?.inApp ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      handlePreferenceChange("inApp", !preferences?.inApp)
                    }
                    disabled={!preferences}
                  >
                    {preferences?.inApp ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                    {preferences?.inApp ? "Activado" : "Desactivado"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="px-3 pt-2 pb-3">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-green-600" />
                Tipos de Notificaciones
              </CardTitle>
              <CardDescription>
                Selecciona qué eventos quieres que te notifiquen
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 pb-4">
              <div className="space-y-4">
                {[
                  {
                    key: "ticketAssigned",
                    label: "Tickets Asignados",
                    description: "Cuando se te asigne un ticket",
                  },
                  {
                    key: "statusChanged",
                    label: "Cambios de Estado",
                    description: "Cuando cambie el estado de un ticket",
                  },
                  {
                    key: "commentAdded",
                    label: "Nuevos Comentarios",
                    description: "Cuando se agregue un comentario",
                  },
                  {
                    key: "priorityChanged",
                    label: "Cambios de Prioridad",
                    description: "Cuando cambie la prioridad de un ticket",
                  },
                ].map(({ key, label, description }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {label}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {description}
                      </p>
                    </div>
                    <Button
                      variant={
                        preferences?.[key as keyof NotificationPreferences]
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        handlePreferenceChange(
                          key as keyof NotificationPreferences,
                          !preferences?.[key as keyof NotificationPreferences],
                        )
                      }
                      disabled={!preferences}
                    >
                      {preferences?.[key as keyof NotificationPreferences] ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                      {preferences?.[key as keyof NotificationPreferences]
                        ? "Activado"
                        : "Desactivado"}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Admin Tab */}
      {activeTab === "admin" && isAdmin && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Administración de Notificaciones
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Email Configuration */}
            <Card>
              <CardHeader className="px-3 pt-2 pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-600" />
                  Configuración de Email
                </CardTitle>
                <CardDescription>
                  Configura el servidor SMTP para enviar notificaciones
                  automáticas
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 pb-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Servidor SMTP
                    </label>
                    <Input
                      value="smtp.gmail.com"
                      disabled
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Puerto
                    </label>
                    <Input
                      value="587"
                      disabled
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email Remitente
                    </label>
                    <Input
                      value="pruebanodemail342@gmail.com"
                      disabled
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                  </div>
                  <div className="pt-2">
                    <Button
                      onClick={handleTestConnection}
                      disabled={isLoading}
                      className="w-full"
                      variant="outline"
                    >
                      <TestTube className="h-4 w-4 mr-2" />
                      {isLoading ? "Probando..." : "Probar Conexión"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Test Email */}
            <Card>
              <CardHeader className="px-3 pt-2 pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-green-600" />
                  Enviar Email de Prueba
                </CardTitle>
                <CardDescription>
                  Envía un email de prueba para verificar la configuración
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 pb-4">
                <form onSubmit={handleSendTestEmail} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email Destino
                    </label>
                    <Input
                      type="email"
                      value={testEmail.to}
                      onChange={(e) =>
                        setTestEmail({ ...testEmail, to: e.target.value })
                      }
                      placeholder="tu-email@ejemplo.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Asunto
                    </label>
                    <Input
                      value={testEmail.subject}
                      onChange={(e) =>
                        setTestEmail({ ...testEmail, subject: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Mensaje
                    </label>
                    <textarea
                      value={testEmail.message}
                      onChange={(e) =>
                        setTestEmail({ ...testEmail, message: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                      rows={3}
                      required
                    />
                  </div>
                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isLoading || !testEmail.to}
                      className="w-full"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {isLoading ? "Enviando..." : "Enviar Email de Prueba"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* System Information */}
          <Card>
            <CardHeader className="px-3 pt-2 pb-3">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                Información del Sistema
              </CardTitle>
              <CardDescription>
                El sistema enviará automáticamente emails en los siguientes
                casos:
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 pb-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Ticket Asignado
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Cuando se asigna un ticket a un agente
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Estado Cambiado
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Cuando cambia el estado de un ticket
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Nuevo Comentario
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Cuando se agrega un comentario a un ticket
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
