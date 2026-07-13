import api from "@/lib/api";
import type {
  DeviceListQuery,
  DevicePayload,
  LayoutCommand,
  LinkListQuery,
  LinkPayload,
  ListResult,
  NetworkDevice,
  NetworkLink,
  NetworkLookups,
  NetworkSite,
  SaveCommand,
  SitePayload,
  TopologyView,
  TopologyViewPayload,
} from "./types";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

type Named<T> =
  | T
  | { item: T }
  | { device: T }
  | { link: T }
  | { site: T }
  | { view: T };

function unwrap<T>(data: Named<T>): T {
  if (typeof data === "object" && data !== null) {
    if ("item" in data) return data.item;
    if ("device" in data) return data.device;
    if ("link" in data) return data.link;
    if ("site" in data) return data.site;
    if ("view" in data) return data.view;
  }
  return data as T;
}

function normalizeList<T>(data: ListResult<T> | T[]): ListResult<T> {
  if (Array.isArray(data)) {
    return {
      items: data,
      pagination: {
        page: 1,
        pageSize: data.length || 25,
        total: data.length,
        totalPages: 1,
      },
    };
  }
  return data;
}

export async function fetchNetworkLookups(): Promise<NetworkLookups> {
  const response = await api.get<ApiEnvelope<Partial<NetworkLookups>>>(
    "/api/it/network/lookups",
  );
  return {
    sites: response.data.data.sites ?? [],
    devices: response.data.data.devices ?? [],
    assets: response.data.data.assets ?? [],
  };
}

export async function fetchSites(): Promise<NetworkSite[]> {
  const response = await api.get<
    ApiEnvelope<NetworkSite[] | ListResult<NetworkSite>>
  >("/api/it/network/sites");
  return Array.isArray(response.data.data)
    ? response.data.data
    : response.data.data.items;
}

export async function fetchDevices(
  query: DeviceListQuery,
): Promise<ListResult<NetworkDevice>> {
  const response = await api.get<
    ApiEnvelope<ListResult<NetworkDevice> | NetworkDevice[]>
  >("/api/it/network/devices", {
    params: {
      q: query.q || undefined,
      siteId: query.siteId || undefined,
      type: query.type || undefined,
      status: query.status || undefined,
      page: query.page,
      pageSize: query.pageSize,
    },
  });
  return normalizeList(response.data.data);
}

export async function fetchDevice(id: string): Promise<NetworkDevice> {
  const response = await api.get<ApiEnvelope<Named<NetworkDevice>>>(
    `/api/it/network/devices/${id}`,
  );
  return unwrap(response.data.data);
}

export async function saveDevice(
  command: SaveCommand<DevicePayload>,
): Promise<NetworkDevice> {
  const response =
    command.mode === "create"
      ? await api.post<ApiEnvelope<Named<NetworkDevice>>>(
          "/api/it/network/devices",
          command.payload,
        )
      : await api.patch<ApiEnvelope<Named<NetworkDevice>>>(
          `/api/it/network/devices/${command.id}`,
          command.payload,
        );
  return unwrap(response.data.data);
}

export async function fetchLinks(
  query: LinkListQuery,
): Promise<ListResult<NetworkLink>> {
  const response = await api.get<
    ApiEnvelope<ListResult<NetworkLink> | NetworkLink[]>
  >("/api/it/network/links", {
    params: {
      q: query.q || undefined,
      siteId: query.siteId || undefined,
      type: query.type || undefined,
      page: query.page,
      pageSize: query.pageSize,
    },
  });
  return normalizeList(response.data.data);
}

export async function fetchLink(id: string): Promise<NetworkLink> {
  const response = await api.get<ApiEnvelope<Named<NetworkLink>>>(
    `/api/it/network/links/${id}`,
  );
  return unwrap(response.data.data);
}

export async function saveLink(
  command: SaveCommand<LinkPayload>,
): Promise<NetworkLink> {
  const response =
    command.mode === "create"
      ? await api.post<ApiEnvelope<Named<NetworkLink>>>(
          "/api/it/network/links",
          command.payload,
        )
      : await api.patch<ApiEnvelope<Named<NetworkLink>>>(
          `/api/it/network/links/${command.id}`,
          command.payload,
        );
  return unwrap(response.data.data);
}

export async function removeLink(
  id: string,
  expectedUpdatedAt: string,
): Promise<void> {
  await api.delete(`/api/it/network/links/${id}`, {
    data: { expectedUpdatedAt },
  });
}

export async function saveSite(
  command: SaveCommand<SitePayload>,
): Promise<NetworkSite> {
  const response =
    command.mode === "create"
      ? await api.post<ApiEnvelope<Named<NetworkSite>>>(
          "/api/it/network/sites",
          command.payload,
        )
      : await api.patch<ApiEnvelope<Named<NetworkSite>>>(
          `/api/it/network/sites/${command.id}`,
          command.payload,
        );
  return unwrap(response.data.data);
}

export async function fetchTopologyViews(): Promise<ListResult<TopologyView>> {
  const response = await api.get<
    ApiEnvelope<ListResult<TopologyView> | TopologyView[]>
  >("/api/it/network/topology-views");
  return normalizeList(response.data.data);
}

export async function fetchTopologyView(id: string): Promise<TopologyView> {
  const response = await api.get<ApiEnvelope<Named<TopologyView>>>(
    `/api/it/network/topology-views/${id}`,
  );
  return unwrap(response.data.data);
}

export async function saveTopologyView(
  command: SaveCommand<TopologyViewPayload>,
): Promise<TopologyView> {
  const response =
    command.mode === "create"
      ? await api.post<ApiEnvelope<Named<TopologyView>>>(
          "/api/it/network/topology-views",
          command.payload,
        )
      : await api.patch<ApiEnvelope<Named<TopologyView>>>(
          `/api/it/network/topology-views/${command.id}`,
          command.payload,
        );
  return unwrap(response.data.data);
}

export async function saveTopologyLayout(
  command: LayoutCommand,
): Promise<TopologyView> {
  const response = await api.put<ApiEnvelope<Named<TopologyView>>>(
    `/api/it/network/topology-views/${command.id}/layout`,
    command.payload,
  );
  return unwrap(response.data.data);
}

export interface NetworkErrorInfo {
  message: string;
  isConflict: boolean;
}

export function getNetworkErrorInfo(error: unknown): NetworkErrorInfo {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as {
        response?: {
          status?: number;
          data?: {
            error?: { code?: string; message?: string };
            message?: string;
          };
        };
      }
    ).response;
    const code = response?.data?.error?.code ?? "";
    return {
      message:
        response?.data?.error?.message ??
        response?.data?.message ??
        "No se pudo completar la operación de red.",
      isConflict: response?.status === 409 && code.includes("VERSION_CONFLICT"),
    };
  }
  return {
    message:
      error instanceof Error && error.message
        ? error.message
        : "No se pudo completar la operación de red.",
    isConflict: false,
  };
}
