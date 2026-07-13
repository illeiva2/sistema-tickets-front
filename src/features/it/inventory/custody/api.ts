import api from "@/lib/api";
import type { ItAsset } from "../types";
import type {
  AssignAssetPayload,
  CustodyDepartment,
  CustodyPeopleResult,
  ReturnAssetPayload,
} from "./types";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

type AssetMutationData = ItAsset | { asset: ItAsset } | { item: ItAsset };

function unwrapAsset(data: AssetMutationData): ItAsset {
  if ("asset" in data) return data.asset;
  if ("item" in data) return data.item;
  return data;
}

export async function fetchCustodyPeople(): Promise<CustodyPeopleResult> {
  const response = await api.get<ApiEnvelope<CustodyPeopleResult>>(
    "/api/it/people",
    { params: { status: "ACTIVE", pageSize: 100 } },
  );
  return response.data.data;
}

export async function fetchCustodyDepartments(): Promise<CustodyDepartment[]> {
  const response =
    await api.get<ApiEnvelope<CustodyDepartment[]>>("/api/departments");
  return response.data.data;
}

export async function assignAssetCustody(
  assetId: string,
  payload: AssignAssetPayload,
): Promise<ItAsset> {
  const response = await api.post<ApiEnvelope<AssetMutationData>>(
    `/api/it/assets/${assetId}/assign`,
    payload,
  );
  return unwrapAsset(response.data.data);
}

export async function returnAssetCustody(
  assetId: string,
  payload: ReturnAssetPayload,
): Promise<ItAsset> {
  const response = await api.post<ApiEnvelope<AssetMutationData>>(
    `/api/it/assets/${assetId}/return`,
    payload,
  );
  return unwrapAsset(response.data.data);
}
