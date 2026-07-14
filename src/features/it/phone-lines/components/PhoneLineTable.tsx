import { Eye } from "lucide-react";
import {
  formatDataAllowance,
  formatPhoneLineCost,
  phoneLineAssetName,
  phoneLineCarrier,
  phoneLinePersonName,
} from "../format";
import { PHONE_LINE_STATUS_LABELS, type PhoneLine } from "../types";

interface PhoneLineTableProps {
  lines: PhoneLine[];
  openingId: string | null;
  onOpen: (line: PhoneLine) => void;
}

export function PhoneLineTable({
  lines,
  openingId,
  onOpen,
}: PhoneLineTableProps) {
  return (
    <>
      <div className="phone-lines-table-wrap">
        <table className="phone-lines-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Operadora / plan</th>
              <th>Estado</th>
              <th>Titular</th>
              <th>Equipo</th>
              <th>Costo mensual</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id}>
                <td>
                  <strong className="phone-lines-number">
                    {line.phoneNumber}
                  </strong>
                  <small>ICCID {line.simIccid || "sin registrar"}</small>
                </td>
                <td>
                  <strong>{phoneLineCarrier(line)}</strong>
                  <small>
                    {line.planName || "Sin plan"} ·{" "}
                    {formatDataAllowance(line.dataAllowanceGb)}
                  </small>
                </td>
                <td>
                  <span
                    className="phone-lines-status"
                    data-status={line.status}
                  >
                    {PHONE_LINE_STATUS_LABELS[line.status]}
                  </span>
                </td>
                <td>{phoneLinePersonName(line.holder)}</td>
                <td>{phoneLineAssetName(line.asset)}</td>
                <td>{formatPhoneLineCost(line)}</td>
                <td className="phone-lines-table__action">
                  <button
                    type="button"
                    className="staff-icon-button"
                    aria-label={`Ver línea ${line.phoneNumber}`}
                    disabled={openingId === line.id}
                    onClick={() => onOpen(line)}
                  >
                    <Eye size={16} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="phone-lines-mobile-list" aria-label="Líneas encontradas">
        {lines.map((line) => (
          <li key={line.id}>
            <article>
              <div className="phone-lines-mobile-card__topline">
                <strong className="phone-lines-number">
                  {line.phoneNumber}
                </strong>
                <span className="phone-lines-status" data-status={line.status}>
                  {PHONE_LINE_STATUS_LABELS[line.status]}
                </span>
              </div>
              <h3>{phoneLineCarrier(line)}</h3>
              <p>{line.planName || "Sin plan registrado"}</p>
              <dl>
                <div>
                  <dt>Datos</dt>
                  <dd>{formatDataAllowance(line.dataAllowanceGb)}</dd>
                </div>
                <div>
                  <dt>Titular</dt>
                  <dd>{phoneLinePersonName(line.holder)}</dd>
                </div>
                <div>
                  <dt>Equipo</dt>
                  <dd>{phoneLineAssetName(line.asset)}</dd>
                </div>
                <div>
                  <dt>Costo</dt>
                  <dd>{formatPhoneLineCost(line)}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="staff-button staff-button--ghost"
                disabled={openingId === line.id}
                onClick={() => onOpen(line)}
              >
                <Eye size={15} aria-hidden="true" />
                Ver y gestionar
              </button>
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}
