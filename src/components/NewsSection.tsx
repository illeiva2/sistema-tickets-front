import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { Megaphone, ArrowRight } from "lucide-react";
import api from "../lib/api";
import type { ResourceListItem } from "../types/resources";

// Tiempo relativo abreviado: "hoy", "hace 2d", etc.
const relativeDate = (iso: string): string => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 3600) return "ahora";
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `hace ${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
};

// Sección "Novedades": muestra los últimos N recursos con categoría
// ANNOUNCEMENT publicados visibles para el usuario actual (filtra por
// audiencia automáticamente en el back). Si no hay ninguno, no se
// renderiza (silencioso, evita ruido visual).
const NewsSection: React.FC = () => {
  const [items, setItems] = useState<ResourceListItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await api.get(
          "/api/resources?category=ANNOUNCEMENT&pageSize=5",
        );
        if (!cancelled) {
          // El listado viene paginado: data.data.data.
          const payload = resp.data?.data;
          const list: ResourceListItem[] = payload?.data ?? [];
          setItems(list);
        }
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
            <Megaphone size={16} />
            Novedades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-12 bg-muted/40 rounded-md animate-pulse"
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
          <Megaphone size={16} />
          Novedades
        </CardTitle>
        <Link
          to="/resources?category=ANNOUNCEMENT"
          className="text-[11.5px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          Ver todas
          <ArrowRight size={11} />
        </Link>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1">
          {items.map((r) => (
            <li key={r.id}>
              <Link
                to={`/resources/${r.slug}`}
                className="group flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {r.title}
                  </div>
                  {r.excerpt && (
                    <div className="text-[11.5px] text-muted-foreground line-clamp-1">
                      {r.excerpt}
                    </div>
                  )}
                </div>
                <span className="text-[10.5px] text-muted-foreground shrink-0 mt-0.5 tabular-nums">
                  {relativeDate(r.updatedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default NewsSection;
