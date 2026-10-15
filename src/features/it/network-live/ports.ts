import type { LiveDevice, LiveNeighbor, LivePort, LivePortPoe } from "./types";

/** Cómo se pinta un puerto en el panel frontal. */
export type PortTone = "up" | "up-fiber" | "slow" | "down" | "disabled";

export function isFiber(kind: string) {
  return kind === "sfp" || kind === "sfpplus";
}

export function portTone(port: LivePort): PortTone {
  if (!port.adminUp) return "disabled";
  if (!port.linkUp) return "down";
  // Un enlace a 10 o 100 Mb/s en un switch gigabit suele ser un cable o una placa con problemas.
  if (port.speedMbps != null && port.speedMbps > 0 && port.speedMbps < 1000) {
    return "slow";
  }
  return isFiber(port.kind) ? "up-fiber" : "up";
}

export const PORT_TONE_LABELS: Record<PortTone, string> = {
  up: "Cobre con enlace",
  "up-fiber": "Fibra con enlace",
  slow: "Enlace a menos de 1 Gb/s",
  down: "Sin enlace",
  disabled: "Deshabilitado",
};

export function formatWatts(watts: number | null | undefined) {
  if (watts == null) return "—";
  return `${watts.toLocaleString("es-AR", { maximumFractionDigits: 1 })} W`;
}

const POE_STATUS_LABELS: Record<string, string> = {
  off: "Sin equipo",
  disabled: "Apagado",
  fault: "Falla",
};

/** "3,6 W · clase 4" si alimenta un equipo; si no, el estado ("Sin equipo", "Apagado", "Falla"). */
export function poeLabel(poe: LivePortPoe) {
  if (poe.status !== "on") return POE_STATUS_LABELS[poe.status] ?? poe.status;
  return [formatWatts(poe.powerW), poe.class != null ? `clase ${poe.class}` : null].filter(Boolean).join(" · ");
}

/** "17,7 W de 390 W" (o sólo lo entregado si el switch no informa la potencia nominal). */
export function poeUsage(poe: { budgetW: number | null; usedW: number | null }) {
  return poe.budgetW != null ? `${formatWatts(poe.usedW)} de ${formatWatts(poe.budgetW)}` : formatWatts(poe.usedW);
}

export function formatSpeed(mbps: number | null | undefined) {
  if (mbps == null || mbps <= 0) return "—";
  if (mbps >= 1000) {
    const gigabits = mbps / 1000;
    return `${gigabits.toLocaleString("es-AR", { maximumFractionDigits: 1 })} Gb/s`;
  }
  return `${mbps} Mb/s`;
}

const ROUTEROS_PORT = /^(ether|combo|sfp-sfpplus|sfpplus|sfp|qsfpplus|qsfp)(\d+)/i;

/**
 * Lo que se lee sobre el puerto en el panel: el número de fábrica en MikroTik ("ether10" → 10,
 * "sfp-sfpplus1" → S1), la posición en los equipos leídos por SNMP.
 */
export function portLabel(port: Pick<LivePort, "key" | "position" | "kind">) {
  const match = ROUTEROS_PORT.exec(port.key);
  if (match) {
    const kind = match[1].toLowerCase();
    if (kind === "ether") return match[2];
    if (kind === "combo") return `C${match[2]}`;
    return `S${match[2]}`;
  }
  return String(port.position);
}

/** Etiqueta de un puerto que aparece en un enlace: del equipo si lo tiene, si no la clave. */
export function linkPortLabel(device: LiveDevice | undefined, key: string) {
  const lag = /^lag(\d+)$/.exec(key);
  if (lag) return `LAG ${lag[1]}`;
  const port = device?.ports.find((candidate) => candidate.key === key);
  if (!port) return key;
  if (device?.source === "routeros") return port.name;
  // Los APs tienen uno o dos puertos: "eth0" dice más que una posición.
  if (device?.role === "ap") return port.key;
  return portLabel(port);
}

export interface PortBlock {
  id: "copper" | "fiber" | "other";
  label: string;
  rows: 1 | 2;
  ports: LivePort[];
}

/**
 * Puertos agrupados como en el frente del equipo: cobre (y combo) por un lado, fibra por otro.
 * Con más de 8 puertos van en dos filas: impares arriba y pares abajo, como en un switch real.
 */
export function portBlocks(ports: LivePort[]): PortBlock[] {
  const byPosition = [...ports].sort(
    (a, b) => a.position - b.position || a.key.localeCompare(b.key),
  );
  const copper = byPosition.filter((port) => port.kind === "copper" || port.kind === "combo");
  const fiber = byPosition.filter((port) => isFiber(port.kind));
  const other = byPosition.filter(
    (port) => port.kind !== "copper" && port.kind !== "combo" && !isFiber(port.kind),
  );
  const blocks: PortBlock[] = [];
  if (copper.length) {
    blocks.push({
      id: "copper",
      label: copper.some((port) => port.kind === "combo") ? "Combo" : "RJ45",
      rows: copper.length > 8 ? 2 : 1,
      ports: copper,
    });
  }
  if (fiber.length) {
    blocks.push({ id: "fiber", label: "SFP", rows: fiber.length > 8 ? 2 : 1, ports: fiber });
  }
  if (other.length) {
    blocks.push({ id: "other", label: "Otros", rows: 1, ports: other });
  }
  return blocks;
}

export function portStats(device: LiveDevice) {
  return {
    total: device.ports.length,
    up: device.ports.filter((port) => port.linkUp).length,
  };
}

export const NEIGHBOR_PROTOCOL_LABELS: Record<string, string> = {
  lldp: "LLDP",
  cdp: "CDP",
  mndp: "MNDP (misma VLAN, no siempre directo)",
  unifi: "UniFi",
  other: "Otro",
};

/** Vecinos directos (LLDP/CDP) primero; MNDP puede ser un equipo de cualquier punto de la VLAN. */
export function sortedNeighbors(neighbors: LiveNeighbor[]) {
  return [...neighbors].sort(
    (a, b) => Number(a.protocol === "mndp") - Number(b.protocol === "mndp"),
  );
}

export function neighborTitle(neighbor: LiveNeighbor) {
  return neighbor.name ?? neighbor.ip ?? neighbor.mac ?? "Equipo sin nombre";
}
