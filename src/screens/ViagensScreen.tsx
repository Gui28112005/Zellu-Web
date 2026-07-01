import { useEffect, useMemo, useState } from 'react'
import type React from 'react'
import {
  CalendarDays,
  Camera,
  Car,
  CheckCircle2,
  ChevronDown,
  FileText,
  Flag,
  Fuel,
  Image as ImageIcon,
  Landmark,
  MapPin,
  MoreHorizontal,
  Navigation,
  Pencil,
  ParkingCircle,
  Plus,
  Receipt,
  Route,
  Trash2,
  UserRound,
  Users,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useStore } from '@/lib/store'
import type { CategoriaGasto, GastoViagem, RegistroViagem } from '@/lib/types'
import { saveTravelReport } from '@/lib/pdfReports'

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const CATEGORIA_LABELS: Record<CategoriaGasto, string> = {
  combustivel: 'Combustivel',
  pedagio: 'Pedagio',
  estacionamento: 'Estacionamento',
  alimentacao: 'Alimentacao',
  outros: 'Outros',
}

const CATEGORIA_ICONS: Record<CategoriaGasto, React.ReactNode> = {
  combustivel: <Fuel size={14} className="text-[#70a7ff]" />,
  pedagio: <Landmark size={14} className="text-[#70a7ff]" />,
  estacionamento: <ParkingCircle size={14} className="text-[#70a7ff]" />,
  alimentacao: <UtensilsCrossed size={14} className="text-[#70a7ff]" />,
  outros: <MoreHorizontal size={14} className="text-[#70a7ff]" />,
}

const emptyViagemForm = {
  nome: '',
  origem: '',
  destino: '',
  distanciaKm: '',
  responsavel: '',
  acompanhantes: '',
  dataInicio: '',
  dataFim: '',
  veiculoId: '',
  kmSaida: '',
}

const emptyGastoForm = {
  categoria: 'combustivel' as CategoriaGasto,
  descricao: '',
  valor: '',
  notaImagem: '',
  notaNome: '',
}

