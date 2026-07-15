import { useEffect, useId, useRef } from "react";
import {
  AlertTriangle,
  Laptop,
  Loader2,
  Pencil,
  RotateCcw,
  Smartphone,
  X,
} from "lucide-react";
import {
  ASSET_STATUS_LABELS,
  ASSET_TYPE_LABELS,
} from "@/features/it/inventory/types";
import {
  PHONE_CARRIER_LABELS,
  PHONE_LINE_STATUS_LABELS,
} from "@/features/it/phone-lines/types";
import {
  EMPLOYMENT_STATUS_LABELS,
  type StaffPerson,
  type StaffPersonDetail,
} from "../types";

interface PersonSummaryPanelProps {
  person: StaffPersonDetail | null;
  isLoading: boolean;
  loadError?: string;
  onClose: () => void;
  onRetry: () => void;
  onEdit: (person: StaffPerson) => void;
}

function formatDate(value?: string | null): string {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha inválida";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

// Los catálogos viven en otros módulos; ante un valor desconocido se muestra
// el crudo antes que romper el resumen.
function labelFrom(map: Record<string, string>, value: string): string {
  return map[value] ?? value;
}

function carrierLabel(carrier: string, carrierOther?: string | null): string {
  if (carrier === "OTHER" && carrierOther) return carrierOther;
  return labelFrom(PHONE_CARRIER_LABELS, carrier);
}

interface HistoryEntry {
  key: string;
  at: string;
  label: string;
  kind: "Equipo" | "Línea";
  endAt?: string | null;
}

function buildHistory(person: StaffPersonDetail): HistoryEntry[] {
  const assets = (person.assetAssignments ?? []).map<HistoryEntry>((entry) => ({
    key: `asset-${entry.id}`,
    at: entry.startAt,
    label: entry.asset?.assetTag ?? "Activo dado de baja",
    kind: "Equipo",
    endAt: entry.endAt,
  }));
  const lines = (person.phoneLineAssignments ?? []).map<HistoryEntry>(
    (entry) => ({
      key: `line-${entry.id}`,
      at: entry.assignedAt,
      label: entry.phoneLine?.phoneNumber ?? "Línea dada de baja",
      kind: "Línea",
      endAt: entry.returnedAt,
    }),
  );
  return [...assets, ...lines]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 6);
}

