import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  BatteryCharging,
  Box,
  Check,
  Clipboard,
  Cpu,
  HardDrive,
  KeyRound,
  Laptop,
  Link2,
  Loader2,
  MonitorUp,
  Network,
  PackagePlus,
  Power,
  RefreshCw,
  ShieldOff,
  Square,
  Terminal,
  UserRound,
  X,
} from "lucide-react";
import { getAgentErrorInfo } from "../api";
import {
  formatDate,
  formatHeartbeat,
  formatRam,
  formatUptime,
  ramPercent,
} from "../format";
import {
  getAgentHealth,
  type AgentDevice,
  type AgentInventorySnapshot,
  type AgentLookups,
  type AgentMetricSample,
  type RemoteProtocol,
  type RemoteSession,
  type RemoteSessionStartResult,
} from "../types";
import { useLiveDialogFocus } from "../useDialogFocus";
import { MetricSeries } from "./MetricSeries";
import { InventorySnapshotView } from "./InventorySnapshotView";

interface AgentDetailPanelProps {
  device: AgentDevice | null;
  metrics: AgentMetricSample[];
  snapshots: AgentInventorySnapshot[];
  lookups: AgentLookups;
  lookupsLoading: boolean;
  canManage: boolean;
  isLoading: boolean;
  isSaving: boolean;
  isStartingSession: boolean;
  closingSessionId: string | null;
  loadError?: string;
  metricsError?: string;
  snapshotsError?: string;
  lookupsError?: string;
  onClose: () => void;
  onRetry: () => void;
  onRetryLookups: () => void;
  onReload: () => Promise<AgentDevice | null>;
  onLinkAsset: (
    expectedUpdatedAt: string,
    assetId: string | null,
  ) => Promise<AgentDevice>;
  onRegisterAsset: () => void;
  onTransition: (
    action: "activate" | "revoke",
    expectedUpdatedAt: string,
  ) => Promise<AgentDevice>;
  onStartSession: (
    protocol: RemoteProtocol,
  ) => Promise<RemoteSessionStartResult>;
  onCloseSession: (session: RemoteSession) => Promise<void>;
}

const healthLabels = {
  HEALTHY: "Saludable",
  DEGRADED: "Degradado",
  OFFLINE: "Offline",
  REVOKED: "Revocado",
} as const;

function connectionCommand(result: RemoteSessionStartResult) {
  const { port, protocol, target } = result.connection;
  if (
    !/^[A-Za-z0-9._:[\]-]+$/.test(target) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65_535
  )
    return null;
  if (protocol === "SSH") return `ssh -p ${port} ${target}`;
  const uriTarget =
    target.includes(":") && !(target.startsWith("[") && target.endsWith("]"))
      ? `[${target}]`
      : target;
  return `vnc://${uriTarget}:${port}`;
}

