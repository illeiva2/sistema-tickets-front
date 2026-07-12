import { Boxes, Clock3, PackageCheck, Wrench } from "lucide-react";
import type { AssetPagination, ItAsset } from "../types";

interface AssetMetricsProps {
  assets: ItAsset[];
  pagination?: AssetPagination;
}

function hasWarrantyExpiringSoon(asset: ItAsset): boolean {
  if (!asset.warrantyUntil) return false;
  const warrantyTime = new Date(asset.warrantyUntil).getTime();
  if (Number.isNaN(warrantyTime)) return false;

  const now = Date.now();
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;
  return warrantyTime >= now && warrantyTime <= now + ninetyDays;
}

export function AssetMetrics({ assets, pagination }: AssetMetricsProps) {
  const metrics = [
    {
      id: "total",
      label: "Total filtrado",
      value: pagination?.total ?? assets.length,
      detail: "Según la consulta actual",
      icon: Boxes,
      tone: "cyan",
    },
    {
      id: "assigned",
      label: "Asignados visibles",
      value: assets.filter((asset) => asset.status === "ASSIGNED").length,
      detail: "En esta página",
      icon: PackageCheck,
      tone: "cyan",
    },
    {
      id: "repair",
      label: "En reparación",
      value: assets.filter((asset) => asset.status === "IN_REPAIR").length,
      detail: "En esta página",
      icon: Wrench,
      tone: "amber",
    },
    {
      id: "warranty",
      label: "Garantía ≤ 90 días",
      value: assets.filter(hasWarrantyExpiringSoon).length,
      detail: "En esta página",
      icon: Clock3,
      tone: "amber",
    },
  ] as const;

  return (
    <section className="inventory-metrics" aria-label="Métricas del inventario">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <article key={metric.id} data-tone={metric.tone}>
            <div className="inventory-metric__topline">
              <span>{metric.label}</span>
              <Icon size={17} strokeWidth={1.6} aria-hidden="true" />
            </div>
            <strong>{metric.value.toLocaleString("es-AR")}</strong>
            <p>{metric.detail}</p>
          </article>
        );
      })}
    </section>
  );
}
