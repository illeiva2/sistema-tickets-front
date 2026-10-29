import { PackageCheck, Pencil } from "lucide-react";
import { ASSET_STATUS_LABELS, ASSET_TYPE_LABELS, type ItAsset } from "../types";

interface AssetTableProps {
  assets: ItAsset[];
  openingAssetId: string | null;
  openingCustodyId: string | null;
  onEdit: (asset: ItAsset) => void;
  onCustody: (asset: ItAsset) => void;
}

function assetName(asset: ItAsset): string {
  return `${asset.brand} ${asset.model}`.trim();
}

/** Quién tiene el equipo: la persona (con su sector) o, si no hay persona, el sector. */
function holder(asset: ItAsset): { name: string; detail: string } | null {
  const person = asset.assignedPerson;
  const department = asset.assignedDepartment ?? person?.department ?? null;
  if (person) {
    return {
      name: `${person.firstName} ${person.lastName}`.trim(),
      detail: department?.name ?? "Sin sector",
    };
  }
  if (department) return { name: department.name, detail: "Sector" };
  return null;
}

export function AssetTable({
  assets,
  openingAssetId,
  openingCustodyId,
  onEdit,
  onCustody,
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
              <th scope="col">Equipo</th>
              <th scope="col">Tipo</th>
              <th scope="col">Asignado a</th>
              <th scope="col">Estado</th>
              <th scope="col">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => {
              const assigned = holder(asset);
              return (
                <tr key={asset.id}>
                  <td>
                    <span className="inventory-asset-tag">
                      {asset.assetTag || "SIN-TAG"}
                    </span>
                    <strong>{assetName(asset)}</strong>
                  </td>
                  <td>{ASSET_TYPE_LABELS[asset.type]}</td>
                  <td>
                    {assigned ? (
                      <>
                        <strong>{assigned.name}</strong>
                        <small>{assigned.detail}</small>
                      </>
                    ) : (
                      <small>Sin asignar</small>
                    )}
                  </td>
                  <td>
                    <span className="inventory-status" data-status={asset.status}>
                      {ASSET_STATUS_LABELS[asset.status]}
                    </span>
                  </td>
                  <td className="inventory-table__action">
                    <div className="inventory-table__actions">
                      <button
                        type="button"
                        className="inventory-icon-button inventory-icon-button--custody"
                        aria-label={`Gestionar custodia ${asset.assetTag || assetName(asset)}`}
                        disabled={openingCustodyId === asset.id}
                        onClick={() => onCustody(asset)}
                      >
                        <PackageCheck size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="inventory-icon-button"
                        aria-label={`Editar ${asset.assetTag || assetName(asset)}`}
                        disabled={openingAssetId === asset.id}
                        onClick={() => onEdit(asset)}
                      >
                        <Pencil size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="inventory-mobile-list" aria-label="Activos encontrados">
        {assets.map((asset) => {
          const assigned = holder(asset);
          return (
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
                    <dt>Asignado a</dt>
                    <dd>
                      {assigned
                        ? `${assigned.name} · ${assigned.detail}`
                        : "Sin asignar"}
                    </dd>
                  </div>
                  <div>
                    <dt>Serie</dt>
                    <dd>{asset.serialNumber || "No informada"}</dd>
                  </div>
                </dl>
                <div className="inventory-mobile-card__actions">
                  <button
                    type="button"
                    className="inventory-button inventory-button--ghost"
                    disabled={openingCustodyId === asset.id}
                    onClick={() => onCustody(asset)}
                  >
                    <PackageCheck size={15} aria-hidden="true" />
                    Custodia
                  </button>
                  <button
                    type="button"
                    className="inventory-button inventory-button--ghost"
                    disabled={openingAssetId === asset.id}
                    onClick={() => onEdit(asset)}
                  >
                    <Pencil size={15} aria-hidden="true" />
                    Editar activo
                  </button>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </>
  );
}
