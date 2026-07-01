import { useState, useEffect } from 'react'
import { Plus, Route, X, TrendingUp, TrendingDown, MapPin, Bell, ChevronDown, Fuel } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/lib/store'
import { addLembrete } from '@/lib/db'
import type { RegistroRota } from '@/lib/types'
import toast from 'react-hot-toast'

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

const emptyForm = {
  nome: '',
  origem: '',
  destino: '',
  distanciaKm: '',
  custoTotal: '',
  receitaTotal: '',
  motorista: '',
  data: '',
  veiculoId: '',
}

export default function RotasScreen() {
  const user = useStore((s) => s.user)
  const veiculos = useStore((s) => s.veiculos)
  const addLembreteLocal = useStore((s) => s.addLembreteLocal)
  const uid = user?.uid ?? ''

  const [rotas, setRotas] = useState<RegistroRota[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })

  const [showAvisoSheet, setShowAvisoSheet] = useState(false)
  const [avisoRota, setAvisoRota] = useState<RegistroRota | null>(null)
  const [avisoVeiculoId, setAvisoVeiculoId] = useState('')
  const [avisoData, setAvisoData] = useState('')
  const [avisoTipo, setAvisoTipo] = useState<'revisao' | 'custom'>('revisao')
  const [savingAviso, setSavingAviso] = useState(false)

  useEffect(() => {
    if (!uid) return
    const raw = localStorage.getItem(`zellu_rotas_${uid}`)
    setRotas(raw ? (JSON.parse(raw) as RegistroRota[]) : [])
  }, [uid])

  function save(updated: RegistroRota[]) {
    setRotas(updated)
    localStorage.setItem(`zellu_rotas_${uid}`, JSON.stringify(updated))
  }

  const now = new Date()
  const sorted = [...rotas].sort((a, b) => {
    const da = parseDate(a.data)?.getTime() ?? 0
    const db = parseDate(b.data)?.getTime() ?? 0
    return db - da
  })

  const thisMonth = rotas.filter((r) => isCurrentMonth(r.data, now))
  const totalLucroMes = thisMonth.reduce((s, r) => s + (r.receitaTotal - r.custoTotal), 0)
  const totalKmMes = thisMonth.reduce((s, r) => s + (r.distanciaKm ?? 0), 0)
  const totalCustoMes = thisMonth.reduce((s, r) => s + r.custoTotal, 0)
  const custoPorKm = totalKmMes > 0 ? totalCustoMes / totalKmMes : 0

  const bestRota = rotas.length
    ? rotas.reduce((best, r) =>
        r.receitaTotal - r.custoTotal > best.receitaTotal - best.custoTotal ? r : best,
      )
    : null

  function submit() {
    if (!form.nome || !form.origem || !form.destino || !form.custoTotal || !form.receitaTotal) return
    const nova: RegistroRota = {
      id: crypto.randomUUID(),
      nome: form.nome,
      origem: form.origem,
      destino: form.destino,
      distanciaKm: Number(form.distanciaKm),
      custoTotal: Number(form.custoTotal),
      receitaTotal: Number(form.receitaTotal),
      motorista: form.motorista,
      data: form.data,
      veiculoId: form.veiculoId || undefined,
      userId: uid,
      criadoEm: Date.now(),
    }
    save([nova, ...rotas])
    setShowForm(false)
    setForm({ ...emptyForm })
  }

  function remove(id: string) {
    save(rotas.filter((r) => r.id !== id))
  }

  function abrirAvisoSheet(rota: RegistroRota) {
    setAvisoRota(rota)
    setAvisoVeiculoId(rota.veiculoId ?? veiculos[0]?.id ?? '')
    const d = new Date()
    d.setDate(d.getDate() + 30)
    setAvisoData(d.toISOString().slice(0, 10))
    setShowAvisoSheet(true)
  }

  async function criarAviso() {
    if (!avisoRota || !avisoVeiculoId || !avisoData) return
    setSavingAviso(true)
    try {
      const titulo = avisoTipo === 'revisao'
        ? `Revisão após rota: ${avisoRota.nome}`
        : `Manutenção — ${avisoRota.nome}`
      const lembrete = await addLembrete(uid, {
        veiculoId: avisoVeiculoId,
        titulo,
        peca: 'Revisão de rota',
        dataLimite: avisoData,
        kmLimite: '',
        tipo: 'REVISAO',
        valor: 0,
        horaAviso: '08:00',
        estabelecimentoNome: '',
        concluido: false,
      })
      addLembreteLocal(lembrete)
      toast.success('Aviso criado com sucesso!')
      setShowAvisoSheet(false)
      setAvisoRota(null)
    } catch {
      toast.error('Erro ao criar aviso.')
    } finally {
      setSavingAviso(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-32 pt-6 sm:px-6">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#fbbf24]">Zellu Premium</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#f4f7ff]">Análise de Rotas</h1>
        <p className="mt-2 text-sm leading-6 text-[#8fa0b9]">Acompanhe a lucratividade e os custos por rota.</p>
      </header>

      {/* Métricas do mês */}
      <section className="mt-5 grid grid-cols-2 gap-3">
        <div className={`rounded-2xl border p-4 ${totalLucroMes >= 0 ? 'border-[#4ade80]/20 bg-[#4ade80]/[0.06]' : 'border-[#f87171]/20 bg-[#f87171]/[0.06]'}`}>
          {totalLucroMes >= 0
            ? <TrendingUp size={19} className="text-[#4ade80]" />
            : <TrendingDown size={19} className="text-[#f87171]" />}
          <p className={`mt-3 text-lg font-semibold ${totalLucroMes >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
            {currencyFormatter.format(totalLucroMes)}
          </p>
          <p className="mt-1 text-[11px] text-[#8392a9]">Lucro este mês</p>
        </div>
        <div className="rounded-2xl border border-[#203653] bg-[#101d32] p-4">
          <Route size={19} className="text-[#70a7ff]" />
          <p className="mt-3 text-lg font-semibold text-white">{thisMonth.length}</p>
          <p className="mt-1 text-[11px] text-[#8392a9]">Rotas este mês</p>
        </div>
      </section>

      {/* Métricas secundárias */}
      <section className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[#203653] bg-[#101d32] p-3">
          <div className="flex items-center gap-2">
            <MapPin size={15} className="text-[#70a7ff]" />
            <p className="text-xs text-[#8392a9]">KM este mês</p>
          </div>
          <p className="mt-2 text-base font-semibold text-[#f4f7ff]">{totalKmMes.toLocaleString('pt-BR')} km</p>
        </div>
        <div className="rounded-2xl border border-[#203653] bg-[#101d32] p-3">
          <div className="flex items-center gap-2">
            <Fuel size={15} className="text-[#70a7ff]" />
            <p className="text-xs text-[#8392a9]">Custo por km</p>
          </div>
          <p className="mt-2 text-base font-semibold text-[#f4f7ff]">
            {custoPorKm > 0 ? currencyFormatter.format(custoPorKm) : '—'}
          </p>
        </div>
      </section>

      {bestRota && (
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-[#203653] bg-[#0d192c] px-4 py-3">
          <span className="text-xs text-[#8392a9]">Melhor rota</span>
          <strong className="text-sm text-[#dce7f8]">{bestRota.nome}</strong>
        </div>
      )}

      {/* Botão nova rota */}
      <button
        type="button"
        onClick={() => { setForm({ ...emptyForm, veiculoId: veiculos[0]?.id ?? '' }); setShowForm(true) }}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4f8df7] py-3 text-sm font-semibold text-white active:scale-[0.98]"
      >
        <Plus size={17} /> Nova rota
      </button>

      {/* Lista de rotas */}
      <section className="mt-5 space-y-3">
        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#1e2d44] bg-[#0d1526] px-6 py-12 text-center">
            <Route size={32} className="mx-auto text-[#60708a]" />
            <p className="mt-4 text-sm font-semibold text-[#e7eefb]">Nenhuma rota registrada</p>
            <p className="mt-1 text-xs text-[#66758d]">Adicione rotas para analisar a lucratividade.</p>
          </div>
        ) : (
          sorted.map((rota) => {
            const lucro = rota.receitaTotal - rota.custoTotal
            const margem = rota.receitaTotal > 0 ? (lucro / rota.receitaTotal) * 100 : 0
            const custoKm = (rota.distanciaKm ?? 0) > 0 ? rota.custoTotal / rota.distanciaKm! : null
            const veiculo = veiculos.find((v) => v.id === rota.veiculoId)
            return (
              <div key={rota.id} className="rounded-2xl border border-[#203653] bg-[#101d32] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#f0f4ff]">{rota.nome}</p>
                    <div className="mt-1 flex items-center gap-1 text-xs text-[#8892a4]">
                      <MapPin size={11} />
                      <span>{rota.origem}</span>
                      <span className="text-[#66758d]">→</span>
                      <span>{rota.destino}</span>
                    </div>
                    {veiculo && (
                      <p className="mt-0.5 text-[11px] text-[#66758d]">{veiculo.nome} — {veiculo.modelo}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => abrirAvisoSheet(rota)}
                      title="Criar aviso"
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#1e2d44] text-[#66758d] hover:text-[#fbbf24] active:scale-95"
                    >
                      <Bell size={14} />
                    </button>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${lucro >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                        {currencyFormatter.format(lucro)}
                      </p>
                      <p className="text-[10px] text-[#66758d]">{margem.toFixed(1)}% margem</p>
                    </div>
                    <button type="button" onClick={() => remove(rota.id)} className="text-[#66758d] hover:text-[#f87171]">
                      <X size={15} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  <div className="rounded-xl bg-[#0b1627] px-3 py-2">
                    <p className="text-[10px] text-[#66758d]">Custo</p>
                    <p className="mt-0.5 text-xs font-semibold text-[#dce7f8]">{currencyFormatter.format(rota.custoTotal)}</p>
                  </div>
                  <div className="rounded-xl bg-[#0b1627] px-3 py-2">
                    <p className="text-[10px] text-[#66758d]">Receita</p>
                    <p className="mt-0.5 text-xs font-semibold text-[#dce7f8]">{currencyFormatter.format(rota.receitaTotal)}</p>
                  </div>
                  {custoKm !== null && (
                    <div className="rounded-xl bg-[#0b1627] px-3 py-2">
                      <p className="text-[10px] text-[#66758d]">R$/km</p>
                      <p className="mt-0.5 text-xs font-semibold text-[#dce7f8]">{currencyFormatter.format(custoKm)}</p>
                    </div>
                  )}
                  <div className="rounded-xl bg-[#0b1627] px-3 py-2">
                    <p className="text-[10px] text-[#66758d]">Data</p>
                    <p className="mt-0.5 text-xs font-semibold text-[#dce7f8]">{rota.data || '—'}</p>
                  </div>
                </div>
                {rota.motorista && (
                  <p className="mt-2 text-[11px] text-[#66758d]">Motorista: {rota.motorista}</p>
                )}
              </div>
            )
          })
        )}
      </section>

      {/* ── Modal: Nova rota ── */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60" onClick={() => setShowForm(false)} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-2xl overflow-y-auto rounded-t-3xl border-t border-[#203653] bg-[#0d1526] px-5 pb-8 pt-5"
              style={{ maxHeight: '90dvh' }}
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#f4f7ff]">Nova rota</h2>
                <button type="button" onClick={() => setShowForm(false)} className="text-[#66758d]"><X size={20} /></button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-[#8892a4]">Nome da rota</label>
                  <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    placeholder="Ex: São Paulo → Campinas"
                    className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-[#8892a4]">Origem</label>
                    <input value={form.origem} onChange={(e) => setForm((f) => ({ ...f, origem: e.target.value }))}
                      placeholder="Ex: São Paulo"
                      className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#8892a4]">Destino</label>
                    <input value={form.destino} onChange={(e) => setForm((f) => ({ ...f, destino: e.target.value }))}
                      placeholder="Ex: Campinas"
                      className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#8892a4]">Distância (km)</label>
                  <input type="number" value={form.distanciaKm} onChange={(e) => setForm((f) => ({ ...f, distanciaKm: e.target.value }))}
                    placeholder="Ex: 98"
                    className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-[#8892a4]">Custo total (R$)</label>
                    <input type="number" step="0.01" value={form.custoTotal} onChange={(e) => setForm((f) => ({ ...f, custoTotal: e.target.value }))}
                      placeholder="Ex: 250.00"
                      className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#8892a4]">Receita total (R$)</label>
                    <input type="number" step="0.01" value={form.receitaTotal} onChange={(e) => setForm((f) => ({ ...f, receitaTotal: e.target.value }))}
                      placeholder="Ex: 500.00"
                      className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#8892a4]">Motorista (opcional)</label>
                  <input value={form.motorista} onChange={(e) => setForm((f) => ({ ...f, motorista: e.target.value }))}
                    placeholder="Ex: João Silva"
                    className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]" />
                </div>
                {veiculos.length > 0 && (
                  <div>
                    <label className="mb-1 block text-xs text-[#8892a4]">Veículo</label>
                    <div className="relative">
                      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#66758d]" />
                      <select value={form.veiculoId} onChange={(e) => setForm((f) => ({ ...f, veiculoId: e.target.value }))}
                        className="w-full appearance-none rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]">
                        <option value="">Nenhum</option>
                        {veiculos.map((v) => <option key={v.id} value={v.id}>{v.nome} — {v.modelo}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs text-[#8892a4]">Data</label>
                  <input type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                    className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]" />
                </div>
              </div>

              <button type="button" onClick={submit}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4f8df7] py-3 text-sm font-semibold text-white active:scale-[0.98]">
                Registrar rota
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Modal: Criar aviso de manutenção ── */}
      <AnimatePresence>
        {showAvisoSheet && avisoRota && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60" onClick={() => setShowAvisoSheet(false)} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-2xl rounded-t-3xl border-t border-[#203653] bg-[#0d1526] px-5 pb-8 pt-5"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#f4f7ff]">Criar aviso de manutenção</h2>
                <button type="button" onClick={() => setShowAvisoSheet(false)} className="text-[#66758d]"><X size={20} /></button>
              </div>

              <div className="mb-4 rounded-xl border border-[#4f8df7]/25 bg-[#4f8df7]/[0.06] px-4 py-3">
                <p className="text-xs text-[#70a7ff]">Rota: <strong>{avisoRota.nome}</strong></p>
                <p className="text-xs text-[#8892a4] mt-0.5">
                  {avisoRota.origem} → {avisoRota.destino}
                  {(avisoRota.distanciaKm ?? 0) > 0 && ` · ${avisoRota.distanciaKm} km`}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-2 block text-xs text-[#8892a4]">Tipo de aviso</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['revisao', 'custom'] as const).map((tipo) => (
                      <button key={tipo} type="button" onClick={() => setAvisoTipo(tipo)}
                        className={`rounded-xl border py-2.5 text-xs font-medium transition-colors ${
                          avisoTipo === tipo ? 'border-[#4f8df7] bg-[#4f8df7]/10 text-white' : 'border-[#1e2d44] text-[#8892a4]'
                        }`}>
                        {tipo === 'revisao' ? 'Revisão pós-rota' : 'Manutenção geral'}
                      </button>
                    ))}
                  </div>
                </div>

                {veiculos.length > 0 && (
                  <div>
                    <label className="mb-1 block text-xs text-[#8892a4]">Veículo</label>
                    <div className="relative">
                      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#66758d]" />
                      <select value={avisoVeiculoId} onChange={(e) => setAvisoVeiculoId(e.target.value)}
                        className="w-full appearance-none rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]">
                        {veiculos.map((v) => <option key={v.id} value={v.id}>{v.nome} — {v.modelo}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs text-[#8892a4]">Data limite</label>
                  <input type="date" value={avisoData} onChange={(e) => setAvisoData(e.target.value)}
                    className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]" />
                </div>
              </div>

              <button type="button" onClick={criarAviso} disabled={savingAviso || !avisoVeiculoId || !avisoData}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4f8df7] py-3 text-sm font-semibold text-white disabled:opacity-60 active:scale-[0.98]">
                <Bell size={16} /> {savingAviso ? 'Criando...' : 'Criar aviso'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  )
}
