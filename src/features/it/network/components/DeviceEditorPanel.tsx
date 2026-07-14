import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertTriangle, KeyRound, Loader2, RefreshCw, X } from "lucide-react";
import { getNetworkErrorInfo } from "../api";
import {
  DEVICE_STATUS_LABELS,
  DEVICE_TYPE_LABELS,
  NETWORK_DEVICE_STATUSES,
  NETWORK_DEVICE_TYPES,
  type DevicePayload,
  type NetworkAssetLookup,
  type NetworkDevice,
  type NetworkSite,
  type SaveCommand,
} from "../types";
import { useNetworkDialogFocus } from "../useDialogFocus";
import { parseVlans } from "../validation";

interface DeviceEditorPanelProps {
  mode: "create" | "edit";
  device: NetworkDevice | null;
  sites: NetworkSite[];
  assets: NetworkAssetLookup[];
  canWrite: boolean;
  isLoading: boolean;
  isSaving: boolean;
  loadError?: string;
  onClose: () => void;
  onRetry: () => void;
  onReload: () => Promise<NetworkDevice | null>;
  onSave: (command: SaveCommand<DevicePayload>) => Promise<void>;
}

interface DeviceForm extends Omit<DevicePayload, "vlans"> {
  vlans: string;
}

function formFromDevice(
  device: NetworkDevice | null,
  sites: NetworkSite[],
): DeviceForm {
  return {
    name: device?.name ?? "",
    type: device?.type ?? "SWITCH",
    status: device?.status ?? "ACTIVE",
    siteId: device?.siteId ?? sites[0]?.id ?? "",
    managementIp: device?.managementIp ?? "",
    macAddress: device?.macAddress ?? "",
    vlans: device?.vlans.join(", ") ?? "",
    location: device?.location ?? "",
    adminUrl: device?.adminUrl ?? "",
    notes: device?.notes ?? "",
    secretsRef: device?.secretsRef ?? "",
    assetId: device?.assetId ?? "",
  };
}

const optional = (value: string | null | undefined) => value?.trim() || null;

