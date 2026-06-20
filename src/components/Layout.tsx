import React, { useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import QuietProLayout from "./layouts/QuietProLayout";
import WorkshopLayout from "./layouts/WorkshopLayout";
import CommandPalette from "./CommandPalette";
import PinnedModalAnnouncements from "./PinnedModalAnnouncements";
import OnboardingTour from "./OnboardingTour";
import { ONBOARDING_STEPS, TOUR_STORAGE_KEY } from "../constants/tourSteps";
import { ONBOARDING_REPLAY_EVENT } from "../lib/onboarding";

// Wrapper que ramifica al layout adecuado segun el theme activo.
const Layout: React.FC = () => {
  const { theme } = useTheme();
  const [tourForce, setTourForce] = useState(0);

  React.useEffect(() => {
    const handler = () => setTourForce((n) => n + 1);
    window.addEventListener(ONBOARDING_REPLAY_EVENT, handler);
    return () => window.removeEventListener(ONBOARDING_REPLAY_EVENT, handler);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between bg-blue-200 dark:bg-gray-900 border-b dark:border-gray-800 transition-colors">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-bold text-primary tracking-tight">
              Empresa Tickets
            </h1>
            <nav className="flex items-center space-x-1">
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
          <div className="flex items-center space-x-4">
            {/* User Dropdown Menu */}
            <div className="relative user-menu">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center space-x-2 px-3 py-2"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                data-testid="user-menu-button"
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
                    {/* User Info */}
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

                    {/* Menu Items */}
                    <div className="py-1">
                      <button
                        onClick={handleChangePassword}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Settings size={16} className="mr-3" />
                        Cambiar Contraseña
                      </button>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        data-testid="logout-button"
                      >
                        <LogOut size={16} className="mr-3" />
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="px-2 py-1 text-sm"
              onClick={() => setDark(!dark)}
            >
              {dark ? "Light" : "Dark"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Breadcrumbs />
        <Outlet />
      </main>
    </div>
    <>
      {theme === "workshop" ? <WorkshopLayout /> : <QuietProLayout />}
      <CommandPalette />
      <PinnedModalAnnouncements />
      {/* key cambia cuando se replay para remontar y forzar visibilidad */}
      <OnboardingTour
        key={tourForce}
        steps={ONBOARDING_STEPS}
        storageKey={TOUR_STORAGE_KEY}
        forceShow={tourForce > 0}
      />
    </>
  );
};

export default Layout;
