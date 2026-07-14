import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import api from "../src/lib/api";
import toast from "react-hot-toast";
import { getMaintenanceErrorInfo } from "../src/features/it/maintenance/api";
import type {
  ItMaintenance,
  MaintenanceAsset,
  MaintenanceLookups,
} from "../src/features/it/maintenance/types";
import ItMaintenancePage from "../src/pages/it/ItMaintenancePage";
import { maintenanceKeys } from "../src/features/it/maintenance/useMaintenance";

const apiMock = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
};

const toastMock = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

const asset: MaintenanceAsset = {
  id: "asset-1",
  assetTag: "NB-0042",
  serialNumber: "PF-9912",
  brand: "Lenovo",
  model: "ThinkPad T14",
  type: "NOTEBOOK",
  status: "ASSIGNED",
};

const lookups: MaintenanceLookups = {
  performers: [{ id: "user-it-1", name: "Ana IT", email: "ana@empresa.test" }],
  suppliers: [{ id: "supplier-1", name: "Servicio Norte" }],
  tickets: [
    {
      id: "ticket-7",
      ticketNumber: 7,
      title: "Notebook sin encender",
      status: "OPEN",
    },
  ],
};

const baseMaintenance: ItMaintenance = {
  id: "maintenance-1",
  assetId: asset.id,
  asset,
  type: "PREVENTIVE",
  status: "SCHEDULED",
  scheduledAt: "2026-07-21T12:30:00.000Z",
  performedAt: null,
  description: "Limpieza interna y control de batería",
  performedById: null,
  performedBy: null,
  supplierId: null,
  supplier: null,
  costAmount: null,
  currency: "ARS",
  parts: [],
  ticketId: null,
  ticket: null,
  updatedAt: "2026-07-12T12:00:00.000Z",
};

function listResponse(items: ItMaintenance[]) {
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

function renderMaintenance() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <ItMaintenancePage />
    </QueryClientProvider>,
  );
  return { ...rendered, queryClient };
}

