import React, { useEffect, useState } from "react";
import { ExternalLink, BookOpen } from "lucide-react";
import api from "../lib/api";
import type { KbSugerencia } from "../types/kb";

// Sugerencias de la documentación oficial de Finnegans (bc.finneg.com)
// para el ticket abierto. Pensado para montarse dentro de un
// CollapsibleSection con lazy-mount: el fetch ocurre recién cuando el
// agente expande la sección.
const FinnegansKbPanel: React.FC<{ ticketId: string }> = ({ ticketId }) => {
  const [items, setItems] = useState<KbSugerencia[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setError(null);
    (async () => {
      try {
        const resp = await api.get(
          `/api/kb/tickets/${ticketId}/suggestions?limit=5`,
        );
        if (!cancelled) setItems(resp.data?.data?.sugerencias ?? []);
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.response?.data?.error?.message ||
              "No se pudieron cargar las sugerencias de la KB oficial.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  if (error) {
    return <p className="text-[12px] text-muted-foreground">{error}</p>;
  }

  if (items === null) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 bg-muted/40 rounded-md animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-[12px] text-muted-foreground italic">
        No se encontraron artículos relacionados en bc.finneg.com para el
        título de este ticket.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-[11px] text-muted-foreground mb-1.5">
        Artículos de la documentación oficial del ERP que podrían aplicar,
        buscados por el título del ticket.
      </p>
      <ul className="space-y-1">
        {items.map((s) => (
          <li key={s.topicId}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-2 text-[13px] hover:bg-muted/50 rounded px-2 py-1.5 transition-colors"
            >
              <BookOpen
                size={14}
                className="shrink-0 mt-0.5 text-primary"
              />
              <span className="flex-1 min-w-0">
                <span className="block font-medium truncate group-hover:text-primary transition-colors">
                  {s.titulo}
                </span>
                {s.extracto && (
                  <span className="block text-[11.5px] text-muted-foreground line-clamp-2">
                    {s.extracto}
                  </span>
                )}
                {s.categoria && (
                  <span className="block text-[10.5px] text-muted-foreground mt-0.5">
                    {s.categoria} · bc.finneg.com
                  </span>
                )}
              </span>
              <ExternalLink
                size={12}
                className="shrink-0 mt-1 text-muted-foreground group-hover:text-primary"
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FinnegansKbPanel;
