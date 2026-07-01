import type { Lembrete, Veiculo } from '@/lib/types'

const WORKER_URL = import.meta.env.VITE_WORKER_URL as string | undefined
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

// ── Helpers ───────────────────────────────────────────────────────────────────

function urlBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const bytes = Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function workerFetch(path: string, method: string, body?: unknown): void {
  if (!WORKER_URL) {
    console.warn('[push] VITE_WORKER_URL não configurada.')
    return
  }

  fetch(`${WORKER_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
    .then((response) => {
      if (!response.ok) {
        console.warn('[push] Falha ao sincronizar com Worker.', path, response.status)
      }
    })
    .catch((error) => {
      console.warn('[push] Erro ao sincronizar com Worker.', path, error)
    })
}

async function workerFetchJson(path: string, method: string, options?: { body?: unknown; token?: string }): Promise<Response | null> {
  if (!WORKER_URL) return null

  return fetch(`${WORKER_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })
}

// ── Subscription ──────────────────────────────────────────────────────────────

export async function requestPushPermission(userId: string): Promise<boolean> {
  if (!WORKER_URL || !VAPID_PUBLIC_KEY) return false
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('sw_timeout')), 8000)
    )
    const registration = await Promise.race([navigator.serviceWorker.ready, timeout])
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToArrayBuffer(VAPID_PUBLIC_KEY),
    })
    workerFetch('/subscribe', 'POST', { userId, subscription: subscription.toJSON() })
    return true
  } catch {
    return false
  }
}

export function removePushSubscription(userId: string): void {
  workerFetch('/subscribe', 'DELETE', { userId })
}

export async function sendPushTest(idToken: string): Promise<boolean> {
  const response = await workerFetchJson('/push-test', 'POST', { token: idToken })
  return Boolean(response?.ok)
}

// ── Sync de lembretes ─────────────────────────────────────────────────────────

export function syncLembrete(userId: string, lembrete: Lembrete, veiculo: Veiculo | undefined): void {
  if (!WORKER_URL) return
  workerFetch('/reminder', 'POST', {
    userId,
    reminder: {
      id: lembrete.id,
      veiculoId: lembrete.veiculoId,
      veiculoNome: veiculo?.nome ?? 'Veículo',
      titulo: lembrete.titulo,
      dataLimite: lembrete.dataLimite,
      horaAviso: lembrete.horaAviso,
      tipo: lembrete.tipo,
    },
  })
}

export function removeLembreteSync(userId: string, lembreteId: string): void {
  if (!WORKER_URL) return
  workerFetch(`/reminder/${lembreteId}`, 'DELETE', { userId })
}
