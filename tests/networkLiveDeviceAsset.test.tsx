import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../src/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import toast from "react-hot-toast";
import api from "../src/lib/api";
import { DeviceAssetDialog, tagFromDeviceName } from "../src/features/it/network-live/components/DeviceAssetDialog";
import { DeviceInventory } from "../src/features/it/network-live/components/DeviceInventory";
import type { LiveDevice } from "../src/features/it/network-live/types";

const apiMock = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
};
const now = new Date().toISOString();

const device = (overrides: Partial<LiveDevice> = {}): LiveDevice =>
  ({
    id: "d1",
    collector: "red-colector-srvdatos",
    key: "10.0.0.13",
    source: "snmp",
    role: "access",
    name: "SWT-013",
    managementIp: "10.0.0.13",
    macAddress: "AA:BB:CC:00:00:13",
    vendor: "TP-Link",
    model: "TL-SG3428MP",
    firmware: null,
    serialNumber: "2235123000456",
    uptimeSeconds: 3600,
    clients: null,
    status: "ok",
    lastError: null,
    lastPolledAt: now,
    lastOkAt: now,
    alertsMuted: false,
    poe: null,
    asset: null,
    assetLink: null,
    ports: [],
    ...overrides,
  }) as LiveDevice;

const inventoryAsset = (id: string, assetTag: string, overrides: Record<string, unknown> = {}) => ({
  id,
  assetTag,
  type: "NETWORK_DEVICE",
  status: "IN_STOCK",
  brand: "TP-Link",
  model: "TL-SG3428MP",
  serialNumber: null,
  location: "Rack de oficinas",
  updatedAt: now,
  ...overrides,
});

/** El inventario: equipos de red y "Otro"; la lista no trae lo dado de baja al elegir. */
function mockInventory() {
  apiMock.get.mockImplementation((url: string, config?: { params?: { type?: string; q?: string } }) => {
    if (url !== "/api/it/assets") return Promise.reject(new Error(`URL inesperada ${url}`));
    const items =
      config?.params?.type === "NETWORK_DEVICE"
        ? [inventoryAsset("as-2", "NET-0002"), inventoryAsset("as-9", "NET-0009", { status: "RETIRED" })]
        : [inventoryAsset("as-5", "ROUTER-VIEJO", { type: "OTHER", brand: "MikroTik", model: "RB4011" })];
    return Promise.resolve({
      data: { success: true, data: { items, pagination: { page: 1, pageSize: 20, total: items.length, totalPages: 1 } } },
    });
  });
}

