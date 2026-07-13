import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { getMaintenanceErrorInfo } from "../api";
import { maintenanceAssetCode, maintenanceAssetName } from "../format";
import {
  MAINTENANCE_CURRENCIES,
  MAINTENANCE_STATUSES,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_TYPES,
  MAINTENANCE_TYPE_LABELS,
  type ItMaintenance,
  type MaintenanceAsset,
  type MaintenanceCurrency,
  type MaintenanceLookups,
  type MaintenancePart,
  type MaintenancePartPayload,
  type MaintenancePayload,
  type MaintenanceSaveCommand,
  type MaintenanceStatus,
  type MaintenanceType,
} from "../types";
import { useMaintenanceAssetSearch } from "../useMaintenance";

interface MaintenanceEditorPanelProps {
  mode: "create" | "edit";
  maintenance: ItMaintenance | null;
  lookups: MaintenanceLookups;
  lookupsLoading: boolean;
  lookupsError?: string;
  isLoading: boolean;
  isSaving: boolean;
  loadError?: string;
  onClose: () => void;
  onRetry: () => void;
  onRetryLookups: () => void;
  onReload: () => Promise<boolean>;
  onSave: (command: MaintenanceSaveCommand) => Promise<void>;
}

interface PartFormState {
  id: string;
  name: string;
  quantity: string;
  unitCost: string;
}

interface MaintenanceFormState {
  asset: MaintenanceAsset | null;
  type: MaintenanceType;
  status: MaintenanceStatus;
  scheduledAt: string;
  performedAt: string;
  description: string;
  performedById: string;
  supplierId: string;
  costAmount: string;
  currency: MaintenanceCurrency;
  parts: PartFormState[];
  ticketId: string;
}

let nextPartId = 0;

function newPart(part?: MaintenancePart): PartFormState {
  nextPartId += 1;
  return {
    id: `part-${nextPartId}`,
    name: part?.name ?? "",
    quantity: String(part?.quantity ?? 1),
    unitCost:
      part?.unitCost === null || part?.unitCost === undefined
        ? ""
        : String(part.unitCost),
  };
}

