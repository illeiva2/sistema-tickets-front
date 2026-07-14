import {
  BadgeCheck,
  PackageCheck,
  ShoppingCart,
  TimerReset,
} from "lucide-react";
import type { Pagination, Purchase } from "../types";

interface PurchaseMetricsProps {
  items: Purchase[];
  pagination?: Pagination;
}

export function PurchaseMetrics({ items, pagination }: PurchaseMetricsProps) {
  const requested = items.filter((item) => item.status === "REQUESTED").length;
  const ordered = items.filter((item) => item.status === "ORDERED").length;
  const received = items.filter((item) => item.status === "RECEIVED").length;

  return (
    <div className="procurement-metrics" aria-label="Resumen de compras">
      <article>
        <ShoppingCart aria-hidden="true" size={18} />
        <span>Órdenes</span>
        <strong>{pagination?.total ?? items.length}</strong>
        <small>Total para el filtro actual</small>
      </article>
      <article data-tone="warning">
        <TimerReset aria-hidden="true" size={18} />
        <span>Por autorizar</span>
        <strong>{requested}</strong>
        <small>Visibles en esta página</small>
      </article>
      <article data-tone="active">
        <BadgeCheck aria-hidden="true" size={18} />
        <span>Pedidas</span>
        <strong>{ordered}</strong>
        <small>Esperando recepción</small>
      </article>
      <article data-tone="complete">
        <PackageCheck aria-hidden="true" size={18} />
        <span>Recibidas</span>
        <strong>{received}</strong>
        <small>Visibles en esta página</small>
      </article>
    </div>
  );
}
