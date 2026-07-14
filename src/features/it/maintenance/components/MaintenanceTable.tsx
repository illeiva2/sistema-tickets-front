import { Pencil } from "lucide-react";
import {
  formatMaintenanceCost,
  formatMaintenanceDate,
  maintenanceAssetCode,
  maintenanceAssetName,
} from "../format";
import {
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_TYPE_LABELS,
  type ItMaintenance,
} from "../types";

interface MaintenanceTableProps {
  items: ItMaintenance[];
  openingId: string | null;
  onEdit: (maintenance: ItMaintenance) => void;
}

function relevantDate(maintenance: ItMaintenance): string | null | undefined {
  return maintenance.status === "COMPLETED"
    ? maintenance.performedAt
    : maintenance.scheduledAt;
}

export function MaintenanceTable({
  items,
  openingId,
  onEdit,
}: MaintenanceTableProps) {
  return (
    <>
      <div className="maintenance-table-wrap">
        <table className="maintenance-table">
          <thead>
            <tr>
              <th>Activo</th>
              <th>Intervención</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Responsable</th>
              <th>Costo</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {items.map((maintenance) => (
              <tr key={maintenance.id}>
                <td>
                  <span className="maintenance-asset-code">
                    {maintenanceAssetCode(maintenance.asset)}
                  </span>
                  <strong>{maintenanceAssetName(maintenance.asset)}</strong>
                </td>
                <td>
                  <span className="maintenance-type">
                    {MAINTENANCE_TYPE_LABELS[maintenance.type]}
                  </span>
                  <small>{maintenance.description}</small>
                </td>
                <td>
                  <span
                    className="maintenance-status"
                    data-status={maintenance.status}
                  >
                    {MAINTENANCE_STATUS_LABELS[maintenance.status]}
                  </span>
                </td>
                <td>{formatMaintenanceDate(relevantDate(maintenance))}</td>
                <td>
                  {maintenance.performedBy?.name ||
                    maintenance.supplier?.name ||
                    "Sin asignar"}
                </td>
                <td>
                  {formatMaintenanceCost(
                    maintenance.costAmount,
                    maintenance.currency,
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    className="maintenance-icon-button"
                    aria-label={`${maintenance.status === "COMPLETED" || maintenance.status === "CANCELLED" ? "Ver o corregir" : "Editar"} mantenimiento de ${maintenanceAssetName(maintenance.asset)}`}
                    disabled={openingId === maintenance.id}
                    onClick={() => onEdit(maintenance)}
                  >
                    <Pencil size={16} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul
        className="maintenance-mobile-list"
        aria-label="Mantenimientos encontrados"
      >
        {items.map((maintenance) => (
          <li key={maintenance.id}>
            <article>
              <div className="maintenance-mobile-card__topline">
                <span className="maintenance-asset-code">
                  {maintenanceAssetCode(maintenance.asset)}
                </span>
                <span
                  className="maintenance-status"
                  data-status={maintenance.status}
                >
                  {MAINTENANCE_STATUS_LABELS[maintenance.status]}
                </span>
              </div>
              <h3>{maintenanceAssetName(maintenance.asset)}</h3>
              <p>{maintenance.description}</p>
              <dl>
                <div>
                  <dt>Tipo</dt>
                  <dd>{MAINTENANCE_TYPE_LABELS[maintenance.type]}</dd>
                </div>
                <div>
                  <dt>Fecha</dt>
                  <dd>{formatMaintenanceDate(relevantDate(maintenance))}</dd>
                </div>
                <div>
                  <dt>Responsable</dt>
                  <dd>
                    {maintenance.performedBy?.name ||
                      maintenance.supplier?.name ||
                      "Sin asignar"}
                  </dd>
                </div>
                <div>
                  <dt>Costo</dt>
                  <dd>
                    {formatMaintenanceCost(
                      maintenance.costAmount,
                      maintenance.currency,
                    )}
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                className="maintenance-button maintenance-button--ghost"
                disabled={openingId === maintenance.id}
                onClick={() => onEdit(maintenance)}
              >
                <Pencil size={15} aria-hidden="true" />
                {maintenance.status === "COMPLETED" ||
                maintenance.status === "CANCELLED"
                  ? "Ver / corregir"
                  : "Editar intervención"}
              </button>
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}
