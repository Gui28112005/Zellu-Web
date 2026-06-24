import { useState, useEffect } from 'react'
import { Plus, Navigation, X, ChevronDown, ChevronUp, Fuel, Landmark, ParkingCircle, UtensilsCrossed, MoreHorizontal } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/lib/store'
import type { RegistroViagem } from '@/lib/types'

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function parseDate(value: string): Date | null {
  if (!value) return null
  const d = new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function isCurrentMonth(value: string, now: Date): boolean {
  const d = parseDate(value)
  return Boolean(d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear())
}

function formatDateBR(value: string): string {
  if (!value) return '—'
  const d = parseDate(value)
  if (!d) return value
  return d.toLocaleDateString('pt-BR')
}

const emptyForm = {
  veiculoId: '',
  data: '',
  origem: '',
  destino: '',
  distanciaKm: '',
  finalidade: '',
  combustivel: '',
  pedagio: '',
  estacionamento: '',
  alimentacao: '',
  outros: '',
}

export default function ViagensScreen() {
  const user = useStore((s) => s.user)
  const veiculos = useStore((s) => s.veiculos)
  const uid = user?.uid ?? ''

  const [viagens, setViagens] = useState<RegistroViagem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })

  useEffect(() => {
    if (veiculos.length > 0 && !form.veiculoId) {
      setForm((f) => ({ ...f, veiculoId: veiculos[0].id }))
    }
  }, [veiculos, form.veiculoId])

  useEffect(() => {
    if (!uid) return
    const raw = localStorage.getItem(`zellu_viagens_${uid}`)
    setViagens(raw ? (JSON.parse(raw) as RegistroViagem[]) : [])
  }, [uid])

  function save(updated: RegistroViagem[]) {
    setViagens(updated)
    localStorage.setItem(`zellu_viagens_${uid}`, JSON.stringify(updated))
  }

  const now = new Date()
  const sorted = [...viagens].sort((a, b) => {
    const da = parseDate(a.data)?.getTime() ?? 0
    const db = parseDate(b.data)?.getTime() ?? 0
    return db - da
  })

  const thisMonth = viagens.filter((v) => isCurrentMonth(v.data, now))
  const totalTrips = thisMonth.length
  const totalDistanceMes = thisMonth.reduce((s, v) => s + v.distanciaKm, 0)
  const totalCostMes = thisMonth.reduce(
    (s, v) => s + v.combustivel + v.pedagio + v.estacionamento + v.alimentacao + v.outros,
    0,
  )

  function totalCost(v: RegistroViagem) {
    return v.combustivel + v.pedagio + v.estacionamento + v.alimentacao + v.outros
  }

  function submit() {
    if (!form.origem || !form.destino || !form.data) return
    const nova: RegistroViagem = {
      id: crypto.randomUUID(),
      veiculoId: form.veiculoId,
      data: form.data,
      origem: form.origem,
      destino: form.destino,
      distanciaKm: Number(form.distanciaKm) || 0,
      finalidade: form.finalidade,
      combustivel: Number(form.combustivel) || 0,
      pedagio: Number(form.pedagio) || 0,
      estacionamento: Number(form.estacionamento) || 0,
      alimentacao: Number(form.alimentacao) || 0,
      outros: Number(form.outros) || 0,
      userId: uid,
      criadoEm: Date.now(),
    }
    save([nova, ...viagens])
    setShowForm(false)
    setForm({ ...emptyForm, veiculoId: veiculos[0]?.id ?? '' })
  }

  function remove(id: string) {
    save(viagens.filter((v) => v.id !== id))
  }

  const field = (key: keyof typeof form, label: string, placeholder: string, type = 'text') => (
    <div>
      <label className="mb-1 block text-xs text-[#8892a4]">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]"
      />
    </div>
  )

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-32 pt-6 sm:px-6">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#fbbf24]">Zellu Premium</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#f4f7ff]">Diário de Viagens</h1>
        <p className="mt-2 text-sm leading-6 text-[#8fa0b9]">Registre e acompanhe todas as viagens da frota.</p>
      </header>

      {/* Summary */}
      <section className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-[#203653] bg-[#101d32] p-3 text-center">
          <p className="text-lg font-semibold text-[#f4f7ff]">{totalTrips}</p>
          <p className="mt-0.5 text-[11px] text-[#8392a9]">Viagens</p>
        </div>
        <div className="rounded-2xl border border-[#4f8df7]/20 bg-[#4f8df7]/[0.06] p-3 text-center">
          <p className="text-lg font-semibold text-[#60a5fa]">{totalDistanceMes.toLocaleString('pt-BR')}</p>
          <p className="mt-0.5 text-[11px] text-[#8392a9]">KM rodados</p>
        </div>
        <div className="rounded-2xl border border-[#f59e0b]/20 bg-[#f59e0b]/[0.06] p-3 text-center">
          <p className="text-sm font-semibold text-[#fbbf24]">{currencyFormatter.format(totalCostMes)}</p>
          <p className="mt-0.5 text-[11px] text-[#8392a9]">Custos</p>
        </div>
      </section>

      {/* Add button */}
      <button
        type="button"
        onClick={() => { setForm({ ...emptyForm, veiculoId: veiculos[0]?.id ?? '' }); setShowForm(true) }}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4f8df7] py-3 text-sm font-semibold text-white active:scale-[0.98]"
      >
        <Plus size={17} /> Registrar viagem
      </button>

      {/* Trips list */}
      <section className="mt-5 space-y-3">
        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#1e2d44] bg-[#0d1526] px-6 py-12 text-center">
            <Navigation size={32} className="mx-auto text-[#60708a]" />
            <p className="mt-4 text-sm font-semibold text-[#e7eefb]">Nenhuma viagem registrada</p>
            <p className="mt-1 text-xs text-[#66758d]">Comece registrando a primeira viagem.</p>
          </div>
        ) : (
          sorted.map((viagem) => {
            const veiculo = veiculos.find((v) => v.id === viagem.veiculoId)
            const custo = totalCost(viagem)
            const isExpanded = expandedId === viagem.id
            return (
              <div key={viagem.id} className="rounded-2xl border border-[#203653] bg-[#101d32]">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : viagem.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[#f0f4ff]">
                        {viagem.origem} → {viagem.destino}
                      </p>
                      <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-[#8892a4]">
                        {veiculo && <span>{veiculo.nome}</span>}
                        <span>·</span>
                        <span>{formatDateBR(viagem.data)}</span>
                        {viagem.distanciaKm > 0 && <><span>·</span><span>{viagem.distanciaKm.toLocaleString('pt-BR')} km</span></>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#fbbf24]">{currencyFormatter.format(custo)}</p>
                      </div>
                      {isExpanded ? <ChevronUp size={15} className="text-[#66758d]" /> : <ChevronDown size={15} className="text-[#66758d]" />}
                    </div>
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-[#1e2d44] px-4 pb-4 pt-3">
                        {viagem.finalidade && (
                          <p className="mb-3 text-xs text-[#8892a4]">Finalidade: <span className="text-[#aeb8ca]">{viagem.finalidade}</span></p>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          {viagem.combustivel > 0 && (
                            <div className="flex items-center gap-2 rounded-xl bg-[#0b1627] px-3 py-2">
                              <Fuel size={13} className="text-[#70a7ff]" />
                              <div>
                                <p className="text-[10px] text-[#66758d]">Combustível</p>
                                <p className="text-xs font-semibold text-[#dce7f8]">{currencyFormatter.format(viagem.combustivel)}</p>
                              </div>
                            </div>
                          )}
                          {viagem.pedagio > 0 && (
                            <div className="flex items-center gap-2 rounded-xl bg-[#0b1627] px-3 py-2">
                              <Landmark size={13} className="text-[#70a7ff]" />
                              <div>
                                <p className="text-[10px] text-[#66758d]">Pedágio</p>
                                <p className="text-xs font-semibold text-[#dce7f8]">{currencyFormatter.format(viagem.pedagio)}</p>
                              </div>
                            </div>
                          )}
                          {viagem.estacionamento > 0 && (
                            <div className="flex items-center gap-2 rounded-xl bg-[#0b1627] px-3 py-2">
                              <ParkingCircle size={13} className="text-[#70a7ff]" />
                              <div>
                                <p className="text-[10px] text-[#66758d]">Estacionamento</p>
                                <p className="text-xs font-semibold text-[#dce7f8]">{currencyFormatter.format(viagem.estacionamento)}</p>
                              </div>
                            </div>
                          )}
                          {viagem.alimentacao > 0 && (
                            <div className="flex items-center gap-2 rounded-xl bg-[#0b1627] px-3 py-2">
                              <UtensilsCrossed size={13} className="text-[#70a7ff]" />
                              <div>
                                <p className="text-[10px] text-[#66758d]">Alimentação</p>
                                <p className="text-xs font-semibold text-[#dce7f8]">{currencyFormatter.format(viagem.alimentacao)}</p>
                              </div>
                            </div>
                          )}
                          {viagem.outros > 0 && (
                            <div className="flex items-center gap-2 rounded-xl bg-[#0b1627] px-3 py-2">
                              <MoreHorizontal size={13} className="text-[#70a7ff]" />
                              <div>
                                <p className="text-[10px] text-[#66758d]">Outros</p>
                                <p className="text-xs font-semibold text-[#dce7f8]">{currencyFormatter.format(viagem.outros)}</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(viagem.id)}
                          className="mt-3 text-xs text-[#f87171] underline decoration-[#f87171]/40 underline-offset-4"
                        >
                          Excluir viagem
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })
        )}
      </section>

      {/* Form overlay */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60"
              onClick={() => setShowForm(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-2xl overflow-y-auto rounded-t-3xl border-t border-[#203653] bg-[#0d1526] px-5 pb-8 pt-5"
              style={{ maxHeight: '90dvh' }}
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#f4f7ff]">Registrar viagem</h2>
                <button type="button" onClick={() => setShowForm(false)} className="text-[#66758d]"><X size={20} /></button>
              </div>

              <div className="space-y-3">
                {/* Vehicle */}
                <div>
                  <label className="mb-1 block text-xs text-[#8892a4]">Veículo</label>
                  <div className="relative">
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#66758d]" />
                    <select
                      value={form.veiculoId}
                      onChange={(e) => setForm((f) => ({ ...f, veiculoId: e.target.value }))}
                      className="w-full appearance-none rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]"
                    >
                      {veiculos.map((v) => (
                        <option key={v.id} value={v.id}>{v.nome} — {v.modelo}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {field('data', 'Data', '', 'date')}

                <div className="grid grid-cols-2 gap-3">
                  {field('origem', 'Origem', 'Ex: São Paulo')}
                  {field('destino', 'Destino', 'Ex: Guarulhos')}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {field('distanciaKm', 'Distância (km)', 'Ex: 35', 'number')}
                  {field('finalidade', 'Finalidade', 'Ex: Entrega cliente')}
                </div>

                <p className="pt-1 text-xs font-bold uppercase tracking-widest text-[#8892a4]">Custos</p>

                <div className="grid grid-cols-2 gap-3">
                  {field('combustivel', 'Combustível (R$)', '0.00', 'number')}
                  {field('pedagio', 'Pedágio (R$)', '0.00', 'number')}
                  {field('estacionamento', 'Estacionamento (R$)', '0.00', 'number')}
                  {field('alimentacao', 'Alimentação (R$)', '0.00', 'number')}
                  {field('outros', 'Outros (R$)', '0.00', 'number')}
                </div>

                {/* Total preview */}
                {(Number(form.combustivel) + Number(form.pedagio) + Number(form.estacionamento) + Number(form.alimentacao) + Number(form.outros)) > 0 && (
                  <div className="flex items-center justify-between rounded-2xl border border-[#203653] bg-[#0b1627] px-4 py-3">
                    <span className="text-xs text-[#8392a9]">Total</span>
                    <strong className="text-sm text-[#fbbf24]">
                      {currencyFormatter.format(
                        Number(form.combustivel) + Number(form.pedagio) + Number(form.estacionamento) + Number(form.alimentacao) + Number(form.outros),
                      )}
                    </strong>
                  </div>
                )}
              </div>

              <button type="button" onClick={submit} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4f8df7] py-3 text-sm font-semibold text-white active:scale-[0.98]">
                Registrar viagem
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  )
}
