export const PURCHASE_STATUSES = [
  "REQUESTED",
  "APPROVED",
  "ORDERED",
  "RECEIVED",
  "CANCELLED",
] as const;

export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  REQUESTED: "Solicitada",
  APPROVED: "Autorizada",
  ORDERED: "Pedida",
  RECEIVED: "Recibida",
  CANCELLED: "Cancelada",
};

export const PURCHASE_CURRENCIES = ["ARS", "USD"] as const;
export type PurchaseCurrency = (typeof PURCHASE_CURRENCIES)[number];

export interface ProcurementUser {
  id: string;
  name: string;
  email?: string;
}

export interface SupplierPreview {
  id: string;
  name: string;
  categories?: string[];
  isActive?: boolean;
}

export interface Supplier extends SupplierPreview {
  cuit?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  categories: string[];
  notes?: string | null;
  isActive: boolean;
  purchasesCount?: number;
  activePurchasesCount?: number;
  maintenancesCount?: number;
  createdAt?: string;
  updatedAt: string;
}

export interface LinkedAsset {
  id: string;
  assetTag?: string | null;
  serialNumber?: string | null;
  brand?: string;
  model?: string;
  type?: string;
  status?: string;
}

export interface PurchaseItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string | number;
  linkedAssets?: LinkedAsset[];
  linkedAssetsCount?: number;
  remainingQuantity?: number;
}

export interface Purchase {
  id: string;
  purchaseNumber: number | string;
  status: PurchaseStatus;
  supplierId?: string | null;
  supplier?: SupplierPreview | null;
  currency: PurchaseCurrency;
  totalAmount: string | number;
  exchangeRate?: string | number | null;
  justification: string;
  invoiceNumber?: string | null;
  notes?: string | null;
  requestedById: string;
  requestedBy: ProcurementUser;
  authorizedById?: string | null;
  authorizedBy?: ProcurementUser | null;
  authorizedAt?: string | null;
  orderedAt?: string | null;
  receivedAt?: string | null;
  items: PurchaseItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PurchaseListResult {
  items: Purchase[];
  pagination: Pagination;
}

export interface SupplierListResult {
  items: Supplier[];
  pagination: Pagination;
}

export interface PurchaseListQuery {
  q: string;
  status: PurchaseStatus | "";
  supplierId: string;
  currency: PurchaseCurrency | "";
  page: number;
  pageSize: number;
}

export interface SupplierListQuery {
  q: string;
  category: string;
  isActive: "" | "true" | "false";
  page: number;
  pageSize: number;
}

export interface ProcurementLookups {
  suppliers: Array<SupplierPreview & { categories: string[] }>;
}

export interface PurchaseItemPayload {
  description: string;
  quantity: number;
  unitPrice: string;
}

export interface PurchasePayload {
  supplierId?: string | null;
  currency: PurchaseCurrency;
  exchangeRate?: string | null;
  justification: string;
  invoiceNumber?: string | null;
  notes?: string | null;
  items: PurchaseItemPayload[];
}

export interface PurchaseUpdatePayload extends PurchasePayload {
  expectedUpdatedAt: string;
}

export type PurchaseSaveCommand =
  | { mode: "create"; payload: PurchasePayload }
  | { mode: "edit"; id: string; payload: PurchaseUpdatePayload };

export type PurchaseTransition = "approve" | "order" | "receive" | "cancel";

export interface PurchaseTransitionCommand {
  id: string;
  transition: PurchaseTransition;
  expectedUpdatedAt: string;
  reason?: string;
}

export interface SupplierCreatePayload {
  name: string;
  cuit?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  categories: string[];
  notes?: string | null;
}

export interface SupplierUpdatePayload extends SupplierCreatePayload {
  isActive: boolean;
  expectedUpdatedAt: string;
}

export type SupplierSaveCommand =
  | { mode: "create"; payload: SupplierCreatePayload }
  | { mode: "edit"; id: string; payload: SupplierUpdatePayload };
