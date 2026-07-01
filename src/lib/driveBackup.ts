import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import type {
  Veiculo,
  Lembrete,
  Abastecimento,
  RegistroPneu,
  ItemEstoque,
  MovimentacaoEstoque,
  RegistroRota,
  RegistroViagem,
} from '@/lib/types'

export const DRIVE_BACKUP_KEY    = 'zellu_drive_last_backup'
export const DRIVE_BACKUP_TS_KEY = 'zellu_drive_last_backup_ts'
export const AUTO_BACKUP_KEY     = 'zellu_auto_backup'

const BACKUP_FILENAME     = 'zellu-backup.json'
const DRIVE_APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata'

export interface BackupPayload {
  veiculos:       Veiculo[]
  lembretes:      Lembrete[]
  abastecimentos: Abastecimento[]
  pneus?:         RegistroPneu[]
  estoque?:       ItemEstoque[]
  pecasItens?:    ItemEstoque[]
  pecasMovs?:     MovimentacaoEstoque[]
  rotas?:         RegistroRota[]
  viagens?:       RegistroViagem[]
  exportedAt:     string
}

function readLocalArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

export function createBackupPayload(
  uid: string,
  base: Pick<BackupPayload, 'veiculos' | 'lembretes' | 'abastecimentos'>,
): BackupPayload {
  const viagens = readLocalArray<RegistroViagem>(`zellu_viagens_${uid}`).map((viagem) => ({
    ...viagem,
    gastos: (viagem.gastos ?? []).map(({ notaImagem: _notaImagem, ...gasto }) => gasto),
  }))

  return {
    ...base,
    pneus: readLocalArray<RegistroPneu>(`zellu_pneus_${uid}`),
    estoque: readLocalArray<ItemEstoque>(`zellu_estoque_${uid}`),
    pecasItens: readLocalArray<ItemEstoque>(`zellu_pecas_itens_${uid}`),
    pecasMovs: readLocalArray<MovimentacaoEstoque>(`zellu_pecas_movs_${uid}`),
    rotas: readLocalArray<RegistroRota>(`zellu_rotas_${uid}`),
    viagens,
    exportedAt: new Date().toISOString(),
  }
}

export async function getDriveToken(): Promise<string> {
  const provider = new GoogleAuthProvider()
  provider.addScope(DRIVE_APPDATA_SCOPE)
  const result = await signInWithPopup(auth, provider)
  const credential = GoogleAuthProvider.credentialFromResult(result)
  if (!credential?.accessToken) throw new Error('Sem token de acesso ao Drive.')
  return credential.accessToken
}

export async function uploadToDrive(token: string, payload: BackupPayload): Promise<void> {
  const data = JSON.stringify(payload, null, 2)
  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D%27${BACKUP_FILENAME}%27&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const listJson = await listRes.json()
  const existingId: string | undefined = listJson.files?.[0]?.id

  if (existingId) {
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: data,
      },
    )
    if (!res.ok) throw new Error('Falha ao atualizar backup no Drive.')
  } else {
    const metadata = { name: BACKUP_FILENAME, parents: ['appDataFolder'], mimeType: 'application/json' }
    const form = new FormData()
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    form.append('file', new Blob([data], { type: 'application/json' }))
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form },
    )
    if (!res.ok) throw new Error('Falha ao criar backup no Drive.')
  }
}

export async function downloadFromDrive(token: string): Promise<BackupPayload> {
  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D%27${BACKUP_FILENAME}%27&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const listJson = await listRes.json()
  const file = listJson.files?.[0]
  if (!file) throw new Error('Nenhum backup encontrado no Drive.')

  const dlRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!dlRes.ok) throw new Error('Falha ao baixar backup do Drive.')

  const parsed = await dlRes.json()
  if (!parsed.veiculos && !parsed.lembretes && !parsed.abastecimentos) {
    throw new Error('Backup inválido ou corrompido.')
  }
  return parsed as BackupPayload
}

// Escreve o payload de volta no localStorage (mesmo esquema do db.ts)
export function applyBackupToLocalStorage(uid: string, payload: BackupPayload): void {
  localStorage.setItem(`zellu_veiculos_${uid}`,       JSON.stringify(payload.veiculos       ?? []))
  localStorage.setItem(`zellu_lembretes_${uid}`,      JSON.stringify(payload.lembretes      ?? []))
  localStorage.setItem(`zellu_abastecimentos_${uid}`, JSON.stringify(payload.abastecimentos ?? []))
  localStorage.setItem(`zellu_pneus_${uid}`,          JSON.stringify(payload.pneus         ?? []))
  localStorage.setItem(`zellu_estoque_${uid}`,        JSON.stringify(payload.estoque       ?? []))
  localStorage.setItem(`zellu_pecas_itens_${uid}`,    JSON.stringify(payload.pecasItens    ?? []))
  localStorage.setItem(`zellu_pecas_movs_${uid}`,     JSON.stringify(payload.pecasMovs     ?? []))
  localStorage.setItem(`zellu_rotas_${uid}`,          JSON.stringify(payload.rotas         ?? []))
  localStorage.setItem(`zellu_viagens_${uid}`,        JSON.stringify(payload.viagens       ?? []))
}

export function recordBackupTimestamp(): string {
  const now = new Date().toLocaleString('pt-BR')
  localStorage.setItem(DRIVE_BACKUP_KEY,    now)
  localStorage.setItem(DRIVE_BACKUP_TS_KEY, String(Date.now()))
  return now
}

export function hasLocalData(uid: string): boolean {
  const keys = [
    `zellu_veiculos_${uid}`,
    `zellu_lembretes_${uid}`,
    `zellu_abastecimentos_${uid}`,
    `zellu_pneus_${uid}`,
    `zellu_estoque_${uid}`,
    `zellu_pecas_itens_${uid}`,
    `zellu_pecas_movs_${uid}`,
    `zellu_rotas_${uid}`,
    `zellu_viagens_${uid}`,
  ]
  return keys.some((key) => readLocalArray<unknown>(key).length > 0)
}
