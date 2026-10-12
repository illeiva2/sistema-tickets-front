import { useCallback, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Database,
  Loader2,
  Pause,
  Play,
  Radar,
  RefreshCw,
  Search,
} from "lucide-react";
import "@/features/it/network/network.css";
import "@/features/it/network-live/networkLive.css";
import { formatHeartbeat } from "@/features/it/live/format";
import { getNetworkLiveErrorMessage } from "@/features/it/network-live/api";
import { LiveTopologyCanvas } from "@/features/it/network-live/components/LiveTopologyCanvas";
import { PORT_TONE_LABELS, type PortTone } from "@/features/it/network-live/ports";
import { buildTopology } from "@/features/it/network-live/topology";
import type { NetworkLiveView } from "@/features/it/network-live/types";
import { useNetworkLive } from "@/features/it/network-live/useNetworkLive";

const LEGEND_TONES: PortTone[] = ["up", "up-fiber", "slow", "down", "disabled"];

function summarize(view: NetworkLiveView) {
  const infra = view.devices.filter((device) => device.role !== "ap");
  const aps = view.devices.filter((device) => device.role === "ap");
  const ports = infra.flatMap((device) => device.ports);
  const problems = view.devices.filter((device) => device.status !== "ok");
  return {
    infraOk: infra.filter((device) => device.status === "ok").length,
    infraTotal: infra.length,
    apsOk: aps.filter((device) => device.status === "ok").length,
    apsTotal: aps.length,
    clients: aps.reduce((sum, device) => sum + (device.status === "ok" ? device.clients ?? 0 : 0), 0),
    portsUp: ports.filter((port) => port.linkUp).length,
    portsTotal: ports.length,
    problems,
  };
}

