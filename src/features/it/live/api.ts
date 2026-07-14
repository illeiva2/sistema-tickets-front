import api from "@/lib/api";
import type {
  AssetCreatePayload,
  ItAsset,
} from "@/features/it/inventory/types";
import type { AssignAssetPayload } from "@/features/it/inventory/custody/types";
import type {
  AgentDevice,
  AgentDeviceListQuery,
  AgentDeviceListResult,
  AgentEnrollmentToken,
  AgentEnrollmentTokenResult,
  AgentInventorySnapshot,
  AgentLookups,
  AgentMetricSample,
  EnrollmentTokenPayload,
  Pagination,
  RemoteProtocol,
  RemoteSession,
  RemoteSessionStartResult,
} from "./types";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}
type DeviceData = AgentDevice | { device: AgentDevice };
type SessionData = RemoteSession | { session: RemoteSession };

function unwrapDevice(data: DeviceData) {
  return "device" in data ? data.device : data;
}

function unwrapSession(data: SessionData) {
  return "session" in data ? data.session : data;
}

export async function fetchAgentLookups(): Promise<AgentLookups> {
  const response = await api.get<ApiEnvelope<AgentLookups>>(
    "/api/it/agents/lookups",
  );
  return { assets: response.data.data.assets ?? [] };
}

export async function fetchAgentDevices(
  query: AgentDeviceListQuery,
): Promise<AgentDeviceListResult> {
  const response = await api.get<ApiEnvelope<AgentDeviceListResult>>(
    "/api/it/agents/devices",
    {
      params: {
        q: query.q || undefined,
        state: query.state || undefined,
        isActive: query.isActive || undefined,
        page: query.page,
        pageSize: query.pageSize,
      },
    },
  );
  return response.data.data;
}

export async function fetchAgentDevice(id: string): Promise<AgentDevice> {
  const response = await api.get<ApiEnvelope<DeviceData>>(
    `/api/it/agents/devices/${id}`,
  );
  return unwrapDevice(response.data.data);
}

export async function fetchAgentMetrics(
  id: string,
): Promise<AgentMetricSample[]> {
  const response = await api.get<ApiEnvelope<{ items: AgentMetricSample[] }>>(
    `/api/it/agents/devices/${id}/metrics`,
  );
  return response.data.data.items ?? [];
}

export async function fetchAgentSnapshots(
  id: string,
): Promise<{ items: AgentInventorySnapshot[]; pagination: Pagination }> {
  const response = await api.get<
    ApiEnvelope<{ items: AgentInventorySnapshot[]; pagination: Pagination }>
  >(`/api/it/agents/devices/${id}/snapshots`, {
    params: { page: 1, pageSize: 10 },
  });
  return response.data.data;
}

export async function updateAgentAsset(
  id: string,
  expectedUpdatedAt: string,
  assetId: string | null,
): Promise<AgentDevice> {
  const response = await api.patch<ApiEnvelope<DeviceData>>(
    `/api/it/agents/devices/${id}`,
    { expectedUpdatedAt, assetId },
  );
  return unwrapDevice(response.data.data);
}

export interface RegisterAgentAssetPayload {
  expectedUpdatedAt: string;
  asset: AssetCreatePayload;
  custody?: AssignAssetPayload;
}

export interface RegisterAgentAssetResult {
  device: AgentDevice;
  asset: ItAsset;
}

export async function registerAgentAsset(
  id: string,
  payload: RegisterAgentAssetPayload,
): Promise<RegisterAgentAssetResult> {
  const response = await api.post<ApiEnvelope<RegisterAgentAssetResult>>(
    `/api/it/agents/devices/${id}/register-asset`,
    payload,
  );
  return response.data.data;
}

export async function transitionAgentDevice(
  id: string,
  action: "activate" | "revoke",
  expectedUpdatedAt: string,
): Promise<AgentDevice> {
  const response = await api.post<ApiEnvelope<DeviceData>>(
    `/api/it/agents/devices/${id}/${action}`,
    { expectedUpdatedAt },
  );
  return unwrapDevice(response.data.data);
}

export async function fetchEnrollmentTokens(): Promise<AgentEnrollmentToken[]> {
  const response = await api.get<
    ApiEnvelope<{ items: AgentEnrollmentToken[] }>
  >("/api/it/agents/enrollment-tokens");
  return response.data.data.items ?? [];
}

export async function createEnrollmentToken(
  payload: EnrollmentTokenPayload,
): Promise<AgentEnrollmentTokenResult> {
  const response = await api.post<ApiEnvelope<AgentEnrollmentTokenResult>>(
    "/api/it/agents/enrollment-tokens",
    payload,
  );
  return response.data.data;
}

export async function revokeEnrollmentToken(id: string): Promise<void> {
  await api.post(`/api/it/agents/enrollment-tokens/${id}/revoke`);
}

export async function startRemoteSession(
  deviceId: string,
  protocol: RemoteProtocol,
): Promise<RemoteSessionStartResult> {
  const response = await api.post<ApiEnvelope<RemoteSessionStartResult>>(
    `/api/it/agents/devices/${deviceId}/remote-sessions`,
    { protocol },
  );
  return response.data.data;
}

export async function closeRemoteSession(id: string): Promise<RemoteSession> {
  const response = await api.post<ApiEnvelope<SessionData>>(
    `/api/it/agents/remote-sessions/${id}/close`,
  );
  return unwrapSession(response.data.data);
}

export interface AgentErrorInfo {
  message: string;
  isConflict: boolean;
  code?: string;
}

export function getAgentErrorInfo(error: unknown): AgentErrorInfo {
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
        "No se pudo completar la operación sobre el agente.",
      isConflict:
        response?.status === 409 && code === "AGENT_DEVICE_VERSION_CONFLICT",
      code,
    };
  }
  return {
    message:
      error instanceof Error && error.message
        ? error.message
        : "No se pudo completar la operación sobre el agente.",
    isConflict: false,
  };
}
