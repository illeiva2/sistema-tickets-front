import { Pencil } from "lucide-react";
import type { Supplier } from "../types";

interface SupplierTableProps {
  items: Supplier[];
  openingId: string | null;
  onEdit: (supplier: Supplier) => void;
}

function SupplierAction({
  supplier,
  openingId,
  onEdit,
}: SupplierTableProps & { supplier: Supplier }) {
  return (
    <button
      type="button"
      className="procurement-button procurement-button--ghost"
      disabled={openingId === supplier.id}
      aria-label={`Editar proveedor ${supplier.name}`}
      onClick={() => onEdit(supplier)}
    >
      <Pencil size={15} aria-hidden="true" /> Editar
    </button>
  );
}

export function SupplierTable(props: SupplierTableProps) {
  return (
    <>
      <div className="procurement-table-wrap">
        <table className="procurement-table procurement-table--suppliers">
          <thead>
            <tr>
              <th>Proveedor</th>
              <th>Categorías</th>
              <th>Actividad</th>
              <th>Estado</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {props.items.map((supplier) => (
              <tr key={supplier.id}>
                <td>
                  <strong>{supplier.name}</strong>
                  <small>{supplier.cuit || "CUIT no informado"}</small>
                </td>
                <td>
                  {supplier.categories.length
                    ? supplier.categories.join(" · ")
                    : "Sin categorías"}
                </td>
                <td>
                  <strong>{supplier.purchasesCount ?? 0} compras</strong>
                  <small>
                    {supplier.maintenancesCount ?? 0} mantenimientos
                  </small>
                </td>
                <td>
                  <span
                    className="procurement-status"
                    data-status={supplier.isActive ? "ACTIVE" : "CANCELLED"}
                  >
                    {supplier.isActive ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td>
                  <SupplierAction {...props} supplier={supplier} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul
        className="procurement-mobile-list"
        aria-label="Proveedores encontrados"
      >
        {props.items.map((supplier) => (
          <li key={supplier.id}>
            <article>
              <div className="procurement-mobile-card__topline">
                <span className="procurement-code">
                  {supplier.cuit || "SIN CUIT"}
                </span>
                <span
                  className="procurement-status"
                  data-status={supplier.isActive ? "ACTIVE" : "CANCELLED"}
                >
                  {supplier.isActive ? "Activo" : "Inactivo"}
                </span>
              </div>
              <h3>{supplier.name}</h3>
              <p>{supplier.categories.join(" · ") || "Sin categorías"}</p>
              <SupplierAction {...props} supplier={supplier} />
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}
