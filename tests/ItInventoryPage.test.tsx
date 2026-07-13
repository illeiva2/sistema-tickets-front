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
  default: { success: vi.fn(), error: vi.fn() },
}));

import api from "../src/lib/api";
import ItInventoryPage from "../src/pages/it/ItInventoryPage";
import type { ItAsset } from "../src/features/it/inventory/types";
import toast from "react-hot-toast";

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

const activePerson = {
  id: "person-1",
  employeeNumber: "EMP-090",
  firstName: "Ada",
  lastName: "Lovelace",
  workEmail: "ada@grf.com.ar",
  status: "ACTIVE" as const,
  department: { id: "department-1", name: "Administración" },
};

const department = {
  id: "department-1",
  name: "Administración",
  slug: "administracion",
  color: "#54e6ef",
  icon: null,
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
      if (url === "/api/it/people") {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              items: [activePerson],
              pagination: {
                page: 1,
                pageSize: 100,
                total: 1,
                totalPages: 1,
              },
            },
          },
        });
      }
      if (url === "/api/departments") {
        return Promise.resolve({
          data: { success: true, data: [department] },
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

  it("asigna la custodia a persona y sector desde un activo en stock", async () => {
    apiMock.post.mockImplementation((url: string) => {
      if (url === `/api/it/assets/${baseAsset.id}/assign`) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              asset: {
                ...baseAsset,
                status: "ASSIGNED",
                assignedPerson: activePerson,
                assignedDepartment: department,
              },
            },
          },
        });
      }
      return Promise.resolve({
        data: { success: true, data: { asset: baseAsset } },
      });
    });

    const user = userEvent.setup();
    renderInventory();
    await screen.findAllByText("NB-0001");
    await user.click(
      screen.getByRole("button", { name: "Gestionar custodia NB-0001" }),
    );

    const dialog = await screen.findByRole("dialog", {
      name: "Custodia de NB-0001",
    });
    await user.selectOptions(
      await within(dialog).findByLabelText(/Persona/),
      activePerson.id,
    );
    await user.selectOptions(
      within(dialog).getByLabelText(/Sector/),
      department.id,
    );
    await user.type(
      within(dialog).getByLabelText(/Observación de entrega/),
      "Entrega con cargador",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Asignar activo" }),
    );

    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith(
        `/api/it/assets/${baseAsset.id}/assign`,
        {
          personId: activePerson.id,
          departmentId: department.id,
          note: "Entrega con cargador",
        },
      ),
    );
    expect(toast.success).toHaveBeenCalledWith("Custodia asignada");
  });

  it("muestra titular e historial sin notas y registra la devolución", async () => {
    const assignedAsset: ItAsset = {
      ...baseAsset,
      status: "ASSIGNED",
      assignedPerson: activePerson,
      assignedDepartment: department,
      assignments: [
        {
          id: "assignment-1",
          startAt: "2026-07-01T12:00:00.000Z",
          endAt: null,
          person: activePerson,
          department,
          assignedBy: {
            id: "user-1",
            name: "Operador IT",
            email: "it@grf.com.ar",
          },
          note: "nota que no debe mostrarse",
        },
      ] as unknown as NonNullable<ItAsset["assignments"]>,
    };
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
    apiMock.post.mockResolvedValue({
      data: {
        success: true,
        data: { asset: { ...baseAsset, status: "IN_STOCK" } },
      },
    });

    const user = userEvent.setup();
    renderInventory();
    await screen.findAllByText("NB-0001");
    await user.click(
      screen.getByRole("button", { name: "Gestionar custodia NB-0001" }),
    );

    const dialog = await screen.findByRole("dialog", {
      name: "Custodia de NB-0001",
    });
    expect(within(dialog).getAllByText("Ada Lovelace").length).toBeGreaterThan(
      0,
    );
    expect(
      within(dialog).getAllByText("Administración").length,
    ).toBeGreaterThan(0);
    expect(within(dialog).queryByText("nota que no debe mostrarse")).toBeNull();
    await user.type(
      within(dialog).getByLabelText(/Estado al devolver/),
      "Devuelto completo",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Registrar devolución" }),
    );

    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith(
        `/api/it/assets/${baseAsset.id}/return`,
        { returnNote: "Devuelto completo" },
      ),
    );
    expect(toast.success).toHaveBeenCalledWith("Devolución registrada");
  });

  it("explica por qué un activo en reparación no es asignable", async () => {
    const repairAsset: ItAsset = { ...baseAsset, status: "IN_REPAIR" };
    apiMock.get.mockImplementation((url: string) => {
      if (url === "/api/it/assets") {
        return Promise.resolve(listResponse([repairAsset]));
      }
      if (url === `/api/it/assets/${repairAsset.id}`) {
        return Promise.resolve({
          data: { success: true, data: { asset: repairAsset } },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    const user = userEvent.setup();
    renderInventory();
    await screen.findAllByText("NB-0001");
    await user.click(
      screen.getByRole("button", { name: "Gestionar custodia NB-0001" }),
    );

    const dialog = await screen.findByRole("dialog", {
      name: "Custodia de NB-0001",
    });
    expect(within(dialog).getByText("Activo no asignable")).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Debe volver a En depósito antes de asignarlo/),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: "Asignar activo" }),
    ).toBeNull();
  });

  it("mantiene abierto el panel y muestra el error al asignar", async () => {
    apiMock.post.mockRejectedValueOnce({
      response: {
        data: {
          error: {
            code: "ASSET_ALREADY_ASSIGNED",
            message: "El activo ya tiene una asignación vigente",
          },
        },
      },
    });

    const user = userEvent.setup();
    renderInventory();
    await screen.findAllByText("NB-0001");
    await user.click(
      screen.getByRole("button", { name: "Gestionar custodia NB-0001" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "Custodia de NB-0001",
    });
    await user.selectOptions(
      await within(dialog).findByLabelText(/Persona/),
      activePerson.id,
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Asignar activo" }),
    );

    expect(
      await within(dialog).findByText(
        "El activo ya tiene una asignación vigente",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: "Custodia de NB-0001" }),
    ).toBeInTheDocument();
  });

  it("recarga la ficha y usa la versión nueva después de un conflicto", async () => {
    const refreshedAsset: ItAsset = {
      ...baseAsset,
      model: "Latitude 5450",
      updatedAt: "2026-07-12T13:00:00.000Z",
    };
    let detailRequests = 0;
    apiMock.get.mockImplementation((url: string) => {
      if (url === "/api/it/assets") {
        return Promise.resolve(listResponse([baseAsset]));
      }
      if (url === `/api/it/assets/${baseAsset.id}`) {
        detailRequests += 1;
        return Promise.resolve({
          data: {
            success: true,
            data: { asset: detailRequests === 1 ? baseAsset : refreshedAsset },
          },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    apiMock.patch.mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          error: {
            code: "ASSET_VERSION_CONFLICT",
            message: "El activo fue modificado por otro usuario",
          },
        },
      },
    });

    const user = userEvent.setup();
    renderInventory();
    await screen.findAllByText("NB-0001");
    await user.click(
      screen.getAllByRole("button", { name: "Editar NB-0001" })[0],
    );

    let dialog = await screen.findByRole("dialog", { name: "Editar activo" });
    let modelInput = within(dialog).getByLabelText("Modelo");
    await user.clear(modelInput);
    await user.type(modelInput, "Mi cambio obsoleto");
    await user.click(
      within(dialog).getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() => expect(detailRequests).toBe(2));
    expect(toast.error).toHaveBeenCalledWith(
      "La ficha cambió y fue recargada. Revisá la versión nueva antes de guardar.",
    );

    dialog = await screen.findByRole("dialog", { name: "Editar activo" });
    modelInput = within(dialog).getByLabelText("Modelo");
    expect(modelInput).toHaveValue("Latitude 5450");

    await user.clear(modelInput);
    await user.type(modelInput, "Latitude 5460");
    await user.click(
      within(dialog).getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() => expect(apiMock.patch).toHaveBeenCalledTimes(2));
    expect(apiMock.patch.mock.calls[1][1]).toMatchObject({
      model: "Latitude 5460",
      expectedUpdatedAt: "2026-07-12T13:00:00.000Z",
    });
  });

  it("cierra y descarta la copia obsoleta si falla la recarga", async () => {
    let detailRequests = 0;
    apiMock.get.mockImplementation((url: string) => {
      if (url === "/api/it/assets") {
        return Promise.resolve(listResponse([baseAsset]));
      }
      if (url === `/api/it/assets/${baseAsset.id}`) {
        detailRequests += 1;
        if (detailRequests === 1) {
          return Promise.resolve({
            data: { success: true, data: { asset: baseAsset } },
          });
        }
        return Promise.reject(new Error("network unavailable"));
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    apiMock.patch.mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          error: {
            code: "ASSET_VERSION_CONFLICT",
            message: "El activo fue modificado por otro usuario",
          },
        },
      },
    });

    const user = userEvent.setup();
    renderInventory();
    await screen.findAllByText("NB-0001");
    await user.click(
      screen.getAllByRole("button", { name: "Editar NB-0001" })[0],
    );

    const dialog = await screen.findByRole("dialog", { name: "Editar activo" });
    const modelInput = within(dialog).getByLabelText("Modelo");
    await user.clear(modelInput);
    await user.type(modelInput, "Mi cambio obsoleto");
    await user.click(
      within(dialog).getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Editar activo" }),
      ).not.toBeInTheDocument();
    });
    expect(toast.error).toHaveBeenCalledWith(
      "La ficha cambió, pero no pudo recargarse. Abrila nuevamente antes de editar.",
    );
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
