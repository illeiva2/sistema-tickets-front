import React from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { Button } from "@/components/ui";
import {
  LogOut,
  Ticket,
  BarChart3,
  Plus,
  Home,
  Mail,
  Folder,
  Users,
  User,
  ChevronDown,
  Settings,
  BookOpen,
} from "lucide-react";
import { useAuth, useTickets } from "../../hooks";
import { useNotificationsContext } from "../../contexts/NotificationsContext";
import { useTheme } from "../../contexts/ThemeContext";
import ThemeSwitcher from "../ThemeSwitcher";
import Avatar from "../Avatar";

// ─── NavLink ──────────────────────────────────────────────────────────────────

interface NavLinkProps {
  to: string;
  children: React.ReactNode;
  icon: React.ReactNode;
  variant?: "horizontal" | "vertical";
  onNavigate?: () => void;
  /**
   * Lista de todas las rutas hermanas. Si alguna es mas especifica que `to`
   * y tambien matchea el pathname actual, este NavLink no se marca como
   * activo. Ej: estando en /tickets/new, /tickets no se marca activo
   * porque /tickets/new es mas especifico y tambien matchea.
   */
  siblings?: string[];
}

export const NavLink: React.FC<NavLinkProps> = ({
  to,
  children,
  icon,
  variant = "horizontal",
  onNavigate,
  siblings,
}) => {
  const location = useLocation();
  const pathname = location.pathname;

  const matches = (route: string): boolean => {
    if (route === "/") return pathname === "/";
    if (pathname === route) return true;
    return pathname.startsWith(route + "/");
  };

  let isActive = matches(to);
  if (isActive && siblings && to !== pathname) {
    // Si hay un hermano mas especifico que tambien matchea, dejamos que el
    // hermano sea el activo y este queda inactivo.
    const moreSpecific = siblings.some(
      (other) =>
        other !== to &&
        other !== "/" &&
        other.length > to.length &&
        matches(other),
    );
    if (moreSpecific) isActive = false;
  }

  const base =
    variant === "vertical"
      ? "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors w-full"
      : "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors";

  const cls = isActive
    ? "bg-primary text-primary-foreground shadow-sm"
    : "text-muted-foreground hover:text-foreground hover:bg-muted dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800";

  return (
    <Link to={to} onClick={onNavigate} className={`${base} ${cls}`}>
      {icon}
      <span className="truncate">{children}</span>
    </Link>
  );
};

