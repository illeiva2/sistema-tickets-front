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
import {
  directHit,
  endpointTitle,
  endpointWhere,
  indexEndpoints,
  pathToRoot,
  searchLive,
} from "../src/features/it/network-live/endpoints";
import { dayLabel, describeEvent, groupByDay } from "../src/features/it/network-live/history";
import { bandLabel, indexWifi, rateLabel, signalQuality, wifiNetwork } from "../src/features/it/network-live/wifi";
import type {
  LiveDevice,
  LiveEndpoint,
  LiveEvent,
  LiveLink,
  LivePort,
  LiveWifiClient,
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
  alertsMuted: false,
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
    endpoints: [],
    wifiClients: [],
    alerts: [],
  };
}

const endpoint = (mac: string, deviceId: string, portKey: string, overrides: Partial<LiveEndpoint> = {}): LiveEndpoint => ({
  mac,
  deviceId,
  portKey,
  vlan: 200,
  ip: null,
  hostname: null,
  viaDeviceId: null,
  shared: false,
  firstSeenAt: new Date().toISOString(),
  lastSeenAt: new Date().toISOString(),
  movedAt: null,
  agent: null,
  ...overrides,
});

const endpointsFixture = () => [
  endpoint("AA:BB:CC:00:00:01", "s1", "ether11", { viaDeviceId: "ap-2", ip: "192.168.110.20", hostname: "notebook-ana" }),
  endpoint("AA:BB:CC:00:00:02", "s2", "5", {
    ip: "192.168.100.41",
    hostname: "pc-jperez",
    agent: { id: "a1", hostname: "PC-JPEREZ", loggedInUser: "jperez", assetId: null },
  }),
  endpoint("AA:BB:CC:00:00:03", "s2", "5", { ip: "192.168.100.4" }),
  endpoint("0C:C4:7A:12:34:56", "s1", "ether10"),
];

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

describe("Red en vivo: equipos finales", () => {
  it("nombra cada equipo por la PC del agente, el nombre DHCP, la IP o la MAC", () => {
    const [wifi, agent, onlyIp, bare] = endpointsFixture();
    expect(endpointTitle(agent)).toBe("PC-JPEREZ");
    expect(endpointTitle(wifi)).toBe("notebook-ana");
    expect(endpointTitle(onlyIp)).toBe("192.168.100.4");
    expect(endpointTitle(bare)).toBe("0C:C4:7A:12:34:56");
  });

  it("los agrupa por switch y puerto", () => {
    const index = indexEndpoints(endpointsFixture());
    expect(index.get("s2")?.get("5")?.map((item) => item.mac)).toEqual(["AA:BB:CC:00:00:02", "AA:BB:CC:00:00:03"]);
    expect(index.get("s1")?.get("ether11")).toHaveLength(1);
    expect(index.has("router")).toBe(false);
  });

  it("busca por usuario, nombre, IP y MAC en cualquier formato", () => {
    const view = fixture();
    const endpoints = endpointsFixture();
    const macs = (query: string) =>
      searchLive(view.devices, endpoints, query).map((hit) => (hit.kind === "endpoint" ? hit.endpoint.mac : hit.device.id));

    expect(macs("jperez")).toEqual(["AA:BB:CC:00:00:02"]);
    expect(macs("NOTEBOOK")).toEqual(["AA:BB:CC:00:00:01"]);
    // "192.168.100.4" también trae la .41 (prefijo), pero la exacta va primero.
    expect(macs("192.168.100.4")).toEqual(["AA:BB:CC:00:00:03", "AA:BB:CC:00:00:02"]);
    expect(macs("192.168.100.41")).toEqual(["AA:BB:CC:00:00:02"]);
    expect(macs("0cc4.7a12.3456")).toEqual(["0C:C4:7A:12:34:56"]);
    expect(macs("0c-c4-7a")).toEqual(["0C:C4:7A:12:34:56"]);
    expect(macs("taller")).toEqual(["s1"]);
    expect(macs("x")).toEqual([]);
  });

  it("al confirmar va directo al único resultado o a la única coincidencia exacta", () => {
    const view = fixture();
    const endpoints = endpointsFixture();
    const direct = (query: string) => {
      const hit = directHit(searchLive(view.devices, endpoints, query));
      return hit ? (hit.kind === "endpoint" ? hit.endpoint.mac : hit.device.id) : null;
    };
    expect(direct("192.168.100.4")).toBe("AA:BB:CC:00:00:03");
    expect(direct("pc-jperez")).toBe("AA:BB:CC:00:00:02");
    expect(direct("AA:BB:CC")).toBeNull();
    expect(direct("SWT")).toBeNull();
  });

  it("dice dónde está, también si es un cliente Wi-Fi", () => {
    const topology = buildTopology(fixture());
    const [wifi, agent] = endpointsFixture();
    expect(endpointWhere(agent, topology.devices)).toBe("SWT-007 · puerto 5");
    expect(endpointWhere(wifi, topology.devices)).toBe("Wi-Fi por AP-2 (SWITCH-CRS-TALLER · puerto ether11)");
    expect(endpointWhere({ ...agent, deviceId: "gone" }, topology.devices, "SWITCH-VIEJO")).toBe("SWITCH-VIEJO · puerto 5");
  });

  it("arma el camino hasta el router desde el AP y el switch", () => {
    const topology = buildTopology(fixture());
    const path = pathToRoot(topology, "ap-2", "s1");
    expect([...path.deviceIds].sort()).toEqual(["ap-2", "core", "router", "s1"]);
    expect([...path.edgeIds].sort()).toEqual(["l1", "l2", "l5"]);
    expect([...pathToRoot(topology, "lost").deviceIds]).toEqual(["lost"]);
  });
});

