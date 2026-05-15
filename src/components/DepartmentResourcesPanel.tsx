import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen } from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../hooks";
import type { ResourceListItem } from "../types/resources";
import {
  RESOURCE_CATEGORY_GLYPH,
  RESOURCE_CATEGORY_LABEL,
} from "../constants/resourceCategories";

// Panel "Para tu sector": muestra recursos dirigidos específicamente al
// sector del current user (su departmentId aparece en audienceDepartments
// del recurso). Excluye públicos y modales, que ya tienen su lugar.
// Si el user no tiene sector asignado o no hay recursos para él, no se
// renderiza (silencioso).
const DepartmentResourcesPanel: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ResourceListItem[] | null>(null);

  useEffect(() => {
    // Si no tiene sector, ni siquiera hacemos el fetch.
    if (!user?.department?.id) {
      setItems([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const resp = await api.get("/api/resources/for-my-department");
        if (!cancelled) setItems(resp.data?.data ?? []);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.department?.id]);

  if (!user?.department || !items || items.length === 0) return null;

  const dept = user.department;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div
        className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border"
        style={{
          backgroundColor: dept.color ? `${dept.color}15` : undefined,
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-7 h-7 rounded-md flex items-center justify-center text-base shrink-0"
            style={{
              backgroundColor: dept.color ? `${dept.color}30` : "var(--muted)",
              border: dept.color ? `1px solid ${dept.color}60` : undefined,
            }}
          >
            {dept.icon || "🏷️"}
          </span>
          <div>
            <h2 className="text-sm font-semibold leading-tight">
              Para tu sector
            </h2>
            <p className="text-[11.5px] text-muted-foreground leading-tight">
              Recursos dirigidos a {dept.name}
            </p>
          </div>
        </div>
        <Link
          to={`/resources?category=`}
          className="text-[11.5px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          Ver todos
          <ArrowRight size={11} />
        </Link>
      </div>

      <ul className="divide-y divide-border">
        {items.map((r) => (
          <li key={r.id}>
            <Link
              to={`/resources/${r.slug}`}
              className="group flex items-start gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors"
            >
              <span className="text-base shrink-0 mt-0.5" aria-hidden>
                {RESOURCE_CATEGORY_GLYPH[r.category]}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate group-hover:text-primary">
                  {r.title}
                </div>
                {r.excerpt && (
                  <div className="text-[11.5px] text-muted-foreground line-clamp-1">
                    {r.excerpt}
                  </div>
                )}
                <div className="text-[10.5px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <span>{RESOURCE_CATEGORY_LABEL[r.category]}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <BookOpen size={9} />
                    {r.viewCount}
                  </span>
                </div>
              </div>
              <ArrowRight
                size={13}
                className="shrink-0 mt-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DepartmentResourcesPanel;
