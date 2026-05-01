import React from "react";
import {
  Outlet,
  Link,
  useLocation,
  useParams,
  useNavigate,
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
  Menu,
  X,
} from "lucide-react";
import { useAuth, useTickets } from "../hooks";
import { useNotificationsContext } from "../contexts/NotificationsContext";
import { useTheme } from "../contexts/ThemeContext";
import ThemeSwitcher from "./ThemeSwitcher";

// Componente de navegación con estado activo
const NavLink = ({
  to,
  children,
  icon,
  onNavigate,
}: {
  to: string;
  children: React.ReactNode;
  icon: React.ReactNode;
  onNavigate?: () => void;
}) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors ${isActive
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground hover:bg-muted dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800"
        }`}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
};

// Breadcrumbs básicos
const Breadcrumbs = () => {
  const location = useLocation();
  // pathnames se recalcula en cada render -- nunca lo metemos como
  // dependencia de un useEffect porque es una referencia nueva siempre.
  const pathnames = location.pathname.split("/").filter((x) => x);
  const { id: ticketId } = useParams();
  const { getTicketById } = useTickets();
  const [ticketNumber, setTicketNumber] = React.useState<string | null>(null);

  // Si estamos en la página de detalle de un ticket, obtener el número.
  // Dependemos solo de location.pathname (string estable) y ticketId.
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

        // Mapear nombres más amigables
        let displayName =
          {
            tickets: "Tickets",
            new: "Nuevo",
            login: "Iniciar Sesión",
          }[name] || name;

        // Si es el último elemento y estamos en la página de detalle de un ticket, mostrar el número
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

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotificationsContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
  };

  const handleChangePassword = () => {
    navigate("/change-password");
  };

  // Cerrar menú de usuario cuando se hace clic fuera.
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".user-menu")) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isUserMenuOpen]);

  // Cerrar el drawer mobile al navegar a una ruta nueva.
  React.useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  // Dark/light controlado por el ThemeContext (persistencia + theme switcher).
  const { mode, toggleMode } = useTheme();
  const dark = mode === "dark";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between transition-colors gap-2">
          <div className="flex items-center space-x-6 min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-primary tracking-tight whitespace-nowrap">
              Empresa Tickets
            </h1>
            {/* Nav horizontal en desktop */}
            <nav className="hidden lg:flex items-center space-x-1">
              <NavLink to="/" icon={<BarChart3 size={16} />}>
                Dashboard
              </NavLink>
              <NavLink to="/tickets" icon={<Ticket size={16} />}>
                Tickets
              </NavLink>
              <NavLink to="/tickets/new" icon={<Plus size={16} />}>
                Nuevo Ticket
              </NavLink>
              {(user?.role === "ADMIN" || user?.role === "AGENT") && (
                <NavLink to="/files" icon={<Folder size={16} />}>
                  Archivos
                </NavLink>
              )}
              <NavLink to="/notifications" icon={<Mail size={16} />}>
                Notificaciones
                {unreadCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-red-500 rounded-full">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </NavLink>
              {user?.role === "ADMIN" && (
                <NavLink to="/users" icon={<Users size={16} />}>
                  Usuarios
                </NavLink>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* User Dropdown Menu */}
            <div className="relative user-menu">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center space-x-2 px-2 sm:px-3 py-2"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              >
                <User size={16} />
                <span className="hidden sm:inline">
                  {user?.name || "Usuario"}
                </span>
                <ChevronDown size={14} className="ml-1" />
              </Button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="py-2">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {user?.name || "Usuario"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {user?.role || "USER"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {user?.email}
                      </p>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={handleChangePassword}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Settings size={16} className="mr-3" />
                        Cambiar Contraseña
                      </button>
                    </div>

                    <ThemeSwitcher />

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <LogOut size={16} className="mr-3" />
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Toggle dark visible solo en desktop. En mobile va al drawer. */}
            <Button
              variant="outline"
              size="sm"
              className="hidden lg:inline-flex px-2 py-1 text-sm"
              onClick={toggleMode}
            >
              {dark ? "Light" : "Dark"}
            </Button>

            {/* Botón hamburguesa visible solo en mobile/tablet */}
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden px-2 py-2"
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              aria-label="Abrir menú"
            >
              {isMobileNavOpen ? <X size={18} /> : <Menu size={18} />}
            </Button>
          </div>
        </div>

        {/* Drawer mobile */}
        {isMobileNavOpen && (
          <div className="lg:hidden border-t bg-card dark:bg-gray-900">
            <div className="container mx-auto px-4 py-3 flex flex-col gap-1">
              <NavLink
                to="/"
                icon={<BarChart3 size={16} />}
                onNavigate={() => setIsMobileNavOpen(false)}
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/tickets"
                icon={<Ticket size={16} />}
                onNavigate={() => setIsMobileNavOpen(false)}
              >
                Tickets
              </NavLink>
              <NavLink
                to="/tickets/new"
                icon={<Plus size={16} />}
                onNavigate={() => setIsMobileNavOpen(false)}
              >
                Nuevo Ticket
              </NavLink>
              {(user?.role === "ADMIN" || user?.role === "AGENT") && (
                <NavLink
                  to="/files"
                  icon={<Folder size={16} />}
                  onNavigate={() => setIsMobileNavOpen(false)}
                >
                  Archivos
                </NavLink>
              )}
              <NavLink
                to="/notifications"
                icon={<Mail size={16} />}
                onNavigate={() => setIsMobileNavOpen(false)}
              >
                Notificaciones
                {unreadCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-red-500 rounded-full">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </NavLink>
              {user?.role === "ADMIN" && (
                <NavLink
                  to="/users"
                  icon={<Users size={16} />}
                  onNavigate={() => setIsMobileNavOpen(false)}
                >
                  Usuarios
                </NavLink>
              )}
              <button
                onClick={toggleMode}
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800 transition-colors"
              >
                <Settings size={16} />
                <span>{dark ? "Modo claro" : "Modo oscuro"}</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Breadcrumbs />
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
