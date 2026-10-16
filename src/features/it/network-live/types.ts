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
  /** PoE (colector 0.4+): si el puerto alimenta un equipo, cuánto entrega y su clase. */
  poe?: LivePortPoe | null;
}

export interface LivePortPoe {
  /** on = entrega; off = habilitado sin equipo; disabled = apagado a mano; fault = falla. */
  status: "on" | "off" | "disabled" | "fault" | string;
  powerW: number | null;
  class: number | null;
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
  /** Sin avisos aunque se caiga (lo decide un ADMIN). */
  alertsMuted: boolean;
  /** Switches PoE: potencia nominal y la que está entregando, en W. */
  poe?: { budgetW: number | null; usedW: number | null } | null;
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

/** Incidente avisado que sigue abierto: equipo caído o colector sin mandar datos. */
export interface LiveAlert {
  id: string;
  kind: "device_down" | "collector_silent" | string;
  deviceId: string | null;
  openedAt: string;
  lastNotifiedAt: string | null;
  ticketId: string | null;
  detail: string | null;
}

/** Cliente Wi-Fi según el controlador UniFi (se actualiza cada 5 min). Sin invitados. */
export interface LiveWifiClient {
  mac: string;
  apDeviceId: string;
  ssid: string | null;
  /** "2.4", "5" o "6" (GHz). */
  band: string | null;
  channel: number | null;
  /** dBm: -50 es muy buena, -80 mala. */
  signal: number | null;
  txKbps: number | null;
  rxKbps: number | null;
  /** Hace cuánto está asociado al AP. */
  uptimeSeconds: number | null;
  hostname: string | null;
  ip: string | null;
  vlan: number | null;
  firstSeenAt: string;
  lastSeenAt: string;
  agent: LiveAgentRef | null;
}

export interface NetworkLiveView {
  generatedAt: string;
  collectors: LiveCollector[];
  devices: LiveDevice[];
  links: LiveLink[];
  endpoints: LiveEndpoint[];
  wifiClients: LiveWifiClient[];
  alerts: LiveAlert[];
}

export type LiveEventKind =
  | "device_new"
  | "device_down"
  | "device_up"
  | "device_restart"
  | "port_down"
  | "port_up"
  | "port_speed"
  | "link_new"
  | "endpoint_new"
  | "endpoint_moved"
  | "collector_silent"
  | "collector_back";

/** Algo que cambió en la red (GET /api/it/network/live/events). */
export interface LiveEvent {
  id: string;
  at: string;
  kind: LiveEventKind | string;
  deviceId: string | null;
  portKey: string | null;
  macAddress: string | null;
  /** Enlace nuevo: el equipo de enfrente. Equipo final que se mudó: de dónde venía. */
  peerDeviceId: string | null;
  peerPortKey: string | null;
  detail: Record<string, unknown> | null;
  endpoint: { ip: string | null; hostname: string | null; agent: LiveAgentRef | null } | null;
}

export interface LiveEventsQuery {
  since?: string;
  deviceId?: string;
  portKey?: string;
  mac?: string;
  kinds?: LiveEventKind[];
  limit?: number;
}

export interface LiveEventsResponse {
  events: LiveEvent[];
  hasMore: boolean;
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