export function DeviceEditorPanel({
  mode,
  device,
  sites,
  assets,
  canWrite,
  isLoading,
  isSaving,
  loadError,
  onClose,
  onRetry,
  onReload,
  onSave,
}: DeviceEditorPanelProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const initialFocusRef = useRef<HTMLInputElement>(null);
  const hydratedRef = useRef(false);
  const expectedRef = useRef<string | null>(null);
  const [form, setForm] = useState<DeviceForm | null>(() =>
    mode === "create" ? formFromDevice(null, sites) : null,
  );
  const [submitError, setSubmitError] = useState<string>();
  const [conflict, setConflict] = useState<string>();
  const [isReloading, setIsReloading] = useState(false);
  const busy = isSaving || isReloading;
  const assetOptions =
    device?.asset && !assets.some((asset) => asset.id === device.asset!.id)
      ? [device.asset, ...assets]
      : assets;
  const siteOptions =
    device?.site && !sites.some((site) => site.id === device.site!.id)
      ? [
          {
            id: device.site.id,
            name: device.site.name,
            isActive: false,
            updatedAt: device.updatedAt,
          },
          ...sites,
        ]
      : sites;
  useNetworkDialogFocus(dialogRef, initialFocusRef, onClose, busy);

  useEffect(() => {
    if (mode !== "edit" || !device || hydratedRef.current) return;
    hydratedRef.current = true;
    expectedRef.current = device.updatedAt;
    setForm(formFromDevice(device, sites));
  }, [device, mode, sites]);

  useEffect(() => {
    if (mode !== "create" || !sites[0]) return;
    setForm((current) =>
      current && !current.siteId
        ? { ...current, siteId: sites[0].id }
        : current,
    );
  }, [mode, sites]);

  const reload = async () => {
    setIsReloading(true);
    const current = await onReload();
    if (current) {
      expectedRef.current = current.updatedAt;
      setForm(formFromDevice(current, sites));
      setConflict(undefined);
      setSubmitError(undefined);
    }
    setIsReloading(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form || !canWrite) return;
    setSubmitError(undefined);
    const parsedVlans = parseVlans(form.vlans);
    if (parsedVlans.error) {
      setSubmitError(parsedVlans.error);
      return;
    }
    if (form.adminUrl) {
      try {
        const url = new URL(form.adminUrl);
        if (
          !["http:", "https:"].includes(url.protocol) ||
          url.username ||
          url.password
        )
          throw new Error();
      } catch {
        setSubmitError(
          "La URL de administración debe ser HTTP(S) y no incluir usuario ni contraseña.",
        );
        return;
      }
    }
    const payload: DevicePayload = {
      ...form,
      name: form.name.trim(),
      managementIp: optional(form.managementIp),
      macAddress: optional(form.macAddress),
      vlans: parsedVlans.vlans,
      location: optional(form.location),
      adminUrl: optional(form.adminUrl),
      notes: optional(form.notes),
      secretsRef: optional(form.secretsRef),
      assetId: optional(form.assetId),
    };
    try {
      await onSave(
        mode === "create"
          ? { mode: "create", payload }
          : {
              mode: "edit",
              id: device!.id,
              payload: { ...payload, expectedUpdatedAt: expectedRef.current! },
            },
      );
    } catch (error) {
      const info = getNetworkErrorInfo(error);
      if (info.isConflict) setConflict(info.message);
      else setSubmitError(info.message);
    }
  };

  const update = <K extends keyof DeviceForm>(key: K, value: DeviceForm[K]) =>
    setForm((current) => (current ? { ...current, [key]: value } : current));

  return (
    <div className="network-dialog-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="network-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="network-device-dialog-title"
      >
        <header className="network-dialog__header">
          <div>
            <span>NET.NODE / REGISTRY</span>
            <h2 id="network-device-dialog-title">
              {mode === "create" ? "Nuevo dispositivo" : "Ficha operativa"}
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
              <AlertTriangle size={25} />
              <strong>No se pudo abrir el dispositivo</strong>
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
              <span>Sincronizando ficha…</span>
            </div>
          )
        ) : (
          <form className="network-form" onSubmit={submit}>
            {!canWrite ? (
              <div className="network-notice">
                Modo lectura. Tu perfil no puede modificar la infraestructura.
              </div>
            ) : null}
            <fieldset disabled={!canWrite || busy}>
              <legend>Identidad del nodo</legend>
              <label>
                Nombre / hostname{" "}
                <input
                  ref={initialFocusRef}
                  required
                  minLength={2}
                  maxLength={200}
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                />
              </label>
              <label>
                Tipo{" "}
                <select
                  value={form.type}
                  onChange={(event) =>
                    update("type", event.target.value as DeviceForm["type"])
                  }
                >
                  {NETWORK_DEVICE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {DEVICE_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Estado{" "}
                <select
                  value={form.status}
                  onChange={(event) =>
                    update("status", event.target.value as DeviceForm["status"])
                  }
                >
                  {NETWORK_DEVICE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {DEVICE_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sitio{" "}
                <select
                  required
                  value={form.siteId}
                  onChange={(event) => update("siteId", event.target.value)}
                >
                  <option value="">Seleccionar…</option>
                  {siteOptions
                    .filter((site) => site.isActive || site.id === form.siteId)
                    .map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Ubicación física{" "}
                <input
                  maxLength={300}
                  placeholder="Rack 02 / Piso 1"
                  value={form.location ?? ""}
                  onChange={(event) => update("location", event.target.value)}
                />
              </label>
              <label>
                Activo patrimonial{" "}
                <select
                  value={form.assetId ?? ""}
                  onChange={(event) => update("assetId", event.target.value)}
                >
                  <option value="">Sin vincular</option>
                  {assetOptions.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.label ||
                        [asset.assetTag, asset.brand, asset.model]
                          .filter(Boolean)
                          .join(" · ") ||
                        asset.serialNumber ||
                        asset.id}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>
            <fieldset disabled={!canWrite || busy}>
              <legend>Plano lógico</legend>
              <label>
                IP de administración{" "}
                <input
                  inputMode="decimal"
                  maxLength={45}
                  placeholder="192.168.10.2"
                  value={form.managementIp ?? ""}
                  onChange={(event) =>
                    update("managementIp", event.target.value)
                  }
                />
              </label>
              <label>
                Dirección MAC{" "}
                <input
                  className="network-mono"
                  maxLength={17}
                  placeholder="AA:BB:CC:DD:EE:FF"
                  value={form.macAddress ?? ""}
                  onChange={(event) => update("macAddress", event.target.value)}
                />
              </label>
              <label className="network-form__wide">
                VLANs <span>Separadas por coma</span>
                <input
                  placeholder="10, 20-VoIP, 30-CCTV"
                  value={form.vlans}
                  onChange={(event) => update("vlans", event.target.value)}
                />
              </label>
              <label className="network-form__wide">
                URL de administración{" "}
                <input
                  type="url"
                  maxLength={1000}
                  placeholder="https://192.168.10.2"
                  value={form.adminUrl ?? ""}
                  onChange={(event) => update("adminUrl", event.target.value)}
                />
              </label>
            </fieldset>
            <fieldset disabled={!canWrite || busy}>
              <legend>Operación segura</legend>
              <label className="network-form__wide">
                Referencia de credenciales{" "}
                <span>Nombre o ruta del gestor; nunca la contraseña.</span>
                <div className="network-input-icon">
                  <KeyRound size={15} />
                  <input
                    maxLength={500}
                    placeholder="Bitwarden / Redes / Core-SW-01"
                    value={form.secretsRef ?? ""}
                    onChange={(event) =>
                      update("secretsRef", event.target.value)
                    }
                  />
                </div>
              </label>
              <label className="network-form__wide">
                Notas{" "}
                <textarea
                  rows={4}
                  maxLength={10000}
                  value={form.notes ?? ""}
                  onChange={(event) => update("notes", event.target.value)}
                />
              </label>
            </fieldset>
            {form.status === "RETIRED" ? (
              <div className="network-notice network-notice--warning">
                Al retirar el nodo quedará inactivo y su IP podrá reutilizarse.
              </div>
            ) : null}
            {conflict ? (
              <div className="network-conflict" role="alert">
                <RefreshCw size={18} />
                <div>
                  <strong>La ficha cambió en el servidor</strong>
                  <p>{conflict}</p>
                  <button
                    type="button"
                    className="network-button network-button--ghost"
                    disabled={isReloading}
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
                  {mode === "create" ? "Registrar nodo" : "Guardar cambios"}
                </button>
              ) : null}
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}
