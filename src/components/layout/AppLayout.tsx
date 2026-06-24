import React, { useCallback, useState } from 'react'
import { ArrowLeft, Menu } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { SideNav } from './BottomNav'
import { InstallBanner } from '../ios/InstallBanner'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const location = useLocation()
  const navigate = useNavigate()
  const isVehicleHome = /^\/veiculo\/[^/]+$/.test(location.pathname)
  const isHome = location.pathname === '/' || isVehicleHome

  const handleToolbarAction = () => {
    if (isHome) {
      setMenuOpen(true)
      return
    }
    if (location.pathname === '/premium') {
      navigate('/', { replace: true })
      return
    }
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  return (
    <div
      className="flex h-[100dvh] min-h-[100svh] overflow-hidden flex-col bg-[#070c14]"
    >
      <header
        className="relative flex h-[calc(env(safe-area-inset-top)+3.5rem)] flex-shrink-0 items-end border-b border-[#1e2d44]/80 bg-[#0d1526]/92 px-4 pb-2 shadow-lg shadow-black/10 backdrop-blur-xl"
      >
        <button
          type="button"
          onClick={handleToolbarAction}
          aria-label={isHome ? 'Abrir menu' : 'Voltar'}
          aria-expanded={isHome ? menuOpen : undefined}
          className="flex h-10 w-10 items-center justify-center text-[#aeb8ca] transition-colors hover:text-white active:scale-95"
        >
          {isHome ? <Menu size={21} /> : <ArrowLeft size={21} />}
        </button>
        <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-lg font-semibold text-[#f0f4ff]">
          Zellu
        </span>
      </header>

      <div className="min-h-0 min-w-0 flex-1 flex flex-col">
        <InstallBanner />

        <main
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
          style={{
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 32px)',
            scrollPaddingBottom: 'calc(env(safe-area-inset-bottom) + 56px)',
          }}
        >
          {children}
        </main>
      </div>

      <SideNav open={menuOpen} onClose={closeMenu} />
    </div>
  )
}
