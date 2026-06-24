import { useState, useEffect } from 'react'
import { Plus, Torus, X, ChevronDown, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/lib/store'
import type { RegistroPneu, PosicaoPneu } from '@/lib/types'

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const POSICOES: { value: PosicaoPneu; label: string }[] = [
  { value: 'DD', label: 'Dianteiro Direito' },
  { value: 'DE', label: 'Dianteiro Esquerdo' },
  { value: 'TD', label: 'Traseiro Direito' },
  { value: 'TE', label: 'Traseiro Esquerdo' },
  { value: 'ESTEPE', label: 'Estepe' },
]

function wearColor(pct: number) {
  if (pct >= 80) return '#f87171'
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
  posicao: 'DD' as PosicaoPneu,
  marca: '',
  modelo: '',
  kmInstalado: '',
  kmVidaUtil: '',
  dataInstalacao: '',
}

export default function PneusScreen() {
  const user = useStore((s) => s.user)
  const veiculos = useStore((s) => s.veiculos)
  const uid = user?.uid ?? ''

  const [veiculoId, setVeiculoId] = useState('')
  const [pneus, setPneus] = useState<RegistroPneu[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })

  useEffect(() => {
    if (veiculos.length > 0 && !veiculoId) setVeiculoId(veiculos[0].id)
  }, [veiculos, veiculoId])

  useEffect(() => {
    if (!uid) return
    const raw = localStorage.getItem(`zellu_pneus_${uid}`)
    setPneus(raw ? (JSON.parse(raw) as RegistroPneu[]) : [])
  }, [uid])

  function save(updated: RegistroPneu[]) {
    setPneus(updated)
    localStorage.setItem(`zellu_pneus_${uid}`, JSON.stringify(updated))
  }

  const veiculo = veiculos.find((v) => v.id === veiculoId)
  const kmAtual = veiculo?.kmAtual ?? 0
  const pneusVeiculo = pneus.filter((p) => p.veiculoId === veiculoId)

  function openAdd() {
    setEditingId(null)
    setForm({ ...emptyForm })
    setShowForm(true)
  }

  function openEdit(p: RegistroPneu) {
    setEditingId(p.id)
    setForm({
      posicao: p.posicao,
      marca: p.marca,
      modelo: p.modelo,
      kmInstalado: String(p.kmInstalado),
      kmVidaUtil: String(p.kmVidaUtil),
      dataInstalacao: p.dataInstalacao,
    })
    setShowForm(true)
  }

  function submit() {
    if (!form.marca || !form.modelo || !form.kmInstalado || !form.kmVidaUtil) return
    if (editingId) {
      const updated = pneus.map((p) =>
        p.id === editingId
          ? {
              ...p,
              posicao: form.posicao,
              marca: form.marca,
              modelo: form.modelo,
              kmInstalado: Number(form.kmInstalado),
              kmVidaUtil: Number(form.kmVidaUtil),
              dataInstalacao: form.dataInstalacao,
            }
          : p,
      )
      save(updated)
    } else {
      const novo: RegistroPneu = {
        id: crypto.randomUUID(),
        veiculoId,
        posicao: form.posicao,
        marca: form.marca,
        modelo: form.modelo,
        kmInstalado: Number(form.kmInstalado),
        kmVidaUtil: Number(form.kmVidaUtil),
        dataInstalacao: form.dataInstalacao,
        userId: uid,
        criadoEm: Date.now(),
      }
      save([...pneus, novo])
    }
    setShowForm(false)
  }

  function remove(id: string) {
    save(pneus.filter((p) => p.id !== id))
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-32 pt-6 sm:px-6">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#fbbf24]">Zellu Premium</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#f4f7ff]">Controle de Pneus</h1>
        <p className="mt-2 text-sm leading-6 text-[#8fa0b9]">Acompanhe o desgaste dos pneus por posição.</p>
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
            <option key={v.id} value={v.id}>
              {v.nome} — {v.modelo}
            </option>
          ))}
        </select>
      </div>

      {/* Add button */}
      {veiculoId && (
        <button
          type="button"
          onClick={openAdd}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4f8df7] py-3 text-sm font-semibold text-white active:scale-[0.98]"
        >
          <Plus size={17} /> Adicionar pneu
        </button>
      )}

      {/* Tire cards */}
      {veiculoId && (
        <section className="mt-5 space-y-3">
          {POSICOES.map((pos) => {
            const pneu = pneusVeiculo.find((p) => p.posicao === pos.value)
            if (!pneu) {
              return (
                <div
                  key={pos.value}
                  className="flex items-center justify-between rounded-2xl border border-dashed border-[#1e2d44] bg-[#0d1526] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Torus size={18} className="text-[#66758d]" />
                    <div>
                      <p className="text-sm font-medium text-[#aeb8ca]">{pos.label}</p>
                      <p className="text-xs text-[#66758d]">Não cadastrado</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null)
                      setForm({ ...emptyForm, posicao: pos.value })
                      setShowForm(true)
                    }}
                    className="rounded-xl border border-[#1e2d44] bg-[#101d32] px-3 py-1.5 text-xs text-[#8892a4] active:scale-[0.97]"
                  >
                    Cadastrar
                  </button>
                </div>
              )
            }
            const desgaste = pneu.kmVidaUtil > 0 ? ((kmAtual - pneu.kmInstalado) / pneu.kmVidaUtil) * 100 : 0
            const pct = Math.max(0, Math.min(100, desgaste))
            const color = wearColor(pct)
            return (
              <div
                key={pos.value}
                className="rounded-2xl border border-[#203653] bg-[#101d32] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Torus size={18} style={{ color }} />
                    <div>
                      <p className="text-sm font-semibold text-[#f0f4ff]">{pos.label}</p>
                      <p className="text-xs text-[#8892a4]">{pneu.marca} {pneu.modelo}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pct >= 80 && <AlertTriangle size={14} className="text-[#f87171]" />}
                    <span className="text-xs font-semibold" style={{ color }}>{Math.round(pct)}%</span>
                    <button type="button" onClick={() => openEdit(pneu)} className="rounded-xl border border-[#1e2d44] bg-[#0d1526] px-2 py-1 text-[10px] text-[#8892a4] active:scale-[0.97]">Editar</button>
                    <button type="button" onClick={() => remove(pneu.id)} className="rounded-xl border border-[#1e2d44] bg-[#0d1526] px-2 py-1 text-[10px] text-[#f87171] active:scale-[0.97]">X</button>
                  </div>
                </div>
                <WearBar pct={pct} />
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-[#0b1627] px-3 py-2">
                    <p className="text-[10px] text-[#66758d]">KM instalado</p>
                    <p className="mt-0.5 text-xs font-semibold text-[#dce7f8]">{pneu.kmInstalado.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="rounded-xl bg-[#0b1627] px-3 py-2">
                    <p className="text-[10px] text-[#66758d]">Vida útil</p>
                    <p className="mt-0.5 text-xs font-semibold text-[#dce7f8]">{pneu.kmVidaUtil.toLocaleString('pt-BR')} km</p>
                  </div>
                  <div className="rounded-xl bg-[#0b1627] px-3 py-2">
                    <p className="text-[10px] text-[#66758d]">Instalação</p>
                    <p className="mt-0.5 text-xs font-semibold text-[#dce7f8]">{pneu.dataInstalacao || '—'}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </section>
      )}

      {!veiculoId && veiculos.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-[#1e2d44] bg-[#0d1526] px-6 py-12 text-center">
          <Torus size={32} className="mx-auto text-[#60708a]" />
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
                <h2 className="text-base font-semibold text-[#f4f7ff]">{editingId ? 'Editar pneu' : 'Adicionar pneu'}</h2>
                <button type="button" onClick={() => setShowForm(false)} className="text-[#66758d]"><X size={20} /></button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-[#8892a4]">Posição</label>
                  <div className="relative">
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#66758d]" />
                    <select
                      value={form.posicao}
                      onChange={(e) => setForm((f) => ({ ...f, posicao: e.target.value as PosicaoPneu }))}
                      className="w-full appearance-none rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]"
                    >
                      {POSICOES.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-[#8892a4]">Marca</label>
                    <input
                      value={form.marca}
                      onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))}
                      placeholder="Ex: Pirelli"
                      className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#8892a4]">Modelo</label>
                    <input
                      value={form.modelo}
                      onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))}
                      placeholder="Ex: Cinturato P1"
                      className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-[#8892a4]">KM instalado</label>
                    <input
                      type="number"
                      value={form.kmInstalado}
                      onChange={(e) => setForm((f) => ({ ...f, kmInstalado: e.target.value }))}
                      placeholder="Ex: 45000"
                      className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#8892a4]">Vida útil (km)</label>
                    <input
                      type="number"
                      value={form.kmVidaUtil}
                      onChange={(e) => setForm((f) => ({ ...f, kmVidaUtil: e.target.value }))}
                      placeholder="Ex: 40000"
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
                {editingId ? 'Salvar alterações' : 'Adicionar pneu'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  )
}
