import { describe, expect, it } from "vitest";
import {
  formatSpeed,
  linkPortLabel,
  portBlocks,
  portLabel,
  portTone,
} from "../src/features/it/network-live/ports";
import { buildTopology, wanLabel } from "../src/features/it/network-live/topology";
import { layoutTopology } from "../src/features/it/network-live/layout";
import type {
  LiveDevice,
  LiveLink,
  LivePort,
  NetworkLiveView,
} from "../src/features/it/network-live/types";

const port = (key: string, overrides: Partial<LivePort> = {}): LivePort => ({
  key,
  name: key,
  description: null,
  position: 1,
  kind: "copper",
  adminUp: true,
  linkUp: true,
  speedMbps: 1000,
  fullDuplex: true,
  pvid: null,
  neighbors: [],
  linkChangedAt: null,
  ...overrides,
});

const device = (id: string, role: string, overrides: Partial<LiveDevice> = {}): LiveDevice => ({
  id,
  collector: "red",
  key: id,
  source: "routeros",
  role,
  name: id,
  managementIp: null,
  macAddress: null,
  vendor: null,
  model: null,
  firmware: null,
  serialNumber: null,
  uptimeSeconds: null,
  clients: null,
  status: "ok",
  lastError: null,
  lastPolledAt: new Date().toISOString(),
  lastOkAt: new Date().toISOString(),
  ports: [],
  ...overrides,
});

const link = (id: string, a: string, aPorts: string[], b: string, bPorts: string[], source = "fdb"): LiveLink => ({
  id,
  a: { deviceId: a, ports: aPorts },
  b: { deviceId: b, ports: bPorts },
  source,
  firstSeenAt: new Date().toISOString(),
  lastSeenAt: new Date().toISOString(),
});

function fixture(): NetworkLiveView {
  return {
    generatedAt: new Date().toISOString(),
    collectors: [],
    devices: [
      device("ap-2", "ap", { name: "AP-2", source: "unifi", ports: [port("eth0")] }),
      device("router", "router", {
        name: "RB_MainRouter",
        ports: [
          port("ether1", { name: "ether1-LAN" }),
          port("ether2", { name: "ether2-WAN-EPEC", linkUp: false, speedMbps: null }),
          port("ether3", { name: "ether3-STARLINK", adminUp: false, linkUp: false }),
          port("ether4", { name: "ether4-WAN TELECOM" }),
          port("sfp-sfpplus1", { name: "sfp1-wan", kind: "sfpplus" }),
        ],
      }),
      device("core", "core", { name: "SWT-FO01", source: "snmp", ports: [port("24", { position: 24, kind: "sfp" })] }),
      device("s1", "access", {
        name: "SWITCH-CRS-TALLER",
        ports: [port("ether10"), port("ether11"), port("sfp-sfpplus1", { kind: "sfpplus" }), port("sfp-sfpplus2", { kind: "sfpplus" })],
      }),
      device("s2", "access", { name: "SWT-007", source: "snmp", ports: [port("26", { position: 26, kind: "sfp" })] }),
      device("ap-1", "ap", { name: "AP-1", source: "unifi", ports: [port("eth0")] }),
      device("ap-3", "ap", { name: "AP-3", source: "unifi", ports: [port("eth0")] }),
      device("lost", "access", { name: "Switch suelto", status: "down" }),
    ],
    links: [
      link("l1", "router", ["ether1"], "core", ["24"]),
      link("l2", "core", ["lag130"], "s1", ["sfp-sfpplus1", "sfp-sfpplus2"]),
      link("l3", "core", ["lag136"], "s2", ["26"]),
      link("l4", "s1", ["ether10"], "ap-1", ["eth0"], "lldp"),
      link("l5", "ap-2", ["eth0"], "s1", ["ether11"], "lldp"),
      link("l6", "s2", ["1"], "ap-3", ["eth0"], "lldp"),
      link("l7", "router", ["ether9"], "s2", ["2"]),
    ],
  };
}

