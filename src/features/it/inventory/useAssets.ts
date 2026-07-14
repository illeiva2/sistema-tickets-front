import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAsset, fetchAsset, fetchAssets, updateAsset } from "./api";
import type { AssetListQuery, AssetSaveCommand } from "./types";

export const assetKeys = {
  all: ["it", "assets"] as const,
  list: (query: AssetListQuery) => [...assetKeys.all, "list", query] as const,
  detail: (id: string) => [...assetKeys.all, "detail", id] as const,
};

export function useAssets(query: AssetListQuery) {
  return useQuery({
    queryKey: assetKeys.list(query),
    queryFn: () => fetchAssets(query),
    staleTime: 15_000,
  });
}

export function useAssetDetail(id: string | null) {
  return useQuery({
    queryKey: assetKeys.detail(id ?? "pending"),
    queryFn: () => {
      if (!id) throw new Error("Asset id is required");
      return fetchAsset(id);
    },
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useSaveAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (command: AssetSaveCommand) =>
      command.mode === "edit"
        ? updateAsset(command.id, command.payload)
        : createAsset(command.payload),
    onSuccess: async (asset) => {
      queryClient.setQueryData(assetKeys.detail(asset.id), asset);
      await queryClient.invalidateQueries({ queryKey: assetKeys.all });
      await queryClient.invalidateQueries({
        queryKey: ["it", "procurement", "purchases"],
      });
      await queryClient.invalidateQueries({ queryKey: ["it", "overview"] });
    },
  });
}
