import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchDevice,
  fetchDevices,
  fetchLink,
  fetchLinks,
  fetchNetworkLookups,
  fetchSite,
  fetchSites,
  fetchTopologyView,
  fetchTopologyViews,
  removeLink,
  saveDevice,
  saveLink,
  saveSite,
  saveTopologyLayout,
  saveTopologyView,
} from "./api";
import type {
  DeviceListQuery,
  DevicePayload,
  LayoutCommand,
  LinkListQuery,
  LinkPayload,
  SaveCommand,
  SitePayload,
  TopologyView,
  TopologyViewPayload,
} from "./types";

export const networkKeys = {
  all: ["it", "network"] as const,
  lookups: ["it", "network", "lookups"] as const,
  sites: ["it", "network", "sites"] as const,
  siteDetail: (id: string) => [...networkKeys.sites, "detail", id] as const,
  devices: ["it", "network", "devices"] as const,
  deviceList: (query: DeviceListQuery) =>
    [...networkKeys.devices, "list", query] as const,
  deviceDetail: (id: string) => [...networkKeys.devices, "detail", id] as const,
  links: ["it", "network", "links"] as const,
  linkList: (query: LinkListQuery) =>
    [...networkKeys.links, "list", query] as const,
  linkDetail: (id: string) => [...networkKeys.links, "detail", id] as const,
  views: ["it", "network", "topology-views"] as const,
  viewDetail: (id: string) => [...networkKeys.views, "detail", id] as const,
};

function invalidateNetwork(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: networkKeys.all });
  void queryClient.invalidateQueries({ queryKey: ["it", "overview"] });
}

export function useNetworkLookups() {
  return useQuery({
    queryKey: networkKeys.lookups,
    queryFn: fetchNetworkLookups,
    staleTime: 60_000,
  });
}

export function useSites() {
  return useQuery({
    queryKey: networkKeys.sites,
    queryFn: fetchSites,
    staleTime: 60_000,
  });
}

export function useSiteDetail(id: string | null) {
  return useQuery({
    queryKey: networkKeys.siteDetail(id ?? "pending"),
    queryFn: () => {
      if (!id) throw new Error("Site id is required");
      return fetchSite(id);
    },
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useDevices(query: DeviceListQuery) {
  return useQuery({
    queryKey: networkKeys.deviceList(query),
    queryFn: () => fetchDevices(query),
    staleTime: 15_000,
  });
}

export function useDeviceDetail(id: string | null) {
  return useQuery({
    queryKey: networkKeys.deviceDetail(id ?? "pending"),
    queryFn: () => {
      if (!id) throw new Error("Device id is required");
      return fetchDevice(id);
    },
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useSaveDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: SaveCommand<DevicePayload>) => saveDevice(command),
    onSuccess: (device) => {
      queryClient.setQueryData(networkKeys.deviceDetail(device.id), device);
      invalidateNetwork(queryClient);
    },
  });
}

export function useLinks(query: LinkListQuery) {
  return useQuery({
    queryKey: networkKeys.linkList(query),
    queryFn: () => fetchLinks(query),
    staleTime: 15_000,
  });
}

export function useLinkDetail(id: string | null) {
  return useQuery({
    queryKey: networkKeys.linkDetail(id ?? "pending"),
    queryFn: () => {
      if (!id) throw new Error("Link id is required");
      return fetchLink(id);
    },
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useSaveLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: SaveCommand<LinkPayload>) => saveLink(command),
    onSuccess: (link) => {
      queryClient.setQueryData(networkKeys.linkDetail(link.id), link);
      invalidateNetwork(queryClient);
    },
  });
}

export function useRemoveLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      expectedUpdatedAt,
    }: {
      id: string;
      expectedUpdatedAt: string;
    }) => removeLink(id, expectedUpdatedAt),
    onSuccess: () => invalidateNetwork(queryClient),
  });
}

export function useSaveSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: SaveCommand<SitePayload>) => saveSite(command),
    onSuccess: () => invalidateNetwork(queryClient),
  });
}

export function useTopologyViews() {
  return useQuery({
    queryKey: networkKeys.views,
    queryFn: fetchTopologyViews,
    staleTime: 30_000,
  });
}

export function useTopologyView(id: string | null) {
  return useQuery({
    queryKey: networkKeys.viewDetail(id ?? "pending"),
    queryFn: () => {
      if (!id) throw new Error("Topology view id is required");
      return fetchTopologyView(id);
    },
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useSaveTopologyView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: SaveCommand<TopologyViewPayload>) =>
      saveTopologyView(command),
    onSuccess: (view) => {
      void queryClient.invalidateQueries({
        queryKey: networkKeys.viewDetail(view.id),
      });
      invalidateNetwork(queryClient);
    },
  });
}

export function useSaveTopologyLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: LayoutCommand) => saveTopologyLayout(command),
    onSuccess: (view) => {
      queryClient.setQueryData<TopologyView>(
        networkKeys.viewDetail(view.id),
        (current) => ({
          ...current,
          ...view,
          devices: view.devices ?? current?.devices,
          links: view.links ?? current?.links,
          nodes: view.nodes ?? current?.nodes,
        }),
      );
      void queryClient.invalidateQueries({ queryKey: networkKeys.views });
    },
  });
}
