import { linkPortLabel } from "./ports";
import type { Topology } from "./topology";
import type { LiveDevice, LiveEndpoint } from "./types";

/** Cómo se llama un equipo final: la PC del agente, el nombre DHCP, la IP o, si no hay nada, la MAC. */
export function endpointTitle(endpoint: Pick<LiveEndpoint, "agent" | "hostname" | "ip" | "mac">) {
  return endpoint.agent?.hostname ?? endpoint.hostname ?? endpoint.ip ?? endpoint.mac;
}

/** Dónde está: "SWITCH · puerto 12", o "Wi-Fi por AP-010 (SWITCH · puerto 5)" para los clientes Wi-Fi. */
export function endpointWhere(
  endpoint: Pick<LiveEndpoint, "deviceId" | "portKey" | "viaDeviceId">,
  devices: Map<string, LiveDevice>,
  deviceName?: string,
) {
  const device = devices.get(endpoint.deviceId);
  const place = `${device?.name ?? deviceName ?? "equipo que ya no informa"} · puerto ${linkPortLabel(device, endpoint.portKey)}`;
  const via = endpoint.viaDeviceId ? devices.get(endpoint.viaDeviceId) : undefined;
  return via ? `Wi-Fi por ${via.name} (${place})` : place;
}

/** Equipos finales por switch y puerto. */
export function indexEndpoints(endpoints: LiveEndpoint[]) {
  const index = new Map<string, Map<string, LiveEndpoint[]>>();
  for (const endpoint of endpoints) {
    let ports = index.get(endpoint.deviceId);
    if (!ports) index.set(endpoint.deviceId, (ports = new Map()));
    const list = ports.get(endpoint.portKey);
    if (list) list.push(endpoint);
    else ports.set(endpoint.portKey, [endpoint]);
  }
  return index;
}

const compactMac = (value: string) => value.replace(/[.\-:\s]/g, "").toUpperCase();

/** `exact`: coincide entero (IP, MAC, nombre o usuario), no sólo una parte. */
export type SearchHit =
  | { kind: "device"; device: LiveDevice; exact: boolean }
  | { kind: "endpoint"; endpoint: LiveEndpoint; exact: boolean };

/**
 * Busca entre lo conectado ahora: equipos de red por nombre, IP o MAC, y equipos finales por
 * nombre de la PC, usuario, nombre DHCP, IP o MAC (en cualquier formato). Las coincidencias
 * exactas van primero: "192.168.100.4" trae también la .41, pero después.
 */
export function searchLive(devices: LiveDevice[], endpoints: LiveEndpoint[], query: string): SearchHit[] {
  const text = query.trim().toLowerCase();
  if (text.length < 2) return [];
  const mac = compactMac(text);
  // "192.168.100.41" sin los puntos parece hexadecimal: primero se descarta que sea una IP.
  const looksLikeIp = text.includes(".") && /^\d{1,3}(\.\d{0,3}){0,3}$/.test(text);
  const looksLikeMac =
    !looksLikeIp && /^[0-9A-F]{4,12}$/.test(mac) && (/[.\-:]/.test(text) || mac.length === 12);
  const sameText = (value: string | null | undefined) => value?.toLowerCase() === text;
  const containsText = (value: string | null | undefined) => Boolean(value?.toLowerCase().includes(text));

  const hits: SearchHit[] = [];
  for (const device of devices) {
    const deviceMac = device.macAddress ? compactMac(device.macAddress) : null;
    const exact = sameText(device.name) || device.managementIp === text || (looksLikeMac && deviceMac === mac);
    if (exact || containsText(device.name) || (looksLikeMac && deviceMac?.includes(mac))) {
      hits.push({ kind: "device", device, exact });
    }
  }
  for (const endpoint of endpoints) {
    if (looksLikeMac) {
      const endpointMac = compactMac(endpoint.mac);
      if (endpointMac.includes(mac)) hits.push({ kind: "endpoint", endpoint, exact: endpointMac === mac });
      continue;
    }
    const exact =
      endpoint.ip === text ||
      sameText(endpoint.hostname) ||
      sameText(endpoint.agent?.hostname) ||
      sameText(endpoint.agent?.loggedInUser);
    if (
      exact ||
      (looksLikeIp && endpoint.ip?.startsWith(text)) ||
      containsText(endpoint.hostname) ||
      containsText(endpoint.agent?.hostname) ||
      containsText(endpoint.agent?.loggedInUser)
    ) {
      hits.push({ kind: "endpoint", endpoint, exact });
    }
  }
  return hits.sort((a, b) => Number(b.exact) - Number(a.exact));
}

/** A dónde ir al confirmar la búsqueda: el único resultado, o la única coincidencia exacta. */
export function directHit(hits: SearchHit[]) {
  if (hits.length === 1) return hits[0];
  const exact = hits.filter((hit) => hit.exact);
  return exact.length === 1 ? exact[0] : null;
}

/** Equipos y enlaces desde cada equipo dado hasta la raíz del árbol (para resaltar el camino). */
export function pathToRoot(topology: Topology, ...deviceIds: string[]) {
  const devices = new Set<string>();
  const edgeIds = new Set<string>();
  for (const start of deviceIds) {
    let current: string | undefined = start;
    while (current && !devices.has(current)) {
      devices.add(current);
      const parent = topology.parent.get(current);
      if (!parent) break;
      const edge = topology.edges.find((candidate) => candidate.childId === current && candidate.parentId === parent);
      if (edge) edgeIds.add(edge.id);
      current = parent;
    }
  }
  return { deviceIds: devices, edgeIds };
}
