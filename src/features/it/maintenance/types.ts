export const MAINTENANCE_TYPES = [
  "PREVENTIVE",
  "CORRECTIVE",
  "UPGRADE",
] as const;

export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number];

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  PREVENTIVE: "Preventivo",
  CORRECTIVE: "Correctivo",
  UPGRADE: "Upgrade",
};

export const MAINTENANCE_STATUSES = [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  SCHEDULED: "Programado",
  IN_PROGRESS: "En curso",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};

export const MAINTENANCE_CURRENCIES = ["ARS", "USD"] as const;
export type MaintenanceCurrency = (typeof MAINTENANCE_CURRENCIES)[number];

export interface MaintenanceAsset {
  id: string;
  assetTag?: string | null;
  serialNumber?: string | null;
  brand: string;
  model: string;
  type?: string;
  status?: string;
}

export interface MaintenancePerformer {
  id: string;
  name: string;
  email?: string | null;
}

export interface MaintenanceSupplier {
  id: string;
  name: string;
}

export interface MaintenanceTicket {
  id: string;
  title: string;
  ticketNumber?: string | number | null;
  status?: string;
}

export interface MaintenancePart {
  name: string;
  quantity: number;
  unitCost?: string | number | null;
}

export interface MaintenancePartPayload {
  name: string;
  quantity: number;
  unitCost?: string | null;
}

export interface ItMaintenance {
  id: string;
  assetId: string;
  asset: MaintenanceAsset;
  type: MaintenanceType;
  status: MaintenanceStatus;
  scheduledAt?: string | null;
  performedAt?: string | null;
  description: string;
  performedById?: string | null;
  performedBy?: MaintenancePerformer | null;
  supplierId?: string | null;
  supplier?: MaintenanceSupplier | null;
  costAmount?: string | number | null;
  currency: MaintenanceCurrency;
  parts?: MaintenancePart[] | null;
  ticketId?: string | null;
  ticket?: MaintenanceTicket | null;
  createdAt?: string;
  updatedAt: string;
}

export interface MaintenancePagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface MaintenanceListResult {
  items: ItMaintenance[];
  pagination: MaintenancePagination;
}

export interface MaintenanceListQuery {
  q: string;
  type: MaintenanceType | "";
  status: MaintenanceStatus | "";
  assetId: string;
  supplierId: string;
  scheduledFrom: string;
  scheduledTo: string;
  page: number;
  pageSize: number;
}

export interface MaintenanceLookups {
  performers: MaintenancePerformer[];
  suppliers: MaintenanceSupplier[];
  tickets: MaintenanceTicket[];
}

export interface MaintenancePayload {
  assetId: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  scheduledAt?: string | null;
  performedAt?: string | null;
  description: string;
  performedById?: string | null;
  supplierId?: string | null;
  costAmount?: string | null;
  currency: MaintenanceCurrency;
  parts: MaintenancePartPayload[];
  ticketId?: string | null;
}

export interface MaintenanceUpdatePayload extends MaintenancePayload {
  expectedUpdatedAt: string;
}

export type MaintenanceSaveCommand =
  | { mode: "create"; payload: MaintenancePayload }
  | { mode: "edit"; id: string; payload: MaintenanceUpdatePayload };

export interface MaintenanceAssetSearchResult {
  items: MaintenanceAsset[];
  pagination?: MaintenancePagination;
}
