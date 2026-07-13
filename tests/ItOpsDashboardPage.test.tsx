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
      schemaVersion: "it-management-v2",
      generatedAt: "2026-07-12T12:00:00.000Z",
      counts: {
        people: { total: 90, active: 84 },
        assets: { total: 37, assigned: 22, inRepair: 3 },
        managedDevices: {
          total: 133,
          workstations: 48,
          phones: 22,
          networkInfrastructure: 23,
          cameras: 40,
        },
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
      coverage: {
        modules: {
          inventory: "available",
          people: "available",
          maintenance: "available",
          procurement: "available",
          network: "available",
          monitoring: "available",
          cameras: "limited",
          phoneLines: "preparing",
        },
        apiSurface: {
          overview: "available",
          crud: "assets,people,maintenances,procurement,network",
          agentGateway: "available",
          telemetry: "available",
          remoteControl: "available_direct_lan_vpn",
        },
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

  it("usa los conteos persistidos como fuente principal y muestra categorías disjuntas", async () => {
    apiMock.get.mockResolvedValueOnce(overviewResponse);

    renderDashboard();

    expect(screen.getByText("Lectura operativa real")).toBeInTheDocument();
    expect(screen.queryByText("Superficie declarada")).not.toBeInTheDocument();
    expect(screen.queryByText("225")).not.toBeInTheDocument();

    const totalCard = (await screen.findByText("Dispositivos gestionados"))
      .parentElement;
    expect(totalCard).not.toBeNull();
    expect(within(totalCard!).getByText("133")).toBeInTheDocument();

    const workstationsCard =
      screen.getByText("Puestos de trabajo").parentElement;
    expect(workstationsCard).not.toBeNull();
    expect(within(workstationsCard!).getByText("48")).toBeInTheDocument();

    const networkCard = screen.getByText(
      "Infraestructura de red",
    ).parentElement;
    expect(networkCard).not.toBeNull();
    expect(within(networkCard!).getByText("23")).toBeInTheDocument();

    const camerasCard = screen.getByText(
      "Inventario CCTV con cobertura básica",
    ).parentElement;
    expect(camerasCard).not.toBeNull();
    expect(within(camerasCard!).getByText("40")).toBeInTheDocument();

    expect(apiMock.get).toHaveBeenCalledWith("/api/it/overview");
  });

  it("refleja la disponibilidad real de módulos y sus límites", async () => {
    apiMock.get.mockResolvedValueOnce(overviewResponse);

    renderDashboard();

    const inventoryLink = screen.getByRole("link", { name: "Activos" });
    expect(inventoryLink).toHaveAttribute("href", "/it/inventory");
    expect(inventoryLink).toHaveAttribute("data-status", "available");
    expect(screen.getAllByText(/Abrir módulo · Disponible/i)).toHaveLength(6);

    const peopleLink = screen.getByRole("link", { name: "Personas" });
    expect(peopleLink).toHaveAttribute("data-status", "available");

    for (const moduleName of ["Mantenimiento", "Compras", "Red", "Monitoreo"]) {
      expect(screen.getByRole("link", { name: moduleName })).toHaveAttribute(
        "data-status",
        "available",
      );
    }

    const camerasLink = screen.getByRole("link", { name: "Cámaras" });
    expect(camerasLink).toHaveAttribute("data-status", "limited");
    expect(
      screen.getByText(/Abrir módulo · Cobertura básica/i),
    ).toBeInTheDocument();

    const phoneLinesLink = screen.getByRole("link", { name: "Líneas" });
    expect(phoneLinesLink).toHaveAttribute("data-status", "preparing");
    expect(screen.getAllByText(/Abrir módulo · En preparación/i).length).toBe(
      1,
    );

    expect(screen.getAllByText("Agentes en vivo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Directo por LAN/VPN").length).toBeGreaterThan(
      0,
    );
  });

  it("ofrece reintento sin recurrir a cifras manuales cuando falla el overview", async () => {
    apiMock.get.mockRejectedValueOnce(new Error("network error"));

    renderDashboard();

    expect(screen.queryByText("225")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByText("No se pudo leer el estado persistido"),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeEnabled();
  });
});
