import type { Purchase, PurchaseCurrency } from "./types";

export function purchaseCode(purchase: Pick<Purchase, "purchaseNumber">) {
  return `OC-${String(purchase.purchaseNumber).padStart(4, "0")}`;
}

export function formatMoney(
  amount: string | number | null | undefined,
  currency: PurchaseCurrency,
) {
  if (amount === null || amount === undefined || amount === "") return "—";
  const value = Number(amount);
  if (!Number.isFinite(value)) return `${currency} ${amount}`;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatProcurementDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function linkedAssetTotal(purchase: Purchase) {
  return purchase.items.reduce(
    (total, item) =>
      total + (item.linkedAssetsCount ?? item.linkedAssets?.length ?? 0),
    0,
  );
}

export function expectedAssetTotal(purchase: Purchase) {
  return purchase.items.reduce((total, item) => total + item.quantity, 0);
}
