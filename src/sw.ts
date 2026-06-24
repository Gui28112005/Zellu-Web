/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: unknown[] }

clientsClaim()
self.skipWaiting()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  ({ url }) => url.origin === 'https://firestore.googleapis.com',
  new NetworkFirst({ cacheName: 'firestore-cache' }),
)

// ── Push: recebe notificação e exibe ─────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json() as {
    title: string
    body: string
    icon?: string
    badge?: string
    tag?: string
    data?: Record<string, string>
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon ?? '/pwa-192x192.png',
      badge: data.badge ?? '/pwa-192x192.png',
      tag: data.tag,
      data: data.data,
    }),
  )
})

// ── Clique na notificação: abre o veículo correspondente ─────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const veiculoId = (event.notification.data as { veiculoId?: string })?.veiculoId
  const targetUrl = veiculoId ? `/veiculo/${veiculoId}` : '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.includes(targetUrl))
        if (existing) return existing.focus()
        return self.clients.openWindow(targetUrl)
      }),
  )
})
