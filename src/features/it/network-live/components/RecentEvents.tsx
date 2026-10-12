import { useMemo } from "react";
import { formatHeartbeat } from "@/features/it/live/format";
import { describeEvent } from "../history";
import type { LiveDevice } from "../types";
import { useNetworkEvents } from "../useNetworkLive";

const WINDOW_MS = 30 * 24 * 60 * 60_000;

interface RecentEventsProps {
  deviceId: string;
  portKey?: string;
  devices: Map<string, LiveDevice>;
  limit?: number;
  title: string;
}

/** Últimos cambios de un equipo o de un puerto (30 días), dentro del panel del diagrama. */
export function RecentEvents({ deviceId, portKey, devices, limit = 6, title }: RecentEventsProps) {
  // Un mes atrás, redondeado al minuto para que la consulta no cambie en cada render.
  const since = useMemo(() => new Date(Math.floor((Date.now() - WINDOW_MS) / 60_000) * 60_000).toISOString(), []);
  const query = useNetworkEvents({ deviceId, portKey, since, limit });
  const events = query.data?.events ?? [];

  if (query.isLoading) return <p className="netlive-hint">Leyendo los últimos cambios…</p>;
  if (query.isError || !events.length) {
    return <p className="netlive-hint">{query.isError ? "No se pudo leer el historial." : "Sin cambios en el último mes."}</p>;
  }

  return (
    <div className="netlive-recent">
      <p className="netlive-recent__title">{title}</p>
      <ol>
        {events.map((event) => {
          const described = describeEvent(event, devices);
          // Dentro del panel del equipo, repetir su nombre no dice nada.
          const place = described.place === devices.get(deviceId)?.name ? null : described.place;
          return (
            <li key={event.id} data-tone={described.tone}>
              <time dateTime={event.at} title={new Date(event.at).toLocaleString("es-AR")}>
                {formatHeartbeat(event.at)}
              </time>
              <span>
                {described.title}
                {place ? ` · ${place}` : ""}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
