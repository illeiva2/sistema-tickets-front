import { HardDrive } from "lucide-react";
import { Link } from "react-router-dom";
import type { LiveAssetRef } from "../types";

/** Enlace a la ficha del inventario de un equipo de la red. */
export function AssetLink({ asset }: { asset: LiveAssetRef }) {
  return (
    <Link
      // nodrag/nopan: dentro del diagrama, el clic no arrastra el lienzo.
      className="netlive-asset-link nodrag nopan"
      to={`/it/inventory?activo=${encodeURIComponent(asset.id)}`}
      aria-label={`Ver ${asset.assetTag} en el inventario`}
    >
      <HardDrive size={12} aria-hidden="true" />
      Ver en inventario
    </Link>
  );
}
