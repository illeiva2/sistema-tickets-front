import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const authMock = vi.hoisted(() => ({
  id: "admin-1",
  role: "ADMIN" as "ADMIN" | "AGENT",
}));

vi.mock("../src/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: authMock.id,
      name: "Admin IT",
      email: "admin@grf.com.ar",
      role: authMock.role,
    },
    isLoading: false,
  }),
}));

import api from "../src/lib/api";
import { getProcurementErrorInfo } from "../src/features/it/procurement/api";
import type { Purchase, Supplier } from "../src/features/it/procurement/types";
import { procurementKeys } from "../src/features/it/procurement/useProcurement";
import ItPurchasesPage from "../src/pages/it/ItPurchasesPage";

const apiMock = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
};

const supplier: Supplier = {
  id: "supplier-1",
  name: "Infra Sur SA",
  cuit: "30712345678",
  categories: ["hardware", "insumos"],
  isActive: true,
  purchasesCount: 4,
  maintenancesCount: 2,
  activePurchasesCount: 1,
  updatedAt: "2026-07-12T12:00:00.000Z",
};

const basePurchase: Purchase = {
  id: "purchase-1",
  purchaseNumber: 42,
  status: "REQUESTED",
  supplierId: supplier.id,
  supplier: { id: supplier.id, name: supplier.name, isActive: true },
  currency: "USD",
  totalAmount: "2500.50",
  exchangeRate: "1260.2500",
  justification: "Renovación de notebooks fuera de garantía",
  invoiceNumber: null,
  notes: null,
  requestedById: "admin-2",
  requestedBy: { id: "admin-2", name: "Otra Admin" },
  authorizedById: null,
  authorizedBy: null,
  authorizedAt: null,
  orderedAt: null,
  receivedAt: null,
  items: [
    {
      id: "purchase-item-1",
      description: "Notebook Lenovo T14",
      quantity: 2,
      unitPrice: "1250.25",
      linkedAssetsCount: 0,
      linkedAssets: [],
    },
  ],
  createdAt: "2026-07-12T10:00:00.000Z",
  updatedAt: "2026-07-12T12:00:00.000Z",
};

