import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Loader2,
  PackageCheck,
  RotateCcw,
  X,
} from "lucide-react";
import { getInventoryErrorMessage } from "../api";
import {
  ASSET_STATUSES,
  ASSET_STATUS_LABELS,
  ASSET_TAG_FORMAT_MESSAGE,
  ASSET_TAG_PATTERN,
  ASSET_TYPES,
  ASSET_TYPE_LABELS,
  HOSTNAME_ASSET_TYPES,
  IMEI_ASSET_TYPES,
  type AssetCreatePayload,
  type AssetSaveCommand,
  type AssetSpecs,
  type AssetStatus,
  type AssetType,
  type ItAsset,
  type AssetWritablePayload,
} from "../types";

export interface AssetPurchaseOrigin {
  purchaseId: string;
  purchaseItemId: string;
  purchaseCode: string;
  itemDescription: string;
}

interface AssetEditorPanelProps {
  mode: "create" | "edit";
  asset: ItAsset | null;
  isLoading: boolean;
  isSaving: boolean;
  loadError?: string;
  purchaseOrigin?: AssetPurchaseOrigin | null;
  onClose: () => void;
  onRetry: () => void;
  onSave: (command: AssetSaveCommand) => Promise<void>;
}

interface AssetFormState {
  type: AssetType;
  status: AssetStatus;
  brand: string;
  model: string;
  serialNumber: string;
  assetTag: string;
  location: string;
  warrantyUntil: string;
  notes: string;
  imei: string;
}

// Lo técnico no se carga a mano: si el equipo se dio de alta desde Equipos en vivo, lo
// completó el agente, y si no, se busca por el modelo. Se muestra de solo lectura.
const TECHNICAL_SPECS: Array<[keyof AssetSpecs, string]> = [
  ["cpu", "Procesador"],
  ["ramGb", "RAM"],
  ["storage", "Almacenamiento"],
  ["os", "Sistema operativo"],
  ["mac", "MAC"],
];

function technicalSpecRows(specs?: AssetSpecs | null): Array<[string, string]> {
  if (!specs) return [];
  return TECHNICAL_SPECS.flatMap(([key, label]): Array<[string, string]> => {
    const value = specs[key];
    if (value === undefined || value === null || value === "") return [];
    return [[label, key === "ramGb" ? `${String(value)} GB` : String(value)]];
  });
}

