import { describe, expect, it } from "vitest";
import { buildInventoryCsv } from "../src/features/it/live/inventoryExport";
import type { AgentInventoryExportRow } from "../src/features/it/live/types";

const gib = 1024 ** 3;

const row: AgentInventoryExportRow = {
  id: "agent-1",
  hostname: "NB-CONTABLE-07",
  state: "ONLINE",
  connState: "ONLINE",
  isActive: true,
  lastSeenAt: "2026-10-11T15:04:00.000Z",
  loggedInUser: "GRF\\ana.perez",
  primaryIp: "10.0.0.25",
  primaryMac: "AA:BB:CC:DD:EE:FF",
  osName: "Windows 11 Pro",
  osVersion: "24H2",
  osBuild: "26100.4061",
  agentVersion: "0.3.0",
  ramTotalMb: 32 * 1024,
  vncRunning: false,
  sshRunning: false,
  updatedAt: "2026-10-11T15:04:00.000Z",
  asset: { id: "asset-1", assetTag: "NB-107" },
  inventoryAt: "2026-10-11T12:00:00.000Z",
  hardware: {
    manufacturer: "LENOVO",
    model: "ThinkBook 16 G8 IRL (21SH)",
    serialNumber: "PW0ABCDE",
    chassisType: "NOTEBOOK",
    baseboardManufacturer: "LENOVO",
    baseboardModel: "LNVNB161216",
  },
  cpu: { model: "Intel Core Ultra 7 255H", cores: 16, logicalProcessors: 16 },
  memoryModules: [
    { capacityBytes: 16 * gib, memoryType: "DDR5", speedMts: 5600 },
    { capacityBytes: 16 * gib, memoryType: "DDR5", speedMts: 5600 },
  ],
  memorySlots: 2,
  physicalDisks: [
    {
      model: "Micron MTFDKCD512QGN",
      sizeBytes: 512_110_190_592,
      mediaType: "SSD",
      busType: "NVME",
    },
    {
      model: "INTEL SSDPEKNU020TZ",
      sizeBytes: 2_048_408_248_320,
      mediaType: "SSD",
      busType: "NVME",
    },
  ],
  volumes: [{ name: "C:\\", totalBytes: 500 * gib, usedBytes: 125 * gib }],
};

function parse(csv: string) {
  const [header, ...rows] = csv.split("\r\n");
  const columns = header.split(";");
  return rows.map((line) => {
    const cells = line.split(";");
    return (name: string) => {
      const index = columns.indexOf(name);
      if (index < 0) throw new Error(`Columna inexistente: ${name}`);
      return cells[index];
    };
  });
}

describe("planilla del relevamiento de equipos", () => {
  it("arma una fila legible para Excel en castellano", () => {
    const [cell] = parse(buildInventoryCsv([row]));
    expect(cell("Equipo")).toBe("NB-CONTABLE-07");
    expect(cell("Estado")).toBe("En línea");
    expect(cell("Usuario")).toBe("GRF\\ana.perez");
    expect(cell("Sistema operativo")).toBe("Windows 11 Pro");
    expect(cell("Build")).toBe("26100.4061");
    expect(cell("Modelo")).toBe("ThinkBook 16 G8 IRL (21SH)");
    expect(cell("Tipo de equipo")).toBe("Notebook");
    expect(cell("Placa base")).toBe("LENOVO LNVNB161216");
    expect(cell("Núcleos")).toBe("16");
    expect(cell("RAM (GB)")).toBe("32,0");
    expect(cell("Módulos de RAM")).toBe("16 GB DDR5-5600 + 16 GB DDR5-5600");
    expect(cell("Ranuras de RAM (usadas/total)")).toBe("2/2");
    // Capacidad nominal, como en la etiqueta del disco.
    expect(cell("Discos")).toBe(
      "SSD NVMe Micron MTFDKCD512QGN 512 GB + SSD NVMe INTEL SSDPEKNU020TZ 2 TB",
    );
    expect(cell("Unidades")).toBe("C: 125 de 500 GB (25 %)");
    expect(cell("Libre en C: (GB)")).toBe("375,0");
    expect(cell("Activo")).toBe("NB-107");
  });

  it("marca revocados, deja vacío lo no informado y neutraliza fórmulas", () => {
    const [cell] = parse(
      buildInventoryCsv([
        {
          ...row,
          isActive: false,
          state: "OFFLINE",
          loggedInUser: '=HYPERLINK("http://x")',
          ramTotalMb: null,
          asset: null,
          inventoryAt: null,
          hardware: null,
          cpu: null,
          memoryModules: null,
          memorySlots: null,
          physicalDisks: null,
          volumes: null,
        },
      ]),
    );
    expect(cell("Estado")).toBe("Revocado");
    expect(cell("Usuario")).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(cell("Fabricante")).toBe("");
    expect(cell("RAM (GB)")).toBe("");
    expect(cell("Ranuras de RAM (usadas/total)")).toBe("");
    expect(cell("Discos")).toBe("");
    expect(cell("Inventario del")).toBe("");
  });
});
