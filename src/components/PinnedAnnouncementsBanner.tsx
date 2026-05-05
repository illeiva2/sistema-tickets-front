import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Megaphone, X } from "lucide-react";
import api from "../lib/api";
import type { ResourceListItem } from "../types/resources";

const DISMISSED_KEY = "dashboard:dismissedAnnouncements";

const loadDismissed = (): Set<string> => {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
};

const saveDismissed = (ids: Set<string>) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      DISMISSED_KEY,
      JSON.stringify(Array.from(ids)),
    );
  } catch {
    // localStorage puede no estar disponible (SSR/privacy mode).
  }
};

// Banner discreto en el dashboard que muestra los avisos (ANNOUNCEMENT)
// destacados. Cada usuario puede descartar avisos individualmente: el id
// queda guardado en localStorage y no vuelve a aparecer (pero los avisos
// nuevos sí). Si no hay avisos activos no se renderiza.
const PinnedAnnouncementsBanner: React.FC = () => {
  const [items, setItems] = useState<ResourceListItem[] | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await api.get(
          "/api/resources/pinned?category=ANNOUNCEMENT&limit=3",
        );
        if (!cancelled) setItems(resp.data?.data ?? []);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    saveDismissed(next);
  };

  if (!items || items.length === 0) return null;

  const visible = items.filter((r) => !dismissed.has(r.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map((r) => (
        <div
          key={r.id}
          className="flex items-start gap-3 rounded-lg border border-rose-200/60 bg-rose-50/60 dark:bg-rose-950/20 dark:border-rose-800/40 px-4 py-3"
        >
          <Megaphone
            size={18}
            className="text-rose-700 dark:text-rose-300 shrink-0 mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <Link
              to={`/resources/${r.slug}`}
              className="block text-sm font-semibold text-rose-900 dark:text-rose-100 hover:underline"
            >
              {r.title}
            </Link>
            {r.excerpt && (
              <p className="text-[12.5px] text-rose-800/80 dark:text-rose-200/80 mt-0.5 line-clamp-2">
                {r.excerpt}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleDismiss(r.id)}
            aria-label="Descartar aviso"
            className="text-rose-700/70 hover:text-rose-900 dark:text-rose-300/70 dark:hover:text-rose-100 shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default PinnedAnnouncementsBanner;
