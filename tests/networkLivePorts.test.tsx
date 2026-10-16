import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PortPanel } from "../src/features/it/network-live/components/PortPanel";
import type { LivePort } from "../src/features/it/network-live/types";

const port = (key: string, position: number, overrides: Partial<LivePort> = {}): LivePort => ({
  key,
  name: `gigabitEthernet 1/0/${position}`,
  description: null,
  position,
  kind: "copper",
  adminUp: true,
  linkUp: true,
  speedMbps: 1000,
  fullDuplex: true,
  pvid: 200,
  neighbors: [],
  linkChangedAt: null,
  ...overrides,
});

describe("Red en vivo: PoE en el frente del switch", () => {
  it("marca el puerto que alimenta un equipo y dice cuánto entrega", () => {
    render(
      <PortPanel
        ports={[
          port("49153", 1, { poe: { status: "on", powerW: 3.6, class: 4 } }),
          port("49154", 2, { poe: { status: "off", powerW: null, class: null } }),
          port("49155", 3),
        ]}
        linkedPorts={new Map()}
        endpointsByPort={new Map()}
        selectedPort={null}
        onSelect={vi.fn()}
      />,
    );

    const powered = screen.getByRole("button", { name: /1\/0\/1:/ });
    expect(powered).toHaveAttribute("data-poe", "true");
    expect(powered).toHaveAccessibleName("Puerto gigabitEthernet 1/0/1: Cobre con enlace, 1 Gb/s, PoE 3,6 W");
    expect(powered).toHaveAttribute("title", "gigabitEthernet 1/0/1 · PoE 3,6 W");
    // Habilitado sin equipo o sin dato de PoE: sin marca.
    expect(screen.getByRole("button", { name: /1\/0\/2:/ })).not.toHaveAttribute("data-poe");
    expect(screen.getByRole("button", { name: /1\/0\/3:/ })).not.toHaveAttribute("data-poe");
  });
});