describe("Red en vivo: puertos", () => {
  it("rotula con el número de fábrica en MikroTik y la posición en SNMP", () => {
    expect(portLabel({ key: "ether10", position: 10, kind: "copper" })).toBe("10");
    expect(portLabel({ key: "sfp-sfpplus1", position: 201, kind: "sfpplus" })).toBe("S1");
    expect(portLabel({ key: "combo2", position: 2, kind: "combo" })).toBe("C2");
    expect(portLabel({ key: "49154", position: 2, kind: "copper" })).toBe("2");
  });

  it("colorea por estado y marca lo que anda a menos de 1 Gb/s", () => {
    expect(portTone(port("a"))).toBe("up");
    expect(portTone(port("a", { kind: "sfp" }))).toBe("up-fiber");
    expect(portTone(port("a", { speedMbps: 100 }))).toBe("slow");
    expect(portTone(port("a", { linkUp: false, speedMbps: null }))).toBe("down");
    expect(portTone(port("a", { adminUp: false, linkUp: false }))).toBe("disabled");
  });

  it("formatea velocidades", () => {
    expect(formatSpeed(1000)).toBe("1 Gb/s");
    expect(formatSpeed(2500)).toBe("2,5 Gb/s");
    expect(formatSpeed(100)).toBe("100 Mb/s");
    expect(formatSpeed(null)).toBe("—");
  });

  it("arma el frente: cobre en dos filas si son más de 8, fibra aparte", () => {
    const ports = [
      ...Array.from({ length: 24 }, (_, index) => port(`ether${index + 1}`, { position: index + 1 })),
      port("sfp-sfpplus1", { kind: "sfpplus", position: 201 }),
      port("sfp-sfpplus2", { kind: "sfpplus", position: 202 }),
    ];
    const blocks = portBlocks(ports);
    expect(blocks.map((block) => [block.id, block.rows, block.ports.length])).toEqual([
      ["copper", 2, 24],
      ["fiber", 1, 2],
    ]);
  });

  it("muestra los agregados no detallados como LAG", () => {
    expect(linkPortLabel(undefined, "lag130")).toBe("LAG 130");
  });
});

describe("Red en vivo: árbol", () => {
  it("cuelga todo del router, deja aparte lo que no tiene enlaces y detecta las WAN", () => {
    const topology = buildTopology(fixture());
    expect(topology.rootIds).toEqual(["router"]);
    expect(topology.parent.get("core")).toBe("router");
    expect(topology.parent.get("s1")).toBe("core");
    expect(topology.parent.get("ap-2")).toBe("s1");
    expect(topology.children.get("s1")).toEqual(["ap-1", "ap-2"]);
    expect(topology.unplaced).toEqual(["lost"]);
    // s2 cuelga del router por l7 (se recorre a lo ancho) y el enlace por el núcleo queda como redundante.
    expect(topology.parent.get("s2")).toBe("router");
    expect(topology.extraEdges.map((edge) => edge.id)).toEqual(["l3"]);
    expect(topology.wans.map((wan) => [wan.label, wan.port.linkUp])).toEqual([
      ["WAN-EPEC", false],
      ["WAN TELECOM", true],
      ["sfp1-wan", true],
    ]);
  });

  it("calcula la velocidad y la cantidad de enlaces de cada tramo", () => {
    const topology = buildTopology(fixture());
    const trunk = topology.edges.find((edge) => edge.id === "l2")!;
    expect(trunk.parentId).toBe("core");
    expect(trunk.members).toBe(2);
    expect(trunk.speedMbps).toBe(1000);
    expect(trunk.up).toBe(true);
  });

  it("nombra las WAN sin el prefijo del puerto", () => {
    expect(wanLabel({ name: "ether4-WAN TELECOM", description: null })).toBe("WAN TELECOM");
    expect(wanLabel({ name: "sfp1-wan", description: null })).toBe("sfp1-wan");
    expect(wanLabel({ name: "sfp1-wan", description: "Fibra EPEC" })).toBe("Fibra EPEC");
  });
});

describe("Red en vivo: diagramado", () => {
  it("no superpone equipos, apila los APs de un switch y pone las WAN arriba", () => {
    const topology = buildTopology(fixture());
    const size = (id: string) => (id.startsWith("wan:") ? { width: 160, height: 40 } : { width: 200, height: 70 });
    const layout = layoutTopology(topology, size);
    const boxes = [...layout.positions.entries()].map(([id, point]) => ({ id, ...point, ...size(id) }));
    for (const a of boxes) {
      for (const b of boxes) {
        if (a.id >= b.id) continue;
        const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
        expect(overlap, `${a.id} se superpone con ${b.id}`).toBe(false);
      }
    }
    expect(layout.stacked.has("ap-1")).toBe(true);
    expect(layout.positions.get("ap-1")!.x).toBe(layout.positions.get("ap-2")!.x);
    expect(layout.positions.get("ap-2")!.y).toBeGreaterThan(layout.positions.get("ap-1")!.y);
    const router = layout.positions.get("router")!;
    for (const wan of topology.wans) {
      expect(layout.positions.get(wan.id)!.y).toBeLessThan(router.y);
    }
    expect(layout.positions.get("lost")!.y).toBeGreaterThan(layout.positions.get("ap-2")!.y);
  });
});
