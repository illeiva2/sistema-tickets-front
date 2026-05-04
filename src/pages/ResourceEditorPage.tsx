import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui";
import { ArrowLeft, Eye, Save } from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";
import type { Resource, ResourceCategory } from "../types/resources";
import {
  ALL_RESOURCE_CATEGORIES,
  RESOURCE_CATEGORY_GLYPH,
  RESOURCE_CATEGORY_LABEL,
} from "../constants/resourceCategories";
import MarkdownView from "../components/MarkdownView";

const ResourceEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState<ResourceCategory>("HOW_TO");
  const [tagsInput, setTagsInput] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await api.get(`/api/resources/${id}`);
        if (cancelled) return;
        const r: Resource = resp.data?.data;
        if (r) {
          setTitle(r.title);
          setContent(r.content);
          setExcerpt(r.excerpt ?? "");
          setCategory(r.category);
          setTagsInput(r.tags.join(", "));
          setIsPublished(r.isPublished);
        }
      } catch (e: any) {
        toast.error(
          e?.response?.data?.error?.message ||
            "No se pudo cargar el recurso para editar",
        );
        navigate("/resources");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  const parseTags = (raw: string): string[] =>
    raw
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 20);

  const handleSave = async (publishOverride?: boolean) => {
    const payload = {
      title: title.trim(),
      content,
      excerpt: excerpt.trim() || null,
      category,
      tags: parseTags(tagsInput),
      isPublished:
        publishOverride === undefined ? isPublished : publishOverride,
    };

    if (payload.title.length < 3) {
      toast.error("El título debe tener al menos 3 caracteres");
      return;
    }
    if (!payload.content.trim()) {
      toast.error("El contenido no puede estar vacío");
      return;
    }

    try {
      setSaving(true);
      const resp = isEditing
        ? await api.patch(`/api/resources/${id}`, payload)
        : await api.post("/api/resources", payload);

      const saved: Resource = resp.data?.data;
      toast.success(
        isEditing ? "Cambios guardados" : "Recurso creado",
      );
      if (saved?.slug) navigate(`/resources/${saved.slug}`);
      else navigate("/resources");
    } catch (e: any) {
      toast.error(
        e?.response?.data?.error?.message || "No se pudo guardar",
      );
    } finally {
      setSaving(false);
    }
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
            <Link to="/resources">
              <ArrowLeft size={15} className="mr-1.5" />
              Volver
            </Link>
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">
            {isEditing ? "Editar recurso" : "Nuevo recurso"}
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
        {/* Form */}
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[12.5px] font-medium text-muted-foreground">
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Cómo configurar el VPN desde casa"
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[12.5px] font-medium text-muted-foreground">
                Categoría
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ResourceCategory)}
                className="w-full px-2 py-2 text-sm border border-border rounded-md bg-background"
              >
                {ALL_RESOURCE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {RESOURCE_CATEGORY_GLYPH[c]} {RESOURCE_CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[12.5px] font-medium text-muted-foreground">
                Tags (separados por coma)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="vpn, red, configuración"
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[12.5px] font-medium text-muted-foreground">
              Resumen (opcional)
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Un párrafo corto que describe el recurso. Se muestra en el listado."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[12.5px] font-medium text-muted-foreground flex items-center justify-between">
              <span>Contenido (Markdown)</span>
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
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`# Título\n\nLa primera oración aparece en el listado si no llenás "Resumen".\n\n## Pasos\n\n1. Primer paso\n2. Segundo paso\n\n> Tip importante\n\nPodés usar **negrita**, *cursiva*, [enlaces](https://...) y código \`inline\`.`}
              rows={20}
              className="w-full px-3 py-2 text-[13px] font-mono border border-border rounded-md bg-background resize-y"
            />
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="border border-border rounded-md p-4 bg-card max-h-[80vh] overflow-y-auto">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
              Vista previa
            </div>
            <h2 className="text-2xl font-semibold tracking-tight mb-2">
              {title || "Sin título"}
            </h2>
            {excerpt && (
              <p className="text-sm text-muted-foreground mb-4">{excerpt}</p>
            )}
            <MarkdownView source={content || "_Sin contenido todavía._"} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceEditorPage;
