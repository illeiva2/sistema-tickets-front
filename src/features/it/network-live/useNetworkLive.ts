import { useQuery } from "@tanstack/react-query";
import { fetchNetworkLive } from "./api";

// El colector envía cada minuto: leer cada 30 s alcanza para ver el cambio a lo sumo
// medio minuto después de que llega.
const POLL_INTERVAL = 30_000;

export const networkLiveKeys = {
  all: ["it", "network-live"] as const,
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
