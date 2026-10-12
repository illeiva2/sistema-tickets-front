import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../src/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

// React Flow necesita medir el DOM, que jsdom no tiene: el lienzo se prueba aparte (lógica pura).
vi.mock("../src/features/it/network-live/components/LiveTopologyCanvas", () => ({
  LiveTopologyCanvas: ({ topology }: { topology: { devices: Map<string, { name: string }> } }) => (
    <ul aria-label="lienzo">
      {[...topology.devices.values()].map((device) => (
        <li key={device.name}>{device.name}</li>
      ))}
    </ul>
  ),
}));

import api from "../src/lib/api";
import ItNetworkLivePage from "../src/pages/it/ItNetworkLivePage";

const apiMock = api as unknown as { get: ReturnType<typeof vi.fn> };
const now = new Date().toISOString();

const baseDevice = {
  collector: "red-colector-srvdatos",
  source: "routeros",
  managementIp: "10.0.0.3",
  macAddress: null,
  vendor: "MikroTik",
  model: "CRS326-24G-2S+",
  firmware: "RouterOS 6.47.4",
  serialNumber: null,
  uptimeSeconds: 3600,
  clients: null,
  lastError: null,
  lastPolledAt: now,
  lastOkAt: now,
};

const port = (key: string, linkUp: boolean) => ({
  key,
  name: key,
  description: null,
  position: 1,
  kind: "copper",
  adminUp: true,
  linkUp,
  speedMbps: linkUp ? 1000 : null,
  fullDuplex: linkUp ? true : null,
  pvid: 200,
  neighbors: [],
  linkChangedAt: null,
});

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ItNetworkLivePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ItNetworkLivePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra el resumen, el estado del colector y el diagrama", async () => {
    apiMock.get.mockResolvedValue({
      data: {
        success: true,
        data: {
          generatedAt: now,
          collectors: [
            { slug: "red-colector-srvdatos", version: "0.1.0", host: "SRV-DATOS", lastReceivedAt: now, devicesTotal: 2, devicesOk: 1, stale: false },
          ],
          devices: [
            { ...baseDevice, id: "d1", key: "10.0.0.3", role: "access", name: "SWITCH-CRS-TALLER", status: "ok", ports: [port("ether1", true), port("ether2", false)] },
            { ...baseDevice, id: "d2", key: "10.0.0.5", role: "access", name: "SWITCH-CRS-MOLINO", status: "down", lastError: "sin conexión con la API cifrada", ports: [] },
            { ...baseDevice, id: "ap", key: "ap-x", source: "unifi", role: "ap", name: "AP-010", status: "ok", clients: 4, ports: [] },
          ],
          links: [],
        },
      },
    });

    renderPage();

    expect(await screen.findByRole("list", { name: "lienzo" })).toBeInTheDocument();
    expect(apiMock.get).toHaveBeenCalledWith("/api/it/network/live");
    expect(screen.getByText(/Colector SRV-DATOS/)).toBeInTheDocument();
    // Router y switches 1/2 (MOLINO no responde) y puertos con enlace 1/2.
    expect(screen.getAllByText("1/2", { selector: "strong" })).toHaveLength(2);
    expect(screen.getByText("4 clientes Wi-Fi")).toBeInTheDocument();
    expect(screen.getByText("SWITCH-CRS-MOLINO", { selector: "small" })).toBeInTheDocument();
    expect(screen.getByLabelText("Buscar equipo de red")).toBeInTheDocument();
  });

  it("explica qué falta cuando el colector todavía no envió nada", async () => {
    apiMock.get.mockResolvedValue({
      data: { success: true, data: { generatedAt: now, collectors: [], devices: [], links: [] } },
    });

    renderPage();

    expect(await screen.findByText("Todavía no llegó ningún envío del colector")).toBeInTheDocument();
    expect(screen.getByText("Sin datos del colector")).toBeInTheDocument();
  });

  it("muestra el error y permite reintentar", async () => {
    apiMock.get.mockRejectedValue({ response: { data: { error: { message: "Permisos insuficientes" } } } });

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Permisos insuficientes");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});
