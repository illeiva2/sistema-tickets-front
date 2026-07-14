import api from "@/lib/api";
import type {
  ProcurementLookups,
  Purchase,
  PurchaseListQuery,
  PurchaseListResult,
  PurchasePayload,
  PurchaseTransition,
  PurchaseUpdatePayload,
  Supplier,
  SupplierListQuery,
  SupplierListResult,
  SupplierCreatePayload,
  SupplierUpdatePayload,
} from "./types";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

type PurchaseData = Purchase | { purchase: Purchase } | { item: Purchase };
type SupplierData = Supplier | { supplier: Supplier } | { item: Supplier };

function unwrapPurchase(data: PurchaseData): Purchase {
  if ("purchase" in data) return data.purchase;
  if ("item" in data) return data.item;
  return data;
}

function unwrapSupplier(data: SupplierData): Supplier {
  if ("supplier" in data) return data.supplier;
  if ("item" in data) return data.item;
  return data;
}

export async function fetchPurchases(
  query: PurchaseListQuery,
): Promise<PurchaseListResult> {
  const response = await api.get<ApiEnvelope<PurchaseListResult>>(
    "/api/it/purchases",
    {
      params: {
        q: query.q || undefined,
        status: query.status || undefined,
        supplierId: query.supplierId || undefined,
        currency: query.currency || undefined,
        page: query.page,
        pageSize: query.pageSize,
      },
    },
  );
  return response.data.data;
}

export async function fetchPurchase(id: string): Promise<Purchase> {
  const response = await api.get<ApiEnvelope<PurchaseData>>(
    `/api/it/purchases/${id}`,
  );
  return unwrapPurchase(response.data.data);
}

export async function createPurchase(payload: PurchasePayload) {
  const response = await api.post<ApiEnvelope<PurchaseData>>(
    "/api/it/purchases",
    payload,
  );
  return unwrapPurchase(response.data.data);
}

export async function updatePurchase(
  id: string,
  payload: PurchaseUpdatePayload,
) {
  const response = await api.patch<ApiEnvelope<PurchaseData>>(
    `/api/it/purchases/${id}`,
    payload,
  );
  return unwrapPurchase(response.data.data);
}

export async function transitionPurchase(
  id: string,
  transition: PurchaseTransition,
  expectedUpdatedAt: string,
  reason?: string,
) {
  const response = await api.post<ApiEnvelope<PurchaseData>>(
    `/api/it/purchases/${id}/${transition}`,
    transition === "cancel"
      ? { expectedUpdatedAt, reason }
      : { expectedUpdatedAt },
  );
  return unwrapPurchase(response.data.data);
}

export async function fetchProcurementLookups(): Promise<ProcurementLookups> {
  const response = await api.get<ApiEnvelope<ProcurementLookups>>(
    "/api/it/purchases/lookups",
  );
  return { suppliers: response.data.data.suppliers ?? [] };
}

export async function fetchSuppliers(
  query: SupplierListQuery,
): Promise<SupplierListResult> {
  const response = await api.get<ApiEnvelope<SupplierListResult>>(
    "/api/it/suppliers",
    {
      params: {
        q: query.q || undefined,
        category: query.category || undefined,
        isActive: query.isActive || undefined,
        page: query.page,
        pageSize: query.pageSize,
      },
    },
  );
  return response.data.data;
}

export async function fetchSupplier(id: string): Promise<Supplier> {
  const response = await api.get<ApiEnvelope<SupplierData>>(
    `/api/it/suppliers/${id}`,
  );
  return unwrapSupplier(response.data.data);
}

export async function createSupplier(payload: SupplierCreatePayload) {
  const response = await api.post<ApiEnvelope<SupplierData>>(
    "/api/it/suppliers",
    payload,
  );
  return unwrapSupplier(response.data.data);
}

export async function updateSupplier(
  id: string,
  payload: SupplierUpdatePayload,
) {
  const response = await api.patch<ApiEnvelope<SupplierData>>(
    `/api/it/suppliers/${id}`,
    payload,
  );
  return unwrapSupplier(response.data.data);
}

export interface ProcurementErrorInfo {
  message: string;
  isPurchaseConflict: boolean;
  isSupplierConflict: boolean;
}

export function getProcurementErrorInfo(error: unknown): ProcurementErrorInfo {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as {
        response?: {
          status?: number;
          data?: {
            error?: { code?: string; message?: string };
            message?: string;
          };
        };
      }
    ).response;
    const code = response?.data?.error?.code;
    return {
      message:
        response?.data?.error?.message ??
        response?.data?.message ??
        "No se pudo completar la operación de compras.",
      isPurchaseConflict:
        response?.status === 409 && code === "PURCHASE_VERSION_CONFLICT",
      isSupplierConflict:
        response?.status === 409 && code === "SUPPLIER_VERSION_CONFLICT",
    };
  }
  return {
    message:
      error instanceof Error && error.message
        ? error.message
        : "No se pudo completar la operación de compras.",
    isPurchaseConflict: false,
    isSupplierConflict: false,
  };
}
