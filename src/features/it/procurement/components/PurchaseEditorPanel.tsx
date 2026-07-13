import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Ban,
  Loader2,
  PackageCheck,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { getProcurementErrorInfo } from "../api";
import { formatMoney, purchaseCode } from "../format";
import {
  PURCHASE_CURRENCIES,
  PURCHASE_STATUS_LABELS,
  type ProcurementLookups,
  type Purchase,
  type PurchaseCurrency,
  type PurchaseItem,
  type PurchasePayload,
  type PurchaseSaveCommand,
  type PurchaseTransition,
} from "../types";
import { useDialogFocus } from "../useDialogFocus";

interface PurchaseEditorPanelProps {
  mode: "create" | "edit";
  purchase: Purchase | null;
  lookups: ProcurementLookups;
  isLoading: boolean;
  isSaving: boolean;
  isTransitioning: boolean;
  loadError?: string;
  lookupError?: string;
  currentUserId?: string;
  isAdmin: boolean;
  initialSubmitError?: string;
  onClose: () => void;
  onRetry: () => void;
  onRetryLookups: () => void;
  onReload: () => Promise<Purchase | null>;
  onSave: (command: PurchaseSaveCommand) => Promise<void>;
  onTransition: (
    transition: PurchaseTransition,
    expectedUpdatedAt: string,
    reason?: string,
  ) => Promise<void>;
}

