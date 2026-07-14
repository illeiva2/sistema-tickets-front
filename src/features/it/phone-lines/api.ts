import api from "@/lib/api";
import type {
  PhoneLine,
  PhoneLineAsset,
  PhoneLineAssignPayload,
  PhoneLineCreatePayload,
  PhoneLineListQuery,
  PhoneLineListResult,
  PhoneLinePerson,
  PhoneLineReturnPayload,
  PhoneLineUpdatePayload,
  PhoneSimChange,
  SimChangeCreatePayload,
  SimChangeListResult,
} from "./types";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

type PhoneLineResult =
  | PhoneLine
  | { phoneLine: PhoneLine }
  | { item: PhoneLine };

type SimChangeResult =
  | PhoneSimChange
  | { simChange: PhoneSimChange }
  | { item: PhoneSimChange };

interface ListEnvelope<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

function normalizePhoneLine(line: PhoneLine): PhoneLine {
  const legacy = line as PhoneLine & {
    currentHolder?: PhoneLinePerson | null;
    assignedAsset?: PhoneLineAsset | null;
  };
  return {
    ...line,
    holder: line.holder ?? legacy.currentHolder ?? null,
    asset: line.asset ?? legacy.assignedAsset ?? null,
  };
}

function unwrapPhoneLine(data: PhoneLineResult): PhoneLine {
  if ("phoneLine" in data) return normalizePhoneLine(data.phoneLine);
  if ("item" in data) return normalizePhoneLine(data.item);
  return normalizePhoneLine(data);
}

function unwrapSimChange(data: SimChangeResult): PhoneSimChange {
  if ("simChange" in data) return data.simChange;
  if ("item" in data) return data.item;
  return data;
}

export async function fetchPhoneLines(
  query: PhoneLineListQuery,
): Promise<PhoneLineListResult> {
  const response = await api.get<ApiEnvelope<PhoneLineListResult>>(
    "/api/it/phone-lines",
    {
      params: {
        q: query.q || undefined,
        status: query.status || undefined,
        carrier: query.carrier || undefined,
        page: query.page,
        pageSize: query.pageSize,
      },
    },
  );
  return {
    ...response.data.data,
    items: response.data.data.items.map(normalizePhoneLine),
  };
}

export async function fetchPhoneLine(id: string): Promise<PhoneLine> {
  const response = await api.get<ApiEnvelope<PhoneLineResult>>(
    `/api/it/phone-lines/${id}`,
  );
  return unwrapPhoneLine(response.data.data);
}

export async function createPhoneLine(
  payload: PhoneLineCreatePayload,
): Promise<PhoneLine> {
  const response = await api.post<ApiEnvelope<PhoneLineResult>>(
    "/api/it/phone-lines",
    payload,
  );
  return unwrapPhoneLine(response.data.data);
}

export async function updatePhoneLine(
  id: string,
  payload: PhoneLineUpdatePayload,
): Promise<PhoneLine> {
  const response = await api.patch<ApiEnvelope<PhoneLineResult>>(
    `/api/it/phone-lines/${id}`,
    payload,
  );
  return unwrapPhoneLine(response.data.data);
}

export async function deletePhoneLine(
  id: string,
  expectedUpdatedAt: string,
): Promise<void> {
  await api.delete(`/api/it/phone-lines/${id}`, {
    data: { expectedUpdatedAt },
  });
}

export async function assignPhoneLine(
  id: string,
  payload: PhoneLineAssignPayload,
): Promise<PhoneLine> {
  const response = await api.post<ApiEnvelope<PhoneLineResult>>(
    `/api/it/phone-lines/${id}/assign`,
    payload,
  );
  return unwrapPhoneLine(response.data.data);
}

export async function returnPhoneLine(
  id: string,
  payload: PhoneLineReturnPayload,
): Promise<PhoneLine> {
  const response = await api.post<ApiEnvelope<PhoneLineResult>>(
    `/api/it/phone-lines/${id}/return`,
    payload,
  );
  return unwrapPhoneLine(response.data.data);
}

export async function fetchSimChanges(
  id: string,
  page = 1,
  pageSize = 25,
): Promise<SimChangeListResult> {
  const response = await api.get<ApiEnvelope<SimChangeListResult>>(
    `/api/it/phone-lines/${id}/sim-changes`,
    { params: { page, pageSize } },
  );
  return response.data.data;
}

export async function createSimChange(
  id: string,
  payload: SimChangeCreatePayload,
): Promise<PhoneSimChange> {
  const response = await api.post<ApiEnvelope<SimChangeResult>>(
    `/api/it/phone-lines/${id}/sim-changes`,
    payload,
  );
  return unwrapSimChange(response.data.data);
}

export async function fetchPhoneLinePeople(): Promise<PhoneLinePerson[]> {
  const response = await api.get<ApiEnvelope<ListEnvelope<PhoneLinePerson>>>(
    "/api/it/people",
    { params: { status: "ACTIVE", page: 1, pageSize: 100 } },
  );
  return response.data.data.items;
}

export async function fetchPhoneAssets(): Promise<PhoneLineAsset[]> {
  const response = await api.get<ApiEnvelope<ListEnvelope<PhoneLineAsset>>>(
    "/api/it/assets",
    { params: { type: "PHONE", page: 1, pageSize: 100 } },
  );
  return response.data.data.items;
}

export interface PhoneLineErrorInfo {
  message: string;
  isConflict: boolean;
}

export function getPhoneLineErrorInfo(error: unknown): PhoneLineErrorInfo {
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
        "No se pudo completar la operación sobre la línea.",
      isConflict: response?.status === 409,
    };
  }
  return {
    message:
      error instanceof Error && error.message
        ? error.message
        : "No se pudo completar la operación sobre la línea.",
    isConflict: false,
  };
}
