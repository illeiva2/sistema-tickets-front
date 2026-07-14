import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertTriangle, Loader2, RefreshCw, X } from "lucide-react";
import { getNetworkErrorInfo } from "../api";
import {
  LINK_TYPE_LABELS,
  NETWORK_LINK_TYPES,
  type LinkPayload,
  type NetworkDeviceSummary,
  type NetworkLink,
  type SaveCommand,
} from "../types";
import { useNetworkDialogFocus } from "../useDialogFocus";
import { parseVlans } from "../validation";

interface LinkEditorPanelProps {
  mode: "create" | "edit";
  link: NetworkLink | null;
  devices: NetworkDeviceSummary[];
  canWrite: boolean;
  isLoading: boolean;
  isSaving: boolean;
  loadError?: string;
  onClose: () => void;
  onRetry: () => void;
  onReload: () => Promise<NetworkLink | null>;
  onSave: (command: SaveCommand<LinkPayload>) => Promise<void>;
}

interface LinkForm extends Omit<LinkPayload, "vlans" | "speedMbps"> {
  vlans: string;
  speedMbps: string;
}

function formFromLink(
  link: NetworkLink | null,
  devices: NetworkDeviceSummary[],
): LinkForm {
  return {
    deviceAId: link?.deviceAId ?? devices[0]?.id ?? "",
    deviceBId: link?.deviceBId ?? devices[1]?.id ?? "",
    portA: link?.portA ?? "",
    portB: link?.portB ?? "",
    type: link?.type ?? "ETHERNET",
    vlans: link?.vlans.join(", ") ?? "",
    speedMbps: link?.speedMbps ? String(link.speedMbps) : "",
    notes: link?.notes ?? "",
  };
}

const optional = (value: string | null | undefined) => value?.trim() || null;

