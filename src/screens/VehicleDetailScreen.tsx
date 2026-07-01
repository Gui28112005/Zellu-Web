import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Pencil, Trash2, Check, X, Fuel, BarChart2, Bell, Plus, ChevronLeft, ChevronRight,
  Link2, Droplet, Droplets, Bike, Package, Star, Circle, Settings,
  ClipboardList, Sparkles, BatteryCharging, Car, Wrench, Paintbrush,
  Disc3, FileText, CreditCard, Shield, MoreHorizontal, Cog, Bell as BellIcon,
  AlertTriangle, Clock, CheckCircle2, Store, Phone, UserRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { PageTransition } from '@/components/layout/PageTransition'
import { Button, BottomSheet, Input, EmptyState } from '@/components/ui'
import { VehicleIllustration } from '@/components/VehicleIllustration'
import NewReminderTypeSheet from '@/components/reminders/NewReminderTypeSheet'
import { useStore } from '@/lib/store'
import { updateVeiculo, deleteVeiculo, updateLembrete } from '@/lib/db'
import {
  formatKm,
  getVeiculoEmoji,
  getVeiculoLabel,
  getTipoLabel,
  getTipoColor,
  isLembreteVencido,
  formatDate,
  formatCurrency,
  normalizarMarca,
} from '@/lib/utils'
import type { TipoVeiculo, TipoManutencao, Lembrete } from '@/lib/types'

// ─── constants ───────────────────────────────────────────────────────────────

const SWATCHES = [
  '#ef4444', '#f97316', '#f59e0b', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#ffffff', '#94a3b8', '#1e293b', '#f8fafc',
]

// Mapeamento equivalente aos Material Design Icons usados no app Android
const TIPO_ICON: Record<TipoManutencao, LucideIcon> = {
  CORRENTE:      Link2,
  LUBRIFICACAO:  Droplet,
  PEDIVELA:      Bike,
  ACESSORIOS:    Package,
  CONFORTO:      Star,
  PNEU:          Circle,
  TRANSMISSAO:   Cog,
  REVISAO:       ClipboardList,
  OLEO:          Droplets,
  LAVAGEM:       Sparkles,
  ABASTECIMENTO: Fuel,
  BATERIA:       BatteryCharging,
  VIDROS:        Car,
  MECANICA:      Wrench,
  FUNILARIA:     Paintbrush,
  FREIO:         Disc3,
  LICENCIAMENTO: FileText,
  IPVA:          CreditCard,
  SEGURO:        Shield,
  OUTROS:        MoreHorizontal,
}

// ─── form schema ─────────────────────────────────────────────────────────────

const veiculoSchema = z.object({
  tipoVeiculo: z.string().min(1) as z.ZodType<TipoVeiculo>,
  nome: z.string().min(1, 'Nome é obrigatório'),
  marca: z.string().optional().default(''),
  modelo: z.string().optional().default(''),
  ano: z.string().optional().default(''),
  cor: z.string().min(1),
  kmAtual: z.string().optional().default('0'),
  proprietario: z.string().optional().default(''),
})

type VeiculoForm = z.infer<typeof veiculoSchema>


// ─── helpers ─────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function daysUntil(dateStr: string): number {
  if (!dateStr) return Infinity
  const [dd, mm, yyyy] = dateStr.split('/')
  const limit = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((limit.getTime() - today.getTime()) / 86_400_000)
}

// ─── StatusBar ────────────────────────────────────────────────────────────────

