import { ArrowUpRight } from "lucide-react";
import { formatDate, formatHeartbeat } from "@/features/it/live/format";
import { endpointTitle } from "../endpoints";
import type { TreeEdge } from "../topology";
import type { LiveDevice, LiveEndpoint, LivePort, LiveWifiClient } from "../types";
import { wifiNetwork } from "../wifi";
import { AssetLink } from "./AssetLink";
import { RecentEvents } from "./RecentEvents";
import { SignalBars } from "./WifiClients";
import {
  NEIGHBOR_PROTOCOL_LABELS,
  PORT_TONE_LABELS,
  formatSpeed,
  linkPortLabel,
  neighborTitle,
  poeLabel,
  portTone,
  sortedNeighbors,
} from "../ports";

const MAX_LISTED = 60;

interface PortDetailProps {
  device: LiveDevice;
  port: LivePort;
  edge: TreeEdge | undefined;
  endpoints: LiveEndpoint[];
  wifiByMac: Map<string, LiveWifiClient>;
  highlightMac: string | null;
  devices: Map<string, LiveDevice>;
  onGoTo: (deviceId: string) => void;
}

export function PortDetail({ device, port, edge, endpoints, wifiByMac, highlightMac, devices, onGoTo }: PortDetailProps) {
  const tone = portTone(port);
  const otherId = edge ? (edge.parentId === device.id ? edge.childId : edge.parentId) : null;
  const other = otherId ? devices.get(otherId) : undefined;
  const otherPorts = edge
    ? edge.parentId === device.id
      ? edge.childPorts
      : edge.parentPorts
    : [];
  // Las PCs con agente primero; el equipo buscado, arriba de todo.
  const listed = [...endpoints].sort(
    (a, b) =>
      Number(b.mac === highlightMac) - Number(a.mac === highlightMac) ||
      Number(Boolean(b.agent)) - Number(Boolean(a.agent)) ||
      endpointTitle(a).localeCompare(endpointTitle(b), "es"),
  );
  const shared = endpoints.some((endpoint) => endpoint.shared);
  const viaAp = endpoints.find((endpoint) => endpoint.viaDeviceId)?.viaDeviceId;

  return (
    <section className="netlive-port-detail" aria-label={`Puerto ${port.name}`}>
      <header>
        <strong>{port.name}</strong>
        <span data-tone={tone}>{PORT_TONE_LABELS[tone]}</span>
      </header>
      {port.description ? <p className="netlive-port-detail__description">{port.description}</p> : null}
      <dl>
        <div>
          <dt>Velocidad</dt>
          <dd>
            {port.linkUp
              ? `${formatSpeed(port.speedMbps)}${port.fullDuplex === false ? " · half duplex" : ""}`
              : "—"}
          </dd>
        </div>
        <div>
          <dt>VLAN nativa</dt>
          <dd>{port.pvid ?? "—"}</dd>
        </div>
        <div>
          <dt>Último cambio</dt>
          <dd>{port.linkChangedAt ? formatHeartbeat(port.linkChangedAt) : "—"}</dd>
        </div>
        {port.poe ? (
          <div>
            <dt>PoE</dt>
            <dd data-poe={port.poe.status}>{poeLabel(port.poe)}</dd>
          </div>
        ) : null}
      </dl>

      {other ? (
        <p className="netlive-port-detail__link">
          Conecta con{" "}
          <button type="button" className="nodrag nopan" onClick={() => onGoTo(other.id)}>
            {other.name}
            <ArrowUpRight size={12} aria-hidden="true" />
          </button>
          {otherPorts.length ? ` (${otherPorts.map((key) => linkPortLabel(other, key)).join(" + ")})` : ""}
          {" · "}
          {edge?.source === "lldp" ? "confirmado por LLDP" : "deducido de las tablas MAC"}
        </p>
      ) : null}

      {listed.length ? (
        <div className="netlive-endpoints">
          <p className="netlive-endpoints__summary">
            <strong>
              {listed.length} equipo{listed.length === 1 ? "" : "s"} conectado{listed.length === 1 ? "" : "s"}
            </strong>
            {viaAp ? ` · clientes Wi-Fi de ${devices.get(viaAp)?.name ?? "un AP"}` : ""}
            {shared ? " · hay varios equipos detrás de este puerto: probablemente un switch sin gestión o un grabador de cámaras" : ""}
          </p>
          <ul>
            {listed.slice(0, MAX_LISTED).map((endpoint) => (
              <li key={endpoint.mac} data-highlighted={endpoint.mac === highlightMac || undefined} data-agent={Boolean(endpoint.agent) || undefined}>
                <strong>{endpointTitle(endpoint)}</strong>
                <span>
                  {[
                    endpoint.agent && endpoint.hostname && endpoint.hostname !== endpoint.agent.hostname ? endpoint.hostname : null,
                    // Lo que ya es el título no se repite.
                    endpoint.ip !== endpointTitle(endpoint) ? endpoint.ip : null,
                    endpoint.mac !== endpointTitle(endpoint) ? endpoint.mac : null,
                    endpoint.vlan ? `VLAN ${endpoint.vlan}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                {wifiByMac.get(endpoint.mac) ? (
                  <span className="netlive-endpoints__wifi">
                    {wifiNetwork(wifiByMac.get(endpoint.mac)!)}
                    <SignalBars dbm={wifiByMac.get(endpoint.mac)!.signal} />
                  </span>
                ) : null}
                <small>
                  {[
                    endpoint.agent?.loggedInUser ? `Usuario ${endpoint.agent.loggedInUser}` : endpoint.agent ? "PC con agente" : null,
                    endpoint.movedAt
                      ? `llegó a este puerto ${formatHeartbeat(endpoint.movedAt)}`
                      : `visto desde ${formatDate(endpoint.firstSeenAt)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
                {endpoint.asset ? <AssetLink asset={endpoint.asset} /> : null}
              </li>
            ))}
          </ul>
          {listed.length > MAX_LISTED ? (
            <p className="netlive-hint">…y {listed.length - MAX_LISTED} más.</p>
          ) : null}
        </div>
      ) : null}

      {port.neighbors.length ? (
        <ul className="netlive-neighbors">
          {sortedNeighbors(port.neighbors).map((neighbor, index) => (
            <li key={`${neighbor.mac ?? neighbor.name ?? "vecino"}-${index}`} data-protocol={neighbor.protocol}>
              <strong>{neighborTitle(neighbor)}</strong>
              <span>
                {[
                  neighbor.ip,
                  neighbor.mac,
                  neighbor.port ? `puerto ${neighbor.port}` : null,
                  neighbor.platform,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              <small>{NEIGHBOR_PROTOCOL_LABELS[neighbor.protocol] ?? neighbor.protocol}</small>
            </li>
          ))}
        </ul>
      ) : !other && !listed.length ? (
        <p className="netlive-hint">
          {port.linkUp ? "Tiene enlace, pero todavía no se vio ningún equipo en este puerto." : "Libre."}
        </p>
      ) : null}

      <RecentEvents deviceId={device.id} portKey={port.key} devices={devices} title="Historial del puerto" />
    </section>
  );
}
