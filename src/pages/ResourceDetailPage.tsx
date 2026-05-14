import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui";
import { ArrowLeft, BookOpen, Edit, Eye, Trash2, Tag as TagIcon } from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";
import { useAuth } from "../hooks";
import type { Resource } from "../types/resources";
import {
  RESOURCE_CATEGORY_GLYPH,
  RESOURCE_CATEGORY_LABEL,
  RESOURCE_CATEGORY_STYLE,
} from "../constants/resourceCategories";
import MarkdownView from "../components/MarkdownView";
import Avatar from "../components/Avatar";

const ResourceDetailPage: React.FC = () => {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const isStaff = user?.role === "ADMIN" || user?.role === "AGENT";

  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!idOrSlug) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const resp = await api.get(`/api/resources/${idOrSlug}`);
        if (!cancelled) setResource(resp.data?.data ?? null);
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.response?.data?.error?.message || "No se pudo cargar el recurso",
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
    if (!resource) return;
    if (
      !confirm(
        `¿Eliminar definitivamente "${resource.title}"? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    try {
      await api.delete(`/api/resources/${resource.id}`);
      toast.success("Recurso eliminado");
      navigate("/resources");
    } catch (e: any) {
      toast.error(
        e?.response?.data?.error?.message || "No se pudo eliminar el recurso",
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

  if (error || !resource) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Button variant="outline" size="sm" onClick={() => navigate("/resources")}>
          <ArrowLeft size={15} className="mr-1.5" />
          Volver a Recursos
        </Button>
        <div className="border border-border rounded-lg p-8 text-center">
          <BookOpen size={32} className="text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {error || "Recurso no encontrado"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <article className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate("/resources")}>
          <ArrowLeft size={15} className="mr-1.5" />
          Volver
        </Button>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={`/resources/${resource.id}/edit`}>
                <Edit size={14} className="mr-1.5" />
                Editar
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 size={14} className="mr-1.5" />
              Eliminar
            </Button>
          </div>
        )}
      </div>

      <header className="space-y-3 pb-4 border-b border-border">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border ${RESOURCE_CATEGORY_STYLE[resource.category]}`}
          >
            <span aria-hidden>{RESOURCE_CATEGORY_GLYPH[resource.category]}</span>
            {RESOURCE_CATEGORY_LABEL[resource.category]}
          </span>
          {!resource.isPublished && (
            <span className="text-[11px] px-2 py-0.5 rounded-md border border-amber-300/70 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800/60 dark:text-amber-300 font-medium">
              Borrador
            </span>
          )}
          {/* Audiencia: chips por sector. Solo visible para staff
              (ADMIN/AGENT) — el USER promedio no necesita ver esto. */}
          {isStaff &&
            resource.audienceDepartments &&
            resource.audienceDepartments.length > 0 && (
              <>
                <span className="text-[11px] text-muted-foreground">
                  Audiencia:
                </span>
                {resource.audienceDepartments.map((d) => (
                  <span
                    key={d.id}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border"
                    style={{
                      backgroundColor: d.color
                        ? `${d.color}20`
                        : undefined,
                      borderColor: d.color ? `${d.color}60` : undefined,
                      color: d.color ?? undefined,
                    }}
                  >
                    {d.icon && <span aria-hidden>{d.icon}</span>}
                    {d.name}
                  </span>
                ))}
              </>
            )}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{resource.title}</h1>
        {resource.excerpt && (
          <p className="text-[14.5px] text-muted-foreground leading-relaxed">
            {resource.excerpt}
          </p>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          {resource.author && (
            <span className="flex items-center gap-1.5">
              <Avatar
                name={resource.author.name}
                email={resource.author.email}
                size={18}
              />
              {resource.author.name}
            </span>
          )}
          <span>
            Actualizado{" "}
            {new Date(resource.updatedAt).toLocaleDateString("es-AR", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye size={11} />
            {resource.viewCount} vistas
          </span>
          {resource.tags.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <TagIcon size={11} />
              {resource.tags.join(", ")}
            </span>
          )}
        </div>
      </header>

      <MarkdownView source={resource.content} />
    </article>
  );
};

export default ResourceDetailPage;
