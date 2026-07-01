import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check, Lock, LogOut, CloudUpload, CloudDownload, RefreshCw, Clock, Sparkles, CalendarClock, Building2, ToggleLeft, ToggleRight } from 'lucide-react'
import { getUsageInfo, formatResetDate, isEmpresaAIDisabled, setEmpresaAIDisabled } from '@/lib/aiUsage'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import toast from 'react-hot-toast'
import { PageTransition } from '@/components/layout/PageTransition'
import { Avatar } from '@/components/ui'
import { useStore } from '@/lib/store'
import { auth } from '@/lib/firebase'
import type { PlanoTier } from '@/lib/types'
import {
  getDriveToken,
  uploadToDrive,
  downloadFromDrive,
  applyBackupToLocalStorage,
  createBackupPayload,
  recordBackupTimestamp,
  DRIVE_BACKUP_KEY,
  DRIVE_BACKUP_TS_KEY,
  AUTO_BACKUP_KEY,
} from '@/lib/driveBackup'

type AutoFreq = 'off' | 'weekly' | 'monthly'

const FREQ_LABELS: Record<AutoFreq, string> = {
  off: 'Desativado',
  weekly: 'Semanal',
  monthly: 'Mensal',
}

const FREQ_MS: Record<Exclude<AutoFreq, 'off'>, number> = {
  weekly:  7  * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
}

function freqAvailable(freq: AutoFreq, plano: PlanoTier): boolean {
  if (freq === 'off') return true
  if (plano === 'FROTA' || plano === 'EMPRESARIAL') return true
  if (plano === 'LITE') return freq === 'weekly' || freq === 'monthly'
  return freq === 'monthly'
}


const PLAN_FEATURES = {
  FREE: [
    { label: '1 veiculo', locked: false },
    { label: '5 avisos ativos', locked: false },
    { label: 'Historico basico de abastecimento', locked: false },
    { label: 'Lembretes simples', locked: false },
    { label: 'Recursos pessoais no plano Pessoal', locked: true },
  ],
  LITE: [
    { label: 'Ate 5 veiculos', locked: false },
    { label: '15 avisos ativos', locked: false },
    { label: 'Zellu AI 30 consultas/mes', locked: false },
    { label: 'Relatorios por veiculo', locked: false },
    { label: 'Pneus e pecas', locked: false },
    { label: 'Backup no Google Drive', locked: false },
  ],
  FROTA: [
    { label: 'Ate 50 veiculos', locked: false },
    { label: '50 avisos ativos', locked: false },
    { label: 'Visao geral da frota', locked: false },
    { label: 'Viagens com notas', locked: false },
    { label: 'Estoque e custos da frota', locked: false },
    { label: 'Zellu AI 150 consultas/mes', locked: false },
  ],
  EMPRESARIAL: [
    { label: 'Ate 200 veiculos', locked: false },
    { label: 'Avisos ilimitados', locked: false },
    { label: 'Abastecimentos ilimitados', locked: false },
    { label: 'Zellu AI 500 consultas/mes', locked: false },
    { label: 'Recursos para equipe e parceiros', locked: false },
    { label: 'Suporte comercial', locked: false },
  ],
}

function planLabel(plano: PlanoTier): string {
  if (plano === 'LITE') return 'Plano Pessoal'
  if (plano === 'FROTA') return 'Plano Frota'
  if (plano === 'EMPRESARIAL') return 'Plano Empresarial'
  return 'Plano Gratuito'
}

function PlanBadge({ plano }: { plano: PlanoTier }) {
  if (plano === 'EMPRESARIAL') {
    return (
      <span
        className="text-xs font-semibold px-3 py-1 rounded-full text-white flex items-center gap-1"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
      >
        <Building2 size={11} />
        Empresarial
      </span>
    )
  }
  if (plano === 'FROTA') {
    return (
      <span
        className="text-xs font-semibold px-3 py-1 rounded-full text-white"
        style={{ background: 'linear-gradient(135deg, #4f8df7, #60a5fa)' }}
      >
        Plano Frota
      </span>
    )
  }
  if (plano === 'LITE') {
    return (
      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#4f8df7]/15 text-[#4f8df7]">
        Plano Pessoal
      </span>
    )
  }
  return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#8892a4]/15 text-[#8892a4]">
      Plano Gratuito
    </span>
  )
}

