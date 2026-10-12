import { useMemo, useState } from "react";
import { History } from "lucide-react";
import { getNetworkLiveErrorMessage } from "../api";
import { EVENT_GROUPS, describeEvent, groupByDay, timeLabel, type DescribedEvent, type EventGroup } from "../history";
import { roleRank } from "../topology";
import type { LiveDevice } from "../types";
import { useNetworkEvents } from "../useNetworkLive";

const RANGES = [
  { id: "24h", label: "24 horas", ms: 24 * 60 * 60_000 },
  { id: "7d", label: "7 días", ms: 7 * 24 * 60 * 60_000 },
  { id: "30d", label: "30 días", ms: 30 * 24 * 60 * 60_000 },
] as const;

const PAGE = 200;
const MAX = 500;

/** Desde cuándo, redondeado al minuto: una fecha que cambia en cada render dispararía consultas sin fin. */
const sinceFor = (ms: number) => new Date(Math.floor((Date.now() - ms) / 60_000) * 60_000).toISOString();

interface EventsPanelProps {
  devices: Map<string, LiveDevice>;
  paused: boolean;
  onOpen: (event: DescribedEvent) => void;
}

/** Historial de la red: qué cambió, cuándo y dónde. Tocar un cambio lo muestra en el diagrama. */
export function EventsPanel({ devices, paused, onOpen }: EventsPanelProps) {
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("24h");
  const [group, setGroup] = useState<EventGroup>("all");
  const [deviceId, setDeviceId] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const since = useMemo(() => sinceFor(RANGES.find((item) => item.id === range)!.ms), [range]);
  const kinds = EVENT_GROUPS.find((item) => item.id === group)!.kinds;
  const query = useNetworkEvents({ since, kinds, deviceId: deviceId || undefined, limit }, { paused });
  const days = useMemo(() => groupByDay(query.data?.events ?? []), [query.data]);
  const options = useMemo(
    () => [...devices.values()].sort((a, b) => roleRank(a.role) - roleRank(b.role) || a.name.localeCompare(b.name, "es")),
    [devices],
  );

  const reset = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setLimit(PAGE);
  };

  return (
    <section className="netlive-history" aria-label="Historial de la red">
      <div className="netlive-history__filters">
        <div className="netlive-segmented" role="group" aria-label="Período">
          {RANGES.map((item) => (
            <button key={item.id} type="button" aria-pressed={range === item.id} onClick={() => reset(setRange)(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="netlive-segmented" role="group" aria-label="Qué cambios">
          {EVENT_GROUPS.map((item) => (
            <button key={item.id} type="button" aria-pressed={group === item.id} onClick={() => reset(setGroup)(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <label className="netlive-history__device">
          <span>Equipo</span>
          <select value={deviceId} onChange={(event) => reset(setDeviceId)(event.target.value)}>
            <option value="">Todos</option>
            {options.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {query.isLoading ? (
        <p className="netlive-hint">Leyendo el historial…</p>
      ) : query.isError ? (
        <p className="netlive-search__error" role="alert">
          No se pudo leer el historial: {getNetworkLiveErrorMessage(query.error)}
        </p>
      ) : days.length === 0 ? (
        <p className="netlive-history__empty">
          <History size={16} aria-hidden="true" />
          No hubo cambios en este período.
        </p>
      ) : (
        days.map((day) => (
          <div key={day.day} className="netlive-history__day">
            <h3>{day.day}</h3>
            <ol>
              {day.events.map((event) => {
                const described = describeEvent(event, devices);
                return (
                  <li key={event.id} data-tone={described.tone}>
                    <time dateTime={event.at}>{timeLabel(event.at)}</time>
                    <button
                      type="button"
                      disabled={!described.deviceId || !devices.has(described.deviceId)}
                      onClick={() => onOpen(described)}
                    >
                      <strong>{described.title}</strong>
                      {described.place ? <span>{described.place}</span> : null}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        ))
      )}

      {query.data?.hasMore ? (
        limit < MAX ? (
          <button type="button" className="network-button network-button--ghost" onClick={() => setLimit((value) => Math.min(MAX, value + PAGE))}>
            Ver más
          </button>
        ) : (
          <p className="netlive-hint">Se muestran los últimos {MAX}: elegí un equipo o un tipo de cambio para ver más atrás.</p>
        )
      ) : null}
    </section>
  );
}
