import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import { toast } from "react-hot-toast";

export interface Notification {
  id: string;
  type:
    | "ticket_assigned"
    | "status_changed"
    | "comment_added"
    | "priority_changed";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  ticketId?: string;
  metadata?: Record<string, any>;
}

export interface NotificationPreferences {
  email: boolean;
  inApp: boolean;
  ticketAssigned: boolean;
  statusChanged: boolean;
  commentAdded: boolean;
  priorityChanged: boolean;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);

  // Fetch user notifications
  const fetchNotifications = useCallback(async () => {
    if (notificationsLoaded) {
      console.log("Notifications already loaded, skipping...");
      return;
    }

    setIsLoading(true);
    try {
      console.log("Fetching notifications...");
      const response = await api.get("/api/notifications/user");
      if (response.data.success) {
        setNotifications(response.data.data);
        setNotificationsLoaded(true);
        console.log(
          "Notifications loaded:",
          response.data.data.length,
          "items",
        );
      }
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [notificationsLoaded]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await api.patch(
        `/api/notifications/${notificationId}/read`,
      );
      if (response.data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
        );
        // Update unread count
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const response = await api.patch("/api/notifications/mark-all-read");
      if (response.data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        // Update unread count
        setUnreadCount(0);
      }
    } catch (error: any) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Update notification preferences
  const updatePreferences = async (
    newPreferences: Partial<NotificationPreferences>,
  ) => {
    try {
      const response = await api.patch(
        "/api/notifications/preferences",
        newPreferences,
      );
      if (response.data.success) {
        setPreferences((prev) => {
          if (!prev) return newPreferences as NotificationPreferences;
          return { ...prev, ...newPreferences } as NotificationPreferences;
        });
        toast.success("Preferencias actualizadas correctamente");
      }
    } catch (error: any) {
      toast.error("Error al actualizar preferencias");
      console.error("Error updating preferences:", error);
    }
  };

  // Test email connection (admin only)
  const testEmailConnection = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/api/notifications/test-connection");
      if (response.data.success) {
        toast.success("✅ Conexión de email verificada correctamente");
        return true;
      }
    } catch (error: any) {
      const message =
        error.response?.data?.error?.message ||
        "Error al verificar conexión de email";
      toast.error(`❌ ${message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  // Send test email (admin only)
  const sendTestEmail = async (
    to: string,
    subject: string,
    message: string,
  ) => {
    setIsLoading(true);
    try {
      const response = await api.post("/api/notifications/test-email", {
        to,
        subject,
        message,
      });

      if (response.data.success) {
        toast.success("✅ Email de prueba enviado correctamente");
        return true;
      }
    } catch (error: any) {
      const message =
        error.response?.data?.error?.message ||
        "Error al enviar email de prueba";
      toast.error(`❌ ${message}`);
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  // Fetch user preferences
  const fetchPreferences = useCallback(async () => {
    if (preferencesLoaded) {
      console.log("Preferences already loaded, skipping...");
      return;
    }

    try {
      console.log("Fetching preferences...");
      const response = await api.get("/api/notifications/preferences");
      if (response.data.success) {
        setPreferences(response.data.data);
        setPreferencesLoaded(true);
        console.log("Preferences loaded:", response.data.data);
      }
    } catch (error: any) {
      console.error("Error fetching preferences:", error);
    }
  }, [preferencesLoaded]);

  // Load notifications and preferences on mount
  useEffect(() => {
    console.log("useNotifications useEffect triggered");
    fetchNotifications();
    fetchPreferences();
  }, [fetchNotifications, fetchPreferences]); // Incluir dependencias

  // Calculate unread count when notifications change
  useEffect(() => {
    const count = notifications.filter((n) => !n.read).length;
    setUnreadCount(count);
    console.log("Unread count updated:", count);
  }, [notifications]);

  return {
    // Data
    notifications,
    preferences,
    isLoading,
    unreadCount,

    // Actions
    fetchNotifications,
    fetchPreferences,
    markAsRead,
    markAllAsRead,
    updatePreferences,

    // Admin functions
    testEmailConnection,
    sendTestEmail,
  };
};
