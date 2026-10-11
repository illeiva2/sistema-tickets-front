import {
  chassisTypeLabel,
  diskBusLabel,
  diskKindLabel,
  memoryFormFactorLabel,
} from "../inventoryLabels";

export interface InventoryField {
  label: string;
  value: string;
  mono?: boolean;
}

export interface InventoryCard {
  title: string;
  fields: InventoryField[];
}

export interface InventorySoftwareItem {
  name: string;
  version: string;
  publisher: string;
  details: InventoryField[];
}

export interface ParsedInventorySnapshot {
  collectedAt?: string;
  hardware?: InventoryCard;
  cpu?: InventoryCard;
  memoryModules: InventoryCard[];
  /** Ranuras de memoria declaradas por el firmware (agente 0.3+). */
  memorySlots?: number;
  /** Discos físicos (agente 0.3+) o, en snapshots viejos, lo que vino como "disks". */
  disks: InventoryCard[];
  /** Unidades lógicas (C:, D:) con capacidad y uso. */
  volumes: InventoryCard[];
  networkAdapters: InventoryCard[];
  software: InventorySoftwareItem[];
  other: InventoryField[];
  isEmpty: boolean;
}

export interface InventoryAssetSuggestion {
  brand?: string;
  model?: string;
  serialNumber?: string;
  cpu?: string;
  ramGb?: number;
  storage?: string;
  os?: string;
  mac?: string;
}

type UnknownRecord = Record<string, unknown>;

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"] as const;
const numberFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 2,
});
const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
});

const sensitiveKeyPattern =
  /(password|passwd|pwd|secret|token|credential|authorization|privatekey|apikey|accesskey|clientsecret|devicesecret|cookie|sessionkey|sessionid)/;

const TOP_LEVEL_ALIASES = {
  collectedAt: ["collectedAt", "collected_at", "collected", "timestamp"],
  hardware: ["hardware", "computerSystem", "computer"],
  cpu: ["cpu", "processor"],
  memoryModules: ["memoryModules", "ramModules", "memory", "ram"],
  memorySlots: ["memorySlots", "ramSlots"],
  // physicalDisks primero: es lo que manda el agente 0.3. El resto queda para
  // snapshots con otra forma.
  disks: ["physicalDisks", "disks", "drives", "storageDevices", "storage"],
  volumes: ["volumes", "logicalDisks", "partitions"],
  networkAdapters: ["networkAdapters", "adapters", "network"],
  software: ["software", "installedSoftware", "applications", "programs"],
} as const;

const genericLabels: Record<string, string> = {
  collectedat: "Fecha del relevamiento",
  hostname: "Nombre del equipo",
  manufacturer: "Fabricante",
  model: "Modelo",
  serialnumber: "Número de serie",
  biosversion: "Versión de BIOS",
  name: "Nombre",
  description: "Descripción",
  version: "Versión",
  publisher: "Fabricante",
  cores: "Núcleos",
  logicalprocessors: "Procesadores lógicos",
  capacitybytes: "Capacidad",
  totalbytes: "Capacidad total",
  usedbytes: "Espacio utilizado",
  freebytes: "Espacio disponible",
  partnumber: "Número de parte",
  macaddress: "Dirección MAC",
  ipaddresses: "Direcciones IP",
  filesystem: "Sistema de archivos",
  status: "Estado",
  chassistype: "Tipo de equipo",
  baseboardmanufacturer: "Fabricante de la placa base",
  baseboardmodel: "Placa base",
  baseboardserial: "Número de serie de la placa",
  speedmts: "Velocidad",
  memorytype: "Tipo",
  formfactor: "Formato",
  slot: "Ranura",
  sizebytes: "Capacidad",
  mediatype: "Tipo",
  bustype: "Interfaz",
};