export default function ItNetworkLivePage() {
  const [paused, setPaused] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPort, setSelectedPort] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const query = useNetworkLive(paused);
  const view = query.data;
  const topology = useMemo(() => (view ? buildTopology(view) : null), [view]);
  const stats = useMemo(() => (view ? summarize(view) : null), [view]);
  const collector = view?.collectors[0];

  const onToggle = useCallback((deviceId: string) => {
    setSelectedPort(null);
    setSelectedId((current) => (current === deviceId ? null : deviceId));
  }, []);
  const onSelectPort = useCallback((deviceId: string, portKey: string | null) => {
    setSelectedId(deviceId);
    setSelectedPort(portKey);
  }, []);
  const onGoTo = useCallback((deviceId: string) => {
    setSelectedPort(null);
    setSelectedId(deviceId);
  }, []);

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    const term = search.trim().toLowerCase();
    if (!term || !view) return;
    const match = view.devices.find(
      (device) =>
        device.name.toLowerCase().includes(term) ||
        device.managementIp === term ||
        device.macAddress?.toLowerCase() === term.replace(/-/g, ":"),
    );
    if (!match) {
      setSearchError("No hay un equipo de red con ese nombre, IP o MAC. Las PCs se suman en la próxima etapa.");
      return;
    }
    setSearchError(null);
    onGoTo(match.id);
  };

  const collectorStatus = !view
    ? query.isFetching
      ? "Sincronizando"
      : "API / IT-NET"
    : collector
      ? `Colector ${collector.host ?? collector.slug} · ${formatHeartbeat(collector.lastReceivedAt)}`
      : "Sin datos del colector";

  return (
    <section className="it-network it-network-live" aria-labelledby="network-live-title">
      <div className="network-commandbar">
        <span className="network-wordmark">GRF//NEXUS</span>
        <span>IT / INFRAESTRUCTURA / RED EN VIVO</span>
        <span aria-live="polite" data-stale={collector?.stale || undefined}>
          <Database size={13} />
          {collectorStatus}
        </span>
      </div>

      <header className="network-header">
        <div>
          <p>Topología relevada / Control 05B</p>
          <h1 id="network-live-title">Red en vivo</h1>
          <span>
            Lo que informan los propios equipos cada minuto: router, switches y APs, cómo se
            conectan y el estado de cada puerto. Tocá un equipo para ver su frente.
          </span>
        </div>
        <div className="network-header__actions">
          <Link className="network-button network-button--ghost" to="/it/network">
            Inventario manual
          </Link>
          <button
            type="button"
            className="network-button network-button--ghost"
            aria-pressed={paused}
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? <Play size={15} /> : <Pause size={15} />}
            {paused ? "Reanudar" : "Pausar actualización"}
          </button>
          <button
            type="button"
            className="network-icon-button"
            aria-label="Actualizar ahora"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            <RefreshCw size={17} className={query.isFetching ? "network-spin" : undefined} />
          </button>
        </div>
      </header>

      {stats ? (
        <div className="netlive-kpis" aria-label="Resumen">
          <article data-tone={stats.infraOk === stats.infraTotal ? "ok" : "warn"}>
            <span>Router y switches</span>
            <strong>
              {stats.infraOk}/{stats.infraTotal}
            </strong>
            <small>responden</small>
          </article>
          <article data-tone={stats.apsOk === stats.apsTotal ? "ok" : "warn"}>
            <span>APs</span>
            <strong>
              {stats.apsOk}/{stats.apsTotal}
            </strong>
            <small>{stats.clients} clientes Wi-Fi</small>
          </article>
          <article>
            <span>Puertos con enlace</span>
            <strong>
              {stats.portsUp}/{stats.portsTotal}
            </strong>
            <small>en router y switches</small>
          </article>
          <article data-tone={stats.problems.length ? "error" : "ok"}>
            <span>Con problemas</span>
            <strong>{stats.problems.length}</strong>
            <small title={stats.problems.map((device) => device.name).join(", ")}>
              {stats.problems.length
                ? stats.problems
                    .slice(0, 2)
                    .map((device) => device.name)
                    .join(", ") + (stats.problems.length > 2 ? "…" : "")
                : "todo responde"}
            </small>
          </article>
        </div>
      ) : null}

      <div className="network-content netlive-content">
        {collector?.stale ? (
          <div className="netlive-warning" role="status">
            <AlertTriangle size={15} aria-hidden="true" />
            El colector no informa desde {formatHeartbeat(collector.lastReceivedAt)}: lo que se ve
            puede estar desactualizado.
          </div>
        ) : null}

        {query.isLoading ? (
          <div className="network-state" aria-live="polite">
            <Loader2 className="network-spin" />
            <strong>Leyendo la red…</strong>
          </div>
        ) : query.isError ? (
          <div className="network-state network-state--error" role="alert">
            <strong>No se pudo leer el estado de la red</strong>
            <p>{getNetworkLiveErrorMessage(query.error)}</p>
            <button type="button" className="network-button network-button--ghost" onClick={() => void query.refetch()}>
              Reintentar
            </button>
          </div>
        ) : !view || !topology || view.devices.length === 0 ? (
          <div className="network-empty">
            <Radar size={28} aria-hidden="true" />
            <strong>Todavía no llegó ningún envío del colector</strong>
            <p>
              El colector corre en srv-datos y envía el estado de la red cada minuto. Cuando esté
              instalado, el diagrama aparece solo.
            </p>
          </div>
        ) : (
          <>
            <form className="netlive-search" onSubmit={onSearch} role="search">
              <label htmlFor="netlive-search-input" className="sr-only">
                Buscar equipo de red
              </label>
              <input
                id="netlive-search-input"
                list="netlive-devices"
                placeholder="Buscar equipo de red por nombre, IP o MAC"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setSearchError(null);
                }}
              />
              <datalist id="netlive-devices">
                {view.devices.map((device) => (
                  <option key={device.id} value={device.name} />
                ))}
              </datalist>
              <button type="submit" className="network-button">
                <Search size={15} />
                Buscar
              </button>
              {searchError ? (
                <span className="netlive-search__error" role="alert">
                  {searchError}
                </span>
              ) : null}
            </form>

            <LiveTopologyCanvas
              topology={topology}
              selectedId={selectedId}
              selectedPort={selectedPort}
              onToggle={onToggle}
              onSelectPort={onSelectPort}
              onGoTo={onGoTo}
            />

            <div className="netlive-legend" aria-label="Referencias">
              {LEGEND_TONES.map((tone) => (
                <span key={tone}>
                  <i className="netlive-legend__port" data-tone={tone} aria-hidden="true" />
                  {PORT_TONE_LABELS[tone]}
                </span>
              ))}
              <span>
                <i className="netlive-legend__line" data-source="lldp" aria-hidden="true" />
                Conexión confirmada por LLDP
              </span>
              <span>
                <i className="netlive-legend__line" data-source="fdb" aria-hidden="true" />
                Deducida de las tablas MAC
              </span>
              {topology.unplaced.length ? (
                <span>{topology.unplaced.length} sin ubicar (abajo)</span>
              ) : null}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
