import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { Briefcase, ArrowRight } from "lucide-react";
import api from "../lib/api";
import type { ProjectListItem } from "../types/projects";

// Card "En qué estamos trabajando": muestra hasta 5 proyectos IN_PROGRESS
// publicados, ordenados por pinned + updatedAt. Si no hay ninguno, no se
// renderiza (silencioso).
const ProjectsInProgressCard: React.FC = () => {
  const [items, setItems] = useState<ProjectListItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await api.get("/api/projects/in-progress");
        if (!cancelled) setItems(resp.data?.data ?? []);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (items === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase size={16} />
            En qué estamos trabajando
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-14 bg-muted/40 rounded-md animate-pulse"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Briefcase size={16} />
          En qué estamos trabajando
        </CardTitle>
        <Link
          to="/projects"
          className="text-[11.5px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          Ver todos
          <ArrowRight size={11} />
        </Link>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((p) => (
            <li key={p.id}>
              <Link
                to={`/projects/${p.slug}`}
                className="group block p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {p.title}
                  </div>
                  {typeof p.progressPercent === "number" && (
                    <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                      {p.progressPercent}%
                    </span>
                  )}
                </div>
                {p.excerpt && (
                  <div className="text-[11.5px] text-muted-foreground line-clamp-1 mt-0.5">
                    {p.excerpt}
                  </div>
                )}
                {typeof p.progressPercent === "number" && (
                  <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(0, p.progressPercent))}%`,
                      }}
                    />
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default ProjectsInProgressCard;
