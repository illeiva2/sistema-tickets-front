import type { LiveDevice, LiveLink, LivePort, NetworkLiveView } from "./types";

const ROLE_RANK: Record<string, number> = { router: 0, core: 1, access: 2, ap: 3 };

export const roleRank = (role: string) => ROLE_RANK[role] ?? 4;

export interface TreeEdge {
  id: string;
  parentId: string;
  childId: string;
  parentPorts: string[];
  childPorts: string[];
  /** lldp = confirmado por el vecino; fdb = deducido de las tablas MAC. */
  source: string;
  speedMbps: number | null;
  /** Cantidad de enlaces físicos (un LAG o bond cuenta varios). */
  members: number;
  up: boolean;
}

export interface WanPort {
  id: string;
  deviceId: string;
  port: LivePort;
  label: string;
}

export interface Topology {
  devices: Map<string, LiveDevice>;
  rootIds: string[];
  parent: Map<string, string>;
  children: Map<string, string[]>;
  edges: TreeEdge[];
  /** Enlaces que cierran un ciclo (redundantes): se dibujan pero no ordenan el árbol. */
  extraEdges: TreeEdge[];
  /** Equipos sin ningún enlace conocido. */
  unplaced: string[];
  wans: WanPort[];
}

function byRoleThenName(a: LiveDevice, b: LiveDevice) {
  return roleRank(a.role) - roleRank(b.role) || a.name.localeCompare(b.name, "es");
}

function edgeFor(link: LiveLink, parentId: string, devices: Map<string, LiveDevice>): TreeEdge {
  const parentEnd = link.a.deviceId === parentId ? link.a : link.b;
  const childEnd = link.a.deviceId === parentId ? link.b : link.a;
  const ports = [
    ...findPorts(devices.get(parentEnd.deviceId), parentEnd.ports),
    ...findPorts(devices.get(childEnd.deviceId), childEnd.ports),
  ];
  const known = ports.filter((port) => port.linkUp && port.speedMbps);
  const parentDevice = devices.get(parentEnd.deviceId);
  const childDevice = devices.get(childEnd.deviceId);
  return {
    id: link.id,
    parentId: parentEnd.deviceId,
    childId: childEnd.deviceId,
    parentPorts: parentEnd.ports,
    childPorts: childEnd.ports,
    source: link.source,
    speedMbps: known.length ? Math.max(...known.map((port) => port.speedMbps ?? 0)) : null,
    members: Math.max(parentEnd.ports.length, childEnd.ports.length, 1),
    up: ports.length
      ? ports.some((port) => port.linkUp)
      : parentDevice?.status !== "down" && childDevice?.status !== "down",
  };
}

function findPorts(device: LiveDevice | undefined, keys: string[]) {
  if (!device) return [];
  return device.ports.filter((port) => keys.includes(port.key));
}

/**
 * Árbol a partir de los enlaces: la raíz es el router (o el núcleo si no hay router) y se
 * recorre a lo ancho. Lo que no cuelga de nada queda "sin ubicar".
 */
export function buildTopology(view: NetworkLiveView): Topology {
  const devices = new Map(view.devices.map((device) => [device.id, device]));
  const adjacency = new Map<string, { other: string; link: LiveLink }[]>();
  for (const link of view.links) {
    if (!devices.has(link.a.deviceId) || !devices.has(link.b.deviceId)) continue;
    if (link.a.deviceId === link.b.deviceId) continue;
    for (const [from, to] of [
      [link.a.deviceId, link.b.deviceId],
      [link.b.deviceId, link.a.deviceId],
    ]) {
      const list = adjacency.get(from) ?? [];
      list.push({ other: to, link });
      adjacency.set(from, list);
    }
  }

  const ordered = [...view.devices].sort(byRoleThenName);
  const parent = new Map<string, string>();
  const children = new Map<string, string[]>();
  const edges: TreeEdge[] = [];
  const extraEdges: TreeEdge[] = [];
  const usedLinks = new Set<string>();
  const visited = new Set<string>();
  const rootIds: string[] = [];

  for (const candidate of ordered) {
    if (visited.has(candidate.id) || !adjacency.has(candidate.id)) continue;
    rootIds.push(candidate.id);
    visited.add(candidate.id);
    const queue = [candidate.id];
    while (queue.length) {
      const current = queue.shift()!;
      const neighbors = [...(adjacency.get(current) ?? [])].sort((x, y) =>
        byRoleThenName(devices.get(x.other)!, devices.get(y.other)!),
      );
      for (const { other, link } of neighbors) {
        if (usedLinks.has(link.id)) continue;
        usedLinks.add(link.id);
        if (visited.has(other)) {
          extraEdges.push(edgeFor(link, current, devices));
          continue;
        }
        visited.add(other);
        parent.set(other, current);
        children.set(current, [...(children.get(current) ?? []), other]);
        edges.push(edgeFor(link, current, devices));
        queue.push(other);
      }
    }
  }

  const unplaced = ordered
    .filter((device) => !visited.has(device.id))
    .map((device) => device.id);

  const wans: WanPort[] = [];
  for (const device of ordered.filter((candidate) => candidate.role === "router")) {
    for (const port of device.ports) {
      if (!port.adminUp || !/wan/i.test(`${port.name} ${port.description ?? ""}`)) continue;
      wans.push({ id: `wan:${device.id}:${port.key}`, deviceId: device.id, port, label: wanLabel(port) });
    }
  }

  return { devices, rootIds, parent, children, edges, extraEdges, unplaced, wans };
}

/** "ether4-WAN TELECOM" → "WAN TELECOM"; si queda sólo "wan", el nombre completo. */
export function wanLabel(port: Pick<LivePort, "name" | "description">) {
  const stripped = port.name.replace(/^(ether|sfp-sfpplus|sfpplus|sfp|combo)\d+[-_ ]*/i, "").trim();
  if (stripped && stripped.toLowerCase() !== "wan") return stripped;
  return port.description?.trim() || port.name;
}

/** Puertos de un equipo que forman parte de algún enlace (para marcarlos en el panel). */
export function linkedPortKeys(topology: Topology, deviceId: string) {
  const keys = new Map<string, TreeEdge>();
  for (const edge of [...topology.edges, ...topology.extraEdges]) {
    if (edge.parentId === deviceId) edge.parentPorts.forEach((key) => keys.set(key, edge));
    if (edge.childId === deviceId) edge.childPorts.forEach((key) => keys.set(key, edge));
  }
  return keys;
}
