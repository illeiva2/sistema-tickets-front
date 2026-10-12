import api from "@/lib/api";
import type { NetworkLiveView } from "./types";

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
    devices: data.devices ?? [],
    links: data.links ?? [],
  };
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
