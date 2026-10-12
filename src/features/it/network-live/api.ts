import api from "@/lib/api";
import type {
  LiveDevice,
  LiveEventsQuery,
  LiveEventsResponse,
  LiveSearchResponse,
  NetworkLiveView,
} from "./types";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export async function fetchNetworkLive(): Promise<NetworkLiveView> {
  const response = await api.get<ApiEnvelope<NetworkLiveView>>(
    "/api/it/network/live",
  );
  const data = response.data.data;
  return {
    generatedAt: data.generatedAt,
    collectors: data.collectors ?? [],
    devices: (data.devices ?? []).map((device) => ({ ...device, alertsMuted: device.alertsMuted ?? false })),
    links: data.links ?? [],
    endpoints: data.endpoints ?? [],
    wifiClients: data.wifiClients ?? [],
    alerts: data.alerts ?? [],
  };
}

/** "¿Dónde está X?" en el historial: también lo que ya no está conectado. */
export async function searchNetworkLive(query: string): Promise<LiveSearchResponse> {
  const response = await api.get<ApiEnvelope<LiveSearchResponse>>(
    "/api/it/network/live/search",
    { params: { q: query } },
  );
  return {
    query: response.data.data.query,
    results: response.data.data.results ?? [],
  };
}

/** Historial: lo más nuevo primero; filtrando por equipo también trae lo del otro lado. */
export async function fetchNetworkEvents(query: LiveEventsQuery): Promise<LiveEventsResponse> {
  const { kinds, ...rest } = query;
  const response = await api.get<ApiEnvelope<LiveEventsResponse>>(
    "/api/it/network/live/events",
    { params: { ...rest, ...(kinds?.length ? { kinds: kinds.join(",") } : {}) } },
  );
  return {
    events: response.data.data.events ?? [],
    hasMore: Boolean(response.data.data.hasMore),
  };
}

/** Silenciar (o volver a escuchar) las alertas de un equipo. Sólo ADMIN. */
export async function setDeviceAlertsMuted(deviceId: string, muted: boolean) {
  const response = await api.patch<ApiEnvelope<Pick<LiveDevice, "id" | "name" | "alertsMuted">>>(
    `/api/it/network/live/devices/${encodeURIComponent(deviceId)}/alerts`,
    { muted },
  );
  return response.data.data;
}

export function getNetworkLiveErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as {
        response?: { data?: { error?: { message?: string } } };
      }
    ).response;
    if (response?.data?.error?.message) return response.data.error.message;
  }
  return error instanceof Error && error.message
    ? error.message
    : "No se pudo leer el estado de la red.";
}
