import React, { useMemo, useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart,
  Line,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Fuel, TrendingDown, TrendingUp, Calendar, Zap, Droplets, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useStore } from '@/lib/store'
import { addAbastecimento, deleteAbastecimento } from '@/lib/db'
import { formatDate, formatCurrency, todayStr } from '@/lib/utils'
import { Button, Input, BottomSheet, EmptyState } from '@/components/ui'
import { PageTransition } from '@/components/layout/PageTransition'
import type { Abastecimento } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type TipoCombustivel = 'GASOLINA' | 'ETANOL' | 'DIESEL' | 'FLEX' | 'ELETRICO' | 'GNV'

const COMBUSTIVEL_CONFIG: Record<TipoCombustivel, { label: string; color: string }> = {
  GASOLINA: { label: 'Gasolina', color: '#f59e0b' },
  ETANOL:   { label: 'Etanol',   color: '#22c55e' },
  DIESEL:   { label: 'Diesel',   color: '#3b82f6' },
  FLEX:     { label: 'Flex',     color: '#8b5cf6' },
  ELETRICO: { label: 'Elétrico', color: '#06b6d4' },
  GNV:      { label: 'GNV',      color: '#94a3b8' },
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  tipoCombustivel: z.enum(['GASOLINA', 'ETANOL', 'DIESEL', 'FLEX', 'ELETRICO', 'GNV']),
  litros: z.coerce.number().positive('Informe os litros'),
  precoLitro: z.coerce.number().positive('Informe o preço por litro'),
  valorPago: z.coerce.number().positive('Informe o valor pago'),
  data: z.string().min(1, 'Informe a data'),
  km: z.coerce.number().optional(),
})

type FuelFormData = z.infer<typeof schema>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isoToDisplay(iso: string): string {
  if (!iso) return ''
  // If already dd/MM/yyyy, return as-is
  if (iso.includes('/')) return iso
  // Convert yyyy-MM-dd to dd/MM/yyyy
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function todayISO(): string {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

function shortDate(dateStr: string): string {
  if (!dateStr) return ''
  let d: Date
  if (dateStr.includes('/')) {
    const [dd, mm, yyyy] = dateStr.split('/')
    d = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
  } else {
    d = new Date(dateStr)
  }
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { value: number }[] }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0d1526] border border-[#1e2d44] rounded-xl px-3 py-2 text-sm">
      <span className="text-[#f0f4ff] font-semibold">{formatCurrency(payload[0].value)}</span>
    </div>
  )
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string
  value: string
  sub?: string
  color: string
  icon: React.ReactNode
}

