import { useEffect, useState } from "react";
import { BellRing, BellOff, Loader2, Share } from "lucide-react";
import toast from "react-hot-toast";
import {
  disablePush,
  enablePush,
  fetchPushPublicKey,
  getCurrentSubscription,
  isIos,
  isPushSupported,
  isStandalone,
} from "../lib/push";

function pushErrorDetail(error: unknown): string | undefined {
  if (error instanceof DOMException) return error.message || error.name;
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { error?: { message?: string } } } })
      .response;
    return response?.data?.error?.message;
  }
  if (error instanceof Error) return error.message;
  return undefined;
}

/**
 * Activar/desactivar notificaciones push en ESTE dispositivo. Se oculta si
 * el servidor no tiene el canal configurado. En iPhone/iPad sin instalar,
 * Safari no expone PushManager fuera de una PWA agregada a inicio: en ese
 * caso se muestra un aviso para instalar en lugar del botón.
 */
const PushToggle: React.FC = () => {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [needsIosInstall, setNeedsIosInstall] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Se consulta primero si el canal existe en el servidor: si no,
        // no vale la pena distinguir por plataforma, no se muestra nada.
        const key = await fetchPushPublicKey();
        if (cancelled || !key) return;

        if (!isPushSupported()) {
          if (isIos() && !isStandalone()) setNeedsIosInstall(true);
          return;
        }

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

  if (needsIosInstall) {
    return (
      <p className="inline-flex max-w-xs items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs text-muted-foreground">
        <Share size={13} className="shrink-0" />
        Para recibir notificaciones en iPhone/iPad, primero instalá la app:
        tocá Compartir y luego "Agregar a inicio".
      </p>
    );
  }

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
    } catch (error) {
      // Se loguea siempre y se intenta mostrar el detalle real (nombre de
      // la DOMException del navegador o mensaje del server) para poder
      // diagnosticar sin acceso al inspector del dispositivo — Safari en
      // particular es poco explícito y antes esto quedaba en un mensaje
      // genérico sin pista de la causa.
      console.error("Push subscription failed:", error);
      const detail = pushErrorDetail(error);
      toast.error(
        detail
          ? `No se pudo actualizar la suscripción: ${detail}`
          : "No se pudo actualizar la suscripción. Probá de nuevo.",
      );
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
