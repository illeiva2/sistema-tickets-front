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

/** PC con el agente de inventario que corresponde a un equipo final (por MAC o IP reciente). */
export interface LiveAgentRef {
  id: string;
  hostname: string;
  loggedInUser: string | null;
  assetId: string | null;
}

/** Equipo final (PC, impresora, cámara, teléfono, cliente Wi-Fi) en su puerto de acceso. */
export interface LiveEndpoint {
  mac: string;
  deviceId: string;
  portKey: string;
  vlan: number | null;
  ip: string | null;
  /** Nombre que pidió por DHCP. */
  hostname: string | null;
  /** AP por el que se conecta, si es un cliente Wi-Fi. */
  viaDeviceId: string | null;
  /** El puerto tiene varios equipos detrás (switch sin gestión, DVR…). */
  shared: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  movedAt: string | null;
  agent: LiveAgentRef | null;
}

export interface NetworkLiveView {
  generatedAt: string;
  collectors: LiveCollector[];
  devices: LiveDevice[];
  links: LiveLink[];
  endpoints: LiveEndpoint[];
}

export interface LiveSearchResult extends LiveEndpoint {
  deviceName: string;
  deviceRole: string;
  /** false = no se lo ve hace más de 10 min: es dónde estuvo la última vez. */
  online: boolean;
}

export interface LiveSearchResponse {
  query: string;
  results: LiveSearchResult[];
}
