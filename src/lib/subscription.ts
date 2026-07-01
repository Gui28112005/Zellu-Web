import { auth } from '@/lib/firebase'
import type { PlanoTier } from '@/lib/types'

const workerUrl = (import.meta.env.VITE_WORKER_URL ?? '').replace(/\/$/, '')

export interface SubscriptionStatus {
  active: boolean
  plan: PlanoTier
  status: 'ACTIVE' | 'PENDING' | 'CANCELLED' | 'PAUSED' | 'INACTIVE' | 'UNCONFIGURED'
  nextPaymentAt: string | null
}

interface CheckoutResponse {
  active?: boolean
  plan?: PlanoTier
  productId?: string
  checkoutUrl?: string
}

export interface EbookPurchaseStatus {
  active: boolean
  status: 'ACTIVE' | 'PENDING' | 'REJECTED' | 'INACTIVE'
  productId: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!workerUrl) throw new Error('O servidor de pagamentos ainda não foi configurado.')

  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('Faça login novamente para continuar.')

  const response = await fetch(`${workerUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  const payload = (await response.json().catch(() => ({}))) as T & { error?: string }
  if (!response.ok) throw new Error(payload.error ?? 'Não foi possível concluir esta ação.')
  return payload
}

export function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  return request<SubscriptionStatus>('/payments/subscription', { method: 'GET' })
}

export function createSubscriptionCheckout(plan: Exclude<PlanoTier, 'FREE'>, returnPath = '/planos'): Promise<CheckoutResponse> {
  return request<CheckoutResponse>('/payments/checkout', {
    method: 'POST',
    body: JSON.stringify({ plan, returnPath }),
  })
}

export function cancelSubscription(): Promise<SubscriptionStatus> {
  return request<SubscriptionStatus>('/payments/cancel', { method: 'POST' })
}

export function createEbookCheckout(): Promise<CheckoutResponse> {
  return request<CheckoutResponse>('/payments/ebooks/checkout', { method: 'POST' })
}

export function createLifetimeCheckout(): Promise<CheckoutResponse> {
  return request<CheckoutResponse>('/payments/lifetime/checkout', { method: 'POST' })
}

export function getEbookPurchaseStatus(): Promise<EbookPurchaseStatus> {
  return request<EbookPurchaseStatus>('/payments/ebooks/status', { method: 'GET' })
}
