import api from "@/lib/api";
import type {
  AssetListQuery,
  AssetListResult,
  AssetCreatePayload,
  AssetUpdatePayload,
  ItAsset,
} from "./types";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

type AssetResultData = ItAsset | { asset: ItAsset } | { item: ItAsset };

function unwrapAsset(data: AssetResultData): ItAsset {
  if ("asset" in data) return data.asset;
  if ("item" in data) return data.item;
  return data;
}

export async function fetchAssets(
  query: AssetListQuery,
): Promise<AssetListResult> {
  const response = await api.get<ApiEnvelope<AssetListResult>>(
    "/api/it/assets",
    {
      params: {
        q: query.q || undefined,
        type: query.type || undefined,
        status: query.status || undefined,
        page: query.page,
        pageSize: query.pageSize,
      },
    },
  );

  return response.data.data;
}

export async function fetchAsset(id: string): Promise<ItAsset> {
  const response = await api.get<ApiEnvelope<AssetResultData>>(
    `/api/it/assets/${id}`,
  );
  return unwrapAsset(response.data.data);
}

export async function createAsset(
  payload: AssetCreatePayload,
): Promise<ItAsset> {
  const response = await api.post<ApiEnvelope<AssetResultData>>(
    "/api/it/assets",
    payload,
  );
  return unwrapAsset(response.data.data);
}

export async function updateAsset(
  id: string,
  payload: AssetUpdatePayload,
): Promise<ItAsset> {
  const response = await api.patch<ApiEnvelope<AssetResultData>>(
    `/api/it/assets/${id}`,
    payload,
  );
  return unwrapAsset(response.data.data);
}

export function getInventoryErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as {
        response?: {
          data?: { error?: { message?: string }; message?: string };
        };
      }
    ).response;
    const apiMessage =
      response?.data?.error?.message ?? response?.data?.message;
    if (apiMessage) return apiMessage;
  }

  if (error instanceof Error && error.message) return error.message;
  return "No se pudo completar la operación de inventario.";
}
