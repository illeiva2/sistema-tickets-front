import { Pencil, Trash2 } from "lucide-react";
import { LINK_TYPE_LABELS, type NetworkLink } from "../types";

interface LinkTableProps {
  items: NetworkLink[];
  canWrite: boolean;
  busyId: string | null;
  onOpen: (link: NetworkLink) => void;
  onRemove: (link: NetworkLink) => void;
}

export function LinkTable({
  items,
  canWrite,
  busyId,
  onOpen,
  onRemove,
}: LinkTableProps) {
  return (
    <>
      <div className="network-table-wrap">
        <table className="network-table network-link-table">
          <thead>
            <tr>
              <th>Origen</th>
              <th>Destino</th>
              <th>Medio</th>
              <th>Troncal / VLANs</th>
              <th>Velocidad</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {items.map((link) => (
              <tr key={link.id}>
                <td>
                  <strong>{link.deviceA.name}</strong>
                  <small>{link.portA || "Puerto sin informar"}</small>
                </td>
                <td>
                  <strong>{link.deviceB.name}</strong>
                  <small>{link.portB || "Puerto sin informar"}</small>
                </td>
                <td>
                  <span className="network-link-kind" data-type={link.type}>
                    {LINK_TYPE_LABELS[link.type]}
                  </span>
                </td>
                <td>{link.vlans.join(" · ") || "Sin etiquetar"}</td>
                <td className="network-mono">
                  {link.speedMbps
                    ? `${link.speedMbps.toLocaleString("es-AR")} Mbps`
                    : "—"}
                </td>
                <td>
                  <div className="network-row-actions">
                    <button
                      type="button"
                      className="network-icon-button"
                      aria-label={`${canWrite ? "Editar" : "Ver"} enlace ${link.deviceA.name} a ${link.deviceB.name}`}
                      onClick={() => onOpen(link)}
                    >
                      <Pencil size={15} aria-hidden="true" />
                    </button>
                    {canWrite ? (
                      <button
                        type="button"
                        className="network-icon-button network-icon-button--danger"
                        aria-label={`Eliminar enlace ${link.deviceA.name} a ${link.deviceB.name}`}
                        disabled={busyId === link.id}
                        onClick={() => onRemove(link)}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="network-mobile-list" aria-label="Enlaces encontrados">
        {items.map((link) => (
          <li key={link.id}>
            <article>
              <div className="network-card-topline">
                <span className="network-link-kind" data-type={link.type}>
                  {LINK_TYPE_LABELS[link.type]}
                </span>
                <span className="network-mono">
                  {link.speedMbps ? `${link.speedMbps} Mbps` : "—"}
                </span>
              </div>
              <h3>
                {link.deviceA.name} ↔ {link.deviceB.name}
              </h3>
              <p>
                {link.portA || "?"} ↔ {link.portB || "?"}
              </p>
              <small>VLANs: {link.vlans.join(", ") || "sin etiquetar"}</small>
              <button
                type="button"
                className="network-button network-button--ghost"
                onClick={() => onOpen(link)}
              >
                <Pencil size={14} />{" "}
                {canWrite ? "Editar enlace" : "Ver detalle"}
              </button>
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}
