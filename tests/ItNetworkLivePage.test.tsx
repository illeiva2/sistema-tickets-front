import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../src/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const session = vi.hoisted(() => ({ role: "ADMIN" }));
vi.mock("../src/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1", role: session.role } }),
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

// React Flow necesita medir el DOM, que jsdom no tiene: el lienzo se prueba aparte (lógica pura).
// Acá sólo interesa qué le pasa la página: equipo y puerto elegidos, MAC y camino resaltados.
vi.mock("../src/features/it/network-live/components/LiveTopologyCanvas", () => ({
  LiveTopologyCanvas: ({
    topology,
    selectedId,
    selectedPort,
    highlight,
    highlightMac,
    alertIds,
  }: {
    topology: { devices: Map<string, { name: string }> };
    selectedId: string | null;
    selectedPort: string | null;
    highlight: { deviceIds: Set<string> } | null;
    highlightMac: string | null;
    alertIds: Set<string>;
  }) => (
    <div
      data-testid="lienzo"
      data-selected={selectedId ?? ""}
      data-port={selectedPort ?? ""}
      data-mac={highlightMac ?? ""}
      data-path={highlight ? [...highlight.deviceIds].sort().join(",") : ""}
      data-alerts={[...alertIds].sort().join(",")}
    >
      <ul aria-label="lienzo">
        {[...topology.devices.values()].map((device) => (
          <li key={device.name}>{device.name}</li>
        ))}
      </ul>
    </div>
  ),
}));

import toast from "react-hot-toast";
import api from "../src/lib/api";
import ItNetworkLivePage from "../src/pages/it/ItNetworkLivePage";

const apiMock = api as unknown as { get: ReturnType<typeof vi.fn>; patch: ReturnType<typeof vi.fn> };
const now = new Date().toISOString();
const threeHoursAgo = new Date(Date.now() - 3 * 3600_000).toISOString();

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
  alertsMuted: false,
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

const endpoint = (mac: string, portKey: string, overrides: Record<string, unknown> = {}) => ({
  mac,
  deviceId: "d1",
  portKey,
  vlan: 200,
  ip: null,
  hostname: null,
  viaDeviceId: null,
  shared: false,
  firstSeenAt: now,
  lastSeenAt: now,
  movedAt: null,
  agent: null,
  ...overrides,
});

const wifiClient = (mac: string, overrides: Record<string, unknown> = {}) => ({
  mac,
  apDeviceId: "ap",
  ssid: "GRF_Privado",
  band: "5",
  channel: 44,
  signal: -60,
  txKbps: 866700,
  rxKbps: 780000,
  uptimeSeconds: 3600,
  hostname: null,
  ip: null,
  vlan: 200,
  firstSeenAt: now,
  lastSeenAt: now,
  agent: null,
  ...overrides,
});

function liveView() {
  return {
    generatedAt: now,
    collectors: [
      { slug: "red-colector-srvdatos", version: "0.2.0", host: "SRV-DATOS", lastReceivedAt: now, devicesTotal: 2, devicesOk: 1, stale: false },
    ],
    devices: [
      { ...baseDevice, id: "d1", key: "10.0.0.3", role: "access", name: "SWITCH-CRS-TALLER", status: "ok", ports: [port("ether1", true), port("ether2", false)] },
      { ...baseDevice, id: "d2", key: "10.0.0.5", role: "access", name: "SWITCH-CRS-MOLINO", status: "down", lastError: "sin conexión con la API cifrada", ports: [] },
      { ...baseDevice, id: "ap", key: "ap-x", source: "unifi", role: "ap", name: "AP-010", status: "ok", clients: 4, ports: [] },
    ],
    links: [
      {
        id: "l1",
        a: { deviceId: "d1", ports: ["ether2"] },
        b: { deviceId: "ap", ports: ["eth0"] },
        source: "lldp",
        firstSeenAt: now,
        lastSeenAt: now,
      },
    ],
    endpoints: [
      endpoint("AA:BB:CC:00:00:01", "ether1", {
        ip: "192.168.100.41",
        hostname: "pc-jperez",
        agent: { id: "agent-1", hostname: "PC-JPEREZ", loggedInUser: "jperez", assetId: null },
      }),
      endpoint("AA:BB:CC:00:00:02", "ether2", { ip: "192.168.110.20", hostname: "notebook-ana", viaDeviceId: "ap" }),
      endpoint("AA:BB:CC:00:00:03", "ether1", { ip: "192.168.100.50" }),
    ],
    wifiClients: [
      wifiClient("AA:BB:CC:00:00:02", { hostname: "notebook-ana", ip: "192.168.110.20", signal: -82 }),
      // Sólo lo conoce UniFi: no está en las tablas MAC.
      wifiClient("AA:BB:CC:00:00:77", { hostname: "celular-deposito", ip: "192.168.110.77", signal: -58 }),
    ],
    alerts: [
      {
        id: "al-1",
        kind: "device_down",
        deviceId: "d2",
        openedAt: now,
        lastNotifiedAt: now,
        ticketId: "t-1",
        detail: "SWITCH-CRS-MOLINO no responde desde hace 5 min.",
      },
    ],
  };
}

