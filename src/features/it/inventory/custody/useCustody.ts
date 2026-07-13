import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { IT_OVERVIEW_QUERY_KEY } from "../../overview/itOverviewApi";
import { assetKeys } from "../useAssets";
import {
  assignAssetCustody,
  fetchCustodyDepartments,
  fetchCustodyPeople,
  returnAssetCustody,
} from "./api";
import type { AssignAssetPayload, ReturnAssetPayload } from "./types";

const custodyKeys = {
  people: ["it", "custody", "people", "active"] as const,
  departments: ["it", "custody", "departments"] as const,
};

interface CustodyMutationInput<TPayload> {
  assetId: string;
  payload: TPayload;
}

export function useCustodyLookups(enabled: boolean) {
  const people = useQuery({
    queryKey: custodyKeys.people,
    queryFn: fetchCustodyPeople,
    enabled,
    staleTime: 5 * 60_000,
  });
  const departments = useQuery({
    queryKey: custodyKeys.departments,
    queryFn: fetchCustodyDepartments,
    enabled,
    staleTime: 5 * 60_000,
  });

  return { people, departments };
}

async function refreshOperationalQueries(
  queryClient: QueryClient,
  assetId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: assetKeys.all }),
    queryClient.invalidateQueries({ queryKey: assetKeys.detail(assetId) }),
    queryClient.invalidateQueries({ queryKey: IT_OVERVIEW_QUERY_KEY }),
  ]);
}

export function useAssignAssetCustody() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assetId,
      payload,
    }: CustodyMutationInput<AssignAssetPayload>) =>
      assignAssetCustody(assetId, payload),
    onSuccess: async (asset) => {
      queryClient.setQueryData(assetKeys.detail(asset.id), asset);
      await refreshOperationalQueries(queryClient, asset.id);
    },
  });
}

export function useReturnAssetCustody() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assetId,
      payload,
    }: CustodyMutationInput<ReturnAssetPayload>) =>
      returnAssetCustody(assetId, payload),
    onSuccess: async (asset) => {
      queryClient.setQueryData(assetKeys.detail(asset.id), asset);
      await refreshOperationalQueries(queryClient, asset.id);
    },
  });
}
