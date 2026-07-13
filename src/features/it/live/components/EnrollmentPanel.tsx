import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  AlertTriangle,
  Check,
  Clipboard,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { getAgentErrorInfo } from "../api";
import { formatDate } from "../format";
import type {
  AgentEnrollmentToken,
  AgentEnrollmentTokenResult,
  EnrollmentTokenPayload,
} from "../types";
import { useLiveDialogFocus } from "../useDialogFocus";

interface EnrollmentPanelProps {
  items: AgentEnrollmentToken[];
  isLoading: boolean;
  isCreating: boolean;
  revokingId: string | null;
  loadError?: string;
  onClose: () => void;
  onRetry: () => void;
  onCreate: (
    payload: EnrollmentTokenPayload,
  ) => Promise<AgentEnrollmentTokenResult>;
  onRevoke: (id: string) => Promise<void>;
}

const statusLabels = {
  AVAILABLE: "Disponible",
  USED: "Utilizado",
  EXPIRED: "Vencido",
  REVOKED: "Revocado",
} as const;

export function EnrollmentPanel({
  items,
  isLoading,
  isCreating,
  revokingId,
  loadError,
  onClose,
  onRetry,
  onCreate,
  onRevoke,
}: EnrollmentPanelProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const initialFocusRef = useRef<HTMLInputElement>(null);
  const revealFocusRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxUses, setMaxUses] = useState("1");
  const [plainToken, setPlainToken] = useState<string>();
  const [generatedMaxUses, setGeneratedMaxUses] = useState(1);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>();
  const revealRef = useRef<{ plainToken?: string; copied: boolean }>({
    copied: false,
  });
  revealRef.current = { plainToken, copied };
  const busy = isCreating || Boolean(revokingId);
  const close = useCallback(() => {
    if (
      revealRef.current.plainToken &&
      !revealRef.current.copied &&
      !window.confirm(
        "Este token no volverá a mostrarse. ¿Cerrar sin marcarlo como copiado?",
      )
    )
      return;
    onClose();
  }, [onClose]);
  useLiveDialogFocus(dialogRef, initialFocusRef, close, busy);
  useEffect(() => {
    if (!plainToken) return;
    revealFocusRef.current?.focus();
    revealFocusRef.current?.select();
  }, [plainToken]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setError(undefined);
    const parsedMaxUses = Number(maxUses);
    if (
      !Number.isInteger(parsedMaxUses) ||
      parsedMaxUses < 1 ||
      parsedMaxUses > 250
    ) {
      setError("La cantidad de equipos debe ser un número entre 1 y 250.");
      return;
    }
    try {
      const cleanLabel = label.trim();
      const result = await onCreate({
        ...(cleanLabel ? { label: cleanLabel } : {}),
        ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
        maxUses: parsedMaxUses,
      });
      setPlainToken(result.plainToken);
      setGeneratedMaxUses(result.token.maxUses);
      setCopied(false);
    } catch (caught) {
      setError(getAgentErrorInfo(caught).message);
    }
  };

  const copy = async () => {
    if (!plainToken) return;
    try {
      await navigator.clipboard.writeText(plainToken);
      setCopied(true);
      setError(undefined);
    } catch {
      setError(
        "No se pudo copiar automáticamente. Seleccioná el token y copialo manualmente.",
      );
    }
  };

  const revoke = async (token: AgentEnrollmentToken) => {
    if (
      !window.confirm(
        `¿Revocar el token ${token.label || token.id}? No podrá utilizarse para enrolar.`,
      )
    )
      return;
    setError(undefined);
    try {
      await onRevoke(token.id);
    } catch (caught) {
      setError(getAgentErrorInfo(caught).message);
    }
  };

  return (
    <div className="live-dialog-backdrop" role="presentation">
      <section
        ref={dialogRef}
        className="live-dialog live-dialog--tokens"
        role="dialog"
        aria-modal="true"
        aria-labelledby="enrollment-title"
      >
        <header className="live-dialog-header">
          <div>
            <span>AGENT / TRUST BOOTSTRAP</span>
            <h2 id="enrollment-title">Tokens de enrolamiento</h2>
          </div>
          <button
            type="button"
            className="live-icon-button"
            aria-label="Cerrar"
            disabled={busy}
            onClick={close}
          >
            <X size={18} />
          </button>
        </header>
        <div className="live-dialog-body">
          <div className="live-security-notice">
            <ShieldAlert size={20} />
            <div>
              <strong>Secreto de enrolamiento controlado</strong>
              <p>
                El valor plano aparece una sola vez, pero puede autorizar entre
                1 y 250 equipos. Guardalo en el canal seguro usado para instalar
                el agente; no lo pegues en tickets ni chats.
              </p>
            </div>
          </div>
          {plainToken ? (
            <section
              className="live-token-reveal"
              aria-labelledby="token-reveal-title"
            >
              <span>GENERADO / VISIBLE UNA VEZ</span>
              <h3 id="token-reveal-title">Copiá el token ahora</h3>
              <div>
                <input
                  ref={revealFocusRef}
                  aria-label="Token generado"
                  readOnly
                  value={plainToken}
                  onFocus={(event) => event.currentTarget.select()}
                />
                <button
                  type="button"
                  className="live-button live-button--primary"
                  onClick={() => void copy()}
                >
                  {copied ? <Check size={15} /> : <Clipboard size={15} />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
              <p>
                {generatedMaxUses === 1
                  ? "Autoriza un equipo. "
                  : `Autoriza un lote de hasta ${generatedMaxUses} equipos. `}
                Al cerrar este panel el secreto desaparece de la interfaz y no
                puede recuperarse.
              </p>
            </section>
          ) : (
            <form className="live-token-form" onSubmit={create}>
              <label>
                Etiqueta{" "}
                <input
                  ref={initialFocusRef}
                  maxLength={200}
                  placeholder="Lote Administración"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                />
              </label>
              <label>
                Vence <span>Opcional, entre 10 minutos y 7 días.</span>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                />
              </label>
              <label>
                Cantidad de equipos{" "}
                <span>1 para instalación individual; hasta 250 por lote.</span>
                <input
                  type="number"
                  min={1}
                  max={250}
                  step={1}
                  required
                  inputMode="numeric"
                  value={maxUses}
                  onChange={(event) => setMaxUses(event.target.value)}
                />
              </label>
              <button
                type="submit"
                className="live-button live-button--primary"
                disabled={isCreating}
              >
                {isCreating ? (
                  <Loader2 size={15} className="live-spin" />
                ) : (
                  <KeyRound size={15} />
                )}
                Generar token
              </button>
            </form>
          )}
          {error ? (
            <div className="live-error" role="alert">
              <AlertTriangle size={16} />
              {error}
            </div>
          ) : null}
          <section
            className="live-token-list"
            aria-labelledby="token-list-title"
          >
            <div className="live-section-title">
              <KeyRound size={16} />
              <div>
                <h3 id="token-list-title">Historial de tokens</h3>
                <p>No contiene secretos planos.</p>
              </div>
            </div>
            {isLoading ? (
              <div className="live-inline-loading">
                <Loader2 className="live-spin" />
                Cargando tokens…
              </div>
            ) : loadError ? (
              <div className="live-inline-error">
                <AlertTriangle />
                <span>{loadError}</span>
                <button
                  type="button"
                  className="live-button live-button--ghost"
                  onClick={onRetry}
                >
                  <RefreshCw size={14} />
                  Reintentar
                </button>
              </div>
            ) : !items.length ? (
              <div className="live-inline-empty">
                <KeyRound size={22} />
                <strong>Sin tokens emitidos</strong>
              </div>
            ) : (
              <ul>
                {items.map((token) => (
                  <li key={token.id}>
                    <div>
                      <span
                        className="live-token-status"
                        data-status={token.status}
                      >
                        {statusLabels[token.status]}
                      </span>
                      <strong>{token.label || "Sin etiqueta"}</strong>
                      <small>
                        Creado {formatDate(token.createdAt)} · vence{" "}
                        {formatDate(token.expiresAt)}
                      </small>
                      <small>
                        Usados {token.useCount} de {token.maxUses} · quedan{" "}
                        {token.remainingUses}
                      </small>
                      {token.enrolledDevices?.length ? (
                        <small>
                          Equipos:{" "}
                          {token.enrolledDevices
                            .map((device) => device.hostname)
                            .join(", ")}
                        </small>
                      ) : token.usedByDevice ? (
                        <small>Equipo: {token.usedByDevice.hostname}</small>
                      ) : null}
                    </div>
                    {token.status === "AVAILABLE" ? (
                      <button
                        type="button"
                        className="live-icon-button live-icon-button--danger"
                        aria-label={`Revocar token ${token.label || token.id}`}
                        disabled={revokingId === token.id}
                        onClick={() => void revoke(token)}
                      >
                        <Trash2 size={15} />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
