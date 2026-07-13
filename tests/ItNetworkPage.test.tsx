import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const authMock = vi.hoisted(() => ({
  role: "ADMIN" as "ADMIN" | "AGENT" | "USER",
}));
vi.mock("../src/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "it-1",
      name: "IT",
      email: "it@grf.com.ar",
      role: authMock.role,
    },
    isLoading: false,
  }),
}));

import api from "../src/lib/api";
import type {
  NetworkDevice,
  NetworkLink,
  NetworkSite,
  TopologyView,
} from "../src/features/it/network/types";
import { networkKeys } from "../src/features/it/network/useNetwork";
import ItNetworkPage from "../src/pages/it/ItNetworkPage";

const apiMock = api as unknown as Record<
  "get" | "post" | "patch" | "put" | "delete",
  ReturnType<typeof vi.fn>
>;
const site: NetworkSite = {
  id: "site-1",
  name: "Casa Central",
  slug: "casa-central",
  address: "CABA",
  isActive: true,
  devicesCount: 2,
  updatedAt: "2026-07-12T10:00:00.000Z",
};
const device: NetworkDevice = {
  id: "device-1",
  name: "Core-SW-01",
  type: "SWITCH",
  status: "ACTIVE",
  siteId: site.id,
  site: { id: site.id, name: site.name },
  managementIp: "10.0.0.2",
  macAddress: "AA:BB:CC:DD:EE:01",
  vlans: ["10", "20-VoIP"],
  location: "Rack 01",
  adminUrl: "https://10.0.0.2",
  secretsRef: "Bitwarden / Core",
  assetId: "asset-1",
  asset: { id: "asset-1", assetTag: "NET-001", brand: "HPE", model: "Aruba" },
  linksCount: 1,
  updatedAt: "2026-07-12T11:00:00.000Z",
};
const deviceB: NetworkDevice = {
  ...device,
  id: "device-2",
  name: "AP-Recepcion",
  type: "ACCESS_POINT",
  managementIp: "10.0.0.20",
  macAddress: "AA:BB:CC:DD:EE:02",
  assetId: null,
  asset: null,
};
const link: NetworkLink = {
  id: "link-1",
  deviceAId: device.id,
  deviceBId: deviceB.id,
  deviceA: device,
  deviceB,
  portA: "Gi0/1",
  portB: "eth0",
  type: "ETHERNET",
  vlans: ["10"],
  speedMbps: 1000,
  updatedAt: "2026-07-12T11:30:00.000Z",
};
const view: TopologyView = {
  id: "view-1",
  name: "Mapa principal",
  siteId: site.id,
  site: { id: site.id, name: site.name },
  isDefault: true,
  nodes: [
    { deviceId: device.id, x: 38, y: 42 },
    { deviceId: deviceB.id, x: 228, y: 42 },
  ],
  devices: [device, deviceB],
  links: [link],
  updatedAt: "2026-07-12T12:00:00.000Z",
};

function list<T>(items: T[]) {
  return {
    data: {
      success: true,
      data: {
        items,
        pagination: {
          page: 1,
          pageSize: 10,
          total: items.length,
          totalPages: 1,
        },
      },
    },
  };
}

