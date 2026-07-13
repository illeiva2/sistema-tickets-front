import { useRef, useState, type FormEvent } from "react";
import { AlertTriangle, Loader2, RefreshCw, X } from "lucide-react";
import { getNetworkErrorInfo } from "../api";
import type { NetworkSite, SaveCommand, SitePayload } from "../types";
import { useNetworkDialogFocus } from "../useDialogFocus";

interface SiteEditorPanelProps {
  site: NetworkSite | null;
  isSaving: boolean;
  onClose: () => void;
  onReload: () => Promise<NetworkSite | null>;
  onSave: (command: SaveCommand<SitePayload>) => Promise<void>;
}

function formFromSite(site: NetworkSite | null) {
  return {
    name: site?.name ?? "",
    slug: site?.slug ?? "",
    address: site?.address ?? "",
    description: site?.description ?? "",
    isActive: site?.isActive ?? true,
  };
}

export function SiteEditorPanel({
  site,
  isSaving,
  onClose,
  onReload,
  onSave,
}: SiteEditorPanelProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const initialFocusRef = useRef<HTMLInputElement>(null);
  const expectedRef = useRef(site?.updatedAt ?? null);
  const [form, setForm] = useState(() => formFromSite(site));
  const [error, setError] = useState<string>();
  const [conflict, setConflict] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const busy = isSaving || isReloading;
  useNetworkDialogFocus(dialogRef, initialFocusRef, onClose, busy);

  const reload = async () => {
    setIsReloading(true);
    const current = await onReload();
    if (current) {
      expectedRef.current = current.updatedAt;
      setForm(formFromSite(current));
      setConflict(false);
      setError(undefined);
    }
    setIsReloading(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(undefined);
    const payload: SitePayload = {
      name: form.name.trim(),
      ...(form.slug.trim() ? { slug: form.slug.trim().toLowerCase() } : {}),
      address: form.address.trim() || null,
      description: form.description.trim() || null,
      ...(site ? { isActive: form.isActive } : {}),
    };
    try {
      await onSave(
        site
          ? {
              mode: "edit",
              id: site.id,
              payload: { ...payload, expectedUpdatedAt: expectedRef.current! },
            }
          : { mode: "create", payload },
      );
    } catch (caught) {
      const info = getNetworkErrorInfo(caught);
      setConflict(info.isConflict);
      setError(info.message);
    }
  };

  return (
    <div className="network-dialog-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="network-dialog network-dialog--compact"
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-dialog-title"
      >
        <header className="network-dialog__header">
          <div>
            <span>SITE / COORDINATES</span>
            <h2 id="site-dialog-title">
              {site ? "Editar sitio" : "Nuevo sitio"}
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
        <form className="network-form" onSubmit={submit}>
          <fieldset disabled={busy}>
            <legend>Ubicación empresarial</legend>
            <label>
              Nombre{" "}
              <input
                ref={initialFocusRef}
                required
                minLength={2}
                maxLength={200}
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
            </label>
            <label>
              Identificador <span>Opcional; ej. casa-central</span>
              <input
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                minLength={2}
                maxLength={100}
                value={form.slug}
                onChange={(event) =>
                  setForm({ ...form, slug: event.target.value })
                }
              />
            </label>
            <label className="network-form__wide">
              Dirección{" "}
              <input
                maxLength={500}
                value={form.address}
                onChange={(event) =>
                  setForm({ ...form, address: event.target.value })
                }
              />
            </label>
            {site ? (
              <label className="network-checkbox">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm({ ...form, isActive: event.target.checked })
                  }
                />
                Sitio activo
              </label>
            ) : null}
            <label className="network-form__wide">
              Descripción{" "}
              <textarea
                rows={4}
                maxLength={5000}
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
              />
            </label>
          </fieldset>
          {error ? (
            <div
              className={conflict ? "network-conflict" : "network-error"}
              role="alert"
            >
              {conflict ? <RefreshCw size={16} /> : <AlertTriangle size={16} />}
              <div>
                <strong>
                  {conflict
                    ? "Existe una versión más reciente"
                    : "No se pudo guardar"}
                </strong>
                <p>{error}</p>
                {conflict ? (
                  <button
                    type="button"
                    className="network-button network-button--ghost"
                    disabled={isReloading}
                    onClick={() => void reload()}
                  >
                    <RefreshCw size={14} />
                    Recargar versión actual
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          <footer className="network-dialog__footer">
            <button
              type="button"
              className="network-button network-button--ghost"
              disabled={busy}
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="network-button network-button--primary"
              disabled={busy || conflict}
            >
              {busy ? <Loader2 size={15} className="network-spin" /> : null}
              {site ? "Guardar sitio" : "Crear sitio"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