function StatusBar({ lembrete, action }: { lembrete: import('@/lib/types').Lembrete; action?: React.ReactNode }) {
  if (lembrete.concluido) {
    return (
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#1e2d44] pt-3">
        <div className="flex min-w-0 items-center gap-1.5">
        <CheckCircle2 size={12} className="text-[#8892a4]" />
        <span className="text-[#8892a4] text-xs">
          Concluído{lembrete.concluidoEm ? ` em ${new Date(lembrete.concluidoEm).toLocaleDateString('pt-BR')}` : ''}
        </span>
        </div>
        {action}
      </div>
    )
  }
  if (isLembreteVencido(lembrete)) {
    return (
      <div className="-mx-4 -mb-4 mt-3 flex items-center justify-between gap-3 rounded-b-2xl border-t border-red-500/20 bg-red-500/5 px-4 pb-3 pt-3">
        <div className="flex min-w-0 items-center gap-1.5">
        <AlertTriangle size={12} className="text-red-400" />
        <span className="text-red-400 text-xs font-medium">
          VENCIDO — {formatDate(lembrete.dataLimite)}
        </span>
        </div>
        {action}
      </div>
    )
  }
  const days = daysUntil(lembrete.dataLimite)
  if (days <= 7 && days >= 0) {
    return (
      <div className="-mx-4 -mb-4 mt-3 flex items-center justify-between gap-3 rounded-b-2xl border-t border-amber-500/20 bg-amber-500/5 px-4 pb-3 pt-3">
        <div className="flex min-w-0 items-center gap-1.5">
        <Clock size={12} className="text-amber-400" />
        <span className="text-amber-400 text-xs font-medium">
          {days === 0 ? 'Vence hoje' : `Vence em ${days} dia${days > 1 ? 's' : ''}`}
        </span>
        </div>
        {action}
      </div>
    )
  }
  return (
    <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#1e2d44] pt-3">
      <div className="flex min-w-0 items-center gap-1.5">
      <Check size={12} className="text-green-400" />
      <span className="text-green-400 text-xs">Em dia</span>
      </div>
      {action}
    </div>
  )
}

// ─── gradient map ─────────────────────────────────────────────────────────────

const vehicleGradient: Record<string, string> = {
  '#ef4444': 'from-red-500/30 to-red-900/20',
  '#f97316': 'from-orange-500/30 to-orange-900/20',
  '#f59e0b': 'from-amber-500/30 to-amber-900/20',
  '#22c55e': 'from-green-500/30 to-green-900/20',
  '#06b6d4': 'from-cyan-500/30 to-cyan-900/20',
  '#3b82f6': 'from-blue-500/30 to-blue-900/20',
  '#8b5cf6': 'from-violet-500/30 to-violet-900/20',
  '#ec4899': 'from-pink-500/30 to-pink-900/20',
  '#ffffff': 'from-white/15 to-white/5',
  '#94a3b8': 'from-slate-400/30 to-slate-800/20',
  '#1e293b': 'from-slate-700/40 to-slate-900/20',
  '#f8fafc': 'from-slate-50/15 to-slate-100/5',
}

function getGradient(cor: string): string {
  return vehicleGradient[cor] ?? 'from-[#4f8df7]/30 to-[#60a5fa]/20'
}

// ─── component ───────────────────────────────────────────────────────────────

interface VehicleDetailScreenProps {
  vehicleId?: string
}

