import { useEffect, useState } from "react";
import { BellRing, BellOff, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  disablePush,
  enablePush,
  fetchPushPublicKey,
  getCurrentSubscription,
  isPushSupported,
} from "../lib/push";

/**
 * Activar/desactivar notificaciones push en ESTE dispositivo. Se oculta si
 * el navegador no soporta push o el servidor no tiene el canal configurado.
 */
const PushToggle: React.FC = () => {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!isPushSupported()) return;
        const key = await fetchPushPublicKey();
        if (cancelled || !key) return;
        const subscription = await getCurrentSubscription();
        if (cancelled) return;
        setPublicKey(key);
        setEnabled(Boolean(subscription));
        setReady(true);
      } catch {
        // Canal no disponible: el componente no se muestra.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready || !publicKey) return null;

  const toggle = async () => {
    setBusy(true);
    try {
      if (enabled) {
        await disablePush();
        setEnabled(false);
        toast.success("Notificaciones desactivadas en este dispositivo");
      } else {
        const granted = await enablePush(publicKey);
        if (granted) {
          setEnabled(true);
          toast.success("Vas a recibir notificaciones en este dispositivo");
        } else {
          toast.error(
            "El navegador no otorgó el permiso de notificaciones. Revisá la configuración del sitio.",
          );
        }
      }
    } catch {
      toast.error("No se pudo actualizar la suscripción. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-foreground hover:bg-muted/60 transition-colors disabled:opacity-60"
      title={
        enabled
          ? "Dejar de recibir notificaciones en este dispositivo"
          : "Recibir notificaciones nativas en este dispositivo (aunque la app esté cerrada)"
      }
    >
      {busy ? (
        <Loader2 size={15} className="animate-spin" />
      ) : enabled ? (
        <BellRing size={15} className="text-primary" />
      ) : (
        <BellOff size={15} className="text-muted-foreground" />
      )}
      {enabled ? "Push activado" : "Activar push"}
    </button>
  );
};

export default PushToggle;
