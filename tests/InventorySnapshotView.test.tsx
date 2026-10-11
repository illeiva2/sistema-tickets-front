import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  InventorySnapshotView,
  formatInventoryBytes,
  parseInventorySnapshot,
  sanitizeInventoryPayload,
  suggestAssetFromInventory,
} from "../src/features/it/live/components/InventorySnapshotView";

const gib = 1024 ** 3;

describe("InventorySnapshotView", () => {
  it("presenta el inventario del agente en secciones legibles", () => {
    const { container } = render(
      <InventorySnapshotView
        payload={{
          collectedAt: "2026-07-13T15:00:00.000Z",
          hardware: {
            manufacturer: "Dell",
            model: "Latitude 5440",
            serialNumber: "GRF-ABC-123",
            biosVersion: "1.22.0",
          },
          cpu: {
            model: "Intel Core i5-1345U",
            cores: 10,
            logicalProcessors: 12,
          },
          memoryModules: [
            {
              capacityBytes: 16 * gib,
              manufacturer: "Kingston",
              partNumber: "KVR16",
            },
          ],
          disks: [{ name: "C:", model: "NVMe", totalBytes: 512 * gib }],
          networkAdapters: [
            {
              name: "Ethernet 1",
              macAddress: "AA:BB:CC:DD:EE:FF",
              ipAddresses: ["10.20.30.41", "fe80::1"],
            },
          ],
          software: [
            { name: "UltraVNC", version: "1.4.3", publisher: "uvnc bvba" },
          ],
          customTelemetry: {
            firmwareChannel: "Stable",
            nested: { privateKey: "never-render-private-key" },
          },
          apiToken: "never-render-token",
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Hardware" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Procesador" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Módulos de memoria" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Discos" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Adaptadores de red" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Software instalado" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Otros datos" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Latitude 5440")).toBeInTheDocument();
    expect(screen.getByText("Intel Core i5-1345U")).toBeInTheDocument();
    expect(screen.getByText("16 GB")).toBeInTheDocument();
    expect(screen.getByText("512 GB")).toBeInTheDocument();
    expect(screen.getByText("UltraVNC")).toBeInTheDocument();
    expect(screen.getByText("Stable")).toBeInTheDocument();
    expect(container).not.toHaveTextContent("never-render-private-key");
    expect(container).not.toHaveTextContent("never-render-token");
    expect(container.textContent).not.toContain('{"');
  });

  it("muestra discos físicos, unidades y el detalle de RAM del agente 0.3", () => {
    const { container } = render(
      <InventorySnapshotView
        payload={{
          hardware: {
            manufacturer: "LENOVO",
            model: "ThinkBook 16 G8 IRL (21SH)",
            serialNumber: "PW0ABCDE",
            chassisType: "NOTEBOOK",
            baseboardModel: "LNVNB161216",
          },
          memoryModules: [
            {
              slot: "DIMM0",
              capacityBytes: 16 * gib,
              memoryType: "DDR5",
              speedMts: 5600,
              formFactor: "SODIMM",
            },
            {
              slot: "DIMM1",
              capacityBytes: 16 * gib,
              memoryType: "DDR5",
              speedMts: 5600,
              formFactor: "SODIMM",
            },
          ],
          memorySlots: 4,
          physicalDisks: [
            {
              model: "Micron MTFDKCD512QGN",
              sizeBytes: 512 * gib,
              mediaType: "SSD",
              busType: "NVME",
            },
          ],
          volumes: [{ name: "C:\\", totalBytes: 400 * gib, usedBytes: 100 * gib }],
        }}
      />,
    );

    expect(screen.getByText("Notebook")).toBeInTheDocument();
    expect(screen.getByText("LNVNB161216")).toBeInTheDocument();
    expect(screen.getByText("2 de 4 ranuras ocupadas")).toBeInTheDocument();
    expect(screen.getAllByText("5.600 MT/s")).toHaveLength(2);
    expect(screen.getAllByText("SO-DIMM (notebook)")).toHaveLength(2);
    expect(screen.getByText("NVMe")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Unidades" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "C:" })).toBeInTheDocument();
    expect(screen.getByText("300 GB")).toBeInTheDocument();
    expect(screen.getByText("25 %")).toBeInTheDocument();
    // Las ranuras y las unidades tienen su lugar: no caen en "Otros datos".
    expect(container).not.toHaveTextContent("Otros datos");
  });

  it("sugiere el disco con su tipo y usa la placa base en PCs armadas", () => {
    expect(
      suggestAssetFromInventory({
        hardware: {
          baseboardManufacturer: "ASUSTeK COMPUTER INC.",
          baseboardModel: "PRIME H510M-E",
          baseboardSerial: "MB-123",
        },
        physicalDisks: [
          {
            model: "Kingston SA400S37480G",
            sizeBytes: 480 * 1e9,
            mediaType: "SSD",
            busType: "SATA",
          },
        ],
      }),
    ).toMatchObject({
      brand: "ASUSTeK COMPUTER INC.",
      model: "PRIME H510M-E",
      serialNumber: "MB-123",
      storage: "SSD SATA · Kingston SA400S37480G · 447,03 GB",
    });
  });

  it("tolera snapshots vacíos, valores no estándar y referencias circulares", () => {
    const circular: Record<string, unknown> = { label: "Dato recuperable" };
    circular.self = circular;

    const { rerender } = render(<InventorySnapshotView payload={{}} />);
    expect(
      screen.getByText(
        "No hay datos estructurados disponibles en este snapshot.",
      ),
    ).toBeInTheDocument();

    rerender(
      <InventorySnapshotView
        payload={{ cpu: null, diagnostic: circular, password: "oculta" }}
      />,
    );
    expect(screen.getByText("Dato recuperable")).toBeInTheDocument();
    expect(screen.getByText("Valor circular omitido")).toBeInTheDocument();
    expect(screen.queryByText("oculta")).not.toBeInTheDocument();
  });

  it("genera una sugerencia patrimonial segura desde la telemetría", () => {
    const payload = {
      hardware: {
        manufacturer: "Lenovo",
        model: "ThinkPad T14",
        serialNumber: "PF-1234",
      },
      cpu: { model: "AMD Ryzen 7 PRO" },
      memoryModules: [{ capacityBytes: 8 * gib }, { capacityBytes: 16 * gib }],
      disks: [{ model: "Samsung NVMe", sizeGb: 512 }],
      networkAdapters: [
        { macAddress: "11:22:33:44:55:66", credential: "oculta" },
      ],
      os: { name: "Windows 11 Pro", version: "24H2" },
    };

    expect(suggestAssetFromInventory(payload)).toEqual({
      brand: "Lenovo",
      model: "ThinkPad T14",
      serialNumber: "PF-1234",
      cpu: "AMD Ryzen 7 PRO",
      ramGb: 24,
      storage: "Samsung NVMe · 512 GB",
      os: "Windows 11 Pro · 24H2",
      mac: "11:22:33:44:55:66",
    });
    expect(formatInventoryBytes(1536)).toBe("1,5 KB");
    expect(parseInventorySnapshot(payload).isEmpty).toBe(false);
    expect(sanitizeInventoryPayload(payload)).not.toHaveProperty(
      "networkAdapters.0.credential",
    );
  });
});
