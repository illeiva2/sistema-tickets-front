import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui";
import {
  BookOpen,
  Plus,
  Search,
  Eye,
  Tag as TagIcon,
  Pin,
} from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../hooks";
import type { ResourceListItem, ResourceCategory } from "../types/resources";
import {
  ALL_RESOURCE_CATEGORIES,
  RESOURCE_CATEGORY_GLYPH,
  RESOURCE_CATEGORY_LABEL,
  RESOURCE_CATEGORY_STYLE,
} from "../constants/resourceCategories";

const ResourcesPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<ResourceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState<ResourceCategory | "">(
    (searchParams.get("category") as ResourceCategory | null) ?? "",
  );
  const [includeDrafts, setIncludeDrafts] = useState<boolean>(
    isAdmin && searchParams.get("includeDrafts") === "true",
  );

  // Debounced search.
  useEffect(() => {
    const handle = setTimeout(async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (category) params.set("category", category);
        if (isAdmin && includeDrafts) params.set("includeDrafts", "true");
        params.set("pageSize", "50");

        const resp = await api.get(`/api/resources?${params.toString()}`);
        setItems(resp.data?.data?.data ?? []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [q, category, includeDrafts, isAdmin]);

  // Sync filters to URL.
  useEffect(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (category) sp.set("category", category);
    if (isAdmin && includeDrafts) sp.set("includeDrafts", "true");
    setSearchParams(sp, { replace: true });
  }, [q, category, includeDrafts, isAdmin, setSearchParams]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <BookOpen size={20} className="text-primary" />
            Recursos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Base de conocimiento, políticas, avisos y enlaces útiles.
          </p>
        </div>
        {isAdmin && (
          <Button asChild size="sm" className="h-8 px-3 text-sm">
            <Link to="/resources/new">
              <Plus size={15} className="mr-1.5" />
              Nuevo recurso
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border border-border rounded-lg bg-card">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Buscar por título o contenido…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ResourceCategory | "")}
          className="px-2 py-1.5 text-[13px] border border-border rounded-md bg-background"
        >
          <option value="">Todas las categorías</option>
          {ALL_RESOURCE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {RESOURCE_CATEGORY_GLYPH[c]} {RESOURCE_CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
        {isAdmin && (
          <label className="flex items-center gap-2 text-[12.5px] text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeDrafts}
              onChange={(e) => setIncludeDrafts(e.target.checked)}
              className="rounded border-border"
            />
            Incluir borradores
          </label>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 bg-muted/40 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {q.trim() || category
              ? "No hay recursos que coincidan con tus filtros."
              : "Todavía no hay recursos publicados."}
          </p>
          {isAdmin && !q.trim() && !category && (
            <Button asChild size="sm" className="mt-4 h-8 px-3 text-sm">
              <Link to="/resources/new">
                <Plus size={14} className="mr-1.5" />
                Crear el primero
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((r) => (
            <li key={r.id}>
              <Link
                to={`/resources/${r.slug}`}
                className={`group block p-4 border rounded-lg hover:shadow-sm transition-all ${
                  r.isPinned
                    ? "border-primary/40 bg-primary/[0.025] hover:border-primary/60"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {r.isPinned && (
                        <span
                          className="inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded-md border border-primary/40 bg-primary/10 text-primary font-medium"
                          title="Destacado"
                        >
                          <Pin size={10} className="rotate-45" />
                          Destacado
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded-md border ${RESOURCE_CATEGORY_STYLE[r.category]}`}
                      >
                        <span aria-hidden>
                          {RESOURCE_CATEGORY_GLYPH[r.category]}
                        </span>
                        {RESOURCE_CATEGORY_LABEL[r.category]}
                      </span>
                      {!r.isPublished && (
                        <span className="text-[10.5px] px-1.5 py-0.5 rounded-md border border-amber-300/70 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800/60 dark:text-amber-300 font-medium">
                          Borrador
                        </span>
                      )}
                      {r.tags.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10.5px] text-muted-foreground">
                          <TagIcon size={10} />
                          {r.tags.slice(0, 3).join(", ")}
                          {r.tags.length > 3 && ` +${r.tags.length - 3}`}
                        </span>
                      )}
                    </div>
                    <h3 className="text-[15px] font-semibold tracking-tight truncate group-hover:text-primary transition-colors">
                      {r.title}
                    </h3>
                    {r.excerpt && (
                      <p className="text-[13px] text-muted-foreground line-clamp-2 mt-1">
                        {r.excerpt}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground shrink-0">
                    <span className="inline-flex items-center gap-1">
                      <Eye size={11} />
                      {r.viewCount}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ResourcesPage;