describe("Red en vivo: Wi-Fi", () => {
  const client = (mac: string, overrides: Partial<LiveWifiClient> = {}): LiveWifiClient => ({
    mac,
    apDeviceId: "ap-2",
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
    firstSeenAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    agent: null,
    ...overrides,
  });

  it("califica la señal, nombra la banda y la velocidad", () => {
    expect([-50, -55, -60, -67, -70, -75, -76, -90].map((dbm) => signalQuality(dbm)?.label)).toEqual([
      "excelente",
      "excelente",
      "buena",
      "buena",
      "regular",
      "regular",
      "débil",
      "débil",
    ]);
    expect(signalQuality(null)).toBeNull();
    expect(bandLabel("2.4")).toBe("2,4 GHz");
    expect(rateLabel(866700)).toBe("867 Mb/s");
    expect(rateLabel(6500)).toBe("6,5 Mb/s");
    expect(wifiNetwork(client("a"))).toBe("GRF_Privado · 5 GHz · canal 44");
  });

  it("agrupa por AP de mejor a peor señal", () => {
    const { byAp, byMac } = indexWifi([client("A", { signal: -80 }), client("B", { signal: -50 }), client("C", { apDeviceId: "ap-1" })]);
    expect(byAp.get("ap-2")?.map((item) => item.mac)).toEqual(["B", "A"]);
    expect(byAp.get("ap-1")).toHaveLength(1);
    expect(byMac.get("A")?.signal).toBe(-80);
  });

  it("la búsqueda encuentra a los clientes Wi-Fi que no están en las tablas MAC, sin repetir los que sí", () => {
    const view = fixture();
    const endpoints = endpointsFixture();
    const wifi = [
      client("AA:BB:CC:00:00:01", { hostname: "notebook-ana" }),
      client("AA:BB:CC:00:00:77", { hostname: "celular-depósito", ip: "192.168.80.12" }),
    ];
    const found = (query: string) =>
      searchLive(view.devices, endpoints, query, wifi).map((hit) =>
        hit.kind === "wifi" ? `wifi:${hit.client.mac}` : hit.kind === "endpoint" ? hit.endpoint.mac : hit.device.id,
      );
    expect(found("notebook")).toEqual(["AA:BB:CC:00:00:01"]);
    expect(found("celular")).toEqual(["wifi:AA:BB:CC:00:00:77"]);
    expect(found("192.168.80.12")).toEqual(["wifi:AA:BB:CC:00:00:77"]);
    expect(directHit(searchLive(view.devices, endpoints, "celular-depósito", wifi))?.kind).toBe("wifi");
  });
});