function listResponse<T>(items: T[]) {
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

function installMocks(purchase: Purchase = basePurchase) {
  apiMock.get.mockImplementation((url: string) => {
    if (url === "/api/it/purchases")
      return Promise.resolve(listResponse([purchase]));
    if (url === "/api/it/suppliers")
      return Promise.resolve(listResponse([supplier]));
    if (url === "/api/it/purchases/lookups")
      return Promise.resolve({
        data: {
          success: true,
          data: {
            suppliers: [
              {
                id: supplier.id,
                name: supplier.name,
                categories: supplier.categories,
              },
            ],
          },
        },
      });
    if (url === `/api/it/purchases/${purchase.id}`)
      return Promise.resolve({
        data: { success: true, data: { purchase } },
      });
    if (url === `/api/it/suppliers/${supplier.id}`)
      return Promise.resolve({
        data: { success: true, data: { supplier } },
      });
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
  apiMock.post.mockImplementation((url: string) => {
    if (url === "/api/it/purchases")
      return Promise.resolve({
        data: { success: true, data: { purchase } },
      });
    if (url === "/api/it/suppliers")
      return Promise.resolve({
        data: { success: true, data: { supplier } },
      });
    return Promise.resolve({
      data: { success: true, data: { purchase } },
    });
  });
  apiMock.patch.mockResolvedValue({
    data: { success: true, data: { purchase } },
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const rendered = render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <ItPurchasesPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
  return { ...rendered, queryClient };
}

async function openPurchase() {
  await screen.findAllByText("OC-0042");
  await userEvent
    .setup()
    .click(screen.getAllByRole("button", { name: "Abrir OC-0042" })[0]);
  return screen.findByRole("dialog", { name: "Detalle de la orden" });
}

describe("ItPurchasesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.id = "admin-1";
    authMock.role = "ADMIN";
    installMocks();
  });

  it("renderiza órdenes y envía los filtros soportados", async () => {
    const user = userEvent.setup();
    renderPage();
    expect((await screen.findAllByText("OC-0042")).length).toBeGreaterThan(0);

    await user.type(screen.getByLabelText("Buscar"), "notebook");
    await user.selectOptions(screen.getByLabelText("Estado"), "REQUESTED");
    await user.selectOptions(screen.getByLabelText("Proveedor"), supplier.id);
    await user.selectOptions(screen.getByLabelText("Moneda"), "USD");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() =>
      expect(apiMock.get).toHaveBeenCalledWith("/api/it/purchases", {
        params: {
          q: "notebook",
          status: "REQUESTED",
          supplierId: supplier.id,
          currency: "USD",
          page: 1,
          pageSize: 10,
        },
      }),
    );
  });

  it("crea una solicitud preservando strings decimales", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText("OC-0042");
    await user.click(screen.getByRole("button", { name: "Nueva orden" }));
    const dialog = screen.getByRole("dialog", {
      name: "Nueva orden de compra",
    });
    await user.selectOptions(
      within(dialog).getByLabelText(/Proveedor/),
      supplier.id,
    );
    await user.selectOptions(within(dialog).getByLabelText("Moneda"), "USD");
    await user.type(within(dialog).getByLabelText(/Cotización/), "1260.2500");
    await user.type(
      within(dialog).getByLabelText("Justificación"),
      "Renovación por fin de garantía",
    );
    await user.type(
      within(dialog).getByLabelText("Descripción del item 1"),
      "Notebook Lenovo",
    );
    await user.type(
      within(dialog).getByLabelText("Precio unitario del item 1"),
      "1250.25",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Crear solicitud" }),
    );

    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith(
        "/api/it/purchases",
        expect.objectContaining({
          currency: "USD",
          exchangeRate: "1260.2500",
          justification: "Renovación por fin de garantía",
          items: [
            {
              description: "Notebook Lenovo",
              quantity: 1,
              unitPrice: "1250.25",
            },
          ],
        }),
      ),
    );
  });

  it("sólo ofrece autorizar a otro administrador", async () => {
    renderPage();
    let dialog = await openPurchase();
    expect(
      within(dialog).getByRole("button", { name: "Autorizar compra" }),
    ).toBeInTheDocument();

    within(dialog).getByRole("button", { name: "Cerrar" }).click();
    authMock.id = basePurchase.requestedById;
    await userEvent
      .setup()
      .click(screen.getAllByRole("button", { name: "Abrir OC-0042" })[0]);
    dialog = await screen.findByRole("dialog", { name: "Detalle de la orden" });
    expect(
      within(dialog).queryByRole("button", { name: "Autorizar compra" }),
    ).toBeNull();
    expect(
      within(dialog).getByText("Separación de funciones"),
    ).toBeInTheDocument();
  });

  it("permite a AGENT marcar una autorizada como pedida sin cancelar", async () => {
    authMock.role = "AGENT";
    const approved: Purchase = {
      ...basePurchase,
      status: "APPROVED",
      authorizedById: "admin-1",
      authorizedBy: { id: "admin-1", name: "Admin IT" },
    };
    vi.clearAllMocks();
    installMocks(approved);
    renderPage();
    const dialog = await openPurchase();
    expect(
      within(dialog).getByRole("button", { name: "Marcar como pedida" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: "Cancelar orden" }),
    ).toBeNull();
  });

  it("envía motivo al cancelar y la versión del snapshot", async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openPurchase();
    await user.click(
      within(dialog).getByRole("button", { name: "Cancelar orden" }),
    );
    await user.type(
      within(dialog).getByLabelText("Motivo de cancelación"),
      "Presupuesto rechazado",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Confirmar cancelación" }),
    );
    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith(
        `/api/it/purchases/${basePurchase.id}/cancel`,
        {
          expectedUpdatedAt: basePurchase.updatedAt,
          reason: "Presupuesto rechazado",
        },
      ),
    );
  });

  it("muestra recepción real y enlace contextual de alta", async () => {
    const received: Purchase = {
      ...basePurchase,
      status: "RECEIVED",
      receivedAt: "2026-07-13T12:00:00.000Z",
      items: [
        {
          ...basePurchase.items[0],
          linkedAssetsCount: 1,
          remainingQuantity: 1,
          linkedAssets: [{ id: "asset-1", assetTag: "NB-100" }],
        },
      ],
    };
    vi.clearAllMocks();
    installMocks(received);
    renderPage();
    const dialog = await openPurchase();
    expect(
      within(dialog).getByText("1 de 2 activos vinculados"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("link", { name: "Registrar activo" }),
    ).toHaveAttribute(
      "href",
      `/it/inventory?purchaseId=${received.id}&purchaseItemId=${received.items[0].id}`,
    );
    expect(
      within(dialog).getByText(/no crea activos automáticamente/i),
    ).toBeInTheDocument();
  });

  it("crea proveedores sin enviar isActive y filtra por categoría", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText("OC-0042");
    await user.click(screen.getByRole("tab", { name: /Proveedores/ }));
    await user.type(screen.getByLabelText("Categoría"), "hardware");
    await waitFor(() =>
      expect(apiMock.get).toHaveBeenCalledWith("/api/it/suppliers", {
        params: {
          q: undefined,
          category: "hardware",
          isActive: "true",
          page: 1,
          pageSize: 10,
        },
      }),
    );
    await user.click(screen.getByRole("button", { name: "Nuevo proveedor" }));
    const dialog = screen.getByRole("dialog", { name: "Nuevo proveedor" });
    await user.type(
      within(dialog).getByLabelText(/Razón social/),
      "Redes Patagónicas",
    );
    await user.type(
      within(dialog).getByLabelText(/Categorías/),
      "redes, hardware",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Crear proveedor" }),
    );
    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith(
        "/api/it/suppliers",
        expect.any(Object),
      ),
    );
    expect(apiMock.post.mock.calls.at(-1)?.[1]).not.toHaveProperty("isActive");
  });

  it("preserva borrador y expectedUpdatedAt ante refetch de caché", async () => {
    authMock.id = basePurchase.requestedById;
    const user = userEvent.setup();
    const { queryClient } = renderPage();
    const dialog = await openPurchase();
    const justification = within(dialog).getByLabelText("Justificación");
    await user.clear(justification);
    await user.type(justification, "Borrador local sin guardar");
    act(() => {
      queryClient.setQueryData(
        procurementKeys.purchaseDetail(basePurchase.id),
        {
          ...basePurchase,
          justification: "Versión externa",
          updatedAt: "2026-07-12T13:00:00.000Z",
        },
      );
    });
    expect(justification).toHaveValue("Borrador local sin guardar");
    await user.click(
      within(dialog).getByRole("button", { name: "Guardar cambios" }),
    );
    await waitFor(() => expect(apiMock.patch).toHaveBeenCalledTimes(1));
    expect(apiMock.patch.mock.calls[0][1]).toMatchObject({
      justification: "Borrador local sin guardar",
      expectedUpdatedAt: basePurchase.updatedAt,
    });
  });

  it("distingue conflictos exactos de otros 409", () => {
    expect(
      getProcurementErrorInfo({
        response: {
          status: 409,
          data: {
            error: {
              code: "PURCHASE_VERSION_CONFLICT",
              message: "La orden cambió.",
            },
          },
        },
      }),
    ).toMatchObject({ isPurchaseConflict: true, isSupplierConflict: false });
    expect(
      getProcurementErrorInfo({
        response: {
          status: 409,
          data: {
            error: {
              code: "PURCHASE_STATUS_INVALID",
              message: "Estado inválido",
            },
          },
        },
      }).isPurchaseConflict,
    ).toBe(false);
  });
});
