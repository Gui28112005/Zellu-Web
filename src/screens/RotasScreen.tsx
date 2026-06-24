import { useState, useEffect } from 'react'
import { Plus, Route, X, TrendingUp, TrendingDown, MapPin } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/lib/store'
import type { RegistroRota } from '@/lib/types'

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
}

export default function RotasScreen() {
  const user = useStore((s) => s.user)
  const uid = user?.uid ?? ''

  const [rotas, setRotas] = useState<RegistroRota[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })

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

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-32 pt-6 sm:px-6">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#fbbf24]">Zellu Premium</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#f4f7ff]">Análise de Rotas</h1>
        <p className="mt-2 text-sm leading-6 text-[#8fa0b9]">Acompanhe a lucratividade das suas rotas.</p>
      </header>

      {/* Summary */}
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

      {bestRota && (
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-[#203653] bg-[#0d192c] px-4 py-3">
          <span className="text-xs text-[#8392a9]">Melhor rota</span>
          <strong className="text-sm text-[#dce7f8]">{bestRota.nome}</strong>
        </div>
      )}

      {/* Add button */}
      <button
        type="button"
        onClick={() => { setForm({ ...emptyForm }); setShowForm(true) }}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4f8df7] py-3 text-sm font-semibold text-white active:scale-[0.98]"
      >
        <Plus size={17} /> Nova rota
      </button>

      {/* Routes list */}
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
                  </div>
                  <div className="flex items-center gap-2">
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
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-[#0b1627] px-3 py-2">
                    <p className="text-[10px] text-[#66758d]">Custo</p>
                    <p className="mt-0.5 text-xs font-semibold text-[#dce7f8]">{currencyFormatter.format(rota.custoTotal)}</p>
                  </div>
                  <div className="rounded-xl bg-[#0b1627] px-3 py-2">
                    <p className="text-[10px] text-[#66758d]">Receita</p>
                    <p className="mt-0.5 text-xs font-semibold text-[#dce7f8]">{currencyFormatter.format(rota.receitaTotal)}</p>
                  </div>
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
                <h2 className="text-base font-semibold text-[#f4f7ff]">Nova rota</h2>
                <button type="button" onClick={() => setShowForm(false)} className="text-[#66758d]"><X size={20} /></button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-[#8892a4]">Nome da rota</label>
                  <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: São Paulo → Campinas" className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-[#8892a4]">Origem</label>
                    <input value={form.origem} onChange={(e) => setForm((f) => ({ ...f, origem: e.target.value }))} placeholder="Ex: São Paulo" className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#8892a4]">Destino</label>
                    <input value={form.destino} onChange={(e) => setForm((f) => ({ ...f, destino: e.target.value }))} placeholder="Ex: Campinas" className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#8892a4]">Distância (km)</label>
                  <input type="number" value={form.distanciaKm} onChange={(e) => setForm((f) => ({ ...f, distanciaKm: e.target.value }))} placeholder="Ex: 98" className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-[#8892a4]">Custo total (R$)</label>
                    <input type="number" step="0.01" value={form.custoTotal} onChange={(e) => setForm((f) => ({ ...f, custoTotal: e.target.value }))} placeholder="Ex: 250.00" className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#8892a4]">Receita total (R$)</label>
                    <input type="number" step="0.01" value={form.receitaTotal} onChange={(e) => setForm((f) => ({ ...f, receitaTotal: e.target.value }))} placeholder="Ex: 500.00" className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#8892a4]">Motorista (opcional)</label>
                  <input value={form.motorista} onChange={(e) => setForm((f) => ({ ...f, motorista: e.target.value }))} placeholder="Ex: João Silva" className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#8892a4]">Data</label>
                  <input type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]" />
                </div>
              </div>

              <button type="button" onClick={submit} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4f8df7] py-3 text-sm font-semibold text-white active:scale-[0.98]">
                Registrar rota
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  )
}