function installMocks() {
  apiMock.get.mockImplementation((url: string) => {
    if (url === "/api/it/network/devices")
      return Promise.resolve(list([device, deviceB]));
    if (url === "/api/it/network/links") return Promise.resolve(list([link]));
    if (url === "/api/it/network/sites") return Promise.resolve(list([site]));
    if (url === "/api/it/network/lookups")
      return Promise.resolve({
        data: {
          success: true,
          data: {
            sites: [site],
            devices: [device, deviceB],
            assets: [
              {
                id: "asset-2",
                assetTag: "NET-002",
                brand: "Mikrotik",
                model: "CCR",
              },
            ],
          },
        },
      });
    if (url === "/api/it/network/topology-views")
      return Promise.resolve(list([view]));
    if (url === `/api/it/network/devices/${device.id}`)
      return Promise.resolve({ data: { success: true, data: { device } } });
    if (url === `/api/it/network/links/${link.id}`)
      return Promise.resolve({ data: { success: true, data: { link } } });
    if (url === `/api/it/network/topology-views/${view.id}`)
      return Promise.resolve({ data: { success: true, data: { view } } });
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
  apiMock.post.mockImplementation((url: string) => {
    if (url.endsWith("/devices"))
      return Promise.resolve({ data: { success: true, data: { device } } });
    if (url.endsWith("/links"))
      return Promise.resolve({ data: { success: true, data: { link } } });
    if (url.endsWith("/sites"))
      return Promise.resolve({ data: { success: true, data: { site } } });
    if (url.endsWith("/topology-views"))
      return Promise.resolve({ data: { success: true, data: { view } } });
    return Promise.reject(new Error(`Unexpected POST ${url}`));
  });
  apiMock.patch.mockImplementation((url: string) =>
    Promise.resolve({
      data: {
        success: true,
        data: url.includes("devices")
          ? { device }
          : url.includes("links")
            ? { link }
            : url.includes("sites")
              ? { site }
              : { view },
      },
    }),
  );
  apiMock.put.mockResolvedValue({
    data: {
      success: true,
      data: { view: { ...view, updatedAt: "2026-07-12T13:00:00.000Z" } },
    },
  });
  apiMock.delete.mockResolvedValue({
    data: { success: true, data: { deleted: true, id: link.id } },
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return {
    ...render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <ItNetworkPage />
        </QueryClientProvider>
      </MemoryRouter>,
    ),
    queryClient,
  };
}

describe("ItNetworkPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.role = "ADMIN";
    installMocks();
  });

  it("renderiza nodos y envía los filtros soportados", async () => {
    const user = userEvent.setup();
    renderPage();
    expect((await screen.findAllByText(device.name)).length).toBeGreaterThan(0);
    await user.type(screen.getByLabelText("Buscar"), "core");
    await user.selectOptions(screen.getByLabelText("Sitio"), site.id);
    await user.selectOptions(screen.getByLabelText("Tipo"), "SWITCH");
    await user.selectOptions(screen.getByLabelText("Estado"), "ACTIVE");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    await waitFor(() =>
      expect(apiMock.get).toHaveBeenCalledWith("/api/it/network/devices", {
        params: {
          q: "core",
          siteId: site.id,
          type: "SWITCH",
          status: "ACTIVE",
          page: 1,
          pageSize: 10,
        },
      }),
    );
  });

  it("crea un dispositivo con VLANs deduplicadas y sólo referencia al gestor", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText(device.name);
    await user.click(screen.getByRole("button", { name: "Nuevo nodo" }));
    const dialog = screen.getByRole("dialog", { name: "Nuevo dispositivo" });
    await user.type(
      within(dialog).getByLabelText("Nombre / hostname"),
      "Router-Borde-01",
    );
    await user.selectOptions(within(dialog).getByLabelText("Tipo"), "ROUTER");
    await user.type(
      within(dialog).getByLabelText("IP de administración"),
      "10.0.0.1",
    );
    await user.type(within(dialog).getByLabelText(/VLANs/), "10, 20-VoIP, 10");
    await user.type(
      within(dialog).getByLabelText(/Referencia de credenciales/),
      "Bitwarden / Router borde",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Registrar nodo" }),
    );
    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith(
        "/api/it/network/devices",
        expect.objectContaining({
          name: "Router-Borde-01",
          type: "ROUTER",
          siteId: site.id,
          managementIp: "10.0.0.1",
          vlans: ["10", "20-VoIP"],
          secretsRef: "Bitwarden / Router borde",
        }),
      ),
    );
    expect(apiMock.post.mock.calls.at(-1)?.[1]).not.toHaveProperty("password");
  });

  it("preserva borrador y versión CAS ante refetch de caché", async () => {
    const user = userEvent.setup();
    const { queryClient } = renderPage();
    await screen.findAllByText(device.name);
    await user.click(
      screen.getAllByRole("button", { name: `Editar ${device.name}` })[0],
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Ficha operativa",
    });
    const name = within(dialog).getByLabelText("Nombre / hostname");
    await user.clear(name);
    await user.type(name, "Core-SW-Borrador");
    act(() =>
      queryClient.setQueryData(networkKeys.deviceDetail(device.id), {
        ...device,
        name: "Cambio externo",
        updatedAt: "2026-07-12T14:00:00.000Z",
      }),
    );
    expect(name).toHaveValue("Core-SW-Borrador");
    await user.click(
      within(dialog).getByRole("button", { name: "Guardar cambios" }),
    );
    await waitFor(() =>
      expect(apiMock.patch).toHaveBeenCalledWith(
        `/api/it/network/devices/${device.id}`,
        expect.objectContaining({
          name: "Core-SW-Borrador",
          expectedUpdatedAt: device.updatedAt,
        }),
      ),
    );
  });

  it("crea enlaces con extremos, puertos, velocidad y VLAN", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText(device.name);
    await user.click(screen.getByRole("tab", { name: /Enlaces/ }));
    await user.click(screen.getByRole("button", { name: "Nuevo enlace" }));
    const dialog = screen.getByRole("dialog", { name: "Nuevo enlace" });
    await user.selectOptions(
      within(dialog).getByLabelText("Dispositivo origen"),
      device.id,
    );
    await user.selectOptions(
      within(dialog).getByLabelText("Dispositivo destino"),
      deviceB.id,
    );
    await user.type(within(dialog).getByLabelText("Puerto origen"), "Gi0/24");
    await user.type(within(dialog).getByLabelText("Puerto destino"), "eth0");
    await user.type(within(dialog).getByLabelText("Velocidad (Mbps)"), "1000");
    await user.type(within(dialog).getByLabelText(/VLANs/), "10, 20-VoIP");
    await user.click(
      within(dialog).getByRole("button", { name: "Crear enlace" }),
    );
    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith(
        "/api/it/network/links",
        expect.objectContaining({
          deviceAId: device.id,
          deviceBId: deviceB.id,
          portA: "Gi0/24",
          portB: "eth0",
          speedMbps: 1000,
          vlans: ["10", "20-VoIP"],
        }),
      ),
    );
  });

  it("mueve nodos con teclado y guarda layout explícito con CAS", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText(device.name);
    await user.click(screen.getByRole("tab", { name: /Topología/ }));
    const node = await screen.findByRole("button", {
      name: `${device.name}, Switch, ${device.managementIp}`,
    });
    node.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByText(/Cambios sin guardar/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Guardar layout" }));
    await waitFor(() =>
      expect(apiMock.put).toHaveBeenCalledWith(
        `/api/it/network/topology-views/${view.id}/layout`,
        {
          expectedUpdatedAt: view.updatedAt,
          nodes: [
            { deviceId: device.id, x: 50, y: 42 },
            { deviceId: deviceB.id, x: 228, y: 42 },
          ],
        },
      ),
    );
  });

  it("implementa navegación de tabs y restringe escritura a perfiles IT", async () => {
    authMock.role = "USER";
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText(device.name);
    const first = screen.getByRole("tab", { name: /Dispositivos/ });
    first.focus();
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: /Topología/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await user.keyboard("{Home}");
    expect(first).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("button", { name: "Nuevo nodo" })).toBeNull();
    expect(
      screen.getAllByRole("button", { name: `Ver ${device.name}` }).length,
    ).toBeGreaterThan(0);
  });
});
