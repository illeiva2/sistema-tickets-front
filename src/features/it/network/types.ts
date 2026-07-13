export const NETWORK_DEVICE_TYPES = [
  "ROUTER",
  "SWITCH",
  "ACCESS_POINT",
  "FIREWALL",
  "SERVER",
  "NAS",
  "PRINTER",
  "CAMERA",
  "UPS",
  "OTHER",
] as const;

export type NetworkDeviceType = (typeof NETWORK_DEVICE_TYPES)[number];

export const NETWORK_DEVICE_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "MAINTENANCE",
  "RETIRED",
] as const;

export type NetworkDeviceStatus = (typeof NETWORK_DEVICE_STATUSES)[number];

export const NETWORK_LINK_TYPES = [
  "ETHERNET",
  "FIBER",
  "WIFI",
  "WAN",
  "VPN",
  "VIRTUAL",
  "OTHER",
] as const;

export type NetworkLinkType = (typeof NETWORK_LINK_TYPES)[number];

export const DEVICE_TYPE_LABELS: Record<NetworkDeviceType, string> = {
  ROUTER: "Router",
  SWITCH: "Switch",
  ACCESS_POINT: "Access point",
  FIREWALL: "Firewall",
  SERVER: "Servidor",
  NAS: "NAS",
  PRINTER: "Impresora",
  CAMERA: "Cámara",
  UPS: "UPS",
  OTHER: "Otro",
};

export const DEVICE_STATUS_LABELS: Record<NetworkDeviceStatus, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  MAINTENANCE: "Mantenimiento",
  RETIRED: "Retirado",
};

export const LINK_TYPE_LABELS: Record<NetworkLinkType, string> = {
  ETHERNET: "Ethernet",
  FIBER: "Fibra",
  WIFI: "Wi-Fi",
  WAN: "WAN",
  VPN: "VPN",
  VIRTUAL: "Virtual",
  OTHER: "Otro",
};

export interface NetworkSite {
  id: string;
  name: string;
  slug?: string;
  address?: string | null;
  description?: string | null;
  isActive: boolean;
  devicesCount?: number;
  topologyViewsCount?: number;
  createdAt?: string;
  updatedAt: string;
}

export interface NetworkAssetLookup {
  id: string;
  label?: string;
  assetTag?: string | null;
  serialNumber?: string | null;
  brand?: string;
  model?: string;
}

export interface NetworkDeviceSummary {
  id: string;
  name: string;
  type: NetworkDeviceType;
  status: NetworkDeviceStatus;
  managementIp?: string | null;
  siteId: string;
  site?: Pick<NetworkSite, "id" | "name">;
  isActive?: boolean;
}

export interface NetworkDevice extends NetworkDeviceSummary {
  macAddress?: string | null;
  vlans: string[];
  location?: string | null;
  adminUrl?: string | null;
  notes?: string | null;
  secretsRef?: string | null;
  assetId?: string | null;
  asset?: NetworkAssetLookup | null;
  linksCount?: number;
  createdAt?: string;
  updatedAt: string;
}

export interface NetworkLink {
  id: string;
  deviceAId: string;
  deviceBId: string;
  deviceA: NetworkDeviceSummary;
  deviceB: NetworkDeviceSummary;
  portA?: string | null;
  portB?: string | null;
  type: NetworkLinkType;
  vlans: string[];
  speedMbps?: number | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt: string;
}

export interface TopologyNodePosition {
  deviceId: string;
  x: number;
  y: number;
  device?: NetworkDeviceSummary;
}

export interface TopologyViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface TopologyView {
  id: string;
  name: string;
  description?: string | null;
  siteId?: string | null;
  site?: Pick<NetworkSite, "id" | "name"> | null;
  isDefault: boolean;
  viewport?: TopologyViewport | null;
  nodes?: TopologyNodePosition[];
  devices?: NetworkDeviceSummary[];
  links?: NetworkLink[];
  createdAt?: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListResult<T> {
  items: T[];
  pagination: Pagination;
}

export interface NetworkLookups {
  sites: NetworkSite[];
  devices: NetworkDeviceSummary[];
  assets: NetworkAssetLookup[];
}

export interface DeviceListQuery {
  q: string;
  siteId: string;
  type: NetworkDeviceType | "";
  status: NetworkDeviceStatus | "";
  page: number;
  pageSize: number;
}

export interface LinkListQuery {
  q: string;
  siteId: string;
  type: NetworkLinkType | "";
  page: number;
  pageSize: number;
}

export interface DevicePayload {
  name: string;
  type: NetworkDeviceType;
  status: NetworkDeviceStatus;
  siteId: string;
  managementIp?: string | null;
  macAddress?: string | null;
  vlans: string[];
  location?: string | null;
  adminUrl?: string | null;
  notes?: string | null;
  secretsRef?: string | null;
  assetId?: string | null;
}

export interface LinkPayload {
  deviceAId: string;
  deviceBId: string;
  portA?: string | null;
  portB?: string | null;
  type: NetworkLinkType;
  vlans: string[];
  speedMbps?: number | null;
  notes?: string | null;
}

export interface SitePayload {
  name: string;
  slug?: string;
  address?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface TopologyViewPayload {
  name: string;
  description?: string | null;
  siteId?: string | null;
  isDefault: boolean;
}

export type SaveCommand<T> =
  | { mode: "create"; payload: T }
  | { mode: "edit"; id: string; payload: T & { expectedUpdatedAt: string } };

export interface LayoutCommand {
  id: string;
  payload: {
    expectedUpdatedAt: string;
    nodes: TopologyNodePosition[];
    viewport?: TopologyViewport | null;
  };
}