function parseDate(value?: string): Date | null {
  if (!value) return null
  const d = new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatDateBR(value?: string) {
  const d = parseDate(value)
  return d ? d.toLocaleDateString('pt-BR') : 'Sem data'
}

function totalViagem(v: RegistroViagem) {
  return (v.gastos ?? []).reduce((sum, gasto) => sum + gasto.valor, 0)
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export default function ViagensScreen() {
  const user = useStore((s) => s.user)
  const veiculos = useStore((s) => s.veiculos)
  const uid = user?.uid ?? ''

  const [viagens, setViagens] = useState<RegistroViagem[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showViagemForm, setShowViagemForm] = useState(false)
  const [showGastoForm, setShowGastoForm] = useState<string | null>(null)
  const [finishTarget, setFinishTarget] = useState<RegistroViagem | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [editingTripId, setEditingTripId] = useState<string | null>(null)
  const [viagemForm, setViagemForm] = useState({ ...emptyViagemForm })
  const [gastoForm, setGastoForm] = useState({ ...emptyGastoForm })
  const [kmFinal, setKmFinal] = useState('')

  useEffect(() => {
    if (veiculos.length > 0 && !viagemForm.veiculoId) {
      setViagemForm((f) => ({ ...f, veiculoId: veiculos[0].id, kmSaida: String(veiculos[0].kmAtual || '') }))
    }
  }, [veiculos, viagemForm.veiculoId])

  useEffect(() => {
    if (!uid) return
    const raw = localStorage.getItem(`zellu_viagens_${uid}`)
    if (!raw) return
    const parsed = JSON.parse(raw) as RegistroViagem[]
    const migrated = parsed.map((v: any) => {
      const gastos: GastoViagem[] = v.gastos ?? []
      const dataInicio = v.dataInicio ?? v.data ?? ''
      const nome = v.nome ?? `${v.origem ?? 'Origem'} para ${v.destino ?? 'Destino'}`
      return { ...v, nome, dataInicio, dataFim: v.dataFim ?? '', gastos, finalizada: Boolean(v.finalizada) } as RegistroViagem
    })
    setViagens(migrated)
  }, [uid])

  function save(updated: RegistroViagem[]) {
    setViagens(updated)
    localStorage.setItem(`zellu_viagens_${uid}`, JSON.stringify(updated))
  }

  const sorted = useMemo(() => [...viagens].sort((a, b) => {
    const da = parseDate(a.dataInicio ?? a.data)?.getTime() ?? 0
    const db = parseDate(b.dataInicio ?? b.data)?.getTime() ?? 0
    return db - da
  }), [viagens])

  const activeTrips = viagens.filter((v) => !v.finalizada).length
  const inputCls = 'w-full rounded-2xl border border-[#1e2d44] bg-[#101d32] px-4 py-3 text-sm text-[#f0f4ff] placeholder-[#66758d] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]'

  function openNewTrip() {
    const vehicle = veiculos[0]
    setEditingTripId(null)
    setViagemForm({
      ...emptyViagemForm,
      veiculoId: vehicle?.id ?? '',
      kmSaida: vehicle ? String(vehicle.kmAtual || '') : '',
    })
    setShowViagemForm(true)
  }

  function openEditTrip(trip: RegistroViagem) {
    setEditingTripId(trip.id)
    setViagemForm({
      nome: trip.nome || `${trip.origem} para ${trip.destino}`,
      origem: trip.origem,
      destino: trip.destino,
      distanciaKm: trip.distanciaKm ? String(trip.distanciaKm) : '',
      responsavel: trip.responsavel || '',
      acompanhantes: trip.acompanhantes || '',
      dataInicio: trip.dataInicio || trip.data || '',
      dataFim: trip.dataFim || '',
      veiculoId: trip.veiculoId,
      kmSaida: trip.kmSaida ? String(trip.kmSaida) : '',
    })
    setShowViagemForm(true)
  }

  function submitViagem() {
    if (!viagemForm.nome || !viagemForm.origem || !viagemForm.destino || !viagemForm.dataInicio || !viagemForm.veiculoId) {
      toast.error('Preencha nome, origem, destino, data inicial e veiculo.')
      return
    }

    if (editingTripId) {
      save(viagens.map((trip) => trip.id === editingTripId ? {
        ...trip,
        veiculoId: viagemForm.veiculoId,
        nome: viagemForm.nome,
        origem: viagemForm.origem,
        destino: viagemForm.destino,
        distanciaKm: Number(viagemForm.distanciaKm) || 0,
        responsavel: viagemForm.responsavel,
        acompanhantes: viagemForm.acompanhantes,
        data: viagemForm.dataInicio,
        dataInicio: viagemForm.dataInicio,
        dataFim: viagemForm.dataFim,
        kmSaida: Number(viagemForm.kmSaida) || 0,
      } : trip))
      setShowViagemForm(false)
      setEditingTripId(null)
      setExpandedId(editingTripId)
      toast.success('Viagem atualizada.')
      return
    }

    const nova: RegistroViagem = {
      id: crypto.randomUUID(),
      veiculoId: viagemForm.veiculoId,
      nome: viagemForm.nome,
      origem: viagemForm.origem,
      destino: viagemForm.destino,
      distanciaKm: Number(viagemForm.distanciaKm) || 0,
      responsavel: viagemForm.responsavel,
      acompanhantes: viagemForm.acompanhantes,
      data: viagemForm.dataInicio,
      dataInicio: viagemForm.dataInicio,
      dataFim: viagemForm.dataFim,
      kmSaida: Number(viagemForm.kmSaida) || 0,
      finalizada: false,
      gastos: [],
      userId: uid,
      criadoEm: Date.now(),
    }

    save([nova, ...viagens])
    setShowViagemForm(false)
    setExpandedId(nova.id)
  }

  async function handleNotaChange(file?: File) {
    if (!file) return
    try {
      const dataUrl = await fileToDataUrl(file)
      setGastoForm((f) => ({ ...f, notaImagem: dataUrl, notaNome: file.name }))
    } catch {
      toast.error('Nao foi possivel anexar a foto da nota.')
    }
  }

  function submitGasto(viagemId: string) {
    if (!gastoForm.valor || Number(gastoForm.valor) <= 0) {
      toast.error('Informe o valor do gasto.')
      return
    }

    const gasto: GastoViagem = {
      id: crypto.randomUUID(),
      categoria: gastoForm.categoria,
      descricao: gastoForm.descricao,
      valor: Number(gastoForm.valor),
      notaImagem: gastoForm.notaImagem || undefined,
      notaNome: gastoForm.notaNome || undefined,
      criadoEm: Date.now(),
    }

    save(viagens.map((v) => v.id === viagemId ? { ...v, gastos: [...(v.gastos ?? []), gasto] } : v))
    setShowGastoForm(null)
    setGastoForm({ ...emptyGastoForm })
  }

  function removeGasto(viagemId: string, gastoId: string) {
    save(viagens.map((v) => v.id === viagemId ? { ...v, gastos: (v.gastos ?? []).filter((g) => g.id !== gastoId) } : v))
  }

  function finishTrip() {
    if (!finishTarget) return
    save(viagens.map((v) => v.id === finishTarget.id ? {
      ...v,
      finalizada: true,
      kmFinal: Number(kmFinal) || v.kmFinal,
      dataFim: v.dataFim || new Date().toISOString().slice(0, 10),
    } : v))
    setFinishTarget(null)
    setKmFinal('')
    toast.success('Viagem finalizada.')
  }

  function removeViagem(id: string) {
    save(viagens.filter((v) => v.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  async function handleExportPdf() {
    if (viagens.length === 0) {
      toast.error('Crie uma viagem antes de gerar o relatorio.')
      return
    }

    try {
      await saveTravelReport({ trips: sorted, vehicles: veiculos })
      toast.success('Relatorio PDF gerado.')
    } catch {
      toast.error('Nao foi possivel gerar o PDF.')
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-32 pt-6 sm:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#fbbf24]">Zellu Premium</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#f4f7ff]">Diario de Viagens</h1>
          <p className="mt-2 text-sm leading-6 text-[#8fa0b9]">Organize viagens, responsaveis, veiculo usado e notas de gastos.</p>
        </div>
        <button
          type="button"
          onClick={handleExportPdf}
          className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-[#4f8df7]/30 bg-[#4f8df7]/10 px-4 text-sm font-semibold text-[#8bb9ff] transition hover:bg-[#4f8df7]/15 active:scale-[0.98]"
        >
          <FileText size={16} />
          Relatorio
        </button>
      </header>

      <section className="mt-5 rounded-3xl border border-[#1e2d44] bg-[#0d1526] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#f4f7ff]">{activeTrips} viagem{activeTrips !== 1 ? 's' : ''} em andamento</p>
            <p className="mt-1 text-xs text-[#66758d]">Cadastre a viagem primeiro. Depois lance os gastos e finalize quando terminar.</p>
          </div>
          <button
            type="button"
            onClick={openNewTrip}
            className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#4f8df7] px-4 text-sm font-semibold text-white active:scale-[0.98]"
          >
            <Plus size={17} /> Nova viagem
          </button>
        </div>
      </section>

      <section className="mt-5 space-y-3">
        {sorted.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#1e2d44] bg-[#0d1526] px-6 py-14 text-center">
            <Navigation size={34} className="mx-auto text-[#60708a]" />
            <p className="mt-4 text-sm font-semibold text-[#e7eefb]">Nenhuma viagem criada</p>
            <p className="mt-1 text-xs text-[#66758d]">Crie uma viagem para registrar gastos, notas e finalizar o trajeto.</p>
          </div>
        ) : (
          sorted.map((viagem) => {
            const veiculo = veiculos.find((v) => v.id === viagem.veiculoId)
            const custo = totalViagem(viagem)
            const isExpanded = expandedId === viagem.id
            return (
              <article key={viagem.id} className="overflow-hidden rounded-3xl border border-[#203653] bg-[#101d32]">
                <button type="button" onClick={() => setExpandedId(isExpanded ? null : viagem.id)} className="w-full p-4 text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${viagem.finalizada ? 'bg-emerald-400/10 text-emerald-300' : 'bg-blue-400/10 text-[#8bb9ff]'}`}>
                          {viagem.finalizada ? 'Finalizada' : 'Em andamento'}
                        </span>
                        <p className="truncate text-base font-semibold text-[#f4f7ff]">{viagem.nome || `${viagem.origem} para ${viagem.destino}`}</p>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-[#8fa0b9] sm:grid-cols-2">
                        <span className="flex items-center gap-2"><MapPin size={13} className="text-[#70a7ff]" /> {viagem.origem} {'->'} {viagem.destino}</span>
                        <span className="flex items-center gap-2"><CalendarDays size={13} className="text-[#70a7ff]" /> {formatDateBR(viagem.dataInicio ?? viagem.data)}{viagem.dataFim ? ` ate ${formatDateBR(viagem.dataFim)}` : ''}</span>
                        <span className="flex items-center gap-2"><Car size={13} className="text-[#70a7ff]" /> {veiculo ? `${veiculo.nome} - ${veiculo.modelo}` : 'Veiculo removido'}</span>
                        <span className="flex items-center gap-2"><Receipt size={13} className="text-[#fbbf24]" /> {currencyFormatter.format(custo)} em {(viagem.gastos ?? []).length} gasto{(viagem.gastos ?? []).length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <ChevronDown size={17} className={`mt-1 shrink-0 text-[#66758d] transition ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="space-y-4 border-t border-[#1e2d44] p-4">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Info icon={<Route size={14} />} label="Distancia" value={viagem.distanciaKm ? `${viagem.distanciaKm.toLocaleString('pt-BR')} km` : 'Nao informada'} />
                          <Info icon={<Flag size={14} />} label="KM saida" value={viagem.kmSaida ? `${viagem.kmSaida.toLocaleString('pt-BR')} km` : 'Nao informado'} />
                          <Info icon={<UserRound size={14} />} label="Responsavel" value={viagem.responsavel || 'Nao informado'} />
                          <Info icon={<Users size={14} />} label="Acompanhantes" value={viagem.acompanhantes || 'Sem acompanhantes'} />
                        </div>

                        <div className="space-y-2">
                          {(viagem.gastos ?? []).length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-[#1e2d44] px-4 py-5 text-center">
                              <Receipt size={21} className="mx-auto text-[#60708a]" />
                              <p className="mt-2 text-xs text-[#66758d]">Nenhum gasto adicionado ainda.</p>
                            </div>
                          ) : (
                            viagem.gastos.map((gasto) => (
                              <div key={gasto.id} className="rounded-2xl border border-[#1e2d44] bg-[#0b1627] p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-2">
                                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-[#13233b]">{CATEGORIA_ICONS[gasto.categoria]}</div>
                                    <div>
                                      <p className="text-xs font-semibold text-[#dce7f8]">{CATEGORIA_LABELS[gasto.categoria]}</p>
                                      <p className="mt-0.5 text-[11px] text-[#66758d]">{gasto.descricao || 'Sem descricao'}</p>
                                      {gasto.notaImagem && <p className="mt-1 flex items-center gap-1 text-[10px] text-emerald-300"><ImageIcon size={11} /> Nota anexada</p>}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-semibold text-[#fbbf24]">{currencyFormatter.format(gasto.valor)}</p>
                                    <button type="button" onClick={() => removeGasto(viagem.id, gasto.id)} className="mt-2 text-[#66758d] hover:text-[#f87171]">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                                {gasto.notaImagem && (
                                  <img src={gasto.notaImagem} alt="Nota do gasto" className="mt-3 h-28 w-full rounded-xl border border-[#1e2d44] object-cover" />
                                )}
                              </div>
                            ))
                          )}
                        </div>

                        <div className="grid gap-2 sm:grid-cols-4">
                          <button type="button" onClick={() => { setGastoForm({ ...emptyGastoForm }); setShowGastoForm(viagem.id) }} className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#4f8df7]/25 bg-[#4f8df7]/10 text-xs font-semibold text-[#8bb9ff]">
                            <Plus size={14} /> Gasto
                          </button>
                          <button type="button" onClick={() => openEditTrip(viagem)} className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#8bb9ff]/20 bg-[#8bb9ff]/10 text-xs font-semibold text-[#9ec5ff]">
                            <Pencil size={14} /> Editar
                          </button>
                          <button type="button" disabled={viagem.finalizada} onClick={() => { setFinishTarget(viagem); setKmFinal(String(viagem.kmFinal || '')) }} className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-xs font-semibold text-emerald-300 disabled:opacity-40">
                            <CheckCircle2 size={14} /> Finalizar
                          </button>
                          <button type="button" onClick={() => setConfirmDeleteId(viagem.id)} className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-400/10 text-xs font-semibold text-red-300">
                            <Trash2 size={14} /> Excluir
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </article>
            )
          })
        )}
      </section>

      <AnimatePresence>
        {showViagemForm && (
          <Sheet onClose={() => { setShowViagemForm(false); setEditingTripId(null) }} title={editingTripId ? 'Editar viagem' : 'Cadastrar viagem'}>
            <div className="space-y-3">
              <Field label="Nome da viagem">
                <input value={viagemForm.nome} onChange={(e) => setViagemForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: Entrega Campinas" className={inputCls} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Lugar de saida">
                  <input value={viagemForm.origem} onChange={(e) => setViagemForm((f) => ({ ...f, origem: e.target.value }))} placeholder="Ex: Sao Paulo" className={inputCls} />
                </Field>
                <Field label="Destino">
                  <input value={viagemForm.destino} onChange={(e) => setViagemForm((f) => ({ ...f, destino: e.target.value }))} placeholder="Ex: Campinas" className={inputCls} />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Distancia">
                  <input type="number" value={viagemForm.distanciaKm} onChange={(e) => setViagemForm((f) => ({ ...f, distanciaKm: e.target.value }))} placeholder="Km" className={inputCls} />
                </Field>
                <Field label="Responsavel">
                  <input value={viagemForm.responsavel} onChange={(e) => setViagemForm((f) => ({ ...f, responsavel: e.target.value }))} placeholder="Nome do responsavel" className={inputCls} />
                </Field>
              </div>
              <Field label="Acompanhantes">
                <input value={viagemForm.acompanhantes} onChange={(e) => setViagemForm((f) => ({ ...f, acompanhantes: e.target.value }))} placeholder="Separe por virgula, se tiver" className={inputCls} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Data de inicio">
                  <input type="date" value={viagemForm.dataInicio} onChange={(e) => setViagemForm((f) => ({ ...f, dataInicio: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Data de fim prevista">
                  <input type="date" value={viagemForm.dataFim} onChange={(e) => setViagemForm((f) => ({ ...f, dataFim: e.target.value }))} className={inputCls} />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Veiculo usado">
                  <div className="relative">
                    <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#66758d]" />
                    <select value={viagemForm.veiculoId} onChange={(e) => {
                      const vehicle = veiculos.find((v) => v.id === e.target.value)
                      setViagemForm((f) => ({ ...f, veiculoId: e.target.value, kmSaida: vehicle ? String(vehicle.kmAtual || '') : f.kmSaida }))
                    }} className={`${inputCls} appearance-none`}>
                      {veiculos.map((v) => <option key={v.id} value={v.id}>{v.nome} - {v.modelo}</option>)}
                    </select>
                  </div>
                </Field>
                <Field label="KM de saida">
                  <input type="number" value={viagemForm.kmSaida} onChange={(e) => setViagemForm((f) => ({ ...f, kmSaida: e.target.value }))} placeholder="Km atual" className={inputCls} />
                </Field>
              </div>
            </div>
            <button type="button" onClick={submitViagem} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4f8df7] py-3 text-sm font-semibold text-white active:scale-[0.98]">
              {editingTripId ? <Pencil size={16} /> : <Plus size={16} />}
              {editingTripId ? 'Salvar alteracoes' : 'Criar viagem'}
            </button>
          </Sheet>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGastoForm && (
          <Sheet onClose={() => setShowGastoForm(null)} title="Adicionar gasto">
            <div className="space-y-3">
              <Field label="Categoria">
                <div className="relative">
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#66758d]" />
                  <select value={gastoForm.categoria} onChange={(e) => setGastoForm((f) => ({ ...f, categoria: e.target.value as CategoriaGasto }))} className={`${inputCls} appearance-none`}>
                    {(Object.keys(CATEGORIA_LABELS) as CategoriaGasto[]).map((cat) => <option key={cat} value={cat}>{CATEGORIA_LABELS[cat]}</option>)}
                  </select>
                </div>
              </Field>
              <Field label="Descricao">
                <input value={gastoForm.descricao} onChange={(e) => setGastoForm((f) => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Posto, pedagio, refeicao" className={inputCls} />
              </Field>
              <Field label="Valor">
                <input type="number" value={gastoForm.valor} onChange={(e) => setGastoForm((f) => ({ ...f, valor: e.target.value }))} placeholder="0,00" className={inputCls} />
              </Field>
              <Field label="Foto da nota">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[#2d4263] bg-[#101d32] px-4 py-4 text-sm font-semibold text-[#8bb9ff] active:scale-[0.98]">
                  <Camera size={17} />
                  {gastoForm.notaImagem ? 'Trocar foto da nota' : 'Tirar foto ou anexar nota'}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleNotaChange(e.target.files?.[0])} />
                </label>
                {gastoForm.notaImagem && <img src={gastoForm.notaImagem} alt="Previa da nota" className="mt-3 h-36 w-full rounded-2xl border border-[#1e2d44] object-cover" />}
              </Field>
            </div>
            <button type="button" onClick={() => submitGasto(showGastoForm)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4f8df7] py-3 text-sm font-semibold text-white active:scale-[0.98]">
              Adicionar gasto
            </button>
          </Sheet>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {finishTarget && (
          <Dialog onClose={() => setFinishTarget(null)}>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10">
              <CheckCircle2 size={22} className="text-emerald-300" />
            </div>
            <h2 className="text-base font-semibold text-[#f4f7ff]">Finalizar viagem?</h2>
            <p className="mt-1 text-sm text-[#8892a4]">Informe o KM final para fechar a viagem {finishTarget.nome}.</p>
            <input type="number" value={kmFinal} onChange={(e) => setKmFinal(e.target.value)} placeholder="KM final do veiculo" className={`${inputCls} mt-4`} />
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setFinishTarget(null)} className="flex-1 rounded-2xl border border-[#1e2d44] bg-[#101d32] py-2.5 text-sm font-semibold text-[#aeb8ca]">Cancelar</button>
              <button type="button" onClick={finishTrip} className="flex-1 rounded-2xl bg-emerald-500 py-2.5 text-sm font-semibold text-white">Finalizar</button>
            </div>
          </Dialog>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDeleteId && (
          <Dialog onClose={() => setConfirmDeleteId(null)}>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-400/10">
              <Trash2 size={22} className="text-red-300" />
            </div>
            <h2 className="text-base font-semibold text-[#f4f7ff]">Excluir viagem?</h2>
            <p className="mt-1 text-sm text-[#8892a4]">A viagem sera removida junto com seus gastos e notas anexadas.</p>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setConfirmDeleteId(null)} className="flex-1 rounded-2xl border border-[#1e2d44] bg-[#101d32] py-2.5 text-sm font-semibold text-[#aeb8ca]">Cancelar</button>
              <button type="button" onClick={() => { removeViagem(confirmDeleteId); setConfirmDeleteId(null) }} className="flex-1 rounded-2xl bg-red-500 py-2.5 text-sm font-semibold text-white">Excluir</button>
            </div>
          </Dialog>
        )}
      </AnimatePresence>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-[#8892a4]">{label}</label>
      {children}
    </div>
  )
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#1e2d44] bg-[#0b1627] p-3">
      <div className="flex items-center gap-2 text-[#70a7ff]">
        {icon}
        <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
      </div>
      <p className="mt-1 text-sm font-semibold text-[#e8f0fc]">{value}</p>
    </div>
  )
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-2xl overflow-y-auto rounded-t-3xl border-t border-[#203653] bg-[#0d1526] px-5 pb-8 pt-5"
        style={{ maxHeight: '90dvh' }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#f4f7ff]">{title}</h2>
          <button type="button" onClick={onClose} className="text-[#66758d]"><X size={20} /></button>
        </div>
        {children}
      </motion.div>
    </>
  )
}

function Dialog({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-[#1e2d44] bg-[#0d1526] p-6 shadow-2xl"
      >
        {children}
      </motion.div>
    </>
  )
}
