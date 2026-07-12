import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/api", () => ({
  default: { get: vi.fn() },
}));

import { ItOpsDashboardPage } from "../src/features/it/ItOpsDashboardPage";
import api from "../src/lib/api";

const apiMock = api as unknown as { get: ReturnType<typeof vi.fn> };

const overviewResponse = {
  data: {
    success: true,
    data: {
      schemaVersion: "it-management-v1",
      generatedAt: "2026-07-12T12:00:00.000Z",
      counts: {
        people: { total: 90, active: 84 },
        assets: { total: 37, assigned: 22, inRepair: 3 },
        assetAssignments: { active: 22 },
        maintenances: { open: 4 },
        suppliers: { active: 6 },
        purchases: { pendingApproval: 2 },
        phoneLines: { total: 18, inUse: 15 },
        sites: { active: 1 },
        networkDevices: { total: 25, active: 21 },
        agentDevices: { total: 8, online: 5 },
        remoteSessions: { active: 0 },
      },
    },
  },
};

const renderDashboard = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ItOpsDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("ItOpsDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mantiene el baseline y muestra los conteos persistidos por separado", async () => {
    apiMock.get.mockResolvedValueOnce(overviewResponse);

    renderDashboard();

    expect(screen.getByText("Superficie declarada")).toBeInTheDocument();
    expect(screen.getByText("Activos declarados")).toBeInTheDocument();
    expect(screen.getByText("225")).toBeInTheDocument();

    const assetsCard = (await screen.findByText("Activos registrados"))
      .parentElement;
    expect(assetsCard).not.toBeNull();
    expect(within(assetsCard!).getByText("37")).toBeInTheDocument();

    const networkCard = screen.getByText("Red activa").parentElement;
    expect(networkCard).not.toBeNull();
    expect(within(networkCard!).getByText("21/25")).toBeInTheDocument();

    expect(apiMock.get).toHaveBeenCalledWith("/api/it/overview");
  });

  it("marca inventario disponible y mantiene los demás módulos en preparación", async () => {
    apiMock.get.mockResolvedValueOnce(overviewResponse);

    renderDashboard();

    const inventoryLink = screen.getByRole("link", { name: "Activos" });
    expect(inventoryLink).toHaveAttribute("href", "/it/inventory");
    expect(inventoryLink).toHaveAttribute("data-status", "available");
    expect(screen.getByText(/Abrir módulo · Disponible/i)).toBeInTheDocument();

    const peopleLink = screen.getByRole("link", { name: "Personas" });
    expect(peopleLink).toHaveAttribute("data-status", "preparing");
    expect(
      screen.getAllByText(/Abrir módulo · En preparación/i).length,
    ).toBeGreaterThan(0);
  });

  it("conserva el baseline y ofrece reintento cuando falla el overview", async () => {
    apiMock.get.mockRejectedValueOnce(new Error("network error"));

    renderDashboard();

    expect(screen.getByText("Superficie declarada")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByText("No se pudo leer el estado persistido"),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled();
  });
});
