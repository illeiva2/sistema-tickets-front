import {
  BatteryCharging,
  Eye,
  MonitorUp,
  ServerCog,
  Terminal,
} from "lucide-react";
import {
  formatDate,
  formatHeartbeat,
  formatRam,
  formatUptime,
  ramPercent,
} from "../format";
import { getAgentHealth, type AgentDevice } from "../types";

interface LiveDeviceTableProps {
  items: AgentDevice[];
  openingId: string | null;
  onOpen: (device: AgentDevice) => void;
}

const healthLabels = {
  HEALTHY: "Saludable",
  DEGRADED: "Degradado",
  OFFLINE: "Offline",
  REVOKED: "Revocado",
} as const;

export function LiveDeviceTable({
  items,
  openingId,
  onOpen,
}: LiveDeviceTableProps) {
  return (
    <>
      <div className="live-table-wrap">
        <table className="live-table">
          <thead>
            <tr>
              <th>Equipo</th>
              <th>Sesión</th>
              <th>Recursos</th>
              <th>Batería</th>
              <th>Acceso directo</th>
              <th>Heartbeat</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {items.map((device) => {
              const health = getAgentHealth(device);
              const ram = ramPercent(device.ramUsedMb, device.ramTotalMb);
              return (
                <tr key={device.id}>
                  <td>
                    <span className="live-state" data-state={health}>
                      {healthLabels[health]}
                    </span>
                    <strong>{device.hostname}</strong>
                    <small>
                      {device.osName || "SO no reportado"} ·{" "}
                      <span className="live-mono">
                        {device.primaryIp || "IP —"}
                      </span>
                    </small>
                  </td>
                  <td>
                    <strong>{device.loggedInUser || "Sin usuario"}</strong>
                    <small>Uptime {formatUptime(device.uptimeSec)}</small>
                  </td>
                  <td>
                    <div className="live-resource">
                      <span>
                        CPU{" "}
                        {device.cpuPct == null
                          ? "—"
                          : `${Math.round(device.cpuPct)}%`}
                      </span>
                      {device.cpuPct != null ? (
                        <meter
                          min={0}
                          max={100}
                          low={65}
                          high={90}
                          optimum={30}
                          value={device.cpuPct}
                          aria-label={`CPU ${Math.round(device.cpuPct)} por ciento`}
                        />
                      ) : null}
                    </div>
                    <div className="live-resource">
                      <span>
                        RAM {formatRam(device.ramUsedMb, device.ramTotalMb)}
                      </span>
                      {ram != null ? (
                        <meter
                          min={0}
                          max={100}
                          low={65}
                          high={90}
                          optimum={30}
                          value={ram}
                          aria-label={`RAM ${ram} por ciento`}
                        />
                      ) : null}
                    </div>
                  </td>
                  <td>
                    {device.batteryPct == null ? (
                      <span className="live-muted">Sin batería</span>
                    ) : (
                      <span
                        className="live-battery"
                        data-low={
                          device.batteryPct < 20 && !device.batteryCharging
                        }
                      >
                        <BatteryCharging size={14} aria-hidden="true" />
                        {device.batteryPct}%{" "}
                        {device.batteryCharging ? "cargando" : ""}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="live-capabilities">
                      <span data-ready={device.sshRunning}>
                        <Terminal size={13} />
                        SSH
                      </span>
                      <span data-ready={device.vncRunning}>
                        <MonitorUp size={13} />
                        VNC
                      </span>
                    </div>
                  </td>
                  <td>
                    <span title={formatDate(device.lastSeenAt)}>
                      {formatHeartbeat(device.lastSeenAt)}
                    </span>
                    <small>
                      {device.agentVersion
                        ? `Agente ${device.agentVersion}`
                        : "Versión desconocida"}
                    </small>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="live-icon-button"
                      aria-label={`Abrir ${device.hostname}`}
                      disabled={openingId === device.id}
                      onClick={() => onOpen(device)}
                    >
                      <Eye size={16} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="live-mobile-list" aria-label="Equipos encontrados">
        {items.map((device) => {
          const health = getAgentHealth(device);
          return (
            <li key={device.id}>
              <article>
                <div className="live-card-top">
                  <span className="live-state" data-state={health}>
                    {healthLabels[health]}
                  </span>
                  <span>{formatHeartbeat(device.lastSeenAt)}</span>
                </div>
                <h3>
                  <ServerCog size={16} />
                  {device.hostname}
                </h3>
                <p>
                  {device.loggedInUser || "Sin usuario"} ·{" "}
                  {device.primaryIp || "Sin IP"}
                </p>
                <dl>
                  <div>
                    <dt>SO</dt>
                    <dd>{device.osName || "—"}</dd>
                  </div>
                  <div>
                    <dt>CPU</dt>
                    <dd>
                      {device.cpuPct == null
                        ? "—"
                        : `${Math.round(device.cpuPct)}%`}
                    </dd>
                  </div>
                  <div>
                    <dt>RAM</dt>
                    <dd>{formatRam(device.ramUsedMb, device.ramTotalMb)}</dd>
                  </div>
                  <div>
                    <dt>Batería</dt>
                    <dd>
                      {device.batteryPct == null
                        ? "—"
                        : `${device.batteryPct}%`}
                    </dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className="live-button live-button--ghost"
                  onClick={() => onOpen(device)}
                >
                  <Eye size={14} />
                  Abrir telemetría
                </button>
              </article>
            </li>
          );
        })}
      </ul>
    </>
  );
}