export function AgentDetailPanel({
  device,
  metrics,
  snapshots,
  lookups,
  lookupsLoading,
  canManage,
  isLoading,
  isSaving,
  isStartingSession,
  closingSessionId,
  loadError,
  metricsError,
  snapshotsError,
  lookupsError,
  onClose,
  onRetry,
  onRetryLookups,
  onReload,
  onLinkAsset,
  onRegisterAsset,
  onTransition,
  onStartSession,
  onCloseSession,
}: AgentDetailPanelProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const initialFocusRef = useRef<HTMLButtonElement>(null);
  const [snapshot, setSnapshot] = useState(device);
  const expectedRef = useRef(device?.updatedAt ?? null);
  const [assetId, setAssetId] = useState(device?.assetId ?? "");
  const serverAssetRef = useRef(device?.assetId ?? "");
  const assetDirtyRef = useRef(false);
  const [error, setError] = useState<string>();
  const [conflict, setConflict] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [remoteResult, setRemoteResult] = useState<RemoteSessionStartResult>();
  const [copied, setCopied] = useState(false);
  const busy =
    isSaving || isStartingSession || isReloading || Boolean(closingSessionId);
  useLiveDialogFocus(dialogRef, initialFocusRef, onClose, busy);

  useEffect(() => {
    if (!isLoading && snapshot?.id) initialFocusRef.current?.focus();
  }, [isLoading, snapshot?.id]);

  useEffect(() => {
    if (!device) return;
    const incomingAssetId = device.assetId ?? "";
    const assetChangedRemotely =
      assetDirtyRef.current && incomingAssetId !== serverAssetRef.current;
    setSnapshot((current) => (current ? { ...current, ...device } : device));
    if (assetChangedRemotely) {
      setConflict(true);
      setError(
        "El vínculo patrimonial cambió mientras editabas. Recargá la versión actual antes de guardar.",
      );
      return;
    }
    expectedRef.current = device.updatedAt;
    serverAssetRef.current = incomingAssetId;
    if (!assetDirtyRef.current) setAssetId(incomingAssetId);
  }, [device]);

  const reload = async () => {
    setIsReloading(true);
    const current = await onReload();
    if (current) {
      setSnapshot(current);
      expectedRef.current = current.updatedAt;
      setAssetId(current.assetId ?? "");
      serverAssetRef.current = current.assetId ?? "";
      assetDirtyRef.current = false;
      setConflict(false);
      setError(undefined);
    }
    setIsReloading(false);
  };

  if (isLoading || !snapshot) {
    return (
      <div className="live-dialog-backdrop" role="presentation">
        <section
          ref={dialogRef}
          className="live-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Detalle del equipo"
        >
          {loadError ? (
            <div
              className="live-dialog-state live-dialog-state--error"
              role="alert"
            >
              <AlertTriangle />
              <strong>No se pudo cargar el equipo</strong>
              <p>{loadError}</p>
              <button
                ref={initialFocusRef}
                type="button"
                className="live-button live-button--ghost"
                onClick={onRetry}
              >
                Reintentar
              </button>
              <button
                type="button"
                className="live-button live-button--ghost"
                onClick={onClose}
              >
                Cerrar
              </button>
            </div>
          ) : (
            <div className="live-dialog-state" role="status">
              <Loader2 className="live-spin" />
              <strong>Cargando telemetría…</strong>
              <button
                ref={initialFocusRef}
                type="button"
                className="live-button live-button--ghost"
                onClick={onClose}
              >
                Cancelar
              </button>
            </div>
          )}
        </section>
      </div>
    );
  }

  const health = getAgentHealth(snapshot);
  const ram = ramPercent(snapshot.ramUsedMb, snapshot.ramTotalMb);
  const assetOptions =
    snapshot.asset &&
    !lookups.assets.some((asset) => asset.id === snapshot.asset!.id)
      ? [snapshot.asset, ...lookups.assets]
      : lookups.assets;
  const activeSessions = (snapshot.activeSessions ?? []).filter(
    (session) => session.id !== remoteResult?.session.id,
  );
  const connectionValue = remoteResult ? connectionCommand(remoteResult) : null;
  const latestInventory = snapshots[0];

  const linkAsset = async () => {
    const chosen = assetOptions.find((asset) => asset.id === assetId);
    const action = assetId
      ? `vincular ${chosen?.assetTag || chosen?.serialNumber || chosen?.id}`
      : "desvincular el activo patrimonial";
    if (!window.confirm(`¿Confirmás ${action} con ${snapshot.hostname}?`))
      return;
    setError(undefined);
    try {
      const updated = await onLinkAsset(expectedRef.current!, assetId || null);
      setSnapshot(updated);
      expectedRef.current = updated.updatedAt;
      setAssetId(updated.assetId ?? "");
      serverAssetRef.current = updated.assetId ?? "";
      assetDirtyRef.current = false;
    } catch (caught) {
      const info = getAgentErrorInfo(caught);
      setConflict(info.isConflict);
      setError(info.message);
    }
  };

  const transition = async (action: "activate" | "revoke") => {
    const description =
      action === "revoke"
        ? "revocar el agente. Dejará de aceptar heartbeats y accesos remotos"
        : "reactivar el agente";
    if (!window.confirm(`¿Confirmás ${description} en ${snapshot.hostname}?`))
      return;
    setError(undefined);
    try {
      const updated = await onTransition(action, expectedRef.current!);
      setSnapshot(updated);
      expectedRef.current = updated.updatedAt;
    } catch (caught) {
      const info = getAgentErrorInfo(caught);
      setConflict(info.isConflict);
      setError(info.message);
    }
  };

  const startSession = async (protocol: RemoteProtocol) => {
    setError(undefined);
    setRemoteResult(undefined);
    setCopied(false);
    try {
      const result = await onStartSession(protocol);
      setRemoteResult(result);
      setSnapshot((current) =>
        current
          ? {
              ...current,
              activeSessions: [
                ...(current.activeSessions ?? []),
                result.session,
              ],
            }
          : current,
      );
    } catch (caught) {
      setError(getAgentErrorInfo(caught).message);
    }
  };

  const copyConnection = async () => {
    if (!remoteResult) return;
    const command = connectionCommand(remoteResult);
    if (!command) {
      setError("El destino directo recibido no tiene un formato seguro.");
      return;
    }
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
    } catch {
      setError(
        "No se pudo copiar automáticamente. Seleccioná el comando y copialo manualmente.",
      );
    }
  };

  const closeSession = async (session: RemoteSession) => {
    if (
      !window.confirm(
        "¿Cerrar el registro de esta sesión? Esto no garantiza que el cliente remoto se haya desconectado.",
      )
    )
      return;
    try {
      await onCloseSession(session);
      setRemoteResult((current) =>
        current?.session.id === session.id ? undefined : current,
      );
      setSnapshot((current) =>
        current
          ? {
              ...current,
              activeSessions: (current.activeSessions ?? []).filter(
                (item) => item.id !== session.id,
              ),
            }
          : current,
      );
    } catch (caught) {
      setError(getAgentErrorInfo(caught).message);
    }
  };

  return (
    <div className="live-dialog-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="live-dialog live-dialog--detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-detail-title"
      >
        <header className="live-dialog-header">
          <div>
            <span>ENDPOINT / LIVE TELEMETRY</span>
            <h2 id="agent-detail-title">{snapshot.hostname}</h2>
            <p>
              <span className="live-state" data-state={health}>
                {healthLabels[health]}
              </span>{" "}
              heartbeat {formatHeartbeat(snapshot.lastSeenAt)}
            </p>
          </div>
          <button
            ref={initialFocusRef}
            type="button"
            className="live-icon-button"
            aria-label="Cerrar"
            disabled={busy}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>
        <div className="live-dialog-body">
          <div className="live-health-grid">
            <article>
              <Cpu size={17} />
              <span>CPU</span>
              <strong>
                {snapshot.cpuPct == null
                  ? "—"
                  : `${Math.round(snapshot.cpuPct)}%`}
              </strong>
              {snapshot.cpuPct != null ? (
                <meter
                  aria-label="Uso de CPU"
                  min={0}
                  max={100}
                  low={65}
                  high={90}
                  optimum={30}
                  value={snapshot.cpuPct}
                />
              ) : null}
            </article>
            <article>
              <HardDrive size={17} />
              <span>RAM</span>
              <strong>
                {formatRam(snapshot.ramUsedMb, snapshot.ramTotalMb)}
              </strong>
              {ram != null ? (
                <meter
                  aria-label="Uso de memoria RAM"
                  min={0}
                  max={100}
                  low={65}
                  high={90}
                  optimum={30}
                  value={ram}
                />
              ) : null}
            </article>
            <article>
              <BatteryCharging size={17} />
              <span>Batería</span>
              <strong>
                {snapshot.batteryPct == null
                  ? "Sin batería"
                  : `${snapshot.batteryPct}%`}
              </strong>
              <small>
                {snapshot.batteryPct == null
                  ? "No aplica"
                  : snapshot.batteryCharging
                    ? "Cargando"
                    : "En descarga"}
              </small>
            </article>
            <article>
              <Power size={17} />
              <span>Uptime</span>
              <strong>{formatUptime(snapshot.uptimeSec)}</strong>
              <small>Desde último inicio</small>
            </article>
          </div>

          <section
            className="live-detail-section"
            aria-labelledby="identity-title"
          >
            <div className="live-section-title">
              <Laptop size={16} />
              <div>
                <h3 id="identity-title">Identidad y sistema</h3>
                <p>Último valor conocido informado por el agente.</p>
              </div>
            </div>
            <dl className="live-detail-grid">
              <div>
                <dt>Usuario</dt>
                <dd>
                  <UserRound size={13} />
                  {snapshot.loggedInUser || "Sin sesión"}
                </dd>
              </div>
              <div>
                <dt>IP primaria</dt>
                <dd className="live-mono">{snapshot.primaryIp || "—"}</dd>
              </div>
              <div>
                <dt>MAC</dt>
                <dd className="live-mono">{snapshot.primaryMac || "—"}</dd>
              </div>
              <div>
                <dt>Sistema</dt>
                <dd>
                  {[snapshot.osName, snapshot.osVersion]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </dd>
              </div>
              <div>
                <dt>Agente</dt>
                <dd>{snapshot.agentVersion || "—"}</dd>
              </div>
              <div>
                <dt>Último enrolamiento</dt>
                <dd>{formatDate(snapshot.lastEnrolledAt)}</dd>
              </div>
            </dl>
          </section>

          <MetricSeries
            samples={metrics.length ? metrics : (snapshot.recentMetrics ?? [])}
            ramTotalMb={snapshot.ramTotalMb}
          />
          {metricsError ? (
            <div className="live-reference-warning" role="alert">
              <AlertTriangle size={15} />
              {metricsError}
            </div>
          ) : null}

          <section
            className="live-detail-section"
            aria-labelledby="inventory-title"
          >
            <div className="live-section-title">
              <Box size={16} />
              <div>
                <h3 id="inventory-title">Hardware e inventario reportado</h3>
                <p>
                  {latestInventory
                    ? `Snapshot ${formatDate(latestInventory.createdAt)}`
                    : "Sin snapshot completo"}
                </p>
              </div>
            </div>
            {snapshotsError ? (
              <div className="live-reference-warning" role="alert">
                <AlertTriangle size={15} />
                {snapshotsError}
              </div>
            ) : latestInventory ? (
              <InventorySnapshotView payload={latestInventory.payload} />
            ) : (
              <div className="live-inline-empty">
                <Box size={22} />
                <strong>
                  El agente todavía no reportó inventario completo
                </strong>
              </div>
            )}
          </section>

          <section
            className="live-detail-section"
            aria-labelledby="asset-link-title"
          >
            <div className="live-section-title">
              <Link2 size={16} />
              <div>
                <h3 id="asset-link-title">Vínculo patrimonial</h3>
                <p>Relaciona telemetría con la ficha de inventario.</p>
              </div>
            </div>
            {lookupsLoading ? (
              <div className="live-reference-warning" role="status">
                <Loader2 size={15} className="live-spin" />
                Cargando catálogo de activos…
              </div>
            ) : lookupsError ? (
              <div className="live-reference-warning" role="alert">
                <AlertTriangle size={15} />
                <span>{lookupsError}</span>
                <button
                  type="button"
                  className="live-button live-button--ghost"
                  onClick={onRetryLookups}
                >
                  <RefreshCw size={14} />
                  Reintentar catálogo
                </button>
              </div>
            ) : null}
            <div className="live-asset-link">
              <select
                aria-label="Activo patrimonial"
                disabled={
                  !canManage ||
                  busy ||
                  conflict ||
                  lookupsLoading ||
                  Boolean(lookupsError)
                }
                value={assetId}
                onChange={(event) => {
                  const next = event.target.value;
                  setAssetId(next);
                  assetDirtyRef.current = next !== serverAssetRef.current;
                }}
              >
                <option value="">Sin vincular</option>
                {assetOptions.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {[
                      asset.assetTag,
                      asset.brand,
                      asset.model,
                      asset.serialNumber,
                    ]
                      .filter(Boolean)
                      .join(" · ") || asset.id}
                  </option>
                ))}
              </select>
              {canManage ? (
                <button
                  type="button"
                  className="live-button live-button--ghost"
                  disabled={
                    busy ||
                    conflict ||
                    lookupsLoading ||
                    Boolean(lookupsError) ||
                    assetId === (snapshot.assetId ?? "")
                  }
                  onClick={() => void linkAsset()}
                >
                  <Link2 size={14} />
                  Confirmar vínculo
                </button>
              ) : null}
              {canManage && !snapshot.assetId && !assetId ? (
                <button
                  type="button"
                  className="live-button live-button--primary"
                  disabled={busy || conflict}
                  onClick={onRegisterAsset}
                >
                  <PackagePlus size={14} />
                  Crear activo con estos datos
                </button>
              ) : null}
            </div>
          </section>

          <section
            className="live-detail-section"
            aria-labelledby="remote-title"
          >
            <div className="live-section-title">
              <Network size={16} />
              <div>
                <h3 id="remote-title">Acceso directo auditado</h3>
                <p>
                  Registra la intención y entrega el destino. Requiere alcance
                  de red; no existe relay.
                </p>
              </div>
            </div>
            {canManage ? (
              <div className="live-remote-actions">
                <button
                  type="button"
                  className="live-button live-button--ghost"
                  disabled={
                    busy ||
                    !snapshot.isActive ||
                    snapshot.state !== "ONLINE" ||
                    !snapshot.sshRunning
                  }
                  onClick={() => void startSession("SSH")}
                >
                  <Terminal size={15} />
                  Registrar intento SSH
                </button>
                <button
                  type="button"
                  className="live-button live-button--ghost"
                  disabled={
                    busy ||
                    !snapshot.isActive ||
                    snapshot.state !== "ONLINE" ||
                    !snapshot.vncRunning
                  }
                  onClick={() => void startSession("VNC")}
                >
                  <MonitorUp size={15} />
                  Registrar intento VNC
                </button>
              </div>
            ) : null}
            <p className="live-direct-warning">
              <KeyRound size={14} />
              Acceso directo / requiere alcance de red (VPN o red local). Nunca
              se muestra ni copia una contraseña.
            </p>
            {canManage && remoteResult ? (
              <div className="live-connection" role="status">
                <div>
                  <span>
                    REGISTRO ACTIVO / {remoteResult.connection.protocol}
                  </span>
                  <strong>
                    {remoteResult.connection.target}:
                    {remoteResult.connection.port}
                  </strong>
                  <p>{remoteResult.connection.warning}</p>
                  <p>
                    Se registró el inicio; esta aplicación no confirma que el
                    cliente se haya conectado.
                  </p>
                </div>
                <div>
                  <input
                    aria-label="URI o comando de conexión"
                    readOnly
                    value={connectionValue ?? "Destino directo no válido"}
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <button
                    type="button"
                    className="live-button live-button--primary"
                    disabled={!connectionValue}
                    onClick={() => void copyConnection()}
                  >
                    {copied ? <Check size={14} /> : <Clipboard size={14} />}
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                  <button
                    type="button"
                    className="live-button live-button--ghost"
                    disabled={closingSessionId === remoteResult.session.id}
                    onClick={() => void closeSession(remoteResult.session)}
                  >
                    <Square size={13} />
                    Cerrar registro
                  </button>
                </div>
              </div>
            ) : null}
            {activeSessions.length ? (
              <ul
                className="live-session-list"
                aria-label="Sesiones remotas activas"
              >
                {activeSessions.map((session) => (
                  <li key={session.id}>
                    <span>
                      {session.protocol || session.kind} · desde{" "}
                      {formatDate(session.startedAt)}
                    </span>
                    {canManage ? (
                      <button
                        type="button"
                        className="live-button live-button--ghost"
                        disabled={closingSessionId === session.id}
                        onClick={() => void closeSession(session)}
                      >
                        <Square size={12} />
                        Cerrar registro
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          {conflict ? (
            <div className="live-conflict" role="alert">
              <RefreshCw size={17} />
              <div>
                <strong>El equipo cambió en el servidor</strong>
                <p>{error}</p>
                <button
                  type="button"
                  className="live-button live-button--ghost"
                  onClick={() => void reload()}
                >
                  <RefreshCw size={14} />
                  Recargar versión actual
                </button>
              </div>
            </div>
          ) : error ? (
            <div className="live-error" role="alert">
              <AlertTriangle size={16} />
              {error}
            </div>
          ) : null}

          {canManage ? (
            <footer className="live-device-admin">
              <div>
                <strong>Control del agente</strong>
                <p>
                  {snapshot.isActive
                    ? "Revocar invalida su acceso sin borrar el historial."
                    : "Reactivar permite que vuelva a reportar con sus credenciales vigentes."}
                </p>
              </div>
              <button
                type="button"
                className={`live-button ${snapshot.isActive ? "live-button--danger" : "live-button--primary"}`}
                disabled={busy || conflict}
                onClick={() =>
                  void transition(snapshot.isActive ? "revoke" : "activate")
                }
              >
                {snapshot.isActive ? (
                  <ShieldOff size={15} />
                ) : (
                  <Power size={15} />
                )}
                {snapshot.isActive ? "Revocar agente" : "Reactivar agente"}
              </button>
            </footer>
          ) : null}
        </div>
      </section>
    </div>
  );
}
