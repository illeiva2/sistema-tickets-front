import React from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui";
import { Plus, Menu, X, Sun, Moon } from "lucide-react";
import {
  NavLink,
  Breadcrumbs,
  UserMenu,
  useNavItems,
  UnreadDot,
  useDarkToggle,
  IT_NAV_GROUP_LABEL,
} from "./_shared";

// Sidebar layout, estilo Quiet Pro: nav vertical fijo a la izquierda en
// desktop, drawer slide-in en mobile.
const QuietProLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = useNavItems();
  const navRoutes = navItems.map((i) => i.to);
  // Índice del primer ítem IT: antes de él va el separador "Gestión IT".
  const firstItIndex = navItems.findIndex((i) => i.section === "it");
  const { dark, toggleMode } = useDarkToggle();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Cerrar drawer al cambiar de ruta.
  React.useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Cerrar drawer al pasar a desktop (lg+).
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = () => {
      if (mq.matches) setDrawerOpen(false);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const sidebar = (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Brand */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground"
        >
          <span
            className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold"
            aria-hidden
          >
            ET
          </span>
          <span className="truncate">Empresa Tickets</span>
        </Link>
        <button
          onClick={() => setDrawerOpen(false)}
          className="lg:hidden p-1 rounded-md hover:bg-muted text-muted-foreground"
          aria-label="Cerrar menú"
        >
          <X size={18} />
        </button>
      </div>

      {/* CTA Nuevo ticket */}
      <div className="px-3 pb-3">
        <Button
          size="sm"
          className="w-full justify-center h-8 text-[13px]"
          onClick={() => navigate("/tickets/new")}
        >
          <Plus size={14} className="mr-1.5" />
          Nuevo ticket
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        <div className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground px-2.5 py-1.5">
          Workspace
        </div>
        {navItems.map((item, index) => (
          <React.Fragment key={item.to}>
            {index === firstItIndex && (
              <div className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground px-2.5 pt-3 pb-1.5">
                {IT_NAV_GROUP_LABEL}
              </div>
            )}
            <NavLink
              to={item.to}
              icon={item.icon}
              variant="vertical"
              siblings={navRoutes}
            >
              <span className="flex items-center justify-between w-full gap-2">
                <span>{item.label}</span>
                {item.showUnreadCount && <UnreadDot />}
              </span>
            </NavLink>
          </React.Fragment>
        ))}
      </nav>

      {/* Toggle dark + UserMenu fijo abajo */}
      <div className="border-t border-border p-2 space-y-1">
        <button
          onClick={toggleMode}
          className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {dark ? <Sun size={14} /> : <Moon size={14} />}
          <span>{dark ? "Modo claro" : "Modo oscuro"}</span>
        </button>
        <UserMenu layout="full" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar fija en desktop */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 sticky top-0 h-screen">
        {sidebar}
      </aside>

      {/* Topbar mini en mobile (solo hamburguesa + brand) */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between px-4 py-2.5 bg-card border-b border-border">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-1.5 rounded-md hover:bg-muted text-foreground"
          aria-label="Abrir menú"
        >
          <Menu size={18} />
        </button>
        <Link
          to="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <span className="w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold">
            ET
          </span>
          <span>Empresa Tickets</span>
        </Link>
        <div className="w-7" /> {/* spacer para centrar el brand */}
      </header>

      {/* Drawer mobile */}
      {drawerOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-foreground/30 backdrop-blur-sm z-40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside className="lg:hidden fixed inset-y-0 left-0 w-72 z-50 shadow-xl">
            {sidebar}
          </aside>
        </>
      )}

      {/* Main */}
      <main className="flex-1 min-w-0">
        <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto pt-[60px] lg:pt-8">
          <Breadcrumbs />
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default QuietProLayout;
