// Forma de GET /api/it/network/live (sistema-tickets-back, NetworkLiveService.liveView).

export type LiveRole = "router" | "core" | "access" | "ap";
export type LiveSource = "routeros" | "snmp" | "unifi";
/** Derivado en el back por edad: "stale" = sin noticias del colector hace rato. */
export type LiveStatus = "ok" | "down" | "stale";
export type LivePortKind =
  | "copper"
  | "sfp"
  | "sfpplus"
  | "combo"
  | "wireless"
  | "other";

export interface LiveNeighbor {
  protocol: "lldp" | "mndp" | "cdp" | "unifi" | "other" | string;
  name: string | null;
  mac: string | null;
  ip: string | null;
  port: string | null;
  platform: string | null;
}

export interface LivePort {
  key: string;
  name: string;
  description: string | null;
  position: number;
  kind: LivePortKind | string;
  adminUp: boolean;
  linkUp: boolean;
  speedMbps: number | null;
  fullDuplex: boolean | null;
  pvid: number | null;
  neighbors: LiveNeighbor[];
  linkChangedAt: string | null;
}

export interface LiveDevice {
  id: string;
  collector: string;
  key: string;
  source: LiveSource | string;
  role: LiveRole | string;
  name: string;
  managementIp: string | null;
  macAddress: string | null;
  vendor: string | null;
  model: string | null;
  firmware: string | null;
  serialNumber: string | null;
  uptimeSeconds: number | null;
  clients: number | null;
  status: LiveStatus;
  lastError: string | null;
  lastPolledAt: string;
  lastOkAt: string | null;
  ports: LivePort[];
}

export interface LiveLinkEnd {
  deviceId: string;
  ports: string[];
}

export interface LiveLink {
  id: string;
  a: LiveLinkEnd;
  b: LiveLinkEnd;
  /** lldp = conexión confirmada por el vecino; fdb = deducida de las tablas MAC. */
  source: "lldp" | "fdb" | string;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface LiveCollector {
  slug: string;
  version: string | null;
  host: string | null;
  lastReceivedAt: string;
  devicesTotal: number;
  devicesOk: number;
  stale: boolean;
}

export interface NetworkLiveView {
  generatedAt: string;
  collectors: LiveCollector[];
  devices: LiveDevice[];
  links: LiveLink[];
}
