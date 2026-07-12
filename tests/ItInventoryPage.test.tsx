import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => ({ role: "ADMIN" as "ADMIN" | "AGENT" }));

vi.mock("../src/hooks", () => ({
  useAuth: () => ({ user: { role: authMock.role } }),
}));

vi.mock("../src/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn() },
}));

import api from "../src/lib/api";
import ItInventoryPage from "../src/pages/it/ItInventoryPage";
import type { ItAsset } from "../src/features/it/inventory/types";

const apiMock = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
};

const baseAsset: ItAsset = {
  id: "asset-1",
  assetTag: "NB-0001",
  type: "NOTEBOOK",
  status: "IN_STOCK",
  brand: "Dell",
  model: "Latitude 5440",
  serialNumber: "SN-ABC-001",
  location: "Casa central / IT",
  warrantyUntil: "2027-01-15T00:00:00.000Z",
  notes: "Equipo de respaldo",
  specs: {
    cpu: "Intel Core i5",
    ramGb: 16,
    storage: "512 GB SSD",
    os: "Windows 11 Pro",
    importedBy: "legacy-cmdb",
  },
  updatedAt: "2026-07-12T12:00:00.000Z",
};

function listResponse(items: ItAsset[]) {
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

function renderInventory() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ItInventoryPage />
    </QueryClientProvider>,
  );
}

describe("ItInventoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.role = "ADMIN";
    apiMock.get.mockImplementation((url: string) => {
      if (url === "/api/it/assets")
        return Promise.resolve(listResponse([baseAsset]));
      if (url === `/api/it/assets/${baseAsset.id}`) {
        return Promise.resolve({
          data: { success: true, data: { asset: baseAsset } },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    apiMock.post.mockResolvedValue({
      data: { success: true, data: { asset: baseAsset } },
    });
    apiMock.patch.mockResolvedValue({
      data: { success: true, data: { asset: baseAsset } },
    });
  });

  it("renderiza la lista y envía búsqueda y filtros a la API", async () => {
    const user = userEvent.setup();
    renderInventory();

    expect((await screen.findAllByText("NB-0001")).length).toBeGreaterThan(0);
    expect(screen.getByText("1 activos encontrados")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Buscar activo"), "Dell");
    await user.selectOptions(screen.getByLabelText("Tipo"), "NOTEBOOK");
    await user.selectOptions(screen.getByLabelText("Estado"), "IN_STOCK");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() => {
      expect(apiMock.get).toHaveBeenCalledWith("/api/it/assets", {
        params: {
          q: "Dell",
          type: "NOTEBOOK",
          status: "IN_STOCK",
          page: 1,
          pageSize: 10,
        },
      });
    });
  });

  it("da de alta sin enviar assetTag cuando queda vacío", async () => {
    authMock.role = "AGENT";
    const user = userEvent.setup();
    renderInventory();
    await screen.findAllByText("NB-0001");

    await user.click(screen.getByRole("button", { name: "Nuevo activo" }));
    const dialog = screen.getByRole("dialog", { name: "Registrar activo" });

    expect(
      within(dialog)
        .getByLabelText("Estado")
        .querySelector('option[value="ASSIGNED"]'),
    ).toBeNull();
    expect(within(dialog).getByLabelText(/Etiqueta interna/)).toBeDisabled();

    await user.type(within(dialog).getByLabelText("Marca"), "Lenovo");
    await user.type(within(dialog).getByLabelText("Modelo"), "ThinkPad T14");
    await user.type(within(dialog).getByLabelText(/CPU/), "Ryzen 7");
    await user.type(within(dialog).getByLabelText(/RAM/), "32");
    await user.click(
      within(dialog).getByRole("button", { name: "Registrar activo" }),
    );

    await waitFor(() => expect(apiMock.post).toHaveBeenCalledTimes(1));
    const payload = apiMock.post.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("assetTag");
    expect(payload).toMatchObject({
      type: "NOTEBOOK",
      status: "IN_STOCK",
      brand: "Lenovo",
      model: "ThinkPad T14",
      specs: { cpu: "Ryzen 7", ramGb: 32 },
    });
    expect(JSON.stringify(payload)).not.toMatch(
      /password|credential|phoneNumber|iccid/i,
    );
  });

  it("preserva ASSIGNED y no reenvía assetTag cuando edita un AGENT", async () => {
    authMock.role = "AGENT";
    const assignedAsset: ItAsset = { ...baseAsset, status: "ASSIGNED" };
    apiMock.get.mockImplementation((url: string) => {
      if (url === "/api/it/assets") {
        return Promise.resolve(listResponse([assignedAsset]));
      }
      if (url === `/api/it/assets/${assignedAsset.id}`) {
        return Promise.resolve({
          data: { success: true, data: { asset: assignedAsset } },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    apiMock.patch.mockResolvedValue({
      data: {
        success: true,
        data: { asset: { ...assignedAsset, model: "Latitude 5450" } },
      },
    });

    const user = userEvent.setup();
    renderInventory();
    await screen.findAllByText("NB-0001");
    await user.click(
      screen.getAllByRole("button", { name: "Editar NB-0001" })[0],
    );

    const dialog = await screen.findByRole("dialog", { name: "Editar activo" });
    const statusField = await within(dialog).findByLabelText("Estado");
    expect(statusField).toBeDisabled();
    expect(statusField).toHaveValue("Asignado");
    expect(within(dialog).getByLabelText(/Etiqueta interna/)).toBeDisabled();

    const modelInput = within(dialog).getByLabelText("Modelo");
    await user.clear(modelInput);
    await user.type(modelInput, "Latitude 5450");
    await user.click(
      within(dialog).getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() => expect(apiMock.patch).toHaveBeenCalledTimes(1));
    const payload = apiMock.patch.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("assetTag");
    expect(payload).toMatchObject({
      status: "ASSIGNED",
      model: "Latitude 5450",
      expectedUpdatedAt: "2026-07-12T12:00:00.000Z",
      specs: { importedBy: "legacy-cmdb" },
    });
  });

  it("muestra el estado vacío sin inventar datos", async () => {
    apiMock.get.mockResolvedValue(listResponse([]));
    renderInventory();

    expect(
      await screen.findByText("Todavía no hay activos registrados"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Registrar activo" }),
    ).toBeEnabled();
  });

  it("muestra el error de carga y permite reintentar", async () => {
    apiMock.get.mockRejectedValue(new Error("network unavailable"));
    renderInventory();

    expect(
      await screen.findByText("No se pudo cargar el inventario"),
    ).toBeInTheDocument();
    expect(screen.getByText("network unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled();
  });
});
