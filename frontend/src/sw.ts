// GlicoCare - Service Worker custom (injectManifest via vite-plugin-pwa).
//
// Substitui a estratégia "generateSW" (Workbox 100% automático) por esta, porque
// precisamos de lógica própria para os eventos "push" e "notificationclick" que o
// modo generateSW não permite adicionar. O precache/offline continua a ser gerido
// pelo Workbox, tal como antes — só passa a ser este ficheiro a chamá-lo.

import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkOnly } from "workbox-strategies";

declare let self: ServiceWorkerGlobalScope;

// Precache dos assets do build (gerado automaticamente pelo vite-plugin-pwa em build).
precacheAndRoute(self.__WB_MANIFEST);

// Nunca deixar o service worker cachear chamadas à API do Supabase — dados clínicos têm
// de vir sempre da rede, nunca de uma cache desatualizada (mantém o comportamento que
// existia antes na config "workbox.runtimeCaching" do vite.config.ts).
registerRoute(({ url }) => url.hostname.endsWith("supabase.co"), new NetworkOnly());

self.skipWaiting();
self.addEventListener("activate", () => {
  self.clients.claim();
});

// ---------- Web Push ----------

interface PushPayload {
  title?: string;
  body?: string;
  icon?: string;
  url?: string;
}

self.addEventListener("push", (event: PushEvent) => {
  let payload: PushPayload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { body: event.data?.text() };
  }

  const title = payload.title ?? "GlicoCare";
  const options: NotificationOptions = {
    body: payload.body ?? "",
    icon: payload.icon ?? "/pwa-192.png",
    badge: "/pwa-192.png",
    data: { url: payload.url ?? "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl: string = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        if ("focus" in client) {
          const clientUrl = new URL((client as WindowClient).url);
          if (clientUrl.pathname === targetUrl) {
            return (client as WindowClient).focus();
          }
        }
      }
      // No matching window open — focus any existing one and navigate it, or open a new one.
      if (allClients.length > 0 && "navigate" in allClients[0]) {
        const client = allClients[0] as WindowClient;
        await client.navigate(targetUrl);
        return client.focus();
      }
      return self.clients.openWindow(targetUrl);
    })()
  );
});
