import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
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

function renderInventory(initialEntry = "/it/inventory") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryClientProvider client={queryClient}>
        <ItInventoryPage />
      </QueryClientProvider>
    </MemoryRouter>,
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
    const sectorFilter = screen.getByLabelText("Sector");
    await within(sectorFilter).findByRole("option", { name: "Administración" });
    await user.selectOptions(sectorFilter, "department-1");
    const personFilter = screen.getByLabelText("Persona");
    await within(personFilter).findByRole("option", { name: "Lovelace, Ada" });
    await user.selectOptions(personFilter, "person-1");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() => {
      expect(apiMock.get).toHaveBeenCalledWith("/api/it/assets", {
        params: {
          q: "Dell",
          type: "NOTEBOOK",
          status: "IN_STOCK",
          assignedDepartmentId: "department-1",
          assignedPersonId: "person-1",
          page: 1,
          pageSize: 10,
        },
      });
    });
  });

  it("muestra a quién está asignado cada equipo", async () => {
    apiMock.get.mockImplementation((url: string) => {
      if (url === "/api/it/assets") {
        return Promise.resolve(
          listResponse([
            {
              ...baseAsset,
              status: "ASSIGNED",
              assignedPerson: activePerson,
              assignedDepartment: null,
            },
            {
              ...baseAsset,
              id: "asset-2",
              assetTag: "PH-0003",
              type: "PHONE",
              status: "ASSIGNED",
              assignedPerson: null,
              assignedDepartment: { id: "department-2", name: "Balanza" },
            },
            { ...baseAsset, id: "asset-3", assetTag: "NB-0002" },
          ]),
        );
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    renderInventory();

    const table = await screen.findByRole("table");
    const rows = within(table).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Ada Lovelace");
    expect(rows[1]).toHaveTextContent("Administración");
    expect(rows[2]).toHaveTextContent("PH-0003");
    expect(rows[2]).toHaveTextContent("BalanzaSector");
    expect(rows[3]).toHaveTextContent("Sin asignar");
    expect(within(table).queryByText("Casa central / IT")).toBeNull();
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
    expect(
      within(dialog)
        .getByLabelText("Estado")
        .querySelector('option[value="IN_REPAIR"]'),
    ).toBeNull();
    expect(within(dialog).getByLabelText(/Nombre de host/)).toBeEnabled();
    // Lo técnico no se carga a mano.
    expect(within(dialog).queryByLabelText(/CPU|RAM|IMEI/)).toBeNull();

    await user.type(within(dialog).getByLabelText("Marca"), "Lenovo");
    await user.type(within(dialog).getByLabelText("Modelo"), "ThinkPad T14");
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
      specs: null,
    });
    expect(JSON.stringify(payload)).not.toMatch(
      /password|credential|phoneNumber|iccid/i,
    );
  });

  it("da de alta con el nombre de host como etiqueta, en mayúsculas", async () => {
    authMock.role = "AGENT";
    const user = userEvent.setup();
    renderInventory();
    await screen.findAllByText("NB-0001");

    await user.click(screen.getByRole("button", { name: "Nuevo activo" }));
    const dialog = screen.getByRole("dialog", { name: "Registrar activo" });
    const tagInput = within(dialog).getByLabelText(/Nombre de host/);

    await user.type(tagInput, "pc 01");
    await user.type(within(dialog).getByLabelText("Marca"), "HP");
    await user.type(within(dialog).getByLabelText("Modelo"), "ProDesk 400");
    await user.click(
      within(dialog).getByRole("button", { name: "Registrar activo" }),
    );
    expect(
      await within(dialog).findByText(/solo puede tener letras, números y guiones/),
    ).toBeInTheDocument();
    expect(apiMock.post).not.toHaveBeenCalled();

    await user.clear(tagInput);
    await user.type(tagInput, "desktop-4k2m1qf");
    expect(tagInput).toHaveValue("DESKTOP-4K2M1QF");
    await user.click(
      within(dialog).getByRole("button", { name: "Registrar activo" }),
    );

    await waitFor(() => expect(apiMock.post).toHaveBeenCalledTimes(1));
    expect(apiMock.post.mock.calls[0][1]).toMatchObject({
      assetTag: "DESKTOP-4K2M1QF",
      brand: "HP",
      model: "ProDesk 400",
    });
  });

  it("en celulares pide etiqueta e IMEI, no nombre de host", async () => {
    const user = userEvent.setup();
    renderInventory();
    await screen.findAllByText("NB-0001");

    await user.click(screen.getByRole("button", { name: "Nuevo activo" }));
    const dialog = screen.getByRole("dialog", { name: "Registrar activo" });
    await user.selectOptions(within(dialog).getByLabelText("Tipo"), "PHONE");

    expect(within(dialog).queryByLabelText(/Nombre de host/)).toBeNull();
    await user.type(within(dialog).getByLabelText(/^Etiqueta/), "cel-balanza");
    await user.type(within(dialog).getByLabelText("Marca"), "Samsung");
    await user.type(within(dialog).getByLabelText("Modelo"), "A15");
    await user.type(within(dialog).getByLabelText(/IMEI/), "356789012345678");
    await user.click(
      within(dialog).getByRole("button", { name: "Registrar activo" }),
    );

    await waitFor(() => expect(apiMock.post).toHaveBeenCalledTimes(1));
    expect(apiMock.post.mock.calls[0][1]).toMatchObject({
      type: "PHONE",
      assetTag: "CEL-BALANZA",
      specs: { imei: "356789012345678" },
    });
  });

  it("cambia la etiqueta de un equipo existente y no la deja vacía", async () => {
    authMock.role = "AGENT";
    const user = userEvent.setup();
    renderInventory();
    await screen.findAllByText("NB-0001");
    await user.click(
      screen.getAllByRole("button", { name: "Editar NB-0001" })[0],
    );

    const dialog = await screen.findByRole("dialog", { name: "Editar activo" });
    const tagInput = await within(dialog).findByLabelText(/Nombre de host/);
    await user.clear(tagInput);
    await user.click(
      within(dialog).getByRole("button", { name: "Guardar cambios" }),
    );
    expect(
      await within(dialog).findByText(/La etiqueta no puede quedar vacía/),
    ).toBeInTheDocument();
    expect(apiMock.patch).not.toHaveBeenCalled();

    await user.type(tagInput, "nb-ivan");
    await user.click(
      within(dialog).getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() => expect(apiMock.patch).toHaveBeenCalledTimes(1));
    expect(apiMock.patch.mock.calls[0][1]).toMatchObject({
      assetTag: "NB-IVAN",
      expectedUpdatedAt: "2026-07-12T12:00:00.000Z",
    });
  });

  it("ignora los enlaces viejos de alta desde una compra", async () => {
    // Compras y proveedores se sacó: un enlace guardado con el origen de
    // compra abre el inventario normal, sin consultar la orden.
    renderInventory(
      "/it/inventory?purchaseId=purchase-1&purchaseItemId=purchase-item-1",
    );
    await screen.findAllByText("NB-0001");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      apiMock.get.mock.calls.some(([url]: [string]) =>
        url.startsWith("/api/it/purchases"),
      ),
    ).toBe(false);
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
    expect(within(dialog).getByLabelText(/Nombre de host/)).toHaveValue(
      "NB-0001",
    );
    // Lo que informó el agente se ve, pero no se edita.
    expect(within(dialog).getByText("Intel Core i5")).toBeInTheDocument();
    expect(within(dialog).getByText("16 GB")).toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/CPU|RAM/)).toBeNull();

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

  it("bloquea el estado en reparación y deriva su cierre a Mantenimientos", async () => {
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
      screen.getAllByRole("button", { name: "Editar NB-0001" })[0],
    );

    const dialog = await screen.findByRole("dialog", { name: "Editar activo" });
    const status = within(dialog).getByLabelText("Estado");
    expect(status).toBeDisabled();
    expect(status).toHaveValue("En reparación");
    expect(
      within(dialog).getByText(
        /se administra cerrando o cancelando el mantenimiento en curso/i,
      ),
    ).toBeInTheDocument();
    expect(apiMock.patch).not.toHaveBeenCalled();
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

  it("recarga la custodia cuando otro operador asignó el activo", async () => {
    const concurrentlyAssigned: ItAsset = {
      ...baseAsset,
      status: "ASSIGNED",
      assignedPerson: activePerson,
      assignedDepartment: department,
      assignments: [
        {
          id: "assignment-concurrent",
          startAt: "2026-07-12T13:00:00.000Z",
          endAt: null,
          person: activePerson,
          department,
        },
      ],
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
            data: {
              asset: detailRequests === 1 ? baseAsset : concurrentlyAssigned,
            },
          },
        });
      }
      if (url === "/api/it/people") {
        return Promise.resolve({
          data: {
            success: true,
            data: { items: [activePerson], pagination: undefined },
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
      await screen.findByRole("button", { name: "Registrar devolución" }),
    ).toBeInTheDocument();
    expect(detailRequests).toBe(2);
    expect(toast.error).toHaveBeenCalledWith(
      "La custodia cambió y fue recargada. Revisá el estado actualizado antes de continuar.",
    );
  });

  it("cierra la custodia si el conflicto no puede recargarse", async () => {
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
      if (url === "/api/it/people") {
        return Promise.resolve({
          data: {
            success: true,
            data: { items: [activePerson], pagination: undefined },
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
    apiMock.post.mockRejectedValueOnce({
      response: {
        data: {
          error: {
            code: "ASSET_WRITE_CONFLICT",
            message: "El activo cambió mientras se procesaba la operación",
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

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Custodia de NB-0001" }),
      ).not.toBeInTheDocument();
    });
    expect(toast.error).toHaveBeenCalledWith(
      "La custodia cambió, pero no pudo recargarse. Abrila nuevamente antes de operar.",
    );
  });

  it("refresca personas y descarta una selección que dejó de estar activa", async () => {
    let peopleRequests = 0;
    apiMock.get.mockImplementation((url: string) => {
      if (url === "/api/it/assets") {
        return Promise.resolve(listResponse([baseAsset]));
      }
      if (url === `/api/it/assets/${baseAsset.id}`) {
        return Promise.resolve({
          data: { success: true, data: { asset: baseAsset } },
        });
      }
      if (url === "/api/it/people") {
        peopleRequests += 1;
        return Promise.resolve({
          data: {
            success: true,
            data: {
              items: peopleRequests === 1 ? [activePerson] : [],
              pagination: undefined,
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
    apiMock.post.mockRejectedValueOnce({
      response: {
        data: {
          error: {
            code: "PERSON_NOT_FOUND",
            message: "Persona activa no encontrada",
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
    const personSelect = await within(dialog).findByLabelText(/Persona/);
    await user.selectOptions(personSelect, activePerson.id);
    await user.click(
      within(dialog).getByRole("button", { name: "Asignar activo" }),
    );

    expect(
      await within(dialog).findByText("Persona activa no encontrada"),
    ).toBeInTheDocument();
    await waitFor(() => expect(personSelect).toHaveValue(""));
    expect(peopleRequests).toBe(2);
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
    const defaultGet = apiMock.get.getMockImplementation()!;
    apiMock.get.mockImplementation((url: string) =>
      url === "/api/it/assets"
        ? Promise.resolve(listResponse([]))
        : defaultGet(url),
    );
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
