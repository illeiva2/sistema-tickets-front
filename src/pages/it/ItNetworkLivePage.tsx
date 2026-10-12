import { useCallback, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  BellOff,
  Database,
  History,
  Loader2,
  MapPin,
  Pause,
  Play,
  Radar,
  RefreshCw,
  Search,
  Siren,
  X,
} from "lucide-react";
import "@/features/it/network/network.css";
import "@/features/it/network-live/networkLive.css";
import { useAuth } from "@/hooks/useAuth";
import { formatHeartbeat } from "@/features/it/live/format";
import { getNetworkLiveErrorMessage } from "@/features/it/network-live/api";
import { EventsPanel } from "@/features/it/network-live/components/EventsPanel";
import { LiveTopologyCanvas } from "@/features/it/network-live/components/LiveTopologyCanvas";
import type { DescribedEvent } from "@/features/it/network-live/history";
import {
  directHit,
  endpointTitle,
  endpointWhere,
  indexEndpoints,
  pathToRoot,
  searchLive,
  type SearchHit,
} from "@/features/it/network-live/endpoints";
import { PORT_TONE_LABELS, type PortTone } from "@/features/it/network-live/ports";
import { buildTopology } from "@/features/it/network-live/topology";
import type {
  LiveDevice,
  LiveEndpoint,
  LiveSearchResult,
  NetworkLiveView,
} from "@/features/it/network-live/types";
import {
  useMuteDeviceAlerts,
  useNetworkLive,
  useNetworkLiveSearch,
} from "@/features/it/network-live/useNetworkLive";

const LEGEND_TONES: PortTone[] = ["up", "up-fiber", "slow", "down", "disabled"];
const MAX_HITS = 8;

const ROLE_NAMES: Record<string, string> = { router: "Router", core: "Núcleo", access: "Switch", ap: "AP" };

/** Lo elegido en la búsqueda: se resalta su camino hasta el router y se dice en palabras dónde está. */
interface Focus {
  from: string[];
  mac: string | null;
  text: string;
  offline: boolean;
}

function summarize(view: NetworkLiveView) {
  const infra = view.devices.filter((device) => device.role !== "ap");
  const aps = view.devices.filter((device) => device.role === "ap");
  const ports = infra.flatMap((device) => device.ports);
  const problems = view.devices.filter((device) => device.status !== "ok");
  const wifi = view.endpoints.filter((endpoint) => endpoint.viaDeviceId).length;
  return {
    infraOk: infra.filter((device) => device.status === "ok").length,
    infraTotal: infra.length,
    apsOk: aps.filter((device) => device.status === "ok").length,
    apsTotal: aps.length,
    clients: aps.reduce((sum, device) => sum + (device.status === "ok" ? device.clients ?? 0 : 0), 0),
    endpoints: view.endpoints.length,
    wifi,
    wired: view.endpoints.length - wifi,
    portsUp: ports.filter((port) => port.linkUp).length,
    portsTotal: ports.length,
    problems,
  };
}

const userOf = (endpoint: Pick<LiveEndpoint, "agent">) =>
  endpoint.agent?.loggedInUser ? `usuario ${endpoint.agent.loggedInUser}` : null;

function endpointFacts(endpoint: Pick<LiveEndpoint, "agent" | "hostname" | "ip" | "mac">) {
  const title = endpointTitle(endpoint);
  return [userOf(endpoint), endpoint.ip !== title ? endpoint.ip : null, endpoint.mac !== title ? endpoint.mac : null]
    .filter(Boolean)
    .join(" · ");
}

function deviceFacts(device: LiveDevice) {
  return [ROLE_NAMES[device.role] ?? device.role, device.managementIp, device.model].filter(Boolean).join(" · ");
}

