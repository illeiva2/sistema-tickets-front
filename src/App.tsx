// React 18 with jsx:react-jsx doesn't require explicit import
import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// Componentes que SI van en el bundle inicial: layout, providers,
// proteccion de rutas, error boundary. Son indispensables y livianos.
import ProtectedRoute, { RoleProtectedRoute } from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { NotificationsProvider } from "./contexts/NotificationsContext";
import { AuthProvider } from "./contexts/AuthContext";
import { TicketsProvider } from "./contexts/TicketsContext";

// Paginas: lazy-load. Cada una se descarga solo cuando se navega ahi.
// Esto reduce drasticamente el tiempo de primera carga.
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const TicketsPage = lazy(() => import("./pages/TicketsPage"));
const TicketDetailPage = lazy(() => import("./pages/TicketDetailPage"));
const NewTicketPage = lazy(() => import("./pages/NewTicketPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const FileManagementPage = lazy(() => import("./pages/FileManagementPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const DepartmentsPage = lazy(() => import("./pages/DepartmentsPage"));
const ResourcesPage = lazy(() => import("./pages/ResourcesPage"));
const ResourceDetailPage = lazy(() => import("./pages/ResourceDetailPage"));
const ResourceEditorPage = lazy(() => import("./pages/ResourceEditorPage"));
const AdminWorkshopsImportPage = lazy(() => import("./pages/AdminWorkshopsImportPage"));
const AdminWorkshopsRulesPage = lazy(() => import("./pages/AdminWorkshopsRulesPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage"));
const ProjectEditorPage = lazy(() => import("./pages/ProjectEditorPage"));
const OAuthCallbackPage = lazy(() => import("./pages/OAuthCallbackPage"));
const SetupPasswordPage = lazy(() => import("./pages/SetupPasswordPage"));
const ChangePasswordPage = lazy(() => import("./pages/ChangePasswordPage"));
const OAuthHandler = lazy(() => import("./components/OAuthHandler"));
const OAuthWrapper = lazy(() => import("./components/OAuthWrapper"));

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
              <Route path="/oauth" element={<OAuthHandler />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <NotificationsProvider>
                      <TicketsProvider>
                        <Layout />
                      </TicketsProvider>
                    </NotificationsProvider>
                  </ProtectedRoute>
                }
              >
                <Route index element={<OAuthWrapper />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="tickets" element={<TicketsPage />} />
                <Route path="tickets/new" element={<NewTicketPage />} />
                <Route path="tickets/:id" element={<TicketDetailPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
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
