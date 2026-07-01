import React, { useEffect } from 'react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Car,
  PlusCircle,
  ScrollText,
  ShieldCheck,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '@/lib/store'
import { Avatar } from '@/components/ui'

const tabs = [
  { label: 'Garagem',          icon: Car,       path: '/garagem' },
  { label: 'Zellu biblioteca', icon: BookOpen,  path: '/biblioteca' },
  { label: 'Beneficios',       icon: ShieldCheck, path: '/premium/beneficios' },
  { label: 'Cadastrar veiculo', icon: PlusCircle, path: null },
] as const

const legalTabs = [
  { label: 'Politica de privacidade', icon: ShieldCheck, path: '/politica-de-privacidade' },
  { label: 'Termos de uso', icon: ScrollText, path: '/termos-de-uso' },
] as const

interface SideNavProps {
  open: boolean
  onClose: () => void
}

export function SideNav({ open, onClose }: SideNavProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useStore((s) => s.user)
  const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? 'Usuario'
  const email = user?.email ?? ''

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  const isActive = (path: string) => {
    if (path === '/' || path === '/premium') return location.pathname === path
    return location.pathname.startsWith(path)
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.button
            type="button"
            aria-label="Fechar menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 h-full w-full bg-black/60 backdrop-blur-[2px]"
          />

          <motion.nav
            aria-label="Menu principal"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            className="relative flex h-full w-[min(82vw,300px)] flex-col border-r border-[#1e2d44] bg-[#0d1526] px-4 shadow-2xl shadow-black/50"
            style={{
              paddingTop: 'calc(env(safe-area-inset-top) + 16px)',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
            }}
          >
            <div className="mb-7 flex items-center justify-between px-2">
              <Link to="/perfil" onClick={onClose} className="flex min-w-0 items-center gap-3 rounded-2xl transition hover:opacity-90">
                <Avatar
                  name={displayName}
                  src={user?.photoURL ?? undefined}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#f0f4ff]">{displayName}</p>
                  {email && (
                    <p className="truncate text-xs text-[#8892a4]">{email}</p>
                  )}
                </div>
              </Link>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar menu"
                className="ml-2 flex h-10 w-10 flex-shrink-0 items-center justify-center text-[#8892a4] transition-colors hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <div className="flex flex-col gap-1">
              {tabs.map((tab) => {
                const active = tab.path !== null && isActive(tab.path)
                const Icon = tab.icon
                const isCadastrar = tab.path === null

                const itemClass = `relative flex min-h-14 items-center gap-4 rounded-2xl border px-4 transition-colors w-full text-left ${
                  active
                    ? 'border-[#4f8df7]/30 bg-[#4f8df7]/10 text-white'
                    : 'border-transparent text-[#aeb8ca] hover:bg-white/5 hover:text-white'
                }`

                const content = (
                  <>
                    <Icon
                      size={21}
                      strokeWidth={active ? 2.25 : 1.75}
                      className={active ? 'text-[#4f8df7]' : 'text-[#8892a4]'}
                    />
                    <span className="text-sm font-semibold">{tab.label}</span>
                    {active && (
                      <motion.span
                        layoutId="drawer-active"
                        className="absolute right-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-l-full bg-gradient-to-b from-[#4f8df7] to-[#60a5fa]"
                      />
                    )}
                  </>
                )

                if (isCadastrar) {
                  return (
                    <button
                      key="cadastrar"
                      type="button"
                      onClick={() => { onClose(); navigate('/garagem', { state: { openAdd: true } }) }}
                      className={itemClass}
                    >
                      {content}
                    </button>
                  )
                }

                return (
                  <Link key={tab.path} to={tab.path!} onClick={onClose} className={itemClass}>
                    {content}
                  </Link>
                )
              })}
              </div>

              <div className="mt-auto border-t border-[#1e2d44] pt-5">
                <p className="mb-2 px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#70809a]">
                  Legal
                </p>
                <div className="flex flex-col gap-1">
                  {legalTabs.map((tab) => {
                    const active = isActive(tab.path)
                    const Icon = tab.icon

                    return (
                      <Link
                        key={tab.path}
                        to={tab.path}
                        onClick={onClose}
                        className={`relative flex min-h-14 w-full items-center gap-4 rounded-2xl border px-4 text-left transition-colors ${
                          active
                            ? 'border-[#4f8df7]/30 bg-[#4f8df7]/10 text-white'
                            : 'border-transparent text-[#aeb8ca] hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <Icon
                          size={21}
                          strokeWidth={active ? 2.25 : 1.75}
                          className={active ? 'text-[#4f8df7]' : 'text-[#8892a4]'}
                        />
                        <span className="text-sm font-semibold">{tab.label}</span>
                        {active && (
                          <motion.span
                            layoutId="drawer-active"
                            className="absolute right-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-l-full bg-gradient-to-b from-[#4f8df7] to-[#60a5fa]"
                          />
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          </motion.nav>
        </div>
      )}
    </AnimatePresence>
  )
}

