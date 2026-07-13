import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Building2,
  History,
  Loader2,
  PackageCheck,
  RotateCcw,
  Undo2,
  Users,
  X,
} from "lucide-react";
import { getInventoryErrorMessage } from "../api";
import { ASSET_STATUS_LABELS, type ItAsset } from "../types";
import type {
  AssignAssetPayload,
  CustodyDepartment,
  CustodyPerson,
  ReturnAssetPayload,
} from "./types";
import "./custody.css";

interface CustodyPanelProps {
  asset: ItAsset | null;
  isLoading: boolean;
  loadError?: string;
  people: CustodyPerson[];
  departments: CustodyDepartment[];
  lookupsLoading: boolean;
  lookupsError?: string;
  isSubmitting: boolean;
  onClose: () => void;
  onRetryAsset: () => void;
  onRetryLookups: () => void;
  onAssign: (payload: AssignAssetPayload) => Promise<void>;
  onReturn: (payload: ReturnAssetPayload) => Promise<void>;
}

const NON_ASSIGNABLE_REASON = {
  IN_REPAIR:
    "El activo está en reparación. Debe volver a En depósito antes de asignarlo.",
  RETIRED:
    "El activo está dado de baja y no puede entrar nuevamente en custodia.",
  LOST: "El activo figura como extraviado y no puede asignarse.",
} as const;

function personName(person?: CustodyPerson | null): string {
  if (!person) return "Sin persona";
  return `${person.firstName} ${person.lastName}`.trim();
}

