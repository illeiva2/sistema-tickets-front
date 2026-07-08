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
  UserPlus,
  CheckCircle,
  Lock,
  RotateCcw,
  Share2,
  Sparkles,
  X as XIcon,
} from "lucide-react";
import { useTickets, useAuth } from "../hooks";
import FileUploadZone from "../components/FileUploadZone";
import AdvancedFilePreview from "../components/AdvancedFilePreview";
import api from "../lib/api";
import toast from "react-hot-toast";
import { statusLabel, priorityLabel } from "../constants/ticketLabels";
import {
  TICKET_CATEGORY_LABEL,
  TICKET_CATEGORY_GLYPH,
  TICKET_CATEGORY_STYLE,
  ALL_CATEGORIES,
  categoryLabel,
} from "../constants/ticketCategories";
import TicketTimeline from "../components/TicketTimeline";
import Avatar from "../components/Avatar";
import TicketShareModal from "../components/TicketShareModal";
import CollapsibleSection from "../components/CollapsibleSection";
import { Activity, BookOpen } from "lucide-react";
import FinnegansKbPanel from "../components/FinnegansKbPanel";
import { formatSla, slaToneClasses } from "../lib/sla";

// Tiempo abreviado relativo para la lista de viewers ("hace 2h", "hace 3d").
function viewerTimeAgo(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "ahora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString();
}

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
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveComment, setResolveComment] = useState("");
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenComment, setReopenComment] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [draftingResource, setDraftingResource] = useState(false);
  const [composerMode, setComposerMode] = useState<"public" | "internal">(
    "public",
  );

  // Estado para el modal de edición. El status ya no se edita aquí: se
  // controla con los botones de transición (Tomar / Resolver / Cerrar /
  // Reabrir) en la sidebar de Información.
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
  });

  const openEditModal = () => {
    if (ticket) {
      setEditFormData({
        title: ticket.title || "",
        description: ticket.description || "",
        priority: ticket.priority || "MEDIUM",
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

  // Recarga el ticket desde el back. Lo usamos despues de compartir/quitar.
  const reloadTicket = React.useCallback(async () => {
    if (!id) return;
    try {
      const t = await getTicketById(id);
      if (t) setTicket(t);
    } catch (error) {
      console.error("Error reloading ticket:", error);
    }
  }, [id, getTicketById]);

  // Aplica el resultado de una mutacion preservando los arrays que el
  // endpoint puede no devolver (claim no incluye comments/attachments,
  // por ejemplo). Sin esto, los comentarios desaparecen de la UI tras
  // cualquier accion sobre el ticket.
  const mergeTicketUpdate = React.useCallback((updated: any) => {
    if (!updated) return;
    setTicket((prev: any) => {
      if (!prev) return updated;
      return {
        ...prev,
        ...updated,
        comments: updated.comments ?? prev.comments,
        attachments: updated.attachments ?? prev.attachments,
        viewers: updated.viewers ?? prev.viewers,
        shares: updated.shares ?? prev.shares,
      };
    });
  }, []);

  // Pedir a la IA un borrador de recurso basado en este ticket. Al terminar,
  // navega al editor de recursos con el draft pre-llenado en location.state.
  const handleDraftResource = async () => {
    if (!ticket || draftingResource) return;
    if (
      !confirm(
        "Se va a enviar el contenido de este ticket a Anthropic (Claude) para generar un borrador de artículo. El borrador queda en pantalla — vos decidís si publicarlo. ¿Continuar?",
      )
    ) {
      return;
    }
    try {
      setDraftingResource(true);
      const resp = await api.post(
        `/api/resources/draft-from-ticket/${ticket.id}`,
      );
      const draft = resp.data?.data;
      if (!draft) {
        toast.error("La IA no devolvió un borrador válido");
        return;
      }
      toast.success("Borrador generado. Revisalo antes de publicar.");
      navigate("/resources/new", {
        state: {
          draft,
          fromTicketId: ticket.id,
          fromTicketNumber: ticket.ticketNumber,
        },
      });
    } catch (error: any) {
      const code = error?.response?.data?.error?.code;
      const message =
        error?.response?.data?.error?.message ||
        "No se pudo generar el borrador. Probá de nuevo.";
      if (code === "AI_NOT_CONFIGURED") {
        toast.error(
          "La generación con IA no está configurada en el servidor. Pedile al admin que active ANTHROPIC_API_KEY.",
        );
      } else {
        toast.error(message);
      }
    } finally {
      setDraftingResource(false);
    }
  };

  // Quitar un share del ticket (solo assignee, ADMIN o el propio destinatario).
  const handleUnshare = async (sharedWithUserId: string) => {
    if (!ticket) return;
    if (
      !confirm(
        "¿Quitar el acceso compartido de este agente al ticket?",
      )
    ) {
      return;
    }
    try {
      await api.delete(
        `/api/tickets/${ticket.id}/share/${sharedWithUserId}`,
      );
      toast.success("Acceso retirado");
      await reloadTicket();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error?.message || "No se pudo retirar el acceso",
      );
    }
  };

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const t = await getTicketById(id);
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
        mergeTicketUpdate(response.data.data);
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

  const handleClaimTicket = async () => {
    if (claiming) return;
    try {
      setClaiming(true);
      const response = await api.patch(`/api/tickets/${id}/claim`);
      if (response.data.success) {
        toast.success("¡Ticket reclamado! Ahora está asignado a ti.");
        mergeTicketUpdate(response.data.data);
      }
    } catch (error: any) {
      const message =
        error.response?.data?.error?.message || "Error al reclamar el ticket";
      toast.error(message);
    } finally {
      setClaiming(false);
    }
  };

  const handleResolveTicket = async () => {
    try {
      setSaving(true);
      const response = await api.post(`/api/tickets/${id}/resolve`, {
        comment: resolveComment.trim() || undefined,
      });
      if (response.data.success) {
        toast.success("Ticket resuelto");
        mergeTicketUpdate(response.data.data);
        setShowResolveModal(false);
        setResolveComment("");
      }
    } catch (error: any) {
      const message =
        error.response?.data?.error?.message || "Error al resolver el ticket";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleReopenTicket = async () => {
    if (!reopenComment.trim()) {
      toast.error("Debes proporcionar un comentario para reabrir el ticket");
      return;
    }
    try {
      setSaving(true);
      const response = await api.post(`/api/tickets/${id}/reopen`, {
        comment: reopenComment.trim(),
      });
      if (response.data.success) {
        toast.success("Ticket reabierto");
        mergeTicketUpdate(response.data.data);
        setShowReopenModal(false);
        setReopenComment("");
      }
    } catch (error: any) {
      const message =
        error.response?.data?.error?.message || "Error al reabrir el ticket";
      toast.error(message);
    } finally {
      setSaving(false);
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
      <div className="flex flex-wrap items-center gap-3">
        <Button
          className="px-2 py-1 text-sm shrink-0"
          variant="outline"
          size="sm"
          onClick={() => navigate("/tickets")}
        >
          <ArrowLeft size={16} className="mr-2" />
          Volver
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">
            Ticket #
            {ticket?.ticketNumber
              ? formatTicketNumber(ticket.ticketNumber)
              : "..."}
          </h1>
          <h2 className="text-sm text-muted-foreground">
            Detalles del ticket
          </h2>
        </div>
        {isAdmin && (
          <Button
            variant="outline"
            className="px-2 py-1 text-sm shrink-0"
            size="sm"
            onClick={() => {
              openEditModal();
            }}
          >
            <Edit size={16} className="mr-2" />
            Editar
          </Button>
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
                  {statusLabel(ticket?.status)}
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
              {(() => {
                const role = user?.role;
                const isStaff = role === "AGENT" || role === "ADMIN";
                const visibleComments =
                  ticket?.comments?.filter((c: any) => {
                    const isInternal = (c.message ?? "").startsWith("[INTERNA] ");
                    if (isInternal && !isStaff) return false;
                    return true;
                  }) ?? [];

                if (visibleComments.length === 0) {
                  return (
                    <EmptyState
                      icon={<MessageSquare size={32} className="pr-2" />}
                      title="Sin comentarios"
                      description="Este ticket aún no tiene comentarios. Sé el primero en agregar información o actualizaciones."
                      action={null}
                    />
                  );
                }

                return (
                  <div className="space-y-3">
                    {visibleComments.map((c: any) => {
                      const raw = c.message ?? "";
                      const isInternal = raw.startsWith("[INTERNA] ");
                      const isAgentClose =
                        raw.startsWith("[TICKET CERRADO] ") ||
                        raw.startsWith("[TICKET RESUELTO] ") ||
                        raw.startsWith("[TICKET REABIERTO] ");
                      const display = isInternal ? raw.slice(10) : raw;

                      const wrapperClass = isInternal
                        ? "border border-amber-300/70 bg-amber-50/70 dark:border-amber-800/60 dark:bg-amber-950/20 rounded-md p-3"
                        : isAgentClose
                          ? "border border-border bg-muted/30 rounded-md p-3"
                          : "border border-border rounded-md p-3";

                      return (
                        <div key={c.id} className={wrapperClass}>
                          <div className="flex items-center justify-between mb-1.5 gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar
                                name={c.author?.name}
                                email={c.author?.email}
                                size={22}
                              />
                              <span className="text-sm font-medium truncate">
                                {c.author?.name || c.author?.email || "Usuario"}
                              </span>
                              {isInternal && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 border border-amber-300 rounded-full px-1.5 py-0.5 dark:text-amber-300 dark:bg-amber-900/30 dark:border-amber-800">
                                  Nota interna
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                              {new Date(c.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm whitespace-pre-wrap">
                            {display}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Composer */}
              {(() => {
                const role = user?.role;
                const isStaff = role === "AGENT" || role === "ADMIN";

                return (
                  <div className="mt-4 px-2 pb-3">
                    {isStaff && (
                      <div className="flex items-center gap-1 mb-2">
                        <button
                          type="button"
                          onClick={() => setComposerMode("public")}
                          className={`text-[12px] px-2 py-1 rounded-md transition-colors ${
                            composerMode === "public"
                              ? "bg-muted text-foreground font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          }`}
                        >
                          Pública
                        </button>
                        <button
                          type="button"
                          onClick={() => setComposerMode("internal")}
                          className={`flex items-center gap-1.5 text-[12px] px-2 py-1 rounded-md transition-colors ${
                            composerMode === "internal"
                              ? "bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              composerMode === "internal"
                                ? "bg-amber-500"
                                : "bg-muted-foreground/40"
                            }`}
                          />
                          Nota interna
                        </button>
                        <span className="ml-auto text-[10.5px] text-muted-foreground">
                          {composerMode === "internal"
                            ? "Solo visible para agentes y admins"
                            : "Visible para todos"}
                        </span>
                      </div>
                    )}
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={
                        composerMode === "internal"
                          ? "Escribe una nota interna…"
                          : "Escribe un comentario…"
                      }
                      rows={3}
                      className={`w-full px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 ${
                        composerMode === "internal"
                          ? "border-amber-300 focus:ring-amber-400 bg-amber-50/40 dark:bg-amber-950/20"
                          : "focus:ring-primary"
                      }`}
                    />
                    <div className="flex items-center justify-end mt-2">
                      <Button
                        disabled={adding || !commentText.trim()}
                        onClick={async () => {
                          if (!id || !commentText.trim()) return;
                          try {
                            setAdding(true);
                            const message =
                              composerMode === "internal"
                                ? `[INTERNA] ${commentText.trim()}`
                                : commentText.trim();
                            const newC = await addComment(id, message);
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
                          "Enviando…"
                        ) : composerMode === "internal" ? (
                          "Guardar nota"
                        ) : (
                          <>
                            <MessageSquare size={16} className="mr-2" />
                            Comentar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })()}
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
                <div className="flex flex-col gap-2">
                  <Badge
                    variant={
                      ticket?.status === "CLOSED" ? "default" : "secondary"
                    }
                    className="px-3 py-1 text-sm font-medium w-fit"
                  >
                    {statusLabel(ticket?.status)}
                  </Badge>
                  {(() => {
                    if (!ticket || !user) return null;
                    const status = ticket.status;
                    const role = user.role;
                    const isRequester = ticket.requester?.id === user.id;
                    const isStaff = role === "AGENT" || role === "ADMIN";
                    const buttons: React.ReactNode[] = [];

                    if (
                      isStaff &&
                      !ticket.assignee &&
                      (status === "OPEN" || status === "IN_PROGRESS")
                    ) {
                      buttons.push(
                        <Button
                          key="claim"
                          size="sm"
                          variant="outline"
                          onClick={handleClaimTicket}
                          disabled={claiming || saving}
                          className="justify-start"
                        >
                          <UserPlus size={14} className="mr-2" />
                          Tomar ticket
                        </Button>,
                      );
                    }

                    if (
                      isStaff &&
                      (status === "OPEN" || status === "IN_PROGRESS")
                    ) {
                      buttons.push(
                        <Button
                          key="resolve"
                          size="sm"
                          variant="outline"
                          onClick={() => setShowResolveModal(true)}
                          disabled={saving}
                          className="justify-start text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
                        >
                          <CheckCircle size={14} className="mr-2" />
                          Resolver
                        </Button>,
                      );
                    }

                    if (
                      status !== "CLOSED" &&
                      (isRequester || isStaff)
                    ) {
                      buttons.push(
                        <Button
                          key="close"
                          size="sm"
                          variant="outline"
                          onClick={() => setShowCloseModal(true)}
                          disabled={saving}
                          className="justify-start"
                        >
                          <Lock size={14} className="mr-2" />
                          Cerrar
                        </Button>,
                      );
                    }

                    if (
                      isStaff &&
                      (status === "RESOLVED" || status === "CLOSED")
                    ) {
                      buttons.push(
                        <Button
                          key="reopen"
                          size="sm"
                          variant="outline"
                          onClick={() => setShowReopenModal(true)}
                          disabled={saving}
                          className="justify-start"
                        >
                          <RotateCcw size={14} className="mr-2" />
                          Reabrir
                        </Button>,
                      );
                    }

                    // Compartir: assignee o ADMIN, sobre tickets activos.
                    const isAssignee = ticket.assignee?.id === user.id;
                    if (
                      isStaff &&
                      (isAssignee || role === "ADMIN") &&
                      status !== "CLOSED"
                    ) {
                      buttons.push(
                        <Button
                          key="share"
                          size="sm"
                          variant="outline"
                          onClick={() => setShowShareModal(true)}
                          disabled={saving}
                          className="justify-start"
                        >
                          <Share2 size={14} className="mr-2" />
                          Compartir
                        </Button>,
                      );
                    }

                    // Convertir resolucion a recurso con IA (AGENT/ADMIN, ticket RESOLVED/CLOSED)
                    if (
                      isStaff &&
                      (status === "RESOLVED" || status === "CLOSED")
                    ) {
                      buttons.push(
                        <Button
                          key="draft-resource"
                          size="sm"
                          variant="outline"
                          onClick={handleDraftResource}
                          disabled={draftingResource || saving}
                          className="justify-start"
                          title="Generar un borrador de artículo de base de conocimiento a partir de este ticket usando IA"
                        >
                          <Sparkles size={14} className="mr-2" />
                          {draftingResource
                            ? "Generando..."
                            : "Convertir en recurso"}
                        </Button>,
                      );
                    }

                    if (buttons.length === 0) return null;

                    return (
                      <div className="flex flex-col gap-2">
                        {buttons}
                        {saving && (
                          <span className="text-xs text-muted-foreground">
                            Guardando...
                          </span>
                        )}
                      </div>
                    );
                  })()}
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
                      {priorityLabel(ticket?.priority)}
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
                  Categoría
                </label>
                <div className="flex items-center space-x-2">
                  {user?.role === "USER" && ticket?.requester?.id !== user?.id ? (
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border ${
                        ticket?.category
                          ? TICKET_CATEGORY_STYLE[
                              ticket.category as keyof typeof TICKET_CATEGORY_STYLE
                            ]
                          : "text-muted-foreground bg-muted border-border"
                      }`}
                    >
                      {ticket?.category && (
                        <span aria-hidden>
                          {TICKET_CATEGORY_GLYPH[
                            ticket.category as keyof typeof TICKET_CATEGORY_GLYPH
                          ]}
                        </span>
                      )}
                      {categoryLabel(ticket?.category)}
                    </span>
                  ) : (
                    <select
                      className="px-2 py-1 border rounded-md text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                      value={ticket?.category || ""}
                      onChange={async (e) => {
                        if (!ticket) return;
                        setSaving(true);
                        try {
                          const resp = await api.patch(
                            `/api/tickets/${ticket.id}`,
                            { category: e.target.value || null },
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
                      <option value="">Sin categoría</option>
                      {ALL_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {TICKET_CATEGORY_GLYPH[c]} {TICKET_CATEGORY_LABEL[c]}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {(() => {
                const sla = formatSla(ticket?.dueAt, ticket?.status ?? "OPEN");
                if (sla.tone === "neutral" && !sla.dueAt) return null;
                return (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      SLA
                    </label>
                    <div
                      className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border ${slaToneClasses[sla.tone]}`}
                      title={
                        sla.dueAt
                          ? `Vence: ${new Date(sla.dueAt).toLocaleString()}`
                          : ""
                      }
                    >
                      <Clock size={12} />
                      {sla.text}
                    </div>
                  </div>
                );
              })()}

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

              {/* Compartido con: lista de shares + permite quitar acceso. */}
              {(user?.role === "AGENT" || user?.role === "ADMIN") &&
                Array.isArray(ticket?.shares) &&
                ticket.shares.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <label className="text-xs font-medium text-muted-foreground">
                      Compartido con
                    </label>
                    <ul className="space-y-1.5">
                      {ticket.shares.map((s: any) => {
                        const isMyShare = s.sharedWith?.id === user?.id;
                        const isAssigneeOfTicket =
                          ticket.assignee?.id === user?.id;
                        const canUnshare =
                          user?.role === "ADMIN" ||
                          isAssigneeOfTicket ||
                          isMyShare;
                        return (
                          <li
                            key={s.id}
                            className="flex items-center gap-2 text-[12px]"
                            title={
                              s.message
                                ? `"${s.message}" — ${s.sharedBy?.name}`
                                : `Compartido por ${s.sharedBy?.name}`
                            }
                          >
                            <Avatar
                              name={s.sharedWith?.name}
                              email={s.sharedWith?.email}
                              size={18}
                            />
                            <span className="truncate flex-1 min-w-0">
                              {s.sharedWith?.name || s.sharedWith?.email}
                              {isMyShare && (
                                <span className="ml-1.5 text-[10.5px] text-primary">
                                  (vos)
                                </span>
                              )}
                            </span>
                            {canUnshare && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUnshare(s.sharedWith?.id)
                                }
                                className="text-muted-foreground hover:text-destructive shrink-0"
                                title="Quitar acceso"
                              >
                                <XIcon size={12} />
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

              {/* Lista de viewers (solo para staff). Muestra quien y cuando
                  abrio este ticket. Si nadie lo abrio aun, no se muestra. */}
              {(user?.role === "AGENT" || user?.role === "ADMIN") &&
                Array.isArray(ticket?.viewers) &&
                ticket.viewers.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <label className="text-xs font-medium text-muted-foreground">
                      Visto por
                    </label>
                    <ul className="space-y-1.5">
                      {ticket.viewers
                        .slice(0, 6)
                        .map((v: any) => (
                          <li
                            key={v.user?.id}
                            className="flex items-center gap-2 text-[12px]"
                            title={
                              v.lastReadAt
                                ? new Date(v.lastReadAt).toLocaleString()
                                : ""
                            }
                          >
                            <Avatar
                              name={v.user?.name}
                              email={v.user?.email}
                              size={18}
                            />
                            <span className="truncate flex-1 min-w-0">
                              {v.user?.name || v.user?.email}
                            </span>
                            <span className="text-muted-foreground text-[11px] shrink-0">
                              {v.lastReadAt
                                ? viewerTimeAgo(v.lastReadAt)
                                : ""}
                            </span>
                          </li>
                        ))}
                      {ticket.viewers.length > 6 && (
                        <li className="text-[11px] text-muted-foreground">
                          +{ticket.viewers.length - 6} más
                        </li>
                      )}
                    </ul>
                  </div>
                )}
            </CardContent>
          </Card>

          {ticket?.id && (
            <CollapsibleSection
              icon={<Activity size={16} />}
              title="Actividad"
              hint="Historial del ticket"
            >
              <TicketTimeline
                ticketId={ticket.id}
                refreshKey={ticket?.updatedAt}
              />
            </CollapsibleSection>
          )}

          {/* Sugerencias de la documentación oficial de Finnegans, solo
              para staff. Lazy: el fetch ocurre al expandir la sección. */}
          {ticket?.id &&
            (user?.role === "AGENT" || user?.role === "ADMIN") && (
              <CollapsibleSection
                icon={<BookOpen size={16} />}
                title="Ayuda oficial Finnegans"
                hint="bc.finneg.com"
              >
                <FinnegansKbPanel ticketId={ticket.id} />
              </CollapsibleSection>
            )}

          <CollapsibleSection
            icon={<Paperclip size={16} />}
            title="Archivos"
            count={ticket?.attachments?.length ?? 0}
            hint={
              ticket?.attachments?.length
                ? undefined
                : "Sin archivos adjuntos"
            }
          >
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
          </CollapsibleSection>
        </div>
      </div>

      {/* Modal para resolver ticket */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Resolver Ticket
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Marcá este ticket como resuelto. Podés agregar una nota
              opcional describiendo cómo se resolvió.
            </p>

            <textarea
              value={resolveComment}
              onChange={(e) => setResolveComment(e.target.value)}
              placeholder="Nota de resolución (opcional)…"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md mb-4 min-h-[100px] resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />

            <div className="flex space-x-3">
              <Button
                onClick={() => {
                  setShowResolveModal(false);
                  setResolveComment("");
                }}
                variant="outline"
                className="flex-1"
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleResolveTicket}
                className="flex-1"
                disabled={saving}
              >
                {saving ? "Resolviendo…" : "Resolver"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para reabrir ticket */}
      {showReopenModal && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Reabrir Ticket
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Indicá por qué se reabre el ticket. Si tenía agente asignado,
              vuelve directamente a "En progreso".
            </p>

            <textarea
              value={reopenComment}
              onChange={(e) => setReopenComment(e.target.value)}
              placeholder="Motivo de la reapertura…"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md mb-4 min-h-[100px] resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />

            <div className="flex space-x-3">
              <Button
                onClick={() => {
                  setShowReopenModal(false);
                  setReopenComment("");
                }}
                variant="outline"
                className="flex-1"
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleReopenTicket}
                className="flex-1"
                disabled={!reopenComment.trim() || saving}
              >
                {saving ? "Reabriendo…" : "Reabrir"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para cerrar ticket */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
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
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto py-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl p-6 w-full max-w-lg mx-4 my-auto">
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

      {/* Modal compartir ticket con otro agente */}
      {ticket && (
        <TicketShareModal
          open={showShareModal}
          ticketId={ticket.id}
          agents={agents}
          excludeUserIds={[
            ...(ticket.assignee?.id ? [ticket.assignee.id] : []),
            ...(Array.isArray(ticket.shares)
              ? ticket.shares
                  .map((s: any) => s.sharedWith?.id)
                  .filter(Boolean)
              : []),
            ...(user?.id ? [user.id] : []),
          ]}
          onClose={() => setShowShareModal(false)}
          onShared={reloadTicket}
        />
      )}
    </div>
  );
};

export default TicketDetailPage;
