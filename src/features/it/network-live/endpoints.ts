import { linkPortLabel } from "./ports";
import type { Topology } from "./topology";
import type { LiveDevice, LiveEndpoint, LiveWifiClient } from "./types";

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

/**
 * `exact`: coincide entero (IP, MAC, nombre o usuario), no sólo una parte. `wifi`: cliente que
 * UniFi ve asociado a un AP pero que no aparece en las tablas MAC (se ubica en el AP).
 */
export type SearchHit =
  | { kind: "device"; device: LiveDevice; exact: boolean }
  | { kind: "endpoint"; endpoint: LiveEndpoint; exact: boolean }
  | { kind: "wifi"; client: LiveWifiClient; exact: boolean };

/**
 * Busca entre lo conectado ahora: equipos de red por nombre, IP o MAC, y equipos finales por
 * nombre de la PC, usuario, nombre DHCP, IP o MAC (en cualquier formato). Las coincidencias
 * exactas van primero: "192.168.100.4" trae también la .41, pero después.
 */
export function searchLive(
  devices: LiveDevice[],
  endpoints: LiveEndpoint[],
  query: string,
  wifiClients: LiveWifiClient[] = [],
): SearchHit[] {
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
  // Lo mismo para equipos finales y clientes Wi-Fi: devuelve null si no coincide.
  const match = (item: Pick<LiveEndpoint, "mac" | "ip" | "hostname" | "agent">): { exact: boolean } | null => {
    if (looksLikeMac) {
      const itemMac = compactMac(item.mac);
      return itemMac.includes(mac) ? { exact: itemMac === mac } : null;
    }
    const exact =
      item.ip === text || sameText(item.hostname) || sameText(item.agent?.hostname) || sameText(item.agent?.loggedInUser);
    const partial =
      (looksLikeIp && item.ip?.startsWith(text)) ||
      containsText(item.hostname) ||
      containsText(item.agent?.hostname) ||
      containsText(item.agent?.loggedInUser);
    return exact || partial ? { exact } : null;
  };

  for (const endpoint of endpoints) {
    const found = match(endpoint);
    if (found) hits.push({ kind: "endpoint", endpoint, ...found });
  }
  const inTables = new Set(endpoints.map((endpoint) => endpoint.mac));
  for (const client of wifiClients) {
    if (inTables.has(client.mac)) continue;
    const found = match(client);
    if (found) hits.push({ kind: "wifi", client, ...found });
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
