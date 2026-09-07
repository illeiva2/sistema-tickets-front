// React 18 with jsx:react-jsx doesn't require explicit import
import { Suspense } from "react";
import { lazyConReintento } from "./lib/lazyConReintento";
import { Routes, Route, Outlet, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// Componentes que SI van en el bundle inicial: layout, providers,
// proteccion de rutas, error boundary. Son indispensables y livianos.
import ProtectedRoute, { RoleProtectedRoute } from "./components/ProtectedRoute";
import { ModulesProvider } from "./contexts/ModulesContext";
import Layout from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { NotificationsProvider } from "./contexts/NotificationsContext";
import { AuthProvider } from "./contexts/AuthContext";
import { TicketsProvider } from "./contexts/TicketsContext";

// Paginas: lazy-load. Cada una se descarga solo cuando se navega ahi.
// Esto reduce drasticamente el tiempo de primera carga.
const LoginPage = lazyConReintento(() => import("./pages/LoginPage"));
const RegisterPage = lazyConReintento(() => import("./pages/RegisterPage"));
const DashboardPage = lazyConReintento(() => import("./pages/DashboardPage"));
const TicketsPage = lazyConReintento(() => import("./pages/TicketsPage"));
const TicketDetailPage = lazyConReintento(() => import("./pages/TicketDetailPage"));
const NewTicketPage = lazyConReintento(() => import("./pages/NewTicketPage"));
const NotificationsPage = lazyConReintento(() => import("./pages/NotificationsPage"));
const FileManagementPage = lazyConReintento(() => import("./pages/FileManagementPage"));
const UsersPage = lazyConReintento(() => import("./pages/UsersPage"));
const DepartmentsPage = lazyConReintento(() => import("./pages/DepartmentsPage"));
const ResourcesPage = lazyConReintento(() => import("./pages/ResourcesPage"));
const ResourceDetailPage = lazyConReintento(() => import("./pages/ResourceDetailPage"));
const ResourceEditorPage = lazyConReintento(() => import("./pages/ResourceEditorPage"));
const AdminWorkshopsImportPage = lazyConReintento(() => import("./pages/AdminWorkshopsImportPage"));
const AdminWorkshopsRulesPage = lazyConReintento(() => import("./pages/AdminWorkshopsRulesPage"));
const AdminModulesPage = lazyConReintento(() => import("./pages/AdminModulesPage"));
const LabLayout = lazyConReintento(() => import("./features/lab/components/LabLayout"));
const LabGlutomaticPage = lazyConReintento(() => import("./pages/lab/LabGlutomaticPage"));
const LabNirPage = lazyConReintento(() => import("./pages/lab/LabNirPage"));
const LabFnPage = lazyConReintento(() => import("./pages/lab/LabFnPage"));
const LabSdmaticPage = lazyConReintento(() => import("./pages/lab/LabSdmaticPage"));
const LabAlveolabPage = lazyConReintento(() => import("./pages/lab/LabAlveolabPage"));
const LabSamplesPage = lazyConReintento(() => import("./pages/lab/LabSamplesPage"));
const LabDailyReportPage = lazyConReintento(() => import("./pages/lab/LabDailyReportPage"));
const ProjectsPage = lazyConReintento(() => import("./pages/ProjectsPage"));
const ProjectDetailPage = lazyConReintento(() => import("./pages/ProjectDetailPage"));
const ProjectEditorPage = lazyConReintento(() => import("./pages/ProjectEditorPage"));
const OAuthCallbackPage = lazyConReintento(() => import("./pages/OAuthCallbackPage"));
const SetupPasswordPage = lazyConReintento(() => import("./pages/SetupPasswordPage"));
const ChangePasswordPage = lazyConReintento(() => import("./pages/ChangePasswordPage"));

// Gestión IT (solo AGENT/ADMIN): todas lazy, viven bajo /it/*.
const ItDashboardPage = lazyConReintento(() =>
  import("./features/it/ItOpsDashboardPage").then(({ ItOpsDashboardPage }) => ({
    default: ItOpsDashboardPage,
  })),
);
const ItInventoryPage = lazyConReintento(() => import("./pages/it/ItInventoryPage"));
const ItMaintenancePage = lazyConReintento(() => import("./pages/it/ItMaintenancePage"));
const ItPurchasesPage = lazyConReintento(() => import("./pages/it/ItPurchasesPage"));
const ItStaffPage = lazyConReintento(() => import("./pages/it/ItStaffPage"));
const ItNetworkPage = lazyConReintento(() => import("./pages/it/ItNetworkPage"));
const ItLiveDevicesPage = lazyConReintento(() => import("./pages/it/ItLiveDevicesPage"));

// Fallback mientras carga el chunk de la pagina. Mantiene el layout estable
// (sin flash blanco) usando un mini skeleton.
const PageSkeleton: React.FC = () => (
  <div className="space-y-3 p-4">
    <div className="h-8 w-1/3 bg-muted/50 rounded animate-pulse" />
    <div className="h-4 w-1/2 bg-muted/40 rounded animate-pulse" />
    <div className="h-64 bg-muted/30 rounded-lg animate-pulse mt-6" />
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="min-h-screen bg-background">
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <ModulesProvider>
                      <NotificationsProvider>
                        <TicketsProvider>
                          <Layout />
                        </TicketsProvider>
                      </NotificationsProvider>
                    </ModulesProvider>
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="tickets" element={<TicketsPage />} />
                <Route path="tickets/new" element={<NewTicketPage />} />
                <Route path="tickets/:id" element={<TicketDetailPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                {/* Gestión IT: protección única en el route padre (el
                    backend igual valida rol en cada endpoint). */}
                <Route
                  path="it"
                  element={
                    <RoleProtectedRoute allowedRoles={["ADMIN", "AGENT"]}>
                      <Outlet />
                    </RoleProtectedRoute>
                  }
                >
                  <Route index element={<ItDashboardPage />} />
                  <Route path="inventory" element={<ItInventoryPage />} />
                  <Route path="maintenance" element={<ItMaintenancePage />} />
                  <Route path="purchases" element={<ItPurchasesPage />} />
                  <Route path="staff" element={<ItStaffPage />} />
                  <Route path="network" element={<ItNetworkPage />} />
                  <Route path="live" element={<ItLiveDevicesPage />} />
                </Route>
                <Route
                  path="files"
                  element={
                    <RoleProtectedRoute allowedRoles={["ADMIN", "AGENT"]}>
                      <FileManagementPage />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="users"
                  element={
                    <RoleProtectedRoute allowedRoles={["ADMIN"]}>
                      <UsersPage />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="departments"
                  element={
                    <RoleProtectedRoute allowedRoles={["ADMIN"]}>
                      <DepartmentsPage />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="admin/modulos"
                  element={
                    <RoleProtectedRoute allowedRoles={["ADMIN"]}>
                      <AdminModulesPage />
                    </RoleProtectedRoute>
                  }
                />
                {/* El modulo ya NO es un enlace externo: el panel se
                    renderiza aca. LabLayout hace la puerta del modulo y las
                    pestanas; cada vista tiene su propia URL para poder
                    compartir un link a lo que estas mirando. */}
                <Route path="modulos/laboratorio" element={<LabLayout />}>
                  <Route index element={<LabGlutomaticPage />} />
                  <Route path="nir" element={<LabNirPage />} />
                  <Route path="fn" element={<LabFnPage />} />
                  <Route path="sdmatic" element={<LabSdmaticPage />} />
                  <Route path="alveolab" element={<LabAlveolabPage />} />
                  <Route path="muestras" element={<LabSamplesPage />} />
                  <Route path="reporte" element={<LabDailyReportPage />} />
                  {/* Operador y Supervisor se fusionaron en Glutomatic. El
                      redirect existe porque esas URLs se pudieron compartir por
                      chat: sin el, un link viejo cae en un 404 sin explicacion. */}
                  <Route
                    path="operador"
                    element={<Navigate to="/modulos/laboratorio" replace />}
                  />
                  <Route
                    path="supervisor"
                    element={<Navigate to="/modulos/laboratorio" replace />}
                  />
                </Route>
                <Route path="resources" element={<ResourcesPage />} />
                <Route
                  path="resources/new"
                  element={
                    <RoleProtectedRoute allowedRoles={["ADMIN"]}>
                      <ResourceEditorPage />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="resources/:id/edit"
                  element={
                    <RoleProtectedRoute allowedRoles={["ADMIN"]}>
                      <ResourceEditorPage />
                    </RoleProtectedRoute>
                  }
                />
                <Route path="resources/:idOrSlug" element={<ResourceDetailPage />} />
                <Route
                  path="admin/workshops/import"
                  element={
                    <RoleProtectedRoute allowedRoles={["ADMIN"]}>
                      <AdminWorkshopsImportPage />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="admin/workshops/rules"
                  element={
                    <RoleProtectedRoute allowedRoles={["ADMIN"]}>
                      <AdminWorkshopsRulesPage />
                    </RoleProtectedRoute>
                  }
                />
                <Route path="projects" element={<ProjectsPage />} />
                <Route
                  path="projects/new"
                  element={
                    <RoleProtectedRoute allowedRoles={["ADMIN", "AGENT"]}>
                      <ProjectEditorPage />
                    </RoleProtectedRoute>
                  }
                />
                <Route
                  path="projects/:id/edit"
                  element={
                    <RoleProtectedRoute allowedRoles={["ADMIN", "AGENT"]}>
                      <ProjectEditorPage />
                    </RoleProtectedRoute>
                  }
                />
                <Route path="projects/:idOrSlug" element={<ProjectDetailPage />} />
                <Route path="setup-password" element={<SetupPasswordPage />} />
                <Route path="change-password" element={<ChangePasswordPage />} />
              </Route>
            </Routes>
          </Suspense>
          <Toaster position="top-right" />
        </div>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