// ─── Breadcrumbs ──────────────────────────────────────────────────────────────

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);
  const { id: ticketId } = useParams();
  const { getTicketById } = useTickets();
  const [ticketNumber, setTicketNumber] = React.useState<string | null>(null);

  React.useEffect(() => {
    setTicketNumber(null);
    if (!ticketId) return;
    const onTicketDetail =
      location.pathname.startsWith("/tickets/") &&
      location.pathname.split("/").filter(Boolean).length === 2;
    if (!onTicketDetail) return;

    let cancelled = false;
    (async () => {
      try {
        const ticket = await getTicketById(ticketId);
        if (!cancelled && ticket?.ticketNumber) {
          setTicketNumber(ticket.ticketNumber.toString().padStart(5, "0"));
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error fetching ticket number:", error);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, ticketId]);

  if (pathnames.length === 0) return null;

  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
      <Link
        to="/"
        className="hover:text-foreground flex items-center space-x-1"
      >
        <Home size={14} />
        <span>Inicio</span>
      </Link>
      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
        const isLast = index === pathnames.length - 1;

        let displayName =
          {
            tickets: "Tickets",
            new: "Nuevo",
            login: "Iniciar Sesión",
          }[name] || name;

        if (
          isLast &&
          ticketNumber &&
          pathnames.length === 2 &&
          pathnames[0] === "tickets"
        ) {
          displayName = `${ticketNumber}`;
        }

        return (
          <React.Fragment key={name}>
            <span className="text-muted-foreground">/</span>
            {isLast ? (
              <span className="text-foreground font-medium capitalize">
                {displayName}
              </span>
            ) : (
              <Link to={routeTo} className="hover:text-foreground capitalize">
                {displayName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

// ─── UserMenu (avatar + dropdown con preferences + logout) ────────────────────

interface UserMenuProps {
  layout?: "compact" | "full";
}

export const UserMenu: React.FC<UserMenuProps> = ({ layout = "compact" }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".user-menu")) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (layout === "full") {
    return (
      <div className="relative user-menu w-full">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-2.5 p-2 rounded-md hover:bg-muted transition-colors text-left"
        >
          <Avatar name={user?.name} email={user?.email} size={32} />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium truncate">
              {user?.name || "Usuario"}
            </div>
            <div className="text-[11px] text-muted-foreground truncate capitalize">
              {(user?.role || "user").toLowerCase()}
            </div>
          </div>
          <ChevronDown
            size={14}
            className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-popover border border-border rounded-md shadow-lg z-50 overflow-hidden">
            <UserMenuItems
              onChangePassword={() => {
                setOpen(false);
                navigate("/change-password");
              }}
              onLogout={() => {
                setOpen(false);
                logout();
              }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative user-menu">
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-2 px-2 sm:px-3 py-2"
        onClick={() => setOpen(!open)}
      >
        <Avatar name={user?.name} email={user?.email} size={20} />
        <span className="hidden sm:inline">{user?.name || "Usuario"}</span>
        <ChevronDown size={14} />
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-md shadow-lg z-50 overflow-hidden">
          <UserMenuItems
            onChangePassword={() => {
              setOpen(false);
              navigate("/change-password");
            }}
            onLogout={() => {
              setOpen(false);
              logout();
            }}
            withHeader
          />
        </div>
      )}
    </div>
  );
};

const UserMenuItems: React.FC<{
  onChangePassword: () => void;
  onLogout: () => void;
  withHeader?: boolean;
}> = ({ onChangePassword, onLogout, withHeader = false }) => {
  const { user } = useAuth();
  return (
    <div className="py-1">
      {withHeader && (
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-medium truncate">
            {user?.name || "Usuario"}
          </p>
          <p className="text-xs text-muted-foreground capitalize">
            {(user?.role || "user").toLowerCase()}
          </p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
      )}
      <button
        onClick={onChangePassword}
        className="flex items-center w-full px-4 py-2 text-sm hover:bg-muted transition-colors"
      >
        <Settings size={16} className="mr-3" />
        Cambiar contraseña
      </button>
      <ThemeSwitcher />
      <div className="border-t border-border pt-1">
        <button
          onClick={onLogout}
          className="flex items-center w-full px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut size={16} className="mr-3" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
};

// ─── NavItems (lista compartida, distinta presentación según el layout) ──────

export interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  showFor?: ("USER" | "AGENT" | "ADMIN")[];
  showUnreadCount?: boolean;
}

export const useNavItems = (): NavItem[] => {
  const { user } = useAuth();
  const items: NavItem[] = [
    { to: "/", label: "Dashboard", icon: <BarChart3 size={16} /> },
    { to: "/tickets", label: "Tickets", icon: <Ticket size={16} /> },
    { to: "/tickets/new", label: "Nuevo ticket", icon: <Plus size={16} /> },
    { to: "/resources", label: "Recursos", icon: <BookOpen size={16} /> },
    {
      to: "/files",
      label: "Archivos",
      icon: <Folder size={16} />,
      showFor: ["AGENT", "ADMIN"],
    },
    {
      to: "/notifications",
      label: "Notificaciones",
      icon: <Mail size={16} />,
      showUnreadCount: true,
    },
    {
      to: "/users",
      label: "Usuarios",
      icon: <Users size={16} />,
      showFor: ["ADMIN"],
    },
  ];
  return items.filter(
    (item) =>
      !item.showFor || (user?.role && item.showFor.includes(user.role)),
  );
};

export const UnreadDot: React.FC = () => {
  const { unreadCount } = useNotificationsContext();
  if (unreadCount === 0) return null;
  return (
    <span className="ml-auto inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-[10px] font-medium text-white bg-red-500 rounded-full">
      {unreadCount > 9 ? "9+" : unreadCount}
    </span>
  );
};

// ─── Helper para el toggle dark del topbar/sidebar ───────────────────────────

export const useDarkToggle = () => {
  const { mode, toggleMode } = useTheme();
  return { dark: mode === "dark", toggleMode };
};

// re-exports para conveniencia
export { User, ChevronDown, Settings, LogOut };
