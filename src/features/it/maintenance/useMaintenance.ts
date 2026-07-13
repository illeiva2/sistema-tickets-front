import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { assetKeys } from "@/features/it/inventory/useAssets";
import {
  createMaintenance,
  fetchMaintenance,
  fetchMaintenanceLookups,
  fetchMaintenances,
  searchMaintenanceAssets,
  updateMaintenance,
} from "./api";
import type { MaintenanceListQuery, MaintenanceSaveCommand } from "./types";

export const maintenanceKeys = {
  all: ["it", "maintenances"] as const,
  list: (query: MaintenanceListQuery) =>
    [...maintenanceKeys.all, "list", query] as const,
  detail: (id: string) => [...maintenanceKeys.all, "detail", id] as const,
  lookups: ["it", "maintenances", "lookups"] as const,
  assetSearch: (q: string) =>
    ["it", "maintenances", "asset-search", q] as const,
};

export function useMaintenances(query: MaintenanceListQuery) {
  return useQuery({
    queryKey: maintenanceKeys.list(query),
    queryFn: () => fetchMaintenances(query),
    staleTime: 15_000,
  });
}

export function useMaintenanceDetail(id: string | null) {
  return useQuery({
    queryKey: maintenanceKeys.detail(id ?? "pending"),
    queryFn: () => {
      if (!id) throw new Error("Maintenance id is required");
      return fetchMaintenance(id);
    },
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useMaintenanceLookups(enabled = true) {
  return useQuery({
    queryKey: maintenanceKeys.lookups,
    queryFn: fetchMaintenanceLookups,
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useMaintenanceAssetSearch(q: string, enabled: boolean) {
  return useQuery({
    queryKey: maintenanceKeys.assetSearch(q),
    queryFn: () => searchMaintenanceAssets(q),
    enabled,
    staleTime: 30_000,
  });
}

export function useSaveMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: MaintenanceSaveCommand) =>
      command.mode === "edit"
        ? updateMaintenance(command.id, command.payload)
        : createMaintenance(command.payload),
    onSuccess: (maintenance) => {
      queryClient.setQueryData(
        maintenanceKeys.detail(maintenance.id),
        maintenance,
      );
      void queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
      void queryClient.invalidateQueries({ queryKey: assetKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["it", "overview"] });
    },
  });
}
