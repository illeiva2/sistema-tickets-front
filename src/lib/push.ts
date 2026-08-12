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

  await api.post("/api/push/subscribe", subscription.toJSON());
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