function normalizeKey(key: string): string {
  return key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function isSensitiveKey(key: string): boolean {
  return sensitiveKeyPattern.test(normalizeKey(key));
}

function entriesOf(value: object): [string, unknown][] {
  try {
    return Object.entries(value);
  } catch {
    return [];
  }
}

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

/**
 * Removes keys that could contain credentials at every nesting level. Circular
 * and non-JSON values are converted to harmless display values.
 */
export function sanitizeInventoryPayload(value: unknown): unknown {
  const seen = new WeakSet<object>();

  const visit = (current: unknown): unknown => {
    if (
      current === null ||
      typeof current === "string" ||
      typeof current === "number" ||
      typeof current === "boolean"
    )
      return current;
    if (typeof current === "bigint") return current.toString();
    if (typeof current === "undefined") return null;
    if (typeof current === "function" || typeof current === "symbol")
      return "No disponible";
    if (current instanceof Date)
      return Number.isNaN(current.getTime())
        ? "Fecha inválida"
        : current.toISOString();
    if (typeof current !== "object") return "No disponible";
    if (seen.has(current)) return "Valor circular omitido";
    seen.add(current);

    if (Array.isArray(current)) return current.map(visit);

    const result: UnknownRecord = {};
    entriesOf(current).forEach(([key, nested]) => {
      if (!isSensitiveKey(key)) result[key] = visit(nested);
    });
    return result;
  };

  return visit(value);
}

export function formatInventoryBytes(value: unknown): string {
  const bytes = numericValue(value);
  if (bytes === null || bytes < 0) return "No informado";
  if (bytes === 0) return "0 B";
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    BYTE_UNITS.length - 1,
  );
  return `${numberFormatter.format(bytes / 1024 ** unitIndex)} ${BYTE_UNITS[unitIndex]}`;
}

function numericValue(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function textValue(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" && Number.isFinite(value))
    return numberFormatter.format(value);
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "bigint") return value.toString();
  return null;
}

function formatDate(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : dateFormatter.format(date);
}

function formatGeneric(value: unknown): string {
  if (value === null || typeof value === "undefined") return "No informado";
  const scalar = textValue(value);
  if (scalar !== null) return scalar;
  if (Array.isArray(value)) {
    if (value.length === 0) return "Sin elementos";
    const scalars = value.map(textValue);
    if (scalars.every((item): item is string => item !== null))
      return scalars.join(" · ");
  }
  return "Dato compuesto";
}

function humanizeKey(key: string): string {
  const normalized = normalizeKey(key);
  if (genericLabels[normalized]) return genericLabels[normalized];
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .trim();
  return spaced
    ? `${spaced.charAt(0).toUpperCase()}${spaced.slice(1)}`
    : "Dato";
}

interface PickedEntry {
  key: string;
  value: unknown;
}

function pickEntry(
  record: UnknownRecord,
  aliases: readonly string[],
): PickedEntry | undefined {
  const entries = entriesOf(record);
  for (const alias of aliases) {
    const normalizedAlias = normalizeKey(alias);
    const match = entries.find(
      ([key]) => normalizeKey(key) === normalizedAlias,
    );
    if (match) return { key: match[0], value: match[1] };
  }
  return undefined;
}

type FieldFormatter = (value: unknown, key: string) => string;

interface FieldDefinition {
  label: string;
  aliases: readonly string[];
  format?: FieldFormatter;
  mono?: boolean;
}

function capacityFormatter(value: unknown, key: string): string {
  const numeric = numericValue(value);
  if (numeric === null || numeric < 0) return "No informado";
  const normalized = normalizeKey(key);
  if (normalized.endsWith("gb")) return `${numberFormatter.format(numeric)} GB`;
  if (normalized.endsWith("mb")) return `${numberFormatter.format(numeric)} MB`;
  if (normalized.endsWith("tb")) return `${numberFormatter.format(numeric)} TB`;
  return formatInventoryBytes(numeric);
}

function listFormatter(value: unknown): string {
  if (!Array.isArray(value)) return formatGeneric(value);
  const values = value
    .map(textValue)
    .filter((item): item is string => item !== null);
  return values.length ? values.join(" · ") : "No informado";
}

function fieldsFromRecord(
  record: UnknownRecord,
  definitions: readonly FieldDefinition[],
  includeUnknown = true,
): InventoryField[] {
  const consumed = new Set<string>();
  const fields: InventoryField[] = [];

  definitions.forEach((definition) => {
    const picked = pickEntry(record, definition.aliases);
    if (!picked) return;
    consumed.add(normalizeKey(picked.key));
    fields.push({
      label: definition.label,
      value: definition.format
        ? definition.format(picked.value, picked.key)
        : formatGeneric(picked.value),
      mono: definition.mono,
    });
  });

  if (includeUnknown) {
    entriesOf(record).forEach(([key, value]) => {
      if (!consumed.has(normalizeKey(key)))
        flattenUnknown(value, [humanizeKey(key)], fields);
    });
  }
  return fields;
}

