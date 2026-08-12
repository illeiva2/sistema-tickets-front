/// <reference lib="webworker" />
/**
 * Service worker de la PWA.
 *
 * - Precachea los assets del build (workbox injectManifest) pero deja la
 *   navegación SIEMPRE por red: cada deploy sirve el index.html nuevo y no
 *   quedan usuarios pegados a una versión vieja.
 * - Maneja Web Push: muestra la notificación nativa y al tocarla enfoca la
 *   app (o la abre) en el ticket correspondiente.
 */
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Parameters<typeof precacheAndRoute>[0];
};

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("install", () => {
  void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

interface PushData {
  title?: string;
  body?: string;
  url?: string;
}

self.addEventListener("push", (event) => {
  let data: PushData = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { body: event.data?.text() ?? "" };
  }

  const title = data.title || "Soporte GRF";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/pwa-192.png",
      badge: "/pwa-192.png",
      data: { url: data.url || "/notifications" },
      tag: data.url || undefined, // agrupa avisos repetidos del mismo ticket
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url: string = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clientList) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            await (client as WindowClient).navigate(url);
          }
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
