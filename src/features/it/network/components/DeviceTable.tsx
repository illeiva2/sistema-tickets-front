import { ExternalLink, Pencil, RadioTower } from "lucide-react";
import {
  DEVICE_STATUS_LABELS,
  DEVICE_TYPE_LABELS,
  type NetworkDevice,
} from "../types";

interface DeviceTableProps {
  items: NetworkDevice[];
  openingId: string | null;
  canWrite: boolean;
  onOpen: (device: NetworkDevice) => void;
}

export function DeviceTable({
  items,
  openingId,
  canWrite,
  onOpen,
}: DeviceTableProps) {
  return (
    <>
      <div className="network-table-wrap">
        <table className="network-table">
          <thead>
            <tr>
              <th>Dispositivo</th>
              <th>Sitio / ubicación</th>
              <th>Gestión</th>
              <th>VLANs</th>
              <th>Estado</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {items.map((device) => (
              <tr key={device.id}>
                <td>
                  <span className="network-type">
                    {DEVICE_TYPE_LABELS[device.type]}
                  </span>
                  <strong>{device.name}</strong>
                  <small>{device.macAddress || "MAC no informada"}</small>
                </td>
                <td>
                  <strong>{device.site?.name || "Sitio sin resolver"}</strong>
                  <small>{device.location || "Ubicación no informada"}</small>
                </td>
                <td>
                  <span className="network-mono">
                    {device.managementIp || "—"}
                  </span>
                  {device.adminUrl ? (
                    <a href={device.adminUrl} target="_blank" rel="noreferrer">
                      Consola <ExternalLink size={12} aria-hidden="true" />
                    </a>
                  ) : null}
                </td>
                <td>{device.vlans.length ? device.vlans.join(" · ") : "—"}</td>
                <td>
                  <span className="network-status" data-status={device.status}>
                    {DEVICE_STATUS_LABELS[device.status]}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="network-icon-button"
                    aria-label={`${canWrite ? "Editar" : "Ver"} ${device.name}`}
                    disabled={openingId === device.id}
                    onClick={() => onOpen(device)}
                  >
                    <Pencil size={16} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="network-mobile-list" aria-label="Dispositivos encontrados">
        {items.map((device) => (
          <li key={device.id}>
            <article>
              <div className="network-card-topline">
                <span className="network-type">
                  <RadioTower size={13} /> {DEVICE_TYPE_LABELS[device.type]}
                </span>
                <span className="network-status" data-status={device.status}>
                  {DEVICE_STATUS_LABELS[device.status]}
                </span>
              </div>
              <h3>{device.name}</h3>
              <p>
                {device.site?.name || "Sin sitio"} /{" "}
                {device.location || "Sin ubicación"}
              </p>
              <dl>
                <div>
                  <dt>IP</dt>
                  <dd className="network-mono">{device.managementIp || "—"}</dd>
                </div>
                <div>
                  <dt>MAC</dt>
                  <dd className="network-mono">{device.macAddress || "—"}</dd>
                </div>
                <div>
                  <dt>VLANs</dt>
                  <dd>{device.vlans.join(", ") || "—"}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="network-button network-button--ghost"
                onClick={() => onOpen(device)}
              >
                <Pencil size={14} aria-hidden="true" />{" "}
                {canWrite ? "Editar dispositivo" : "Ver detalle"}
              </button>
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}
