import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  EmptyState,
  Button,
  Badge,
  Input,
} from "@/components/ui";
import {
  ArrowLeft,
  Edit,
  MessageSquare,
  Paperclip,
  User,
  Calendar,
  Clock,
} from "lucide-react";
import { useTickets, useAuth } from "../hooks";
import FileUploadZone from "../components/FileUploadZone";
import AdvancedFilePreview from "../components/AdvancedFilePreview";
import api from "../lib/api";
import toast from "react-hot-toast";

const TicketDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getTicketById, addComment } = useTickets();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [ticket, setTicket] = useState<any | null>(null);

  // Determinar si el usuario es admin
  const isAdmin = user?.role === "ADMIN";
  const [commentText, setCommentText] = useState("");
  const [adding, setAdding] = useState(false);
  const [agents, setAgents] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [saving, setSaving] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeComment, setCloseComment] = useState("");

  // Estado para el modal de edición
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    status: "OPEN"
  });

  // Función para abrir el modal de edición con los datos actuales
  const openEditModal = () => {
    if (ticket) {
      setEditFormData({
        title: ticket.title || "",
        description: ticket.description || "",
        priority: ticket.priority || "MEDIUM",
        status: ticket.status || "OPEN"
      });
      setShowEditModal(true);
    }
  };

  // Función para actualizar el ticket
  const handleUpdateTicket = async () => {
    try {
      setSaving(true);
      const response = await api.patch(`/api/tickets/${id}`, editFormData);

      if (response.data.success) {
        toast.success("Ticket actualizado correctamente");
        setTicket((prev: any) => ({
          ...(prev || {}),
          ...(response.data.data || {})
        }));
        setShowEditModal(false);
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || "Error al actualizar el ticket";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // Función para formatear el número del ticket
  const formatTicketNumber = (ticketNumber: number) => {
    return ticketNumber.toString().padStart(5, "0");
  };

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        console.log("Loading ticket with ID:", id);
        const t = await getTicketById(id);
        console.log("Ticket loaded:", t);
        if (!cancelled) {
          setTicket(t);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error loading ticket:", error);
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // fijar dependencias para evitar recargas innecesarias
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Cargar agentes para asignación
  React.useEffect(() => {
    const loadAgents = async () => {
      try {
        const res = await api.get("/api/users/agents");
        setAgents(res.data?.data || []);
      } catch {
        // noop
      }
    };
    loadAgents();
  }, []);

  // Función para cerrar ticket
  const handleCloseTicket = async () => {
    if (!closeComment.trim()) {
      toast.error("Debes proporcionar un comentario para cerrar el ticket");
      return;
    }

    try {
      setSaving(true);
      const response = await api.post(`/api/tickets/${id}/close`, {
        comment: closeComment.trim()
      });

      if (response.data.success) {
        toast.success("Ticket cerrado correctamente");
        setTicket(response.data.data);
        setShowCloseModal(false);
        setCloseComment("");
      }
    } catch (error: any) {
      const message = error.response?.data?.error?.message || "Error al cerrar el ticket";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // Función para reclamar ticket (auto-asignación)
  const handleClaimTicket = async () => {
    if (claiming) return; // Prevenir doble click
    try {
      setClaiming(true);
      const response = await api.patch(`/api/tickets/${id}/claim`);

      if (response.data.success) {
        toast.success("¡Ticket reclamado! Ahora está asignado a ti.");
        setTicket(response.data.data);
      }
    } catch (error: any) {
      const message =
        error.response?.data?.error?.message || "Error al reclamar el ticket";
      toast.error(message);
    } finally {
      setClaiming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/tickets")}
          >
            <ArrowLeft size={16} className="mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              Ticket #
              {ticket?.ticketNumber
                ? formatTicketNumber(ticket.ticketNumber)
                : "..."}
            </h1>
            <p className="text-muted-foreground">Detalles del ticket</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cargando...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded animate-pulse"></div>
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
                  <div className="h-4 bg-muted rounded animate-pulse w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Información</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded animate-pulse"></div>
                  <div className="h-4 bg-muted rounded animate-pulse"></div>
                  <div className="h-4 bg-muted rounded animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          className="px-2 py-1 text-sm"
          variant="outline"
          size="sm"
          onClick={() => navigate("/tickets")}
        >
          <ArrowLeft size={16} className="mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold px-2">
            Ticket #
            {ticket?.ticketNumber
              ? formatTicketNumber(ticket.ticketNumber)
              : "..."}
          </h1>
          <h2 className="text-muted-foreground px-2 pt-1">
            Detalles del ticket
          </h2>
        </div>
        {isAdmin && (
          <div className="ml-auto flex space-x-2">
            <Button
              variant="outline"
              className="px-2 py-1 text-sm"
              size="sm"
              onClick={() => {
                openEditModal();
              }}
            >
              <Edit size={16} className="mr-2" />
              Editar
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contenido principal */}
        <div className="lg:col-span-2 space-y-4 px-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center px-2 pt-2 justify-between">
                <span className="pr-4 pl-2">
                  {ticket?.title || `Ticket ${id}`}
                </span>
                <Badge variant="secondary" className="px-2 py-1 text-sm">
                  {ticket?.status || "OPEN"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pt-4">
              <div className="space-y-4">
                <p className="text-muted-foreground leading-relaxed px-2 pb-2">
                  {ticket?.description || "Sin descripción"}
                </p>

                <div className="flex items-center pb-2 space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <User size={14} />
                    <span>
                      Reportado por: {ticket?.requester?.email || "-"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar size={14} />
                    <span>
                      {ticket?.createdAt
                        ? new Date(ticket.createdAt).toLocaleString()
                        : ""}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comentarios */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 px-2 pt-2">
                <MessageSquare size={20} />
                <span>Comentarios</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pt-4">
              {ticket?.comments && ticket.comments.length > 0 ? (
                <div className="space-y-4">
                  {ticket.comments.map((c: any) => (
                    <div key={c.id} className="border rounded-md p-2">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm text-muted-foreground">
                          {c.author?.name || c.author?.email || "Usuario"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(c.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-sm">{c.message}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<MessageSquare size={32} className="pr-2" />}
                  title="Sin comentarios"
                  description="Este ticket aún no tiene comentarios. Sé el primero en agregar información o actualizaciones."
                  action={null}
                />
              )}

              {/* Formulario para nuevo comentario */}
              <div className="mt-4 flex items-center space-x-2 px-2 pb-3">
                <Input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Escribe un comentario..."
                  className="flex-1 px-3 pb-2 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                />
                <Button
                  disabled={adding || !commentText.trim()}
                  onClick={async () => {
                    if (!id || !commentText.trim()) return;
                    try {
                      setAdding(true);
                      const newC = await addComment(id, commentText.trim());
                      setTicket((prev: any) => {
                        if (!prev) return prev;
                        const comments = prev.comments
                          ? [...prev.comments, newC]
                          : [newC];
                        return { ...prev, comments };
                      });
                      setCommentText("");
                    } finally {
                      setAdding(false);
                    }
                  }}
                >
                  {adding ? (
                    "Enviando..."
                  ) : (
                    <>
                      <MessageSquare size={16} className="mr-2" />
                      Comentar
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="px-3 pt-2">Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-3 pt-4 pb-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Estado
                </label>
                <div className="flex items-center space-x-2">
                  {user?.role === "USER" ? (
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={
                          ticket?.status === "CLOSED" ? "default" : "secondary"
                        }
                        className="px-3 py-1 text-sm font-medium"
                      >
                        {ticket?.status === "OPEN" && "Abierto"}
                        {ticket?.status === "IN_PROGRESS" && "En progreso"}
                        {ticket?.status === "RESOLVED" && "Resuelto"}
                        {ticket?.status === "CLOSED" && "Cerrado"}
                      </Badge>
                      {ticket?.status !== "CLOSED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowCloseModal(true)}
                        >
                          Cerrar Ticket
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      <select
                        className="px-2 py-1 border rounded-md text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                        value={ticket?.status || "OPEN"}
                        onChange={async (e) => {
                          if (!ticket) return;
                          setSaving(true);
                          try {
                            const resp = await api.patch(
                              `/api/tickets/${ticket.id}`,
                              { status: e.target.value },
                            );
                            setTicket((prev: any) => ({
                              ...(prev || {}),
                              ...(resp.data?.data || {}),
                            }));
                          } finally {
                            setSaving(false);
                          }
                        }}
                      >
                        <option value="OPEN">Abierto</option>
                        <option value="IN_PROGRESS">En progreso</option>
                        <option value="RESOLVED">Resuelto</option>
                        <option value="CLOSED">Cerrado</option>
                      </select>
                      {saving && (
                        <span className="text-xs text-muted-foreground">
                          Guardando...
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Prioridad
                </label>
                <div className="flex items-center space-x-2">
                  {user?.role === "USER" ? (
                    <Badge
                      variant="secondary"
                      className="px-3 py-1 text-sm font-medium"
                    >
                      {ticket?.priority === "LOW" && "Baja"}
                      {ticket?.priority === "MEDIUM" && "Media"}
                      {ticket?.priority === "HIGH" && "Alta"}
                      {ticket?.priority === "URGENT" && "Urgente"}
                    </Badge>
                  ) : (
                    <select
                      className="px-2 py-1 border rounded-md text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                      value={ticket?.priority || "MEDIUM"}
                      onChange={async (e) => {
                        if (!ticket) return;
                        setSaving(true);
                        try {
                          const resp = await api.patch(
                            `/api/tickets/${ticket.id}`,
                            { priority: e.target.value },
                          );
                          setTicket((prev: any) => ({
                            ...(prev || {}),
                            ...(resp.data?.data || {}),
                          }));
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      <option value="LOW">Baja</option>
                      <option value="MEDIUM">Media</option>
                      <option value="HIGH">Alta</option>
                      <option value="URGENT">Urgente</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Asignado a
                </label>
                <div className="flex items-center space-x-2">
                  <User size={14} />
                  {user?.role === "ADMIN" ? (
                    <select
                      className="px-2 py-1 border rounded-md text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                      value={ticket?.assignee?.id || ""}
                      onChange={async (e) => {
                        if (!ticket) return;
                        setSaving(true);
                        try {
                          const resp = await api.patch(
                            `/api/tickets/${ticket.id}`,
                            {
                              assigneeId: e.target.value || null,
                            },
                          );
                          setTicket((prev: any) => ({
                            ...(prev || {}),
                            ...(resp.data?.data || {}),
                          }));
                        } finally {
                          setSaving(false);
                        }
                      }}
                    >
                      <option value="">Sin asignar</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.email})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex flex-col space-y-2 w-full">
                      <span className="text-sm px-2 py-1 bg-muted rounded-md w-full">
                        {ticket?.assignee?.name || "Sin asignar"}
                      </span>
                      {user?.role === "AGENT" && !ticket?.assignee && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={handleClaimTicket}
                          disabled={claiming}
                          className="w-full text-xs flex items-center justify-center gap-2"
                        >
                          {claiming ? (
                            <>
                              <svg
                                className="animate-spin h-3 w-3"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8v8H4z"
                                />
                              </svg>
                              Reclamando...
                            </>
                          ) : (
                            "Reclamar Ticket"
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Creado
                </label>
                <div className="flex items-center space-x-2">
                  <Clock size={14} />
                  <span className="text-sm">
                    {ticket?.createdAt
                      ? new Date(ticket.createdAt).toLocaleString()
                      : ""}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 px-3 pt-2">
                <Paperclip size={20} />
                <span>Archivos</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pt-4 pb-2">
              {/* Zona de upload con drag & drop */}
              <FileUploadZone
                ticketId={id!}
                maxFiles={20}
                maxSize={10 * 1024 * 1024} // 10MB
                onSuccess={(newAttachments) => {
                  setTicket((prev: any) => {
                    if (!prev) return prev;
                    const attachments = prev.attachments
                      ? [...newAttachments, ...prev.attachments]
                      : newAttachments;
                    return { ...prev, attachments };
                  });
                }}
                onError={(error) => {
                  console.error("Error uploading files:", error);
                }}
                className="mb-4"
              />

              {/* Lista de archivos existentes */}
              {ticket?.attachments && ticket.attachments.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">
                    Archivos adjuntos ({ticket.attachments.length})
                  </h4>
                  {ticket.attachments.map((attachment: any) => (
                    <AdvancedFilePreview
                      key={attachment.id}
                      attachment={attachment}
                      onDelete={async (attachmentId) => {
                        try {
                          await api.delete(`/api/attachments/${attachmentId}`);
                          setTicket((prev: any) => {
                            if (!prev) return prev;
                            const attachments = (prev.attachments || []).filter(
                              (a: any) => a.id !== attachmentId,
                            );
                            return { ...prev, attachments };
                          });
                          toast.success("Archivo eliminado correctamente");
                        } catch (error: any) {
                          const message =
                            error.response?.data?.error?.message ||
                            "Error al eliminar archivo";
                          toast.error(message);
                        }
                      }}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<Paperclip size={32} />}
                  title="Sin archivos"
                  description="No se han adjuntado archivos a este ticket."
                  action={null}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal para cerrar ticket */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Cerrar Ticket
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Para cerrar este ticket, debes proporcionar un comentario
              explicando por qué se considera resuelto.
            </p>

            <textarea
              value={closeComment}
              onChange={(e) => setCloseComment(e.target.value)}
              placeholder="Describe por qué este ticket se considera resuelto..."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md mb-4 min-h-[100px] resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />

            <div className="flex space-x-3">
              <Button
                onClick={() => setShowCloseModal(false)}
                variant="outline"
                className="flex-1"
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCloseTicket}
                className="flex-1"
                disabled={!closeComment.trim() || saving}
              >
                {saving ? "Cerrando..." : "Cerrar Ticket"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar ticket */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg mx-4 my-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Editar Ticket
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Título
                </label>
                <Input
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  placeholder="Título del ticket"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Descripción
                </label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="Descripción detallada"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Prioridad
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm"
                    value={editFormData.priority}
                    onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
                  >
                    <option value="LOW">Baja</option>
                    <option value="MEDIUM">Media</option>
                    <option value="HIGH">Alta</option>
                    <option value="URGENT">Urgente</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Estado
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm"
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  >
                    <option value="OPEN">Abierto</option>
                    <option value="IN_PROGRESS">En Progreso</option>
                    <option value="RESOLVED">Resuelto</option>
                    <option value="CLOSED">Cerrado</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <Button
                onClick={() => setShowEditModal(false)}
                variant="outline"
                className="flex-1"
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpdateTicket}
                className="flex-1"
                disabled={!editFormData.title.trim() || !editFormData.description.trim() || saving}
              >
                {saving ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDetailPage;