function formatDate(value?: string | null): string {
  if (!value) return "Actual";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function optionalText(value: string): string | null {
  return value.trim() || null;
}

export function CustodyPanel({
  asset,
  isLoading,
  loadError,
  people,
  departments,
  lookupsLoading,
  lookupsError,
  isSubmitting,
  onClose,
  onRetryAsset,
  onRetryLookups,
  onAssign,
  onReturn,
}: CustodyPanelProps) {
  const [personId, setPersonId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [note, setNote] = useState("");
  const [returnNote, setReturnNote] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const firstControlRef = useRef<HTMLSelectElement>(null);
  const isSubmittingRef = useRef(isSubmitting);
  const titleId = "asset-custody-title";

  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmittingRef.current) onClose();
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (
        event.shiftKey &&
        (active === first || !dialogRef.current?.contains(active))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (active === last || !dialogRef.current?.contains(active))
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (firstControlRef.current) firstControlRef.current.focus();
      else closeButtonRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [asset?.status, isLoading, lookupsLoading]);

  useEffect(() => {
    if (personId && !people.some((person) => person.id === personId)) {
      setPersonId("");
    }
  }, [people, personId]);

  useEffect(() => {
    if (
      departmentId &&
      !departments.some((department) => department.id === departmentId)
    ) {
      setDepartmentId("");
    }
  }, [departmentId, departments]);

  const handleAssign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    if (!personId && !departmentId) {
      setSubmitError("Seleccioná una persona y/o un sector.");
      return;
    }

    try {
      await onAssign({
        personId: personId || undefined,
        departmentId: departmentId || undefined,
        note: optionalText(note),
      });
    } catch (error) {
      setSubmitError(getInventoryErrorMessage(error));
    }
  };

  const handleReturn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    try {
      await onReturn({ returnNote: optionalText(returnNote) });
    } catch (error) {
      setSubmitError(getInventoryErrorMessage(error));
    }
  };

  const recentAssignments = asset?.assignments?.slice(0, 6) ?? [];
  const assetLabel =
    asset?.assetTag ||
    (asset ? `${asset.brand} ${asset.model}`.trim() : "Activo");

  return (
    <div className="custody-backdrop">
      <section
        ref={dialogRef}
        className="custody-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="custody-dialog__header">
          <div>
            <span>CUSTODIA / TRAZABILIDAD</span>
            <h2 id={titleId}>Custodia de {assetLabel}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="inventory-icon-button"
            aria-label="Cerrar panel de custodia"
            disabled={isSubmitting}
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="custody-dialog__content">
          {isLoading ? (
            <div className="custody-state" role="status">
              <Loader2
                size={25}
                className="inventory-spin"
                aria-hidden="true"
              />
              <strong>Cargando custodia</strong>
              <p>Consultando titular, sector e historial del activo.</p>
            </div>
          ) : loadError || !asset ? (
            <div className="custody-state custody-state--error" role="alert">
              <AlertTriangle size={25} aria-hidden="true" />
              <strong>No se pudo abrir la custodia</strong>
              <p>{loadError ?? "El activo no está disponible."}</p>
              <button
                type="button"
                className="inventory-button inventory-button--ghost"
                onClick={onRetryAsset}
              >
                <RotateCcw size={15} aria-hidden="true" />
                Reintentar
              </button>
            </div>
          ) : (
            <>
              <div className="custody-asset-strip">
                <div>
                  <span>{asset.assetTag}</span>
                  <strong>
                    {asset.brand} {asset.model}
                  </strong>
                </div>
                <span className="inventory-status" data-status={asset.status}>
                  {ASSET_STATUS_LABELS[asset.status]}
                </span>
              </div>

              {asset.status === "IN_STOCK" ? (
                <section
                  className="custody-operation"
                  aria-labelledby="custody-assign-title"
                >
                  <div className="custody-operation__heading">
                    <PackageCheck size={20} aria-hidden="true" />
                    <div>
                      <h3 id="custody-assign-title">Asignar activo</h3>
                      <p>Indicá una persona, un sector o ambos.</p>
                    </div>
                  </div>

                  {lookupsLoading ? (
                    <div className="custody-inline-state" role="status">
                      <Loader2
                        size={17}
                        className="inventory-spin"
                        aria-hidden="true"
                      />
                      Cargando personas y sectores
                    </div>
                  ) : lookupsError ? (
                    <div
                      className="custody-inline-state custody-inline-state--error"
                      role="alert"
                    >
                      <AlertTriangle size={17} aria-hidden="true" />
                      <span>{lookupsError}</span>
                      <button type="button" onClick={onRetryLookups}>
                        Reintentar
                      </button>
                    </div>
                  ) : (
                    <form className="custody-form" onSubmit={handleAssign}>
                      <div className="custody-form__grid">
                        <label>
                          Persona <span>Opcional</span>
                          <select
                            ref={firstControlRef}
                            value={personId}
                            onChange={(event) =>
                              setPersonId(event.target.value)
                            }
                          >
                            <option value="">Sin persona</option>
                            {people.map((person) => (
                              <option key={person.id} value={person.id}>
                                {personName(person)}
                                {person.employeeNumber
                                  ? ` · ${person.employeeNumber}`
                                  : ""}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Sector <span>Opcional</span>
                          <select
                            value={departmentId}
                            onChange={(event) =>
                              setDepartmentId(event.target.value)
                            }
                          >
                            <option value="">Sin sector</option>
                            {departments.map((department) => (
                              <option key={department.id} value={department.id}>
                                {department.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <label>
                        Observación de entrega <span>Opcional</span>
                        <textarea
                          rows={3}
                          maxLength={1000}
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                        />
                      </label>
                      {submitError ? (
                        <div className="custody-submit-error" role="alert">
                          <AlertTriangle size={15} aria-hidden="true" />
                          {submitError}
                        </div>
                      ) : null}
                      <button
                        type="submit"
                        className="inventory-button inventory-button--primary"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <Loader2
                            size={15}
                            className="inventory-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <PackageCheck size={15} aria-hidden="true" />
                        )}
                        Asignar activo
                      </button>
                    </form>
                  )}
                </section>
              ) : null}

              {asset.status === "ASSIGNED" ? (
                <section
                  className="custody-operation"
                  aria-labelledby="custody-return-title"
                >
                  <div className="custody-operation__heading">
                    <Undo2 size={20} aria-hidden="true" />
                    <div>
                      <h3 id="custody-return-title">Custodia vigente</h3>
                      <p>Registrá la devolución para liberar el activo.</p>
                    </div>
                  </div>
                  <dl className="custody-current">
                    <div>
                      <dt>
                        <Users size={14} aria-hidden="true" /> Persona
                      </dt>
                      <dd>{personName(asset.assignedPerson)}</dd>
                    </div>
                    <div>
                      <dt>
                        <Building2 size={14} aria-hidden="true" /> Sector
                      </dt>
                      <dd>{asset.assignedDepartment?.name ?? "Sin sector"}</dd>
                    </div>
                  </dl>
                  <form className="custody-form" onSubmit={handleReturn}>
                    <label>
                      Estado al devolver <span>Opcional</span>
                      <textarea
                        rows={3}
                        maxLength={1000}
                        value={returnNote}
                        onChange={(event) => setReturnNote(event.target.value)}
                      />
                    </label>
                    {submitError ? (
                      <div className="custody-submit-error" role="alert">
                        <AlertTriangle size={15} aria-hidden="true" />
                        {submitError}
                      </div>
                    ) : null}
                    <button
                      type="submit"
                      className="inventory-button inventory-button--primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2
                          size={15}
                          className="inventory-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Undo2 size={15} aria-hidden="true" />
                      )}
                      Registrar devolución
                    </button>
                  </form>
                </section>
              ) : null}

              {asset.status !== "IN_STOCK" && asset.status !== "ASSIGNED" ? (
                <div className="custody-unavailable" role="note">
                  <AlertTriangle size={21} aria-hidden="true" />
                  <div>
                    <strong>Activo no asignable</strong>
                    <p>{NON_ASSIGNABLE_REASON[asset.status]}</p>
                  </div>
                </div>
              ) : null}

              <section
                className="custody-history"
                aria-labelledby="custody-history-title"
              >
                <div className="custody-history__heading">
                  <History size={18} aria-hidden="true" />
                  <h3 id="custody-history-title">Historial reciente</h3>
                </div>
                {recentAssignments.length > 0 ? (
                  <ol>
                    {recentAssignments.map((assignment) => (
                      <li key={assignment.id}>
                        <div>
                          <strong>{personName(assignment.person)}</strong>
                          <span>
                            {assignment.department?.name ?? "Sin sector"}
                          </span>
                        </div>
                        <span>
                          {formatDate(assignment.startAt)} →{" "}
                          {formatDate(assignment.endAt)}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="custody-history__empty">
                    Sin movimientos anteriores.
                  </p>
                )}
              </section>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
