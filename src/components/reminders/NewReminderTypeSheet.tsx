import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Clock, X, CalendarPlus } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelectJaAconteceu: () => void
  onSelectVaiAcontecer: () => void
}

export default function NewReminderTypeSheet({ isOpen, onClose, onSelectJaAconteceu, onSelectVaiAcontecer }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 rounded-3xl bg-[#0d1526] border border-[#1e2d44] shadow-2xl overflow-hidden mx-auto"
            style={{ maxWidth: 440 }}
            initial={{ opacity: 0, scale: 0.94, y: '-45%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%' }}
            exit={{ opacity: 0, scale: 0.94, y: '-45%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div className="flex flex-col items-center w-full gap-1">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1"
                  style={{ background: 'linear-gradient(135deg, #4f8df7, #7c3aed)' }}>
                  <CalendarPlus size={24} className="text-white" />
                </div>
                <h2 className="text-lg font-bold text-[#f0f4ff]">Novo aviso</h2>
                <p className="text-sm text-[#8892a4]">Como você quer cadastrar?</p>
              </div>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[#8892a4] hover:text-[#f0f4ff] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Options */}
            <div className="px-4 pb-2 flex flex-col gap-3">
              <button
                onClick={onSelectJaAconteceu}
                className="flex items-center gap-4 p-4 rounded-2xl border border-green-500/20 bg-green-500/8 hover:bg-green-500/12 active:scale-[0.98] transition-all text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-green-500/15 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={22} className="text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#f0f4ff] font-semibold text-sm">Já aconteceu</p>
                  <p className="text-[#8892a4] text-xs mt-0.5 leading-relaxed">
                    Registrar serviço concluído no histórico (sem lembrete futuro).
                  </p>
                </div>
                <span className="text-[#8892a4] flex-shrink-0">›</span>
              </button>

              <button
                onClick={onSelectVaiAcontecer}
                className="flex items-center gap-4 p-4 rounded-2xl border border-[#4f8df7]/20 bg-[#4f8df7]/8 hover:bg-[#4f8df7]/12 active:scale-[0.98] transition-all text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-[#4f8df7]/15 flex items-center justify-center flex-shrink-0">
                  <Clock size={22} className="text-[#4f8df7]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#f0f4ff] font-semibold text-sm">Vai acontecer</p>
                  <p className="text-[#8892a4] text-xs mt-0.5 leading-relaxed">
                    Criar um lembrete com data para o app te avisar no momento certo.
                  </p>
                </div>
                <span className="text-[#8892a4] flex-shrink-0">›</span>
              </button>
            </div>

            <div className="pb-4" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
