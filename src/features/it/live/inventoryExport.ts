/**
 * Planilla del relevamiento de equipos: una fila por PC con el último
 * inventario que informó su agente. Reusa el CSV del laboratorio (separador
 * `;`, BOM UTF-8 y coma decimal), que es lo que Excel en es-AR abre bien.
 *
 * Incluye el usuario logueado de cada equipo: es información personal y la
 * planilla se trata como tal (el back deja auditado quién la descargó).
 */
import {
  exportarCsv,
  toCsv,
  type ColumnaCsv,
} from "@/features/lab/export";
import { fetchAgentInventoryExport } from "./api";
import { chassisTypeLabel, diskKindLabel } from "./inventoryLabels";
import type { AgentInventoryExportRow } from "./types";

type UnknownRecord = Record<string, unknown>;

const GIB = 1024 ** 3;

const STATE_LABELS: Record<string, string> = {
  ONLINE: "En línea",
  STALE: "Demorado",
  OFFLINE: "Sin conexión",
};

const decimal = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function number(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function records(value: unknown): UnknownRecord[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is UnknownRecord =>
          item !== null && typeof item === "object" && !Array.isArray(item),
      )
    : [];
}

/** dd/mm/aaaa hh:mm en hora local: así Excel lo reconoce como fecha y hora. */
function dateTime(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** Capacidad nominal, como en la etiqueta del disco (512 GB, 2 TB). */
function nominalSize(bytes: number | undefined): string | undefined {
  if (bytes === undefined || bytes <= 0) return undefined;
  const gb = bytes / 1e9;
  return gb >= 1000
    ? `${decimal.format(Math.round(gb / 100) / 10)} TB`
    : `${decimal.format(Math.round(gb))} GB`;
}

function memoryModule(module: UnknownRecord): string | undefined {
  const capacity = number(module.capacityBytes);
  const type = text(module.memoryType);
  const speed = number(module.speedMts);
  const parts = [
    capacity ? `${decimal.format(capacity / GIB)} GB` : undefined,
    // DDR4-3200: la forma en que se compran los módulos.
    type && speed ? `${type}-${speed}` : type,
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : undefined;
}

function physicalDisk(disk: UnknownRecord): string | undefined {
  const parts = [
    diskKindLabel(disk.mediaType, disk.busType),
    text(disk.model),
    nominalSize(number(disk.sizeBytes)),
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : undefined;
}

function volume(item: UnknownRecord): string | undefined {
  const name = text(item.name)?.replace(/[\\/]+$/, "");
  const total = number(item.totalBytes);
  const used = number(item.usedBytes);
  if (!name || !total) return name;
  const usedPct = used === undefined ? "" : ` (${Math.round((used / total) * 100)} %)`;
  return `${name} ${decimal.format((used ?? 0) / GIB)} de ${decimal.format(
    total / GIB,
  )} GB${usedPct}`;
}

function systemDriveFreeGb(row: AgentInventoryExportRow): number | undefined {
  const system = records(row.volumes).find((item) =>
    /^c:/i.test(text(item.name) ?? ""),
  );
  const total = number(system?.totalBytes);
  const used = number(system?.usedBytes);
  return total !== undefined && used !== undefined
    ? Math.max(total - used, 0) / GIB
    : undefined;
}

function ramGb(row: AgentInventoryExportRow): number | undefined {
  if (row.ramTotalMb != null && row.ramTotalMb > 0) return row.ramTotalMb / 1024;
  const fromModules = records(row.memoryModules).reduce(
    (total, module) => total + (number(module.capacityBytes) ?? 0),
    0,
  );
  return fromModules > 0 ? fromModules / GIB : undefined;
}

function joinItems(
  items: UnknownRecord[],
  format: (item: UnknownRecord) => string | undefined,
): string | undefined {
  const values = items.map(format).filter(Boolean);
  return values.length ? values.join(" + ") : undefined;
}

const hardware = (row: AgentInventoryExportRow) => row.hardware ?? {};
const cpu = (row: AgentInventoryExportRow) => row.cpu ?? {};

export const INVENTORY_COLUMNS: ColumnaCsv<AgentInventoryExportRow>[] = [
  { header: "Equipo", value: (row) => row.hostname },
  {
    header: "Estado",
    value: (row) =>
      row.isActive ? (STATE_LABELS[row.state] ?? row.state) : "Revocado",
  },
  { header: "Último contacto", value: (row) => dateTime(row.lastSeenAt) },
  { header: "Usuario", value: (row) => row.loggedInUser },
  { header: "IP", value: (row) => row.primaryIp },
  { header: "MAC", value: (row) => row.primaryMac },
  { header: "Sistema operativo", value: (row) => row.osName },
  { header: "Versión", value: (row) => row.osVersion },
  { header: "Build", value: (row) => row.osBuild },
  { header: "Agente", value: (row) => row.agentVersion },
  { header: "Fabricante", value: (row) => text(hardware(row).manufacturer) },
  { header: "Modelo", value: (row) => text(hardware(row).model) },
  { header: "N.º de serie", value: (row) => text(hardware(row).serialNumber) },
  {
    header: "Tipo de equipo",
    value: (row) => chassisTypeLabel(hardware(row).chassisType),
  },
  {
    header: "Placa base",
    value: (row) =>
      [
        text(hardware(row).baseboardManufacturer),
        text(hardware(row).baseboardModel),
      ]
        .filter(Boolean)
        .join(" ") || undefined,
  },
  {
    header: "Serie de la placa",
    value: (row) => text(hardware(row).baseboardSerial),
  },
  { header: "BIOS", value: (row) => text(hardware(row).biosVersion) },
  { header: "Procesador", value: (row) => text(cpu(row).model) },
  { header: "Núcleos", value: (row) => number(cpu(row).cores), decimals: 0 },
  {
    header: "Hilos",
    value: (row) => number(cpu(row).logicalProcessors),
    decimals: 0,
  },
  { header: "RAM (GB)", value: ramGb, decimals: 1 },
  {
    header: "Módulos de RAM",
    value: (row) => joinItems(records(row.memoryModules), memoryModule),
  },
  {
    header: "Ranuras de RAM (usadas/total)",
    value: (row) => {
      const used = records(row.memoryModules).length;
      if (!used) return undefined;
      return row.memorySlots ? `${used}/${row.memorySlots}` : String(used);
    },
  },
  {
    header: "Discos",
    value: (row) => joinItems(records(row.physicalDisks), physicalDisk),
  },
  {
    header: "Unidades",
    value: (row) => joinItems(records(row.volumes), volume),
  },
  { header: "Libre en C: (GB)", value: systemDriveFreeGb, decimals: 1 },
  { header: "Activo", value: (row) => row.asset?.assetTag },
  { header: "Inventario del", value: (row) => dateTime(row.inventoryAt) },
];

export function buildInventoryCsv(rows: AgentInventoryExportRow[]): string {
  return toCsv(rows, INVENTORY_COLUMNS);
}

/** Descarga la planilla y devuelve la cantidad de equipos exportados. */
export async function exportAgentInventory(): Promise<number> {
  const { items } = await fetchAgentInventoryExport();
  exportarCsv(items, INVENTORY_COLUMNS, "relevamiento_equipos");
  return items.length;
}