export default function VehicleDetailScreen({ vehicleId }: VehicleDetailScreenProps = {}) {
  const { id: routeVehicleId } = useParams<{ id: string }>()
  const id = vehicleId ?? routeVehicleId
  const navigate = useNavigate()
  const {
    user,
    veiculos,
    updateVeiculoLocal,
    removeVeiculoLocal,
    lembretes,
  } = useStore()

  const [editOpen, setEditOpen] = useState(false)
  const [typeDialogOpen, setTypeDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editingKm, setEditingKm] = useState(false)
  const [kmInput, setKmInput] = useState('')
  const [selectedCategoria, setSelectedCategoria] = useState<TipoManutencao | null>(null)
  const [professionalDialogOpen, setProfessionalDialogOpen] = useState(false)
  const [selectedReminder, setSelectedReminder] = useState<Lembrete | null>(null)
  const [professionalName, setProfessionalName] = useState('')
  const [professionalPhone, setProfessionalPhone] = useState('')
  const [savingProfessional, setSavingProfessional] = useState(false)
  const categoriasScrollRef = useRef<HTMLDivElement>(null)

  const veiculo = veiculos.find((v) => v.id === id)

  useEffect(() => {
    if (id) localStorage.setItem('zellu:lastVehicleId', id)
  }, [id])

  const pendentes = useMemo(
    () => lembretes.filter((l) => l.veiculoId === id && !l.concluido && l.tipo !== 'ABASTECIMENTO'),
    [lembretes, id]
  )

  const isBike = veiculo?.tipoVeiculo === 'BICICLETA' || veiculo?.tipoVeiculo === 'BIKE_ELETRICA'
  const BIKE_ONLY_TYPES: TipoManutencao[] = ['CORRENTE', 'PEDIVELA', 'LUBRIFICACAO']

  const categorias = useMemo(() => {
    const map = new Map<TipoManutencao, number>()
    pendentes.forEach((l) => {
      map.set(l.tipo, (map.get(l.tipo) ?? 0) + 1)
    })
    return (Object.keys(TIPO_ICON) as TipoManutencao[])
      .filter((tipo) => {
        if (!isBike && BIKE_ONLY_TYPES.includes(tipo)) return false
        return true
      })
      .map((tipo) => ({
        tipo,
        label: getTipoLabel(tipo),
        count: map.get(tipo) ?? 0,
      }))
  }, [pendentes, isBike])

  const filteredLembretes = useMemo(() => {
    const list = selectedCategoria
      ? pendentes.filter((l) => l.tipo === selectedCategoria)
      : pendentes
    return [...list].sort((a, b) => {
      if (!a.dataLimite) return 1
      if (!b.dataLimite) return -1
      const [ad, am, ay] = a.dataLimite.split('/').map(Number)
      const [bd, bm, by] = b.dataLimite.split('/').map(Number)
      return new Date(ay, am - 1, ad).getTime() - new Date(by, bm - 1, bd).getTime()
    })
  }, [pendentes, selectedCategoria])

  const vencidos = useMemo(
    () => pendentes.filter((l) => {
      if (!l.dataLimite) return false
      const [d, m, y] = l.dataLimite.split('/').map(Number)
      const date = new Date(y, m - 1, d)
      const today = new Date(); today.setHours(0, 0, 0, 0)
      return date < today
    }),
    [pendentes]
  )

  const concluidos = useMemo(
    () => lembretes
      .filter((l) => l.veiculoId === id && l.concluido)
      .sort((a, b) => (b.concluidoEm ?? 0) - (a.concluidoEm ?? 0))
      .slice(0, 5),
    [lembretes, id]
  )

  const totalGasto = useMemo(
    () => lembretes
      .filter((l) => l.veiculoId === id && l.concluido && l.valor > 0)
      .reduce((s, l) => s + l.valor, 0),
    [lembretes, id]
  )

  const profissionaisCadastrados = useMemo(() => {
    const map = new Map<string, { nome: string; telefone: string }>()
    lembretes.forEach((lembrete) => {
      const nome = lembrete.estabelecimentoNome?.trim()
      if (!nome) return
      const telefone = lembrete.estabelecimentoTelefone?.trim() ?? ''
      const key = `${nome.toLowerCase()}|${telefone}`
      map.set(key, { nome, telefone })
    })
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [lembretes])

  function openProfessionalDialog(lembrete: Lembrete) {
    setSelectedReminder(lembrete)
    setProfessionalName(lembrete.estabelecimentoNome ?? '')
    setProfessionalPhone(lembrete.estabelecimentoTelefone ?? '')
    setProfessionalDialogOpen(true)
  }

  function selectProfessional(professional: { nome: string; telefone: string }) {
    setProfessionalName(professional.nome)
    setProfessionalPhone(professional.telefone)
  }

  async function saveProfessionalLink() {
    if (!user || !selectedReminder) return
    const nome = professionalName.trim()
    const telefone = professionalPhone.trim()
    if (!nome) {
      toast.error('Informe o nome do profissional ou comércio.')
      return
    }

    setSavingProfessional(true)
    try {
      const updated: Lembrete = {
        ...selectedReminder,
        estabelecimentoNome: nome,
        estabelecimentoTelefone: telefone,
      }
      await updateLembrete(user.uid, updated)
      useStore.getState().updateLembreteLocal(updated)
      toast.success('Profissional vinculado ao aviso.')
      setProfessionalDialogOpen(false)
      setSelectedReminder(null)
    } catch {
      toast.error('Não foi possível vincular o profissional.')
    } finally {
      setSavingProfessional(false)
    }
  }

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<VeiculoForm>({
    resolver: zodResolver(veiculoSchema),
    defaultValues: veiculo
      ? {
          tipoVeiculo: veiculo.tipoVeiculo,
          nome: veiculo.nome,
          marca: veiculo.marca,
          modelo: veiculo.modelo,
          ano: veiculo.ano ?? '',
          cor: veiculo.cor,
          kmAtual: String(veiculo.kmAtual),
          proprietario: veiculo.proprietario,
        }
      : {},
  })

  const watchedTipo = watch('tipoVeiculo')
  const watchedCor = watch('cor')
  const noKmTypes: TipoVeiculo[] = ['BICICLETA', 'BIKE_ELETRICA', 'CARRETINHA']

  if (!veiculo) {
    return (
      <PageTransition className="min-h-full bg-[#070c14]">
        <EmptyState
          icon={<span className="text-2xl">🚗</span>}
          title="Veículo não encontrado"
          description="Este veículo não existe ou foi removido."
          action={
            <Button variant="ghost" onClick={() => navigate('/garagem')}>
              Voltar para garagem
            </Button>
          }
        />
      </PageTransition>
    )
  }

  async function onSaveEdit(data: VeiculoForm) {
    if (!user || !veiculo) return
    setSaving(true)
    try {
      const updated = {
        ...veiculo,
        tipoVeiculo: data.tipoVeiculo,
        nome: data.nome,
        marca: data.marca ?? '',
        modelo: data.modelo ?? '',
        ano: data.ano ?? '',
        cor: data.cor,
        kmAtual: Number(data.kmAtual) || 0,
        semControleKm: veiculo.semControleKm,
        proprietario: data.proprietario ?? '',
      }
      await updateVeiculo(user.uid, updated)
      updateVeiculoLocal(updated)
      setEditOpen(false)
      toast.success('Veículo atualizado!')
    } catch {
      toast.error('Erro ao atualizar veículo.')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!user || !veiculo) return
    const ok = window.confirm(`Deseja remover "${veiculo.nome}"? Esta ação não pode ser desfeita.`)
    if (!ok) return
    setDeleting(true)
    try {
      await deleteVeiculo(user.uid, veiculo.id)
      removeVeiculoLocal(veiculo.id)
      navigate('/garagem')
      toast.success('Veículo removido.')
    } catch {
      toast.error('Erro ao remover veículo.')
      setDeleting(false)
    }
  }

  async function onSaveKm() {
    if (!user || !veiculo) return
    const km = Number(kmInput)
    if (isNaN(km) || km < 0) { toast.error('KM inválido.'); return }
    try {
      const updated = { ...veiculo, kmAtual: km }
      await updateVeiculo(user.uid, updated)
      updateVeiculoLocal(updated)
      setEditingKm(false)
      toast.success('KM atualizado!')
    } catch {
      toast.error('Erro ao atualizar KM.')
    }
  }

  function openEdit() {
    if (!veiculo) return
    reset({
      tipoVeiculo: veiculo.tipoVeiculo,
      nome: veiculo.nome,
      marca: veiculo.marca,
      modelo: veiculo.modelo,
      cor: veiculo.cor,
      kmAtual: String(veiculo.kmAtual),
      proprietario: veiculo.proprietario,
    })
    setEditOpen(true)
  }

  return (
    <PageTransition className="min-h-full bg-[#070c14]">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 pt-4 pb-6">
        <div className="flex flex-col lg:grid lg:grid-cols-[400px_minmax(0,680px)] lg:gap-8 lg:items-start gap-4">

        {/* ── LEFT COLUMN (hero + actions) ── */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-4">

        {/* ── HERO CARD ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative isolate min-h-[310px] overflow-hidden bg-[#131e33] border border-white/10 rounded-3xl px-5 py-6 shadow-xl shadow-black/20"
        >
          <div
            aria-hidden="true"
            className={`absolute inset-0 -z-10 bg-gradient-to-br ${getGradient(veiculo.cor)}`}
          />
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-20 -z-10 h-56 w-56 rounded-full bg-white/[0.06] blur-3xl"
          />
          <h2 className="text-2xl font-normal text-[#f0f4ff] text-center leading-tight">
            {veiculo.nome}
          </h2>
          {(veiculo.modelo || veiculo.ano) && (
            <p className="text-[#aeb8ca] text-sm text-center mt-1">
              {[veiculo.modelo, veiculo.ano].filter(Boolean).join(' · ')}
            </p>
          )}

          <div className="w-full h-44 my-3 flex items-center justify-center">
            <VehicleIllustration
              tipo={veiculo.tipoVeiculo}
              className="w-full h-full object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.28)]"
            />
          </div>

          {/* KM + brand row */}
          <div className="flex items-center justify-between">
            {!veiculo.semControleKm ? (
              editingKm ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    type="number"
                    value={kmInput}
                    onChange={(e) => setKmInput(e.target.value)}
                    className="bg-[#1a2540] border border-[#4f8df7] rounded-xl px-3 py-1.5 text-[#f0f4ff] text-sm font-bold w-32 outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSaveKm()
                      if (e.key === 'Escape') setEditingKm(false)
                    }}
                  />
                  <button
                    onClick={onSaveKm}
                    className="w-7 h-7 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => setEditingKm(false)}
                    className="w-7 h-7 rounded-full bg-white/5 text-[#8892a4] flex items-center justify-center"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setKmInput(String(veiculo.kmAtual)); setEditingKm(true) }}
                  className="px-4 py-1.5 rounded-full bg-white/10 border border-white/10 text-[#f0f4ff] text-sm font-semibold hover:bg-white/15 transition-colors"
                >
                  {formatKm(veiculo.kmAtual)}
                </button>
              )
            ) : (
              <span className="px-4 py-1.5 rounded-full bg-white/5 text-[#aeb8ca] text-sm">
                Sem KM
              </span>
            )}
            <span className="text-[#aeb8ca] text-sm font-bold uppercase tracking-widest">
              {normalizarMarca(veiculo.marca) || getVeiculoLabel(veiculo.tipoVeiculo)}
            </span>
          </div>
        </motion.div>

        {/* ── EDITAR | RELATÓRIO | GUIA ── */}
        <div className="flex gap-3">
          <button
            onClick={openEdit}
            className="flex-1 bg-[#131e33] border border-[#1e2d44] rounded-2xl py-4 flex items-center justify-center gap-2 text-[#f0f4ff] font-semibold text-sm hover:bg-[#1a2540] active:scale-95 transition-all"
          >
            <Pencil size={16} className="text-[#4f8df7]" />
            Editar
          </button>
          <button
            onClick={() => navigate(`/relatorio/${id}`)}
            className="flex-1 bg-[#131e33] border border-[#1e2d44] rounded-2xl py-4 flex items-center justify-center gap-2 text-[#f0f4ff] font-semibold text-sm hover:bg-[#1a2540] active:scale-95 transition-all"
          >
            <BarChart2 size={16} className="text-[#60a5fa]" />
            Relatório
          </button>
        </div>

        {/* ── NOVO LEMBRETE CTA ── */}
        <button
          onClick={() => setTypeDialogOpen(true)}
          className="w-full bg-gradient-to-r from-[#4f8df7] to-[#60a5fa] rounded-2xl py-4 flex items-center justify-center gap-2.5 text-white font-bold text-base shadow-lg shadow-[#4f8df7]/25 active:scale-[0.98] transition-transform"
        >
          <Bell size={18} />
          Novo Lembrete
        </button>

        </div>{/* end left column */}

        {/* ── RIGHT COLUMN (categorias + lembretes) ── */}
        <div className="flex flex-col gap-4">

        {/* ── CATEGORIAS ── */}
        {categorias.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-[#8892a4] tracking-widest uppercase mb-3">
              Categorias
            </p>
            <div className="relative">
              {/* left arrow */}
              <button
                type="button"
                onClick={() => categoriasScrollRef.current?.scrollBy({ left: -240, behavior: 'smooth' })}
                className="hidden sm:flex absolute left-0 top-4 z-10 w-8 h-8 items-center justify-center rounded-full bg-[#131e33] border border-[#1e2d44] text-[#8892a4] hover:text-white -translate-x-1 shadow-lg"
              >
                <ChevronLeft size={16} />
              </button>
              {/* right arrow */}
              <button
                type="button"
                onClick={() => categoriasScrollRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}
                className="hidden sm:flex absolute right-0 top-4 z-10 w-8 h-8 items-center justify-center rounded-full bg-[#131e33] border border-[#1e2d44] text-[#8892a4] hover:text-white translate-x-1 shadow-lg"
              >
                <ChevronRight size={16} />
              </button>
              <div ref={categoriasScrollRef} className="flex gap-4 overflow-x-auto pb-2 pt-1 sm:px-6" style={{ scrollbarWidth: 'none' }}>
              {/* Todos */}
              {[
                { tipo: null as TipoManutencao | null, label: 'Todos', count: pendentes.length },
                ...categorias.map((c) => ({ tipo: c.tipo, label: c.label, count: c.count })),
              ].map((cat) => {
                const active = cat.tipo === selectedCategoria
                const Icon = cat.tipo ? TIPO_ICON[cat.tipo] : BellIcon
                const cor = cat.tipo ? getTipoColor(cat.tipo) : '#4f8df7'
                return (
                  <button
                    key={cat.tipo ?? 'todos'}
                    onClick={() => setSelectedCategoria(cat.tipo)}
                    className="flex w-[76px] flex-shrink-0 flex-col items-center gap-2"
                  >
                    <div
                      className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                        active ? 'ring-2 ring-[#4f8df7]' : 'bg-[#131e33] border border-[#1e2d44]'
                      }`}
                      style={active ? { backgroundColor: cor + '25' } : {}}
                    >
                      <Icon size={24} style={{ color: active ? cor : '#8892a4' }} />
                      {cat.count > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                          {cat.count}
                        </span>
                      )}
                    </div>
                    <span className={`w-full truncate text-center text-[11px] font-medium ${active ? 'text-[#4f8df7]' : 'text-[#8892a4]'}`}>
                      {cat.label}
                    </span>
                  </button>
                )
              })}
              </div>
              {/* fade direita indicando scroll */}
              <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-[#070c14] to-transparent" />
            </div>
          </div>
        )}

        {/* ── PRÓXIMOS LEMBRETES ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold text-[#8892a4] tracking-widest uppercase">
              Próximos Lembretes
            </p>
            <span className="px-2.5 py-0.5 rounded-full bg-[#4f8df7]/15 border border-[#4f8df7]/30 text-[#4f8df7] font-bold text-xs">
              {filteredLembretes.length}
            </span>
          </div>

          {filteredLembretes.length === 0 ? (
            <div className="bg-[#131e33] border border-[#1e2d44] rounded-2xl p-6 flex flex-col items-center gap-2">
              <span className="text-3xl">🔔</span>
              <p className="text-[#8892a4] text-sm text-center">Nenhum lembrete pendente</p>
              <button
                onClick={() => setTypeDialogOpen(true)}
                className="mt-1 flex items-center gap-1.5 text-[#4f8df7] text-sm font-semibold"
              >
                <Plus size={14} />
                Criar lembrete
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredLembretes.map((lembrete, i) => {
                const cor = getTipoColor(lembrete.tipo)
                const Icon = TIPO_ICON[lembrete.tipo]
                return (
                  <motion.div
                    key={lembrete.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: lembrete.concluido ? 0.6 : 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.2 }}
                    onClick={() => navigate(`/veiculo/${id}/lembrete/${lembrete.id}`)}
                    className="bg-[#131e33] border border-[#1e2d44] rounded-2xl p-4 cursor-pointer active:scale-[0.99] transition-transform"
                  >
                    <div className="flex items-start gap-3">
                      {/* Ícone */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: hexToRgba(cor, 0.15) }}
                      >
                        <Icon size={18} style={{ color: cor }} />
                      </div>

                      {/* Centro */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[#f0f4ff] font-semibold text-sm leading-tight truncate">
                          {lembrete.titulo || getTipoLabel(lembrete.tipo)}
                        </p>
                        {lembrete.peca ? (
                          <p className="text-[#8892a4] text-xs mt-0.5 truncate">{lembrete.peca}</p>
                        ) : null}
                        {lembrete.estabelecimentoNome ? (
                          <p className="text-[#8892a4] text-xs truncate">{lembrete.estabelecimentoNome}</p>
                        ) : null}
                      </div>

                      {/* Direita */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        {lembrete.dataLimite ? (
                          <span className="text-[#8892a4] text-xs">{formatDate(lembrete.dataLimite)}</span>
                        ) : null}
                        {lembrete.valor > 0 ? (
                          <span className="text-green-400 text-xs font-medium">
                            {formatCurrency(lembrete.valor)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Status */}
                    <StatusBar
                      lembrete={lembrete}
                      action={
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            openProfessionalDialog(lembrete)
                          }}
                          className={`flex h-8 flex-shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-[11px] font-semibold transition active:scale-[0.98] ${
                            lembrete.estabelecimentoNome
                              ? 'border-[#22c55e]/25 bg-[#22c55e]/10 text-[#4ade80]'
                              : 'border-[#4f8df7]/25 bg-[#4f8df7]/10 text-[#70a7ff]'
                          }`}
                          aria-label="Vincular profissional"
                        >
                          {lembrete.estabelecimentoNome ? <CheckCircle2 size={13} /> : <Store size={13} />}
                          <span className="hidden sm:inline">
                            {lembrete.estabelecimentoNome ? 'Vinculado' : 'Vincular'}
                          </span>
                        </button>
                      }
                    />
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── HISTÓRICO RECENTE ── */}
        {concluidos.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-[#8892a4] tracking-widest uppercase mb-3">
              Histórico recente
            </p>
            <div className="flex flex-col gap-2">
              {concluidos.map((lembrete) => {
                const cor = getTipoColor(lembrete.tipo)
                const Icon = TIPO_ICON[lembrete.tipo]
                return (
                  <div
                    key={lembrete.id}
                    onClick={() => navigate(`/veiculo/${id}/lembrete/${lembrete.id}`)}
                    className="bg-[#131e33] border border-[#1e2d44] rounded-2xl p-4 cursor-pointer opacity-70 hover:opacity-90 transition-opacity"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cor + '22' }}>
                        <Icon size={16} style={{ color: cor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#f0f4ff] text-sm font-medium truncate">{lembrete.titulo || getTipoLabel(lembrete.tipo)}</p>
                        {lembrete.peca && <p className="text-[#8892a4] text-xs truncate">{lembrete.peca}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {lembrete.valor > 0 && <p className="text-xs font-semibold text-[#34d399]">{formatCurrency(lembrete.valor)}</p>}
                        {lembrete.dataLimite && <p className="text-[10px] text-[#66758d]">{formatDate(lembrete.dataLimite)}</p>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        </div>{/* end right column */}
        </div>{/* end grid */}
      </div>

      {/* ── EDIT SHEET ── */}
      <BottomSheet
        isOpen={editOpen}
        onClose={() => { setEditOpen(false); reset() }}
        title="Editar veículo"
      >
        <form onSubmit={handleSubmit(onSaveEdit)} className="flex flex-col gap-5 pb-4">
          {/* Tipo — grade com ícones SVG */}
          <div>
            <p className="text-sm text-[#8892a4] mb-3 font-medium">Tipo de veículo</p>
            <div className="flex items-center gap-3 rounded-2xl border border-[#1e2d44] bg-white/[0.03] px-4 py-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#4f8df7]/15">
                <VehicleIllustration
                  tipo={veiculo.tipoVeiculo}
                  className="h-9 w-9 object-contain"
                  style={{ filter: 'brightness(0) invert(1) sepia(1) saturate(3) hue-rotate(195deg)' }}
                />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8892a4]">Tipo atual</p>
                <p className="text-sm font-semibold text-[#f0f4ff]">{getVeiculoLabel(veiculo.tipoVeiculo)}</p>
              </div>
            </div>
          </div>

          <Input label="Nome *" error={errors.nome?.message} {...register('nome')} />

          {/* Cor */}
          <div>
            <p className="text-sm text-[#8892a4] mb-3 font-medium">Cor</p>
            <Controller
              name="cor"
              control={control}
              render={({ field }) => (
                <div className="flex flex-wrap gap-3">
                  {SWATCHES.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      onClick={() => field.onChange(swatch)}
                      className={`w-8 h-8 rounded-full border-2 transition-all flex-shrink-0 ${
                        field.value === swatch
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0d1526] border-white/50 scale-110'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: swatch }}
                    />
                  ))}
                </div>
              )}
            />
          </div>

          {/* KM — obrigatório, sem toggle */}
          {!noKmTypes.includes(watchedTipo) && (
            <Input label="KM atual" type="number" placeholder="0" {...register('kmAtual')} />
          )}

          <Input label="Proprietário" {...register('proprietario')} />

          <Button type="submit" variant="gradient" fullWidth loading={saving} className="mt-1">
            Salvar alterações
          </Button>

          <button
            type="button"
            onClick={onDelete}
            disabled={deleting || saving}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 py-3.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={16} />
            {deleting ? 'Apagando...' : 'Apagar veículo'}
          </button>
        </form>
      </BottomSheet>

      <BottomSheet
        isOpen={professionalDialogOpen}
        onClose={() => {
          if (savingProfessional) return
          setProfessionalDialogOpen(false)
          setSelectedReminder(null)
        }}
        title="Vincular profissional"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#1e2d44] bg-[#0f1a2e] p-4">
            <p className="text-sm font-semibold text-[#f0f4ff]">
              {selectedReminder?.titulo || (selectedReminder ? getTipoLabel(selectedReminder.tipo) : 'Aviso')}
            </p>
            <p className="mt-1 text-xs leading-5 text-[#8892a4]">
              Adicione o comércio ou profissional que vai realizar essa manutenção.
            </p>
          </div>

          {profissionaisCadastrados.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8892a4]">
                Já cadastrados
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {profissionaisCadastrados.map((professional) => {
                  const active =
                    professionalName.trim() === professional.nome &&
                    professionalPhone.trim() === professional.telefone
                  return (
                    <button
                      key={`${professional.nome}-${professional.telefone}`}
                      type="button"
                      onClick={() => selectProfessional(professional)}
                      className={`min-w-[180px] rounded-2xl border p-3 text-left transition active:scale-[0.98] ${
                        active
                          ? 'border-[#4f8df7]/60 bg-[#4f8df7]/15'
                          : 'border-[#1e2d44] bg-[#101a2d]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#4f8df7]/12 text-[#70a7ff]">
                          <UserRound size={15} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#f0f4ff]">{professional.nome}</p>
                          <p className="truncate text-xs text-[#8892a4]">
                            {professional.telefone || 'Sem telefone'}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <Input
              label="Nome do profissional ou comércio"
              placeholder="Ex: Oficina Central"
              value={professionalName}
              onChange={(event) => setProfessionalName(event.target.value)}
              leftIcon={<Store size={17} />}
            />
            <Input
              label="Telefone"
              placeholder="Ex: (11) 99999-9999"
              value={professionalPhone}
              onChange={(event) => setProfessionalPhone(event.target.value)}
              leftIcon={<Phone size={17} />}
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              fullWidth
              disabled={savingProfessional}
              onClick={() => {
                setProfessionalDialogOpen(false)
                setSelectedReminder(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              fullWidth
              loading={savingProfessional}
              onClick={() => void saveProfessionalLink()}
            >
              Salvar vínculo
            </Button>
          </div>
        </div>
      </BottomSheet>

      <NewReminderTypeSheet
        isOpen={typeDialogOpen}
        onClose={() => setTypeDialogOpen(false)}
        onSelectJaAconteceu={() => {
          setTypeDialogOpen(false)
          navigate(`/veiculo/${id}/novo-aviso?modo=concluido`)
        }}
        onSelectVaiAcontecer={() => {
          setTypeDialogOpen(false)
          navigate(`/veiculo/${id}/novo-aviso?modo=futuro`)
        }}
      />
    </PageTransition>
  )
}
