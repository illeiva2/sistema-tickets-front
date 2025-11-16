import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
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

interface NotificationsContextType {
  notifications: Notification[];
  preferences: NotificationPreferences | null;
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  updatePreferences: (
    newPreferences: Partial<NotificationPreferences>,
  ) => Promise<void>;
  testEmailConnection: () => Promise<boolean>;
  sendTestEmail: (
    to: string,
    subject: string,
    message: string,
  ) => Promise<boolean>;
  refreshNotifications: () => Promise<void>;
}

const NotificationsContext = createContext<
  NotificationsContextType | undefined
>(undefined);

export const useNotificationsContext = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      "useNotificationsContext must be used within a NotificationsProvider",
    );
  }
  return context;
};

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user notifications
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/api/notifications/user");
      if (response.data.success) {
        setNotifications(response.data.data);
      }
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch user notification preferences
  const fetchPreferences = useCallback(async () => {
    try {
      const response = await api.get("/api/notifications/preferences");
      if (response.data.success) {
        setPreferences(response.data.data);
      }
    } catch (error: any) {
      console.error("Error fetching preferences:", error);
    }
  }, []);

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

  // Refresh notifications
  const refreshNotifications = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  // Calculate unread count when notifications change
  useEffect(() => {
    const count = notifications.filter((n) => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  // Fetch notifications and preferences on mount
  useEffect(() => {
    fetchNotifications();
    fetchPreferences();
  }, [fetchNotifications, fetchPreferences]);

  const value: NotificationsContextType = {
    notifications,
    preferences,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    updatePreferences,
    testEmailConnection,
    sendTestEmail,
    refreshNotifications,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};
