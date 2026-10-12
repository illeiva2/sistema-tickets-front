import { ArrowUpRight } from "lucide-react";
import { formatHeartbeat } from "@/features/it/live/format";
import type { TreeEdge } from "../topology";
import type { LiveDevice, LivePort } from "../types";
import {
  NEIGHBOR_PROTOCOL_LABELS,
  PORT_TONE_LABELS,
  formatSpeed,
  linkPortLabel,
  neighborTitle,
  portTone,
  sortedNeighbors,
} from "../ports";

interface PortDetailProps {
  device: LiveDevice;
  port: LivePort;
  edge: TreeEdge | undefined;
  devices: Map<string, LiveDevice>;
  onGoTo: (deviceId: string) => void;
}

export function PortDetail({ device, port, edge, devices, onGoTo }: PortDetailProps) {
  const tone = portTone(port);
  const otherId = edge ? (edge.parentId === device.id ? edge.childId : edge.parentId) : null;
  const other = otherId ? devices.get(otherId) : undefined;
  const otherPorts = edge
    ? edge.parentId === device.id
      ? edge.childPorts
      : edge.parentPorts
    : [];

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
      ) : !other ? (
        <p className="netlive-hint">
          {port.linkUp
            ? "Hay algo conectado, pero no se anuncia por LLDP. Las PCs y demás equipos aparecen en la próxima etapa."
            : "Libre."}
        </p>
      ) : null}
    </section>
  );
}