function installDefaultMocks(maintenance = baseMaintenance) {
  apiMock.get.mockImplementation((url: string) => {
    if (url === "/api/it/maintenances") {
      return Promise.resolve(listResponse([maintenance]));
    }
    if (url === "/api/it/maintenances/lookups") {
      return Promise.resolve({ data: { success: true, data: lookups } });
    }
    if (url === `/api/it/maintenances/${maintenance.id}`) {
      return Promise.resolve({
        data: { success: true, data: { maintenance } },
      });
    }
    if (url === "/api/it/assets") {
      return Promise.resolve({
        data: {
          success: true,
          data: {
            items: [asset],
            pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
          },
        },
      });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
  apiMock.post.mockResolvedValue({
    data: { success: true, data: { maintenance } },
  });
  apiMock.patch.mockResolvedValue({
    data: { success: true, data: { maintenance } },
  });
}

async function openCreateDialog() {
  await screen.findAllByText("NB-0042");
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Nuevo mantenimiento" }));
  return screen.getByRole("dialog", { name: "Registrar mantenimiento" });
}

async function openEditDialog(
  label = "Editar mantenimiento de Lenovo ThinkPad T14",
) {
  await screen.findAllByText("NB-0042");
  await userEvent.setup().click(screen.getByRole("button", { name: label }));
  return screen.findByRole("dialog", { name: "Editar mantenimiento" });
}

describe("ItMaintenancePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installDefaultMocks();
  });

  it("renderiza agenda e historial y envía todos los filtros soportados", async () => {
    const user = userEvent.setup();
    renderMaintenance();

    expect((await screen.findAllByText("NB-0042")).length).toBeGreaterThan(0);
    expect(
      screen.getByText("1 intervenciones encontradas"),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Buscar"), "batería");
    await user.selectOptions(screen.getByLabelText("Tipo"), "PREVENTIVE");
    await user.selectOptions(screen.getByLabelText("Estado"), "SCHEDULED");
    await user.selectOptions(screen.getByLabelText("Proveedor"), "supplier-1");
    await user.type(screen.getByLabelText("Programado desde"), "2026-07-01");
    await user.type(screen.getByLabelText("Hasta"), "2026-07-31");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() =>
      expect(apiMock.get).toHaveBeenCalledWith("/api/it/maintenances", {
        params: {
          q: "batería",
          type: "PREVENTIVE",
          status: "SCHEDULED",
          assetId: undefined,
          supplierId: "supplier-1",
          scheduledFrom: "2026-07-01",
          scheduledTo: "2026-07-31",
          page: 1,
          pageSize: 10,
        },
      }),
    );

    await user.click(screen.getByRole("button", { name: /Historial/ }));
    expect(screen.getByRole("button", { name: /Historial/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("busca activos remotamente sin precargar sólo los primeros cien", async () => {
    const user = userEvent.setup();
    renderMaintenance();
    const dialog = await openCreateDialog();

    await user.type(within(dialog).getByLabelText("Activo"), "NB-0042 Lenovo");
    await user.click(within(dialog).getByRole("button", { name: "Buscar" }));

    await waitFor(() =>
      expect(apiMock.get).toHaveBeenCalledWith("/api/it/assets", {
        params: { q: "NB-0042 Lenovo", page: 1, pageSize: 20 },
      }),
    );
    expect(
      await within(dialog).findByRole("button", {
        name: /NB-0042 Lenovo ThinkPad T14 ASSIGNED/,
      }),
    ).toBeInTheDocument();
  });

  it("registra un preventivo con fechas ISO y decimales como strings", async () => {
    const user = userEvent.setup();
    renderMaintenance();
    const dialog = await openCreateDialog();

    await user.type(within(dialog).getByLabelText("Activo"), "NB-0042");
    await user.click(within(dialog).getByRole("button", { name: "Buscar" }));
    await user.click(
      await within(dialog).findByRole("button", {
        name: /NB-0042 Lenovo ThinkPad T14 ASSIGNED/,
      }),
    );
    await user.type(
      within(dialog).getByLabelText("Descripción"),
      "Control preventivo trimestral",
    );
    await user.type(
      within(dialog).getByLabelText(/Fecha programada/),
      "2026-07-21T09:30",
    );
    await user.type(within(dialog).getByLabelText(/Costo total/), "15000.25");
    await user.click(
      within(dialog).getByRole("button", { name: "Agregar repuesto" }),
    );
    await user.type(
      within(dialog).getByLabelText("Nombre del repuesto 1"),
      "Pasta térmica",
    );
    await user.clear(within(dialog).getByLabelText("Cantidad del repuesto 1"));
    await user.type(
      within(dialog).getByLabelText("Cantidad del repuesto 1"),
      "2",
    );
    await user.type(
      within(dialog).getByLabelText("Costo unitario del repuesto 1"),
      "3500.50",
    );
    await user.click(
      within(dialog).getByRole("button", {
        name: "Registrar mantenimiento",
      }),
    );

    await waitFor(() => expect(apiMock.post).toHaveBeenCalledTimes(1));
    expect(apiMock.post.mock.calls[0][1]).toMatchObject({
      assetId: asset.id,
      type: "PREVENTIVE",
      status: "SCHEDULED",
      description: "Control preventivo trimestral",
      scheduledAt: new Date("2026-07-21T09:30").toISOString(),
      performedAt: null,
      costAmount: "15000.25",
      currency: "ARS",
      parts: [{ name: "Pasta térmica", quantity: 2, unitCost: "3500.5" }],
    });
  });

  it("exige fecha y responsable o proveedor para completar", async () => {
    const user = userEvent.setup();
    renderMaintenance();
    const dialog = await openCreateDialog();
    await user.type(within(dialog).getByLabelText("Activo"), "NB");
    await user.click(within(dialog).getByRole("button", { name: "Buscar" }));
    await user.click(
      await within(dialog).findByRole("button", {
        name: /NB-0042 Lenovo ThinkPad T14 ASSIGNED/,
      }),
    );
    await user.type(
      within(dialog).getByLabelText("Descripción"),
      "Cambio de batería",
    );
    await user.selectOptions(
      within(dialog).getByLabelText("Estado"),
      "COMPLETED",
    );
    await user.click(
      within(dialog).getByRole("button", {
        name: "Registrar mantenimiento",
      }),
    );
    expect(
      within(dialog).getByText(/fecha de ejecución es obligatoria/i),
    ).toBeInTheDocument();

    await user.type(
      within(dialog).getByLabelText(/Fecha de ejecución/),
      "2026-07-12T15:45",
    );
    await user.click(
      within(dialog).getByRole("button", {
        name: "Registrar mantenimiento",
      }),
    );
    expect(
      within(dialog).getByText(/responsable interno o el proveedor/i),
    ).toBeInTheDocument();

    await user.selectOptions(
      within(dialog).getByLabelText(/Responsable interno/),
      "user-it-1",
    );
    await user.click(
      within(dialog).getByRole("button", {
        name: "Registrar mantenimiento",
      }),
    );

    await waitFor(() => expect(apiMock.post).toHaveBeenCalledTimes(1));
    expect(apiMock.post.mock.calls[0][1]).toMatchObject({
      status: "COMPLETED",
      performedById: "user-it-1",
      performedAt: new Date("2026-07-12T15:45").toISOString(),
    });
  });

  it("mantiene terminales cerrados y edita con expectedUpdatedAt", async () => {
    const completed: ItMaintenance = {
      ...baseMaintenance,
      status: "COMPLETED",
      performedAt: "2026-07-12T18:45:00.000Z",
      performedById: lookups.performers[0].id,
      performedBy: lookups.performers[0],
    };
    vi.clearAllMocks();
    installDefaultMocks(completed);
    const user = userEvent.setup();
    renderMaintenance();
    const dialog = await openEditDialog(
      "Ver o corregir mantenimiento de Lenovo ThinkPad T14",
    );

    const status = await within(dialog).findByLabelText("Estado");
    expect(status).toBeDisabled();
    expect(status).toHaveValue("COMPLETED");
    expect(within(dialog).queryByLabelText("Activo")).toBeNull();
    const description = within(dialog).getByLabelText("Descripción");
    await user.clear(description);
    await user.type(description, "Limpieza y control completados");
    await user.click(
      within(dialog).getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() => expect(apiMock.patch).toHaveBeenCalledTimes(1));
    expect(apiMock.patch.mock.calls[0]).toEqual([
      `/api/it/maintenances/${completed.id}`,
      expect.objectContaining({
        assetId: asset.id,
        status: "COMPLETED",
        description: "Limpieza y control completados",
        expectedUpdatedAt: completed.updatedAt,
      }),
    ]);
  });

  it("preserva borrador y versión base ante una actualización de caché", async () => {
    const externalVersion: ItMaintenance = {
      ...baseMaintenance,
      description: "Cambio realizado por otro técnico",
      updatedAt: "2026-07-12T13:30:00.000Z",
    };
    const user = userEvent.setup();
    const { queryClient } = renderMaintenance();
    const dialog = await openEditDialog();
    const description = await within(dialog).findByLabelText("Descripción");
    await user.clear(description);
    await user.type(description, "Borrador local sin guardar");

    act(() => {
      queryClient.setQueryData(
        maintenanceKeys.detail(baseMaintenance.id),
        externalVersion,
      );
    });

    expect(description).toHaveValue("Borrador local sin guardar");
    await user.click(
      within(dialog).getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() => expect(apiMock.patch).toHaveBeenCalledTimes(1));
    expect(apiMock.patch.mock.calls[0][1]).toMatchObject({
      description: "Borrador local sin guardar",
      expectedUpdatedAt: baseMaintenance.updatedAt,
    });
  });

  it("recarga únicamente MAINTENANCE_VERSION_CONFLICT", async () => {
    const refreshed: ItMaintenance = {
      ...baseMaintenance,
      description: "Versión actual del servidor",
      updatedAt: "2026-07-12T13:00:00.000Z",
    };
    let detailCalls = 0;
    apiMock.get.mockImplementation((url: string) => {
      if (url === "/api/it/maintenances")
        return Promise.resolve(listResponse([baseMaintenance]));
      if (url === "/api/it/maintenances/lookups")
        return Promise.resolve({ data: { success: true, data: lookups } });
      if (url === `/api/it/maintenances/${baseMaintenance.id}`) {
        detailCalls += 1;
        return Promise.resolve({
          data: {
            success: true,
            data: {
              maintenance: detailCalls === 1 ? baseMaintenance : refreshed,
            },
          },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    apiMock.patch
      .mockRejectedValueOnce({
        response: {
          status: 409,
          data: {
            error: {
              code: "MAINTENANCE_VERSION_CONFLICT",
              message: "La intervención cambió.",
            },
          },
        },
      })
      .mockResolvedValueOnce({
        data: { success: true, data: { maintenance: refreshed } },
      });

    const user = userEvent.setup();
    renderMaintenance();
    const dialog = await openEditDialog();
    await within(dialog).findByDisplayValue(baseMaintenance.description);
    await user.click(
      within(dialog).getByRole("button", { name: "Guardar cambios" }),
    );
    expect(
      await within(dialog).findByText("Hay una versión más reciente"),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: "Recargar versión actual" }),
    );
    expect(
      await screen.findByDisplayValue("Versión actual del servidor"),
    ).toBeInTheDocument();
    expect(detailCalls).toBe(2);

    await user.click(
      within(dialog).getByRole("button", { name: "Guardar cambios" }),
    );
    await waitFor(() => expect(apiMock.patch).toHaveBeenCalledTimes(2));
    expect(apiMock.patch.mock.calls[1][1]).toMatchObject({
      description: "Versión actual del servidor",
      expectedUpdatedAt: refreshed.updatedAt,
    });
  });

  it("cierra y descarta el detalle si falla la recarga del conflicto", async () => {
    let detailCalls = 0;
    apiMock.get.mockImplementation((url: string) => {
      if (url === "/api/it/maintenances")
        return Promise.resolve(listResponse([baseMaintenance]));
      if (url === "/api/it/maintenances/lookups")
        return Promise.resolve({ data: { success: true, data: lookups } });
      if (url === `/api/it/maintenances/${baseMaintenance.id}`) {
        detailCalls += 1;
        if (detailCalls === 2)
          return Promise.reject(new Error("reload failed"));
        return Promise.resolve({
          data: { success: true, data: { maintenance: baseMaintenance } },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    apiMock.patch.mockRejectedValue({
      response: {
        status: 409,
        data: {
          error: {
            code: "MAINTENANCE_VERSION_CONFLICT",
            message: "La intervención cambió.",
          },
        },
      },
    });

    const user = userEvent.setup();
    renderMaintenance();
    const dialog = await openEditDialog();
    await within(dialog).findByDisplayValue(baseMaintenance.description);
    await user.click(
      within(dialog).getByRole("button", { name: "Guardar cambios" }),
    );
    await user.click(
      await within(dialog).findByRole("button", {
        name: "Recargar versión actual",
      }),
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Editar mantenimiento" }),
      ).toBeNull(),
    );
    expect(toastMock.error).toHaveBeenCalledWith(
      expect.stringContaining("se cerró"),
    );

    await user.click(
      screen.getByRole("button", {
        name: "Editar mantenimiento de Lenovo ThinkPad T14",
      }),
    );
    await screen.findByRole("dialog", { name: "Editar mantenimiento" });
    expect(detailCalls).toBe(3);
  });

  it("recupera conflictos de estado refrescando detalle y referencias", async () => {
    let detailCalls = 0;
    apiMock.get.mockImplementation((url: string) => {
      if (url === "/api/it/maintenances")
        return Promise.resolve(listResponse([baseMaintenance]));
      if (url === "/api/it/maintenances/lookups")
        return Promise.resolve({ data: { success: true, data: lookups } });
      if (url === `/api/it/maintenances/${baseMaintenance.id}`) {
        detailCalls += 1;
        return Promise.resolve({
          data: { success: true, data: { maintenance: baseMaintenance } },
        });
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    apiMock.patch.mockRejectedValue({
      response: {
        status: 409,
        data: {
          error: {
            code: "ASSET_MAINTENANCE_STATE_CONFLICT",
            message: "El activo cambió de estado.",
          },
        },
      },
    });

    const user = userEvent.setup();
    renderMaintenance();
    const dialog = await openEditDialog();
    await within(dialog).findByDisplayValue(baseMaintenance.description);
    await user.click(
      within(dialog).getByRole("button", { name: "Guardar cambios" }),
    );

    await waitFor(() => expect(detailCalls).toBeGreaterThanOrEqual(2));
    expect(toastMock.error).toHaveBeenCalledWith(
      expect.stringContaining("fue recargada"),
    );
    expect(
      await screen.findByText("El activo cambió de estado."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Hay una versión más reciente")).toBeNull();
  });

  it("distingue duplicados y otros 409 del conflicto de versión", () => {
    expect(
      getMaintenanceErrorInfo({
        response: {
          status: 409,
          data: {
            error: {
              code: "ASSET_MAINTENANCE_IN_PROGRESS",
              message: "Ya existe un mantenimiento activo.",
            },
          },
        },
      }),
    ).toEqual({
      message: "Ya existe un mantenimiento activo.",
      isConflict: false,
    });
  });

  it("mantiene el listado operativo si fallan los lookups", async () => {
    apiMock.get.mockImplementation((url: string) => {
      if (url === "/api/it/maintenances")
        return Promise.resolve(listResponse([baseMaintenance]));
      if (url === "/api/it/maintenances/lookups")
        return Promise.reject(new Error("lookups unavailable"));
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    const user = userEvent.setup();
    renderMaintenance();

    expect((await screen.findAllByText("NB-0042")).length).toBeGreaterThan(0);
    expect(
      screen.getByText("Referencias parcialmente fuera de línea"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Proveedor")).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() =>
      expect(
        apiMock.get.mock.calls.filter(
          ([url]: [string]) => url === "/api/it/maintenances/lookups",
        ),
      ).toHaveLength(2),
    );
  });

  it("muestra estados vacío y error sin fabricar mantenimientos", async () => {
    apiMock.get.mockImplementation((url: string) => {
      if (url === "/api/it/maintenances")
        return Promise.resolve(listResponse([]));
      if (url === "/api/it/maintenances/lookups")
        return Promise.resolve({ data: { success: true, data: lookups } });
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    const firstRender = renderMaintenance();
    expect(
      await screen.findByText("Todavía no hay mantenimientos registrados"),
    ).toBeInTheDocument();
    firstRender.unmount();

    apiMock.get.mockImplementation((url: string) => {
      if (url === "/api/it/maintenances/lookups")
        return Promise.resolve({ data: { success: true, data: lookups } });
      return Promise.reject(new Error("maintenance unavailable"));
    });
    renderMaintenance();
    expect(
      await screen.findByText("No se pudieron cargar los mantenimientos"),
    ).toBeInTheDocument();
    expect(screen.getByText("maintenance unavailable")).toBeInTheDocument();
  });
});