function flattenUnknown(
  value: unknown,
  path: string[],
  output: InventoryField[],
  depth = 0,
): void {
  const label = path.join(" · ");
  if (depth >= 6) {
    output.push({ label, value: "Detalle anidado no disponible" });
    return;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      output.push({ label, value: "Sin elementos" });
      return;
    }
    const scalarValues = value.map(textValue);
    if (scalarValues.every((item): item is string => item !== null)) {
      output.push({ label, value: scalarValues.join(" · ") });
      return;
    }
    value.forEach((item, index) =>
      flattenUnknown(
        item,
        [...path, `Elemento ${index + 1}`],
        output,
        depth + 1,
      ),
    );
    return;
  }
  const record = asRecord(value);
  if (record) {
    const entries = entriesOf(record);
    if (entries.length === 0) {
      output.push({ label, value: "Sin datos" });
      return;
    }
    entries.forEach(([key, nested]) =>
      flattenUnknown(nested, [...path, humanizeKey(key)], output, depth + 1),
    );
    return;
  }
  output.push({ label, value: formatGeneric(value) });
}

const labelFormatter =
  (translate: (value: unknown) => string | undefined): FieldFormatter =>
  (value) =>
    translate(value) ?? formatGeneric(value);

const hardwareFields: readonly FieldDefinition[] = [
  { label: "Fabricante", aliases: ["manufacturer", "brand", "vendor"] },
  { label: "Modelo", aliases: ["model", "productName", "product"] },
  {
    label: "Número de serie",
    aliases: ["serialNumber", "serial", "serviceTag"],
    mono: true,
  },
  {
    label: "Tipo de equipo",
    aliases: ["chassisType", "chassis"],
    format: labelFormatter(chassisTypeLabel),
  },
  { label: "Versión de BIOS", aliases: ["biosVersion", "bios"] },
  {
    label: "Fabricante de la placa base",
    aliases: ["baseboardManufacturer"],
  },
  { label: "Placa base", aliases: ["baseboardModel", "baseboardProduct"] },
  {
    label: "Número de serie de la placa",
    aliases: ["baseboardSerial"],
    mono: true,
  },
];

const cpuFields: readonly FieldDefinition[] = [
  { label: "Modelo", aliases: ["model", "name", "processorName"] },
  { label: "Núcleos", aliases: ["cores", "physicalCores"] },
  {
    label: "Procesadores lógicos",
    aliases: ["logicalProcessors", "threads", "logicalCores"],
  },
];

const memoryFields: readonly FieldDefinition[] = [
  { label: "Ranura", aliases: ["slot", "deviceLocator", "locator"] },
  {
    label: "Capacidad",
    aliases: [
      "capacityBytes",
      "totalBytes",
      "sizeBytes",
      "capacityGb",
      "sizeGb",
    ],
    format: capacityFormatter,
  },
  { label: "Tipo", aliases: ["memoryType", "type"] },
  {
    label: "Velocidad",
    aliases: ["speedMts", "speedMhz", "clockSpeedMhz"],
    format: (value, key) => {
      const numeric = numericValue(value);
      if (numeric === null) return formatGeneric(value);
      // SMBIOS 3.x informa transferencias por segundo (MT/s), no MHz.
      const unit = normalizeKey(key).endsWith("mts") ? "MT/s" : "MHz";
      return `${numberFormatter.format(numeric)} ${unit}`;
    },
  },
  {
    label: "Formato",
    aliases: ["formFactor"],
    format: labelFormatter(memoryFormFactorLabel),
  },
  { label: "Fabricante", aliases: ["manufacturer", "brand", "vendor"] },
  { label: "Número de parte", aliases: ["partNumber", "part"] },
  { label: "Número de serie", aliases: ["serialNumber", "serial"], mono: true },
];

