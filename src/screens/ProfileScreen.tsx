import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, Settings, LogOut, Download, Info, Check, Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import toast from 'react-hot-toast'
import { PageTransition } from '@/components/layout/PageTransition'
import { Avatar } from '@/components/ui'
import { useStore } from '@/lib/store'
import { auth } from '@/lib/firebase'
import type { PlanoTier } from '@/lib/types'

const PLAN_FEATURES = {
  FREE: [
    { label: 'Até 1 veículo', locked: false },
    { label: 'Lembretes básicos', locked: false },
    { label: 'Histórico de 30 dias', locked: false },
    { label: 'Múltiplos veículos', locked: true },
    { label: 'Zellu AI', locked: true },
  ],
  LITE: [
    { label: 'Até 5 veículos', locked: false },
    { label: 'Lembretes ilimitados', locked: false },
    { label: 'Zellu AI', locked: false },
    { label: 'Histórico completo', locked: false },
    { label: 'Exportar dados', locked: false },
  ],
  FROTA: [
    { label: 'Veículos ilimitados', locked: false },
    { label: 'Gestão de frota', locked: false },
    { label: 'Zellu AI', locked: false },
    { label: 'Relatórios avançados', locked: false },
    { label: 'Suporte prioritário', locked: false },
  ],
}

function planLabel(plano: PlanoTier): string {
  if (plano === 'LITE') return 'Plano Lite'
  if (plano === 'FROTA') return 'Plano Frota'
  return 'Plano Gratuito'
}

function PlanBadge({ plano }: { plano: PlanoTier }) {
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
        Plano Lite
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
  const { user, setUser, setVeiculos, setLembretes, setAbastecimentos } = useStore()
  const [showAboutModal, setShowAboutModal] = useState(false)

  const plano: PlanoTier = user?.plano ?? 'FREE'
  const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? 'Usuário'
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

  function handleExportData() {
    toast('Use a seção de Configurações para exportar seus dados.')
    navigate('/configuracoes')
  }

  const menuItems = [
    {
      icon: '🔧',
      iconBg: '#4f8df7',
      label: 'Configurações',
      onPress: () => navigate('/configuracoes'),
    },
    {
      icon: '💾',
      iconBg: '#22c55e',
      label: 'Backup e dados',
      onPress: handleExportData,
    },
    {
      icon: 'ℹ️',
      iconBg: '#60a5fa',
      label: 'Sobre o Zellu',
      onPress: () => setShowAboutModal(true),
    },
    {
      icon: '🚪',
      iconBg: '#ef4444',
      label: 'Sair',
      onPress: handleSignOut,
      danger: true,
    },
  ]

  return (
    <PageTransition>
      <div className="min-h-full bg-[#070c14] pb-6">
        <div className="mx-auto w-full max-w-xl">
        {/* Hero */}
        <div className="py-8 px-4 text-center">
          <Avatar
            name={displayName}
            src={user?.photoURL ?? undefined}
            size="lg"
            className="w-20 h-20 text-2xl mx-auto"
          />
          <p className="text-xl font-bold text-[#f0f4ff] mt-4">{displayName}</p>
          <p className="text-[#8892a4] text-sm mt-1">{email}</p>
          <div className="mt-3 flex justify-center">
            <PlanBadge plano={plano} />
          </div>
        </div>

        {/* Plan card */}
        <div className="mx-4 mb-4">
          <div
            className={`rounded-2xl p-4 ${
              plano !== 'FREE'
                ? 'bg-white/5 backdrop-blur-xl border border-white/10'
                : 'bg-[#131e33] border border-[#1e2d44]'
            }`}
            style={
              plano !== 'FREE'
                ? { borderImage: 'linear-gradient(135deg, #4f8df7, #60a5fa) 1' }
                : undefined
            }
          >
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-[#f0f4ff] text-sm">
                {planLabel(plano)}
              </p>
              {plano === 'FREE' && (
                <button
                  onClick={() => toast('Em breve!')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl text-white"
                  style={{
                    background: 'linear-gradient(135deg, #4f8df7, #60a5fa)',
                  }}
                >
                  Upgrade para Lite
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
                  <span
                    className={`text-sm ${
                      f.locked ? 'text-[#8892a4]' : 'text-[#f0f4ff]'
                    }`}
                  >
                    {f.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Menu list */}
        <div className="px-4 flex flex-col gap-2">
          {menuItems.map((item) => (
            <motion.button
              key={item.label}
              onClick={item.onPress}
              whileTap={{ scale: 0.98 }}
              className="bg-[#131e33] border border-[#1e2d44] rounded-2xl px-4 py-4 flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                  style={{ backgroundColor: item.iconBg + '22' }}
                >
                  {item.icon}
                </div>
                <span
                  className={`font-medium text-sm ${
                    item.danger ? 'text-red-400' : 'text-[#f0f4ff]'
                  }`}
                >
                  {item.label}
                </span>
              </div>
              <ChevronRight
                size={16}
                className={item.danger ? 'text-red-400/50' : 'text-[#8892a4]'}
              />
            </motion.button>
          ))}
        </div>
        </div>
      </div>

      {/* About modal */}
      {showAboutModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end"
          onClick={() => setShowAboutModal(false)}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="mx-auto w-full max-w-xl rounded-t-3xl bg-[#0d1526] px-6 pb-10 pt-4"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }}
          >
            <div className="w-10 h-1 bg-[#1e2d44] rounded-full mx-auto mb-6" />
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, #4f8df7, #60a5fa)' }}
              >
                🚗
              </div>
              <p className="text-[#f0f4ff] font-bold text-xl">Zellu</p>
              <p className="text-[#8892a4] text-sm mt-1">Versão 1.0.0</p>
              <p className="text-[#8892a4] text-sm mt-4 leading-relaxed">
                Desenvolvido com ❤️ para simplificar a gestão dos seus veículos.
              </p>
              <p className="text-[#8892a4] text-xs mt-2">
                © 2024 Zellu. Todos os direitos reservados.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </PageTransition>
  )
}
