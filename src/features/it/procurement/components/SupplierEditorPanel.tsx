import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { getProcurementErrorInfo } from "../api";
import type { Supplier, SupplierSaveCommand } from "../types";
import { useDialogFocus } from "../useDialogFocus";

interface SupplierEditorPanelProps {
  mode: "create" | "edit";
  supplier: Supplier | null;
  isLoading: boolean;
  isSaving: boolean;
  loadError?: string;
  initialSubmitError?: string;
  onClose: () => void;
  onRetry: () => void;
  onReload: () => Promise<Supplier | null>;
  onSave: (command: SupplierSaveCommand) => Promise<void>;
}

interface SupplierForm {
  name: string;
  cuit: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  categories: string;
  notes: string;
  isActive: boolean;
}

function formFromSupplier(supplier: Supplier | null): SupplierForm {
  return {
    name: supplier?.name ?? "",
    cuit: supplier?.cuit ?? "",
    contactName: supplier?.contactName ?? "",
    email: supplier?.email ?? "",
    phone: supplier?.phone ?? "",
    website: supplier?.website ?? "",
    address: supplier?.address ?? "",
    categories: supplier?.categories.join(", ") ?? "",
    notes: supplier?.notes ?? "",
    isActive: supplier?.isActive ?? true,
  };
}

function optional(value: string) {
  return value.trim() || null;
}

