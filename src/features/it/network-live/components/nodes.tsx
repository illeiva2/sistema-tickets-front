import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Globe, Network, Router, Server, Wifi, WifiOff } from "lucide-react";
import { formatHeartbeat, formatUptime } from "@/features/it/live/format";
import type { TreeEdge, WanPort } from "../topology";
import type { LiveDevice } from "../types";
import { formatSpeed, portBlocks, portStats } from "../ports";
import { STACK_HANDLE_OFFSET, type NodeSize } from "../layout";
import { PortDetail } from "./PortDetail";
import { PortPanel } from "./PortPanel";

export const STATUS_LABELS: Record<string, string> = {
  ok: "Responde",
  down: "No responde",
  stale: "Sin datos recientes",
};

const ROLE_LABELS: Record<string, string> = {
  router: "Router",
  core: "Núcleo",
  access: "Switch",
  ap: "AP",
};

const PORT_PITCH = 26; // botón de 22 px + separación de 4 px

/**
 * Tamaño de cada nodo, el mismo que usa el diagramado: compacto, con el panel de puertos, o con
 * el panel y el detalle del puerto elegido.
 */
export function deviceNodeSize(device: LiveDevice, expanded: boolean, withDetail = false): NodeSize {
  if (!expanded) {
    return device.role === "ap" ? { width: 184, height: 60 } : { width: 228, height: 74 };
  }
  const blocks = portBlocks(device.ports);
  const panel =
    blocks.reduce((sum, block) => sum + Math.ceil(block.ports.length / block.rows) * PORT_PITCH, 0) +
    Math.max(0, blocks.length - 1) * 18;
  const rows = Math.max(1, ...blocks.map((block) => block.rows));
  return {
    width: Math.min(Math.max(360, panel + 36), 960),
    height: 74 + 24 + rows * PORT_PITCH + (withDetail ? 250 : 110),
  };
}

export const WAN_NODE_SIZE: NodeSize = { width: 168, height: 46 };

function RoleIcon({ device }: { device: LiveDevice }) {
  if (device.role === "router") return <Router size={16} aria-hidden="true" />;
  if (device.role === "ap") return device.status === "ok" ? <Wifi size={15} aria-hidden="true" /> : <WifiOff size={15} aria-hidden="true" />;
  if (device.role === "core") return <Server size={16} aria-hidden="true" />;
  return <Network size={16} aria-hidden="true" />;
}

export interface DeviceNodeData extends Record<string, unknown> {
  device: LiveDevice;
  size: NodeSize;
  expanded: boolean;
  highlighted: boolean;
  selectedPort: string | null;
  linkedPorts: Map<string, TreeEdge>;
  devices: Map<string, LiveDevice>;
  onToggle: (deviceId: string) => void;
  onSelectPort: (deviceId: string, portKey: string | null) => void;
  onGoTo: (deviceId: string) => void;
}

export type DeviceFlowNode = Node<DeviceNodeData, "device">;

function summary(device: LiveDevice) {
  if (device.status !== "ok") return device.lastError ?? STATUS_LABELS[device.status];
  if (device.role === "ap") {
    return `${device.clients ?? 0} cliente${device.clients === 1 ? "" : "s"} Wi-Fi`;
  }
  const { up, total } = portStats(device);
  return `${up}/${total} puertos con enlace`;
}

export const DeviceNode = memo(function DeviceNode({ data }: NodeProps<DeviceFlowNode>) {
  const { device, size, expanded, highlighted, selectedPort, linkedPorts, devices } = data;
  const port = selectedPort ? device.ports.find((candidate) => candidate.key === selectedPort) : undefined;

  return (
    <div
      className="netlive-node"
      data-role={device.role}
      data-status={device.status}
      data-expanded={expanded || undefined}
      data-highlighted={highlighted || undefined}
      style={{ width: size.width, height: size.height }}
    >
      <Handle type="target" id="t" position={Position.Top} isConnectable={false} className="netlive-handle" />
      <Handle type="target" id="l" position={Position.Left} isConnectable={false} className="netlive-handle" />
      <Handle type="source" id="b" position={Position.Bottom} isConnectable={false} className="netlive-handle" />
      {/* Hacia los APs apilados: la línea baja por el costado izquierdo, no por el centro. */}
      <Handle
        type="source"
        id="bl"
        position={Position.Bottom}
        isConnectable={false}
        className="netlive-handle"
        style={{ left: STACK_HANDLE_OFFSET }}
      />
      <button
        type="button"
        className="netlive-node__head nodrag"
        aria-expanded={expanded}
        title={expanded ? "Cerrar el panel de puertos" : "Ver los puertos"}
        onClick={() => data.onToggle(device.id)}
      >
        <span className="netlive-node__icon">
          <RoleIcon device={device} />
        </span>
        <span className="netlive-node__title">
          <strong>{device.name}</strong>
          <small>
            {[device.managementIp, device.model].filter(Boolean).join(" · ") || ROLE_LABELS[device.role] || device.role}
          </small>
          <small className="netlive-node__summary">{summary(device)}</small>
        </span>
        <span className="netlive-dot" data-status={device.status} aria-label={STATUS_LABELS[device.status]} />
      </button>

      {expanded ? (
        <div className="netlive-node__body nodrag nopan nowheel">
          <PortPanel
            ports={device.ports}
            linkedPorts={linkedPorts}
            selectedPort={selectedPort}
            onSelect={(key) => data.onSelectPort(device.id, key)}
          />
          <div className="netlive-node__detail">
            {port ? (
              <PortDetail
                device={device}
                port={port}
                edge={linkedPorts.get(port.key)}
                devices={devices}
                onGoTo={data.onGoTo}
              />
            ) : (
              <p className="netlive-hint">Tocá un puerto para ver qué tiene conectado.</p>
            )}
          </div>
          <dl className="netlive-node__meta">
            <div>
              <dt>Firmware</dt>
              <dd>{device.firmware ?? "—"}</dd>
            </div>
            <div>
              <dt>Serie</dt>
              <dd>{device.serialNumber ?? "—"}</dd>
            </div>
            <div>
              <dt>Encendido</dt>
              <dd>{formatUptime(device.uptimeSeconds)}</dd>
            </div>
            <div>
              <dt>Leído</dt>
              <dd>{formatHeartbeat(device.lastOkAt ?? device.lastPolledAt)}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </div>
  );
});

export interface WanNodeData extends Record<string, unknown> {
  wan: WanPort;
  onSelectPort: (deviceId: string, portKey: string | null) => void;
}

export type WanFlowNode = Node<WanNodeData, "wan">;

export const WanNode = memo(function WanNode({ data }: NodeProps<WanFlowNode>) {
  const { wan } = data;
  return (
    <div className="netlive-wan" data-up={wan.port.linkUp || undefined} style={WAN_NODE_SIZE}>
      <Handle type="source" id="b" position={Position.Bottom} isConnectable={false} className="netlive-handle" />
      <button
        type="button"
        className="nodrag"
        title={`${wan.port.name}: ${wan.port.linkUp ? "con enlace" : "sin enlace"}`}
        onClick={() => data.onSelectPort(wan.deviceId, wan.port.key)}
      >
        <Globe size={14} aria-hidden="true" />
        <span>
          <strong>{wan.label}</strong>
          <small>{wan.port.linkUp ? formatSpeed(wan.port.speedMbps) : "sin enlace"}</small>
        </span>
      </button>
    </div>
  );
});

export const nodeTypes = { device: DeviceNode, wan: WanNode };
