import type { AssignAssetPayload } from "../inventory/custody/types";
import type {
  AssetCreatePayload,
  AssetSpecs,
  AssetType,
} from "../inventory/types";
import type { AgentDevice } from "./types";

export interface AgentAssetOnboardingFormValues {
  type: AssetType;
  brand: string;
  model: string;
  serialNumber: string;
  assetTag: string;
  location: string;
  cpu: string;
  ramGb: string;
  storage: string;
  os: string;
  mac: string;
  notes: string;
  personId: string;
  departmentId: string;
  custodyNote: string;
}

export interface AgentAssetOnboardingSubmission {
  asset: AssetCreatePayload;
  custody?: AssignAssetPayload;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function firstText(...values: unknown[]): string {
  return values.map(cleanText).find(Boolean) ?? "";
}

function finiteNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value;
}

function inventoryFromPayload(payload?: UnknownRecord | null): UnknownRecord {
  if (!payload) return {};
  return asRecord(payload.inventory) ?? payload;
}

function decimal(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatCapacity(bytes: number): string {
  if (bytes >= 1024 ** 4) return `${decimal(bytes / 1024 ** 4)} TB`;
  if (bytes >= 1024 ** 3) return `${decimal(bytes / 1024 ** 3)} GB`;
  if (bytes >= 1024 ** 2) return `${decimal(bytes / 1024 ** 2)} MB`;
  return `${Math.round(bytes)} B`;
}

function formatDisk(value: unknown): string {
  if (typeof value === "string") return value.trim();
  const disk = asRecord(value);
  if (!disk) return "";

  const labelParts = [
    firstText(disk.name, disk.device, disk.mountPoint),
    firstText(disk.model, disk.description),
    firstText(disk.mediaType, disk.type),
  ].filter((part, index, parts) => part && parts.indexOf(part) === index);
  const totalBytes =
    finiteNumber(disk.totalBytes) ??
    finiteNumber(disk.sizeBytes) ??
    finiteNumber(disk.capacityBytes);
  const sizeGb = finiteNumber(disk.sizeGb);
  const capacity =
    totalBytes !== undefined
      ? formatCapacity(totalBytes)
      : sizeGb !== undefined
        ? `${decimal(sizeGb)} GB`
        : "";

  return [...labelParts, capacity].filter(Boolean).join(" · ");
}

function storageFromInventory(
  inventory: UnknownRecord,
  payload?: UnknownRecord | null,
): string {
  const disks = asArray(inventory.disks).length
    ? asArray(inventory.disks)
    : asArray(payload?.disks);
  return disks.map(formatDisk).filter(Boolean).join("; ");
}

function ramGbFromInventory(
  device: AgentDevice,
  inventory: UnknownRecord,
): string {
  if (device.ramTotalMb != null && device.ramTotalMb >= 0)
    return decimal(device.ramTotalMb / 1024);

  const directMb = finiteNumber(inventory.ramTotalMb);
  if (directMb !== undefined && directMb >= 0) return decimal(directMb / 1024);

  const ram = asRecord(inventory.ram);
  const directBytes = finiteNumber(ram?.totalBytes);
  if (directBytes !== undefined && directBytes >= 0)
    return decimal(directBytes / 1024 ** 3);

  const moduleBytes = asArray(inventory.memoryModules).reduce<number>(
    (total, item) => {
      const capacity = finiteNumber(asRecord(item)?.capacityBytes);
      return total + (capacity && capacity > 0 ? capacity : 0);
    },
    0,
  );
  return moduleBytes > 0 ? decimal(moduleBytes / 1024 ** 3) : "";
}

function osFromDevice(device: AgentDevice, inventory: UnknownRecord): string {
  const inventoryOs = asRecord(inventory.os);
  const name = firstText(device.osName, inventoryOs?.name, inventory.osName);
  const version = firstText(
    device.osVersion,
    inventoryOs?.version,
    inventoryOs?.build,
    inventory.osVersion,
  );
  if (!name) return version;
  if (
    !version ||
    name.toLocaleLowerCase().includes(version.toLocaleLowerCase())
  )
    return name;
  return `${name} · ${version}`;
}

function macFromInventory(
  device: AgentDevice,
  inventory: UnknownRecord,
): string {
  if (device.primaryMac) return device.primaryMac;
  const adapterMac = asArray(inventory.networkAdapters)
    .map((adapter) => cleanText(asRecord(adapter)?.macAddress))
    .find(Boolean);
  const listedMac = asArray(inventory.macAddresses)
    .map(cleanText)
    .find(Boolean);
  return firstText(inventory.primaryMac, adapterMac, listedMac);
}

function inferredType(
  device: AgentDevice,
  inventory: UnknownRecord,
  payload?: UnknownRecord | null,
): AssetType {
  const os = osFromDevice(device, inventory);
  if (/\b(server|servidor)\b/i.test(os)) return "SERVER";

  const payloadBattery = asRecord(payload?.battery);
  const inventoryBattery = asRecord(inventory.battery);
  const hasBattery =
    device.batteryPct != null ||
    device.batteryCharging != null ||
    payloadBattery !== undefined ||
    inventoryBattery !== undefined;
  return hasBattery ? "NOTEBOOK" : "DESKTOP";
}

export function mapAgentToAssetOnboardingForm(
  device: AgentDevice,
  latestSnapshotPayload?: UnknownRecord | null,
): AgentAssetOnboardingFormValues {
  const inventory = inventoryFromPayload(latestSnapshotPayload);
  const hardware = asRecord(inventory.hardware) ?? {};
  const cpu = asRecord(inventory.cpu);

  return {
    type: inferredType(device, inventory, latestSnapshotPayload),
    brand: firstText(hardware.manufacturer, hardware.brand),
    model: firstText(hardware.model, hardware.productName),
    serialNumber: firstText(hardware.serialNumber, hardware.serial),
    assetTag: "",
    location: "",
    cpu: firstText(cpu?.model, cpu?.name, inventory.cpu),
    ramGb: ramGbFromInventory(device, inventory),
    storage: storageFromInventory(inventory, latestSnapshotPayload),
    os: osFromDevice(device, inventory),
    mac: macFromInventory(device, inventory),
    notes: `Hostname reportado por agente: ${device.hostname}`,
    personId: "",
    departmentId: "",
    custodyNote: "",
  };
}

function optionalText(value: string): string | null {
  return value.trim() || null;
}

export function buildAgentAssetOnboardingSubmission(
  form: AgentAssetOnboardingFormValues,
): AgentAssetOnboardingSubmission {
  const brand = form.brand.trim();
  const model = form.model.trim();
  if (!brand || !model)
    throw new Error("Completá la marca y el modelo antes de continuar.");

  const ramText = form.ramGb.trim();
  const ramGb = ramText ? Number(ramText) : undefined;
  if (ramGb !== undefined && (!Number.isFinite(ramGb) || ramGb < 0))
    throw new Error(
      "La memoria RAM debe ser un número igual o mayor que cero.",
    );

  const specs: AssetSpecs = {};
  const cpu = form.cpu.trim();
  const storage = form.storage.trim();
  const os = form.os.trim();
  const mac = form.mac.trim();
  if (cpu) specs.cpu = cpu;
  if (ramGb !== undefined) specs.ramGb = ramGb;
  if (storage) specs.storage = storage;
  if (os) specs.os = os;
  if (mac) specs.mac = mac;

  const asset: AssetCreatePayload = {
    type: form.type,
    status: "IN_STOCK",
    brand,
    model,
    serialNumber: optionalText(form.serialNumber),
    location: optionalText(form.location),
    notes: optionalText(form.notes),
    specs: Object.keys(specs).length ? specs : null,
  };
  const assetTag = form.assetTag.trim();
  if (assetTag) asset.assetTag = assetTag;

  const personId = form.personId.trim();
  const departmentId = form.departmentId.trim();
  const custody =
    personId || departmentId
      ? {
          personId: personId || undefined,
          departmentId: departmentId || undefined,
          note: optionalText(form.custodyNote),
        }
      : undefined;

  return { asset, custody };
}
