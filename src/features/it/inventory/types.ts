export const ASSET_TYPES = [
  "DESKTOP",
  "NOTEBOOK",
  "PHONE",
  "TABLET",
  "MONITOR",
  "PRINTER",
  "PERIPHERAL",
  "NETWORK_DEVICE",
  "SERVER",
  "OTHER",
] as const;

export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_STATUSES = [
  "IN_STOCK",
  "ASSIGNED",
  "IN_REPAIR",
  "RETIRED",
  "LOST",
] as const;

export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  DESKTOP: "PC de escritorio",
  NOTEBOOK: "Notebook",
  PHONE: "Celular",
  TABLET: "Tablet",
  MONITOR: "Monitor",
  PRINTER: "Impresora",
  PERIPHERAL: "Periférico",
  NETWORK_DEVICE: "Dispositivo de red",
  SERVER: "Servidor",
  OTHER: "Otro",
};

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  IN_STOCK: "En depósito",
  ASSIGNED: "Asignado",
  IN_REPAIR: "En reparación",
  RETIRED: "Dado de baja",
  LOST: "Extraviado",
};

export interface AssetSpecs {
  [key: string]: unknown;
  cpu?: string;
  ramGb?: number;
  storage?: string;
  os?: string;
  imei?: string;
  mac?: string;
}

export interface ItAsset {
  id: string;
  type: AssetType;
  status: AssetStatus;
  brand: string;
  model: string;
  serialNumber?: string | null;
  assetTag?: string | null;
  location?: string | null;
  warrantyUntil?: string | null;
  notes?: string | null;
  specs?: AssetSpecs | null;
  createdAt?: string;
  updatedAt: string;
}

export interface AssetPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AssetListResult {
  items: ItAsset[];
  pagination: AssetPagination;
}

export interface AssetListQuery {
  q: string;
  type: AssetType | "";
  status: AssetStatus | "";
  page: number;
  pageSize: number;
}

export interface AssetCreatePayload {
  type: AssetType;
  status: AssetStatus;
  brand: string;
  model: string;
  serialNumber?: string | null;
  assetTag?: string | null;
  location?: string | null;
  warrantyUntil?: string | null;
  notes?: string | null;
  specs?: AssetSpecs | null;
}

export interface AssetUpdatePayload extends AssetCreatePayload {
  expectedUpdatedAt: string;
}

export type AssetSaveCommand =
  | { mode: "create"; payload: AssetCreatePayload }
  | { mode: "edit"; id: string; payload: AssetUpdatePayload };
