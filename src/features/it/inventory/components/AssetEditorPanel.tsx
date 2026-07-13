import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertTriangle, Loader2, RotateCcw, X } from "lucide-react";
import { getInventoryErrorMessage } from "../api";
import {
  ASSET_STATUSES,
  ASSET_STATUS_LABELS,
  ASSET_TYPES,
  ASSET_TYPE_LABELS,
  type AssetCreatePayload,
  type AssetSaveCommand,
  type AssetSpecs,
  type AssetStatus,
  type AssetType,
  type ItAsset,
} from "../types";

interface AssetEditorPanelProps {
  mode: "create" | "edit";
  asset: ItAsset | null;
  canEditAssetTag: boolean;
  isLoading: boolean;
  isSaving: boolean;
  loadError?: string;
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
  cpu: string;
  ramGb: string;
  storage: string;
  os: string;
  imei: string;
  mac: string;
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
    cpu: asset?.specs?.cpu ?? "",
    ramGb: asset?.specs?.ramGb?.toString() ?? "",
    storage: asset?.specs?.storage ?? "",
    os: asset?.specs?.os ?? "",
    imei: asset?.specs?.imei ?? "",
    mac: asset?.specs?.mac ?? "",
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
  canEditAssetTag,
  isLoading,
  isSaving,
  loadError,
  onClose,
  onRetry,
  onSave,
}: AssetEditorPanelProps) {
  const [form, setForm] = useState<AssetFormState>(() =>
    formStateFromAsset(asset),
  );
  const editableStatuses =
    asset?.status === "IN_REPAIR"
      ? (["IN_REPAIR", ...MANUAL_ASSET_STATUSES] as AssetStatus[])
      : MANUAL_ASSET_STATUSES;
  const [submitError, setSubmitError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const isSavingRef = useRef(isSaving);
  const titleId =
    mode === "edit"
      ? "inventory-editor-title-edit"
      : "inventory-editor-title-new";

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

    const ramGb = form.ramGb.trim() ? Number(form.ramGb) : undefined;
    if (ramGb !== undefined && (!Number.isFinite(ramGb) || ramGb < 0)) {
      setSubmitError(
        "La memoria RAM debe ser un número igual o mayor que cero.",
      );
      return;
    }

    const specs: AssetSpecs = { ...(asset?.specs ?? {}) };
    const updateSpec = (
      key: "cpu" | "ramGb" | "storage" | "os" | "imei" | "mac",
      value: string | number | undefined,
    ) => {
      if (value === undefined || value === "") delete specs[key];
      else (specs as Record<string, unknown>)[key] = value;
    };
    updateSpec("cpu", form.cpu.trim());
    updateSpec("ramGb", ramGb);
    updateSpec("storage", form.storage.trim());
    updateSpec("os", form.os.trim());
    updateSpec("imei", form.imei.trim());
    updateSpec("mac", form.mac.trim());

    const assetTag = form.assetTag.trim();
    const shouldSendAssetTag = asset
      ? canEditAssetTag &&
        assetTag !== (asset.assetTag ?? "") &&
        Boolean(assetTag)
      : canEditAssetTag && Boolean(assetTag);

    const payload: AssetCreatePayload = {
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
        await onSave({ mode: "create", payload });
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

                {asset?.status === "ASSIGNED" ? (
                  <div className="inventory-form__field">
                    <label htmlFor="asset-status">Estado</label>
                    <input
                      id="asset-status"
                      value={ASSET_STATUS_LABELS.ASSIGNED}
                      disabled
                      aria-describedby="assigned-status-help"
                    />
                    <small id="assigned-status-help">
                      La asignación se administra desde el flujo de custodia.
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
                      {editableStatuses.map((status) => (
                        <option
                          key={status}
                          value={status}
                          disabled={status === "IN_REPAIR"}
                        >
                          {ASSET_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                    <small id="available-status-help">
                      {asset?.status === "IN_REPAIR"
                        ? "En reparación es controlado por Mantenimientos. Podés retirar el activo del circuito eligiendo En depósito, Dado de baja o Extraviado."
                        : "Asignado se establece desde Custodia y En reparación desde Mantenimientos."}
                    </small>
                  </div>
                )}

                <label>
                  Marca
                  <input
                    ref={firstInputRef}
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

                <div className="inventory-form__field">
                  <label htmlFor="asset-tag">
                    Etiqueta interna <span>Opcional</span>
                  </label>
                  <input
                    id="asset-tag"
                    value={form.assetTag}
                    autoComplete="off"
                    placeholder="Se genera si se deja vacía"
                    disabled={!canEditAssetTag}
                    aria-describedby="asset-tag-help"
                    onChange={(event) =>
                      updateField("assetTag", event.target.value)
                    }
                  />
                  <small id="asset-tag-help">
                    {!canEditAssetTag
                      ? "Solo un administrador puede definir o cambiar la etiqueta."
                      : "Si queda vacía, el servidor genera una etiqueta al crear."}
                  </small>
                </div>

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

            <fieldset>
              <legend>Especificaciones básicas</legend>
              <div className="inventory-form__grid inventory-form__grid--specs">
                <label>
                  CPU <span>Opcional</span>
                  <input
                    value={form.cpu}
                    autoComplete="off"
                    onChange={(event) => updateField("cpu", event.target.value)}
                  />
                </label>
                <label>
                  RAM (GB) <span>Opcional</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.ramGb}
                    onChange={(event) =>
                      updateField("ramGb", event.target.value)
                    }
                  />
                </label>
                <label>
                  Almacenamiento <span>Opcional</span>
                  <input
                    value={form.storage}
                    autoComplete="off"
                    placeholder="Ej. 512 GB SSD"
                    onChange={(event) =>
                      updateField("storage", event.target.value)
                    }
                  />
                </label>
                <label>
                  Sistema operativo <span>Opcional</span>
                  <input
                    value={form.os}
                    autoComplete="off"
                    onChange={(event) => updateField("os", event.target.value)}
                  />
                </label>
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
                <label>
                  Dirección MAC <span>Opcional</span>
                  <input
                    value={form.mac}
                    autoComplete="off"
                    onChange={(event) => updateField("mac", event.target.value)}
                  />
                </label>
              </div>
            </fieldset>

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