export default function ProfileScreen() {
  const navigate = useNavigate()
  const { user, veiculos, lembretes, abastecimentos, setUser, setVeiculos, setLembretes, setAbastecimentos } = useStore()

  const [empresaAIOff, setEmpresaAIOff] = useState(() => isEmpresaAIDisabled())
  const [backupLoading, setBackupLoading] = useState(false)
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [lastBackup, setLastBackup] = useState<string | null>(
    () => localStorage.getItem(DRIVE_BACKUP_KEY),
  )
  const [autoFreq, setAutoFreq] = useState<AutoFreq>(
    () => (localStorage.getItem(AUTO_BACKUP_KEY) as AutoFreq) ?? 'off',
  )

  function handleAutoFreqChange(freq: AutoFreq) {
    if (!freqAvailable(freq, plano)) return
    setAutoFreq(freq)
    localStorage.setItem(AUTO_BACKUP_KEY, freq)
    if (freq !== 'off') toast.success(`Backup automÃ¡tico ${FREQ_LABELS[freq].toLowerCase()} ativado.`)
  }

  // Dispara backup automÃ¡tico se o intervalo passou
  useEffect(() => {
    if (autoFreq === 'off') return
    const lastTs = Number(localStorage.getItem(DRIVE_BACKUP_TS_KEY) ?? 0)
    const elapsed = Date.now() - lastTs
    if (elapsed < FREQ_MS[autoFreq]) return
    toast(
      (t) => (
        <div className="flex items-center gap-3">
          <span className="text-sm">Hora do backup {FREQ_LABELS[autoFreq].toLowerCase()}!</span>
          <button
            className="text-xs font-semibold text-[#60a5fa]"
            onClick={() => { toast.dismiss(t.id); handleBackup() }}
          >
            Fazer agora
          </button>
        </div>
      ),
      { duration: 8000, icon: 'â˜ï¸' },
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleBackup() {
    setBackupLoading(true)
    try {
      const token = await getDriveToken()
      await uploadToDrive(token, createBackupPayload(user!.uid, { veiculos, lembretes, abastecimentos }))
      setLastBackup(recordBackupTimestamp())
      toast.success('Backup salvo no Google Drive!')
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') toast.error('Popup fechado. Tente novamente.')
      else toast.error(err?.message ?? 'Erro ao fazer backup.')
    } finally {
      setBackupLoading(false)
    }
  }

  async function handleRestore() {
    setRestoreLoading(true)
    try {
      const token = await getDriveToken()
      const payload = await downloadFromDrive(token)
      const totalEstoque = (payload.estoque?.length ?? 0) + (payload.pecasItens?.length ?? 0)
      if (!window.confirm(
        `Restaurar ${payload.veiculos?.length ?? 0} veiculo(s), ` +
        `${payload.lembretes?.length ?? 0} lembrete(s), ` +
        `${payload.abastecimentos?.length ?? 0} abastecimento(s), ` +
        `${payload.pneus?.length ?? 0} pneu(s), ` +
        `${totalEstoque} item(ns) de estoque e ` +
        `${payload.viagens?.length ?? 0} viagem(ns)?`,
      )) return
      applyBackupToLocalStorage(user!.uid, payload)
      setVeiculos(payload.veiculos ?? [])
      setLembretes(payload.lembretes ?? [])
      setAbastecimentos(payload.abastecimentos ?? [])
      toast.success('Dados restaurados com sucesso!')
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') toast.error('Popup fechado. Tente novamente.')
      else toast.error(err?.message ?? 'Erro ao restaurar backup.')
    } finally {
      setRestoreLoading(false)
    }
  }

  const plano: PlanoTier = user?.plano ?? 'FREE'
  const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? 'UsuÃ¡rio'
  const email = user?.email ?? ''

  async function handleSignOut() {
    if (!window.confirm('Deseja sair da sua conta?')) return
    try {
      await signOut(auth)
      setUser(null)
      setVeiculos([])
      setLembretes([])
      setAbastecimentos([])
      navigate('/auth')
    } catch {
      toast.error('Erro ao sair. Tente novamente.')
    }
  }

  return (
    <PageTransition>
      <div className="min-h-full bg-[#070c14] pb-10">
        <div className="mx-auto w-full max-w-lg px-4">

          {/* Hero */}
          <div className="py-8 text-center">
            <Avatar
              name={displayName}
              src={user?.photoURL ?? undefined}
              size="lg"
              className="w-32 h-32 text-4xl mx-auto"
            />
            <p className="text-xl font-bold text-[#f0f4ff] mt-4">{displayName}</p>
            <p className="text-[#8892a4] text-sm mt-1">{email}</p>
            <div className="mt-3 flex justify-center">
              <PlanBadge plano={plano} />
            </div>
          </div>

          {/* Plan card */}
          <div
            className={`rounded-2xl p-4 mb-4 ${
              plano !== 'FREE'
                ? 'bg-white/5 border border-white/10'
                : 'bg-[#131e33] border border-[#1e2d44]'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-[#f0f4ff] text-sm">{planLabel(plano)}</p>
              {plano === 'FREE' && (
                <button
                  onClick={() => toast('Em breve!')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white"
                  style={{ background: 'linear-gradient(135deg, #4f8df7, #60a5fa)' }}
                >
                  Upgrade para Pessoal
                </button>
              )}
            </div>
            <ul className="space-y-2">
              {PLAN_FEATURES[plano].map((f) => (
                <li key={f.label} className="flex items-center gap-2">
                  {f.locked ? (
                    <Lock size={13} className="text-[#8892a4] flex-shrink-0" />
                  ) : (
                    <Check size={13} className="text-[#4f8df7] flex-shrink-0" />
                  )}
                  <span className={`text-sm ${f.locked ? 'text-[#8892a4]' : 'text-[#f0f4ff]'}`}>
                    {f.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* AI Usage */}
          {plano !== 'FREE' && user && (() => {
            const usage = getUsageInfo(user.uid, plano)
            const barColor = usage.percentage >= 90 ? '#ef4444' : usage.percentage >= 70 ? '#f59e0b' : '#4f8df7'
            return (
              <div className="bg-[#131e33] border border-[#1e2d44] rounded-2xl px-4 py-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles size={15} className="text-[#4f8df7]" />
                    <p className="text-sm font-semibold text-[#f0f4ff]">Zellu AI</p>
                  </div>
                  <span className="text-xs font-bold" style={{ color: barColor }}>
                    {usage.count} / {usage.limit}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-[#1e2d44] overflow-hidden mb-3">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: barColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${usage.percentage}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-[#8892a4]">
                    {usage.remaining > 0
                      ? `${usage.remaining} consulta${usage.remaining !== 1 ? 's' : ''} restante${usage.remaining !== 1 ? 's' : ''}`
                      : <span className="text-red-400 font-semibold">Limite atingido</span>
                    }
                  </p>
                  <div className="flex items-center gap-1 text-[11px] text-[#8892a4]">
                    <CalendarClock size={11} />
                    <span>Renova em {formatResetDate(usage.resetAt)}</span>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Empresarial admin panel */}
          {plano === 'EMPRESARIAL' && (
            <>
              <p className="text-xs font-semibold text-[#8892a4] uppercase tracking-wider mb-2 px-1 mt-4">
                AdministraÃ§Ã£o
              </p>
              <div className="bg-[#131e33] border border-[#7c3aed]/30 rounded-2xl px-4 py-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 size={15} className="text-[#a855f7]" />
                  <p className="text-sm font-semibold text-[#f0f4ff]">Controle de acesso</p>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#f0f4ff] font-medium">Zellu AI</p>
                    <p className="text-xs text-[#8892a4] mt-0.5">
                      {empresaAIOff ? 'Desativada para todos os usuÃ¡rios' : 'Ativa para todos os usuÃ¡rios'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const next = !empresaAIOff
                      setEmpresaAIDisabled(next)
                      setEmpresaAIOff(next)
                      toast(next ? 'IA desativada para todos.' : 'IA reativada para todos.', { icon: next ? 'ðŸ”’' : 'âœ…' })
                    }}
                    className="flex-shrink-0 transition-transform active:scale-95"
                    aria-label="Alternar acesso Ã  IA"
                  >
                    {empresaAIOff
                      ? <ToggleLeft size={36} className="text-[#8892a4]" />
                      : <ToggleRight size={36} className="text-[#a855f7]" />
                    }
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Conta */}
          <p className="text-xs font-semibold text-[#8892a4] uppercase tracking-wider mb-2 px-1">
            Conta
          </p>

          <div className="bg-[#131e33] border border-[#1e2d44] rounded-2xl px-4 py-4 mb-2">
            <p className="text-xs text-[#8892a4] mb-1">E-mail</p>
            <p className="text-[#f0f4ff] text-sm font-medium">{email || 'â€”'}</p>
          </div>

          {/* Backup */}
          <p className="text-xs font-semibold text-[#8892a4] uppercase tracking-wider mb-2 mt-4 px-1">
            Backup
          </p>

          <div className="bg-[#131e33] border border-[#1e2d44] rounded-2xl px-4 pt-4 pb-3 mb-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/5">
                <svg viewBox="0 0 87.3 78" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L28.95 50H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                  <path d="M43.65 25L29.45 0c-1.35.8-2.5 1.9-3.3 3.3L1.2 45.5A9.06 9.06 0 000 50h28.95z" fill="#00ac47"/>
                  <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L86.1 54.5c.8-1.4 1.2-2.95 1.2-4.5H58.37l6.28 12.35z" fill="#ea4335"/>
                  <path d="M43.65 25L57.85 0H29.45z" fill="#00832d"/>
                  <path d="M58.37 50H87.3c0-1.55-.4-3.1-1.2-4.5L73.55 23.2l-15.18 26.8z" fill="#2684fc"/>
                  <path d="M28.95 50L13.8 76.8c1.35.8 2.9 1.2 4.45 1.2h50.8c1.55 0 3.1-.4 4.45-1.2L58.37 50z" fill="#ffba00"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[#f0f4ff]">Google Drive</p>
                <p className="text-[11px] text-[#8892a4]">
                  {lastBackup ? `Ãšltimo backup: ${lastBackup}` : 'Nenhum backup realizado'}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleBackup}
                disabled={backupLoading || restoreLoading}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#1a2d48] border border-[#263650] py-2.5 text-sm font-semibold text-[#60a5fa] hover:bg-[#1e3455] active:scale-95 transition-all disabled:opacity-50"
              >
                {backupLoading ? <RefreshCw size={15} className="animate-spin" /> : <CloudUpload size={15} />}
                Fazer backup
              </button>
              <button
                onClick={handleRestore}
                disabled={backupLoading || restoreLoading}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#1a2d48] border border-[#263650] py-2.5 text-sm font-semibold text-[#8892a4] hover:bg-[#1e3455] active:scale-95 transition-all disabled:opacity-50"
              >
                {restoreLoading ? <RefreshCw size={15} className="animate-spin" /> : <CloudDownload size={15} />}
                Restaurar
              </button>
            </div>

            {/* Backup automÃ¡tico */}
            <div className="mt-4 pt-3 border-t border-[#1e2d44]">
              <div className="flex items-center gap-2 mb-2.5">
                <Clock size={13} className="text-[#8892a4]" />
                <span className="text-xs font-semibold text-[#8892a4] uppercase tracking-wider">Backup automÃ¡tico</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['off', 'weekly', 'monthly'] as AutoFreq[]).map((freq) => {
                  const available = freqAvailable(freq, plano)
                  const active = autoFreq === freq
                  return (
                    <button
                      key={freq}
                      onClick={() => available && handleAutoFreqChange(freq)}
                      className={`relative flex flex-col items-center justify-center rounded-xl py-2.5 px-1 text-xs font-semibold border transition-all
                        ${active
                          ? 'border-[#4f8df7] bg-[#4f8df7]/15 text-[#70a7ff]'
                          : available
                            ? 'border-[#263650] bg-[#0e1928] text-[#8892a4] hover:border-[#4f8df7]/40'
                            : 'border-[#1a2540] bg-[#0a1220] text-[#3a4a60] cursor-not-allowed'
                        }`}
                    >
                      {!available && (
                        <Lock size={9} className="absolute top-1.5 right-1.5 text-[#3a4a60]" />
                      )}
                      {FREQ_LABELS[freq]}
                    </button>
                  )
                })}
              </div>
              <p className="text-[10px] text-[#4a5a70] mt-2 leading-relaxed">
                {plano === 'FREE'
                  ? 'FREE: apenas mensal. Pessoal: semanal ou mensal. Frota: sem restriÃ§Ãµes.'
                  : plano === 'LITE'
                    ? 'Pessoal: backup semanal ou mensal disponÃ­veis.'
                    : 'Frota: backup semanal ou mensal.'}
              </p>
            </div>

            <p className="text-[10px] text-[#4a5a70] mt-3 text-center leading-relaxed">
              Salva veÃ­culos, lembretes e abastecimentos na sua conta Google.
            </p>
          </div>

          {/* Sair */}
          <motion.button
            onClick={handleSignOut}
            whileTap={{ scale: 0.98 }}
            className="w-full mt-2 bg-[#131e33] border border-[#1e2d44] rounded-2xl px-4 py-4 flex items-center gap-3 text-left"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-500/10">
              <LogOut size={16} className="text-red-400" />
            </div>
            <span className="font-medium text-sm text-red-400">Sair</span>
          </motion.button>

        </div>
      </div>
    </PageTransition>
  )
}
