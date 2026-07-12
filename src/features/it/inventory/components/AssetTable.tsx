import { Pencil } from "lucide-react";
import { ASSET_STATUS_LABELS, ASSET_TYPE_LABELS, type ItAsset } from "../types";

interface AssetTableProps {
  assets: ItAsset[];
  openingAssetId: string | null;
  onEdit: (asset: ItAsset) => void;
}

function formatDate(value?: string | null): string {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha inválida";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function assetName(asset: ItAsset): string {
  return `${asset.brand} ${asset.model}`.trim();
}

export function AssetTable({
  assets,
  openingAssetId,
  onEdit,
}: AssetTableProps) {
  return (
    <>
      <div className="inventory-table-wrap">
        <table className="inventory-table">
          <caption className="sr-only">
            Activos de IT encontrados para los filtros seleccionados
          </caption>
          <thead>
            <tr>
              <th scope="col">Identificador</th>
              <th scope="col">Equipo</th>
              <th scope="col">Tipo</th>
              <th scope="col">Estado</th>
              <th scope="col">Ubicación</th>
              <th scope="col">Garantía</th>
              <th scope="col">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id}>
                <td>
                  <span className="inventory-asset-tag">
                    {asset.assetTag || "SIN-TAG"}
                  </span>
                  <small>{asset.serialNumber || "Sin número de serie"}</small>
                </td>
                <td>
                  <strong>{assetName(asset)}</strong>
                  <small>{asset.specs?.os || "SO no informado"}</small>
                </td>
                <td>{ASSET_TYPE_LABELS[asset.type]}</td>
                <td>
                  <span className="inventory-status" data-status={asset.status}>
                    {ASSET_STATUS_LABELS[asset.status]}
                  </span>
                </td>
                <td>{asset.location || "Sin ubicación"}</td>
                <td>{formatDate(asset.warrantyUntil)}</td>
                <td className="inventory-table__action">
                  <button
                    type="button"
                    className="inventory-icon-button"
                    aria-label={`Editar ${asset.assetTag || assetName(asset)}`}
                    disabled={openingAssetId === asset.id}
                    onClick={() => onEdit(asset)}
                  >
                    <Pencil size={16} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="inventory-mobile-list" aria-label="Activos encontrados">
        {assets.map((asset) => (
          <li key={asset.id}>
            <article>
              <div className="inventory-mobile-card__topline">
                <span className="inventory-asset-tag">
                  {asset.assetTag || "SIN-TAG"}
                </span>
                <span className="inventory-status" data-status={asset.status}>
                  {ASSET_STATUS_LABELS[asset.status]}
                </span>
              </div>
              <h3>{assetName(asset)}</h3>
              <p>{ASSET_TYPE_LABELS[asset.type]}</p>
              <dl>
                <div>
                  <dt>Serie</dt>
                  <dd>{asset.serialNumber || "No informada"}</dd>
                </div>
                <div>
                  <dt>Ubicación</dt>
                  <dd>{asset.location || "No informada"}</dd>
                </div>
                <div>
                  <dt>Garantía</dt>
                  <dd>{formatDate(asset.warrantyUntil)}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="inventory-button inventory-button--ghost"
                disabled={openingAssetId === asset.id}
                onClick={() => onEdit(asset)}
              >
                <Pencil size={15} aria-hidden="true" />
                Editar activo
              </button>
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}
