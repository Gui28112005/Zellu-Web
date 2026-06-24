import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

const STORAGE_KEY = 'zellu-ios-banner-dismissed'

function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  return isIOS && !isStandalone
}

export function InstallBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (!dismissed && isIOSSafari()) {
      // Small delay so it doesn't flash on first paint
      const t = setTimeout(() => setVisible(true), 1200)
      return () => clearTimeout(t)
    }
  }, [])

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-0 right-0 px-4 z-50 pointer-events-none"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        >
          <div
            className="pointer-events-auto bg-[#0d1526] border border-[#4f8df7]/30 rounded-2xl p-4 shadow-2xl shadow-black/50 relative"
          >
            {/* Dismiss button */}
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#8892a4] transition-colors"
              aria-label="Fechar"
            >
              <X size={14} strokeWidth={2.5} />
            </button>

            {/* Header */}
            <div className="flex items-start gap-3 pr-8">
              <span className="text-2xl leading-none mt-0.5">📲</span>
              <div>
                <p className="text-[#f0f4ff] font-bold text-sm leading-tight">
                  Instale no iPhone
                </p>
                <p className="text-[#8892a4] text-xs mt-0.5">
                  Acesse como app nativo
                </p>
              </div>
            </div>

            {/* Steps */}
            <ol className="mt-3 space-y-1.5">
              <li className="flex items-start gap-2 text-[#8892a4] text-xs">
                <span className="w-4 h-4 rounded-full bg-[#4f8df7]/20 text-[#4f8df7] flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-px">
                  1
                </span>
                <span>
                  Toque em{' '}
                  <span className="text-[#f0f4ff] font-medium">
                    "Compartilhar"
                  </span>{' '}
                  <span className="text-base leading-none">⬆️</span>{' '}
                  no Safari
                </span>
              </li>
              <li className="flex items-start gap-2 text-[#8892a4] text-xs">
                <span className="w-4 h-4 rounded-full bg-[#4f8df7]/20 text-[#4f8df7] flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-px">
                  2
                </span>
                <span>
                  Selecione{' '}
                  <span className="text-[#f0f4ff] font-medium">
                    "Adicionar à Tela de Início"
                  </span>
                </span>
              </li>
            </ol>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
