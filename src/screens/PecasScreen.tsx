import { useState, useEffect } from 'react'
import { Plus, Wrench, X, ChevronDown, AlertTriangle, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/lib/store'
import type { RegistroPeca } from '@/lib/types'

function wearColor(pct: number) {
  if (pct >= 85) return '#f87171'
  if (pct >= 60) return '#fbbf24'
  return '#4ade80'
}

function WearBar({ pct }: { pct: number }) {
  const capped = Math.min(pct, 100)
  const color = wearColor(pct)
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#1e2d44]">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${capped}%`, backgroundColor: color }}
      />
    </div>
  )
}

const emptyForm = {
  nome: '',
  marca: '',
  kmInstalado: '',
  kmVidaUtil: '',
  dataInstalacao: '',
}

export default function PecasScreen() {
  const user = useStore((s) => s.user)
  const veiculos = useStore((s) => s.veiculos)
  const uid = user?.uid ?? ''

  const [veiculoId, setVeiculoId] = useState('')
  const [pecas, setPecas] = useState<RegistroPeca[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })

  useEffect(() => {
    if (veiculos.length > 0 && !veiculoId) setVeiculoId(veiculos[0].id)
  }, [veiculos, veiculoId])

  useEffect(() => {
    if (!uid) return
    const raw = localStorage.getItem(`zellu_pecas_${uid}`)
    setPecas(raw ? (JSON.parse(raw) as RegistroPeca[]) : [])
  }, [uid])

  function save(updated: RegistroPeca[]) {
    setPecas(updated)
    localStorage.setItem(`zellu_pecas_${uid}`, JSON.stringify(updated))
  }

  const veiculo = veiculos.find((v) => v.id === veiculoId)
  const kmAtual = veiculo?.kmAtual ?? 0
  const pecasVeiculo = pecas.filter((p) => p.veiculoId === veiculoId)

  const warnings = pecasVeiculo.filter((p) => {
    const pct = p.kmVidaUtil > 0 ? ((kmAtual - p.kmInstalado) / p.kmVidaUtil) * 100 : 0
    return pct >= 60 && pct < 85
  })
  const critical = pecasVeiculo.filter((p) => {
    const pct = p.kmVidaUtil > 0 ? ((kmAtual - p.kmInstalado) / p.kmVidaUtil) * 100 : 0
    return pct >= 85
  })

  function submit() {
    if (!form.nome || !form.kmInstalado || !form.kmVidaUtil) return
    const nova: RegistroPeca = {
      id: crypto.randomUUID(),
      veiculoId,
      nome: form.nome,
      marca: form.marca,
      kmInstalado: Number(form.kmInstalado),
      kmVidaUtil: Number(form.kmVidaUtil),
      dataInstalacao: form.dataInstalacao,
      userId: uid,
      criadoEm: Date.now(),
    }
    save([...pecas, nova])
    setShowForm(false)
    setForm({ ...emptyForm })
  }

  function remove(id: string) {
    save(pecas.filter((p) => p.id !== id))
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-32 pt-6 sm:px-6">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#fbbf24]">Zellu Premium</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#f4f7ff]">Peças e Componentes</h1>
        <p className="mt-2 text-sm leading-6 text-[#8fa0b9]">Monitore o desgaste de peças e componentes por veículo.</p>
      </header>

      {/* Vehicle selector */}
      <div className="mt-5 relative">
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#66758d]" />
        <select
          value={veiculoId}
          onChange={(e) => setVeiculoId(e.target.value)}
          className="w-full appearance-none rounded-2xl border border-[#1e2d44] bg-[#0d1526] px-4 py-3 text-sm text-[#f0f4ff] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]"
        >
          {veiculos.length === 0 && <option value="">Nenhum veículo cadastrado</option>}
          {veiculos.map((v) => (
            <option key={v.id} value={v.id}>{v.nome} — {v.modelo}</option>
          ))}
        </select>
      </div>

      {/* Summary */}
      {veiculoId && (
        <section className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-[#203653] bg-[#101d32] p-3 text-center">
            <p className="text-lg font-semibold text-[#f4f7ff]">{pecasVeiculo.length}</p>
            <p className="mt-0.5 text-[11px] text-[#8392a9]">Monitoradas</p>
          </div>
          <div className="rounded-2xl border border-[#f59e0b]/20 bg-[#f59e0b]/[0.06] p-3 text-center">
            <p className="text-lg font-semibold text-[#fbbf24]">{warnings.length}</p>
            <p className="mt-0.5 text-[11px] text-[#8392a9]">Atenção</p>
          </div>
          <div className="rounded-2xl border border-[#f87171]/20 bg-[#f87171]/[0.06] p-3 text-center">
            <p className="text-lg font-semibold text-[#f87171]">{critical.length}</p>
            <p className="mt-0.5 text-[11px] text-[#8392a9]">Críticas</p>
          </div>
        </section>
      )}

      {/* Add button */}
      {veiculoId && (
        <button
          type="button"
          onClick={() => { setForm({ ...emptyForm }); setShowForm(true) }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4f8df7] py-3 text-sm font-semibold text-white active:scale-[0.98]"
        >
          <Plus size={17} /> Adicionar peça
        </button>
      )}

      {/* Parts list */}
      {veiculoId && (
        <section className="mt-5 space-y-3">
          {pecasVeiculo.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#1e2d44] bg-[#0d1526] px-6 py-12 text-center">
              <Wrench size={32} className="mx-auto text-[#60708a]" />
              <p className="mt-4 text-sm font-semibold text-[#e7eefb]">Nenhuma peça cadastrada</p>
              <p className="mt-1 text-xs text-[#66758d]">Adicione peças para monitorar o desgaste.</p>
            </div>
          ) : (
            pecasVeiculo.map((peca) => {
              const pct = peca.kmVidaUtil > 0 ? Math.max(0, Math.min(100, ((kmAtual - peca.kmInstalado) / peca.kmVidaUtil) * 100)) : 0
              const color = wearColor(pct)
              return (
                <div key={peca.id} className="rounded-2xl border border-[#203653] bg-[#101d32] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Wrench size={18} style={{ color }} />
                      <div>
                        <p className="text-sm font-semibold text-[#f0f4ff]">{peca.nome}</p>
                        <p className="text-xs text-[#8892a4]">{peca.marca || 'Sem marca'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {pct >= 85 && <AlertTriangle size={14} className="text-[#f87171]" />}
                      <span className="text-xs font-semibold" style={{ color }}>{Math.round(pct)}%</span>
                      <button type="button" onClick={() => remove(peca.id)} className="text-[#f87171]">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <WearBar pct={pct} />
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-[#0b1627] px-3 py-2">
                      <p className="text-[10px] text-[#66758d]">KM instalado</p>
                      <p className="mt-0.5 text-xs font-semibold text-[#dce7f8]">{peca.kmInstalado.toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="rounded-xl bg-[#0b1627] px-3 py-2">
                      <p className="text-[10px] text-[#66758d]">Vida útil</p>
                      <p className="mt-0.5 text-xs font-semibold text-[#dce7f8]">{peca.kmVidaUtil.toLocaleString('pt-BR')} km</p>
                    </div>
                    <div className="rounded-xl bg-[#0b1627] px-3 py-2">
                      <p className="text-[10px] text-[#66758d]">Instalação</p>
                      <p className="mt-0.5 text-xs font-semibold text-[#dce7f8]">{peca.dataInstalacao || '—'}</p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </section>
      )}

      {!veiculoId && veiculos.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-[#1e2d44] bg-[#0d1526] px-6 py-12 text-center">
          <Wrench size={32} className="mx-auto text-[#60708a]" />
          <p className="mt-4 text-sm font-semibold text-[#e7eefb]">Nenhum veículo cadastrado</p>
          <p className="mt-1 text-xs text-[#66758d]">Cadastre um veículo na garagem primeiro.</p>
        </div>
      )}

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
              className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-2xl rounded-t-3xl border-t border-[#203653] bg-[#0d1526] px-5 pb-8 pt-5"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#f4f7ff]">Adicionar peça</h2>
                <button type="button" onClick={() => setShowForm(false)} className="text-[#66758d]"><X size={20} /></button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-[#8892a4]">Nome da peça</label>
                  <input
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    placeholder="Ex: Correia dentada"
                    className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#8892a4]">Marca (opcional)</label>
                  <input
                    value={form.marca}
                    onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))}
                    placeholder="Ex: Gates"
                    className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-[#8892a4]">KM instalado</label>
                    <input
                      type="number"
                      value={form.kmInstalado}
                      onChange={(e) => setForm((f) => ({ ...f, kmInstalado: e.target.value }))}
                      placeholder="Ex: 50000"
                      className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#8892a4]">Vida útil (km)</label>
                    <input
                      type="number"
                      value={form.kmVidaUtil}
                      onChange={(e) => setForm((f) => ({ ...f, kmVidaUtil: e.target.value }))}
                      placeholder="Ex: 60000"
                      className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#8892a4]">Data de instalação</label>
                  <input
                    type="date"
                    value={form.dataInstalacao}
                    onChange={(e) => setForm((f) => ({ ...f, dataInstalacao: e.target.value }))}
                    className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={submit}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4f8df7] py-3 text-sm font-semibold text-white active:scale-[0.98]"
              >
                Adicionar peça
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  )
}
