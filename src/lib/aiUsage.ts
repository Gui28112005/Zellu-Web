import type { PlanoTier } from './types'

export const AI_MONTHLY_LIMITS: Record<PlanoTier, number> = {
  FREE: 5,
  LITE: 30,
  FROTA: 150,
  EMPRESARIAL: 500,
}

const EMPRESA_AI_KEY = 'zellu_empresa_ai_off'

export function isEmpresaAIDisabled(): boolean {
  return localStorage.getItem(EMPRESA_AI_KEY) === 'true'
}

export function setEmpresaAIDisabled(disabled: boolean): void {
  localStorage.setItem(EMPRESA_AI_KEY, String(disabled))
}

interface AIUsageRecord {
  count: number
  resetAt: string // 'YYYY-MM-DD' — first day of next month
}

function storageKey(uid: string) {
  return `zellu_ai_usage_${uid}`
}

function nextResetDate(): string {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return next.toISOString().split('T')[0]
}

function loadRecord(uid: string): AIUsageRecord {
  try {
    const raw = localStorage.getItem(storageKey(uid))
    if (raw) {
      const record: AIUsageRecord = JSON.parse(raw)
      const today = new Date().toISOString().split('T')[0]
      // Reset when the month rolls over
      if (record.resetAt <= today) {
        const fresh: AIUsageRecord = { count: 0, resetAt: nextResetDate() }
        localStorage.setItem(storageKey(uid), JSON.stringify(fresh))
        return fresh
      }
      return record
    }
  } catch {}
  const fresh: AIUsageRecord = { count: 0, resetAt: nextResetDate() }
  localStorage.setItem(storageKey(uid), JSON.stringify(fresh))
  return fresh
}

export interface UsageInfo {
  count: number
  limit: number
  remaining: number
  resetAt: string // 'YYYY-MM-DD'
  percentage: number // 0–100
}

export function getUsageInfo(uid: string, plano: PlanoTier): UsageInfo {
  const limit = AI_MONTHLY_LIMITS[plano]
  const record = loadRecord(uid)
  const count = Math.min(record.count, limit)
  return {
    count,
    limit,
    remaining: Math.max(0, limit - count),
    resetAt: record.resetAt,
    percentage: limit > 0 ? Math.min(100, Math.round((count / limit) * 100)) : 0,
  }
}

/** Check if allowed AND increment counter if so. Call once per AI request. */
export function consumeAI(uid: string, plano: PlanoTier): { allowed: boolean } & UsageInfo {
  const record = loadRecord(uid)
  const limit = AI_MONTHLY_LIMITS[plano]
  const count = Math.min(record.count, limit)

  if (count >= limit) {
    return { allowed: false, count, limit, remaining: 0, resetAt: record.resetAt, percentage: 100 }
  }

  const updated: AIUsageRecord = { count: record.count + 1, resetAt: record.resetAt }
  localStorage.setItem(storageKey(uid), JSON.stringify(updated))
  const newCount = updated.count
  return {
    allowed: true,
    count: newCount,
    limit,
    remaining: Math.max(0, limit - newCount),
    resetAt: updated.resetAt,
    percentage: Math.min(100, Math.round((newCount / limit) * 100)),
  }
}

/** Format resetAt ('YYYY-MM-DD') to 'DD/MM/YYYY' for display */
export function formatResetDate(resetAt: string): string {
  const [y, m, d] = resetAt.split('-')
  return `${d}/${m}/${y}`
}