export function SupplierEditorPanel({
  mode,
  supplier,
  isLoading,
  isSaving,
  loadError,
  initialSubmitError,
  onClose,
  onRetry,
  onReload,
  onSave,
}: SupplierEditorPanelProps) {
  const [baseSupplier, setBaseSupplier] = useState(supplier);
  const [form, setForm] = useState(() => formFromSupplier(supplier));
  const [submitError, setSubmitError] = useState<string | null>(
    initialSubmitError ?? null,
  );
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [isReloading, setIsReloading] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const busy = isSaving || isReloading;
  useDialogFocus(dialogRef, closeRef, onClose, busy);

  useEffect(() => {
    if (mode === "edit" && !baseSupplier && supplier) {
      setBaseSupplier(supplier);
      setForm(formFromSupplier(supplier));
    }
  }, [baseSupplier, mode, supplier]);

  const update = <K extends keyof SupplierForm>(
    key: K,
    value: SupplierForm[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    const categories = Array.from(
      new Set(
        form.categories
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );
    if (!form.name.trim()) {
      setSubmitError("El nombre comercial es obligatorio.");
      return;
    }
    if (!categories.length) {
      setSubmitError("Ingresá al menos una categoría empresarial.");
      return;
    }
    const common = {
      name: form.name.trim(),
      cuit: optional(form.cuit),
      contactName: optional(form.contactName),
      email: optional(form.email),
      phone: optional(form.phone),
      website: optional(form.website),
      address: optional(form.address),
      categories,
      notes: optional(form.notes),
    };
    try {
      await onSave(
        mode === "edit" && baseSupplier
          ? {
              mode: "edit",
              id: baseSupplier.id,
              payload: {
                ...common,
                isActive: form.isActive,
                expectedUpdatedAt: baseSupplier.updatedAt,
              },
            }
          : { mode: "create", payload: common },
      );
    } catch (error) {
      const info = getProcurementErrorInfo(error);
      if (info.isSupplierConflict) setConflictMessage(info.message);
      else setSubmitError(info.message);
    }
  };

  const reload = async () => {
    setIsReloading(true);
    const fresh = await onReload();
    if (fresh) {
      setBaseSupplier(fresh);
      setForm(formFromSupplier(fresh));
      setConflictMessage(null);
      setSubmitError(null);
    }
    setIsReloading(false);
  };

  return (
    <div className="procurement-dialog-backdrop">
      <section
        ref={dialogRef}
        className="procurement-dialog procurement-dialog--supplier"
        role="dialog"
        aria-modal="true"
        aria-labelledby="supplier-dialog-title"
      >
        <header className="procurement-dialog__header">
          <div>
            <span>
              {mode === "create" ? "PADRÓN / ALTA" : "PADRÓN / EDICIÓN"}
            </span>
            <h2 id="supplier-dialog-title">
              {mode === "create" ? "Nuevo proveedor" : "Editar proveedor"}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="procurement-icon-button"
            aria-label="Cerrar proveedor"
            disabled={busy}
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        {isLoading || (mode === "edit" && !baseSupplier && !loadError) ? (
          <div className="procurement-dialog__state" role="status">
            <Loader2 className="procurement-spin" aria-hidden="true" />
            <strong>Cargando proveedor</strong>
            <p>Consultando el registro empresarial.</p>
          </div>
        ) : loadError ? (
          <div className="procurement-dialog__state" role="alert">
            <AlertTriangle aria-hidden="true" />
            <strong>No se pudo abrir el proveedor</strong>
            <p>{loadError}</p>
            <button
              type="button"
              className="procurement-button"
              onClick={onRetry}
            >
              Reintentar
            </button>
          </div>
        ) : (
          <form className="procurement-form" onSubmit={handleSubmit}>
            <div className="procurement-privacy" role="note">
              <ShieldCheck size={18} aria-hidden="true" />
              <div>
                <strong>Directorio empresarial</strong>
                <p>
                  Registrá sólo canales laborales públicos. No cargues DNI,
                  domicilios particulares, cuentas bancarias ni datos
                  personales.
                </p>
              </div>
            </div>
            <fieldset>
              <legend>Identidad comercial</legend>
              <div className="procurement-form__grid">
                <label>
                  Razón social / nombre
                  <input
                    autoFocus
                    required
                    maxLength={200}
                    value={form.name}
                    onChange={(event) => update("name", event.target.value)}
                  />
                </label>
                <label>
                  CUIT <span>Opcional</span>
                  <input
                    inputMode="numeric"
                    maxLength={20}
                    value={form.cuit}
                    onChange={(event) => update("cuit", event.target.value)}
                  />
                </label>
                <label className="procurement-form__wide">
                  Categorías{" "}
                  <span>
                    Separadas por coma: hardware, insumos, servicio técnico
                  </span>
                  <input
                    required
                    value={form.categories}
                    onChange={(event) =>
                      update("categories", event.target.value)
                    }
                  />
                </label>
                {mode === "edit" ? (
                  <label className="procurement-switch">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      disabled={
                        form.isActive &&
                        Boolean(baseSupplier?.activePurchasesCount)
                      }
                      onChange={(event) =>
                        update("isActive", event.target.checked)
                      }
                    />
                    <span>Proveedor activo y disponible para compras</span>
                    {form.isActive && baseSupplier?.activePurchasesCount ? (
                      <small>
                        {baseSupplier.activePurchasesCount} compras abiertas
                        deben cerrarse antes de desactivarlo.
                      </small>
                    ) : null}
                  </label>
                ) : null}
              </div>
            </fieldset>
            <fieldset>
              <legend>Contacto laboral</legend>
              <div className="procurement-form__grid">
                <label>
                  Referente <span>Opcional</span>
                  <input
                    maxLength={200}
                    value={form.contactName}
                    onChange={(event) =>
                      update("contactName", event.target.value)
                    }
                  />
                </label>
                <label>
                  Email corporativo <span>Opcional</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                  />
                </label>
                <label>
                  Teléfono comercial <span>Opcional</span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(event) => update("phone", event.target.value)}
                  />
                </label>
                <label>
                  Sitio web <span>Opcional</span>
                  <input
                    type="url"
                    placeholder="https://"
                    value={form.website}
                    onChange={(event) => update("website", event.target.value)}
                  />
                </label>
                <label className="procurement-form__wide">
                  Domicilio comercial <span>Opcional</span>
                  <input
                    value={form.address}
                    onChange={(event) => update("address", event.target.value)}
                  />
                </label>
              </div>
            </fieldset>
            <fieldset>
              <legend>Contexto interno</legend>
              <label className="procurement-form__wide">
                Notas <span>No registrar secretos ni datos bancarios.</span>
                <textarea
                  rows={4}
                  maxLength={10_000}
                  value={form.notes}
                  onChange={(event) => update("notes", event.target.value)}
                />
              </label>
            </fieldset>
            {conflictMessage ? (
              <div className="procurement-conflict" role="alert">
                <RefreshCw size={18} aria-hidden="true" />
                <div>
                  <strong>Hay una versión más reciente</strong>
                  <p>{conflictMessage}</p>
                  <button
                    type="button"
                    className="procurement-button procurement-button--ghost"
                    disabled={isReloading}
                    onClick={() => void reload()}
                  >
                    <RefreshCw size={15} aria-hidden="true" /> Recargar versión
                    actual
                  </button>
                </div>
              </div>
            ) : null}
            {submitError ? (
              <div className="procurement-error" role="alert">
                <AlertTriangle size={16} aria-hidden="true" /> {submitError}
              </div>
            ) : null}
            <footer className="procurement-dialog__footer">
              <button
                type="button"
                className="procurement-button procurement-button--ghost"
                disabled={busy}
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="procurement-button procurement-button--primary"
                disabled={busy || Boolean(conflictMessage)}
              >
                {isSaving ? (
                  <Loader2
                    className="procurement-spin"
                    size={15}
                    aria-hidden="true"
                  />
                ) : null}
                {mode === "create" ? "Crear proveedor" : "Guardar cambios"}
              </button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}
