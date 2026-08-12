import api from "./api";

/**
 * Suscripción Web Push del dispositivo actual. El navegador guarda la
 * suscripción en el service worker; el back la asocia al usuario logueado.
 */

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * iOS/iPadOS. Safari sólo expone PushManager cuando la PWA está instalada
 * (Compartir → Agregar a inicio); en una pestaña normal isPushSupported()
 * da false aunque el dispositivo lo soporte (iOS 16.4+). iPadOS 13+ se
 * identifica como "MacIntel" en el user agent, por eso el chequeo extra de
 * touch points (los Mac de escritorio no tienen pantalla táctil).
 */
export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** La app corre instalada (Android/desktop) o agregada a inicio (iOS). */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (
    window.navigator as unknown as { standalone?: boolean }
  ).standalone;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    iosStandalone === true
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

/** Clave pública del servidor; null si el canal está apagado. */
export async function fetchPushPublicKey(): Promise<string | null> {
  const response = await api.get("/api/push/public-key");
  return response.data?.data?.publicKey ?? null;
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  const registration = await getRegistration();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

/**
 * Pide permiso, suscribe el dispositivo y lo registra en el servidor.
 * Devuelve false si el usuario negó el permiso.
 */
export async function enablePush(publicKey: string): Promise<boolean> {
  const registration = await getRegistration();
  if (!registration) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
  });

  // Enviar sólo lo que el back necesita: toJSON() trae además
  // expirationTime, y distintos navegadores (Safari incluido) no son
  // consistentes en qué mandan ahí — mejor no depender de eso.
  const json = subscription.toJSON();
  await api.post("/api/push/subscribe", {
    endpoint: json.endpoint,
    keys: json.keys,
  });
  return true;
}

/** Da de baja el dispositivo actual (navegador + servidor). */
export async function disablePush(): Promise<void> {
  const subscription = await getCurrentSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await api.post("/api/push/unsubscribe", { endpoint });
}