function toDateInput(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formStateFromAsset(asset: ItAsset | null): AssetFormState {
  return {
    type: asset?.type ?? "NOTEBOOK",
    status: asset?.status ?? "IN_STOCK",
    brand: asset?.brand ?? "",
    model: asset?.model ?? "",
    serialNumber: asset?.serialNumber ?? "",
    assetTag: asset?.assetTag ?? "",
    location: asset?.location ?? "",
    warrantyUntil: toDateInput(asset?.warrantyUntil),
    notes: asset?.notes ?? "",
    imei: asset?.specs?.imei ?? "",
  };
}

function optionalValue(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

const MANUAL_ASSET_STATUSES = ASSET_STATUSES.filter(
  (status) => status !== "ASSIGNED" && status !== "IN_REPAIR",
);

export function AssetEditorPanel({
  mode,
  asset,
  isLoading,
  isSaving,
  loadError,
  purchaseOrigin,
  onClose,
  onRetry,
  onSave,
}: AssetEditorPanelProps) {
  const [form, setForm] = useState<AssetFormState>(() =>
    formStateFromAsset(asset),
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const isSavingRef = useRef(isSaving);
  const titleId =
    mode === "edit"
      ? "inventory-editor-title-edit"
      : "inventory-editor-title-new";
  const usesHostname = HOSTNAME_ASSET_TYPES.has(form.type);
  const technicalSpecs = technicalSpecRows(asset?.specs);

  useEffect(() => {
    isSavingRef.current = isSaving;
  }, [isSaving]);

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
      const activeElement = document.activeElement;
      if (
        event.shiftKey &&
        (activeElement === first || !dialogRef.current?.contains(activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (activeElement === last || !dialogRef.current?.contains(activeElement))
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
    const focusTimer = window.setTimeout(() => {
      if (!isLoading && !loadError) {
        firstInputRef.current?.focus();
      } else {
        closeButtonRef.current?.focus();
      }
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [isLoading, loadError]);

  const updateField = <K extends keyof AssetFormState>(
    field: K,
    value: AssetFormState[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const assetTag = form.assetTag.trim().toUpperCase();
    if (mode === "edit" && !assetTag) {
      setSubmitError(
        "La etiqueta no puede quedar vacía: poné el nombre de host o el código del equipo.",
      );
      return;
    }
    if (assetTag && !ASSET_TAG_PATTERN.test(assetTag)) {
      setSubmitError(ASSET_TAG_FORMAT_MESSAGE);
      return;
    }

    // Se conserva lo técnico que ya tenga la ficha; a mano solo se toca el IMEI.
    const specs: AssetSpecs = { ...(asset?.specs ?? {}) };
    if (IMEI_ASSET_TYPES.has(form.type)) {
      const imei = form.imei.trim();
      if (imei) specs.imei = imei;
      else delete specs.imei;
    }

    const shouldSendAssetTag =
      Boolean(assetTag) && assetTag !== (asset?.assetTag ?? "").toUpperCase();

    const payload: AssetWritablePayload = {
      type: form.type,
      status: form.status,
      brand: form.brand.trim(),
      model: form.model.trim(),
      serialNumber: optionalValue(form.serialNumber),
      location: optionalValue(form.location),
      warrantyUntil: optionalValue(form.warrantyUntil),
      notes: optionalValue(form.notes),
      specs: Object.keys(specs).length > 0 ? specs : null,
    };
    if (shouldSendAssetTag) payload.assetTag = assetTag;

    try {
      if (mode === "edit") {
        if (!asset)
          throw new Error("No se pudo identificar el activo a editar.");
        await onSave({
          mode: "edit",
          id: asset.id,
          payload: { ...payload, expectedUpdatedAt: asset.updatedAt },
        });
      } else {
        const createPayload: AssetCreatePayload = purchaseOrigin
          ? { ...payload, purchaseItemId: purchaseOrigin.purchaseItemId }
          : payload;
        await onSave({ mode: "create", payload: createPayload });
      }
    } catch (error) {
      setSubmitError(getInventoryErrorMessage(error));
    }
  };

  return (
    <div className="inventory-dialog-backdrop">
      <section
        ref={dialogRef}
        className="inventory-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="inventory-dialog__header">
          <div>
            <span>
              {mode === "edit" ? "EDICIÓN / ACTIVO" : "ALTA / ACTIVO"}
            </span>
            <h2 id={titleId}>
              {mode === "edit" ? "Editar activo" : "Registrar activo"}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="inventory-icon-button"
            aria-label="Cerrar panel de activo"
            disabled={isSaving}
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {isLoading ? (
          <div className="inventory-dialog__state" role="status">
            <Loader2 size={24} className="inventory-spin" aria-hidden="true" />
            <strong>Cargando ficha técnica</strong>
            <p>Consultando el registro completo del activo.</p>
          </div>
        ) : loadError ? (
          <div className="inventory-dialog__state" role="alert">
            <AlertTriangle size={24} aria-hidden="true" />
            <strong>No se pudo abrir el activo</strong>
            <p>{loadError}</p>
            <button
              type="button"
              className="inventory-button inventory-button--ghost"
              onClick={onRetry}
            >
              <RotateCcw size={15} aria-hidden="true" />
              Reintentar
            </button>
          </div>
        ) : (
          <form className="inventory-form" onSubmit={handleSubmit}>
            {mode === "create" && purchaseOrigin ? (
              <div className="inventory-purchase-origin" role="note">
                <PackageCheck size={18} aria-hidden="true" />
                <div>
                  <strong>
                    Alta vinculada a {purchaseOrigin.purchaseCode}
                  </strong>
                  <p>{purchaseOrigin.itemDescription}</p>
                  <small>
                    El activo quedará asociado al renglón recibido para medir el
                    avance de inventariado.
                  </small>
                </div>
              </div>
            ) : null}
            <fieldset>
              <legend>Identificación y estado</legend>
              <div className="inventory-form__grid">
                <label>
                  Tipo
                  <select
                    value={form.type}
                    onChange={(event) =>
                      updateField("type", event.target.value as AssetType)
                    }
                  >
                    {ASSET_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {ASSET_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="inventory-form__field">
                  <label htmlFor="asset-tag">
                    {usesHostname ? "Nombre de host" : "Etiqueta"}{" "}
                    <span>{mode === "edit" ? "Obligatoria" : "Opcional"}</span>
                  </label>
                  <input
                    ref={firstInputRef}
                    id="asset-tag"
                    value={form.assetTag}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={
                      usesHostname
                        ? "Ej. DESKTOP-4K2M1QF"
                        : "Se genera si la dejás vacía"
                    }
                    aria-describedby="asset-tag-help"
                    onChange={(event) =>
                      updateField("assetTag", event.target.value.toUpperCase())
                    }
                  />
                  <small id="asset-tag-help">
                    {usesHostname
                      ? "Es la etiqueta que se pega en el equipo. En Windows: Configuración → Sistema → Información → Nombre del dispositivo."
                      : "Es la etiqueta que se pega en el equipo."}
                    {mode === "create"
                      ? " Si la dejás vacía, se genera un código provisorio para cambiarlo después."
                      : null}
                  </small>
                </div>

                <label>
                  Marca
                  <input
                    required
                    value={form.brand}
                    autoComplete="off"
                    onChange={(event) =>
                      updateField("brand", event.target.value)
                    }
                  />
                </label>

                <label>
                  Modelo
                  <input
                    required
                    value={form.model}
                    autoComplete="off"
                    onChange={(event) =>
                      updateField("model", event.target.value)
                    }
                  />
                </label>

                <label>
                  Número de serie <span>Opcional</span>
                  <input
                    value={form.serialNumber}
                    autoComplete="off"
                    onChange={(event) =>
                      updateField("serialNumber", event.target.value)
                    }
                  />
                </label>

                {IMEI_ASSET_TYPES.has(form.type) ? (
                  <label>
                    IMEI <span>Opcional</span>
                    <input
                      value={form.imei}
                      inputMode="numeric"
                      autoComplete="off"
                      onChange={(event) =>
                        updateField("imei", event.target.value)
                      }
                    />
                  </label>
                ) : null}

                {asset?.status === "ASSIGNED" ||
                asset?.status === "IN_REPAIR" ? (
                  <div className="inventory-form__field">
                    <label htmlFor="asset-status">Estado</label>
                    <input
                      id="asset-status"
                      value={ASSET_STATUS_LABELS[asset.status]}
                      disabled
                      aria-describedby="managed-status-help"
                    />
                    <small id="managed-status-help">
                      {asset.status === "ASSIGNED"
                        ? "La asignación se administra desde el flujo de custodia."
                        : "En reparación se administra cerrando o cancelando el mantenimiento en curso."}
                    </small>
                  </div>
                ) : (
                  <div className="inventory-form__field">
                    <label htmlFor="asset-status">Estado</label>
                    <select
                      id="asset-status"
                      value={form.status}
                      aria-describedby="available-status-help"
                      onChange={(event) =>
                        updateField("status", event.target.value as AssetStatus)
                      }
                    >
                      {MANUAL_ASSET_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {ASSET_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                    <small id="available-status-help">
                      Asignado se establece desde Custodia y En reparación desde
                      Mantenimientos.
                    </small>
                  </div>
                )}

                <label>
                  Ubicación <span>Opcional</span>
                  <input
                    value={form.location}
                    autoComplete="off"
                    onChange={(event) =>
                      updateField("location", event.target.value)
                    }
                  />
                </label>

                <label>
                  Garantía hasta <span>Opcional</span>
                  <input
                    type="date"
                    value={form.warrantyUntil}
                    onChange={(event) =>
                      updateField("warrantyUntil", event.target.value)
                    }
                  />
                </label>
              </div>
            </fieldset>

            {technicalSpecs.length > 0 ? (
              <fieldset>
                <legend>Datos técnicos</legend>
                <dl className="inventory-form__readonly">
                  {technicalSpecs.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <small className="inventory-form__readonly-note">
                  Los informa el agente cuando el equipo se da de alta desde
                  Equipos en vivo; acá no se editan.
                </small>
              </fieldset>
            ) : null}

            <label className="inventory-form__notes">
              Notas <span>Opcional</span>
              <textarea
                rows={4}
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
              />
              <small>
                No guardes credenciales, contraseñas ni números de línea en esta
                ficha.
              </small>
            </label>

            {submitError && (
              <div className="inventory-form__error" role="alert">
                <AlertTriangle size={16} aria-hidden="true" />
                {submitError}
              </div>
            )}

            <footer className="inventory-dialog__footer">
              <button
                type="button"
                className="inventory-button inventory-button--ghost"
                disabled={isSaving}
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inventory-button inventory-button--primary"
                disabled={isSaving}
              >
                {isSaving && (
                  <Loader2
                    size={15}
                    className="inventory-spin"
                    aria-hidden="true"
                  />
                )}
                {mode === "edit" ? "Guardar cambios" : "Registrar activo"}
              </button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}
