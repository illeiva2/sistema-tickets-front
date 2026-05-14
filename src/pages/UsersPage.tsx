import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Badge,
} from "@/components/ui";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  User,
  Shield,
  UserCheck,
  Eye,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "../hooks";
import api from "../lib/api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

interface User {
  id: string;
  name: string;
  email: string;
  role: "USER" | "AGENT" | "ADMIN";
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  department?: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
  } | null;
  _count: {
    requestedTickets: number;
    assignedTickets: number;
  };
}

interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: "USER" | "AGENT" | "ADMIN";
}

interface UpdateUserData {
  name?: string;
  email?: string;
  role?: "USER" | "AGENT" | "ADMIN";
  departmentId?: string | null;
}

interface DepartmentOption {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

export const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState<CreateUserData>({
    name: "",
    email: "",
    password: "",
    role: "USER",
  });

  const [editForm, setEditForm] = useState<UpdateUserData>({});
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  // Verificar si el usuario actual es ADMIN
  const isAdmin = currentUser?.role === "ADMIN";

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchDepartments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, showInactive]);

  const fetchDepartments = async () => {
    try {
      const resp = await api.get("/api/departments");
      setDepartments(resp.data?.data ?? []);
    } catch {
      // silencioso: si falla, el selector queda vacío y el user puede
      // editar el resto del form igual.
    }
  };

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(
        `/api/users${showInactive ? "?includeInactive=true" : ""}`,
      );
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error: any) {
      toast.error("Error al cargar usuarios");
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createForm.password !== createForm.password) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.post("/api/users", createForm);
      if (response.data.success) {
        toast.success("Usuario creado correctamente");
        setShowCreateModal(false);
        setCreateForm({ name: "", email: "", password: "", role: "USER" });
        fetchUsers();
      }
    } catch (error: any) {
      const message =
        error.response?.data?.error?.message || "Error al crear usuario";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setIsSubmitting(true);
      const response = await api.patch(
        `/api/users/${selectedUser.id}`,
        editForm,
      );
      if (response.data.success) {
        toast.success("Usuario actualizado correctamente");
        setShowEditModal(false);
        setSelectedUser(null);
        setEditForm({});
        fetchUsers();
      }
    } catch (error: any) {
      const message =
        error.response?.data?.error?.message || "Error al actualizar usuario";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (
      !confirm(
        "Esta acción desactiva al usuario: no podrá iniciar sesión, pero sus tickets y comentarios se conservan. ¿Confirmás?",
      )
    )
      return;

    try {
      const response = await api.delete(`/api/users/${userId}`);
      if (response.data.success) {
        toast.success("Usuario desactivado correctamente");
        fetchUsers();
      }
    } catch (error: any) {
      const message =
        error.response?.data?.error?.message || "Error al desactivar usuario";
      toast.error(message);
    }
  };

  const handleRestoreUser = async (userId: string) => {
    try {
      const response = await api.post(`/api/users/${userId}/restore`);
      if (response.data.success) {
        toast.success("Usuario reactivado correctamente");
        fetchUsers();
      }
    } catch (error: any) {
      const message =
        error.response?.data?.error?.message || "Error al reactivar usuario";
      toast.error(message);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: user.department?.id ?? null,
    });
    setShowEditModal(true);
  };

  const openPasswordModal = (user: User) => {
    // Si es el usuario actual, redirigir a la página de cambio de contraseña
    if (user.id === currentUser?.id) {
      navigate("/change-password");
      return;
    }
    
    // Si es otro usuario, abrir modal para blanquear contraseña
    setSelectedUser(user);
    setShowResetPasswordModal(true);
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    try {
      setIsSubmitting(true);
      const response = await api.post(
        `/api/users/${selectedUser.id}/reset-password`
      );
      if (response.data.success) {
        toast.success("Contraseña blanqueada correctamente");
        setShowResetPasswordModal(false);
        setSelectedUser(null);
      }
    } catch (error: any) {
      const message =
        error.response?.data?.error?.message || "Error al blanquear contraseña";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      USER: {
        label: "Usuario",
        dot: "bg-sky-500",
        text: "text-sky-700 dark:text-sky-300",
        bg: "bg-sky-50 dark:bg-sky-950/30 border-sky-200/70 dark:border-sky-800/60",
        icon: User,
      },
      AGENT: {
        label: "Agente",
        dot: "bg-emerald-500",
        text: "text-emerald-700 dark:text-emerald-300",
        bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/70 dark:border-emerald-800/60",
        icon: UserCheck,
      },
      ADMIN: {
        label: "Admin",
        dot: "bg-rose-500",
        text: "text-rose-700 dark:text-rose-300",
        bg: "bg-rose-50 dark:bg-rose-950/30 border-rose-200/70 dark:border-rose-800/60",
        icon: Shield,
      },
    };

    const config =
      roleConfig[role as keyof typeof roleConfig] || roleConfig.USER;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1.5 text-[11px] font-medium rounded-full border px-2 py-0.5 ${config.bg} ${config.text}`}
      >
        <Icon size={11} />
        {config.label}
      </span>
    );
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Acceso Denegado</h2>
          <p className="text-muted-foreground">
            Solo los administradores pueden acceder a la gestión de usuarios.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
            <p className="text-muted-foreground">
              Administra usuarios del sistema
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administra usuarios del sistema
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="px-4 py-2 sm:self-start">
          <Plus size={16} className="mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="text"
                placeholder="Buscar usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-3">
              <label className="flex items-center space-x-2 text-sm text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span>Mostrar inactivos</span>
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUsers}
                className="px-3 py-2 shrink-0"
              >
                <RefreshCw size={16} className="mr-2" />
                Actualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Usuarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user) => {
          const isInactive = !user.isActive;
          return (
            <Card
              key={user.id}
              className={`hover:shadow-md transition-shadow ${
                isInactive ? "opacity-60" : ""
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{user.name}</CardTitle>
                  <div className="ml-4 flex items-center gap-2">
                    {isInactive && (
                      <Badge
                        variant="outline"
                        className="bg-gray-100 text-gray-600 border-gray-300 px-2 py-0.5 text-xs"
                      >
                        Inactivo
                      </Badge>
                    )}
                    {getRoleBadge(user.role)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">{user.email}</div>

                {user.department && (
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border"
                      style={{
                        backgroundColor: user.department.color
                          ? `${user.department.color}20`
                          : undefined,
                        borderColor: user.department.color
                          ? `${user.department.color}60`
                          : undefined,
                        color: user.department.color ?? undefined,
                      }}
                      title="Sector"
                    >
                      {user.department.icon && (
                        <span aria-hidden>{user.department.icon}</span>
                      )}
                      {user.department.name}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Tickets solicitados: {user._count.requestedTickets}</span>
                  <span>Asignados: {user._count.assignedTickets}</span>
                </div>

                <div className="text-xs text-muted-foreground">
                  {isInactive && user.deletedAt
                    ? `Desactivado: ${new Date(user.deletedAt).toLocaleDateString()}`
                    : `Creado: ${new Date(user.createdAt).toLocaleDateString()}`}
                </div>

                <div className="flex space-x-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(user)}
                    className="flex-1"
                    disabled={isInactive}
                  >
                    <Edit size={14} className="mr-1" />
                    Editar
                  </Button>
                  {user.id === currentUser?.id ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openPasswordModal(user)}
                      className="flex-1"
                    >
                      <Eye size={14} className="mr-1" />
                      Cambiar Contraseña
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openPasswordModal(user)}
                      className="flex-1"
                      disabled={isInactive}
                    >
                      <RefreshCw size={14} className="mr-1" />
                      Blanquear Contraseña
                    </Button>
                  )}
                  {user.id !== currentUser?.id &&
                    (isInactive ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestoreUser(user.id)}
                        className="text-emerald-600 hover:text-emerald-700"
                        title="Reactivar usuario"
                      >
                        <RotateCcw size={14} />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Desactivar usuario"
                      >
                        <Trash2 size={14} />
                      </Button>
                    ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal Crear Usuario */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Crear Nuevo Usuario</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <Input
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Contraseña
                </label>
                <Input
                  type="password"
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, password: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rol</label>
                <select
                  value={createForm.role}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      role: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="USER">Usuario</option>
                  <option value="AGENT">Agente</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div className="flex space-x-2 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? "Creando..." : "Crear Usuario"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Usuario */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Editar Usuario</h3>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <Input
                  value={editForm.name || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  type="email"
                  value={editForm.email || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rol</label>
                <select
                  value={editForm.role || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, role: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="USER">Usuario</option>
                  <option value="AGENT">Agente</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Sector
                </label>
                <select
                  value={editForm.departmentId ?? ""}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      departmentId: e.target.value || null,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Sin sector</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.icon ? `${d.icon} ` : ""}
                      {d.name}
                    </option>
                  ))}
                </select>
                {departments.length === 0 && (
                  <p className="text-[11.5px] text-muted-foreground mt-1">
                    Todavía no hay sectores cargados. Andá a{" "}
                    <span className="font-medium">Sectores</span> en el nav
                    para crear el primero.
                  </p>
                )}
              </div>
              <div className="flex space-x-2 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? "Actualizando..." : "Actualizar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Blanquear Contraseña */}
      {showResetPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Blanquear Contraseña</h3>
            <p className="text-sm text-muted-foreground mb-4">
              ¿Estás seguro de que quieres blanquear la contraseña de {selectedUser.name}?
            </p>
            <p className="text-sm text-amber-600 mb-6">
              El usuario deberá crear una nueva contraseña en su próximo inicio de sesión.
            </p>
            <div className="flex space-x-2 pt-4">
              <Button
                onClick={handleResetPassword}
                disabled={isSubmitting}
                className="flex-1"
                variant="destructive"
              >
                {isSubmitting ? "Blanqueando..." : "Sí, Blanquear"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowResetPasswordModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