const diskFields: readonly FieldDefinition[] = [
  { label: "Unidad", aliases: ["name", "device", "mount", "driveLetter"] },
  { label: "Modelo", aliases: ["model", "description"] },
  {
    label: "Capacidad",
    aliases: [
      "totalBytes",
      "capacityBytes",
      "sizeBytes",
      "sizeGb",
      "capacityGb",
    ],
    format: capacityFormatter,
  },
  {
    label: "Utilizado",
    aliases: ["usedBytes", "usedGb"],
    format: capacityFormatter,
  },
  {
    label: "Disponible",
    aliases: ["freeBytes", "availableBytes", "freeGb"],
    format: capacityFormatter,
  },
  {
    label: "Sistema de archivos",
    aliases: ["fileSystem", "filesystem", "format"],
  },
  { label: "Tipo", aliases: ["mediaType"] },
  {
    label: "Interfaz",
    aliases: ["busType", "interface"],
    format: labelFormatter(diskBusLabel),
  },
  { label: "Número de serie", aliases: ["serialNumber", "serial"], mono: true },
];

function volumeCard(value: unknown, index: number): InventoryCard | undefined {
  const record = asRecord(value);
  if (!record) return cardFromValue(value, `Unidad ${index + 1}`, diskFields);
  const name = rawTextField(record, ["name", "mount", "driveLetter"]);
  const total = numericValue(pickEntry(record, ["totalBytes", "sizeBytes"])?.value);
  const used = numericValue(pickEntry(record, ["usedBytes"])?.value);
  const fields = fieldsFromRecord(record, diskFields).filter(
    (field) => field.label !== "Unidad",
  );
  if (total !== null && used !== null && total > 0 && used >= 0) {
    fields.push(
      { label: "Disponible", value: formatInventoryBytes(Math.max(total - used, 0)) },
      {
        label: "En uso",
        value: `${numberFormatter.format(Math.round((used / total) * 100))} %`,
      },
    );
  }
  return fields.length
    ? {
        // "C:\" se muestra como "C:".
        title: name ? name.replace(/[\\/]+$/, "") || name : `Unidad ${index + 1}`,
        fields,
      }
    : undefined;
}

const networkFields: readonly FieldDefinition[] = [
  { label: "Nombre", aliases: ["name", "adapter", "interface"] },
  { label: "Descripción", aliases: ["description", "model"] },
  { label: "Dirección MAC", aliases: ["macAddress", "mac"], mono: true },
  {
    label: "Direcciones IP",
    aliases: ["ipAddresses", "addresses", "ips", "ipAddress"],
    format: listFormatter,
    mono: true,
  },
  { label: "Estado", aliases: ["status", "state"] },
];

function valuesAsItems(value: unknown): unknown[] {
  if (value === null || typeof value === "undefined") return [];
  return Array.isArray(value) ? value : [value];
}

function cardFromValue(
  value: unknown,
  fallbackTitle: string,
  fields: readonly FieldDefinition[],
  primitiveLabel = "Descripción",
): InventoryCard | undefined {
  const record = asRecord(value);
  if (record) {
    const parsedFields = fieldsFromRecord(record, fields);
    return parsedFields.length
      ? { title: fallbackTitle, fields: parsedFields }
      : undefined;
  }
  const scalar = textValue(value);
  return scalar
    ? {
        title: fallbackTitle,
        fields: [{ label: primitiveLabel, value: scalar }],
      }
    : undefined;
}

function titleFromRecord(
  value: unknown,
  aliases: readonly string[],
  fallback: string,
): string {
  const record = asRecord(value);
  if (!record) return fallback;
  const picked = pickEntry(record, aliases);
  return (picked && textValue(picked.value)) || fallback;
}