export default function ItNetworkLivePage() {
  const { user } = useAuth();
  const canMute = user?.role === "ADMIN";
  const [tab, setTab] = useState<"diagram" | "history">("diagram");
  const [paused, setPaused] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPort, setSelectedPort] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [focus, setFocus] = useState<Focus | null>(null);
  const query = useNetworkLive(paused);
  const view = query.data;
  const topology = useMemo(() => (view ? buildTopology(view) : null), [view]);
  const endpointIndex = useMemo(() => indexEndpoints(view?.endpoints ?? []), [view]);
  const stats = useMemo(() => (view ? summarize(view) : null), [view]);
  const collector = view?.collectors[0];

  const term = search.trim();
  const hits = useMemo(() => (view ? searchLive(view.devices, view.endpoints, term) : []), [view, term]);
  const history = useNetworkLiveSearch(submitted);
  const historyExtra = useMemo(() => {
    const live = new Set(hits.flatMap((hit) => (hit.kind === "endpoint" ? [hit.endpoint.mac] : [])));
    return (history.data?.results ?? []).filter((result) => !live.has(result.mac));
  }, [hits, history.data]);
  const highlight = useMemo(
    () => (topology && focus ? pathToRoot(topology, ...focus.from) : null),
    [topology, focus],
  );
  const alerts = useMemo(() => view?.alerts ?? [], [view]);
  const alertIds = useMemo(
    () => new Set(alerts.flatMap((alert) => (alert.deviceId ? [alert.deviceId] : []))),
    [alerts],
  );

  const { mutate: muteAlerts } = useMuteDeviceAlerts();
  const onMute = useCallback(
    (deviceId: string, muted: boolean) =>
      muteAlerts(
        { deviceId, muted },
        {
          onSuccess: (device) =>
            toast.success(
              muted ? `${device.name}: alertas silenciadas` : `${device.name}: alertas activas otra vez`,
            ),
          onError: (error) => toast.error(getNetworkLiveErrorMessage(error)),
        },
      ),
    [muteAlerts],
  );

  const onToggle = useCallback((deviceId: string) => {
    setFocus(null);
    setSelectedPort(null);
    setSelectedId((current) => (current === deviceId ? null : deviceId));
  }, []);
  // Cambiar de puerto en el mismo equipo no borra lo buscado; ir a otro equipo, sí.
  const onSelectPort = useCallback(
    (deviceId: string, portKey: string | null) => {
      if (deviceId !== selectedId) setFocus(null);
      setSelectedId(deviceId);
      setSelectedPort(portKey);
    },
    [selectedId],
  );
  const onGoTo = useCallback((deviceId: string) => {
    setFocus(null);
    setSelectedPort(null);
    setSelectedId(deviceId);
  }, []);

  const showDevice = (device: LiveDevice) => {
    setSelectedPort(null);
    setSelectedId(device.id);
    setFocus({ from: [device.id], mac: null, text: `${device.name}: ${deviceFacts(device)}`, offline: false });
    setResultsOpen(false);
  };

  const showEndpoint = (endpoint: LiveEndpoint | LiveSearchResult, offline: boolean) => {
    if (!topology) return;
    const user = userOf(endpoint);
    const name = `${endpointTitle(endpoint)}${user ? ` (${user})` : ""}`;
    const where = endpointWhere(endpoint, topology.devices, "deviceName" in endpoint ? endpoint.deviceName : undefined);
    setSelectedId(endpoint.deviceId);
    setSelectedPort(endpoint.portKey);
    setFocus({
      from: [endpoint.viaDeviceId ?? endpoint.deviceId, endpoint.deviceId],
      mac: endpoint.mac,
      text: offline
        ? `${name} no se ve desde ${formatHeartbeat(endpoint.lastSeenAt)}. La última vez estaba en ${where}.`
        : `${name}: ${where}`,
      offline,
    });
    setResultsOpen(false);
  };

  const showHit = (hit: SearchHit) => {
    if (hit.kind === "device") showDevice(hit.device);
    else showEndpoint(hit.endpoint, false);
  };

  /** Un cambio del historial, en el diagrama: el equipo (y el puerto) donde pasó, con su camino. */
  const openFromHistory = (event: DescribedEvent) => {
    if (!event.deviceId) return;
    setTab("diagram");
    setSelectedId(event.deviceId);
    setSelectedPort(event.portKey && !event.portKey.includes("+") ? event.portKey : null);
    setFocus({
      from: [event.deviceId],
      mac: event.mac,
      text: `${event.title}${event.place ? ` · ${event.place}` : ""}`,
      offline: false,
    });
  };

  const showAlertDevice = (deviceId: string) => {
    const device = topology?.devices.get(deviceId);
    if (!device) return;
    setTab("diagram");
    showDevice(device);
  };

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    if (term.length < 2) return;
    setResultsOpen(true);
    // Si lo conectado ahora da un único resultado (o una única coincidencia exacta) se va directo;
    // si no, se busca también en el historial.
    const direct = directHit(hits);
    if (direct) {
      showHit(direct);
      return;
    }
    setSubmitted(term.slice(0, 100));
  };

  const clearSearch = () => {
    setSearch("");
    setSubmitted(null);
    setResultsOpen(false);
    setFocus(null);
  };

  const collectorStatus = !view
    ? query.isFetching
      ? "Sincronizando"
      : "API / IT-NET"
    : collector
      ? `Colector ${collector.host ?? collector.slug} · ${formatHeartbeat(collector.lastReceivedAt)}`
      : "Sin datos del colector";

  const historyDone = submitted !== null && submitted === term.slice(0, 100);

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
            conectan, el estado de cada puerto y qué equipo hay en cada uno. Tocá un equipo para
            ver su frente, o buscá una PC, un usuario, una IP o una MAC para ver dónde está.
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
            <span>Equipos conectados</span>
            <strong>{stats.endpoints}</strong>
            <small>
              {stats.endpoints
                ? `${stats.wired} por cable · ${stats.wifi} Wi-Fi`
                : "el colector todavía no los informa"}
            </small>
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
            {alerts.length ? (
              <section className="netlive-alerts" aria-label="Avisos abiertos">
                <p className="netlive-alerts__title">
                  <Siren size={15} aria-hidden="true" />
                  {alerts.length === 1 ? "1 aviso abierto" : `${alerts.length} avisos abiertos`}
                  <small>se cierran solos cuando el equipo vuelve</small>
                </p>
                <ul>
                  {alerts.map((alert) => {
                    const device = alert.deviceId ? topology.devices.get(alert.deviceId) : undefined;
                    return (
                      <li key={alert.id}>
                        <button
                          type="button"
                          disabled={!device}
                          onClick={() => (alert.deviceId ? showAlertDevice(alert.deviceId) : undefined)}
                        >
                          <strong>
                            {alert.kind === "collector_silent" ? "Colector sin datos" : (device?.name ?? "Equipo de red")}
                          </strong>
                          <span>{alert.detail}</span>
                          <small>
                            avisado {formatHeartbeat(alert.openedAt)}
                            {alert.ticketId ? " · con ticket" : ""}
                          </small>
                        </button>
                        {canMute && device ? (
                          <button
                            type="button"
                            className="netlive-alerts__mute"
                            title="Silenciar las alertas de este equipo (cierra el aviso y su ticket)"
                            onClick={() => onMute(device.id, true)}
                          >
                            <BellOff size={13} aria-hidden="true" />
                            Silenciar
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            <div className="netlive-finder">
              <form className="netlive-search" onSubmit={onSearch} role="search">
                <label htmlFor="netlive-search-input" className="sr-only">
                  Buscar en la red
                </label>
                <input
                  id="netlive-search-input"
                  placeholder="¿Dónde está…? PC, usuario, IP, MAC o equipo de red"
                  autoComplete="off"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setResultsOpen(true);
                  }}
                  onFocus={() => setResultsOpen(true)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setResultsOpen(false);
                  }}
                />
                {search || focus ? (
                  <button
                    type="button"
                    className="network-icon-button"
                    aria-label="Limpiar la búsqueda"
                    onClick={clearSearch}
                  >
                    <X size={16} />
                  </button>
                ) : null}
                <button type="submit" className="network-button">
                  <Search size={15} />
                  Buscar
                </button>
              </form>

              {resultsOpen && term.length >= 2 ? (
                <div className="netlive-results" aria-label="Resultados de la búsqueda">
                  {hits.length ? (
                    <>
                      <p className="netlive-results__title">Conectado ahora</p>
                      <ul>
                        {hits.slice(0, MAX_HITS).map((hit) =>
                          hit.kind === "device" ? (
                            <li key={`device-${hit.device.id}`}>
                              <button type="button" data-kind="device" onClick={() => showHit(hit)}>
                                <strong>{hit.device.name}</strong>
                                <span>{deviceFacts(hit.device)}</span>
                              </button>
                            </li>
                          ) : (
                            <li key={`endpoint-${hit.endpoint.mac}`}>
                              <button type="button" data-kind="endpoint" onClick={() => showHit(hit)}>
                                <strong>{endpointTitle(hit.endpoint)}</strong>
                                <span>{endpointWhere(hit.endpoint, topology.devices)}</span>
                                <small>{endpointFacts(hit.endpoint)}</small>
                              </button>
                            </li>
                          ),
                        )}
                      </ul>
                      {hits.length > MAX_HITS ? (
                        <p className="netlive-hint">
                          …y {hits.length - MAX_HITS} más: escribí algo más preciso.
                        </p>
                      ) : null}
                    </>
                  ) : null}

                  {historyDone ? (
                    history.isFetching ? (
                      <p className="netlive-hint">Buscando en el historial…</p>
                    ) : history.isError ? (
                      <p className="netlive-search__error" role="alert">
                        No se pudo buscar en el historial: {getNetworkLiveErrorMessage(history.error)}
                      </p>
                    ) : historyExtra.length ? (
                      <>
                        <p className="netlive-results__title">
                          <History size={12} aria-hidden="true" />
                          En el historial
                        </p>
                        <ul>
                          {historyExtra.map((result) => (
                            <li key={`history-${result.mac}`}>
                              <button
                                type="button"
                                data-kind="endpoint"
                                data-offline={!result.online || undefined}
                                disabled={!topology.devices.has(result.deviceId)}
                                onClick={() => showEndpoint(result, !result.online)}
                              >
                                <strong>{endpointTitle(result)}</strong>
                                <span>{endpointWhere(result, topology.devices, result.deviceName)}</span>
                                <small>
                                  {[
                                    result.online
                                      ? "conectado ahora"
                                      : `no se ve desde ${formatHeartbeat(result.lastSeenAt)}`,
                                    endpointFacts(result),
                                  ].join(" · ")}
                                </small>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : !hits.length ? (
                      <p className="netlive-hint">
                        No hay nada con «{term}» conectado ahora ni en el historial.
                      </p>
                    ) : null
                  ) : !hits.length ? (
                    <p className="netlive-hint">
                      Nada conectado ahora coincide. Apretá Buscar para revisar también el historial.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {focus ? (
                <p className="netlive-focus" role="status" data-offline={focus.offline || undefined}>
                  <MapPin size={15} aria-hidden="true" />
                  <span>{focus.text}</span>
                  <button type="button" aria-label="Quitar el resaltado" onClick={() => setFocus(null)}>
                    <X size={14} />
                  </button>
                </p>
              ) : null}
            </div>

            <div className="netlive-segmented netlive-tabs" role="tablist" aria-label="Vista">
              <button type="button" role="tab" aria-selected={tab === "diagram"} onClick={() => setTab("diagram")}>
                <Radar size={14} aria-hidden="true" />
                Diagrama
              </button>
              <button type="button" role="tab" aria-selected={tab === "history"} onClick={() => setTab("history")}>
                <History size={14} aria-hidden="true" />
                Historial
              </button>
            </div>

            {tab === "history" ? (
              <EventsPanel devices={topology.devices} paused={paused} onOpen={openFromHistory} />
            ) : (
              <>
                <LiveTopologyCanvas
                  topology={topology}
                  endpointIndex={endpointIndex}
                  selectedId={selectedId}
                  selectedPort={selectedPort}
                  highlight={highlight}
                  highlightMac={focus?.mac ?? null}
                  alertIds={alertIds}
                  canMute={canMute}
                  onToggle={onToggle}
                  onSelectPort={onSelectPort}
                  onGoTo={onGoTo}
                  onMute={onMute}
                />

                <div className="netlive-legend" aria-label="Referencias">
                  {LEGEND_TONES.map((tone) => (
                    <span key={tone}>
                      <i className="netlive-legend__port" data-tone={tone} aria-hidden="true" />
                      {PORT_TONE_LABELS[tone]}
                    </span>
                  ))}
                  <span>
                    <i className="netlive-legend__port" data-tone="up" data-endpoints aria-hidden="true" />
                    Con equipos conectados
                  </span>
                  <span>
                    <i className="netlive-legend__port" data-tone="up" data-endpoints data-shared aria-hidden="true" />
                    Varios equipos detrás (switch sin gestión, grabador…)
                  </span>
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
                  <span>
                    <i className="netlive-legend__alert" aria-hidden="true" />
                    Con un aviso abierto
                  </span>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
