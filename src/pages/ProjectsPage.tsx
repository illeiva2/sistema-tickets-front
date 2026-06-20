import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui";
import { Briefcase, Plus, Search, Pin } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../hooks";
import type { ProjectListItem, ProjectStatus } from "../types/projects";
import {
  ALL_PROJECT_STATUSES,
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_GLYPH,
  PROJECT_STATUS_STYLE,
} from "../constants/projectStatus";

const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const isStaff = user?.role === "ADMIN" || user?.role === "AGENT";
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState<ProjectStatus | "">(
    (searchParams.get("status") as ProjectStatus | null) ?? "",
  );
  const [includeDrafts, setIncludeDrafts] = useState<boolean>(
    isStaff && searchParams.get("includeDrafts") === "true",
  );

  useEffect(() => {
    const handle = setTimeout(async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (status) params.set("status", status);
        if (isStaff && includeDrafts) params.set("includeDrafts", "true");
        params.set("pageSize", "50");

        const resp = await api.get(`/api/projects?${params.toString()}`);
        setItems(resp.data?.data?.data ?? []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [q, status, includeDrafts, isStaff]);

  // Sync filtros a URL.
  useEffect(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (status) sp.set("status", status);
    if (isStaff && includeDrafts) sp.set("includeDrafts", "true");
    setSearchParams(sp, { replace: true });
  }, [q, status, includeDrafts, isStaff, setSearchParams]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Briefcase size={20} className="text-primary" />
            Proyectos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Iniciativas e implementaciones que está llevando adelante el
            equipo de sistemas.
          </p>
        </div>
        {isStaff && (
          <Button asChild size="sm" className="h-8 px-3 text-sm">
            <Link to="/projects/new">
              <Plus size={15} className="mr-1.5" />
              Nuevo proyecto
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border border-border rounded-lg bg-card">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Buscar por título o descripción…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-[13px] border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ProjectStatus | "")}
          className="px-2 py-1.5 text-[13px] border border-border rounded-md bg-background"
        >
          <option value="">Todos los estados</option>
          {ALL_PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PROJECT_STATUS_GLYPH[s]} {PROJECT_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        {isStaff && (
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

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 bg-muted/40 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {q.trim() || status
              ? "No hay proyectos que coincidan con tus filtros."
              : "Todavía no hay proyectos publicados."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((p) => (
            <li key={p.id}>
              <Link
                to={`/projects/${p.slug}`}
                className={`group block p-4 border rounded-lg hover:shadow-sm transition-all ${
                  p.isPinned
                    ? "border-primary/40 bg-primary/[0.025] hover:border-primary/60"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {p.isPinned && (
                        <span
                          className="inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded-md border border-primary/40 bg-primary/10 text-primary font-medium"
                          title="Destacado"
                        >
                          <Pin size={10} className="rotate-45" />
                          Destacado
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded-md border ${PROJECT_STATUS_STYLE[p.status]}`}
                      >
                        <span aria-hidden>
                          {PROJECT_STATUS_GLYPH[p.status]}
                        </span>
                        {PROJECT_STATUS_LABEL[p.status]}
                      </span>
                      {!p.isPublished && (
                        <span className="text-[10.5px] px-1.5 py-0.5 rounded-md border border-amber-300/70 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800/60 dark:text-amber-300 font-medium">
                          Borrador
                        </span>
                      )}
                    </div>
                    <h3 className="text-[15px] font-semibold tracking-tight truncate group-hover:text-primary transition-colors">
                      {p.title}
                    </h3>
                    {p.excerpt && (
                      <p className="text-[13px] text-muted-foreground line-clamp-2 mt-1">
                        {p.excerpt}
                      </p>
                    )}
                    {typeof p.progressPercent === "number" && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 max-w-xs h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${Math.min(100, Math.max(0, p.progressPercent))}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {p.progressPercent}%
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground shrink-0">
                    {p.lead && <span>Lead: {p.lead.name}</span>}
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

export default ProjectsPage;
