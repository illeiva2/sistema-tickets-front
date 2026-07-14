import { useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { getPhoneLineErrorInfo } from "../api";
import {
  PHONE_CARRIERS,
  PHONE_CARRIER_LABELS,
  PHONE_LINE_CURRENCIES,
  PHONE_LINE_STATUSES,
  PHONE_LINE_STATUS_LABELS,
  type PhoneCarrier,
  type PhoneLine,
  type PhoneLineCurrency,
  type PhoneLineCreatePayload,
  type PhoneLineSaveCommand,
  type PhoneLineStatus,
} from "../types";
import { usePhoneLineDialogFocus } from "../usePhoneLineDialogFocus";

interface PhoneLineEditorPanelProps {
  mode: "create" | "edit";
  line: PhoneLine | null;
  conflictNotice?: string;
  isSaving: boolean;
  onClose: () => void;
  onSave: (command: PhoneLineSaveCommand) => Promise<void>;
}

interface PhoneLineFormState {
  phoneNumber: string;
  carrier: PhoneCarrier;
  carrierOther: string;
  planName: string;
  dataAllowanceGb: string;
  monthlyCost: string;
  currency: PhoneLineCurrency;
  simIccid: string;
  status: PhoneLineStatus;
  contractEndsAt: string;
  notes: string;
}

function toDateInput(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function formFromLine(line: PhoneLine | null): PhoneLineFormState {
  return {
    phoneNumber: line?.phoneNumber ?? "",
    carrier: line?.carrier ?? "CLARO",
    carrierOther: line?.carrierOther ?? "",
    planName: line?.planName ?? "",
    dataAllowanceGb:
      line?.dataAllowanceGb === null || line?.dataAllowanceGb === undefined
        ? ""
        : String(line.dataAllowanceGb),
    monthlyCost:
      line?.monthlyCost === null || line?.monthlyCost === undefined
        ? ""
        : String(line.monthlyCost),
    currency: line?.currency ?? "ARS",
    simIccid: line?.simIccid ?? "",
    status: line?.status ?? "AVAILABLE",
    contractEndsAt: toDateInput(line?.contractEndsAt),
    notes: line?.notes ?? "",
  };
}

function optional(value: string): string | null {
  return value.trim() || null;
}

export function PhoneLineEditorPanel({
  mode,
  line,
  conflictNotice,
  isSaving,
  onClose,
  onSave,
}: PhoneLineEditorPanelProps) {
  const [form, setForm] = useState<PhoneLineFormState>(() =>
    formFromLine(line),
  );
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  usePhoneLineDialogFocus(dialogRef, firstInputRef, onClose, isSaving);

  const update = <K extends keyof PhoneLineFormState>(
    field: K,
    value: PhoneLineFormState[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (form.carrier === "OTHER" && !form.carrierOther.trim()) {
      setError("Indicá el nombre de la operadora.");
      return;
    }
    if (form.simIccid && !/^\d{19,20}$/.test(form.simIccid)) {
      setError("El ICCID debe contener 19 o 20 dígitos.");
      return;
    }

    const payload: PhoneLineCreatePayload = {
      phoneNumber: form.phoneNumber.trim(),
      carrier: form.carrier,
      carrierOther:
        form.carrier === "OTHER" ? optional(form.carrierOther) : null,
      planName: optional(form.planName),
      dataAllowanceGb: form.dataAllowanceGb
        ? Number(form.dataAllowanceGb)
        : null,
      monthlyCost: form.monthlyCost ? Number(form.monthlyCost) : null,
      currency: form.currency,
      simIccid: optional(form.simIccid),
      status: form.status,
      contractEndsAt: optional(form.contractEndsAt),
      notes: optional(form.notes),
    };

    try {
      if (mode === "edit") {
        if (!line) throw new Error("No se pudo identificar la línea.");
        await onSave({
          mode: "edit",
          id: line.id,
          payload: {
            ...payload,
            simIccid: undefined,
            expectedUpdatedAt: line.updatedAt,
          },
        });
      } else {
        await onSave({ mode: "create", payload });
      }
    } catch (submitError) {
      setError(getPhoneLineErrorInfo(submitError).message);
    }
  };

  const title = mode === "edit" ? "Editar línea" : "Registrar línea";
  const availableStatuses =
    mode === "create"
      ? PHONE_LINE_STATUSES.filter((status) => status !== "ACTIVE")
      : PHONE_LINE_STATUSES;

  return (
    <div className="staff-dialog-backdrop">
      <section
        ref={dialogRef}
        className="staff-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="phone-line-editor-title"
      >
        <header className="staff-dialog__header">
          <div>
            <span>{mode === "edit" ? "EDICIÓN / LÍNEA" : "ALTA / LÍNEA"}</span>
            <h2 id="phone-line-editor-title">{title}</h2>
          </div>
          <button
            type="button"
            className="staff-icon-button"
            aria-label="Cerrar panel de línea"
            disabled={isSaving}
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <form className="staff-form" onSubmit={handleSubmit}>
          <fieldset>
            <legend>Identificación y servicio</legend>
            <div className="staff-form__grid">
              <label>
                Número de línea
                <input
                  ref={firstInputRef}
                  required
                  type="tel"
                  value={form.phoneNumber}
                  placeholder="+5493415551234"
                  autoComplete="tel"
                  onChange={(event) =>
                    update("phoneNumber", event.target.value)
                  }
                />
              </label>
              <label>
                Estado
                <select
                  value={form.status}
                  onChange={(event) =>
                    update("status", event.target.value as PhoneLineStatus)
                  }
                >
                  {availableStatuses.map((status) => (
                    <option key={status} value={status}>
                      {PHONE_LINE_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Operadora
                <select
                  value={form.carrier}
                  onChange={(event) =>
                    update("carrier", event.target.value as PhoneCarrier)
                  }
                >
                  {PHONE_CARRIERS.map((carrier) => (
                    <option key={carrier} value={carrier}>
                      {PHONE_CARRIER_LABELS[carrier]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Nombre de operadora <span>Solo si elegiste Otra</span>
                <input
                  value={form.carrierOther}
                  required={form.carrier === "OTHER"}
                  disabled={form.carrier !== "OTHER"}
                  onChange={(event) =>
                    update("carrierOther", event.target.value)
                  }
                />
              </label>
              <label>
                Plan <span>Opcional</span>
                <input
                  value={form.planName}
                  placeholder="Corporativo 20 GB"
                  onChange={(event) => update("planName", event.target.value)}
                />
              </label>
              <label>
                Datos del plan (GB) <span>Opcional</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.dataAllowanceGb}
                  onChange={(event) =>
                    update("dataAllowanceGb", event.target.value)
                  }
                />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Costo, SIM y contrato</legend>
            <div className="staff-form__grid">
              <label>
                Costo mensual <span>Opcional</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.monthlyCost}
                  onChange={(event) =>
                    update("monthlyCost", event.target.value)
                  }
                />
              </label>
              <label>
                Moneda
                <select
                  value={form.currency}
                  onChange={(event) =>
                    update("currency", event.target.value as PhoneLineCurrency)
                  }
                >
                  {PHONE_LINE_CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                ICCID actual{" "}
                <span>
                  {mode === "edit"
                    ? "Usá Cambio de chip"
                    : "Opcional · 19 o 20 dígitos"}
                </span>
                <input
                  inputMode="numeric"
                  pattern="[0-9]{19,20}"
                  value={form.simIccid}
                  disabled={mode === "edit"}
                  onChange={(event) => update("simIccid", event.target.value)}
                />
              </label>
              <label>
                Fin de contrato <span>Opcional</span>
                <input
                  type="date"
                  value={form.contractEndsAt}
                  onChange={(event) =>
                    update("contractEndsAt", event.target.value)
                  }
                />
              </label>
            </div>
          </fieldset>

          <div className="phone-lines-safety-note" role="note">
            <ShieldCheck size={18} aria-hidden="true" />
            <p>
              Este módulo registra servicio y custodia. No almacena PIN, PUK,
              eSIM, cuentas de cliente ni credenciales de la operadora.
            </p>
          </div>

          <label className="staff-form__notes">
            Notas <span>Opcional</span>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
            />
          </label>

          {error && (
            <div className="staff-form__error" role="alert">
              <AlertTriangle size={16} aria-hidden="true" />
              {error}
            </div>
          )}

          {conflictNotice && (
            <div className="staff-form__conflict" role="alert">
              <RefreshCw size={16} aria-hidden="true" />
              <div>
                <strong>Versión actual recargada</strong>
                <p>{conflictNotice}</p>
              </div>
            </div>
          )}

          <footer className="staff-dialog__footer">
            <button
              type="button"
              className="staff-button staff-button--ghost"
              disabled={isSaving}
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="staff-button staff-button--primary"
              disabled={isSaving}
            >
              {isSaving && (
                <Loader2 size={15} className="staff-spin" aria-hidden="true" />
              )}
              {mode === "edit" ? "Guardar cambios" : "Registrar línea"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