export function LinkEditorPanel({
  mode,
  link,
  devices,
  canWrite,
  isLoading,
  isSaving,
  loadError,
  onClose,
  onRetry,
  onReload,
  onSave,
}: LinkEditorPanelProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const initialFocusRef = useRef<HTMLSelectElement>(null);
  const hydratedRef = useRef(false);
  const expectedRef = useRef<string | null>(null);
  const [form, setForm] = useState<LinkForm | null>(() =>
    mode === "create" ? formFromLink(null, devices) : null,
  );
  const [submitError, setSubmitError] = useState<string>();
  const [conflict, setConflict] = useState<string>();
  const [isReloading, setIsReloading] = useState(false);
  const busy = isSaving || isReloading;
  const deviceOptions = [link?.deviceA, link?.deviceB, ...devices].reduce<
    NetworkDeviceSummary[]
  >((items, device) => {
    if (device && !items.some((item) => item.id === device.id))
      items.push(device);
    return items;
  }, []);
  useNetworkDialogFocus(dialogRef, initialFocusRef, onClose, busy);

  useEffect(() => {
    if (mode !== "edit" || !link || hydratedRef.current) return;
    hydratedRef.current = true;
    expectedRef.current = link.updatedAt;
    setForm(formFromLink(link, devices));
  }, [devices, link, mode]);

  useEffect(() => {
    if (mode !== "create") return;
    setForm((current) =>
      current
        ? {
            ...current,
            deviceAId: current.deviceAId || devices[0]?.id || "",
            deviceBId:
              current.deviceBId ||
              devices.find(
                (device) => device.id !== (current.deviceAId || devices[0]?.id),
              )?.id ||
              "",
          }
        : current,
    );
  }, [devices, mode]);

  const update = <K extends keyof LinkForm>(key: K, value: LinkForm[K]) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));
  const reload = async () => {
    setIsReloading(true);
    const current = await onReload();
    if (current) {
      expectedRef.current = current.updatedAt;
      setForm(formFromLink(current, devices));
      setConflict(undefined);
      setSubmitError(undefined);
    }
    setIsReloading(false);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form || !canWrite) return;
    if (form.deviceAId === form.deviceBId) {
      setSubmitError(
        "El origen y el destino deben ser dispositivos diferentes.",
      );
      return;
    }
    setSubmitError(undefined);
    const parsedVlans = parseVlans(form.vlans);
    if (parsedVlans.error) {
      setSubmitError(parsedVlans.error);
      return;
    }
    const speed = form.speedMbps ? Number(form.speedMbps) : null;
    if (
      speed !== null &&
      (!Number.isInteger(speed) || speed < 1 || speed > 10_000_000)
    ) {
      setSubmitError(
        "La velocidad debe ser un entero entre 1 y 10.000.000 Mbps.",
      );
      return;
    }
    const payload: LinkPayload = {
      ...form,
      portA: optional(form.portA),
      portB: optional(form.portB),
      vlans: parsedVlans.vlans,
      speedMbps: speed,
      notes: optional(form.notes),
    };
    try {
      await onSave(
        mode === "create"
          ? { mode: "create", payload }
          : {
              mode: "edit",
              id: link!.id,
              payload: { ...payload, expectedUpdatedAt: expectedRef.current! },
            },
      );
    } catch (error) {
      const info = getNetworkErrorInfo(error);
      if (info.isConflict) setConflict(info.message);
      else setSubmitError(info.message);
    }
  };

  return (
    <div className="network-dialog-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="network-dialog network-dialog--compact"
        role="dialog"
        aria-modal="true"
        aria-labelledby="network-link-dialog-title"
      >
        <header className="network-dialog__header">
          <div>
            <span>NET.EDGE / PHYSICAL</span>
            <h2 id="network-link-dialog-title">
              {mode === "create" ? "Nuevo enlace" : "Detalle del enlace"}
            </h2>
          </div>
          <button
            type="button"
            className="network-icon-button"
            aria-label="Cerrar"
            disabled={busy}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>
        {isLoading || !form ? (
          loadError ? (
            <div className="network-dialog-state" role="alert">
              <AlertTriangle />
              <strong>No se pudo abrir el enlace</strong>
              <p>{loadError}</p>
              <button
                type="button"
                className="network-button network-button--ghost"
                onClick={onRetry}
              >
                Reintentar
              </button>
            </div>
          ) : (
            <div className="network-dialog-state">
              <Loader2 className="network-spin" />
              Sincronizando enlace…
            </div>
          )
        ) : (
          <form className="network-form" onSubmit={submit}>
            {!canWrite ? (
              <div className="network-notice">
                Modo lectura. Tu perfil no puede modificar enlaces.
              </div>
            ) : null}
            <fieldset disabled={!canWrite || busy}>
              <legend>Extremos</legend>
              <label>
                Dispositivo origen{" "}
                <select
                  ref={initialFocusRef}
                  required
                  value={form.deviceAId}
                  onChange={(event) => update("deviceAId", event.target.value)}
                >
                  <option value="">Seleccionar…</option>
                  {deviceOptions.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.name} · {device.site?.name || "sin sitio"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Puerto origen{" "}
                <input
                  maxLength={100}
                  placeholder="Gi0/1"
                  value={form.portA ?? ""}
                  onChange={(event) => update("portA", event.target.value)}
                />
              </label>
              <label>
                Dispositivo destino{" "}
                <select
                  required
                  value={form.deviceBId}
                  onChange={(event) => update("deviceBId", event.target.value)}
                >
                  <option value="">Seleccionar…</option>
                  {deviceOptions.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.name} · {device.site?.name || "sin sitio"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Puerto destino{" "}
                <input
                  maxLength={100}
                  placeholder="SFP+ 2"
                  value={form.portB ?? ""}
                  onChange={(event) => update("portB", event.target.value)}
                />
              </label>
            </fieldset>
            <fieldset disabled={!canWrite || busy}>
              <legend>Transporte</legend>
              <label>
                Tipo de enlace{" "}
                <select
                  value={form.type}
                  onChange={(event) =>
                    update("type", event.target.value as LinkForm["type"])
                  }
                >
                  {NETWORK_LINK_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {LINK_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Velocidad (Mbps){" "}
                <input
                  type="number"
                  min={1}
                  max={10000000}
                  step={1}
                  inputMode="numeric"
                  value={form.speedMbps}
                  onChange={(event) => update("speedMbps", event.target.value)}
                />
              </label>
              <label className="network-form__wide">
                VLANs <span>Separadas por coma</span>
                <input
                  placeholder="10, 20-VoIP"
                  value={form.vlans}
                  onChange={(event) => update("vlans", event.target.value)}
                />
              </label>
              <label className="network-form__wide">
                Notas{" "}
                <textarea
                  rows={4}
                  maxLength={5000}
                  value={form.notes ?? ""}
                  onChange={(event) => update("notes", event.target.value)}
                />
              </label>
            </fieldset>
            {conflict ? (
              <div className="network-conflict" role="alert">
                <RefreshCw size={18} />
                <div>
                  <strong>El enlace cambió en el servidor</strong>
                  <p>{conflict}</p>
                  <button
                    type="button"
                    className="network-button network-button--ghost"
                    onClick={() => void reload()}
                  >
                    Recargar versión actual
                  </button>
                </div>
              </div>
            ) : null}
            {submitError ? (
              <div className="network-error" role="alert">
                <AlertTriangle size={16} />
                {submitError}
              </div>
            ) : null}
            <footer className="network-dialog__footer">
              <button
                type="button"
                className="network-button network-button--ghost"
                disabled={busy}
                onClick={onClose}
              >
                {canWrite ? "Cancelar" : "Cerrar"}
              </button>
              {canWrite ? (
                <button
                  type="submit"
                  className="network-button network-button--primary"
                  disabled={busy || Boolean(conflict)}
                >
                  {isSaving ? (
                    <Loader2 size={15} className="network-spin" />
                  ) : null}
                  {mode === "create" ? "Crear enlace" : "Guardar cambios"}
                </button>
              ) : null}
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}
