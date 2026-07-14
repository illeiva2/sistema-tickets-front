import { useRef, useState, type FormEvent } from "react";
import { AlertTriangle, Loader2, RefreshCw, X } from "lucide-react";
import { getNetworkErrorInfo } from "../api";
import type {
  NetworkSite,
  SaveCommand,
  TopologyView,
  TopologyViewPayload,
} from "../types";
import { useNetworkDialogFocus } from "../useDialogFocus";

interface TopologyViewEditorPanelProps {
  view: TopologyView | null;
  sites: NetworkSite[];
  isSaving: boolean;
  onClose: () => void;
  onReload: () => Promise<TopologyView | null>;
  onSave: (command: SaveCommand<TopologyViewPayload>) => Promise<void>;
}

function formFromView(view: TopologyView | null) {
  return {
    name: view?.name ?? "",
    description: view?.description ?? "",
    siteId: view?.siteId ?? "",
    isDefault: view?.isDefault ?? false,
  };
}

export function TopologyViewEditorPanel({
  view,
  sites,
  isSaving,
  onClose,
  onReload,
  onSave,
}: TopologyViewEditorPanelProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const initialFocusRef = useRef<HTMLInputElement>(null);
  const expectedRef = useRef(view?.updatedAt ?? null);
  const [form, setForm] = useState(() => formFromView(view));
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
      setForm(formFromView(current));
      setConflict(false);
      setError(undefined);
    }
    setIsReloading(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(undefined);
    const payload: TopologyViewPayload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      siteId: form.siteId || null,
      isDefault: form.isDefault,
    };
    try {
      await onSave(
        view
          ? {
              mode: "edit",
              id: view.id,
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
        aria-labelledby="view-dialog-title"
      >
        <header className="network-dialog__header">
          <div>
            <span>TOPOLOGY / VIEWPORT</span>
            <h2 id="view-dialog-title">
              {view ? "Configurar vista" : "Nueva vista"}
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
            <legend>Mapa lógico</legend>
            <label className="network-form__wide">
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
              Sitio{" "}
              <select
                value={form.siteId}
                onChange={(event) =>
                  setForm({ ...form, siteId: event.target.value })
                }
              >
                <option value="">Vista global</option>
                {sites
                  .filter((site) => site.isActive || site.id === form.siteId)
                  .map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="network-checkbox">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(event) =>
                  setForm({ ...form, isDefault: event.target.checked })
                }
              />
              Usar como vista predeterminada
            </label>
            <label className="network-form__wide">
              Descripción{" "}
              <textarea
                rows={3}
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
              {view ? "Guardar vista" : "Crear vista"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
