import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closeRemoteSession,
  createEnrollmentToken,
  fetchAgentDevice,
  fetchAgentDevices,
  fetchAgentLookups,
  fetchAgentMetrics,
  fetchAgentSnapshots,
  fetchEnrollmentTokens,
  revokeEnrollmentToken,
  registerAgentAsset,
  startRemoteSession,
  transitionAgentDevice,
  updateAgentAsset,
} from "./api";
import type { RegisterAgentAssetPayload } from "./api";
import { assetKeys } from "../inventory/useAssets";
import type {
  AgentDeviceListQuery,
  EnrollmentTokenPayload,
  RemoteProtocol,
} from "./types";

const POLL_INTERVAL = 30_000;

export const liveDeviceKeys = {
  all: ["it", "live-devices"] as const,
  devices: ["it", "live-devices", "devices"] as const,
  list: (query: AgentDeviceListQuery) =>
    [...liveDeviceKeys.devices, "list", query] as const,
  fleet: ["it", "live-devices", "fleet"] as const,
  detail: (id: string) => [...liveDeviceKeys.devices, "detail", id] as const,
  metrics: (id: string) => [...liveDeviceKeys.devices, "metrics", id] as const,
  snapshots: (id: string) =>
    [...liveDeviceKeys.devices, "snapshots", id] as const,
  lookups: ["it", "live-devices", "lookups"] as const,
  tokens: ["it", "live-devices", "tokens"] as const,
};

export function useAgentDevices(query: AgentDeviceListQuery, paused: boolean) {
  return useQuery({
    queryKey: liveDeviceKeys.list(query),
    queryFn: () => fetchAgentDevices(query),
    staleTime: 10_000,
    refetchInterval: paused ? false : POLL_INTERVAL,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: !paused,
    refetchOnReconnect: !paused,
  });
}

export function useAgentFleet(paused: boolean) {
  const query: AgentDeviceListQuery = {
    q: "",
    state: "",
    isActive: "",
    page: 1,
    pageSize: 100,
  };
  return useQuery({
    queryKey: liveDeviceKeys.fleet,
    queryFn: () => fetchAgentDevices(query),
    staleTime: 10_000,
    refetchInterval: paused ? false : POLL_INTERVAL,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: !paused,
    refetchOnReconnect: !paused,
  });
}

export function useAgentDeviceDetail(id: string | null, paused: boolean) {
  return useQuery({
    queryKey: liveDeviceKeys.detail(id ?? "pending"),
    queryFn: () => {
      if (!id) throw new Error("Agent device id is required");
      return fetchAgentDevice(id);
    },
    enabled: Boolean(id),
    staleTime: 10_000,
    refetchInterval: id && !paused ? POLL_INTERVAL : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: !paused,
    refetchOnReconnect: !paused,
  });
}

export function useAgentMetrics(id: string | null, paused: boolean) {
  return useQuery({
    queryKey: liveDeviceKeys.metrics(id ?? "pending"),
    queryFn: () => {
      if (!id) throw new Error("Agent device id is required");
      return fetchAgentMetrics(id);
    },
    enabled: Boolean(id),
    staleTime: 30_000,
    refetchInterval: id && !paused ? 60_000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: !paused,
    refetchOnReconnect: !paused,
  });
}

export function useAgentSnapshots(id: string | null) {
  return useQuery({
    queryKey: liveDeviceKeys.snapshots(id ?? "pending"),
    queryFn: () => {
      if (!id) throw new Error("Agent device id is required");
      return fetchAgentSnapshots(id);
    },
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useAgentLookups() {
  return useQuery({
    queryKey: liveDeviceKeys.lookups,
    queryFn: fetchAgentLookups,
    staleTime: 60_000,
  });
}

export function useEnrollmentTokens(enabled: boolean) {
  return useQuery({
    queryKey: liveDeviceKeys.tokens,
    queryFn: fetchEnrollmentTokens,
    enabled,
    staleTime: 30_000,
  });
}

function invalidateFleet(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: liveDeviceKeys.devices });
  void queryClient.invalidateQueries({ queryKey: liveDeviceKeys.fleet });
  void queryClient.invalidateQueries({ queryKey: ["it", "overview"] });
}

export function useUpdateAgentAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      expectedUpdatedAt,
      assetId,
    }: {
      id: string;
      expectedUpdatedAt: string;
      assetId: string | null;
    }) => updateAgentAsset(id, expectedUpdatedAt, assetId),
    onSuccess: (device) => {
      queryClient.setQueryData(liveDeviceKeys.detail(device.id), device);
      invalidateFleet(queryClient);
      void queryClient.invalidateQueries({ queryKey: liveDeviceKeys.lookups });
    },
  });
}

export function useRegisterAgentAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      deviceId,
      payload,
    }: {
      deviceId: string;
      payload: RegisterAgentAssetPayload;
    }) => registerAgentAsset(deviceId, payload),
    onSuccess: ({ device, asset }) => {
      queryClient.setQueryData(liveDeviceKeys.detail(device.id), device);
      queryClient.setQueryData(assetKeys.detail(asset.id), asset);
      invalidateFleet(queryClient);
      void queryClient.invalidateQueries({ queryKey: liveDeviceKeys.lookups });
      void queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}

export function useTransitionAgentDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      expectedUpdatedAt,
    }: {
      id: string;
      action: "activate" | "revoke";
      expectedUpdatedAt: string;
    }) => transitionAgentDevice(id, action, expectedUpdatedAt),
    onSuccess: (device) => {
      queryClient.setQueryData(liveDeviceKeys.detail(device.id), device);
      invalidateFleet(queryClient);
    },
  });
}

export function useCreateEnrollmentToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EnrollmentTokenPayload) =>
      createEnrollmentToken(payload),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: liveDeviceKeys.tokens }),
  });
}

export function useRevokeEnrollmentToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokeEnrollmentToken(id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: liveDeviceKeys.tokens }),
  });
}

export function useStartRemoteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      deviceId,
      protocol,
    }: {
      deviceId: string;
      protocol: RemoteProtocol;
    }) => startRemoteSession(deviceId, protocol),
    onSuccess: (_result, variables) =>
      void queryClient.invalidateQueries({
        queryKey: liveDeviceKeys.detail(variables.deviceId),
      }),
  });
}

export function useCloseRemoteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId }: { sessionId: string; deviceId: string }) =>
      closeRemoteSession(sessionId),
    onSuccess: (_result, variables) =>
      void queryClient.invalidateQueries({
        queryKey: liveDeviceKeys.detail(variables.deviceId),
      }),
  });
}
