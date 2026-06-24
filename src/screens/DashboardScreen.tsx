import React, { useState, useMemo } from 'react'
import { useScrollAtTop } from '@/hooks/useScrollAtTop'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { Bell, Plus, Car, AlertTriangle, ChevronRight, Fuel, X } from 'lucide-react'
import { PageTransition } from '@/components/layout/PageTransition'
import { Button, Card, EmptyState, BottomSheet } from '@/components/ui'
import { useStore } from '@/lib/store'
import NewReminderTypeSheet from '@/components/reminders/NewReminderTypeSheet'
import {
  formatKm,
  formatDate,
  getVeiculoEmoji,
  getTipoColor,
  getTipoLabel,
  isLembreteVencido,
  isLembretePróximo,
  normalizarMarca,
} from '@/lib/utils'

// ─── helpers ────────────────────────────────────────────────────────────────

function todayFormatted(): string {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function daysUntil(dateStr: string): number {
  if (!dateStr) return 9999
  const parts = dateStr.split('/')
  if (parts.length !== 3) return 9999
  const [dd, mm, yyyy] = parts
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const navigate = useNavigate()
  const { user, veiculos, lembretes } = useStore()
  const [fabOpen, setFabOpen] = useState(false)
  const [typeDialogOpen, setTypeDialogOpen] = useState(false)
  const atTop = useScrollAtTop()

  const primaryVeiculoId = useMemo(() => {
    const lastId = localStorage.getItem('zellu:lastVehicleId')
    return (veiculos.find((v) => v.id === lastId) ?? veiculos[0])?.id ?? ''
  }, [veiculos])

  const firstName = useMemo(() => {
    const name = user?.displayName ?? user?.email ?? 'você'
    return name.split(' ')[0]
  }, [user])

  const pendentes = useMemo(
    () => lembretes.filter((l) => !l.concluido),
    [lembretes]
  )

  const vencidos = useMemo(
    () => pendentes.filter(isLembreteVencido),
    [pendentes]
  )

  const upcomingLembretes = useMemo(() => {
    return [...pendentes]
      .sort((a, b) => {
        return daysUntil(a.dataLimite) - daysUntil(b.dataLimite)
      })
      .slice(0, 5)
  }, [pendentes])

  const veiculosMap = useMemo(() => {
    return Object.fromEntries(veiculos.map((v) => [v.id, v]))
  }, [veiculos])

  const pendentesPerVeiculo = useMemo(() => {
    const map: Record<string, number> = {}
    pendentes.forEach((l) => {
      map[l.veiculoId] = (map[l.veiculoId] ?? 0) + 1
    })
    return map
  }, [pendentes])

  const vehicleColors: Record<string, string> = {
    '#ef4444': 'from-red-500/30 to-red-500/10',
    '#f97316': 'from-orange-500/30 to-orange-500/10',
    '#f59e0b': 'from-amber-500/30 to-amber-500/10',
    '#22c55e': 'from-green-500/30 to-green-500/10',
    '#06b6d4': 'from-cyan-500/30 to-cyan-500/10',
    '#3b82f6': 'from-blue-500/30 to-blue-500/10',
    '#8b5cf6': 'from-violet-500/30 to-violet-500/10',
    '#ec4899': 'from-pink-500/30 to-pink-500/10',
    '#ffffff': 'from-white/20 to-white/5',
    '#94a3b8': 'from-slate-400/30 to-slate-400/10',
    '#1e293b': 'from-slate-700/40 to-slate-700/10',
    '#f8fafc': 'from-slate-50/20 to-slate-50/5',
  }

  function getVehicleBgClass(cor: string): string {
    return vehicleColors[cor] ?? 'from-[#4f8df7]/30 to-[#60a5fa]/20'
  }

  return (
    <PageTransition className="min-h-full bg-[#070c14]">
      {/* HEADER */}
      <div className={`sticky top-0 bg-[#070c14]/80 backdrop-blur-xl z-10 px-4 pt-4 pb-3 transition-transform duration-300 ease-in-out ${atTop ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#f0f4ff]">
              Olá, {firstName}! 👋
            </h1>
            <p className="text-[#8892a4] text-sm capitalize">{todayFormatted()}</p>
          </div>
          <button
            onClick={() => navigate('/notificacoes')}
            className="relative w-10 h-10 rounded-2xl bg-white/5 border border-[#1e2d44] flex items-center justify-center text-[#8892a4] hover:bg-white/10 transition-colors"
          >
            <Bell size={20} />
            {vencidos.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {vencidos.length > 9 ? '9+' : vencidos.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 py-3">
        {/* Veículos */}
        <div className="min-w-[130px] flex-shrink-0 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#4f8df7]/30 to-[#60a5fa]/20 flex items-center justify-center">
              <Car size={14} className="text-[#4f8df7]" />
            </div>
            <span className="text-[#8892a4] text-xs font-medium">Veículos</span>
          </div>
          <p
            className="text-2xl font-black"
            style={{
              background: 'linear-gradient(135deg, #4f8df7, #60a5fa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {veiculos.length}
          </p>
        </div>

        {/* Pendentes */}
        <div className="min-w-[130px] flex-shrink-0 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Bell size={14} className="text-amber-400" />
            </div>
            <span className="text-[#8892a4] text-xs font-medium">Pendentes</span>
          </div>
          <p className="text-2xl font-black text-amber-400">{pendentes.length}</p>
        </div>

        {/* Vencidos */}
        <div className="min-w-[130px] flex-shrink-0 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-xl bg-red-500/20 flex items-center justify-center">
              <AlertTriangle size={14} className="text-red-400" />
            </div>
            <span className="text-[#8892a4] text-xs font-medium">Vencidos</span>
          </div>
          <p
            className={`text-2xl font-black text-red-400 ${vencidos.length > 0 ? 'animate-pulse' : ''}`}
          >
            {vencidos.length}
          </p>
        </div>
      </div>

      {/* VEHICLES SECTION */}
      <div className="px-4 mt-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[#f0f4ff] font-semibold">Seus veículos</h2>
          <Link to="/garagem" className="text-[#4f8df7] text-sm font-medium">
            Ver todos →
          </Link>
        </div>

        {veiculos.length === 0 ? (
          <EmptyState
            icon={<Car size={28} className="text-[#4f8df7]" />}
            title="Nenhum veículo"
            description="Adicione seu primeiro veículo para começar"
            action={
              <Button
                variant="gradient"
                size="sm"
                onClick={() => navigate('/garagem')}
              >
                + Adicionar veículo
              </Button>
            }
          />
        ) : (
          veiculos.slice(0, 3).map((veiculo, index) => {
            const count = pendentesPerVeiculo[veiculo.id] ?? 0
            return (
              <motion.div
                key={veiculo.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.25 }}
                onClick={() => navigate(`/veiculo/${veiculo.id}`)}
                className="bg-[#131e33] border border-[#1e2d44] rounded-2xl p-4 mb-3 flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-transform"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-gradient-to-br ${getVehicleBgClass(veiculo.cor)} flex-shrink-0`}
                >
                  {getVeiculoEmoji(veiculo.tipoVeiculo)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#f0f4ff] font-semibold text-sm leading-tight truncate">
                    {veiculo.nome}
                  </p>
                  <p className="text-[#8892a4] text-xs mt-0.5 truncate">
                    {normalizarMarca(veiculo.marca)} {veiculo.modelo}
                  </p>
                  {!veiculo.semControleKm && (
                    <p className="text-[#8892a4] text-xs mt-0.5">
                      {formatKm(veiculo.kmAtual)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {count > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-semibold">
                      {count} pendente{count > 1 ? 's' : ''}
                    </span>
                  )}
                  <ChevronRight size={16} className="text-[#8892a4]" />
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* UPCOMING REMINDERS */}
      <div className="px-4 mt-2 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[#f0f4ff] font-semibold">Próximos lembretes</h2>
        </div>

        {upcomingLembretes.length === 0 ? (
          <p className="text-[#8892a4] text-sm text-center py-6">
            Sem lembretes pendentes 🎉
          </p>
        ) : (
          <div className="bg-[#131e33] border border-[#1e2d44] rounded-2xl overflow-hidden">
            {upcomingLembretes.map((lembrete, index) => {
              const veiculo = veiculosMap[lembrete.veiculoId]
              const vencido = isLembreteVencido(lembrete)
              const proximo = isLembretePróximo(lembrete, 7)
              const days = daysUntil(lembrete.dataLimite)
              const color = getTipoColor(lembrete.tipo)

              return (
                <div
                  key={lembrete.id}
                  onClick={() => navigate(`/veiculo/${lembrete.veiculoId}`)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors ${
                    index < upcomingLembretes.length - 1 ? 'border-b border-[#1e2d44]' : ''
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#f0f4ff] font-medium text-sm leading-tight truncate">
                      {lembrete.titulo || getTipoLabel(lembrete.tipo)}
                    </p>
                    <p className="text-[#8892a4] text-xs mt-0.5 truncate">
                      {veiculo?.nome ?? '—'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <p className="text-[#8892a4] text-xs">
                      {lembrete.dataLimite ? formatDate(lembrete.dataLimite) : '—'}
                    </p>
                    {vencido ? (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-semibold">
                        VENCIDO
                      </span>
                    ) : proximo ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-semibold">
                        {days === 0 ? 'HOJE' : `${days}d`}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[10px] font-semibold">
                        OK
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <motion.button
        className="fixed bottom-24 right-5 z-20 w-14 h-14 rounded-full bg-gradient-to-br from-[#4f8df7] to-[#60a5fa] shadow-lg shadow-[#4f8df7]/20 flex items-center justify-center"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.2 }}
        onClick={() => setFabOpen(true)}
        style={{ paddingBottom: 0 }}
      >
        <Plus size={24} className="text-white" strokeWidth={2.5} />
      </motion.button>

      {/* FAB BOTTOM SHEET */}
      <BottomSheet
        isOpen={fabOpen}
        onClose={() => setFabOpen(false)}
        title="O que deseja fazer?"
      >
        <div className="flex flex-col gap-3 pb-2">
          <button
            onClick={() => {
              setFabOpen(false)
              navigate('/garagem')
            }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-[#1e2d44] hover:bg-white/10 transition-colors w-full text-left"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4f8df7]/20 to-[#60a5fa]/20 flex items-center justify-center text-xl flex-shrink-0">
              🚗
            </div>
            <div>
              <p className="text-[#f0f4ff] font-semibold text-sm">Novo veículo</p>
              <p className="text-[#8892a4] text-xs">Adicionar à sua garagem</p>
            </div>
          </button>

          <button
            onClick={() => {
              setFabOpen(false)
              setTypeDialogOpen(true)
            }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-[#1e2d44] hover:bg-white/10 transition-colors w-full text-left"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center text-xl flex-shrink-0">
              🔔
            </div>
            <div>
              <p className="text-[#f0f4ff] font-semibold text-sm">Novo lembrete</p>
              <p className="text-[#8892a4] text-xs">Agendar manutenção ou revisão</p>
            </div>
          </button>

          <button
            onClick={() => {
              setFabOpen(false)
              if (primaryVeiculoId) {
                navigate(`/veiculo/${primaryVeiculoId}/abastecimento?novo=1`)
              } else {
                toast.error('Cadastre um veículo antes de registrar abastecimento.')
                navigate('/garagem')
              }
            }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-[#1e2d44] hover:bg-white/10 transition-colors w-full text-left"
          >
            <div className="w-10 h-10 rounded-2xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <Fuel size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-[#f0f4ff] font-semibold text-sm">Abastecer</p>
              <p className="text-[#8892a4] text-xs">Registrar abastecimento</p>
            </div>
          </button>
        </div>
      </BottomSheet>

      <NewReminderTypeSheet
        isOpen={typeDialogOpen}
        onClose={() => setTypeDialogOpen(false)}
        onSelectJaAconteceu={() => {
          setTypeDialogOpen(false)
          if (primaryVeiculoId) navigate(`/veiculo/${primaryVeiculoId}/novo-aviso?modo=concluido`)
          else {
            toast.error('Cadastre um veículo antes de criar avisos.')
            navigate('/garagem')
          }
        }}
        onSelectVaiAcontecer={() => {
          setTypeDialogOpen(false)
          if (primaryVeiculoId) navigate(`/veiculo/${primaryVeiculoId}/novo-aviso?modo=futuro`)
          else {
            toast.error('Cadastre um veículo antes de criar avisos.')
            navigate('/garagem')
          }
        }}
      />
    </PageTransition>
  )
}
