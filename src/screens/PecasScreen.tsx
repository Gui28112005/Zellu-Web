import { useState, useEffect, useMemo } from 'react'
import {
  Plus, Package, X, AlertTriangle, Trash2, Minus, Search,
  History, LayoutGrid, List, Bell, ChevronDown, Fuel, Droplets,
  Wrench, SprayCan, ShieldCheck, Box,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/lib/store'
import { addLembrete } from '@/lib/db'
import type { ItemEstoque, MovimentacaoEstoque, TipoMovimentacao, CategoriaEstoque } from '@/lib/types'
import toast from 'react-hot-toast'

const currencyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

// ─── Categorias ──────────────────────────────────────────────────────────────

const CATEGORIAS: { id: CategoriaEstoque; label: string; icon: React.ReactNode; cor: string }[] = [
  { id: 'combustivel',       label: 'Combustível',        icon: <Fuel size={20} />,       cor: '#f97316' },
  { id: 'oleo_lubrificantes',label: 'Óleo e lubrificantes',icon: <Droplets size={20} />,  cor: '#4f8df7' },
  { id: 'consumiveis',       label: 'Consumíveis',        icon: <Wrench size={20} />,     cor: '#a78bfa' },
  { id: 'limpeza',           label: 'Limpeza',            icon: <SprayCan size={20} />,   cor: '#34d399' },
  { id: 'epi_seguranca',     label: 'EPI e Segurança',   icon: <ShieldCheck size={20} />,cor: '#fbbf24' },
  { id: 'outros',            label: 'Outros',             icon: <Box size={20} />,        cor: '#8892a4' },
]

function catById(id: string) {
  return CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS[CATEGORIAS.length - 1]
}

function normalizarCategoria(raw: string): CategoriaEstoque {
  const s = raw.toLowerCase()
  if (/combust|gasolina|etanol|diesel|gnv|arla/.test(s)) return 'combustivel'
  if (/oleo|lubr|graxa/.test(s)) return 'oleo_lubrificantes'
  if (/limpeza|lavagem/.test(s)) return 'limpeza'
  if (/ferramenta|parafuso|porca|fita|cola|consumiv/.test(s)) return 'consumiveis'
  if (/epi|seguranca|cone|colete|luva|oculos|extintor/.test(s)) return 'epi_seguranca'
  return 'outros'
}

// ─── Campos de entrada do formulário ─────────────────────────────────────────

const emptyForm = {
  nome: '',
  categoria: 'outros' as CategoriaEstoque,
  quantidade: '',
  quantidadeMinima: '',
  precoUnitario: '',
  codigoBarras: '',
}

// ─── Helpers de persistência ─────────────────────────────────────────────────

function loadItens(uid: string): ItemEstoque[] {
  try { return JSON.parse(localStorage.getItem(`zellu_pecas_itens_${uid}`) ?? '[]') } catch { return [] }
}
function saveItens(uid: string, data: ItemEstoque[]) {
  localStorage.setItem(`zellu_pecas_itens_${uid}`, JSON.stringify(data))
}
function loadMovs(uid: string): MovimentacaoEstoque[] {
  try { return JSON.parse(localStorage.getItem(`zellu_pecas_movs_${uid}`) ?? '[]') } catch { return [] }
}
function saveMov(uid: string, data: MovimentacaoEstoque[]) {
  localStorage.setItem(`zellu_pecas_movs_${uid}`, JSON.stringify(data.slice(0, 500)))
}

// ─── Componente principal ─────────────────────────────────────────────────────

type TabKey = 'itens' | 'historico' | 'categorias'
type FiltroKey = 'todos' | 'baixo' | 'zerado'

export default function PecasScreen() {
  const user = useStore((s) => s.user)
  const veiculos = useStore((s) => s.veiculos)
  const addLembreteLocal = useStore((s) => s.addLembreteLocal)
  const uid = user?.uid ?? ''

  const [tab, setTab] = useState<TabKey>('itens')
  const [filtro, setFiltro] = useState<FiltroKey>('todos')
  const [busca, setBusca] = useState('')
  const [itens, setItens] = useState<ItemEstoque[]>([])
  const [movs, setMovs] = useState<MovimentacaoEstoque[]>([])

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })

  const [showAvisoSheet, setShowAvisoSheet] = useState(false)
  const [avisoItem, setAvisoItem] = useState<ItemEstoque | null>(null)
  const [avisoVeiculoId, setAvisoVeiculoId] = useState('')
  const [avisoData, setAvisoData] = useState('')
  const [savingAviso, setSavingAviso] = useState(false)

  useEffect(() => {
    if (!uid) return
    setItens(loadItens(uid))
    setMovs(loadMovs(uid))
  }, [uid])

  function persistItem(updated: ItemEstoque[]) {
    setItens(updated)
    saveItens(uid, updated)
  }

  function registrarMov(itemId: string, itemNome: string, tipo: TipoMovimentacao, quantidade: number, detalhes?: string) {
    const nova: MovimentacaoEstoque = {
      id: crypto.randomUUID(),
      itemId,
      itemNome,
      tipo,
      quantidade,
      detalhes,
      criadoEm: Date.now(),
    }
    const updated = [nova, ...movs]
    setMovs(updated)
    saveMov(uid, updated)
  }

  function ajustarQtd(item: ItemEstoque, delta: number) {
    const novaQtd = Math.max(0, item.quantidade + delta)
    const tipo: TipoMovimentacao = delta > 0 ? 'ENTRADA' : 'SAIDA'
    persistItem(itens.map((i) => i.id === item.id ? { ...i, quantidade: novaQtd } : i))
    registrarMov(item.id, item.nome, tipo, Math.abs(delta))
  }

  function submit() {
    if (!form.nome || form.quantidade === '' || form.quantidadeMinima === '') return
    const catNorm = normalizarCategoria(form.categoria)
    const novo: ItemEstoque = {
      id: crypto.randomUUID(),
      nome: form.nome,
      categoria: catNorm,
      quantidade: Number(form.quantidade),
      quantidadeMinima: Number(form.quantidadeMinima),
      precoUnitario: Number(form.precoUnitario) || 0,
      codigoBarras: form.codigoBarras || undefined,
      userId: uid,
      criadoEm: Date.now(),
    }
    const dupl = form.codigoBarras
      ? itens.find((i) => i.codigoBarras && i.codigoBarras === form.codigoBarras)
      : null
    if (dupl) {
      toast.error('Código de barras já cadastrado para outro item.')
      return
    }
    const updated = [novo, ...itens]
    persistItem(updated)
    registrarMov(novo.id, novo.nome, 'ENTRADA', novo.quantidade, 'Cadastro inicial')
    setShowForm(false)
    setForm({ ...emptyForm })
    toast.success('Item adicionado ao estoque.')
  }

  function remover(id: string) {
    persistItem(itens.filter((i) => i.id !== id))
  }

  async function criarAviso() {
    if (!avisoItem || !avisoVeiculoId || !avisoData) return
    setSavingAviso(true)
    try {
      const lembrete = await addLembrete(uid, {
        veiculoId: avisoVeiculoId,
        titulo: `Repor estoque: ${avisoItem.nome}`,
        peca: avisoItem.nome,
        dataLimite: avisoData,
        kmLimite: '',
        tipo: 'OUTROS',
        valor: 0,
        horaAviso: '08:00',
        estabelecimentoNome: '',
        concluido: false,
      })
      addLembreteLocal(lembrete)
      toast.success('Aviso criado com sucesso!')
      setShowAvisoSheet(false)
      setAvisoItem(null)
    } catch {
      toast.error('Erro ao criar aviso.')
    } finally {
      setSavingAviso(false)
    }
  }

  function abrirAvisoSheet(item: ItemEstoque) {
    setAvisoItem(item)
    setAvisoVeiculoId(veiculos[0]?.id ?? '')
    const d = new Date()
    d.setDate(d.getDate() + 7)
    setAvisoData(d.toISOString().slice(0, 10))
    setShowAvisoSheet(true)
  }

  // ─── Filtragem ──────────────────────────────────────────────────────────────

  const itensFiltrados = useMemo(() => {
    let list = [...itens]
    if (busca) list = list.filter((i) => i.nome.toLowerCase().includes(busca.toLowerCase()))
    if (filtro === 'baixo') list = list.filter((i) => i.quantidade > 0 && i.quantidade <= i.quantidadeMinima)
    if (filtro === 'zerado') list = list.filter((i) => i.quantidade === 0)
    return list.sort((a, b) => {
      const aLow = a.quantidade <= a.quantidadeMinima ? 0 : 1
      const bLow = b.quantidade <= b.quantidadeMinima ? 0 : 1
      if (aLow !== bLow) return aLow - bLow
      return a.nome.localeCompare(b.nome)
    })
  }, [itens, busca, filtro])

  const baixoEstoque = itens.filter((i) => i.quantidade <= i.quantidadeMinima && i.quantidade > 0)
  const semEstoque = itens.filter((i) => i.quantidade === 0)
  const totalValor = itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0)

  // ─── Categorias view ────────────────────────────────────────────────────────

  const catStats = CATEGORIAS.map((cat) => {
    const lista = itens.filter((i) => normalizarCategoria(i.categoria) === cat.id)
    return {
      ...cat,
      totalItens: lista.length,
      totalUnidades: lista.reduce((s, i) => s + i.quantidade, 0),
    }
  }).filter((c) => c.totalItens > 0)

  // ─── Histórico agrupado por data ────────────────────────────────────────────

  const movsAgrupados = useMemo(() => {
    const groups: Record<string, MovimentacaoEstoque[]> = {}
    for (const m of movs) {
      const key = new Date(m.criadoEm).toLocaleDateString('pt-BR')
      if (!groups[key]) groups[key] = []
      groups[key].push(m)
    }
    return Object.entries(groups).slice(0, 30)
  }, [movs])

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-32 pt-6 sm:px-6">
      {/* Header */}
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#fbbf24]">Zellu Premium</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#f4f7ff]">Peças e Componentes</h1>
        <p className="mt-2 text-sm leading-6 text-[#8fa0b9]">Gerencie o estoque de peças, insumos e componentes.</p>
      </header>

      {/* Métricas */}
      <section className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-[#203653] bg-[#101d32] p-3 text-center">
          <p className="text-lg font-semibold text-[#f4f7ff]">{itens.length}</p>
          <p className="mt-0.5 text-[11px] text-[#8392a9]">Itens</p>
        </div>
        <div className={`rounded-2xl border p-3 text-center ${baixoEstoque.length > 0 ? 'border-[#fbbf24]/25 bg-[#fbbf24]/[0.06]' : 'border-[#203653] bg-[#101d32]'}`}>
          <p className={`text-lg font-semibold ${baixoEstoque.length > 0 ? 'text-[#fbbf24]' : 'text-[#f4f7ff]'}`}>{baixoEstoque.length}</p>
          <p className="mt-0.5 text-[11px] text-[#8392a9]">Estoque baixo</p>
        </div>
        <div className={`rounded-2xl border p-3 text-center ${semEstoque.length > 0 ? 'border-[#f87171]/25 bg-[#f87171]/[0.06]' : 'border-[#203653] bg-[#101d32]'}`}>
          <p className={`text-lg font-semibold ${semEstoque.length > 0 ? 'text-[#f87171]' : 'text-[#f4f7ff]'}`}>{semEstoque.length}</p>
          <p className="mt-0.5 text-[11px] text-[#8392a9]">Zerados</p>
        </div>
      </section>

      {totalValor > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-[#203653] bg-[#0d192c] px-4 py-3">
          <span className="text-xs text-[#8392a9]">Valor total em estoque</span>
          <strong className="text-sm text-[#4ade80]">{currencyFmt.format(totalValor)}</strong>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-5 flex gap-1 rounded-2xl border border-[#1e2d44] bg-[#0d1526] p-1">
        {([
          { key: 'itens',      label: 'Itens',      icon: <List size={14} /> },
          { key: 'historico',  label: 'Histórico',  icon: <History size={14} /> },
          { key: 'categorias', label: 'Categorias', icon: <LayoutGrid size={14} /> },
        ] as { key: TabKey; label: string; icon: React.ReactNode }[]).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors ${
              tab === t.key
                ? 'bg-[#4f8df7] text-white'
                : 'text-[#8892a4] hover:text-[#f0f4ff]'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Itens ── */}
      {tab === 'itens' && (
        <>
          {/* Busca + Filtro */}
          <div className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#66758d]" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar item..."
                className="w-full rounded-2xl border border-[#1e2d44] bg-[#0d1526] py-2.5 pl-8 pr-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]"
              />
            </div>
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as FiltroKey)}
              className="rounded-2xl border border-[#1e2d44] bg-[#0d1526] px-3 py-2.5 text-xs text-[#f0f4ff] focus:outline-none"
            >
              <option value="todos">Todos</option>
              <option value="baixo">Estoque baixo</option>
              <option value="zerado">Zerados</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => { setForm({ ...emptyForm }); setShowForm(true) }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4f8df7] py-3 text-sm font-semibold text-white active:scale-[0.98]"
          >
            <Plus size={17} /> Adicionar item
          </button>

          <section className="mt-4 space-y-3">
            {itensFiltrados.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#1e2d44] bg-[#0d1526] px-6 py-12 text-center">
                <Package size={32} className="mx-auto text-[#60708a]" />
                <p className="mt-4 text-sm font-semibold text-[#e7eefb]">Nenhum item encontrado</p>
                <p className="mt-1 text-xs text-[#66758d]">Adicione peças e insumos ao estoque.</p>
              </div>
            ) : (
              itensFiltrados.map((item) => {
                const cat = catById(normalizarCategoria(item.categoria))
                const isLow = item.quantidade > 0 && item.quantidade <= item.quantidadeMinima
                const isZero = item.quantidade === 0
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-4 ${
                      isZero ? 'border-[#f87171]/30 bg-[#f87171]/[0.04]' :
                      isLow  ? 'border-[#fbbf24]/25 bg-[#fbbf24]/[0.04]' :
                               'border-[#203653] bg-[#101d32]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `${cat.cor}18`, color: cat.cor }}>
                          {cat.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-[#f0f4ff]">{item.nome}</p>
                            {isZero && <span className="rounded-full bg-[#f87171]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#f87171]">SEM ESTOQUE</span>}
                            {isLow && !isZero && <span className="rounded-full bg-[#fbbf24]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#fbbf24]">BAIXO</span>}
                          </div>
                          <p className="text-[11px] text-[#66758d]">{cat.label}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {(isLow || isZero) && (
                          <button
                            type="button"
                            onClick={() => abrirAvisoSheet(item)}
                            title="Criar aviso de reposição"
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#fbbf24]/30 bg-[#fbbf24]/10 text-[#fbbf24] hover:bg-[#fbbf24]/20 active:scale-95"
                          >
                            <Bell size={14} />
                          </button>
                        )}
                        <button type="button" onClick={() => remover(item.id)} className="flex h-8 w-8 items-center justify-center rounded-xl text-[#66758d] hover:text-[#f87171] active:scale-95">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Controle de quantidade */}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => ajustarQtd(item, -1)}
                          disabled={item.quantidade === 0}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#1e2d44] bg-[#0d1526] text-[#aeb8ca] disabled:opacity-40 active:scale-[0.95]"
                        >
                          <Minus size={14} />
                        </button>
                        <div className="text-center">
                          <span className={`text-xl font-bold ${isZero ? 'text-[#f87171]' : isLow ? 'text-[#fbbf24]' : 'text-[#f0f4ff]'}`}>
                            {item.quantidade}
                          </span>
                          <p className="text-[10px] text-[#66758d]">mín: {item.quantidadeMinima}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => ajustarQtd(item, 1)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#1e2d44] bg-[#0d1526] text-[#aeb8ca] active:scale-[0.95]"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      {item.precoUnitario > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-[#66758d]">{currencyFmt.format(item.precoUnitario)}/un</p>
                          <p className="text-sm font-semibold text-[#4ade80]">{currencyFmt.format(item.quantidade * item.precoUnitario)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </section>
        </>
      )}

      {/* ── TAB: Histórico ── */}
      {tab === 'historico' && (
        <section className="mt-4 space-y-4">
          {movsAgrupados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#1e2d44] bg-[#0d1526] px-6 py-12 text-center">
              <History size={32} className="mx-auto text-[#60708a]" />
              <p className="mt-4 text-sm font-semibold text-[#e7eefb]">Nenhuma movimentação</p>
              <p className="mt-1 text-xs text-[#66758d]">As entradas e saídas de estoque aparecerão aqui.</p>
            </div>
          ) : (
            movsAgrupados.map(([data, lista]) => (
              <div key={data}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#66758d]">{data}</p>
                <div className="space-y-2">
                  {lista.map((m) => {
                    const cor = m.tipo === 'ENTRADA' ? '#4ade80' : m.tipo === 'SAIDA' ? '#f97316' : '#60a5fa'
                    const sinal = m.tipo === 'ENTRADA' ? '+' : m.tipo === 'SAIDA' ? '-' : '~'
                    return (
                      <div key={m.id} className="flex items-center justify-between rounded-xl border border-[#1e2d44] bg-[#0d1526] px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold rounded-lg px-2 py-0.5" style={{ background: `${cor}18`, color: cor }}>
                            {m.tipo}
                          </span>
                          <div>
                            <p className="text-xs font-medium text-[#dce7f8]">{m.itemNome}</p>
                            {m.detalhes && <p className="text-[10px] text-[#66758d]">{m.detalhes}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold" style={{ color: cor }}>{sinal}{m.quantidade}</p>
                          <p className="text-[10px] text-[#66758d]">
                            {new Date(m.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {/* ── TAB: Categorias ── */}
      {tab === 'categorias' && (
        <section className="mt-4">
          {catStats.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#1e2d44] bg-[#0d1526] px-6 py-12 text-center">
              <LayoutGrid size={32} className="mx-auto text-[#60708a]" />
              <p className="mt-4 text-sm font-semibold text-[#e7eefb]">Nenhuma categoria com itens</p>
              <p className="mt-1 text-xs text-[#66758d]">Adicione itens para ver o resumo por categoria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {catStats.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { setTab('itens'); setFiltro('todos'); setBusca('') }}
                  className="rounded-2xl border border-[#203653] bg-[#101d32] p-4 text-left transition-colors hover:border-[#4f8df7]/30 active:scale-[0.97]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl mb-3" style={{ background: `${cat.cor}18`, color: cat.cor }}>
                    {cat.icon}
                  </div>
                  <p className="text-xs font-semibold text-[#f0f4ff]">{cat.label}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div>
                      <p className="text-lg font-bold text-[#f4f7ff]">{cat.totalUnidades}</p>
                      <p className="text-[10px] text-[#66758d]">unidades</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold" style={{ color: cat.cor }}>{cat.totalItens}</p>
                      <p className="text-[10px] text-[#66758d]">itens</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Modal: Adicionar item ── */}
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
                <h2 className="text-base font-semibold text-[#f4f7ff]">Novo item</h2>
                <button type="button" onClick={() => setShowForm(false)} className="text-[#66758d]"><X size={20} /></button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-[#8892a4]">Nome do item</label>
                  <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    placeholder="Ex: Filtro de óleo" className="input-field" />
                </div>

                {/* Seletor de categoria */}
                <div>
                  <label className="mb-2 block text-xs text-[#8892a4]">Categoria</label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIAS.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, categoria: cat.id }))}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-[10px] font-medium transition-colors ${
                          form.categoria === cat.id
                            ? 'border-[#4f8df7] bg-[#4f8df7]/10 text-white'
                            : 'border-[#1e2d44] bg-[#101d32] text-[#8892a4] hover:border-[#4f8df7]/40'
                        }`}
                      >
                        <span style={{ color: form.categoria === cat.id ? cat.cor : undefined }}>{cat.icon}</span>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-[#8892a4]">Quantidade</label>
                    <input type="number" value={form.quantidade} onChange={(e) => setForm((f) => ({ ...f, quantidade: e.target.value }))}
                      placeholder="Ex: 10" className="input-field" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#8892a4]">Qtd. mínima</label>
                    <input type="number" value={form.quantidadeMinima} onChange={(e) => setForm((f) => ({ ...f, quantidadeMinima: e.target.value }))}
                      placeholder="Ex: 3" className="input-field" />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-[#8892a4]">Preço unitário (R$)</label>
                  <input type="number" step="0.01" value={form.precoUnitario} onChange={(e) => setForm((f) => ({ ...f, precoUnitario: e.target.value }))}
                    placeholder="Ex: 45.90" className="input-field" />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-[#8892a4]">Código de barras (opcional)</label>
                  <input value={form.codigoBarras} onChange={(e) => setForm((f) => ({ ...f, codigoBarras: e.target.value.replace(/\D/g, '') }))}
                    placeholder="EAN / GTIN" className="input-field" />
                </div>
              </div>

              <button type="button" onClick={submit}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4f8df7] py-3 text-sm font-semibold text-white active:scale-[0.98]">
                <Plus size={16} /> Adicionar ao estoque
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Modal: Criar aviso de reposição ── */}
      <AnimatePresence>
        {showAvisoSheet && avisoItem && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60" onClick={() => setShowAvisoSheet(false)} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-2xl rounded-t-3xl border-t border-[#203653] bg-[#0d1526] px-5 pb-8 pt-5"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#f4f7ff]">Criar aviso de reposição</h2>
                <button type="button" onClick={() => setShowAvisoSheet(false)} className="text-[#66758d]"><X size={20} /></button>
              </div>

              <div className="mb-4 rounded-xl border border-[#fbbf24]/25 bg-[#fbbf24]/[0.06] px-4 py-3">
                <p className="text-xs text-[#fbbf24]">Item: <strong>{avisoItem.nome}</strong></p>
                <p className="text-xs text-[#8892a4] mt-0.5">Estoque atual: {avisoItem.quantidade} / mínimo: {avisoItem.quantidadeMinima}</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-[#8892a4]">Vincular ao veículo</label>
                  <div className="relative">
                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#66758d]" />
                    <select value={avisoVeiculoId} onChange={(e) => setAvisoVeiculoId(e.target.value)}
                      className="w-full appearance-none rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]">
                      {veiculos.map((v) => <option key={v.id} value={v.id}>{v.nome} — {v.modelo}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#8892a4]">Data limite</label>
                  <input type="date" value={avisoData} onChange={(e) => setAvisoData(e.target.value)}
                    className="w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]" />
                </div>
              </div>

              <button type="button" onClick={criarAviso} disabled={savingAviso || !avisoVeiculoId || !avisoData}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#fbbf24] py-3 text-sm font-semibold text-[#0d1526] disabled:opacity-60 active:scale-[0.98]">
                <Bell size={16} /> {savingAviso ? 'Criando...' : 'Criar aviso'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .input-field {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid #1e2d44;
          background: #101d32;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          color: #f0f4ff;
        }
        .input-field::placeholder { color: #66758d; }
        .input-field:focus { outline: none; box-shadow: 0 0 0 1px #4f8df7; }
      `}</style>
    </main>
  )
}
