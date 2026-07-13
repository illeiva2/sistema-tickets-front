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
  role: "ADMIN" as "ADMIN" | "AGENT" | "USER",
}));
vi.mock("../src/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "it-1",
      name: "IT",
      email: "it@grf.com.ar",
      role: authMock.role,
    },
    isLoading: false,
  }),
}));

import api from "../src/lib/api";
import type {
  AgentDevice,
  AgentEnrollmentToken,
  RemoteSession,
} from "../src/features/it/live/types";
import { liveDeviceKeys } from "../src/features/it/live/useLiveDevices";
import ItLiveDevicesPage from "../src/pages/it/ItLiveDevicesPage";

const apiMock = api as unknown as Record<
  "get" | "post" | "patch",
  ReturnType<typeof vi.fn>
>;

const device: AgentDevice = {
  id: "agent-1",
  machineId: "machine-guid-1",
  hostname: "PC-CONTABLE-01",
  agentVersion: "0.1.0",
  osName: "Windows 11 Pro",
  osVersion: "10.0.26100",
  state: "ONLINE",
  connState: "ONLINE",
  lastSeenAt: "2026-07-13T11:59:30.000Z",
  lastEnrolledAt: "2026-07-12T10:00:00.000Z",
  loggedInUser: "GRF\\mlopez",
  primaryIp: "10.20.30.41",
  primaryMac: "AA:BB:CC:DD:EE:01",
  uptimeSec: 185400,
  cpuPct: 42,
  ramUsedMb: 8192,
  ramTotalMb: 16384,
  batteryPct: 68,
  batteryCharging: false,
  vncRunning: true,
  sshRunning: true,
  isActive: true,
  assetId: null,
  asset: null,
  recentMetrics: [
    {
      id: "metric-1",
      cpuPct: 42,
      ramUsedMb: 8192,
      diskUsedPct: 64,
      batteryPct: 68,
      sampledAt: "2026-07-13T11:55:00.000Z",
    },
  ],
  latestSnapshot: {
    id: "snapshot-1",
    payload: {},
    createdAt: "2026-07-13T11:50:00.000Z",
  },
  activeSessions: [],
  updatedAt: "2026-07-13T12:00:00.000Z",
};
const secondDevice: AgentDevice = {
  ...device,
  id: "agent-2",
  machineId: "machine-guid-2",
  hostname: "NB-GERENCIA-02",
  state: "STALE",
  lastSeenAt: "2026-07-13T11:55:00.000Z",
  batteryPct: 12,
  cpuPct: 94,
  sshRunning: false,
  updatedAt: "2026-07-13T11:55:00.000Z",
};
const token: AgentEnrollmentToken = {
  id: "token-1",
  label: "Lote Contaduría",
  expiresAt: "2026-07-14T12:00:00.000Z",
  status: "AVAILABLE",
  createdAt: "2026-07-13T12:00:00.000Z",
};
const session: RemoteSession = {
  id: "session-1",
  deviceId: device.id,
  protocol: "SSH",
  status: "ACTIVE",
  targetHost: device.primaryIp,
  startedAt: "2026-07-13T12:01:00.000Z",
};

