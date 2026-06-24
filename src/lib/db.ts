import type { Unsubscribe } from 'firebase/firestore'
import type { Veiculo, Lembrete, Abastecimento } from '@/lib/types'
import { syncLembrete, removeLembreteSync } from '@/lib/push'

// ─── helpers ────────────────────────────────────────────────────────────────

// ─── Veículos (localStorage) ─────────────────────────────────────────────────

function veiculosKey(uid: string) {
  return `zellu_veiculos_${uid}`
}

function loadVeiculos(uid: string): Veiculo[] {
  try {
    const raw = localStorage.getItem(veiculosKey(uid))
    return raw ? (JSON.parse(raw) as Veiculo[]) : []
  } catch {
    return []
  }
}

function saveVeiculos(uid: string, items: Veiculo[]): void {
  localStorage.setItem(veiculosKey(uid), JSON.stringify(items))
}

export function subscribeVeiculos(
  uid: string,
  cb: (items: Veiculo[]) => void
): Unsubscribe {
  cb(loadVeiculos(uid))
  return () => {}
}

export async function addVeiculo(
  uid: string,
  data: Omit<Veiculo, 'id' | 'userId' | 'criadoEm'>
): Promise<Veiculo> {
  const items = loadVeiculos(uid)
  const novo: Veiculo = {
    ...data,
    id: crypto.randomUUID(),
    userId: uid,
    criadoEm: Date.now(),
  }
  saveVeiculos(uid, [novo, ...items])
  return novo
}

export async function updateVeiculo(uid: string, v: Veiculo): Promise<void> {
  const items = loadVeiculos(uid)
  saveVeiculos(uid, items.map((x) => (x.id === v.id ? v : x)))
}

export async function deleteVeiculo(uid: string, id: string): Promise<void> {
  const items = loadVeiculos(uid)
  saveVeiculos(uid, items.filter((x) => x.id !== id))
}

// ─── Lembretes ───────────────────────────────────────────────────────────────

function lembretesKey(uid: string) {
  return `zellu_lembretes_${uid}`
}

function loadLembretes(uid: string): Lembrete[] {
  try {
    const raw = localStorage.getItem(lembretesKey(uid))
    return raw ? (JSON.parse(raw) as Lembrete[]) : []
  } catch {
    return []
  }
}

function saveLembretes(uid: string, items: Lembrete[]): void {
  localStorage.setItem(lembretesKey(uid), JSON.stringify(items))
}

export function subscribeLembretes(
  uid: string,
  cb: (items: Lembrete[]) => void
): Unsubscribe {
  cb(loadLembretes(uid))
  return () => {}
}

export async function addLembrete(
  uid: string,
  data: Omit<Lembrete, 'id' | 'userId' | 'criadoEm'>
): Promise<Lembrete> {
  const created: Lembrete = {
    ...data,
    id: crypto.randomUUID(),
    userId: uid,
    criadoEm: Date.now(),
  }
  saveLembretes(uid, [created, ...loadLembretes(uid)])
  const veiculo = loadVeiculos(uid).find((v) => v.id === created.veiculoId)
  syncLembrete(uid, created, veiculo)
  return created
}

export async function updateLembrete(uid: string, l: Lembrete): Promise<void> {
  saveLembretes(uid, loadLembretes(uid).map((item) => item.id === l.id ? l : item))
  const veiculo = loadVeiculos(uid).find((v) => v.id === l.veiculoId)
  syncLembrete(uid, l, veiculo)
}

export async function deleteLembrete(uid: string, id: string): Promise<void> {
  saveLembretes(uid, loadLembretes(uid).filter((item) => item.id !== id))
  removeLembreteSync(uid, id)
}

// ─── Abastecimentos ──────────────────────────────────────────────────────────

function abastecimentosKey(uid: string) {
  return `zellu_abastecimentos_${uid}`
}

function loadAbastecimentos(uid: string): Abastecimento[] {
  try {
    const raw = localStorage.getItem(abastecimentosKey(uid))
    return raw ? (JSON.parse(raw) as Abastecimento[]) : []
  } catch {
    return []
  }
}

function saveAbastecimentos(uid: string, items: Abastecimento[]): void {
  localStorage.setItem(abastecimentosKey(uid), JSON.stringify(items))
}

export function subscribeAbastecimentos(
  uid: string,
  cb: (items: Abastecimento[]) => void
): Unsubscribe {
  cb(loadAbastecimentos(uid))
  return () => {}
}

export async function addAbastecimento(
  uid: string,
  data: Omit<Abastecimento, 'id' | 'userId' | 'criadoEm'>
): Promise<Abastecimento> {
  const created: Abastecimento = {
    ...data,
    id: crypto.randomUUID(),
    userId: uid,
    criadoEm: Date.now(),
  }
  saveAbastecimentos(uid, [created, ...loadAbastecimentos(uid)])
  return created
}

export async function deleteAbastecimento(uid: string, id: string): Promise<void> {
  saveAbastecimentos(uid, loadAbastecimentos(uid).filter((item) => item.id !== id))
}
