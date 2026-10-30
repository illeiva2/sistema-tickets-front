import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { assetKeys } from "@/features/it/inventory/useAssets";
import {
  createDeviceAsset,
  fetchAssetNetworkLocation,
  fetchNetworkEvents,
  fetchNetworkLive,
  linkDeviceAsset,
  searchNetworkLive,
  setDeviceAlertsMuted,
} from "./api";
import type { LiveDeviceAssetDraft, LiveEventsQuery } from "./types";

// El colector envía cada minuto: leer cada 30 s alcanza para ver el cambio a lo sumo
// medio minuto después de que llega.
const POLL_INTERVAL = 30_000;
// El historial cambia al ritmo de los envíos; con un minuto alcanza.
const EVENTS_POLL_INTERVAL = 60_000;

export const networkLiveKeys = {
  all: ["it", "network-live"] as const,
  search: (query: string) => ["it", "network-live", "search", query] as const,
  events: (query: LiveEventsQuery) => ["it", "network-live", "events", query] as const,
  asset: (assetId: string) => ["it", "network-live", "asset", assetId] as const,
};

export function useNetworkLive(paused: boolean) {
  return useQuery({
    queryKey: networkLiveKeys.all,
    queryFn: fetchNetworkLive,
    staleTime: 10_000,
    refetchInterval: paused ? false : POLL_INTERVAL,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: !paused,
    refetchOnReconnect: !paused,
  });
}

/** Búsqueda en el historial (incluye lo que ya no está conectado). Sólo corre al confirmar la búsqueda. */
export function useNetworkLiveSearch(query: string | null) {
  return useQuery({
    queryKey: networkLiveKeys.search(query ?? ""),
    queryFn: () => searchNetworkLive(query ?? ""),
    enabled: query !== null && query.length >= 2,
    staleTime: 30_000,
  });
}

/** Ficha del inventario: dónde está conectado el equipo. Se relee como la vista (cada 30 s). */
export function useAssetNetworkLocation(assetId: string | null) {
  return useQuery({
    queryKey: networkLiveKeys.asset(assetId ?? "pending"),
    queryFn: () => fetchAssetNetworkLocation(assetId ?? ""),
    enabled: Boolean(assetId),
    staleTime: 10_000,
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
  });
}

/** Historial de la red (todo, o de un equipo o un puerto). */
export function useNetworkEvents(query: LiveEventsQuery, options: { enabled?: boolean; paused?: boolean } = {}) {
  const { enabled = true, paused = false } = options;
  return useQuery({
    queryKey: networkLiveKeys.events(query),
    queryFn: () => fetchNetworkEvents(query),
    enabled,
    staleTime: 20_000,
    refetchInterval: paused ? false : EVENTS_POLL_INTERVAL,
    refetchIntervalInBackground: false,
    placeholderData: (previous) => previous,
  });
}

/** Silenciar o reactivar las alertas de un equipo; refresca la vista para ver el cambio. */
export function useMuteDeviceAlerts() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ deviceId, muted }: { deviceId: string; muted: boolean }) => setDeviceAlertsMuted(deviceId, muted),
    onSuccess: () => client.invalidateQueries({ queryKey: networkLiveKeys.all }),
  });
}

/** Después de vincular o dar de alta: la vista, la ficha ("En la red") y el inventario. */
const refreshDeviceAsset = (client: QueryClient) =>
  Promise.all([
    client.invalidateQueries({ queryKey: networkLiveKeys.all }),
    client.invalidateQueries({ queryKey: assetKeys.all }),
    client.invalidateQueries({ queryKey: ["it", "overview"] }),
  ]);

/** Vincular (o desvincular, con null) la ficha del inventario de un router, switch o AP. */
export function useLinkDeviceAsset() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ deviceId, assetId }: { deviceId: string; assetId: string | null }) =>
      linkDeviceAsset(deviceId, assetId),
    onSuccess: () => refreshDeviceAsset(client),
  });
}

/** Dar de alta en el inventario un router, switch o AP, ya vinculado. */
export function useCreateDeviceAsset() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ deviceId, asset }: { deviceId: string; asset: LiveDeviceAssetDraft }) =>
      createDeviceAsset(deviceId, asset),
    onSuccess: () => refreshDeviceAsset(client),
  });
}