function list(items: AgentDevice[]) {
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

function installMocks() {
  apiMock.get.mockImplementation((url: string) => {
    if (url === "/api/it/agents/devices")
      return Promise.resolve(list([device, secondDevice]));
    if (url === "/api/it/agents/lookups")
      return Promise.resolve({
        data: {
          success: true,
          data: {
            assets: [
              {
                id: "asset-2",
                assetTag: "NB-002",
                type: "NOTEBOOK",
                brand: "Lenovo",
                model: "T14",
                status: "IN_STOCK",
              },
            ],
          },
        },
      });
    if (url === `/api/it/agents/devices/${device.id}`)
      return Promise.resolve({ data: { success: true, data: { device } } });
    if (url === `/api/it/agents/devices/${device.id}/metrics`)
      return Promise.resolve({
        data: { success: true, data: { items: device.recentMetrics } },
      });
    if (url === `/api/it/agents/devices/${device.id}/snapshots`)
      return Promise.resolve({
        data: {
          success: true,
          data: {
            items: [
              {
                id: "snapshot-1",
                deviceId: device.id,
                createdAt: "2026-07-13T11:50:00.000Z",
                payload: {
                  cpu: "Intel Core i5",
                  ramSlots: 2,
                  disks: [{ model: "NVMe", sizeGb: 512 }],
                  network: {
                    adapter: "Intel I219",
                    password: "never-render-this-secret",
                  },
                },
              },
            ],
            pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
          },
        },
      });
    if (url === "/api/it/agents/enrollment-tokens")
      return Promise.resolve({
        data: { success: true, data: { items: [token] } },
      });
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
  apiMock.post.mockImplementation((url: string) => {
    if (url === "/api/it/agents/enrollment-tokens")
      return Promise.resolve({
        data: {
          success: true,
          data: { token, plainToken: "enroll-once-secret" },
        },
      });
    if (url === `/api/it/agents/devices/${device.id}/remote-sessions`)
      return Promise.resolve({
        data: {
          success: true,
          data: {
            session,
            connection: {
              protocol: "SSH",
              target: device.primaryIp,
              port: 22,
              uri: `ssh://${device.primaryIp}:22`,
              scope: "DIRECT",
              requiresNetworkReachability: true,
              warning: "Requiere alcance directo de red.",
            },
          },
        },
      });
    if (url === `/api/it/agents/remote-sessions/${session.id}/close`)
      return Promise.resolve({
        data: {
          success: true,
          data: {
            session: {
              ...session,
              status: "CLOSED",
              endedAt: "2026-07-13T12:10:00.000Z",
            },
          },
        },
      });
    if (url.endsWith("/activate") || url.endsWith("/revoke"))
      return Promise.resolve({ data: { success: true, data: { device } } });
    return Promise.resolve({
      data: { success: true, data: { revoked: true } },
    });
  });
  apiMock.patch.mockResolvedValue({
    data: {
      success: true,
      data: {
        device: {
          ...device,
          assetId: "asset-2",
          updatedAt: "2026-07-13T12:02:00.000Z",
        },
      },
    },
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return {
    ...render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <ItLiveDevicesPage />
        </QueryClientProvider>
      </MemoryRouter>,
    ),
    queryClient,
  };
}

async function openDevice(user = userEvent.setup()) {
  await screen.findAllByText(device.hostname);
  await user.click(
    screen.getAllByRole("button", { name: `Abrir ${device.hostname}` })[0],
  );
  return screen.findByRole("dialog", { name: device.hostname });
}

describe("ItLiveDevicesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.role = "ADMIN";
    installMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("muestra salud de flota y envía filtros de señal", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(
      (await screen.findAllByText(device.hostname)).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Degradados")).toBeInTheDocument();
    expect(screen.getByText("Batería baja")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Buscar"), "contable");
    await user.selectOptions(screen.getByLabelText("Señal"), "STALE");
    await user.selectOptions(screen.getByLabelText("Agente"), "false");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    await waitFor(() =>
      expect(apiMock.get).toHaveBeenCalledWith("/api/it/agents/devices", {
        params: {
          q: "contable",
          state: "STALE",
          isActive: "false",
          page: 1,
          pageSize: 10,
        },
      }),
    );
  });

  it("permite pausar indefinidamente y refrescar de forma manual", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText(device.hostname);
    await user.click(
      screen.getByRole("button", { name: "Pausar actualización" }),
    );
    expect(screen.getByRole("button", { name: "Reanudar" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByText("Actualización automática pausada"),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Actualizar telemetría ahora" }),
    );
    await waitFor(() =>
      expect(
        apiMock.get.mock.calls.filter(
          ([url]) => url === "/api/it/agents/devices",
        ).length,
      ).toBeGreaterThan(2),
    );
  });

  it("AGENT genera un token sin enviar expiresAt y copia el secreto una sola vez", async () => {
    authMock.role = "AGENT";
    const user = userEvent.setup();
    const clipboardWrite = vi.spyOn(navigator.clipboard, "writeText");
    renderPage();
    await screen.findAllByText(device.hostname);
    await user.click(screen.getByRole("button", { name: "Enrolar equipos" }));
    const dialog = screen.getByRole("dialog", {
      name: "Tokens de enrolamiento",
    });
    await user.type(within(dialog).getByLabelText("Etiqueta"), "Lote Sistemas");
    await user.click(
      within(dialog).getByRole("button", { name: "Generar token" }),
    );
    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith(
        "/api/it/agents/enrollment-tokens",
        { label: "Lote Sistemas" },
      ),
    );
    expect(within(dialog).getByLabelText("Token generado")).toHaveValue(
      "enroll-once-secret",
    );
    await user.click(within(dialog).getByRole("button", { name: "Copiar" }));
    await waitFor(() =>
      expect(clipboardWrite).toHaveBeenCalledWith("enroll-once-secret"),
    );
  });

  it("registra intento SSH directo, copia comando sin password y cierra el registro", async () => {
    const user = userEvent.setup();
    const clipboardWrite = vi.spyOn(navigator.clipboard, "writeText");
    renderPage();
    const dialog = await openDevice(user);
    await user.click(
      within(dialog).getByRole("button", { name: "Registrar intento SSH" }),
    );
    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith(
        `/api/it/agents/devices/${device.id}/remote-sessions`,
        { protocol: "SSH" },
      ),
    );
    expect(
      within(dialog).getByText(/no confirma que el cliente se haya conectado/i),
    ).toBeInTheDocument();
    expect(
      within(dialog).getAllByText(/requiere alcance de red/i).length,
    ).toBeGreaterThan(0);
    expect(
      within(dialog).getByLabelText("URI o comando de conexión"),
    ).toHaveValue(`ssh -p 22 ${device.primaryIp}`);
    await user.click(within(dialog).getByRole("button", { name: "Copiar" }));
    await waitFor(() =>
      expect(clipboardWrite).toHaveBeenCalledWith(
        `ssh -p 22 ${device.primaryIp}`,
      ),
    );
    const copiedValue = clipboardWrite.mock.calls.at(-1)?.[0];
    expect(copiedValue).not.toMatch(/password|clave/i);
    await user.click(
      within(dialog).getAllByRole("button", { name: "Cerrar registro" })[0],
    );
    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith(
        `/api/it/agents/remote-sessions/${session.id}/close`,
      ),
    );
  });

  it("preserva el activo elegido durante polling y usa la versión CAS más nueva", async () => {
    const user = userEvent.setup();
    const { queryClient } = renderPage();
    const dialog = await openDevice(user);
    const asset = within(dialog).getByLabelText("Activo patrimonial");
    await user.selectOptions(asset, "asset-2");
    act(() =>
      queryClient.setQueryData(liveDeviceKeys.detail(device.id), {
        ...device,
        cpuPct: 55,
        updatedAt: "2026-07-13T12:05:00.000Z",
      }),
    );
    expect(asset).toHaveValue("asset-2");
    await user.click(
      within(dialog).getByRole("button", { name: "Confirmar vínculo" }),
    );
    await waitFor(() =>
      expect(apiMock.patch).toHaveBeenCalledWith(
        `/api/it/agents/devices/${device.id}`,
        { expectedUpdatedAt: "2026-07-13T12:05:00.000Z", assetId: "asset-2" },
      ),
    );
    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringMatching(/vincular NB-002/i),
    );
  });

  it("bloquea el borrador si otro operador cambia el vínculo patrimonial", async () => {
    const user = userEvent.setup();
    const { queryClient } = renderPage();
    const dialog = await openDevice(user);
    const asset = within(dialog).getByLabelText("Activo patrimonial");
    await user.selectOptions(asset, "asset-2");
    act(() =>
      queryClient.setQueryData(liveDeviceKeys.detail(device.id), {
        ...device,
        assetId: "asset-remote",
        updatedAt: "2026-07-13T12:06:00.000Z",
      }),
    );
    expect(asset).toHaveValue("asset-2");
    expect(
      await within(dialog).findByText(
        /vínculo patrimonial cambió mientras editabas/i,
      ),
    ).toBeInTheDocument();
    expect(asset).toBeDisabled();
    expect(
      within(dialog).getByRole("button", { name: "Confirmar vínculo" }),
    ).toBeDisabled();
    expect(apiMock.patch).not.toHaveBeenCalled();
  });

  it("oculta secretos anidados del inventario reportado", async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openDevice(user);
    expect(dialog.textContent).not.toContain("never-render-this-secret");
    expect(dialog.textContent).toContain("[dato oculto]");
  });

  it("oculta controles de gestión a perfiles fuera de IT", async () => {
    authMock.role = "USER";
    renderPage();
    await screen.findAllByText(device.hostname);
    expect(
      screen.queryByRole("button", { name: "Enrolar equipos" }),
    ).toBeNull();
    const dialog = await openDevice();
    expect(
      within(dialog).queryByRole("button", { name: "Confirmar vínculo" }),
    ).toBeNull();
    expect(
      within(dialog).queryByRole("button", { name: "Revocar agente" }),
    ).toBeNull();
    expect(
      within(dialog).queryByRole("button", {
        name: "Registrar intento SSH",
      }),
    ).toBeNull();
    expect(
      within(dialog).queryByRole("button", { name: "Cerrar registro" }),
    ).toBeNull();
  });
});
