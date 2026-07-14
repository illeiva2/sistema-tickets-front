import {
  PHONE_CARRIER_LABELS,
  type PhoneLine,
  type PhoneLineAsset,
  type PhoneLinePerson,
} from "./types";

export function phoneLineCarrier(line: PhoneLine): string {
  return line.carrier === "OTHER"
    ? line.carrierOther || "Otra operadora"
    : PHONE_CARRIER_LABELS[line.carrier];
}

export function phoneLinePersonName(person?: PhoneLinePerson | null): string {
  if (!person) return "Sin asignar";
  return `${person.firstName} ${person.lastName}`.trim();
}

export function phoneLineAssetName(asset?: PhoneLineAsset | null): string {
  if (!asset) return "Sin equipo vinculado";
  return `${asset.brand} ${asset.model}`.trim();
}

export function phoneLineAssetCode(asset?: PhoneLineAsset | null): string {
  return asset?.assetTag || asset?.serialNumber || "Sin código";
}

export function formatPhoneLineDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export function formatPhoneLineDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatPhoneLineCost(line: PhoneLine): string {
  if (line.monthlyCost === null || line.monthlyCost === undefined) return "—";
  const amount = Number(line.monthlyCost);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: line.currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDataAllowance(value?: number | null): string {
  return value === null || value === undefined ? "Sin informar" : `${value} GB`;
}