interface ItemForm {
  key: string;
  id?: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

interface PurchaseForm {
  supplierId: string;
  currency: PurchaseCurrency;
  exchangeRate: string;
  justification: string;
  invoiceNumber: string;
  notes: string;
  items: ItemForm[];
}

let itemSequence = 0;
function itemForm(item?: PurchaseItem): ItemForm {
  itemSequence += 1;
  return {
    key: `purchase-item-${itemSequence}`,
    id: item?.id,
    description: item?.description ?? "",
    quantity: String(item?.quantity ?? 1),
    unitPrice: item?.unitPrice === undefined ? "" : String(item.unitPrice),
  };
}

function formFromPurchase(purchase: Purchase | null): PurchaseForm {
  return {
    supplierId: purchase?.supplierId ?? purchase?.supplier?.id ?? "",
    currency: purchase?.currency ?? "ARS",
    exchangeRate: purchase?.exchangeRate ? String(purchase.exchangeRate) : "",
    justification: purchase?.justification ?? "",
    invoiceNumber: purchase?.invoiceNumber ?? "",
    notes: purchase?.notes ?? "",
    items: purchase?.items.map(itemForm) ?? [itemForm()],
  };
}

function optional(value: string) {
  return value.trim() || null;
}

function transitionLabel(transition: PurchaseTransition) {
  return {
    approve: "Autorizar compra",
    order: "Marcar como pedida",
    receive: "Confirmar recepción",
    cancel: "Cancelar orden",
  }[transition];
}

export function PurchaseEditorPanel({
  mode,
  purchase,
  lookups,
  isLoading,
  isSaving,
  isTransitioning,
  loadError,
  lookupError,
  currentUserId,
  isAdmin,
  initialSubmitError,
  onClose,
  onRetry,
  onRetryLookups,
  onReload,
  onSave,
  onTransition,
}: PurchaseEditorPanelProps) {
  const [basePurchase, setBasePurchase] = useState(purchase);
  const [form, setForm] = useState(() => formFromPurchase(purchase));
  const [submitError, setSubmitError] = useState<string | null>(
    initialSubmitError ?? null,
  );
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const busy = isSaving || isTransitioning || isReloading;
  useDialogFocus(dialogRef, closeRef, onClose, busy);

  useEffect(() => {
    if (mode === "edit" && !basePurchase && purchase) {
      setBasePurchase(purchase);
      setForm(formFromPurchase(purchase));
    }
  }, [basePurchase, mode, purchase]);

  const editable =
    mode === "create" ||
    (basePurchase?.status === "REQUESTED" &&
      basePurchase.requestedById === currentUserId);
  const total = form.items.reduce((sum, item) => {
    const quantity = Number(item.quantity);
    const price = Number(item.unitPrice);
    return sum + (Number.isFinite(quantity * price) ? quantity * price : 0);
  }, 0);

  const updateItem = (
    key: string,
    field: "description" | "quantity" | "unitPrice",
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.key === key ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const payload = (): PurchasePayload | null => {
    const justification = form.justification.trim();
    if (!justification) {
      setSubmitError("La justificación de la compra es obligatoria.");
      return null;
    }
    if (!form.items.length) {
      setSubmitError("Agregá al menos un renglón a la compra.");
      return null;
    }
    const items = form.items.map((item) => ({
      description: item.description.trim(),
      quantity: Number(item.quantity),
      unitPrice: item.unitPrice.trim(),
    }));
    const decimalPattern = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
    if (
      items.some(
        (item) =>
          !item.description ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          !decimalPattern.test(item.unitPrice),
      )
    ) {
      setSubmitError(
        "Revisá descripción, cantidad y precio de todos los renglones.",
      );
      return null;
    }
    const exchangeRate = form.exchangeRate.trim();
    if (
      exchangeRate &&
      (!decimalPattern.test(exchangeRate) || Number(exchangeRate) <= 0)
    ) {
      setSubmitError(
        "La cotización de referencia debe ser un decimal positivo.",
      );
      return null;
    }
    return {
      supplierId: optional(form.supplierId),
      currency: form.currency,
      exchangeRate: form.currency === "USD" ? optional(exchangeRate) : null,
      justification,
      invoiceNumber: optional(form.invoiceNumber),
      notes: optional(form.notes),
      items,
    };
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);
    const value = payload();
    if (!value) return;
    try {
      await onSave(
        mode === "edit" && basePurchase
          ? {
              mode: "edit",
              id: basePurchase.id,
              payload: { ...value, expectedUpdatedAt: basePurchase.updatedAt },
            }
          : { mode: "create", payload: value },
      );
    } catch (error) {
      const info = getProcurementErrorInfo(error);
      if (info.isPurchaseConflict) setConflictMessage(info.message);
      else setSubmitError(info.message);
    }
  };

  const reload = async () => {
    setIsReloading(true);
    const fresh = await onReload();
    if (fresh) {
      setBasePurchase(fresh);
      setForm(formFromPurchase(fresh));
      setConflictMessage(null);
      setSubmitError(null);
    }
    setIsReloading(false);
  };

  const runTransition = async (transition: PurchaseTransition) => {
    if (!basePurchase) return;
    setSubmitError(null);
    if (transition === "cancel" && cancelReason.trim().length < 3) {
      setSubmitError(
        "Indicá un motivo de cancelación de al menos 3 caracteres.",
      );
      return;
    }
    try {
      await onTransition(
        transition,
        basePurchase.updatedAt,
        transition === "cancel" ? cancelReason.trim() : undefined,
      );
    } catch (error) {
      const info = getProcurementErrorInfo(error);
      if (info.isPurchaseConflict) setConflictMessage(info.message);
      else setSubmitError(info.message);
    }
  };

  const supplierReady = Boolean(basePurchase?.supplier?.isActive);
  const transitions: PurchaseTransition[] = !basePurchase
    ? []
    : basePurchase.status === "REQUESTED"
      ? [
          ...(isAdmin && basePurchase.requestedById !== currentUserId
            ? ["approve" as const]
            : []),
          "cancel",
        ]
      : basePurchase.status === "APPROVED"
        ? ["order", ...(isAdmin ? (["cancel"] as const) : [])]
        : basePurchase.status === "ORDERED"
          ? ["receive", ...(isAdmin ? (["cancel"] as const) : [])]
          : [];

  return (
    <div className="procurement-dialog-backdrop">
      <section
        ref={dialogRef}
        className="procurement-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-dialog-title"
      >
        <header className="procurement-dialog__header">
          <div>
            <span>
              {mode === "create"
                ? "SOLICITUD / NUEVA"
                : basePurchase
                  ? `${purchaseCode(basePurchase)} / CONTROL`
                  : "ORDEN / CONTROL"}
            </span>
            <h2 id="purchase-dialog-title">
              {mode === "create"
                ? "Nueva orden de compra"
                : "Detalle de la orden"}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="procurement-icon-button"
            aria-label="Cerrar orden"
            disabled={busy}
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {isLoading || (mode === "edit" && !basePurchase && !loadError) ? (
          <div className="procurement-dialog__state" role="status">
            <Loader2 className="procurement-spin" aria-hidden="true" />
            <strong>Cargando orden</strong>
            <p>Consultando la versión actual.</p>
          </div>
        ) : loadError ? (
          <div className="procurement-dialog__state" role="alert">
            <AlertTriangle aria-hidden="true" />
            <strong>No se pudo abrir la orden</strong>
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
            {basePurchase ? (
              <div
                className="procurement-pipeline"
                aria-label="Estado de la compra"
              >
                {(
                  ["REQUESTED", "APPROVED", "ORDERED", "RECEIVED"] as const
                ).map((status) => (
                  <span
                    key={status}
                    data-current={basePurchase.status === status}
                    data-passed={
                      ["REQUESTED", "APPROVED", "ORDERED", "RECEIVED"].indexOf(
                        status,
                      ) <=
                      ["REQUESTED", "APPROVED", "ORDERED", "RECEIVED"].indexOf(
                        basePurchase.status,
                      )
                    }
                  >
                    {PURCHASE_STATUS_LABELS[status]}
                  </span>
                ))}
                {basePurchase.status === "CANCELLED" ? (
                  <span data-current="true">Cancelada</span>
                ) : null}
              </div>
            ) : null}

            <fieldset disabled={!editable || busy}>
              <legend>Decisión y proveedor</legend>
              {lookupError ? (
                <div className="procurement-reference-error" role="alert">
                  <AlertTriangle size={16} aria-hidden="true" />
                  <div>
                    <strong>Proveedores fuera de línea</strong>
                    <p>{lookupError}</p>
                    <button type="button" onClick={onRetryLookups}>
                      Reintentar
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="procurement-form__grid">
                <label>
                  Proveedor <span>Opcional hasta confirmar pedido</span>
                  <select
                    value={form.supplierId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        supplierId: event.target.value,
                      }))
                    }
                  >
                    <option value="">A definir</option>
                    {lookups.suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Moneda
                  <select
                    value={form.currency}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        currency: event.target.value as PurchaseCurrency,
                        exchangeRate:
                          event.target.value === "ARS"
                            ? ""
                            : current.exchangeRate,
                      }))
                    }
                  >
                    {PURCHASE_CURRENCIES.map((currency) => (
                      <option key={currency}>{currency}</option>
                    ))}
                  </select>
                </label>
                {form.currency === "USD" ? (
                  <label>
                    Cotización ARS/USD{" "}
                    <span>Referencia opcional e informativa</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="(?:0|[1-9][0-9]*)(?:\.[0-9]+)?"
                      value={form.exchangeRate}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          exchangeRate: event.target.value,
                        }))
                      }
                    />
                  </label>
                ) : null}
                <label>
                  Número de factura <span>Opcional</span>
                  <input
                    value={form.invoiceNumber}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        invoiceNumber: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <label className="procurement-form__wide">
                Justificación
                <textarea
                  rows={4}
                  required
                  maxLength={10_000}
                  value={form.justification}
                  placeholder="Necesidad, criterio de selección y decisión de compra"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      justification: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="procurement-form__wide">
                Notas internas{" "}
                <span>
                  No registrar contraseñas, datos bancarios ni información
                  personal.
                </span>
                <textarea
                  rows={3}
                  maxLength={10_000}
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
              </label>
            </fieldset>

            <fieldset disabled={!editable || busy}>
              <legend>Renglones de compra</legend>
              <div className="procurement-items__header">
                <div>
                  <strong>Items</strong>
                  <small>
                    El total se calcula en el servidor y se previsualiza aquí.
                  </small>
                </div>
                {editable ? (
                  <button
                    type="button"
                    className="procurement-button procurement-button--ghost"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        items: [...current.items, itemForm()],
                      }))
                    }
                  >
                    <Plus size={14} aria-hidden="true" /> Agregar item
                  </button>
                ) : null}
              </div>
              <div className="procurement-items">
                {form.items.map((item, index) => (
                  <div className="procurement-item-row" key={item.key}>
                    <label>
                      Descripción
                      <input
                        aria-label={`Descripción del item ${index + 1}`}
                        required
                        value={item.description}
                        onChange={(event) =>
                          updateItem(
                            item.key,
                            "description",
                            event.target.value,
                          )
                        }
                      />
                    </label>
                    <label>
                      Cantidad
                      <input
                        aria-label={`Cantidad del item ${index + 1}`}
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(item.key, "quantity", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Precio unitario
                      <input
                        aria-label={`Precio unitario del item ${index + 1}`}
                        type="text"
                        inputMode="decimal"
                        pattern="(?:0|[1-9][0-9]*)(?:\.[0-9]+)?"
                        required
                        value={item.unitPrice}
                        onChange={(event) =>
                          updateItem(item.key, "unitPrice", event.target.value)
                        }
                      />
                    </label>
                    {editable ? (
                      <button
                        type="button"
                        className="procurement-icon-button"
                        aria-label={`Quitar item ${index + 1}`}
                        disabled={form.items.length === 1}
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            items: current.items.filter(
                              (entry) => entry.key !== item.key,
                            ),
                          }))
                        }
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="procurement-total">
                <span>Total estimado</span>
                <strong>{formatMoney(total, form.currency)}</strong>
              </div>
            </fieldset>

            {basePurchase?.status === "RECEIVED" ? (
              <fieldset>
                <legend>Alta en inventario</legend>
                <p className="procurement-help">
                  La recepción no crea activos automáticamente. Registrá cada
                  equipo inventariable y vinculalo con su renglón de compra.
                </p>
                {basePurchase.items.map((item) => {
                  const linked =
                    item.linkedAssetsCount ?? item.linkedAssets?.length ?? 0;
                  const isComplete = linked >= item.quantity;
                  return (
                    <div className="procurement-receipt-item" key={item.id}>
                      <div>
                        <strong>{item.description}</strong>
                        <small>
                          {linked} de {item.quantity} activos vinculados
                        </small>
                        <progress
                          max={item.quantity}
                          value={Math.min(linked, item.quantity)}
                        />
                      </div>
                      {isComplete ? (
                        <span
                          className="procurement-button procurement-button--ghost"
                          aria-label="Cupo completo"
                        >
                          <PackageCheck size={14} aria-hidden="true" /> Cupo
                          completo
                        </span>
                      ) : (
                        <Link
                          className="procurement-button procurement-button--ghost"
                          to={`/it/inventory?purchaseId=${encodeURIComponent(basePurchase.id)}&purchaseItemId=${encodeURIComponent(item.id)}`}
                        >
                          <Plus size={14} aria-hidden="true" /> Registrar activo
                        </Link>
                      )}
                    </div>
                  );
                })}
              </fieldset>
            ) : null}

            {basePurchase?.status === "REQUESTED" &&
            isAdmin &&
            basePurchase.requestedById === currentUserId ? (
              <div className="procurement-advisory" role="note">
                <BadgeCheck size={17} aria-hidden="true" />
                <div>
                  <strong>Separación de funciones</strong>
                  <p>
                    Solicitaste esta orden. Otro administrador debe autorizarla.
                  </p>
                </div>
              </div>
            ) : null}
            {basePurchase &&
            ["REQUESTED", "APPROVED"].includes(basePurchase.status) &&
            !supplierReady ? (
              <div className="procurement-advisory" role="note">
                <AlertTriangle size={17} aria-hidden="true" />
                <div>
                  <strong>Proveedor activo requerido</strong>
                  <p>
                    Seleccioná un proveedor activo antes de autorizar o marcar
                    el pedido.
                  </p>
                </div>
              </div>
            ) : null}
            {transitions.length ? (
              <fieldset>
                <legend>Acciones de flujo</legend>
                <div className="procurement-transition-actions">
                  {transitions
                    .filter((item) => item !== "cancel")
                    .map((transition) => (
                      <button
                        key={transition}
                        type="button"
                        className="procurement-button procurement-button--primary"
                        disabled={
                          busy ||
                          Boolean(conflictMessage) ||
                          ((transition === "approve" ||
                            transition === "order") &&
                            !supplierReady)
                        }
                        onClick={() => void runTransition(transition)}
                      >
                        {transition === "approve" ? (
                          <BadgeCheck size={15} aria-hidden="true" />
                        ) : transition === "receive" ? (
                          <PackageCheck size={15} aria-hidden="true" />
                        ) : (
                          <Send size={15} aria-hidden="true" />
                        )}
                        {transitionLabel(transition)}
                      </button>
                    ))}
                  {transitions.includes("cancel") ? (
                    <button
                      type="button"
                      className="procurement-button procurement-button--danger"
                      disabled={busy || Boolean(conflictMessage)}
                      onClick={() => setShowCancel((current) => !current)}
                    >
                      <Ban size={15} aria-hidden="true" /> Cancelar orden
                    </button>
                  ) : null}
                </div>
                {showCancel ? (
                  <div className="procurement-cancel-box">
                    <label>
                      Motivo de cancelación
                      <textarea
                        autoFocus
                        rows={2}
                        minLength={3}
                        required
                        value={cancelReason}
                        onChange={(event) =>
                          setCancelReason(event.target.value)
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="procurement-button procurement-button--danger"
                      disabled={busy || cancelReason.trim().length < 3}
                      onClick={() => void runTransition("cancel")}
                    >
                      <ArrowRight size={15} aria-hidden="true" /> Confirmar
                      cancelación
                    </button>
                  </div>
                ) : null}
              </fieldset>
            ) : null}

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
                Cerrar
              </button>
              {editable ? (
                <button
                  type="submit"
                  className="procurement-button procurement-button--primary"
                  disabled={busy || Boolean(conflictMessage)}
                >
                  {busy ? (
                    <Loader2
                      className="procurement-spin"
                      size={15}
                      aria-hidden="true"
                    />
                  ) : null}
                  {mode === "create" ? "Crear solicitud" : "Guardar cambios"}
                </button>
              ) : null}
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}
