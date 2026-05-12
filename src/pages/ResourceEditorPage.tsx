import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui";
import { ArrowLeft, Eye, Image as ImageIcon, Save, Sparkles } from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";
import type { Resource, ResourceCategory } from "../types/resources";
import {
  ALL_RESOURCE_CATEGORIES,
  RESOURCE_CATEGORY_GLYPH,
  RESOURCE_CATEGORY_LABEL,
} from "../constants/resourceCategories";
import MarkdownView from "../components/MarkdownView";

interface DraftLocationState {
  draft?: {
    title: string;
    excerpt: string;
    category: ResourceCategory;
    content: string;
    tags: string[];
  };
  fromTicketNumber?: number;
  fromTicketId?: string;
}

const ResourceEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const draftState = (location.state as DraftLocationState | null) ?? null;
  const isEditing = Boolean(id);

  // Si vinimos con un draft generado por IA, pre-llenamos los campos.
  const [title, setTitle] = useState(draftState?.draft?.title ?? "");
  const [content, setContent] = useState(draftState?.draft?.content ?? "");
  const [excerpt, setExcerpt] = useState(draftState?.draft?.excerpt ?? "");
  const [category, setCategory] = useState<ResourceCategory>(
    draftState?.draft?.category ?? "HOW_TO",
  );
  const [tagsInput, setTagsInput] = useState(
    draftState?.draft?.tags?.join(", ") ?? "",
  );
  const [isPublished, setIsPublished] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [showAsModal, setShowAsModal] = useState(false);
  // Datetime-local input usa formato "YYYY-MM-DDTHH:mm" sin TZ.
  const [pinExpiresAt, setPinExpiresAt] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Refs para el textarea de contenido + el input file oculto que dispara
  // el botón "Insertar imagen".
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Inserta un fragmento de markdown en la posición actual del cursor del
  // textarea de contenido. Si no hay foco, lo apendea al final.
  const insertAtCursor = (markdown: string) => {
    const ta = contentRef.current;
    if (!ta) {
      setContent((prev) => prev + markdown);
      return;
    }
    const start = ta.selectionStart ?? content.length;
    const end = ta.selectionEnd ?? content.length;
    const before = content.slice(0, start);
    const after = content.slice(end);
    const next = before + markdown + after;
    setContent(next);
    // Restaurar cursor justo después del fragmento insertado.
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + markdown.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  // Sube una imagen al back y devuelve la URL pública (Cloudinary).
  const uploadImage = async (file: File): Promise<string | null> => {
    // Doble check del lado del cliente (el back valida igual).
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      toast.error(
        `Formato no soportado (${file.type || "desconocido"}). Usá JPEG, PNG, WEBP o GIF.`,
      );
      return null;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("La imagen supera 10 MB.");
      return null;
    }
    try {
      setUploadingImage(true);
      const form = new FormData();
      form.append("file", file);
      const resp = await api.post("/api/resources/upload-image", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = resp.data?.data?.url as string | undefined;
      if (!url) {
        toast.error("El servidor no devolvió una URL válida");
        return null;
      }
      return url;
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message || "No se pudo subir la imagen.";
      toast.error(message);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSelectImage: React.ChangeEventHandler<HTMLInputElement> = async (
    e,
  ) => {
    const file = e.target.files?.[0];
    // Reset del input para poder volver a elegir el mismo archivo si quisiera.
    e.target.value = "";
    if (!file) return;
    const url = await uploadImage(file);
    if (!url) return;
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    insertAtCursor(`![${baseName}](${url})`);
  };

  // Si el user pega una imagen del clipboard (Ctrl+V), la subimos y la
  // insertamos. Mantenemos el comportamiento default si lo pegado es texto.
  const handleContentPaste: React.ClipboardEventHandler<HTMLTextAreaElement> = async (
    e,
  ) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;
        const url = await uploadImage(file);
        if (!url) return;
        const name = file.name || "imagen-pegada";
        const baseName = name.replace(/\.[^/.]+$/, "") || "imagen-pegada";
        insertAtCursor(`![${baseName}](${url})`);
        return;
      }
    }
  };

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
          setIsPinned(r.isPinned ?? false);
          setShowAsModal(r.showAsModal ?? false);
          // Convertir ISO a formato datetime-local (sin segundos ni TZ)
          if (r.pinExpiresAt) {
            const d = new Date(r.pinExpiresAt);
            const pad = (n: number) => String(n).padStart(2, "0");
            const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
              d.getDate(),
            )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            setPinExpiresAt(local);
          } else {
            setPinExpiresAt("");
          }
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
    // Convertir datetime-local a ISO. Si no hay fecha o no esta pinned,
    // mandamos null para "sin vencimiento".
    let pinExpiresAtIso: string | null = null;
    if (isPinned && pinExpiresAt) {
      const d = new Date(pinExpiresAt);
      if (!isNaN(d.getTime())) pinExpiresAtIso = d.toISOString();
    }

    const payload = {
      title: title.trim(),
      content,
      excerpt: excerpt.trim() || null,
      category,
      tags: parseTags(tagsInput),
      isPublished:
        publishOverride === undefined ? isPublished : publishOverride,
      isPinned,
      // Solo aplican si esta pinned. Si no, los ignoramos.
      showAsModal: isPinned && showAsModal,
      pinExpiresAt: pinExpiresAtIso,
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

      {draftState?.draft && (
        <div className="rounded-md border border-primary/30 bg-primary/5 dark:bg-primary/10 px-3 py-2.5 flex items-start gap-2">
          <Sparkles
            size={16}
            className="text-primary shrink-0 mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-foreground">
              Borrador generado con IA
              {draftState.fromTicketNumber && (
                <>
                  {" "}desde el ticket #
                  {String(draftState.fromTicketNumber).padStart(5, "0")}
                </>
              )}
            </p>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">
              Revisá título, categoría, tags y contenido antes de publicar.
              La IA puede haberse equivocado o quedado corta — vos firmás el
              recurso final.
            </p>
          </div>
        </div>
      )}

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

          {/* Bloque de "destacado": pin + opciones extras (modal y vencimiento)
              que solo aplican cuando el recurso está pinned. */}
          <div className="rounded-md border border-border bg-card/40 p-3 space-y-3">
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
                  Aparece arriba del listado de Recursos. Si es un Aviso,
                  también se muestra como banner en el Dashboard.
                </span>
              </span>
            </label>

            {isPinned && (
              <div className="space-y-3 pl-6 pt-2 border-t border-border">
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showAsModal}
                    onChange={(e) => setShowAsModal(e.target.checked)}
                    className="mt-0.5 rounded border-border"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12.5px] font-medium">
                      🔔 Mostrar como ventana al entrar
                    </span>
                    <span className="block text-[11.5px] text-muted-foreground">
                      Aparece como modal flotante la primera vez que el
                      usuario entra a la app en cada sesión. Si lo cierra, no
                      vuelve a aparecer hasta que edites el recurso. No se
                      muestra en el banner.
                    </span>
                  </span>
                </label>

                <div className="space-y-1">
                  <label className="text-[12.5px] font-medium block">
                    ⏰ Vencimiento del destacado{" "}
                    <span className="text-muted-foreground font-normal">
                      (opcional)
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="datetime-local"
                      value={pinExpiresAt}
                      onChange={(e) => setPinExpiresAt(e.target.value)}
                      className="px-2 py-1.5 text-sm border border-border rounded-md bg-background"
                    />
                    {pinExpiresAt && (
                      <button
                        type="button"
                        onClick={() => setPinExpiresAt("")}
                        className="text-[11.5px] text-muted-foreground hover:text-foreground"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                  <p className="text-[11.5px] text-muted-foreground">
                    A partir de esa fecha el destacado se desactiva
                    automáticamente (deja de aparecer en banner / modal). Si
                    no se especifica, no vence (ej: manual de uso).
                  </p>
                </div>
              </div>
            )}
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

            {/* Toolbar mínima sobre el textarea */}
            <div className="flex items-center gap-2 mb-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingImage}
                onClick={() => fileInputRef.current?.click()}
                className="h-7 px-2 text-[11.5px]"
              >
                <ImageIcon size={13} className="mr-1.5" />
                {uploadingImage ? "Subiendo..." : "Insertar imagen"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleSelectImage}
                className="hidden"
              />
              <span className="text-[11px] text-muted-foreground">
                Podés insertar imágenes con el botón o pegando (Ctrl+V).
                Máx 10 MB · JPEG, PNG, WEBP, GIF.
              </span>
            </div>

            <textarea
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onPaste={handleContentPaste}
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
