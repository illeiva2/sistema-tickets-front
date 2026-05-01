import React from "react";
import {
  Outlet,
  Link,
  useLocation,
} from "react-router-dom";
import { Button } from "@/components/ui";
import { Menu, X, Sun, Moon } from "lucide-react";
import {
  NavLink,
  Breadcrumbs,
  UserMenu,
  useNavItems,
  UnreadDot,
  useDarkToggle,
} from "./_shared";

// Topbar layout, estilo Workshop: nav horizontal arriba, fondo cálido
// (toma los tokens de --background del theme), drawer mobile.
const WorkshopLayout: React.FC = () => {
  const location = useLocation();
  const navItems = useNavItems();
  const { dark, toggleMode } = useDarkToggle();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  React.useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-6 min-w-0">
            <Link
              to="/"
              className="flex items-center gap-2 text-base sm:text-lg font-semibold tracking-tight whitespace-nowrap"
            >
              <span
                className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold"
                aria-hidden
              >
                ET
              </span>
              <span className="hidden sm:inline">Empresa Tickets</span>
            </Link>
            {/* Nav horizontal en desktop */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} icon={item.icon}>
                  <span className="flex items-center gap-2">
                    <span>{item.label}</span>
                    {item.showUnreadCount && <UnreadDot />}
                  </span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <UserMenu />
            <Button
              variant="outline"
              size="sm"
              className="hidden lg:inline-flex h-8 w-8 p-0 justify-center"
              onClick={toggleMode}
              aria-label={dark ? "Cambiar a claro" : "Cambiar a oscuro"}
            >
              {dark ? <Sun size={14} /> : <Moon size={14} />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden h-8 w-8 p-0 justify-center"
              onClick={() => setDrawerOpen(!drawerOpen)}
              aria-label="Abrir menú"
            >
              {drawerOpen ? <X size={18} /> : <Menu size={18} />}
            </Button>
          </div>
        </div>

        {/* Drawer mobile (mismo header, panel desplegable abajo) */}
        {drawerOpen && (
          <div className="lg:hidden border-t border-border bg-card">
            <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  icon={item.icon}
                  onNavigate={() => setDrawerOpen(false)}
                >
                  <span className="flex items-center justify-between w-full gap-2">
                    <span>{item.label}</span>
                    {item.showUnreadCount && <UnreadDot />}
                  </span>
                </NavLink>
              ))}
              <button
                onClick={() => {
                  toggleMode();
                  setDrawerOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {dark ? <Sun size={16} /> : <Moon size={16} />}
                <span>{dark ? "Modo claro" : "Modo oscuro"}</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <Breadcrumbs />
        <Outlet />
      </main>
    </div>
  );
};

export default WorkshopLayout;
