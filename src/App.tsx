// React 18 with jsx:react-jsx doesn't require explicit import
import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import TicketsPage from "./pages/TicketsPage";
import TicketDetailPage from "./pages/TicketDetailPage";
import NewTicketPage from "./pages/NewTicketPage";
import NotificationsPage from "./pages/NotificationsPage";
import FileManagementPage from "./pages/FileManagementPage";
import UsersPage from "./pages/UsersPage";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import SetupPasswordPage from "./pages/SetupPasswordPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import OAuthHandler from "./components/OAuthHandler";
import OAuthWrapper from "./components/OAuthWrapper";
import OAuthDebug from "./components/OAuthDebug";
import ProtectedRoute, { RoleProtectedRoute } from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { NotificationsProvider } from "./contexts/NotificationsContext";

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <OAuthDebug />
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
                  <Layout />
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
            <Route path="setup-password" element={<SetupPasswordPage />} />
            <Route path="change-password" element={<ChangePasswordPage />} />
          </Route>
        </Routes>
        <Toaster position="top-right" />
      </div>
    </ErrorBoundary>
  );
}

export default App;
