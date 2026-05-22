import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui";
import {
  ArrowLeft,
  Briefcase,
  Edit,
  Trash2,
  Calendar,
} from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";
import { useAuth } from "../hooks";
import type { ProjectListItem } from "../types/projects";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_GLYPH,
  PROJECT_STATUS_STYLE,
} from "../constants/projectStatus";
import MarkdownView from "../components/MarkdownView";
import Avatar from "../components/Avatar";

const ProjectDetailPage: React.FC = () => {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [project, setProject] = useState<ProjectListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!idOrSlug) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const resp = await api.get(`/api/projects/${idOrSlug}`);
        if (!cancelled) setProject(resp.data?.data ?? null);
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.response?.data?.error?.message || "No se pudo cargar el proyecto",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [idOrSlug]);

  const handleDelete = async () => {
    if (!project) return;
    if (
      !confirm(
        `¿Eliminar definitivamente "${project.title}"? Esta acción no se puede deshacer.`,
      )
    )
      return;
    try {
      await api.delete(`/api/projects/${project.id}`);
      toast.success("Proyecto eliminado");
      navigate("/projects");
    } catch (e: any) {
      toast.error(
        e?.response?.data?.error?.message || "No se pudo eliminar el proyecto",
      );
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <div className="h-8 w-2/3 bg-muted/50 rounded animate-pulse" />
        <div className="h-4 w-1/3 bg-muted/40 rounded animate-pulse" />
        <div className="h-64 bg-muted/30 rounded-lg animate-pulse mt-6" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Button variant="outline" size="sm" onClick={() => navigate("/projects")}>
          <ArrowLeft size={15} className="mr-1.5" />
          Volver a Proyectos
        </Button>
        <div className="border border-border rounded-lg p-8 text-center">
          <Briefcase size={32} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {error || "Proyecto no encontrado"}
          </p>
        </div>
      </div>
    );
  }

  const isStaff = user?.role === "ADMIN" || user?.role === "AGENT";
  const isLead = user?.id === project.leadId;
  const isMember = project.team.some((t) => t.id === user?.id);
  const canEdit = isAdmin || (isStaff && (isLead || isMember));

  const formatDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("es-AR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <article className="max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate("/projects")}>
            <ArrowLeft size={15} className="mr-1.5" />
            Volver
          </Button>
          {canEdit && (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to={`/projects/${project.id}/edit`}>
                  <Edit size={14} className="mr-1.5" />
                  Editar
                </Link>
              </Button>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 size={14} className="mr-1.5" />
                  Eliminar
                </Button>
              )}
            </div>
          )}
        </div>

        <header className="space-y-3 pb-4 border-b border-border">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border ${PROJECT_STATUS_STYLE[project.status]}`}
            >
              <span aria-hidden>{PROJECT_STATUS_GLYPH[project.status]}</span>
              {PROJECT_STATUS_LABEL[project.status]}
            </span>
            {!project.isPublished && (
              <span className="text-[11px] px-2 py-0.5 rounded-md border border-amber-300/70 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800/60 dark:text-amber-300 font-medium">
                Borrador
              </span>
            )}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {project.title}
          </h1>
          {project.excerpt && (
            <p className="text-[14.5px] text-muted-foreground leading-relaxed">
              {project.excerpt}
            </p>
          )}
          {typeof project.progressPercent === "number" && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(0, project.progressPercent))}%`,
                  }}
                />
              </div>
              <span className="text-sm font-medium text-muted-foreground tabular-nums">
                {project.progressPercent}%
              </span>
            </div>
          )}
        </header>

        <MarkdownView source={project.description} />
      </div>

      <aside className="space-y-4">
        <section className="border border-border rounded-lg bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Briefcase size={14} />
            Información
          </h2>

          <div className="space-y-2 text-[12.5px]">
            <div>
              <div className="text-muted-foreground text-[11px]">Lead</div>
              <div className="flex items-center gap-2 mt-0.5">
                <Avatar
                  name={project.lead.name}
                  email={project.lead.email}
                  size={20}
                />
                <span>{project.lead.name}</span>
              </div>
            </div>

            {project.team.length > 0 && (
              <div>
                <div className="text-muted-foreground text-[11px]">
                  Equipo ({project.team.length})
                </div>
                <ul className="space-y-1 mt-0.5">
                  {project.team.map((t) => (
                    <li key={t.id} className="flex items-center gap-2">
                      <Avatar name={t.name} email={t.email} size={18} />
                      <span>{t.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/60">
              <div>
                <div className="text-muted-foreground text-[11px] flex items-center gap-1">
                  <Calendar size={11} />
                  Inicio
                </div>
                <div>{formatDate(project.startedAt)}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-[11px] flex items-center gap-1">
                  <Calendar size={11} />
                  Fin estimado
                </div>
                <div>{formatDate(project.expectedEndAt)}</div>
              </div>
            </div>

            {project.completedAt && (
              <div>
                <div className="text-muted-foreground text-[11px] flex items-center gap-1">
                  <Calendar size={11} />
                  Terminado
                </div>
                <div>{formatDate(project.completedAt)}</div>
              </div>
            )}
          </div>
        </section>
      </aside>
    </article>
  );
};

export default ProjectDetailPage;