function toDateTimeLocal(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formStateFromMaintenance(
  maintenance: ItMaintenance | null,
): MaintenanceFormState {
  return {
    asset: maintenance?.asset ?? null,
    type: maintenance?.type ?? "PREVENTIVE",
    status: maintenance?.status ?? "SCHEDULED",
    scheduledAt: toDateTimeLocal(maintenance?.scheduledAt),
    performedAt: toDateTimeLocal(maintenance?.performedAt),
    description: maintenance?.description ?? "",
    performedById:
      maintenance?.performedById ?? maintenance?.performedBy?.id ?? "",
    supplierId: maintenance?.supplierId ?? maintenance?.supplier?.id ?? "",
    costAmount:
      maintenance?.costAmount === null || maintenance?.costAmount === undefined
        ? ""
        : String(maintenance.costAmount),
    currency: maintenance?.currency ?? "ARS",
    parts: maintenance?.parts?.map((part) => newPart(part)) ?? [],
    ticketId: maintenance?.ticketId ?? maintenance?.ticket?.id ?? "",
  };
}

function allowedStatuses(
  mode: "create" | "edit",
  currentStatus?: MaintenanceStatus,
): MaintenanceStatus[] {
  if (mode === "create") return ["SCHEDULED", "IN_PROGRESS", "COMPLETED"];
  if (currentStatus === "SCHEDULED") return MAINTENANCE_STATUSES.slice();
  if (currentStatus === "IN_PROGRESS")
    return ["IN_PROGRESS", "COMPLETED", "CANCELLED"];
  return currentStatus ? [currentStatus] : [];
}

function optionalId(value: string): string | null {
  return value.trim() || null;
}

export function MaintenanceEditorPanel({
  mode,
  maintenance,
  lookups,
  lookupsLoading,
  lookupsError,
  isLoading,
  isSaving,
  loadError,
  onClose,
  onRetry,
  onRetryLookups,
  onReload,
  onSave,
}: MaintenanceEditorPanelProps) {
  const [form, setForm] = useState<MaintenanceFormState>(() =>
    formStateFromMaintenance(maintenance),
  );
  const [assetSearchDraft, setAssetSearchDraft] = useState("");
  const [assetSearch, setAssetSearch] = useState("");
  const [hasSearchedAssets, setHasSearchedAssets] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [isReloading, setIsReloading] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const isSavingRef = useRef(isSaving);
  const isMountedRef = useRef(true);
  const hydratedVersionRef = useRef(
    mode === "edit" && maintenance
      ? `${maintenance.id}:${maintenance.updatedAt}`
      : null,
  );
  const assetSearchQuery = useMaintenanceAssetSearch(
    assetSearch,
    mode === "create" && hasSearchedAssets,
  );
  const titleId =
    mode === "edit"
      ? "maintenance-editor-title-edit"
      : "maintenance-editor-title-new";
  const statusOptions = allowedStatuses(mode, maintenance?.status);
  const performerOptions =
    maintenance?.performedBy &&
    !lookups.performers.some(
      (performer) => performer.id === maintenance.performedBy?.id,
    )
      ? [maintenance.performedBy, ...lookups.performers]
      : lookups.performers;
  const supplierOptions =
    maintenance?.supplier &&
    !lookups.suppliers.some(
      (supplier) => supplier.id === maintenance.supplier?.id,
    )
      ? [maintenance.supplier, ...lookups.suppliers]
      : lookups.suppliers;

  useEffect(() => {
    isSavingRef.current = isSaving;
  }, [isSaving]);

  useEffect(() => {
    if (mode !== "edit" || !maintenance) return;
    const version = `${maintenance.id}:${maintenance.updatedAt}`;
    if (hydratedVersionRef.current === version) return;
    hydratedVersionRef.current = version;
    setForm(formStateFromMaintenance(maintenance));
    setSubmitError(null);
    setConflictMessage(null);
  }, [maintenance, mode]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSavingRef.current) onClose();
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
      if (!isLoading && !loadError) descriptionRef.current?.focus();
      else closeButtonRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isLoading, loadError]);

  const updateField = <K extends keyof MaintenanceFormState>(
    field: K,
    value: MaintenanceFormState[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSubmitError(null);
  };

  const handleStatusChange = (status: MaintenanceStatus) => {
    setForm((current) => ({
      ...current,
      status,
      performedAt: status === "COMPLETED" ? current.performedAt : "",
    }));
    setSubmitError(null);
  };

  const submitAssetSearch = () => {
    setAssetSearch(assetSearchDraft.trim());
    setHasSearchedAssets(true);
  };

  const updatePart = (
    id: string,
    field: "name" | "quantity" | "unitCost",
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      parts: current.parts.map((part) =>
        part.id === id ? { ...part, [field]: value } : part,
      ),
    }));
    setSubmitError(null);
  };

  const handleReload = async () => {
    setIsReloading(true);
    setSubmitError(null);
    try {
      const reloaded = await onReload();
      if (reloaded && isMountedRef.current) setConflictMessage(null);
    } catch (error) {
      if (isMountedRef.current)
        setSubmitError(getMaintenanceErrorInfo(error).message);
    } finally {
      if (isMountedRef.current) setIsReloading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    if (!form.asset) {
      setSubmitError("Seleccioná el activo que recibió la intervención.");
      return;
    }
    if (form.status === "SCHEDULED" && !form.scheduledAt) {
      setSubmitError(
        "La fecha programada es obligatoria para una intervención agendada.",
      );
      return;
    }
    if (form.status === "COMPLETED" && !form.performedAt) {
      setSubmitError(
        "La fecha de ejecución es obligatoria al completar un mantenimiento.",
      );
      return;
    }
    if (
      form.status === "COMPLETED" &&
      !form.performedById &&
      !form.supplierId
    ) {
      setSubmitError(
        "Indicá el responsable interno o el proveedor que realizó el mantenimiento.",
      );
      return;
    }
    const invalidPart = form.parts.some(
      (part) =>
        !part.name.trim() ||
        part.name.trim().length > 200 ||
        !Number.isInteger(Number(part.quantity)) ||
        Number(part.quantity) < 1 ||
        Number(part.quantity) > 100_000 ||
        (part.unitCost !== "" &&
          !/^\d{1,12}(?:\.\d{1,2})?$/.test(part.unitCost)),
    );
    if (invalidPart) {
      setSubmitError(
        "Cada repuesto necesita nombre, cantidad entera positiva y un costo válido si se informa.",
      );
      return;
    }

    const costAmount = form.costAmount === "" ? null : form.costAmount;
    if (costAmount !== null && !/^\d{1,12}(?:\.\d{1,2})?$/.test(costAmount)) {
      setSubmitError(
        "El costo total debe ser un importe no negativo con hasta dos decimales.",
      );
      return;
    }

    const parts: MaintenancePartPayload[] = form.parts.map((part) => ({
      name: part.name.trim(),
      quantity: Number(part.quantity),
      unitCost: part.unitCost === "" ? null : part.unitCost,
    }));
    const payload: MaintenancePayload = {
      assetId: form.asset.id,
      type: form.type,
      status: form.status,
      scheduledAt: toIso(form.scheduledAt),
      performedAt: form.status === "COMPLETED" ? toIso(form.performedAt) : null,
      description: form.description.trim(),
      performedById: optionalId(form.performedById),
      supplierId: optionalId(form.supplierId),
      costAmount,
      currency: form.currency,
      parts,
      ticketId: optionalId(form.ticketId),
    };

    try {
      if (mode === "edit") {
        if (!maintenance)
          throw new Error("No se pudo identificar el mantenimiento a editar.");
        await onSave({
          mode: "edit",
          id: maintenance.id,
          payload: { ...payload, expectedUpdatedAt: maintenance.updatedAt },
        });
      } else {
        await onSave({ mode: "create", payload });
      }
    } catch (error) {
      const info = getMaintenanceErrorInfo(error);
      if (info.isConflict) setConflictMessage(info.message);
      else setSubmitError(info.message);
    }
  };

  return (
    <div className="maintenance-dialog-backdrop">
      <section
        ref={dialogRef}
        className="maintenance-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="maintenance-dialog__header">
          <div>
            <span>{mode === "edit" ? "EDICIÓN / MNT" : "ALTA / MNT"}</span>
            <h2 id={titleId}>
              {mode === "edit"
                ? "Editar mantenimiento"
                : "Registrar mantenimiento"}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="maintenance-icon-button"
            aria-label="Cerrar panel de mantenimiento"
            disabled={isSaving}
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {isLoading ? (
          <div className="maintenance-dialog__state" role="status">
            <Loader2
              size={24}
              className="maintenance-spin"
              aria-hidden="true"
            />
            <strong>Cargando intervención</strong>
            <p>Consultando la versión actual del registro.</p>
          </div>
        ) : loadError ? (
          <div className="maintenance-dialog__state" role="alert">
            <AlertTriangle size={24} aria-hidden="true" />
            <strong>No se pudo abrir el mantenimiento</strong>
            <p>{loadError}</p>
            <button
              type="button"
              className="maintenance-button maintenance-button--ghost"
              onClick={onRetry}
            >
              <RotateCcw size={15} aria-hidden="true" /> Reintentar
            </button>
          </div>
        ) : (
          <form className="maintenance-form" onSubmit={handleSubmit}>
            <fieldset>
              <legend>Activo e intervención</legend>
              {mode === "create" ? (
                <div className="maintenance-asset-picker">
                  <label htmlFor="maintenance-asset-search">Activo</label>
                  {form.asset ? (
                    <div className="maintenance-asset-selected">
                      <div>
                        <span>{maintenanceAssetCode(form.asset)}</span>
                        <strong>{maintenanceAssetName(form.asset)}</strong>
                      </div>
                      <button
                        type="button"
                        className="maintenance-button maintenance-button--ghost"
                        onClick={() => updateField("asset", null)}
                      >
                        Cambiar activo
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="maintenance-asset-search">
                        <Search size={16} aria-hidden="true" />
                        <input
                          id="maintenance-asset-search"
                          type="search"
                          value={assetSearchDraft}
                          placeholder="Etiqueta, serie, marca o modelo"
                          onChange={(event) =>
                            setAssetSearchDraft(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key !== "Enter") return;
                            event.preventDefault();
                            submitAssetSearch();
                          }}
                        />
                        <button
                          type="button"
                          disabled={assetSearchQuery.isFetching}
                          onClick={submitAssetSearch}
                        >
                          Buscar
                        </button>
                      </div>
                      {assetSearchQuery.isFetching ? (
                        <p className="maintenance-picker-state" role="status">
                          <Loader2
                            size={15}
                            className="maintenance-spin"
                            aria-hidden="true"
                          />
                          Buscando activos…
                        </p>
                      ) : assetSearchQuery.isError ? (
                        <div className="maintenance-picker-state" role="alert">
                          <AlertTriangle size={15} aria-hidden="true" />
                          <span>
                            {
                              getMaintenanceErrorInfo(assetSearchQuery.error)
                                .message
                            }
                          </span>
                          <button
                            type="button"
                            onClick={() => void assetSearchQuery.refetch()}
                          >
                            Reintentar
                          </button>
                        </div>
                      ) : hasSearchedAssets &&
                        (assetSearchQuery.data?.items.length ?? 0) === 0 ? (
                        <p className="maintenance-picker-state">
                          No se encontraron activos.
                        </p>
                      ) : (
                        <ul className="maintenance-asset-results">
                          {assetSearchQuery.data?.items.map((asset) => (
                            <li key={asset.id}>
                              <button
                                type="button"
                                onClick={() => updateField("asset", asset)}
                              >
                                <span>{maintenanceAssetCode(asset)}</span>
                                <strong>{maintenanceAssetName(asset)}</strong>
                                <small>
                                  {asset.status || "Estado no informado"}
                                </small>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              ) : maintenance?.asset ? (
                <div className="maintenance-asset-selected maintenance-asset-selected--locked">
                  <div>
                    <span>{maintenanceAssetCode(maintenance.asset)}</span>
                    <strong>{maintenanceAssetName(maintenance.asset)}</strong>
                  </div>
                  <small>
                    El activo queda fijo para preservar el historial.
                  </small>
                </div>
              ) : null}

              <div className="maintenance-form__grid">
                <label>
                  Tipo
                  <select
                    value={form.type}
                    onChange={(event) =>
                      updateField("type", event.target.value as MaintenanceType)
                    }
                  >
                    {MAINTENANCE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {MAINTENANCE_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Estado
                  <select
                    aria-label="Estado"
                    value={form.status}
                    disabled={
                      mode === "edit" &&
                      (maintenance?.status === "COMPLETED" ||
                        maintenance?.status === "CANCELLED")
                    }
                    onChange={(event) =>
                      handleStatusChange(
                        event.target.value as MaintenanceStatus,
                      )
                    }
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {MAINTENANCE_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                  {mode === "edit" &&
                  (maintenance?.status === "COMPLETED" ||
                    maintenance?.status === "CANCELLED") ? (
                    <small>
                      Estado terminal: se pueden corregir datos, no reabrir el
                      flujo.
                    </small>
                  ) : null}
                </label>
                <label>
                  Fecha programada <span>Obligatoria si está programado</span>
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    required={form.status === "SCHEDULED"}
                    onChange={(event) =>
                      updateField("scheduledAt", event.target.value)
                    }
                  />
                </label>
                <label>
                  Fecha de ejecución <span>Obligatoria al completar</span>
                  <input
                    type="datetime-local"
                    value={form.performedAt}
                    aria-required={form.status === "COMPLETED"}
                    disabled={form.status !== "COMPLETED"}
                    onChange={(event) =>
                      updateField("performedAt", event.target.value)
                    }
                  />
                </label>
              </div>
              <label className="maintenance-form__wide">
                Descripción
                <textarea
                  ref={descriptionRef}
                  rows={4}
                  maxLength={10_000}
                  required
                  value={form.description}
                  placeholder="Trabajo previsto, diagnóstico y resultado esperado"
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                />
              </label>
            </fieldset>

            <fieldset>
              <legend>Responsabilidad y trazabilidad</legend>
              {lookupsError ? (
                <div className="maintenance-reference-error" role="alert">
                  <AlertTriangle size={16} aria-hidden="true" />
                  <div>
                    <strong>
                      No se pudieron cargar responsables y proveedores
                    </strong>
                    <p>{lookupsError}</p>
                    <button type="button" onClick={onRetryLookups}>
                      Reintentar referencias
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="maintenance-form__grid">
                <label>
                  Responsable interno <span>Opcional</span>
                  <select
                    value={form.performedById}
                    disabled={lookupsLoading || Boolean(lookupsError)}
                    onChange={(event) =>
                      updateField("performedById", event.target.value)
                    }
                  >
                    <option value="">Sin responsable interno</option>
                    {performerOptions.map((performer) => (
                      <option key={performer.id} value={performer.id}>
                        {performer.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Proveedor <span>Opcional</span>
                  <select
                    value={form.supplierId}
                    disabled={lookupsLoading || Boolean(lookupsError)}
                    onChange={(event) =>
                      updateField("supplierId", event.target.value)
                    }
                  >
                    <option value="">Sin proveedor externo</option>
                    {supplierOptions.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Ticket vinculado <span>Opcional</span>
                  <input
                    value={form.ticketId}
                    list="maintenance-ticket-options"
                    placeholder="ID técnico del ticket"
                    aria-describedby="maintenance-ticket-help"
                    onChange={(event) =>
                      updateField("ticketId", event.target.value)
                    }
                  />
                  <datalist id="maintenance-ticket-options">
                    {lookups.tickets.map((ticket) => (
                      <option key={ticket.id} value={ticket.id}>
                        {ticket.ticketNumber ? `${ticket.ticketNumber} — ` : ""}
                        {ticket.title}
                      </option>
                    ))}
                  </datalist>
                  <small id="maintenance-ticket-help">
                    Copiá el ID del ticket que originó el trabajo.
                  </small>
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend>Costos y repuestos</legend>
              <div className="maintenance-form__grid maintenance-form__grid--cost">
                <label>
                  Costo total <span>Opcional</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.costAmount}
                    onChange={(event) =>
                      updateField("costAmount", event.target.value)
                    }
                  />
                </label>
                <label>
                  Moneda
                  <select
                    value={form.currency}
                    onChange={(event) =>
                      updateField(
                        "currency",
                        event.target.value as MaintenanceCurrency,
                      )
                    }
                  >
                    {MAINTENANCE_CURRENCIES.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="maintenance-parts">
                <div className="maintenance-parts__header">
                  <div>
                    <strong>Repuestos utilizados</strong>
                    <small>Nombre, cantidad y costo unitario opcional.</small>
                  </div>
                  <button
                    type="button"
                    className="maintenance-button maintenance-button--ghost"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        parts: [...current.parts, newPart()],
                      }))
                    }
                  >
                    <Plus size={14} aria-hidden="true" /> Agregar repuesto
                  </button>
                </div>
                {form.parts.map((part, index) => (
                  <div className="maintenance-part-row" key={part.id}>
                    <label>
                      Nombre
                      <input
                        value={part.name}
                        aria-label={`Nombre del repuesto ${index + 1}`}
                        onChange={(event) =>
                          updatePart(part.id, "name", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Cantidad
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={part.quantity}
                        aria-label={`Cantidad del repuesto ${index + 1}`}
                        onChange={(event) =>
                          updatePart(part.id, "quantity", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Costo unitario
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={part.unitCost}
                        aria-label={`Costo unitario del repuesto ${index + 1}`}
                        onChange={(event) =>
                          updatePart(part.id, "unitCost", event.target.value)
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="maintenance-icon-button"
                      aria-label={`Quitar repuesto ${index + 1}`}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          parts: current.parts.filter(
                            (item) => item.id !== part.id,
                          ),
                        }))
                      }
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </fieldset>

            {conflictMessage ? (
              <div className="maintenance-form__conflict" role="alert">
                <RefreshCw size={18} aria-hidden="true" />
                <div>
                  <strong>Hay una versión más reciente</strong>
                  <p>{conflictMessage}</p>
                  <button
                    type="button"
                    className="maintenance-button maintenance-button--ghost"
                    disabled={isReloading}
                    onClick={() => void handleReload()}
                  >
                    {isReloading ? (
                      <Loader2
                        size={15}
                        className="maintenance-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <RefreshCw size={15} aria-hidden="true" />
                    )}
                    Recargar versión actual
                  </button>
                </div>
              </div>
            ) : null}
            {submitError ? (
              <div className="maintenance-form__error" role="alert">
                <AlertTriangle size={16} aria-hidden="true" /> {submitError}
              </div>
            ) : null}
            <footer className="maintenance-dialog__footer">
              <button
                type="button"
                className="maintenance-button maintenance-button--ghost"
                disabled={isSaving}
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="maintenance-button maintenance-button--primary"
                disabled={isSaving || Boolean(conflictMessage)}
              >
                {isSaving ? (
                  <Loader2
                    size={15}
                    className="maintenance-spin"
                    aria-hidden="true"
                  />
                ) : null}
                {mode === "edit"
                  ? "Guardar cambios"
                  : "Registrar mantenimiento"}
              </button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}
