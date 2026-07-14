import { useQuery } from "@tanstack/react-query";
import { getItOverview, IT_OVERVIEW_QUERY_KEY } from "./itOverviewApi";

const OVERVIEW_REFRESH_INTERVAL_MS = 60_000;

export function useItOverview() {
  return useQuery({
    queryKey: IT_OVERVIEW_QUERY_KEY,
    queryFn: getItOverview,
    staleTime: 30_000,
    refetchInterval: OVERVIEW_REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}
