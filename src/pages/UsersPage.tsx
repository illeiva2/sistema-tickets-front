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
  createdAt: string;
  updatedAt: string;
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
}

export const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
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

  // Verificar si el usuario actual es ADMIN
  const isAdmin = currentUser?.role === "ADMIN";

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/api/users");
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
    if (!confirm("¿Estás seguro de que quieres eliminar este usuario?")) return;

    try {
      const response = await api.delete(`/api/users/${userId}`);
      if (response.data.success) {
        toast.success("Usuario eliminado correctamente");
        fetchUsers();
      }
    } catch (error: any) {
      const message =
        error.response?.data?.error?.message || "Error al eliminar usuario";
      toast.error(message);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
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
      USER: { color: "bg-blue-100 text-blue-800 border-blue-200", icon: User },
      AGENT: {
        color: "bg-green-100 text-green-800 border-green-200",
        icon: UserCheck,
      },
      ADMIN: { color: "bg-red-100 text-red-800 border-red-200", icon: Shield },
    };

    const config =
      roleConfig[role as keyof typeof roleConfig] || roleConfig.USER;
    const Icon = config.icon;

    return (
      <Badge
        variant="outline"
        className={`${config.color} px-3 py-1 text-xs font-medium`}
      >
        <Icon className="h-3 w-3 mr-2" />
        {role}
      </Badge>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administra usuarios del sistema
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="px-4 py-2">
          <Plus size={16} className="mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
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
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              className="px-3 py-2"
            >
              <RefreshCw size={16} className="mr-2" />
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Usuarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{user.name}</CardTitle>
                <div className="ml-4">{getRoleBadge(user.role)}</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground">{user.email}</div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Tickets solicitados: {user._count.requestedTickets}</span>
                <span>Asignados: {user._count.assignedTickets}</span>
              </div>

              <div className="text-xs text-muted-foreground">
                Creado: {new Date(user.createdAt).toLocaleDateString()}
              </div>

              <div className="flex space-x-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal(user)}
                  className="flex-1"
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
                  >
                    <RefreshCw size={14} className="mr-1" />
                    Blanquear Contraseña
                  </Button>
                )}
                {user.id !== currentUser?.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteUser(user.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal Crear Usuario */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
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
