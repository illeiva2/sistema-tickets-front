import { Eye } from "lucide-react";
import { formatMoney, formatProcurementDate, purchaseCode } from "../format";
import { PURCHASE_STATUS_LABELS, type Purchase } from "../types";

interface PurchaseTableProps {
  items: Purchase[];
  openingId: string | null;
  onOpen: (purchase: Purchase) => void;
}

function PurchaseAction({
  purchase,
  openingId,
  onOpen,
}: PurchaseTableProps & { purchase: Purchase }) {
  return (
    <button
      type="button"
      className="procurement-button procurement-button--ghost"
      disabled={openingId === purchase.id}
      aria-label={`Abrir ${purchaseCode(purchase)}`}
      onClick={() => onOpen(purchase)}
    >
      <Eye size={15} aria-hidden="true" />
      Abrir
    </button>
  );
}

export function PurchaseTable(props: PurchaseTableProps) {
  return (
    <>
      <div className="procurement-table-wrap">
        <table className="procurement-table">
          <thead>
            <tr>
              <th>Orden</th>
              <th>Proveedor / motivo</th>
              <th>Estado</th>
              <th>Solicitante</th>
              <th>Total</th>
              <th>Creada</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {props.items.map((purchase) => (
              <tr key={purchase.id}>
                <td>
                  <span className="procurement-code">
                    {purchaseCode(purchase)}
                  </span>
                  <small>{purchase.items.length} renglones</small>
                </td>
                <td>
                  <strong>
                    {purchase.supplier?.name ?? "Proveedor pendiente"}
                  </strong>
                  <small>{purchase.justification}</small>
                </td>
                <td>
                  <span
                    className="procurement-status"
                    data-status={purchase.status}
                  >
                    {PURCHASE_STATUS_LABELS[purchase.status]}
                  </span>
                </td>
                <td>{purchase.requestedBy.name}</td>
                <td>{formatMoney(purchase.totalAmount, purchase.currency)}</td>
                <td>{formatProcurementDate(purchase.createdAt)}</td>
                <td>
                  <PurchaseAction {...props} purchase={purchase} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="procurement-mobile-list" aria-label="Órdenes encontradas">
        {props.items.map((purchase) => (
          <li key={purchase.id}>
            <article>
              <div className="procurement-mobile-card__topline">
                <span className="procurement-code">
                  {purchaseCode(purchase)}
                </span>
                <span
                  className="procurement-status"
                  data-status={purchase.status}
                >
                  {PURCHASE_STATUS_LABELS[purchase.status]}
                </span>
              </div>
              <h3>{purchase.supplier?.name ?? "Proveedor pendiente"}</h3>
              <p>{purchase.justification}</p>
              <dl>
                <div>
                  <dt>Solicitante</dt>
                  <dd>{purchase.requestedBy.name}</dd>
                </div>
                <div>
                  <dt>Total</dt>
                  <dd>
                    {formatMoney(purchase.totalAmount, purchase.currency)}
                  </dd>
                </div>
              </dl>
              <PurchaseAction {...props} purchase={purchase} />
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}