const events = [
  {
    id: "e2",
    at: now,
    kind: "device_down",
    deviceId: "d2",
    portKey: null,
    macAddress: null,
    peerDeviceId: null,
    peerPortKey: null,
    detail: { error: "sin conexión con la API cifrada" },
    endpoint: null,
  },
  {
    id: "e1",
    at: now,
    kind: "endpoint_moved",
    deviceId: "d1",
    portKey: "ether1",
    macAddress: "AA:BB:CC:00:00:01",
    peerDeviceId: "d2",
    peerPortKey: "ether7",
    detail: { vlan: 200 },
    endpoint: { ip: "192.168.100.41", hostname: "pc-jperez", agent: { id: "agent-1", hostname: "PC-JPEREZ", loggedInUser: "jperez", assetId: null } },
  },
];

function mockApi(searchResults: unknown[] = []) {
  apiMock.get.mockImplementation((url: string, config?: { params?: { q?: string } }) =>
    Promise.resolve({
      data: {
        success: true,
        data: url.endsWith("/search")
          ? { query: config?.params?.q ?? "", results: searchResults }
          : url.endsWith("/events")
            ? { events, hasMore: false }
            : liveView(),
      },
    }),
  );
  apiMock.patch.mockResolvedValue({ data: { success: true, data: { id: "d2", name: "SWITCH-CRS-MOLINO", alertsMuted: true } } });
}

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
    session.role = "ADMIN";
  });

  it("muestra los avisos abiertos, marca el equipo y un ADMIN lo puede silenciar", async () => {
    mockApi();
    const user = userEvent.setup();
    renderPage();

    const alerts = await screen.findByLabelText("Avisos abiertos");
    expect(alerts).toHaveTextContent("1 aviso abierto");
    expect(alerts).toHaveTextContent("SWITCH-CRS-MOLINO no responde desde hace 5 min.");
    expect(alerts).toHaveTextContent("con ticket");
    expect(screen.getByTestId("lienzo")).toHaveAttribute("data-alerts", "d2");

    await user.click(screen.getByRole("button", { name: /Silenciar/ }));

    expect(apiMock.patch).toHaveBeenCalledWith("/api/it/network/live/devices/d2/alerts", { muted: true });
    expect(toast.success).toHaveBeenCalledWith("SWITCH-CRS-MOLINO: alertas silenciadas");
  });

  it("encuentra un cliente Wi-Fi que sólo conoce UniFi y lo muestra en su AP", async () => {
    mockApi();
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText("Buscar en la red"), "celular");
    const results = screen.getByLabelText("Resultados de la búsqueda");
    expect(results).toHaveTextContent("celular-deposito");
    expect(results).toHaveTextContent("Wi-Fi por AP-010");
    expect(results).toHaveTextContent("GRF_Privado · -58 dBm (buena)");

    await user.click(screen.getByRole("button", { name: /celular-deposito/ }));

    const canvas = screen.getByTestId("lienzo");
    expect(canvas).toHaveAttribute("data-selected", "ap");
    expect(canvas).toHaveAttribute("data-port", "");
    expect(canvas).toHaveAttribute("data-mac", "AA:BB:CC:00:00:77");
    expect(screen.getByRole("status")).toHaveTextContent("celular-deposito: Wi-Fi por AP-010 (GRF_Privado · 5 GHz · canal 44)");
  });

  it("un AGENT ve los avisos pero no los puede silenciar", async () => {
    session.role = "AGENT";
    mockApi();
    renderPage();

    expect(await screen.findByLabelText("Avisos abiertos")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Silenciar/ })).not.toBeInTheDocument();
  });

  it("el historial cuenta los cambios por día y lleva al diagrama", async () => {
    mockApi();
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("tab", { name: /Historial/ }));

    const history = await screen.findByLabelText("Historial de la red");
    expect(await screen.findByText("SWITCH-CRS-MOLINO dejó de responder")).toBeInTheDocument();
    expect(history).toHaveTextContent("Hoy");
    expect(history).toHaveTextContent("PC-JPEREZ cambió de lugar");
    expect(history).toHaveTextContent("de SWITCH-CRS-MOLINO · puerto ether7 a SWITCH-CRS-TALLER · puerto ether1");
    const call = apiMock.get.mock.calls.find((args) => args[0] === "/api/it/network/live/events");
    expect(call?.[1]).toMatchObject({ params: { limit: 200, since: expect.any(String) } });

    await user.click(screen.getByRole("button", { name: /PC-JPEREZ cambió de lugar/ }));

    const canvas = await screen.findByTestId("lienzo");
    expect(canvas).toHaveAttribute("data-selected", "d1");
    expect(canvas).toHaveAttribute("data-port", "ether1");
    expect(canvas).toHaveAttribute("data-mac", "AA:BB:CC:00:00:01");
    expect(screen.getByRole("status")).toHaveTextContent("PC-JPEREZ cambió de lugar");
  });

  it("muestra el resumen, el estado del colector y el diagrama", async () => {
    mockApi();

    renderPage();

    expect(await screen.findByRole("list", { name: "lienzo" })).toBeInTheDocument();
    expect(apiMock.get).toHaveBeenCalledWith("/api/it/network/live");
    expect(screen.getByText(/Colector SRV-DATOS/)).toBeInTheDocument();
    // Router y switches 1/2 (MOLINO no responde) y puertos con enlace 1/2.
    expect(screen.getAllByText("1/2", { selector: "strong" })).toHaveLength(2);
    expect(screen.getByText("4 clientes Wi-Fi · 1 con señal débil")).toBeInTheDocument();
    expect(screen.getByText("2 por cable · 1 Wi-Fi")).toBeInTheDocument();
    expect(screen.getByText("SWITCH-CRS-MOLINO", { selector: "small" })).toBeInTheDocument();
    expect(screen.getByLabelText("Buscar en la red")).toBeInTheDocument();
  });

  it("busca una PC por usuario, dice dónde está y resalta el camino", async () => {
    mockApi();
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText("Buscar en la red"), "jperez");
    const results = screen.getByLabelText("Resultados de la búsqueda");
    expect(results).toHaveTextContent("PC-JPEREZ");
    expect(results).toHaveTextContent("SWITCH-CRS-TALLER · puerto ether1");

    await user.click(screen.getByRole("button", { name: /PC-JPEREZ/ }));

    expect(screen.getByRole("status")).toHaveTextContent("PC-JPEREZ (usuario jperez): SWITCH-CRS-TALLER · puerto ether1");
    const canvas = screen.getByTestId("lienzo");
    expect(canvas).toHaveAttribute("data-selected", "d1");
    expect(canvas).toHaveAttribute("data-port", "ether1");
    expect(canvas).toHaveAttribute("data-mac", "AA:BB:CC:00:00:01");
    expect(canvas).toHaveAttribute("data-path", "d1");
    expect(screen.queryByLabelText("Resultados de la búsqueda")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Quitar el resaltado" }));
    expect(screen.getByTestId("lienzo")).toHaveAttribute("data-path", "");
  });

  it("ubica un cliente Wi-Fi en su AP y va directo si hay un solo resultado", async () => {
    mockApi();
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText("Buscar en la red"), "192.168.110.20{Enter}");

    expect(screen.getByRole("status")).toHaveTextContent(
      "notebook-ana: Wi-Fi por AP-010 (SWITCH-CRS-TALLER · puerto ether2)",
    );
    expect(screen.getByTestId("lienzo")).toHaveAttribute("data-path", "ap,d1");
    // Con un único resultado no hace falta el historial.
    expect(apiMock.get).not.toHaveBeenCalledWith("/api/it/network/live/search", expect.anything());
  });

  it("busca en el historial lo que ya no está conectado", async () => {
    mockApi([
      {
        ...endpoint("AA:BB:CC:00:00:09", "ether1", { hostname: "pc-contador", ip: "192.168.100.77", lastSeenAt: threeHoursAgo }),
        deviceName: "SWITCH-CRS-TALLER",
        deviceRole: "access",
        online: false,
      },
    ]);
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText("Buscar en la red"), "contador");
    expect(screen.getByText(/Nada conectado ahora coincide/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(await screen.findByText("En el historial")).toBeInTheDocument();
    expect(apiMock.get).toHaveBeenCalledWith("/api/it/network/live/search", { params: { q: "contador" } });
    expect(screen.getByLabelText("Resultados de la búsqueda")).toHaveTextContent("no se ve desde hace 3 h");

    await user.click(screen.getByRole("button", { name: /pc-contador/ }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "pc-contador no se ve desde hace 3 h. La última vez estaba en SWITCH-CRS-TALLER · puerto ether1.",
    );
    expect(screen.getByTestId("lienzo")).toHaveAttribute("data-port", "ether1");
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
