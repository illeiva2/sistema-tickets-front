import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight, Hash } from "lucide-react";
import api from "../lib/api";
import {
  TICKET_STATUS_LABEL,
  TICKET_PRIORITY_LABEL,
} from "../constants/ticketLabels";
import {
  TICKET_CATEGORY_GLYPH,
  TICKET_CATEGORY_LABEL,
} from "../constants/ticketCategories";

interface TicketHit {
  id: string;
  ticketNumber: number;
  title: string;
  status: string;
  priority: string;
  category: string | null;
}

const STATUS_DOT: Record<string, string> = {
  OPEN: "bg-status-open",
  IN_PROGRESS: "bg-status-progress",
  RESOLVED: "bg-status-resolved",
  CLOSED: "bg-status-closed",
};

const isMac = (): boolean =>
  typeof navigator !== "undefined" &&
  /mac|iphone|ipad|ipod/i.test(navigator.platform);

export const CommandPalette: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TicketHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setSelected(0);
  }, []);

  // Atajo global Cmd/Ctrl+K para abrir, Esc para cerrar.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCmdK =
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        !e.altKey &&
        e.key.toLowerCase() === "k";
      if (isCmdK) {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        closePalette();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, closePalette]);

  // Autofocus al abrir.
  useEffect(() => {
    if (open) {
      // pequeño delay para que el input exista en el DOM al renderizar.
      const t = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Debounced search.
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();

    if (trimmed.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        params.set("q", trimmed);
        params.set("pageSize", "8");
        params.set("page", "1");
        const resp = await api.get(`/api/tickets?${params.toString()}`);
        const list: TicketHit[] = resp.data?.data?.data ?? [];
        setResults(list);
        setSelected(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(handle);
  }, [query, open]);

  // Navegación con teclado dentro del palette.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (results.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const hit = results[selected];
        if (hit) {
          navigate(`/tickets/${hit.id}`);
          closePalette();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, results, selected, navigate, closePalette]);

  if (!open) return null;

  const hint = isMac() ? "⌘K" : "Ctrl+K";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Búsqueda global de tickets"
    >
      <div
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        onClick={closePalette}
        aria-hidden
      />
      <div className="relative w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
          <Search size={16} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar tickets por número o título…"
            className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex items-center text-[10.5px] font-medium text-muted-foreground bg-muted border border-border rounded px-1.5 py-0.5">
            Esc
          </kbd>
        </div>

        {/* Body */}
        <div className="max-h-[50vh] overflow-y-auto">
          {query.trim().length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Escribí para buscar tickets. Atajo: <span className="font-mono">{hint}</span>.
            </div>
          ) : loading ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Buscando…
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Sin resultados para "{query.trim()}".
            </div>
          ) : (
            <ul className="py-1">
              {results.map((hit, idx) => {
                const active = idx === selected;
                return (
                  <li key={hit.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setSelected(idx)}
                      onClick={() => {
                        navigate(`/tickets/${hit.id}`);
                        closePalette();
                      }}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2 transition-colors ${
                        active
                          ? "bg-primary/10 text-foreground"
                          : "text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          STATUS_DOT[hit.status] || "bg-muted"
                        }`}
                        title={TICKET_STATUS_LABEL[hit.status]}
                      />
                      <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground tabular-nums shrink-0">
                        <Hash size={10} />
                        {hit.ticketNumber.toString().padStart(5, "0")}
                      </span>
                      <span className="flex-1 min-w-0 truncate text-[13px]">
                        {hit.title}
                      </span>
                      {hit.category && (
                        <span
                          className="hidden sm:inline-flex items-center gap-1 text-[10.5px] text-muted-foreground shrink-0"
                          title={TICKET_CATEGORY_LABEL[hit.category as keyof typeof TICKET_CATEGORY_LABEL]}
                        >
                          <span aria-hidden>
                            {TICKET_CATEGORY_GLYPH[hit.category as keyof typeof TICKET_CATEGORY_GLYPH]}
                          </span>
                          {TICKET_CATEGORY_LABEL[hit.category as keyof typeof TICKET_CATEGORY_LABEL]}
                        </span>
                      )}
                      <span className="hidden md:inline text-[10.5px] text-muted-foreground shrink-0">
                        {TICKET_PRIORITY_LABEL[hit.priority]}
                      </span>
                      {active && (
                        <ArrowRight
                          size={14}
                          className="text-primary shrink-0"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer hints */}
        {results.length > 0 && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border bg-muted/30 text-[10.5px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="bg-card border border-border rounded px-1 py-0.5 font-mono text-[10px]">
                  ↑↓
                </kbd>
                navegar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-card border border-border rounded px-1 py-0.5 font-mono text-[10px]">
                  ↵
                </kbd>
                abrir
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-card border border-border rounded px-1 py-0.5 font-mono text-[10px]">
                  esc
                </kbd>
                cerrar
              </span>
            </div>
            <span>{results.length} resultado{results.length === 1 ? "" : "s"}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommandPalette;