function parseSoftware(value: unknown): InventorySoftwareItem[] {
  let items = valuesAsItems(value);
  const singleRecord = items.length === 1 ? asRecord(items[0]) : null;
  if (
    singleRecord &&
    !pickEntry(singleRecord, ["name", "displayName", "title"])
  ) {
    items = entriesOf(singleRecord).map(([name, version]) => ({
      name,
      version,
    }));
  }

  return items.flatMap((item, index) => {
    const record = asRecord(item);
    if (!record) {
      const name = textValue(item);
      return name ? [{ name, version: "—", publisher: "—", details: [] }] : [];
    }
    const nameEntry = pickEntry(record, ["name", "displayName", "title"]);
    const versionEntry = pickEntry(record, ["version", "displayVersion"]);
    const publisherEntry = pickEntry(record, [
      "publisher",
      "manufacturer",
      "vendor",
    ]);
    const consumed = new Set(
      [nameEntry, versionEntry, publisherEntry]
        .filter((entry): entry is PickedEntry => Boolean(entry))
        .map((entry) => normalizeKey(entry.key)),
    );
    const details: InventoryField[] = [];
    entriesOf(record).forEach(([key, nested]) => {
      if (!consumed.has(normalizeKey(key)))
        flattenUnknown(nested, [humanizeKey(key)], details);
    });
    return [
      {
        name:
          (nameEntry && textValue(nameEntry.value)) || `Programa ${index + 1}`,
        version: (versionEntry && textValue(versionEntry.value)) || "—",
        publisher: (publisherEntry && textValue(publisherEntry.value)) || "—",
        details,
      },
    ];
  });
}

export function parseInventorySnapshot(
  payload: unknown,
): ParsedInventorySnapshot {
  const sanitized = sanitizeInventoryPayload(payload);
  const record = asRecord(sanitized);
  const empty: ParsedInventorySnapshot = {
    memoryModules: [],
    disks: [],
    volumes: [],
    networkAdapters: [],
    software: [],
    other: [],
    isEmpty: true,
  };
  if (!record) {
    const value = textValue(sanitized);
    return value
      ? {
          ...empty,
          other: [{ label: "Valor reportado", value }],
          isEmpty: false,
        }
      : empty;
  }

  const consumedTopLevel = new Set<string>();
  const take = (aliases: readonly string[]) => {
    const picked = pickEntry(record, aliases);
    if (picked) consumedTopLevel.add(normalizeKey(picked.key));
    return picked?.value;
  };

  const collectedAt = formatDate(take(TOP_LEVEL_ALIASES.collectedAt));
  const hardwareValue = take(TOP_LEVEL_ALIASES.hardware);
  const cpuValue = take(TOP_LEVEL_ALIASES.cpu);
  const memoryValue = take(TOP_LEVEL_ALIASES.memoryModules);
  const memorySlotsValue = numericValue(take(TOP_LEVEL_ALIASES.memorySlots));
  const disksValue = take(TOP_LEVEL_ALIASES.disks);
  const volumesValue = take(TOP_LEVEL_ALIASES.volumes);
  const networkValue = take(TOP_LEVEL_ALIASES.networkAdapters);
  const softwareValue = take(TOP_LEVEL_ALIASES.software);

  const hardware = cardFromValue(
    hardwareValue,
    "Equipo",
    hardwareFields,
    "Modelo",
  );
  const cpu = cardFromValue(cpuValue, "CPU informada", cpuFields, "Modelo");
  const memoryModules = valuesAsItems(memoryValue).flatMap((item, index) => {
    const card = cardFromValue(
      item,
      `Módulo ${index + 1}`,
      memoryFields,
      "Capacidad",
    );
    return card ? [card] : [];
  });
  const disks = valuesAsItems(disksValue).flatMap((item, index) => {
    const card = cardFromValue(
      item,
      titleFromRecord(
        item,
        ["name", "model", "device", "driveLetter"],
        `Disco ${index + 1}`,
      ),
      diskFields,
    );
    return card ? [card] : [];
  });
  const volumes = valuesAsItems(volumesValue).flatMap((item, index) => {
    const card = volumeCard(item, index);
    return card ? [card] : [];
  });
  const memorySlots =
    memorySlotsValue !== null &&
    Number.isInteger(memorySlotsValue) &&
    memorySlotsValue > 0
      ? memorySlotsValue
      : undefined;
  const networkAdapters = valuesAsItems(networkValue).flatMap((item, index) => {
    const card = cardFromValue(
      item,
      titleFromRecord(
        item,
        ["name", "adapter", "description"],
        `Adaptador ${index + 1}`,
      ),
      networkFields,
    );
    return card ? [card] : [];
  });
  const software = parseSoftware(softwareValue);
  const other: InventoryField[] = [];
  entriesOf(record).forEach(([key, value]) => {
    if (!consumedTopLevel.has(normalizeKey(key)))
      flattenUnknown(value, [humanizeKey(key)], other);
  });

  const isEmpty =
    !collectedAt &&
    !hardware &&
    !cpu &&
    memoryModules.length === 0 &&
    disks.length === 0 &&
    volumes.length === 0 &&
    networkAdapters.length === 0 &&
    software.length === 0 &&
    other.length === 0;

  return {
    collectedAt,
    hardware,
    cpu,
    memoryModules,
    memorySlots,
    disks,
    volumes,
    networkAdapters,
    software,
    other,
    isEmpty,
  };
}