function renderDialog(target: LiveDevice, mode: "link" | "create", onClose = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DeviceAssetDialog device={target} initialMode={mode} onClose={onClose} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return onClose;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Ficha del inventario de un equipo de red", () => {
  it("propone la etiqueta con el nombre del equipo", () => {
    expect(tagFromDeviceName("SWT-013")).toBe("SWT-013");
    expect(tagFromDeviceName("rb4011.grf.local")).toBe("RB4011");
    expect(tagFromDeviceName("AP Depósito")).toBe("AP-DEPOSITO");
    expect(tagFromDeviceName("Switch_Planta 2")).toBe("SWITCH-PLANTA-2");
    expect(tagFromDeviceName("ap")).toBe("");
  });

  it("la fila del nodo ofrece dar de alta o vincular si no tiene ficha", async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <dl>
          <DeviceInventory device={device()} onOpen={onOpen} />
        </dl>
      </MemoryRouter>,
    );

    expect(screen.getByText("Sin ficha")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Dar de alta" }));
    await user.click(screen.getByRole("button", { name: "Vincular…" }));
    expect(onOpen.mock.calls).toEqual([
      ["d1", "create"],
      ["d1", "link"],
    ]);
  });

  it("la fila del nodo lleva a la ficha y dice si se la reconoce por número de serie", async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <MemoryRouter>
        <dl>
          <DeviceInventory
            device={device({ asset: { id: "as-1", assetTag: "SWT-013" }, assetLink: "manual" })}
            onOpen={onOpen}
          />
        </dl>
      </MemoryRouter>,
    );

    expect(screen.getByText("SWT-013")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver SWT-013 en el inventario" })).toHaveAttribute(
      "href",
      "/it/inventory?activo=as-1",
    );
    expect(screen.queryByText("por serie")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Cambiar" }));
    expect(onOpen).toHaveBeenCalledWith("d1", "link");

    rerender(
      <MemoryRouter>
        <dl>
          <DeviceInventory
            device={device({ asset: { id: "as-1", assetTag: "SWT-013" }, assetLink: "serial" })}
            onOpen={onOpen}
          />
        </dl>
      </MemoryRouter>,
    );
    expect(screen.getByText("por serie")).toHaveAttribute(
      "title",
      "Reconocida por el número de serie: no está vinculada a mano",
    );
  });

  it("da de alta la ficha con lo que informa el equipo y la deja vinculada", async () => {
    apiMock.post.mockResolvedValue({
      data: { success: true, data: { id: "d1", asset: { id: "as-new", assetTag: "SWT-013" }, assetLink: "manual" } },
    });
    const user = userEvent.setup();
    const onClose = renderDialog(device(), "create");

    const dialog = screen.getByRole("dialog", { name: "Inventario de SWT-013" });
    expect(within(dialog).getByLabelText("Etiqueta")).toHaveValue("SWT-013");
    expect(within(dialog).getByLabelText("Marca")).toHaveValue("TP-Link");
    expect(within(dialog).getByLabelText("Modelo")).toHaveValue("TL-SG3428MP");
    expect(within(dialog).getByLabelText("Número de serie")).toHaveValue("2235123000456");
    await user.type(within(dialog).getByLabelText("Ubicación"), "Rack de oficinas");
    await user.click(within(dialog).getByRole("button", { name: "Crear la ficha" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(apiMock.post).toHaveBeenCalledWith("/api/it/network/live/devices/d1/asset", {
      asset: {
        type: "NETWORK_DEVICE",
        status: "IN_STOCK",
        brand: "TP-Link",
        model: "TL-SG3428MP",
        serialNumber: "2235123000456",
        assetTag: "SWT-013",
        location: "Rack de oficinas",
        specs: { mac: "AA:BB:CC:00:00:13" },
      },
    });
    expect(toast.success).toHaveBeenCalledWith("SWT-013: creada y vinculada a SWT-013");
  });

  it("sin etiqueta deja que el inventario la genere y pide marca y modelo", async () => {
    apiMock.post.mockResolvedValue({
      data: { success: true, data: { id: "d1", asset: { id: "as-new", assetTag: "NET-0003" }, assetLink: "manual" } },
    });
    const user = userEvent.setup();
    renderDialog(device({ name: "ap", vendor: null, serialNumber: null, macAddress: null }), "create");

    const dialog = screen.getByRole("dialog", { name: "Inventario de ap" });
    expect(within(dialog).getByLabelText("Etiqueta")).toHaveValue("");
    await user.click(within(dialog).getByRole("button", { name: "Crear la ficha" }));
    expect(within(dialog).getByText("Falta la marca.")).toBeInTheDocument();
    expect(apiMock.post).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText("Etiqueta"), "x");
    await user.type(within(dialog).getByLabelText("Marca"), "Ubiquiti");
    await user.click(within(dialog).getByRole("button", { name: "Crear la ficha" }));
    expect(within(dialog).getByText(/letras, números y guiones/)).toBeInTheDocument();
    expect(apiMock.post).not.toHaveBeenCalled();

    await user.clear(within(dialog).getByLabelText("Etiqueta"));
    await user.click(within(dialog).getByRole("button", { name: "Crear la ficha" }));
    await waitFor(() => expect(apiMock.post).toHaveBeenCalled());
    expect(apiMock.post.mock.calls[0][1]).toEqual({
      asset: {
        type: "NETWORK_DEVICE",
        status: "IN_STOCK",
        brand: "Ubiquiti",
        model: "TL-SG3428MP",
        serialNumber: null,
        location: null,
      },
    });
  });

  it("vincula una ficha de equipo de red del inventario; las dadas de baja no se ofrecen", async () => {
    mockInventory();
    apiMock.put.mockResolvedValue({
      data: { success: true, data: { id: "d1", asset: { id: "as-2", assetTag: "NET-0002" }, assetLink: "manual" } },
    });
    const user = userEvent.setup();
    const onClose = renderDialog(device(), "link");

    const list = await screen.findByRole("list", { name: "Fichas del inventario" });
    expect(within(list).getByText("NET-0002")).toBeInTheDocument();
    expect(within(list).getByText("ROUTER-VIEJO")).toBeInTheDocument();
    expect(within(list).queryByText("NET-0009")).toBeNull();
    expect(apiMock.get.mock.calls.map(([, config]) => config.params.type)).toEqual(["NETWORK_DEVICE", "OTHER"]);

    await user.click(within(list).getByRole("button", { name: "Vincular NET-0002" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(apiMock.put).toHaveBeenCalledWith("/api/it/network/live/devices/d1/asset", { assetId: "as-2" });
    expect(toast.success).toHaveBeenCalledWith("SWT-013: vinculado a NET-0002");
  });

  it("busca en el inventario mientras se escribe", async () => {
    mockInventory();
    const user = userEvent.setup();
    renderDialog(device(), "link");
    await screen.findByRole("list", { name: "Fichas del inventario" });

    await user.type(screen.getByLabelText("Buscar en el inventario"), "rack");

    await waitFor(() =>
      expect(apiMock.get).toHaveBeenCalledWith(
        "/api/it/assets",
        expect.objectContaining({ params: expect.objectContaining({ q: "rack", type: "NETWORK_DEVICE" }) }),
      ),
    );
  });

  it("desvincula la ficha vinculada a mano", async () => {
    mockInventory();
    apiMock.put.mockResolvedValue({ data: { success: true, data: { id: "d1", asset: null, assetLink: null } } });
    const user = userEvent.setup();
    const onClose = renderDialog(device({ asset: { id: "as-2", assetTag: "NET-0002" }, assetLink: "manual" }), "link");

    const dialog = screen.getByRole("dialog", { name: "Inventario de SWT-013" });
    expect(dialog).toHaveTextContent("Vinculado a NET-0002");
    const list = await within(dialog).findByRole("list", { name: "Fichas del inventario" });
    expect(within(list).getByText("Vinculada")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Desvincular" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(apiMock.put).toHaveBeenCalledWith("/api/it/network/live/devices/d1/asset", { assetId: null });
    expect(toast.success).toHaveBeenCalledWith("SWT-013: ficha desvinculada");
  });

  it("muestra el motivo si la ficha ya es de otro equipo y no cierra", async () => {
    mockInventory();
    apiMock.put.mockRejectedValue({
      response: {
        data: { error: { code: "LIVE_DEVICE_ASSET_ALREADY_LINKED", message: "Esa ficha ya está vinculada a otro equipo de la red" } },
      },
    });
    const user = userEvent.setup();
    const onClose = renderDialog(
      device({ asset: { id: "as-1", assetTag: "SWT-013" }, assetLink: "serial" }),
      "link",
    );

    const dialog = screen.getByRole("dialog", { name: "Inventario de SWT-013" });
    expect(dialog).toHaveTextContent("Reconocido por número de serie: SWT-013");
    expect(within(dialog).queryByRole("button", { name: "Desvincular" })).toBeNull();
    await user.click(await within(dialog).findByRole("button", { name: "Vincular NET-0002" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Esa ficha ya está vinculada a otro equipo de la red",
    );
    expect(onClose).not.toHaveBeenCalled();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
