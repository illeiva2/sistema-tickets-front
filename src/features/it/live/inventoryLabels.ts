/**
 * Etiquetas en castellano para los códigos que informa el agente desde la 0.3
 * (tabla SMBIOS del firmware y consulta de discos). El agente manda códigos
 * estables en inglés; acá se traducen para pantalla, alta de activos y planilla.
 * Un código desconocido se muestra tal cual en lugar de perderse.
 */

const CHASSIS_LABELS: Record<string, string> = {
  DESKTOP: "Escritorio",
  LOW_PROFILE_DESKTOP: "Escritorio de bajo perfil",
  PIZZA_BOX: "Escritorio compacto",
  MINI_TOWER: "Minitorre",
  TOWER: "Torre",
  PORTABLE: "Portátil",
  LAPTOP: "Notebook",
  NOTEBOOK: "Notebook",
  HAND_HELD: "De mano",
  DOCKING_STATION: "Base de conexión",
  ALL_IN_ONE: "Todo en uno",
  SUB_NOTEBOOK: "Ultraportátil",
  SPACE_SAVING: "Compacto",
  LUNCH_BOX: "Compacto",
  MAIN_SERVER: "Servidor",
  RACK_MOUNT: "Servidor de rack",
  SEALED_CASE_PC: "PC sellada",
  BLADE: "Blade",
  TABLET: "Tablet",
  CONVERTIBLE: "Convertible 2 en 1",
  DETACHABLE: "2 en 1 desmontable",
  EMBEDDED_PC: "PC embebida",
  MINI_PC: "Mini PC",
  STICK_PC: "PC en stick",
  OTHER: "Otro",
};

const FORM_FACTOR_LABELS: Record<string, string> = {
  DIMM: "DIMM (escritorio)",
  SODIMM: "SO-DIMM (notebook)",
  SOLDERED: "Soldada a la placa",
};

const BUS_LABELS: Record<string, string> = {
  NVME: "NVMe",
  SATA: "SATA",
  SAS: "SAS",
  SCSI: "SCSI",
  ATA: "ATA",
  ATAPI: "ATAPI",
  RAID: "RAID",
  UFS: "UFS",
  SCM: "SCM",
};

// La alta desde un agente sólo admite DESKTOP, NOTEBOOK, SERVER u OTHER: una
// tablet Windows se registra como notebook.
const PORTABLE_CHASSIS = new Set([
  "PORTABLE",
  "LAPTOP",
  "NOTEBOOK",
  "SUB_NOTEBOOK",
  "HAND_HELD",
  "CONVERTIBLE",
  "DETACHABLE",
  "TABLET",
]);
const SERVER_CHASSIS = new Set(["MAIN_SERVER", "RACK_MOUNT", "BLADE"]);

function code(value: unknown): string | undefined {
  return typeof value === "string" && value.trim()
    ? value.trim().toUpperCase()
    : undefined;
}

function translate(
  labels: Record<string, string>,
  value: unknown,
): string | undefined {
  const key = code(value);
  if (!key) return undefined;
  return labels[key] ?? (value as string).trim();
}

export const chassisTypeLabel = (value: unknown) =>
  translate(CHASSIS_LABELS, value);

export const memoryFormFactorLabel = (value: unknown) =>
  translate(FORM_FACTOR_LABELS, value);

export const diskBusLabel = (value: unknown) => translate(BUS_LABELS, value);

/** "SSD NVMe", "HDD SATA"... a partir de lo que informa el disco físico. */
export function diskKindLabel(
  mediaType: unknown,
  busType: unknown,
): string | undefined {
  const parts = [
    typeof mediaType === "string" ? mediaType.trim() : "",
    diskBusLabel(busType) ?? "",
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : undefined;
}

/** Tipo de activo sugerido por el gabinete; undefined si no alcanza para decidir. */
export function assetTypeFromChassis(
  value: unknown,
): "DESKTOP" | "NOTEBOOK" | "SERVER" | undefined {
  const key = code(value);
  if (!key || key === "OTHER") return undefined;
  if (PORTABLE_CHASSIS.has(key)) return "NOTEBOOK";
  if (SERVER_CHASSIS.has(key)) return "SERVER";
  return "DESKTOP";
}
