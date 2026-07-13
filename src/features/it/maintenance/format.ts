import type { MaintenanceAsset } from "./types";

export function formatMaintenanceDate(value?: string | null): string {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha inválida";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatMaintenanceCost(
  value?: string | number | null,
  currency = "ARS",
): string {
  if (value === null || value === undefined || value === "") return "Sin costo";
  const number = Number(value);
  if (!Number.isFinite(number)) return "Sin costo";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(number);
}

export function maintenanceAssetName(asset: MaintenanceAsset): string {
  return `${asset.brand} ${asset.model}`.trim();
}

export function maintenanceAssetCode(asset: MaintenanceAsset): string {
  return asset.assetTag || asset.serialNumber || "SIN-ETIQUETA";
}