function rawTextField(
  record: UnknownRecord | null,
  aliases: readonly string[],
) {
  if (!record) return undefined;
  const picked = pickEntry(record, aliases);
  return picked ? textValue(picked.value) || undefined : undefined;
}

/** Returns only fields that can safely prefill a new asset form. */
export function suggestAssetFromInventory(
  payload: unknown,
): InventoryAssetSuggestion {
  const sanitized = sanitizeInventoryPayload(payload);
  const record = asRecord(sanitized);
  if (!record) return {};

  const hardware = asRecord(
    pickEntry(record, TOP_LEVEL_ALIASES.hardware)?.value,
  );
  const cpuValue = pickEntry(record, TOP_LEVEL_ALIASES.cpu)?.value;
  const cpuRecord = asRecord(cpuValue);
  const memory = valuesAsItems(
    pickEntry(record, TOP_LEVEL_ALIASES.memoryModules)?.value,
  );
  const disks = valuesAsItems(
    pickEntry(record, TOP_LEVEL_ALIASES.disks)?.value,
  );
  const adapters = valuesAsItems(
    pickEntry(record, TOP_LEVEL_ALIASES.networkAdapters)?.value,
  );

  const memoryBytes = memory.reduce<number>((total, item) => {
    const module = asRecord(item);
    const capacity = module
      ? pickEntry(module, ["capacityBytes", "totalBytes", "sizeBytes"])?.value
      : item;
    return total + (numericValue(capacity) ?? 0);
  }, 0);
  const ramGb = memoryBytes > 0 ? memoryBytes / 1024 ** 3 : undefined;

  const storageParts = disks.flatMap((item, index) => {
    const disk = asRecord(item);
    if (!disk) return textValue(item) || [];
    const kind = diskKindLabel(disk.mediaType, disk.busType);
    const model = rawTextField(disk, ["model", "name", "device"]);
    const capacity = pickEntry(disk, [
      "totalBytes",
      "capacityBytes",
      "sizeBytes",
      "sizeGb",
      "capacityGb",
    ]);
    const formattedCapacity = capacity
      ? capacityFormatter(capacity.value, capacity.key)
      : undefined;
    const description = [kind, model, formattedCapacity]
      .filter(Boolean)
      .join(" · ");
    return description || `Disco ${index + 1}`;
  });

  const firstAdapter = adapters.map(asRecord).find(Boolean) ?? null;
  const osValue = pickEntry(record, ["os", "operatingSystem", "osName"])?.value;
  const osRecord = asRecord(osValue);
  const os = osRecord
    ? [
        rawTextField(osRecord, ["name", "caption"]),
        rawTextField(osRecord, ["version", "build"]),
      ]
        .filter(Boolean)
        .join(" · ") || undefined
    : textValue(osValue) || undefined;

  // Las PCs armadas no traen fabricante, modelo ni serie en el firmware del
  // equipo; los de la placa base son lo único que las identifica.
  return {
    brand:
      rawTextField(hardware, ["manufacturer", "brand", "vendor"]) ??
      rawTextField(hardware, ["baseboardManufacturer"]),
    model:
      rawTextField(hardware, ["model", "productName", "product"]) ??
      rawTextField(hardware, ["baseboardModel", "baseboardProduct"]),
    serialNumber:
      rawTextField(hardware, ["serialNumber", "serial", "serviceTag"]) ??
      rawTextField(hardware, ["baseboardSerial"]),
    cpu:
      rawTextField(cpuRecord, ["model", "name", "processorName"]) ??
      textValue(cpuValue) ??
      undefined,
    ramGb: ramGb === undefined ? undefined : Number(ramGb.toFixed(2)),
    storage: storageParts.length ? storageParts.join(" + ") : undefined,
    os,
    mac: rawTextField(firstAdapter, ["macAddress", "mac"]),
  };
}