describe("Red en vivo: historial", () => {
  const event = (overrides: Partial<LiveEvent>): LiveEvent => ({
    id: "e",
    at: "2026-10-12T15:00:00.000Z",
    kind: "device_down",
    deviceId: null,
    portKey: null,
    macAddress: null,
    peerDeviceId: null,
    peerPortKey: null,
    detail: null,
    endpoint: null,
    ...overrides,
  });
  const devices = buildTopology(fixture()).devices;

  it("cuenta cada cambio en castellano, con su tono y a dónde lleva", () => {
    expect(describeEvent(event({ kind: "device_down", deviceId: "s1", detail: { error: "timeout" } }), devices)).toMatchObject({
      tone: "bad",
      title: "SWITCH-CRS-TALLER dejó de responder",
      place: "timeout",
      deviceId: "s1",
    });
    expect(describeEvent(event({ kind: "device_down", deviceId: "ap-1" }), devices).title).toBe("AP-1 se desconectó del controlador");
    expect(describeEvent(event({ kind: "device_up", deviceId: "s1", detail: { restarted: true } }), devices).title).toBe(
      "SWITCH-CRS-TALLER volvió a responder (se reinició)",
    );
    expect(
      describeEvent(event({ kind: "port_speed", deviceId: "s1", portKey: "ether10", detail: { name: "ether10", from: 1000, to: 100 } }), devices),
    ).toMatchObject({ tone: "warn", title: "Puerto ether10: de 1 Gb/s a 100 Mb/s", place: "SWITCH-CRS-TALLER", portKey: "ether10" });
    expect(describeEvent(event({ kind: "port_down", deviceId: "s1", portKey: "ether10", detail: { name: "ether10" } }), devices).tone).toBe("off");
    expect(
      describeEvent(event({ kind: "link_new", deviceId: "core", portKey: "lag130", peerDeviceId: "s1", peerPortKey: "sfp-sfpplus1+sfp-sfpplus2", detail: { source: "fdb" } }), devices),
    ).toMatchObject({
      title: "Conexión nueva: SWT-FO01 (LAG 130) ↔ SWITCH-CRS-TALLER (sfp-sfpplus1+sfp-sfpplus2)",
      place: "deducida de las tablas MAC",
    });
    expect(
      describeEvent(event({ kind: "endpoint_new", deviceId: "s1", portKey: "ether11", macAddress: "AA:BB:CC:00:00:09", detail: { viaDeviceId: "ap-2" } }), devices),
    ).toMatchObject({ title: "Equipo nuevo en la red: AA:BB:CC:00:00:09", place: "Wi-Fi por AP-2", mac: "AA:BB:CC:00:00:09" });
    expect(describeEvent(event({ kind: "collector_back", detail: { silentMinutes: 12 } }), devices)).toMatchObject({
      tone: "good",
      deviceId: null,
      place: "estuvo 12 min sin mandar",
    });
    expect(describeEvent(event({ kind: "device_new", deviceId: "no-existe" }), devices).title).toBe(
      "un equipo que ya no informa: equipo de red nuevo",
    );
  });

  it("agrupa por día: hoy, ayer y después la fecha", () => {
    const now = new Date(2026, 9, 12, 18, 0);
    const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 0).toISOString();
    const groups = groupByDay(
      [event({ id: "a", at: at(12, 9) }), event({ id: "b", at: at(12, 1) }), event({ id: "c", at: at(11, 23) }), event({ id: "d", at: at(9, 10) })],
      now,
    );
    expect(groups.map((group) => [group.day.split(" ")[0], group.events.map((item) => item.id)])).toEqual([
      ["Hoy", ["a", "b"]],
      ["Ayer", ["c"]],
      [dayLabel(at(9, 10), now).split(" ")[0], ["d"]],
    ]);
    expect(dayLabel(at(9, 10), now)).not.toBe("Ayer");
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
