import { useState, useEffect } from 'react'
import { Plus, Package, X, AlertTriangle, Trash2, Minus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/lib/store'
import type { ItemEstoque } from '@/lib/types'

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const emptyForm = {
  nome: '',
  categoria: '',
  quantidade: '',
  quantidadeMinima: '',
  precoUnitario: '',
}

export default function EstoqueScreen() {
  const user = useStore((s) => s.user)
  const uid = user?.uid ?? ''

  const [itens, setItens] = useState<ItemEstoque[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })

  useEffect(() => {
    if (!uid) return
    const raw = localStorage.getItem(`zellu_estoque_${uid}`)
    setItens(raw ? (JSON.parse(raw) as ItemEstoque[]) : [])
  }, [uid])

  function save(updated: ItemEstoque[]) {
    setItens(updated)
    localStorage.setItem(`zellu_estoque_${uid}`, JSON.stringify(updated))
  }

  const sorted = [...itens].sort((a, b) => {
    const aLow = a.quantidade <= a.quantidadeMinima ? 0 : 1
    const bLow = b.quantidade <= b.quantidadeMinima ? 0 : 1
    if (aLow !== bLow) return aLow - bLow
    return a.nome.localeCompare(b.nome)
  })

  const lowStock = itens.filter((i) => i.quantidade <= i.quantidadeMinima)
  const totalValue = itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0)

  function submit() {
    if (!form.nome || !form.quantidade || !form.quantidadeMinima) return
    const novo: ItemEstoque = {
      id: crypto.randomUUID(),
      nome: form.nome,
      categoria: form.categoria,
      quantidade: Number(form.quantidade),
      quantidadeMinima: Number(form.quantidadeMinima),
      precoUnitario: Number(form.precoUnitario) || 0,
      userId: uid,
      criadoEm: Date.now(),
    }
    save([...itens, novo])
    setShowForm(false)
    setForm({ ...emptyForm })
  }

  function adjustQty(id: string, delta: number) {
    save(itens.map((i) => i.id === id ? { ...i, quantidade: Math.max(0, i.quantidade + delta) } : i))
  }

  function remove(id: string) {
    save(itens.filter((i) => i.id !== id))
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-32 pt-6 sm:px-6">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#fbbf24]">Zellu Premium</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#f4f7ff]">Estoque de Peças</h1>
        <p className="mt-2 text-sm leading-6 text-[#8fa0b9]">Gerencie o inventário de peças e suprimentos.</p>
      </header>

      {/* Summary */}
      <section className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-[#203653] bg-[#101d32] p-3 text-center">
          <p className="text-lg font-semibold text-[#f4f7ff]">{itens.length}</p>
          <p className="mt-0.5 text-[11px] text-[#8392a9]">Itens</p>
        </div>
        <div className={`rounded-2xl border p-3 text-center ${lowStock.length > 0 ? 'border-[#f87171]/20 bg-[#f87171]/[0.06]' : 'border-[#203653] bg-[#101d32]'}`}>
          <p className={`text-lg font-semibold ${lowStock.length > 0 ? 'text-[#f87171]' : 'text-[#f4f7ff]'}`}>{lowStock.length}</p>
          <p className="mt-0.5 text-[11px] text-[#8392a9]">Estoque baixo</p>
        </div>
        <div className="rounded-2xl border border-[#4ade80]/20 bg-[#4ade80]/[0.06] p-3 text-center">
          <p className="text-lg font-semibold text-[#4ade80]">{currencyFormatter.format(totalValue)}</p>
          <p className="mt-0.5 text-[11px] text-[#8392a9]">Valor total</p>
        </div>
      </section>

      {/* Add button */}
      <button
        type="button"
        onClick={() => { setForm({ ...emptyForm }); setShowForm(true) }}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4f8df7] py-3 text-sm font-semibold text-white active:scale-[0.98]"
      >
        <Plus size={17} /> Adicionar item
      </button>

      {/* Items list */}
      <section className="mt-5 space-y-3">
        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#1e2d44] bg-[#0d1526] px-6 py-12 text-center">
            <Package size={32} className="mx-auto text-[#60708a]" />
            <p className="mt-4 text-sm font-semibold text-[#e7eefb]">Estoque vazio</p>
            <p className="mt-1 text-xs text-[#66758d]">Adicione peças e suprimentos ao inventário.</p>
          </div>
        ) : (
          sorted.map((item) => {
            const isLow = item.quantidade <= item.quantidadeMinima
            return (
              <div key={item.id} className={`rounded-2xl border p-4 ${isLow ? 'border-[#f87171]/30 bg-[#f87171]/[0.04]' : 'border-[#203653] bg-[#101d32]'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {isLow && <AlertTriangle size={15} className="shrink-0 text-[#f87171]" />}
                    {!isLow && <Package size={15} className="shrink-0 text-[#70a7ff]" />}
                    <div>
                      <p className="text-sm font-semibold text-[#f0f4ff]">{item.nome}</p>
                      {item.categoria && <p className="text-xs text-[#8892a4]">{item.categoria}</p>}
                    </div>
                  </div>
                  <button type="button" onClick={() => remove(item.id)} className="text-[#66758d] hover:text-[#f87171]">
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => adjustQty(item.id, -1)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#1e2d44] bg-[#0d1526] text-[#aeb8ca] active:scale-[0.95]"
                    >
                      <Minus size={14} />
                    </button>
                    <span className={`text-lg font-semibold ${isLow ? 'text-[#f87171]' : 'text-[#f0f4ff]'}`}>{item.quantidade}</span>
                    <button
                      type="button"
                      onClick={() => adjustQty(item.id, 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#1e2d44] bg-[#0d1526] text-[#aeb8ca] active:scale-[0.95]"
                    >
                      <Plus size={14} />
                    </button>
                    <span className="text-xs text-[#66758d]">mín: {item.quantidadeMinima}</span>
                  </div>
                  {item.precoUnitario > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-[#66758d]">Valor total</p>
                      <p className="text-sm font-semibold text-[#dce7f8]">{currencyFormatter.format(item.quantidade * item.precoUnitario)}</p>
                    </div>
                  )}
                </div>

                {item.precoUnitario > 0 && (
                  <p className="mt-1 text-[11px] text-[#66758d]">{currencyFormatter.format(item.precoUnitario)}/unid.</p>
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
              className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-2xl rounded-t-3xl border-t border-[#203653] bg-[#0d1526] px-5 pb-8 pt-5"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#f4f7ff]">Adicionar item</h2>
                <button type="button" onClick={() => setShowForm(false)} className="text-[#66758d]"><X size={20} /></button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-[#8892a4]">Nome do item</label>
                  <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: Óleo 5W30" className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#8892a4]">Categoria</label>
                  <input value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))} placeholder="Ex: Lubrificantes" className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-[#8892a4]">Quantidade</label>
                    <input type="number" value={form.quantidade} onChange={(e) => setForm((f) => ({ ...f, quantidade: e.target.value }))} placeholder="Ex: 10" className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#8892a4]">Qtd. mínima</label>
                    <input type="number" value={form.quantidadeMinima} onChange={(e) => setForm((f) => ({ ...f, quantidadeMinima: e.target.value }))} placeholder="Ex: 3" className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#8892a4]">Preço unitário (R$)</label>
                  <input type="number" step="0.01" value={form.precoUnitario} onChange={(e) => setForm((f) => ({ ...f, precoUnitario: e.target.value }))} placeholder="Ex: 45.90" className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]" />
                </div>
              </div>

              <button type="button" onClick={submit} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4f8df7] py-3 text-sm font-semibold text-white active:scale-[0.98]">
                Adicionar item
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  )
}
