import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

// El historial del puerto consulta la API: acá sólo importa la lista de equipos.
vi.mock("../src/features/it/network-live/components/RecentEvents", () => ({
  RecentEvents: () => null,
}));

import { PortDetail } from "../src/features/it/network-live/components/PortDetail";
import { WifiClients } from "../src/features/it/network-live/components/WifiClients";
import type {
  LiveDevice,
  LiveEndpoint,
  LivePort,
  LiveWifiClient,
} from "../src/features/it/network-live/types";

const now = new Date().toISOString();

const device = {
  id: "d1",
  collector: "red-colector-srvdatos",
  key: "10.0.0.13",
  source: "snmp",
  role: "access",
  name: "SWT-013",
  managementIp: "10.0.0.13",
  macAddress: null,
  vendor: "TP-Link",
  model: "TL-SG3428MP",
  firmware: null,
  serialNumber: null,
  uptimeSeconds: 3600,
  clients: null,
  status: "ok",
  lastError: null,
  lastPolledAt: now,
  lastOkAt: now,
  alertsMuted: false,
  poe: null,
  ports: [],
} as unknown as LiveDevice;

const port: LivePort = {
  key: "49164",
  name: "gigabitEthernet 1/0/12",
  description: null,
  position: 12,
  kind: "copper",
  adminUp: true,
  linkUp: true,
  speedMbps: 1000,
  fullDuplex: true,
  pvid: 200,
  neighbors: [],
  linkChangedAt: null,
};

const endpoint = (
  mac: string,
  overrides: Partial<LiveEndpoint> = {},
): LiveEndpoint => ({
  mac,
  deviceId: "d1",
  portKey: "49164",
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

const wifiClient = (
  mac: string,
  overrides: Partial<LiveWifiClient> = {},
): LiveWifiClient => ({
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

describe("Red en vivo: enlaces a la ficha del inventario", () => {
  it("el detalle del puerto lleva a la ficha de cada equipo que se reconoce", () => {
    render(
      <MemoryRouter>
        <PortDetail
          device={device}
          port={port}
          edge={undefined}
          endpoints={[
            endpoint("AA:BB:CC:00:00:01", {
              hostname: "NB-CONTABLE-07",
              asset: { id: "asset-7", assetTag: "NB-CONTABLE-07" },
            }),
            endpoint("AA:BB:CC:00:00:02", { hostname: "impresora-hp" }),
          ]}
          wifiByMac={new Map()}
          highlightMac={null}
          devices={new Map([[device.id, device]])}
          onGoTo={vi.fn()}
        />
      </MemoryRouter>,
    );

    const links = screen.getAllByRole("link", { name: /en el inventario/ });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName(
      "Ver NB-CONTABLE-07 en el inventario",
    );
    expect(links[0]).toHaveAttribute("href", "/it/inventory?activo=asset-7");
    const printer = screen
      .getByText("impresora-hp")
      .closest("li") as HTMLElement;
    expect(within(printer).queryByRole("link")).toBeNull();
  });

  it("los clientes Wi-Fi también llevan a su ficha", () => {
    render(
      <MemoryRouter>
        <WifiClients
          clients={[
            wifiClient("AA:BB:CC:00:00:04", {
              hostname: "notebook-ana",
              asset: { id: "asset-ana", assetTag: "NOTEBOOK-ANA" },
            }),
            wifiClient("AA:BB:CC:00:00:05", { hostname: "celular-deposito" }),
          ]}
          total={2}
          highlightMac={null}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: "Ver NOTEBOOK-ANA en el inventario" }),
    ).toHaveAttribute("href", "/it/inventory?activo=asset-ana");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});
