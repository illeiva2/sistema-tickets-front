import api from "@/lib/api";
import type {
  ItMaintenance,
  MaintenanceAssetSearchResult,
  MaintenanceListQuery,
  MaintenanceListResult,
  MaintenanceLookups,
  MaintenancePayload,
  MaintenanceUpdatePayload,
} from "./types";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

type MaintenanceResultData =
  | ItMaintenance
  | { maintenance: ItMaintenance }
  | { item: ItMaintenance };

type LookupsResultData =
  | MaintenanceLookups
  | {
      users?: MaintenanceLookups["performers"];
      performers?: MaintenanceLookups["performers"];
      suppliers?: MaintenanceLookups["suppliers"];
      tickets?: MaintenanceLookups["tickets"];
    };

function unwrapMaintenance(data: MaintenanceResultData): ItMaintenance {
  if ("maintenance" in data) return data.maintenance;
  if ("item" in data) return data.item;
  return data;
}

export async function fetchMaintenances(
  query: MaintenanceListQuery,
): Promise<MaintenanceListResult> {
  const response = await api.get<ApiEnvelope<MaintenanceListResult>>(
    "/api/it/maintenances",
    {
      params: {
        q: query.q || undefined,
        type: query.type || undefined,
        status: query.status || undefined,
        assetId: query.assetId || undefined,
        supplierId: query.supplierId || undefined,
        scheduledFrom: query.scheduledFrom || undefined,
        scheduledTo: query.scheduledTo || undefined,
        page: query.page,
        pageSize: query.pageSize,
      },
    },
  );
  return response.data.data;
}

export async function fetchMaintenance(id: string): Promise<ItMaintenance> {
  const response = await api.get<ApiEnvelope<MaintenanceResultData>>(
    `/api/it/maintenances/${id}`,
  );
  return unwrapMaintenance(response.data.data);
}

export async function createMaintenance(
  payload: MaintenancePayload,
): Promise<ItMaintenance> {
  const response = await api.post<ApiEnvelope<MaintenanceResultData>>(
    "/api/it/maintenances",
    payload,
  );
  return unwrapMaintenance(response.data.data);
}

export async function updateMaintenance(
  id: string,
  payload: MaintenanceUpdatePayload,
): Promise<ItMaintenance> {
  const response = await api.patch<ApiEnvelope<MaintenanceResultData>>(
    `/api/it/maintenances/${id}`,
    payload,
  );
  return unwrapMaintenance(response.data.data);
}

export async function fetchMaintenanceLookups(): Promise<MaintenanceLookups> {
  const response = await api.get<ApiEnvelope<LookupsResultData>>(
    "/api/it/maintenances/lookups",
  );
  const data = response.data.data;
  return {
    performers: data.performers ?? ("users" in data ? data.users : []) ?? [],
    suppliers: data.suppliers ?? [],
    tickets: data.tickets ?? [],
  };
}

export async function searchMaintenanceAssets(
  q: string,
): Promise<MaintenanceAssetSearchResult> {
  const response = await api.get<ApiEnvelope<MaintenanceAssetSearchResult>>(
    "/api/it/assets",
    { params: { q, page: 1, pageSize: 20 } },
  );
  return response.data.data;
}

export interface MaintenanceErrorInfo {
  message: string;
  isConflict: boolean;
}

export function getMaintenanceErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return undefined;
  }
  return (error as { response?: { data?: { error?: { code?: string } } } })
    .response?.data?.error?.code;
}

export function getMaintenanceErrorInfo(error: unknown): MaintenanceErrorInfo {
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
    return {
      message:
        response?.data?.error?.message ??
        response?.data?.message ??
        "No se pudo completar la operación de mantenimiento.",
      isConflict:
        response?.status === 409 &&
        response?.data?.error?.code === "MAINTENANCE_VERSION_CONFLICT",
    };
  }

  return {
    message:
      error instanceof Error && error.message
        ? error.message
        : "No se pudo completar la operación de mantenimiento.",
    isConflict: false,
  };
}
