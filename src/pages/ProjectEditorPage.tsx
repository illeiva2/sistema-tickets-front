import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui";
import { ArrowLeft, Eye, Save } from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";
import { useAuth } from "../hooks";
import type { ProjectListItem, ProjectStatus } from "../types/projects";
import {
  ALL_PROJECT_STATUSES,
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_GLYPH,
  PROJECT_STATUS_STYLE,
} from "../constants/projectStatus";
import MarkdownView from "../components/MarkdownView";

interface AgentMini {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "AGENT" | "USER";
}

const toLocalDateInput = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const fromLocalDateInput = (v: string): string | null => {
  if (!v) return null;
  const d = new Date(v + "T00:00:00");
  return isNaN(d.getTime()) ? null : d.toISOString();
};

const ProjectEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditing = Boolean(id);
  const isAdmin = user?.role === "ADMIN";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("PLANNED");
  const [progressPercent, setProgressPercent] = useState<string>("");
  const [startedAt, setStartedAt] = useState("");
  const [expectedEndAt, setExpectedEndAt] = useState("");
  const [completedAt, setCompletedAt] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [leadId, setLeadId] = useState<string>("");
  const [teamUserIds, setTeamUserIds] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState<AgentMini[]>([]);

  // Cargar lista de staff para selectores de lead/team.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await api.get("/api/users/agents");
        if (!cancelled) {
          setStaff(resp.data?.data ?? []);
          // Si es nuevo proyecto, lead default = current user.
          if (!isEditing && user?.id) setLeadId(user.id);
        }
      } catch {
        // silencio
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEditing, user?.id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await api.get(`/api/projects/${id}`);
        if (cancelled) return;
        const p: ProjectListItem = resp.data?.data;
        if (p) {
          setTitle(p.title);
          setDescription(p.description);
          setExcerpt(p.excerpt ?? "");
          setStatus(p.status);
          setProgressPercent(
            p.progressPercent !== null && p.progressPercent !== undefined
              ? String(p.progressPercent)
              : "",
          );
          setStartedAt(toLocalDateInput(p.startedAt));
          setExpectedEndAt(toLocalDateInput(p.expectedEndAt));
          setCompletedAt(toLocalDateInput(p.completedAt));
          setIsPublished(p.isPublished);
          setIsPinned(p.isPinned);
          setLeadId(p.leadId);
          setTeamUserIds(p.team.map((t) => t.id));
        }
      } catch (e: any) {
        toast.error(
          e?.response?.data?.error?.message ||
            "No se pudo cargar el proyecto",
        );
        navigate("/projects");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  const handleSave = async (publishOverride?: boolean) => {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 3) {
      toast.error("El título debe tener al menos 3 caracteres");
      return;
    }
    if (!description.trim()) {
      toast.error("La descripción no puede estar vacía");
      return;
    }

    const payload: any = {
      title: trimmedTitle,
      description,
      excerpt: excerpt.trim() || null,
      status,
      progressPercent:
        progressPercent.trim() === "" ? null : Number(progressPercent),
      startedAt: fromLocalDateInput(startedAt),
      expectedEndAt: fromLocalDateInput(expectedEndAt),
      completedAt: fromLocalDateInput(completedAt),
      isPublished: publishOverride === undefined ? isPublished : publishOverride,
      isPinned,
      teamUserIds,
    };
    // Solo mandamos leadId si es ADMIN o si es nuevo proyecto.
    if (isAdmin || !isEditing) {
      payload.leadId = leadId;
    }

    try {
      setSaving(true);
      const resp = isEditing
        ? await api.patch(`/api/projects/${id}`, payload)
        : await api.post("/api/projects", payload);

      const saved: ProjectListItem = resp.data?.data;
      toast.success(isEditing ? "Cambios guardados" : "Proyecto creado");
      if (saved?.slug) navigate(`/projects/${saved.slug}`);
      else navigate("/projects");
    } catch (e: any) {
      toast.error(
        e?.response?.data?.error?.message || "No se pudo guardar",
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleTeamMember = (uid: string) => {
    if (uid === leadId) return; // El lead no se puede agregar al team aparte.
    setTeamUserIds((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid],
    );
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-1/3 bg-muted/50 rounded animate-pulse" />
        <div className="h-64 bg-muted/30 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/projects">
              <ArrowLeft size={15} className="mr-1.5" />
              Volver
            </Link>
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">
            {isEditing ? "Editar proyecto" : "Nuevo proyecto"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview((v) => !v)}
            title="Alternar vista previa"
          >
            <Eye size={14} className="mr-1.5" />
            {showPreview ? "Ocultar vista previa" : "Vista previa"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => handleSave(false)}
            title="Guardar como borrador"
          >
            Guardar borrador
          </Button>
          <Button
            size="sm"
            disabled={saving}
            onClick={() => handleSave(true)}
            title="Publicar (visible para todos)"
          >
            <Save size={14} className="mr-1.5" />
            {isEditing && isPublished ? "Guardar y publicar" : "Publicar"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[12.5px] font-medium text-muted-foreground">
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Portal de granos GRF"
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[12.5px] font-medium text-muted-foreground">
                Estado
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-2 py-2 text-sm border border-border rounded-md bg-background"
              >
                {ALL_PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PROJECT_STATUS_GLYPH[s]} {PROJECT_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[12.5px] font-medium text-muted-foreground">
                Progreso{" "}
                <span className="text-muted-foreground font-normal">
                  (0-100, opcional)
                </span>
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={progressPercent}
                onChange={(e) => setProgressPercent(e.target.value)}
                placeholder="Ej: 70"
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[12.5px] font-medium text-muted-foreground">
                Inicio
              </label>
              <input
                type="date"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
                className="w-full px-2 py-2 text-sm border border-border rounded-md bg-background"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12.5px] font-medium text-muted-foreground">
                Fin estimado
              </label>
              <input
                type="date"
                value={expectedEndAt}
                onChange={(e) => setExpectedEndAt(e.target.value)}
                className="w-full px-2 py-2 text-sm border border-border rounded-md bg-background"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12.5px] font-medium text-muted-foreground">
                Terminado
              </label>
              <input
                type="date"
                value={completedAt}
                onChange={(e) => setCompletedAt(e.target.value)}
                className="w-full px-2 py-2 text-sm border border-border rounded-md bg-background"
              />
            </div>
          </div>

          {isAdmin && (
            <div className="space-y-1">
              <label className="text-[12.5px] font-medium text-muted-foreground">
                Lead (responsable)
              </label>
              <select
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                className="w-full px-2 py-2 text-sm border border-border rounded-md bg-background"
              >
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[12.5px] font-medium text-muted-foreground">
              Equipo (otros responsables)
            </label>
            <div className="flex flex-wrap gap-1.5 p-2 border border-border rounded-md bg-background min-h-[44px]">
              {staff
                .filter((s) => s.id !== leadId)
                .map((s) => {
                  const active = teamUserIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleTeamMember(s.id)}
                      className={`inline-flex items-center gap-1 text-[11.5px] px-2 py-1 rounded-md border transition-all ${
                        active
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background hover:bg-muted/40"
                      }`}
                    >
                      {s.name}
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[12.5px] font-medium text-muted-foreground">
              Resumen (opcional)
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="1-2 líneas que se muestran en el listado y la card del dashboard."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background resize-none"
            />
          </div>

          <div className="rounded-md border border-border bg-card/40 p-3">
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="mt-0.5 rounded border-border"
              />
              <span className="flex-1 min-w-0">
                <span className="block text-[12.5px] font-medium">
                  📌 Destacar
                </span>
                <span className="block text-[11.5px] text-muted-foreground">
                  Aparece arriba del listado de proyectos y en el dashboard.
                </span>
              </span>
            </label>
          </div>

          <div className="space-y-1">
            <label className="text-[12.5px] font-medium text-muted-foreground flex items-center justify-between">
              <span>Descripción (Markdown)</span>
              <a
                href="https://www.markdownguide.org/basic-syntax/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-primary hover:underline"
              >
                ¿Cómo escribir Markdown?
              </a>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`# Título\n\n## Etapa actual\n\nDescripción de lo que está pasando.\n\n## Próximos pasos\n\n- Item 1\n- Item 2`}
              rows={20}
              className="w-full px-3 py-2 text-[13px] font-mono border border-border rounded-md bg-background resize-y"
            />
          </div>
        </div>

        {showPreview && (
          <div className="border border-border rounded-md p-4 bg-card max-h-[80vh] overflow-y-auto">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
              Vista previa
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border ${PROJECT_STATUS_STYLE[status]}`}
              >
                <span aria-hidden>{PROJECT_STATUS_GLYPH[status]}</span>
                {PROJECT_STATUS_LABEL[status]}
              </span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight mb-2">
              {title || "Sin título"}
            </h2>
            {excerpt && (
              <p className="text-sm text-muted-foreground mb-4">{excerpt}</p>
            )}
            <MarkdownView
              source={description || "_Sin contenido todavía._"}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectEditorPage;