export function PersonSummaryPanel({
  person,
  isLoading,
  loadError,
  onClose,
  onRetry,
  onEdit,
}: PersonSummaryPanelProps) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const assets = person?.assignedAssets ?? [];
  const phoneLines = person?.phoneLines ?? [];
  const history = person ? buildHistory(person) : [];

  return (
    <div className="staff-dialog-backdrop">
      <section
        className="staff-dialog staff-summary"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="staff-dialog__header">
          <div>
            <span>RESUMEN / PERSONA</span>
            <h2 id={titleId}>
              {person
                ? `${person.lastName}, ${person.firstName}`
                : "Resumen de persona"}
            </h2>
          </div>
          <div className="staff-summary__header-actions">
            {person && (
              <button
                type="button"
                className="staff-button staff-button--ghost"
                onClick={() => onEdit(person)}
              >
                <Pencil size={15} aria-hidden="true" />
                Editar
              </button>
            )}
            <button
              ref={closeButtonRef}
              type="button"
              className="staff-icon-button"
              aria-label="Cerrar resumen de persona"
              onClick={onClose}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </header>

        {isLoading ? (
          <div className="staff-dialog__state" role="status">
            <Loader2 size={24} className="staff-spin" aria-hidden="true" />
            <strong>Cargando resumen</strong>
            <p>Consultando ficha, custodia y líneas de la persona.</p>
          </div>
        ) : loadError ? (
          <div className="staff-dialog__state" role="alert">
            <AlertTriangle size={24} aria-hidden="true" />
            <strong>No se pudo abrir el resumen</strong>
            <p>{loadError}</p>
            <button
              type="button"
              className="staff-button staff-button--ghost"
              onClick={onRetry}
            >
              <RotateCcw size={15} aria-hidden="true" />
              Reintentar
            </button>
          </div>
        ) : person ? (
          <div className="staff-summary__body">
            <section aria-label="Ficha laboral">
              <h3 className="staff-summary__legend">Ficha laboral</h3>
              <dl className="staff-summary__grid">
                <div>
                  <dt>Legajo</dt>
                  <dd>
                    <span className="staff-employee-number">
                      {person.employeeNumber || "SIN-LEGAJO"}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Estado</dt>
                  <dd>
                    <span className="staff-status" data-status={person.status}>
                      {EMPLOYMENT_STATUS_LABELS[person.status]}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Puesto</dt>
                  <dd>{person.jobTitle || "Sin puesto"}</dd>
                </div>
                <div>
                  <dt>Sector</dt>
                  <dd>{person.department?.name || "Sin sector"}</dd>
                </div>
                <div>
                  <dt>Email laboral</dt>
                  <dd>{person.workEmail || "No informado"}</dd>
                </div>
                <div>
                  <dt>Teléfono laboral</dt>
                  <dd>{person.workPhone || "No informado"}</dd>
                </div>
                <div>
                  <dt>Ingreso</dt>
                  <dd>{formatDate(person.startDate)}</dd>
                </div>
                {person.endDate && (
                  <div>
                    <dt>Egreso</dt>
                    <dd>{formatDate(person.endDate)}</dd>
                  </div>
                )}
              </dl>
              {person.notes && (
                <p className="staff-summary__notes">{person.notes}</p>
              )}
            </section>

            <section aria-label="Equipos en custodia">
              <h3 className="staff-summary__legend">
                Equipos en custodia ({assets.length})
              </h3>
              {assets.length === 0 ? (
                <p className="staff-summary__empty">
                  Sin equipos en custodia.
                </p>
              ) : (
                <ul className="staff-summary__list">
                  {assets.map((asset) => (
                    <li key={asset.id} className="staff-summary__item">
                      <Laptop size={16} aria-hidden="true" />
                      <div>
                        <div className="staff-summary__item-top">
                          <span className="staff-employee-number">
                            {asset.assetTag}
                          </span>
                          <span className="staff-summary__chip">
                            {labelFrom(ASSET_STATUS_LABELS, asset.status)}
                          </span>
                        </div>
                        <p>
                          {labelFrom(ASSET_TYPE_LABELS, asset.type)}
                          {asset.brand || asset.model
                            ? ` · ${[asset.brand, asset.model].filter(Boolean).join(" ")}`
                            : ""}
                        </p>
                        {(asset.serialNumber || asset.location) && (
                          <small>
                            {[
                              asset.serialNumber && `S/N ${asset.serialNumber}`,
                              asset.location,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </small>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-label="Líneas asignadas">
              <h3 className="staff-summary__legend">
                Líneas asignadas ({phoneLines.length})
              </h3>
              {phoneLines.length === 0 ? (
                <p className="staff-summary__empty">Sin líneas asignadas.</p>
              ) : (
                <ul className="staff-summary__list">
                  {phoneLines.map((line) => (
                    <li key={line.id} className="staff-summary__item">
                      <Smartphone size={16} aria-hidden="true" />
                      <div>
                        <div className="staff-summary__item-top">
                          <span className="staff-employee-number">
                            {line.phoneNumber}
                          </span>
                          <span className="staff-summary__chip">
                            {labelFrom(PHONE_LINE_STATUS_LABELS, line.status)}
                          </span>
                        </div>
                        <p>
                          {carrierLabel(line.carrier, line.carrierOther)}
                          {line.planName ? ` · ${line.planName}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {history.length > 0 && (
              <section aria-label="Historial reciente de custodia">
                <h3 className="staff-summary__legend">Historial reciente</h3>
                <ul className="staff-summary__history">
                  {history.map((entry) => (
                    <li key={entry.key}>
                      <span className="staff-summary__chip">{entry.kind}</span>
                      <span className="staff-employee-number">
                        {entry.label}
                      </span>
                      <span>
                        {formatDate(entry.at)}
                        {entry.endAt
                          ? ` — devuelto ${formatDate(entry.endAt)}`
                          : " — vigente"}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
