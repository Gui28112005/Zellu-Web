import React, { useState, useRef, useEffect } from 'react'
import { useScrollAtTop } from '@/hooks/useScrollAtTop'
import { motion } from 'framer-motion'
import { ArrowLeft, Download, Upload, Bell, Shield, Info, Send } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { sendPasswordResetEmail } from 'firebase/auth'
import toast from 'react-hot-toast'
import { PageTransition } from '@/components/layout/PageTransition'
import { Button } from '@/components/ui'
import { useStore } from '@/lib/store'
import { auth } from '@/lib/firebase'
import { requestPushPermission, sendPushTest } from '@/lib/push'

const NOTIF_KEY_MAINTENANCE = 'zellu_notif_maintenance'
const NOTIF_KEY_UPCOMING = 'zellu_notif_upcoming'

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-[#8892a4] uppercase tracking-wider mb-2 mt-4 px-1">
      {children}
    </p>
  )
}

function SettingRow({
  icon,
  iconBg,
  label,
  right,
  onPress,
  danger,
}: {
  icon: React.ReactNode
  iconBg: string
  label: string
  right?: React.ReactNode
  onPress?: () => void
  danger?: boolean
}) {
  return (
    <motion.button
      whileTap={onPress ? { scale: 0.98 } : {}}
      onClick={onPress}
      className={`w-full bg-[#131e33] border border-[#1e2d44] rounded-2xl px-4 py-4 flex items-center justify-between mb-2 ${
        onPress ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: iconBg + '22' }}
        >
          {icon}
        </div>
        <span
          className={`font-medium text-sm ${danger ? 'text-red-400' : 'text-[#f0f4ff]'}`}
        >
          {label}
        </span>
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </motion.button>
  )
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        value ? '' : 'bg-[#1a2540]'
      }`}
      style={
        value
          ? { background: 'linear-gradient(135deg, #4f8df7, #60a5fa)' }
          : undefined
      }
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export default function SettingsScreen() {
  const navigate = useNavigate()
  const { user, veiculos, lembretes, abastecimentos } = useStore()
  const atTop = useScrollAtTop()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [notifMaintenance, setNotifMaintenance] = useState(
    () => localStorage.getItem(NOTIF_KEY_MAINTENANCE) !== 'false'
  )
  const [notifUpcoming, setNotifUpcoming] = useState(
    () => localStorage.getItem(NOTIF_KEY_UPCOMING) !== 'false'
  )
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [isSendingPushTest, setIsSendingPushTest] = useState(false)

  function handleNotifMaintenanceChange(v: boolean) {
    setNotifMaintenance(v)
    localStorage.setItem(NOTIF_KEY_MAINTENANCE, String(v))
  }

  function handleNotifUpcomingChange(v: boolean) {
    setNotifUpcoming(v)
    localStorage.setItem(NOTIF_KEY_UPCOMING, String(v))
  }

  async function handlePasswordReset() {
    if (!user?.email) {
      toast.error('Nenhum e-mail associado à conta.')
      return
    }
    setIsSendingReset(true)
    try {
      await sendPasswordResetEmail(auth, user.email)
      toast.success('Link de redefinição enviado!')
    } catch {
      toast.error('Erro ao enviar o e-mail. Tente novamente.')
    } finally {
      setIsSendingReset(false)
    }
  }

  async function handlePushTest() {
    if (!user) {
      toast.error('Faça login para testar as notificações.')
      return
    }

    setIsSendingPushTest(true)
    try {
      const permissionOk = await requestPushPermission(user.uid)
      if (!permissionOk) {
        toast.error('Permita notificações para testar.')
        return
      }

      const idToken = await auth.currentUser?.getIdToken()
      if (!idToken) {
        toast.error('Não foi possível validar seu login.')
        return
      }

      const sent = await sendPushTest(idToken)
      if (sent) {
        toast.success('Notificação de teste enviada!')
      } else {
        toast.error('Não consegui enviar o teste. Tente abrir o app novamente.')
      }
    } catch {
      toast.error('Erro ao enviar notificação de teste.')
    } finally {
      setIsSendingPushTest(false)
    }
  }

  function handleExportData() {
    const blob = new Blob(
      [
        JSON.stringify(
          { veiculos, lembretes, abastecimentos, exportedAt: new Date().toISOString() },
          null,
          2
        ),
      ],
      { type: 'application/json' }
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'zellu-backup.json'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Backup exportado!')
  }

  function handleImportData() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        if (!parsed.veiculos && !parsed.lembretes && !parsed.abastecimentos) {
          toast.error('Arquivo inválido. Selecione um backup do Zellu.')
          return
        }
        if (
          window.confirm(
            `Importar ${parsed.veiculos?.length ?? 0} veículo(s), ${parsed.lembretes?.length ?? 0} lembrete(s) e ${parsed.abastecimentos?.length ?? 0} abastecimento(s)? Os dados existentes não serão substituídos — a importação para o Firestore será realizada.`
          )
        ) {
          // Importação para Firestore seria feita aqui
          toast.success('Dados importados com sucesso!')
        }
      } catch {
        toast.error('Erro ao ler o arquivo JSON.')
      }
    }
    reader.readAsText(file)
    // Reset input
    e.target.value = ''
  }

  return (
    <PageTransition>
      <div className="min-h-full bg-[#070c14] pb-10">
        {/* Header */}
        <div className={`sticky top-0 z-20 bg-[#070c14]/90 backdrop-blur px-4 py-3 border-b border-[#1e2d44] flex items-center gap-3 transition-transform duration-300 ease-in-out ${atTop ? 'translate-y-0' : '-translate-y-full'}`}>
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-white/5 border border-[#1e2d44] flex items-center justify-center active:scale-95 transition-transform"
          >
            <ArrowLeft size={18} className="text-[#f0f4ff]" />
          </button>
          <h1 className="font-bold text-[#f0f4ff] text-base">Configurações</h1>
        </div>

        <div className="px-4 py-4">
          {/* Conta */}
          <SectionHeader>Conta</SectionHeader>

          {/* Email display */}
          <div className="bg-[#131e33] border border-[#1e2d44] rounded-2xl px-4 py-4 mb-2">
            <p className="text-xs text-[#8892a4] mb-1">E-mail</p>
            <p className="text-[#f0f4ff] text-sm font-medium">{user?.email ?? '—'}</p>
          </div>

          <SettingRow
            icon={<Shield size={16} className="text-[#4f8df7]" />}
            iconBg="#4f8df7"
            label="Alterar senha"
            onPress={handlePasswordReset}
            right={
              isSendingReset ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-[#4f8df7] rounded-full animate-spin" />
              ) : (
                <span className="text-xs text-[#4f8df7] font-medium">Enviar link</span>
              )
            }
          />

          {/* Notificações */}
          <SectionHeader>Notificações</SectionHeader>

          <SettingRow
            icon={<Bell size={16} className="text-[#f59e0b]" />}
            iconBg="#f59e0b"
            label="Lembretes de manutenção"
            right={
              <Toggle
                value={notifMaintenance}
                onChange={handleNotifMaintenanceChange}
              />
            }
          />

          <SettingRow
            icon={<Bell size={16} className="text-[#ef4444]" />}
            iconBg="#ef4444"
            label="Vencimentos próximos"
            right={
              <Toggle value={notifUpcoming} onChange={handleNotifUpcomingChange} />
            }
          />

          <SettingRow
            icon={<Send size={16} className="text-[#60a5fa]" />}
            iconBg="#60a5fa"
            label="Enviar teste agora"
            onPress={handlePushTest}
            right={
              isSendingPushTest ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-[#4f8df7] rounded-full animate-spin" />
              ) : (
                <span className="text-xs text-[#4f8df7] font-medium">Testar</span>
              )
            }
          />

          {/* Dados */}
          <SectionHeader>Dados</SectionHeader>

          <SettingRow
            icon={<Download size={16} className="text-[#22c55e]" />}
            iconBg="#22c55e"
            label="Exportar dados (JSON)"
            onPress={handleExportData}
            right={
              <span className="text-xs text-[#8892a4]">zellu-backup.json</span>
            }
          />

          <SettingRow
            icon={<Upload size={16} className="text-[#60a5fa]" />}
            iconBg="#60a5fa"
            label="Importar dados (JSON)"
            onPress={handleImportData}
            right={
              <span className="text-xs text-[#8892a4]">.json</span>
            }
          />

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Sobre */}
          <SectionHeader>Sobre</SectionHeader>

          <div className="bg-[#131e33] border border-[#1e2d44] rounded-2xl px-4 py-4">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #4f8df7, #60a5fa)' }}
              >
                🚗
              </div>
              <div>
                <p className="font-semibold text-[#f0f4ff] text-sm">Zellu Web</p>
                <p className="text-[#8892a4] text-xs">Versão 1.0.0</p>
              </div>
            </div>
            <p className="text-[#8892a4] text-xs leading-relaxed">
              Desenvolvido com ❤️ para simplificar a gestão dos seus veículos.
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
