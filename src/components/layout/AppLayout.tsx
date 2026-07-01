import React, { useCallback, useState } from 'react'
import { ArrowLeft, Menu, Crown, Check, X, Zap, Sparkles, Building2, ChevronRight, BookOpen, Car, PlusCircle, ScrollText, ShieldCheck, Home } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { SideNav } from './BottomNav'
import { InstallBanner } from '../ios/InstallBanner'
import { useStore } from '@/lib/store'
import { Avatar } from '@/components/ui'


const PLANOS = [
  {
    id: 'FREE',
    nome: 'Gratuito',
    preco: null,
    cor: '#8892a4',
    icon: <Zap size={18} />,
    recursos: [
      '1 veiculo',
      '5 avisos ativos',
      'Historico basico de abastecimento',
      'Lembretes simples',
    ],
  },
  {
    id: 'LITE',
    nome: 'Pessoal',
    preco: 'R$ 10,50',
    periodo: '/mes',
    cor: '#34d399',
    icon: <Sparkles size={18} />,
    recursos: [
      'Ate 5 veiculos',
      '15 avisos ativos',
      'Zellu AI 30 consultas/mes',
      'Relatorios por veiculo',
      'Pneus e pecas',
      'Backup no Google Drive',
    ],
  },
  {
    id: 'FROTA',
    nome: 'Frota',
    preco: 'R$ 29,90',
    periodo: '/mes',
    cor: '#4f8df7',
    destaque: true,
    icon: <Crown size={18} />,
    recursos: [
      'Tudo do Pessoal',
      'Ate 50 veiculos',
      '50 avisos ativos',
      'Visao geral da frota',
      'Exportacao de todos os relatorios',
      'Viagens com notas',
      'Estoque e custos da frota',
      'Zellu AI 150 consultas/mes',
    ],
  },
  {
    id: 'EMPRESARIAL',
    nome: 'Empresarial',
    preco: 'R$ 59,90',
    periodo: '/mes',
    cor: '#a78bfa',
    icon: <Building2 size={18} />,
    recursos: [
      'Tudo do Frota',
      'Ate 200 veiculos',
      'Avisos ilimitados',
      'Abastecimentos ilimitados',
      'Zellu AI 500 consultas/mes',
      'Recursos para equipe e parceiros',
      'Suporte comercial',
    ],
  },
]

const NAV_TABS = [
  { label: 'Garagem',           icon: Car,        path: '/garagem' },
  { label: 'Zellu biblioteca',  icon: BookOpen,   path: '/biblioteca' },
  { label: 'Beneficios',        icon: ShieldCheck, path: '/premium/beneficios' },
  { label: 'Cadastrar veiculo', icon: PlusCircle, path: null },
] as const

const LEGAL_TABS = [
  { label: 'Privacidade', icon: ShieldCheck, path: '/politica-de-privacidade' },
  { label: 'Termos de uso', icon: ScrollText, path: '/termos-de-uso' },
] as const

function DesktopSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useStore((s) => s.user)
  const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? 'Usuario'
  const email = user?.email ?? ''

  const lastVehicleId = localStorage.getItem('zellu:lastVehicleId')
  const homePath = lastVehicleId ? `/veiculo/${lastVehicleId}` : '/garagem'

  const isActive = (path: string) =>
    path === '/' || path === '/premium'
      ? location.pathname === path
      : location.pathname.startsWith(path)

  return (
    <aside className="hidden lg:flex h-full w-[260px] flex-shrink-0 flex-col border-r border-[#1e2d44] bg-[#0d1526] px-3 py-5">
      {/* Logo */}
      <div className="mb-6 px-3">
        <span className="text-xl font-bold text-[#f0f4ff] tracking-tight">Zellu</span>
      </div>

      {/* User */}
      <Link to="/perfil" className="mb-5 flex items-center gap-3 rounded-2xl border border-[#1e2d44] bg-white/[0.03] px-3 py-2.5 transition hover:border-[#4f8df7]/35 hover:bg-white/[0.06]">
        <Avatar name={displayName} src={user?.photoURL ?? undefined} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-[#f0f4ff]">{displayName}</p>
          {email && <p className="truncate text-[10px] text-[#8892a4]">{email}</p>}
        </div>
      </Link>

      {/* Nav items */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {/* Home - ultimo veiculo aberto */}
        <Link
          to={homePath}
          className={`relative flex h-11 w-full items-center gap-3 rounded-xl border px-3 text-sm font-medium transition-colors ${
            location.pathname === homePath
              ? 'border-[#4f8df7]/25 bg-[#4f8df7]/10 text-white'
              : 'border-transparent text-[#8892a4] hover:bg-white/5 hover:text-[#f0f4ff]'
          }`}
        >
          <Home size={18} strokeWidth={location.pathname === homePath ? 2.25 : 1.75} className={location.pathname === homePath ? 'text-[#4f8df7]' : ''} />
          Inicio
          {location.pathname === homePath && <span className="absolute right-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-l-full bg-[#4f8df7]" />}
        </Link>

        {NAV_TABS.map((tab) => {
          const active = tab.path !== null && isActive(tab.path)
          const Icon = tab.icon
          const cls = `relative flex h-11 w-full items-center gap-3 rounded-xl border px-3 text-sm font-medium transition-colors ${
            active
              ? 'border-[#4f8df7]/25 bg-[#4f8df7]/10 text-white'
              : 'border-transparent text-[#8892a4] hover:bg-white/5 hover:text-[#f0f4ff]'
          }`

          if (tab.path === null) {
            return (
              <button
                key="cadastrar"
                type="button"
                onClick={() => navigate('/garagem', { state: { openAdd: true } })}
                className={cls}
              >
                <Icon size={18} strokeWidth={active ? 2.25 : 1.75} className={active ? 'text-[#4f8df7]' : ''} />
                {tab.label}
                {active && <span className="absolute right-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-l-full bg-[#4f8df7]" />}
              </button>
            )
          }

          return (
            <Link key={tab.path} to={tab.path} className={cls}>
              <Icon size={18} strokeWidth={active ? 2.25 : 1.75} className={active ? 'text-[#4f8df7]' : ''} />
              {tab.label}
              {active && <span className="absolute right-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-l-full bg-[#4f8df7]" />}
            </Link>
          )
        })}

        <div className="mt-auto border-t border-[#1e2d44] pt-3 flex flex-col gap-1">
          {LEGAL_TABS.map((tab) => {
            const active = isActive(tab.path)
            const Icon = tab.icon
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex h-10 w-full items-center gap-3 rounded-xl border px-3 text-xs font-medium transition-colors ${
                  active
                    ? 'border-[#4f8df7]/25 bg-[#4f8df7]/10 text-white'
                    : 'border-transparent text-[#66758d] hover:bg-white/5 hover:text-[#8892a4]'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [premiumOpen, setPremiumOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const location = useLocation()
  const navigate = useNavigate()
  const user = useStore((s) => s.user)
  const isPremium = user?.plano === 'FROTA' || user?.plano === 'LITE' || user?.plano === 'EMPRESARIAL'

  const isVehicleHome = /^\/veiculo\/[^/]+$/.test(location.pathname)
  const isHome = location.pathname === '/' || isVehicleHome
const handleToolbarAction = () => {
    if (isHome) { setMenuOpen(true); return }
    if (location.pathname === '/premium' || location.pathname === '/premium/beneficios') { navigate('/'); return }
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  return (
    <div className="flex h-[100dvh] min-h-[100svh] overflow-hidden bg-[#070c14]">
      {/* Desktop sidebar â€” always visible on lg+ */}
      <DesktopSidebar />

      {/* Right area: header + content */}
      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
        <header className="relative flex h-[calc(env(safe-area-inset-top)+3.5rem)] flex-shrink-0 items-end border-b border-[#1e2d44]/80 bg-[#0d1526]/92 px-4 pb-2 shadow-lg shadow-black/10 backdrop-blur-xl">
          {/* Hamburger â€” mobile only */}
          <button
            type="button"
            onClick={handleToolbarAction}
            aria-label={isHome ? 'Abrir menu' : 'Voltar'}
            className="lg:hidden flex h-10 w-10 items-center justify-center text-[#aeb8ca] transition-colors hover:text-white active:scale-95"
          >
            {isHome ? <Menu size={21} /> : <ArrowLeft size={21} />}
          </button>

          {/* Back button â€” desktop, non-home */}
          {!isHome && (
            <button
              type="button"
              onClick={handleToolbarAction}
              aria-label="Voltar"
              className="hidden lg:flex h-10 w-10 items-center justify-center text-[#aeb8ca] transition-colors hover:text-white active:scale-95"
            >
              <ArrowLeft size={21} />
            </button>
          )}

          <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-lg font-semibold text-[#f0f4ff] lg:hidden">
            Zellu
          </span>

          <button
            type="button"
            onClick={() => navigate('/premium')}
            aria-label="Planos Premium"
            className="ml-auto flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-all active:scale-95"
            style={
              isPremium
                ? { borderColor: '#fbbf24', color: '#fbbf24', background: 'rgba(251,191,36,0.08)' }
                : { borderColor: '#4f8df7', color: '#60a5fa', background: 'rgba(79,141,247,0.08)' }
            }
          >
            <Crown size={13} />
            Upgrade
          </button>
        </header>

        <div className="min-h-0 min-w-0 flex-1 flex flex-col">
          <InstallBanner />
          <main
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
            style={
              location.pathname === '/mecanico-virtual'
                ? {}
                : {
                    paddingBottom: 'calc(env(safe-area-inset-bottom) + 32px)',
                    scrollPaddingBottom: 'calc(env(safe-area-inset-bottom) + 56px)',
                  }
            }
          >
            {children}
          </main>
        </div>
      </div>

      {/* Mobile overlay nav */}
      <SideNav open={menuOpen} onClose={closeMenu} />

      {/* Premium modal */}
      <AnimatePresence>
        {premiumOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              onClick={() => setPremiumOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-2xl overflow-y-auto rounded-t-3xl border-t border-[#203653] bg-[#0a1424] px-5 pb-10 pt-5"
              style={{ maxHeight: '92dvh' }}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#1e2d44]" />
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#4f8df7]">Zellu</p>
                  <h2 className="mt-0.5 text-xl font-semibold text-[#f4f7ff]">Planos e precos</h2>
                </div>
                <button type="button" onClick={() => setPremiumOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a2540] text-[#8892a4] hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                {PLANOS.map((plano) => {
                  const isActive = user?.plano === plano.id
                  return (
                    <div
                      key={plano.id}
                      className="rounded-2xl border p-4"
                      style={{
                        borderColor: plano.destaque ? `${plano.cor}40` : '#1e2d44',
                        background: plano.destaque ? `${plano.cor}08` : '#101d32',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `${plano.cor}18`, color: plano.cor }}>
                          {plano.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[#f0f4ff]">{plano.nome}</p>
                            {isActive && <span className="rounded-full bg-[#22c55e]/15 px-2 py-0.5 text-[10px] font-bold text-[#4ade80]">Ativo</span>}
                            {plano.destaque && !isActive && <span className="rounded-full bg-[#4f8df7]/15 px-2 py-0.5 text-[10px] font-bold text-[#60a5fa]">Popular</span>}
                          </div>
                          <p className="text-sm font-bold" style={{ color: plano.cor }}>
                            {plano.preco ?? 'Gratis'}
                            {plano.periodo && <span className="text-xs font-normal text-[#8892a4]">{plano.periodo}</span>}
                          </p>
                        </div>
                      </div>
                      <ul className="mt-3 space-y-1.5">
                        {plano.recursos.map((r) => (
                          <li key={r} className="flex items-center gap-2 text-xs text-[#aeb8ca]">
                            <Check size={12} style={{ color: plano.cor, flexShrink: 0 }} />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>

              {!isPremium ? (
                <button
                  type="button"
                  onClick={() => { setPremiumOpen(false); navigate('/premium') }}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4f8df7] to-[#60a5fa] py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#4f8df7]/20 active:scale-[0.98]"
                >
                  <Crown size={16} /> Assinar Zellu Premium <ChevronRight size={15} />
                </button>
              ) : (
                <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-[#22c55e]/25 bg-[#22c55e]/10 py-3.5 text-sm font-semibold text-[#4ade80]">
                  <Check size={16} /> Plano Premium ativo
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