function SummaryCard({ label, value, sub, color, icon }: SummaryCardProps) {
  return (
    <div className="flex-shrink-0 w-36 bg-[#131e33] border border-[#1e2d44] rounded-2xl p-3.5">
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center mb-2"
        style={{ backgroundColor: `${color}20` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <p className="text-[#8892a4] text-[11px] font-medium leading-tight">{label}</p>
      <p className="text-[#f0f4ff] font-bold text-base mt-0.5 leading-tight">{value}</p>
      {sub && <p className="text-[#8892a4] text-[10px] mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FuelScreen() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, veiculos, abastecimentos, addAbastecimentoLocal } = useStore()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const veiculo = veiculos.find((v) => v.id === id)

  useEffect(() => {
    if (searchParams.get('novo') === '1') {
      setSheetOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])
  const entries = useMemo(
    () =>
      abastecimentos
        .filter((a) => a.veiculoId === id)
        .sort((a, b) => a.criadoEm - b.criadoEm),
    [abastecimentos, id]
  )

  // ── Summary calculations ────────────────────────────────────────────────────

  const totalGasto = useMemo(() => entries.reduce((s, e) => s + e.valorPago, 0), [entries])

  const precoMedio = useMemo(() => {
    if (!entries.length) return 0
    return entries.reduce((s, e) => s + e.precoLitro, 0) / entries.length
  }, [entries])

  const consumoMedio = useMemo(() => {
    const withKm = entries.filter((e) => e.km != null && e.km > 0)
    if (withKm.length < 2) return null
    const first = withKm[0].km!
    const last = withKm[withKm.length - 1].km!
    const totalLitros = entries.reduce((s, e) => s + e.litros, 0)
    if (totalLitros === 0) return null
    return (last - first) / totalLitros
  }, [entries])

  const ultimoAbastecimento = useMemo(() => {
    if (!entries.length) return null
    return entries[entries.length - 1]
  }, [entries])

  // ── Chart data ──────────────────────────────────────────────────────────────

  const chartData = useMemo(() => {
    return [...entries]
      .sort((a, b) => a.criadoEm - b.criadoEm)
      .slice(-10)
      .map((e) => ({
        date: shortDate(e.data),
        value: e.valorPago,
      }))
  }, [entries])

  // ── Form ────────────────────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<FuelFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipoCombustivel: 'GASOLINA',
      data: todayISO(),
    },
  })

  const watchedLitros = watch('litros')
  const watchedPreco = watch('precoLitro')

  useEffect(() => {
    if (watchedLitros && watchedPreco) {
      const calc = Number(watchedLitros) * Number(watchedPreco)
      if (!isNaN(calc) && calc > 0) {
        setValue('valorPago', parseFloat(calc.toFixed(2)))
      }
    }
  }, [watchedLitros, watchedPreco, setValue])

  const selectedTipo = watch('tipoCombustivel')

  const onSubmit = async (data: FuelFormData) => {
    if (!user || !id) return
    setSaving(true)
    try {
      const novo = await addAbastecimento(user.uid, {
        veiculoId: id,
        data: isoToDisplay(data.data),
        precoLitro: data.precoLitro,
        valorPago: data.valorPago,
        litros: data.litros,
        tipoCombustivel: data.tipoCombustivel,
        km: data.km || undefined,
      })
      addAbastecimentoLocal(novo)
      toast.success('Abastecimento registrado!')
      setSheetOpen(false)
      reset({ tipoCombustivel: 'GASOLINA', data: todayISO() })
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (entry: Abastecimento) => {
    if (!user) return
    try {
      await deleteAbastecimento(user.uid, entry.id)
      useStore.setState((s) => ({
        abastecimentos: s.abastecimentos.filter((a) => a.id !== entry.id),
      }))
      toast.success('Registro removido')
    } catch {
      toast.error('Erro ao remover')
    } finally {
      setDeleteConfirm(null)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <PageTransition>
      <div
        className="min-h-screen bg-[#070c14] text-[#f0f4ff]"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
        }}
      >
        <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-center px-4 pt-4 pb-3">
          <div className="flex flex-col items-center">
            <h1 className="text-[#f0f4ff] font-bold text-base leading-tight">
              {veiculo?.nome ?? 'Veículo'}
            </h1>
            <span className="text-[#8892a4] text-xs">Abastecimento</span>
          </div>

        </div>

        {/* Summary Cards — horizontal scroll */}
        <div className="flex gap-3 px-4 overflow-x-auto pb-1 scrollbar-none">
          <SummaryCard
            label="Total gasto"
            value={formatCurrency(totalGasto)}
            color="#22c55e"
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <SummaryCard
            label="Preço médio"
            value={precoMedio > 0 ? precoMedio.toFixed(3) : '—'}
            sub="R$/L"
            color="#f59e0b"
            icon={<Fuel className="w-4 h-4" />}
          />
          {consumoMedio != null && (
            <SummaryCard
              label="Consumo médio"
              value={consumoMedio.toFixed(1)}
              sub="km/L"
              color="#4f8df7"
              icon={<TrendingDown className="w-4 h-4" />}
            />
          )}
          <SummaryCard
            label="Último abastec."
            value={ultimoAbastecimento ? shortDate(ultimoAbastecimento.data) : '—'}
            color="#8892a4"
            icon={<Calendar className="w-4 h-4" />}
          />
        </div>

        {/* Chart */}
        {chartData.length > 1 && (
          <div className="px-4 mt-5">
            <p className="text-[#f0f4ff] font-semibold text-sm mb-3">Histórico de gastos</p>
            <div className="bg-[#131e33] border border-[#1e2d44] rounded-2xl p-4">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#8892a4', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#4f8df7"
                    strokeWidth={2}
                    dot={{ fill: '#4f8df7', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#4f8df7' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Records */}
        <div className="px-4 mt-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[#f0f4ff] font-semibold text-sm">Registros</p>
            <span className="text-[#8892a4] text-xs">{entries.length} {entries.length === 1 ? 'item' : 'itens'}</span>
          </div>

          {entries.length === 0 ? (
            <EmptyState
              icon={<Fuel className="w-7 h-7 text-[#8892a4]" />}
              title="Nenhum abastecimento"
              description="Nenhum abastecimento foi registrado ainda."
            />
          ) : (
            <div className="space-y-2">
              {[...entries].reverse().map((entry) => {
                const cfg = COMBUSTIVEL_CONFIG[entry.tipoCombustivel as TipoCombustivel] ?? COMBUSTIVEL_CONFIG.GASOLINA
                const isDeleting = deleteConfirm === entry.id
                return (
                  <motion.div
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-[#131e33] border border-[#1e2d44] rounded-2xl p-4"
                  >
                    <div className="flex items-center gap-3">
                      {/* Icon */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${cfg.color}20` }}
                      >
                        {entry.tipoCombustivel === 'ELETRICO' ? (
                          <Zap className="w-5 h-5" style={{ color: cfg.color }} />
                        ) : (
                          <Droplets className="w-5 h-5" style={{ color: cfg.color }} />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[#f0f4ff] font-semibold text-sm">{cfg.label}</p>
                        <p className="text-[#8892a4] text-xs mt-0.5">
                          {entry.litros}L × R$ {entry.precoLitro.toFixed(3)}/L
                        </p>
                        {entry.km != null && entry.km > 0 && (
                          <p className="text-[#8892a4] text-[10px] mt-0.5">
                            📍 {entry.km.toLocaleString('pt-BR')} km
                          </p>
                        )}
                      </div>

                      {/* Value + date */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-[#f0f4ff] font-semibold text-sm">
                          {formatCurrency(entry.valorPago)}
                        </p>
                        <p className="text-[#8892a4] text-xs mt-0.5">{shortDate(entry.data)}</p>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteConfirm(isDeleting ? null : entry.id)}
                        className="w-8 h-8 rounded-xl bg-white/5 border border-[#1e2d44] flex items-center justify-center ml-1 active:scale-95 transition-transform"
                      >
                        <Trash2 className="w-4 h-4 text-[#8892a4]" />
                      </button>
                    </div>

                    {/* Delete confirmation */}
                    <AnimatePresence>
                      {isDeleting && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 pt-3 border-t border-[#1e2d44] flex items-center gap-2">
                            <p className="text-[#8892a4] text-xs flex-1">Remover este registro?</p>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-3 py-1.5 rounded-xl bg-white/5 border border-[#1e2d44] text-[#8892a4] text-xs"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleDelete(entry)}
                              className="px-3 py-1.5 rounded-xl bg-red-500/15 border border-red-500/20 text-red-400 text-xs font-medium"
                            >
                              Remover
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Add Fuel Sheet */}
      <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} title="Novo abastecimento">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Fuel type pills */}
          <div>
            <p className="text-[#8892a4] text-sm font-medium mb-2">Tipo de combustível</p>
            <Controller
              name="tipoCombustivel"
              control={control}
              render={({ field }) => (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {(Object.keys(COMBUSTIVEL_CONFIG) as TipoCombustivel[]).map((tipo) => {
                    const cfg = COMBUSTIVEL_CONFIG[tipo]
                    const isSelected = field.value === tipo
                    return (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => field.onChange(tipo)}
                        className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 border"
                        style={
                          isSelected
                            ? {
                                backgroundColor: `${cfg.color}25`,
                                borderColor: cfg.color,
                                color: cfg.color,
                              }
                            : {
                                backgroundColor: 'transparent',
                                borderColor: '#1e2d44',
                                color: '#8892a4',
                              }
                        }
                      >
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
              )}
            />
          </div>

          {/* Litros + Preço row */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Litros"
              type="number"
              step="0.01"
              placeholder="0.00"
              error={errors.litros?.message}
              {...register('litros')}
            />
            <Input
              label="Preço por litro (R$/L)"
              type="number"
              step="0.001"
              placeholder="0.000"
              error={errors.precoLitro?.message}
              {...register('precoLitro')}
            />
          </div>

          {/* Valor pago */}
          <Input
            label="Valor pago (R$)"
            type="number"
            step="0.01"
            placeholder="0.00"
            error={errors.valorPago?.message}
            {...register('valorPago')}
          />

          {/* Data + KM row */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Data"
              type="date"
              error={errors.data?.message}
              {...register('data')}
            />
            <Input
              label="Km atual (opcional)"
              type="number"
              placeholder="Ex: 45000"
              {...register('km')}
            />
          </div>

          {/* Live preview */}
          {watchedLitros && watchedPreco && Number(watchedLitros) > 0 && Number(watchedPreco) > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#4f8df7]/10 border border-[#4f8df7]/20 rounded-xl px-4 py-2.5 flex items-center justify-between"
            >
              <span className="text-[#8892a4] text-sm">Total calculado</span>
              <span className="text-[#4f8df7] font-bold">
                {formatCurrency(Number(watchedLitros) * Number(watchedPreco))}
              </span>
            </motion.div>
          )}

          <Button type="submit" fullWidth loading={saving} className="mt-2">
            Salvar abastecimento
          </Button>
        </form>
      </BottomSheet>
    </PageTransition>
  )
}
