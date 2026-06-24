import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Search } from 'lucide-react'
import { PageTransition } from '@/components/layout/PageTransition'
import { Button } from '@/components/ui'
import { VehicleIllustration } from '@/components/VehicleIllustration'
import { useStore } from '@/lib/store'
import { formatKm, getVeiculoLabel, normalizarMarca } from '@/lib/utils'
import AddVehicleSheet from '@/components/vehicles/AddVehicleSheet'

export default function GaragemScreen() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const { user, veiculos, lembretes } = useStore()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [search, setSearch]       = useState('')

  useEffect(() => {
    if ((location.state as { openAdd?: boolean })?.openAdd) {
      setSheetOpen(true)
      window.history.replaceState({}, '')
    }
  }, [location.state])

  const filteredVeiculos = useMemo(() =>
    veiculos.filter((v) =>
      v.nome.toLowerCase().includes(search.toLowerCase()) ||
      v.marca.toLowerCase().includes(search.toLowerCase()) ||
      v.modelo.toLowerCase().includes(search.toLowerCase())
    ),
    [veiculos, search]
  )

  const vehicleGradient: Record<string, string> = {
    '#ef4444': 'from-red-500/40 to-red-500/10',
    '#f97316': 'from-orange-500/40 to-orange-500/10',
    '#f59e0b': 'from-amber-500/40 to-amber-500/10',
    '#22c55e': 'from-green-500/40 to-green-500/10',
    '#06b6d4': 'from-cyan-500/40 to-cyan-500/10',
    '#3b82f6': 'from-blue-500/40 to-blue-500/10',
    '#8b5cf6': 'from-violet-500/40 to-violet-500/10',
    '#ec4899': 'from-pink-500/40 to-pink-500/10',
    '#ffffff': 'from-white/20 to-white/5',
    '#94a3b8': 'from-slate-400/40 to-slate-400/10',
    '#1e293b': 'from-slate-700/50 to-slate-700/10',
    '#f8fafc': 'from-slate-50/20 to-slate-50/5',
  }
  const getGradient = (cor: string) => vehicleGradient[cor] ?? 'from-[#4f8df7]/40 to-[#60a5fa]/20'

  return (
    <PageTransition className="min-h-full bg-[#070c14]">
      <div className="w-full max-w-2xl mx-auto px-4 pb-10">

        {/* Hero */}
        <div className="flex flex-col items-center pt-6 pb-6">
          <img
            src="/vehicles/ic_garagem.svg"
            alt="Garagem"
            className="w-36 h-24 object-contain mb-4"
            draggable={false}
          />
          <h2 className="text-2xl font-bold text-[#f0f4ff]">Meus veículos</h2>
        </div>

        {/* Search */}
        <div className="mb-5">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8892a4]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar veículo"
              className="w-full bg-[#131e33] border border-[#1e2d44] text-[#f0f4ff] placeholder-[#8892a4] rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#4f8df7] focus:ring-1 focus:ring-[#4f8df7]/30 transition-all"
            />
          </div>
        </div>

        {/* Vehicle list */}
        {veiculos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-[#8892a4] text-sm text-center mb-6 leading-relaxed">
              Adicione seu primeiro veículo para começar a acompanhar manutenções
            </p>
            <Button variant="gradient" onClick={() => setSheetOpen(true)}>
              <Plus size={18} />
              Adicionar veículo
            </Button>
          </div>
        ) : filteredVeiculos.length === 0 ? (
          <p className="text-center text-[#8892a4] text-sm py-12">Nenhum veículo encontrado.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredVeiculos.map((veiculo, index) => {
              const subtitle = [normalizarMarca(veiculo.marca), veiculo.modelo].filter(Boolean).join(' · ') || getVeiculoLabel(veiculo.tipoVeiculo)
              return (
                <motion.div
                  key={veiculo.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.22 }}
                  onClick={() => navigate(`/veiculo/${veiculo.id}`)}
                  className="bg-[#131e33] border border-[#1e2d44] rounded-2xl p-4 cursor-pointer active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex-shrink-0 overflow-hidden bg-gradient-to-br ${getGradient(veiculo.cor)} flex items-center justify-center`}>
                      <VehicleIllustration tipo={veiculo.tipoVeiculo} className="w-11 h-11 object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#f0f4ff] font-bold text-base leading-tight truncate">{veiculo.nome}</p>
                      <p className="text-[#8892a4] text-sm mt-0.5 truncate">{subtitle}{veiculo.ano ? ` · ${veiculo.ano}` : ''}</p>
                      {!veiculo.semControleKm && (
                        <p className="text-[#4f8df7] text-xs mt-1 font-medium">{formatKm(veiculo.kmAtual)}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-[#0d1526] border border-[#1e2d44] px-4 py-3 flex flex-col gap-1">
                    <p className="text-[#f0f4ff] text-xs font-semibold">
                      Mantenedor: {user?.displayName ?? user?.email ?? 'Você'}
                    </p>
                    {veiculo.proprietario && (
                      <p className="text-[#f0f4ff] text-xs font-semibold">
                        Proprietário: {veiculo.proprietario}
                      </p>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      <AddVehicleSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={(veiculo) => {
          localStorage.setItem('zellu:lastVehicleId', veiculo.id)
          navigate(`/veiculo/${veiculo.id}`, { replace: true })
        }}
      />
    </PageTransition>
  )
}
