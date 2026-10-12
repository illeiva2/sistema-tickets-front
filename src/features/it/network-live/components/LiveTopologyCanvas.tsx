import { useEffect, useMemo, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { layoutTopology } from "../layout";
import { linkPortLabel } from "../ports";
import { linkedPortKeys, type Topology, type TreeEdge } from "../topology";
import type { LiveEndpoint } from "../types";
import { edgeTypes, type PortFlowEdge } from "./PortEdge";
import {
  WAN_NODE_SIZE,
  deviceNodeSize,
  nodeTypes,
  type DeviceFlowNode,
  type WanFlowNode,
} from "./nodes";

interface LiveTopologyCanvasProps {
  topology: Topology;
  endpointIndex: Map<string, Map<string, LiveEndpoint[]>>;
  selectedId: string | null;
  selectedPort: string | null;
  /** Camino resaltado (resultado de una búsqueda): equipos y enlaces hasta el router. */
  highlight: { deviceIds: Set<string>; edgeIds: Set<string> } | null;
  highlightMac: string | null;
  onToggle: (deviceId: string) => void;
  onSelectPort: (deviceId: string, portKey: string | null) => void;
  onGoTo: (deviceId: string) => void;
}

const NO_ENDPOINTS = new Map<string, LiveEndpoint[]>();

// React Flow apaga los eventos del puntero en los nodos que no se pueden elegir ni arrastrar; los
// nuestros tienen botones (cabecera, puertos, WAN), así que se vuelven a prender a mano.
const INTERACTIVE_NODE = { pointerEvents: "all" } as const;

export function LiveTopologyCanvas(props: LiveTopologyCanvasProps) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}

function edgeClass(edge: TreeEdge, highlighted: boolean) {
  return [
    "netlive-edge",
    `netlive-edge--${edge.source}`,
    edge.up ? null : "netlive-edge--down",
    highlighted ? "netlive-edge--highlighted" : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function strokeWidth(edge: TreeEdge) {
  if ((edge.speedMbps ?? 0) >= 10_000) return 3.4;
  if ((edge.speedMbps ?? 0) >= 1000 || edge.members > 1) return 2.2;
  return 1.3;
}

function Canvas({
  topology,
  endpointIndex,
  selectedId,
  selectedPort,
  highlight,
  highlightMac,
  onToggle,
  onSelectPort,
  onGoTo,
}: LiveTopologyCanvasProps) {
  const { fitView } = useReactFlow();

  const { nodes, edges } = useMemo(() => {
    const sizeOf = (id: string) => {
      const device = topology.devices.get(id);
      if (!device) return WAN_NODE_SIZE;
      const port = id === selectedId ? selectedPort : null;
      const listed = port !== null && Boolean(endpointIndex.get(id)?.get(port)?.length);
      return deviceNodeSize(device, id === selectedId, port !== null, listed);
    };
    const layout = layoutTopology(topology, sizeOf);
    // Con un camino buscado se resalta sólo el camino; si no, los vecinos del equipo abierto.
    const neighbors = new Set<string>(highlight?.deviceIds);
    for (const edge of highlight ? [] : topology.edges) {
      if (edge.parentId === selectedId) neighbors.add(edge.childId);
      if (edge.childId === selectedId) neighbors.add(edge.parentId);
    }
    const isHighlighted = (edge: TreeEdge) =>
      highlight ? highlight.edgeIds.has(edge.id) : edge.parentId === selectedId || edge.childId === selectedId;

    const deviceNodes: DeviceFlowNode[] = [...topology.devices.values()].map((device) => ({
      id: device.id,
      type: "device",
      position: layout.positions.get(device.id) ?? { x: 0, y: 0 },
      // El nodo abierto va arriba de los demás: su panel puede tapar a los vecinos.
      zIndex: device.id === selectedId ? 10 : 1,
      draggable: false,
      selectable: false,
      style: INTERACTIVE_NODE,
      data: {
        device,
        size: sizeOf(device.id),
        expanded: device.id === selectedId,
        highlighted: neighbors.has(device.id),
        selectedPort: device.id === selectedId ? selectedPort : null,
        linkedPorts: linkedPortKeys(topology, device.id),
        endpointsByPort: endpointIndex.get(device.id) ?? NO_ENDPOINTS,
        highlightMac: device.id === selectedId ? highlightMac : null,
        devices: topology.devices,
        onToggle,
        onSelectPort,
        onGoTo,
      },
    }));

    const wanNodes: WanFlowNode[] = topology.wans.map((wan) => ({
      id: wan.id,
      type: "wan",
      position: layout.positions.get(wan.id) ?? { x: 0, y: 0 },
      draggable: false,
      selectable: false,
      style: INTERACTIVE_NODE,
      data: { wan, onSelectPort },
    }));

    const flowEdges: (PortFlowEdge | Edge)[] = [...topology.edges, ...topology.extraEdges].map((edge) => {
      const highlighted = isHighlighted(edge);
      const parent = topology.devices.get(edge.parentId);
      const child = topology.devices.get(edge.childId);
      const parentPorts = edge.parentPorts.map((key) => linkPortLabel(parent, key)).join("+");
      const childPorts = edge.childPorts.map((key) => linkPortLabel(child, key)).join("+");
      return {
        id: edge.id,
        source: edge.parentId,
        target: edge.childId,
        sourceHandle: layout.stacked.has(edge.childId) ? "bl" : "b",
        targetHandle: layout.stacked.has(edge.childId) ? "l" : "t",
        type: "port",
        className: edgeClass(edge, highlighted),
        style: { strokeWidth: strokeWidth(edge) },
        data: {
          label: highlighted && (parentPorts || childPorts) ? `${parentPorts || "?"} → ${childPorts || "?"}` : undefined,
        },
        zIndex: highlighted ? 5 : 0,
      };
    });

    for (const wan of topology.wans) {
      flowEdges.push({
        id: `edge-${wan.id}`,
        source: wan.id,
        target: wan.deviceId,
        sourceHandle: "b",
        targetHandle: "t",
        type: "smoothstep",
        className: `netlive-edge netlive-edge--wan${wan.port.linkUp ? "" : " netlive-edge--down"}`,
      });
    }

    return { nodes: [...wanNodes, ...deviceNodes], edges: flowEdges };
  }, [topology, endpointIndex, selectedId, selectedPort, highlight, highlightMac, onToggle, onSelectPort, onGoTo]);

  // Al abrir un equipo se lo centra (el diagramado cambió porque el nodo creció); al cerrarlo se
  // vuelve a ver todo. La primera vista la encuadra la prop fitView, cuando los nodos ya están medidos.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void fitView(
        selectedId
          ? { nodes: [{ id: selectedId }], duration: 450, padding: 0.35, maxZoom: 1.05 }
          : { duration: 450, padding: 0.12 },
      );
    }, 60);
    return () => window.clearTimeout(timer);
  }, [selectedId, fitView]);

  return (
    <div className="netlive-canvas" aria-label="Diagrama de la red">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        colorMode="dark"
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.12}
        maxZoom={1.8}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnDoubleClick={false}
        onlyRenderVisibleElements={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#1c343b" />
        <Controls showInteractive={false} position="bottom-left" />
      </ReactFlow>
    </div>
  );
}
