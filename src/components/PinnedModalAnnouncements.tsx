import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { X, BookOpen } from "lucide-react";
import api from "../lib/api";
import type { Resource } from "../types/resources";
import { Button } from "@/components/ui";
import {
  RESOURCE_CATEGORY_GLYPH,
  RESOURCE_CATEGORY_LABEL,
  RESOURCE_CATEGORY_STYLE,
} from "../constants/resourceCategories";
import MarkdownView from "./MarkdownView";

// Estructura de lo que persiste el dismiss en localStorage:
// { [resourceId]: { dismissedAt: ISO, updatedAt: ISO } }
// Si el recurso se actualiza despues del dismiss, el modal vuelve a aparecer.
interface DismissedEntry {
  dismissedAt: string;
  updatedAt: string;
}

const DISMISSED_KEY = "modalAnnouncements:dismissed";
const SHOWN_THIS_SESSION_KEY = "modalAnnouncements:shownThisSession";

const loadDismissed = (): Record<string, DismissedEntry> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
};

const saveDismissed = (data: Record<string, DismissedEntry>) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
};

// Modal flotante que aparece la primera vez que el usuario entra a la app
// (1 vez por sesion del browser). Muestra una cola de avisos pinned con
// showAsModal=true; cerrar uno abre el siguiente. Si el user cierra todos,
// no vuelve hasta proximo login.
const PinnedModalAnnouncements: React.FC = () => {
  const [items, setItems] = useState<Resource[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    // Si en esta sesion ya mostramos los modales, no los traemos de nuevo.
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(SHOWN_THIS_SESSION_KEY) === "1") {
      setItems([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const resp = await api.get("/api/resources/modal-pinned");
        if (cancelled) return;
        const all: Resource[] = resp.data?.data ?? [];

        // Filtrar los que el user descarto despues del ultimo update.
        const dismissed = loadDismissed();
        const visible = all.filter((r) => {
          const entry = dismissed[r.id];
          if (!entry) return true;
          // Si se actualizo despues del dismiss, vuelve a aparecer.
          return new Date(r.updatedAt) > new Date(entry.dismissedAt);
        });

        setItems(visible);
        if (visible.length > 0) {
          // Marcamos que ya se intentaron mostrar en esta sesion. Aunque el
          // user no termine de cerrar todos, la proxima visita no los vuelve
          // a abrir (excepto los que aun no descarto, que reaparecen al
          // cerrar y abrir browser cuando vuelva a entrar).
          // Actually queremos que reaparezcan al volver a entrar mañana, asi
          // que NO marcamos session como "shown" hasta que cierre todos.
          // -- ajuste: lo marcamos aca para que no abra de nuevo si recarga
          // la pagina en la misma sesion. Pero NO usamos localStorage, asi
          // que la proxima sesion (browser cerrado) los vuelve a mostrar.
          window.sessionStorage.setItem(SHOWN_THIS_SESSION_KEY, "1");
        }
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const current = useMemo(() => {
    if (!items || items.length === 0) return null;
    return items[activeIndex] ?? null;
  }, [items, activeIndex]);

  if (!current) return null;

  const handleDismiss = () => {
    // Guardar dismiss persistente con timestamp del recurso.
    const dismissed = loadDismissed();
    dismissed[current.id] = {
      dismissedAt: new Date().toISOString(),
      updatedAt: current.updatedAt,
    };
    saveDismissed(dismissed);
    // Avanzar al siguiente
    setActiveIndex((i) => i + 1);
  };

  const total = items?.length ?? 0;
  const positionLabel =
    total > 1 ? `${activeIndex + 1} de ${total}` : null;

  // Texto a mostrar en el cuerpo: priorizar excerpt; si no hay, mostrar
  // los primeros ~700 chars del content como markdown.
  const bodyMarkdown =
    current.excerpt && current.excerpt.length > 0
      ? current.excerpt
      : current.content.length > 700
        ? current.content.slice(0, 700).trimEnd() + "…"
        : current.content;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border ${RESOURCE_CATEGORY_STYLE[current.category]}`}
            >
              <span aria-hidden>
                {RESOURCE_CATEGORY_GLYPH[current.category]}
              </span>
              {RESOURCE_CATEGORY_LABEL[current.category]}
            </span>
            {positionLabel && (
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {positionLabel}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Cerrar"
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto flex-1">
          <h2 className="text-xl font-semibold tracking-tight mb-3">
            {current.title}
          </h2>
          <MarkdownView source={bodyMarkdown} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-muted/20">
          <Button asChild variant="outline" size="sm">
            <Link
              to={`/resources/${current.slug}`}
              onClick={handleDismiss}
            >
              <BookOpen size={14} className="mr-1.5" />
              Leer completo
            </Link>
          </Button>
          <Button size="sm" onClick={handleDismiss}>
            Entendido
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PinnedModalAnnouncements;
