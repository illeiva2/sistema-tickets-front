import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  assignPhoneLine,
  createPhoneLine,
  createSimChange,
  deletePhoneLine,
  fetchPhoneAssets,
  fetchPhoneLine,
  fetchPhoneLinePeople,
  fetchPhoneLines,
  fetchSimChanges,
  returnPhoneLine,
  updatePhoneLine,
} from "./api";
import type {
  PhoneLineAssignPayload,
  PhoneLineListQuery,
  PhoneLineReturnPayload,
  PhoneLineSaveCommand,
  SimChangeCreatePayload,
} from "./types";

export const phoneLineKeys = {
  all: ["it", "phone-lines"] as const,
  list: (query: PhoneLineListQuery) =>
    [...phoneLineKeys.all, "list", query] as const,
  detail: (id: string) => [...phoneLineKeys.all, "detail", id] as const,
  simChanges: (id: string) =>
    [...phoneLineKeys.detail(id), "sim-changes"] as const,
  people: ["it", "phone-lines", "options", "people"] as const,
  assets: ["it", "phone-lines", "options", "assets"] as const,
};

function useRefreshPhoneLines() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    if (id) {
      void queryClient.invalidateQueries({
        queryKey: phoneLineKeys.detail(id),
      });
    }
    void queryClient.invalidateQueries({ queryKey: phoneLineKeys.all });
    void queryClient.invalidateQueries({ queryKey: ["it", "overview"] });
  };
}

export function usePhoneLines(query: PhoneLineListQuery) {
  return useQuery({
    queryKey: phoneLineKeys.list(query),
    queryFn: () => fetchPhoneLines(query),
    staleTime: 15_000,
  });
}

export function usePhoneLineDetail(id: string | null) {
  return useQuery({
    queryKey: phoneLineKeys.detail(id ?? "pending"),
    queryFn: () => {
      if (!id) throw new Error("Phone line id is required");
      return fetchPhoneLine(id);
    },
    enabled: Boolean(id),
    staleTime: 15_000,
  });
}

export function useSavePhoneLine() {
  const queryClient = useQueryClient();
  const refresh = useRefreshPhoneLines();
  return useMutation({
    mutationFn: (command: PhoneLineSaveCommand) =>
      command.mode === "edit"
        ? updatePhoneLine(command.id, command.payload)
        : createPhoneLine(command.payload),
    onSuccess: (line) => {
      queryClient.setQueryData(phoneLineKeys.detail(line.id), line);
      refresh(line.id);
    },
  });
}

export function useDeletePhoneLine() {
  const queryClient = useQueryClient();
  const refresh = useRefreshPhoneLines();
  return useMutation({
    mutationFn: ({
      id,
      expectedUpdatedAt,
    }: {
      id: string;
      expectedUpdatedAt: string;
    }) => deletePhoneLine(id, expectedUpdatedAt),
    onSuccess: (_, variables) => {
      queryClient.removeQueries({
        queryKey: phoneLineKeys.detail(variables.id),
      });
      refresh();
    },
  });
}

export function useAssignPhoneLine(id: string) {
  const queryClient = useQueryClient();
  const refresh = useRefreshPhoneLines();
  return useMutation({
    mutationFn: (payload: PhoneLineAssignPayload) =>
      assignPhoneLine(id, payload),
    onSuccess: (line) => {
      queryClient.setQueryData(phoneLineKeys.detail(id), line);
      refresh(id);
    },
  });
}

export function useReturnPhoneLine(id: string) {
  const queryClient = useQueryClient();
  const refresh = useRefreshPhoneLines();
  return useMutation({
    mutationFn: (payload: PhoneLineReturnPayload) =>
      returnPhoneLine(id, payload),
    onSuccess: (line) => {
      queryClient.setQueryData(phoneLineKeys.detail(id), line);
      refresh(id);
    },
  });
}

export function usePhoneLineSimChanges(id: string) {
  return useInfiniteQuery({
    queryKey: phoneLineKeys.simChanges(id),
    queryFn: ({ pageParam }) => fetchSimChanges(id, pageParam, 25),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
    enabled: Boolean(id),
    staleTime: 15_000,
  });
}

export function useCreateSimChange(id: string) {
  const queryClient = useQueryClient();
  const refresh = useRefreshPhoneLines();
  return useMutation({
    mutationFn: (payload: SimChangeCreatePayload) =>
      createSimChange(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: phoneLineKeys.simChanges(id),
      });
      refresh(id);
    },
  });
}

export function usePhoneLinePeople(enabled: boolean) {
  return useQuery({
    queryKey: phoneLineKeys.people,
    queryFn: fetchPhoneLinePeople,
    enabled,
    staleTime: 60_000,
  });
}

export function usePhoneAssets(enabled: boolean) {
  return useQuery({
    queryKey: phoneLineKeys.assets,
    queryFn: fetchPhoneAssets,
    enabled,
    staleTime: 60_000,
  });
}
