import { useState, useEffect, useMemo } from 'react'
import { Plus, Torus, X, ChevronDown, AlertTriangle, Bell, CheckCircle, Clock, Download, Pencil, TrendingDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/lib/store'
import { addLembrete } from '@/lib/db'
import type { RegistroPneu, PosicaoPneu } from '@/lib/types'
import toast from 'react-hot-toast'
import { saveTireControlReport } from '@/lib/pdfReports'

const currencyFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const POSICOES: { value: PosicaoPneu; label: string; short: string }[] = [
  { value: 'DD', label: 'Dianteiro Direito', short: 'DD' },
  { value: 'DE', label: 'Dianteiro Esquerdo', short: 'DE' },
  { value: 'TD', label: 'Traseiro Direito', short: 'TD' },
  { value: 'TE', label: 'Traseiro Esquerdo', short: 'TE' },
  { value: 'ESTEPE', label: 'Estepe', short: 'ESP' },
]

function wearColor(pct: number) {
  if (pct >= 80) return '#f87171'
  if (pct >= 60) return '#fbbf24'
  return '#4ade80'
}

function wearBorderColor(pct: number) {
  if (pct >= 80) return 'rgba(248,113,113,0.25)'
  if (pct >= 60) return 'rgba(251,191,36,0.20)'
  return 'rgba(74,222,128,0.15)'
}

function CircularWear({ pct, size = 54 }: { pct: number; size?: number }) {
  const r = size / 2 - 5
  const circ = 2 * Math.PI * r
  const capped = Math.min(Math.max(pct, 0), 100)
  const dash = (capped / 100) * circ
  const color = wearColor(pct)
  const cx = size / 2

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#1e2d44" strokeWidth="4.5" />
      {capped > 0 && (
        <circle
          cx={cx} cy={cx} r={r}
          fill="none" stroke={color} strokeWidth="4.5"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cx})`}
        />
      )}
      <text x={cx} y={cx + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill={color}>
        {Math.round(capped)}%
      </text>
    </svg>
  )
}

function CarDiagram({
  ativos,
  kmAtual,
  onPositionClick,
}: {
  ativos: RegistroPneu[]
  kmAtual: number
  onPositionClick: (pos: PosicaoPneu) => void
}) {
  function getWearColor(posValue: PosicaoPneu) {
    const pneu = ativos.find((p) => p.posicao === posValue)
    if (!pneu) return '#1e2d44'
    const desgaste = pneu.kmVidaUtil > 0 ? ((kmAtual - pneu.kmInstalado) / pneu.kmVidaUtil) * 100 : 0
    return wearColor(Math.max(0, desgaste))
  }

  function getWheelFill(posValue: PosicaoPneu) {
    const pneu = ativos.find((p) => p.posicao === posValue)
    if (!pneu) return '#101d32'
    return getWearColor(posValue) + '22'
  }

  const positions: { pos: PosicaoPneu; x: number; y: number; w: number; h: number }[] = [
    { pos: 'DE', x: 44, y: 36, w: 20, h: 34 },
    { pos: 'DD', x: 156, y: 36, w: 20, h: 34 },
    { pos: 'TE', x: 44, y: 102, w: 20, h: 34 },
    { pos: 'TD', x: 156, y: 102, w: 20, h: 34 },
  ]

  return (
    <svg viewBox="0 0 220 200" className="w-full max-w-[220px] mx-auto">
      {/* Car body */}
      <rect x={70} y={26} width={80} height={120} rx={14} fill="#0d1526" stroke="#203653" strokeWidth="1.5" />
      {/* Windshield */}
      <rect x={78} y={34} width={64} height={24} rx={6} fill="#1a2b45" opacity="0.8" />
      {/* Rear window */}
      <rect x={78} y={108} width={64} height={20} rx={5} fill="#1a2b45" opacity="0.8" />
      {/* Hood line */}
      <line x1={70} y1={68} x2={150} y2={68} stroke="#203653" strokeWidth="1" />
      {/* Trunk line */}
      <line x1={70} y1={102} x2={150} y2={102} stroke="#203653" strokeWidth="1" />

      {/* Wheels */}
      {positions.map(({ pos, x, y, w, h }) => {
        const hasTire = ativos.some((p) => p.posicao === pos)
        const stroke = hasTire ? getWearColor(pos) : '#2d3f56'
        const fill = getWheelFill(pos)
        return (
          <g key={pos} className="cursor-pointer" onClick={() => onPositionClick(pos)}>
            <rect x={x} y={y} width={w} height={h} rx={4} fill={fill} stroke={stroke} strokeWidth="1.5" />
            {!hasTire && (
              <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize="7" fill="#3d5370" fontWeight="600">
                {pos}
              </text>
            )}
          </g>
        )
      })}

      {/* Estepe */}
      {(() => {
        const hasEstepe = ativos.some((p) => p.posicao === 'ESTEPE')
        const stroke = hasEstepe ? getWearColor('ESTEPE') : '#2d3f56'
        const fill = getWheelFill('ESTEPE')
        return (
          <g className="cursor-pointer" onClick={() => onPositionClick('ESTEPE')}>
            <circle cx={110} cy={166} r={14} fill={fill} stroke={stroke} strokeWidth="1.5" />
            {!hasEstepe && (
              <text x={110} y={170} textAnchor="middle" fontSize="6" fill="#3d5370" fontWeight="600">ESP</text>
            )}
          </g>
        )
      })()}

      {/* Labels */}
      <text x={44 + 10} y={28} textAnchor="middle" fontSize="7.5" fill="#4f6a8a" fontWeight="600">DE</text>
      <text x={156 + 10} y={28} textAnchor="middle" fontSize="7.5" fill="#4f6a8a" fontWeight="600">DD</text>
      <text x={44 + 10} y={148} textAnchor="middle" fontSize="7.5" fill="#4f6a8a" fontWeight="600">TE</text>
      <text x={156 + 10} y={148} textAnchor="middle" fontSize="7.5" fill="#4f6a8a" fontWeight="600">TD</text>
      <text x={110} y={188} textAnchor="middle" fontSize="7.5" fill="#4f6a8a" fontWeight="600">ESP</text>
    </svg>
  )
}

const emptyForm = {
  posicao: 'DD' as PosicaoPneu,
  marca: '',
  modelo: '',
  kmInstalado: '',
  kmVidaUtil: '',
  kmFinal: '',
  custo: '',
  dataInstalacao: '',
}

export default function PneusScreen() {
  const user = useStore((s) => s.user)
  const veiculos = useStore((s) => s.veiculos)
  const addLembreteLocal = useStore((s) => s.addLembreteLocal)
  const lembretes = useStore((s) => s.lembretes)
  const uid = user?.uid ?? ''

  const [veiculoId, setVeiculoId] = useState('')
  const [pneus, setPneus] = useState<RegistroPneu[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })

  const [showKmFinalSheet, setShowKmFinalSheet] = useState(false)
  const [kmFinalTarget, setKmFinalTarget] = useState<RegistroPneu | null>(null)
  const [kmFinalVal, setKmFinalVal] = useState('')

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

  const pneusVeiculo = pneus
    .filter((p) => p.veiculoId === veiculoId)
    .sort((a, b) => {
      const aAtivo = !a.kmFinal ? 0 : 1
      const bAtivo = !b.kmFinal ? 0 : 1
      if (aAtivo !== bAtivo) return aAtivo - bAtivo
      return b.criadoEm - a.criadoEm
    })

  const ativos = pneusVeiculo.filter((p) => !p.kmFinal)
  const historico = pneusVeiculo.filter((p) => !!p.kmFinal)

  const metrics = useMemo(() => {
    const concluidos = pneus.filter((p) => !!p.kmFinal && (p.kmFinal - p.kmInstalado) > 0)
    if (concluidos.length === 0) return null
    const melhorDurabilidade = concluidos.reduce((best, p) =>
      (p.kmFinal! - p.kmInstalado) > (best.kmFinal! - best.kmInstalado) ? p : best
    )
    const comCusto = concluidos.filter((p) => (p.custo ?? 0) > 0)
    const menorCustoKm = comCusto.length > 0
      ? comCusto.reduce((best, p) => {
          const cpk = p.custo! / (p.kmFinal! - p.kmInstalado)
          const bestCpk = best.custo! / (best.kmFinal! - best.kmInstalado)
          return cpk < bestCpk ? p : best
        })
      : null
    return { melhorDurabilidade, menorCustoKm, total: concluidos.length }
  }, [pneus])

  async function criarAvisoPneu(pneu: RegistroPneu) {
    if (!pneu.veiculoId) return
    const titulo = `Trocar pneu ${POSICOES.find((p) => p.value === pneu.posicao)?.label ?? pneu.posicao}`
    const jaExiste = lembretes.some(
      (l) => !l.concluido && l.veiculoId === pneu.veiculoId && l.titulo === titulo
    )
    if (jaExiste) {
      toast('Já existe um aviso ativo para este pneu.', { icon: '🔔' })
      return
    }
    try {
      const kmLimite = pneu.kmVidaUtil > 0 ? String(pneu.kmInstalado + pneu.kmVidaUtil) : ''
      const lembrete = await addLembrete(uid, {
        veiculoId: pneu.veiculoId,
        titulo,
        peca: `${pneu.marca} ${pneu.modelo}`,
        dataLimite: '',
        kmLimite,
        tipo: 'PNEU',
        valor: pneu.custo ?? 0,
        horaAviso: '08:00',
        estabelecimentoNome: '',
        concluido: false,
      })
      addLembreteLocal(lembrete)
      toast.success('Aviso de troca criado!')
    } catch {
      toast.error('Erro ao criar aviso.')
    }
  }

  function openAdd(posicao?: PosicaoPneu) {
    setEditingId(null)
    setForm({ ...emptyForm, posicao: posicao ?? 'DD', kmInstalado: String(kmAtual || '') })
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
      kmFinal: p.kmFinal ? String(p.kmFinal) : '',
      custo: p.custo ? String(p.custo) : '',
      dataInstalacao: p.dataInstalacao,
    })
    setShowForm(true)
  }

  async function submit() {
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
              kmFinal: form.kmFinal ? Number(form.kmFinal) : undefined,
              custo: form.custo ? Number(form.custo) : undefined,
              dataInstalacao: form.dataInstalacao,
            }
          : p,
      )
      save(updated)
    } else {
      const anteriorIdx = pneus.findIndex(
        (p) => p.veiculoId === veiculoId && p.posicao === form.posicao && !p.kmFinal
      )
      const listBase = anteriorIdx >= 0
        ? pneus.map((p, i) =>
            i === anteriorIdx ? { ...p, kmFinal: Number(form.kmInstalado) } : p
          )
        : [...pneus]

      const novo: RegistroPneu = {
        id: crypto.randomUUID(),
        veiculoId,
        posicao: form.posicao,
        marca: form.marca,
        modelo: form.modelo,
        kmInstalado: Number(form.kmInstalado),
        kmVidaUtil: Number(form.kmVidaUtil),
        custo: form.custo ? Number(form.custo) : undefined,
        dataInstalacao: form.dataInstalacao,
        userId: uid,
        criadoEm: Date.now(),
      }
      save([novo, ...listBase])

      if (Number(form.kmVidaUtil) > 0) {
        try {
          const kmLimite = String(Number(form.kmInstalado) + Number(form.kmVidaUtil))
          const lembrete = await addLembrete(uid, {
            veiculoId,
            titulo: `Trocar pneu ${POSICOES.find((p) => p.value === form.posicao)?.label}`,
            peca: `${form.marca} ${form.modelo}`,
            dataLimite: '',
            kmLimite,
            tipo: 'PNEU',
            valor: form.custo ? Number(form.custo) : 0,
            horaAviso: '08:00',
            estabelecimentoNome: '',
            concluido: false,
          })
          addLembreteLocal(lembrete)
          toast.success('Pneu cadastrado! Aviso de troca criado automaticamente.')
          setShowForm(false)
          return
        } catch {
          // continua sem aviso
        }
      }
      toast.success('Pneu cadastrado com sucesso.')
    }
    setShowForm(false)
  }

  function informarKmFinal(pneu: RegistroPneu) {
    setKmFinalTarget(pneu)
    setKmFinalVal(String(kmAtual || ''))
    setShowKmFinalSheet(true)
  }

  function salvarKmFinal() {
    if (!kmFinalTarget || !kmFinalVal) return
    const km = Number(kmFinalVal)
    if (km <= kmFinalTarget.kmInstalado) {
      toast.error('KM final deve ser maior que o KM de instalação.')
      return
    }
    save(pneus.map((p) => p.id === kmFinalTarget.id ? { ...p, kmFinal: km } : p))
    setShowKmFinalSheet(false)
    setKmFinalTarget(null)
    const dur = km - kmFinalTarget.kmInstalado
    toast.success(`Pneu removido. Durabilidade: ${dur.toLocaleString('pt-BR')} km`)
  }

  function remove(id: string) {
    save(pneus.filter((p) => p.id !== id))
  }

  async function handleExportPdf() {
    if (!veiculo) {
      toast.error('Selecione um veiculo para gerar o relatorio.')
      return
    }

    try {
      await saveTireControlReport({
        vehicle: veiculo,
        tires: pneusVeiculo,
        currentKm: kmAtual,
      })
      toast.success('Relatorio PDF gerado.')
    } catch {
      toast.error('Nao foi possivel gerar o PDF.')
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-32 pt-6 sm:px-6">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#fbbf24]">Zellu Premium</p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-[#f4f7ff]">Controle de Pneus</h1>
        <p className="mt-1 text-sm text-[#8fa0b9]">Monitore posição, desgaste, custo e durabilidade.</p>
        </div>
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={!veiculo}
          className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-[#4f8df7]/30 bg-[#4f8df7]/10 px-4 text-sm font-semibold text-[#8bb9ff] transition hover:bg-[#4f8df7]/15 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Download size={16} />
          Gerar PDF
        </button>
      </header>

      {/* Métricas */}
      {metrics && (
        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[#4ade80]/20 bg-gradient-to-br from-[#4ade80]/[0.07] to-transparent p-4">
            <CheckCircle size={16} className="text-[#4ade80] mb-2" />
            <p className="text-base font-bold text-[#4ade80] leading-tight">
              {(metrics.melhorDurabilidade.kmFinal! - metrics.melhorDurabilidade.kmInstalado).toLocaleString('pt-BR')} km
            </p>
            <p className="text-[11px] text-[#7a9070] mt-0.5">Melhor durabilidade</p>
            <p className="text-[10px] text-[#566a4a] mt-0.5 truncate">{metrics.melhorDurabilidade.marca} {metrics.melhorDurabilidade.modelo}</p>
          </div>
          {metrics.menorCustoKm ? (
            <div className="rounded-2xl border border-[#4f8df7]/20 bg-gradient-to-br from-[#4f8df7]/[0.07] to-transparent p-4">
              <TrendingDown size={16} className="text-[#70a7ff] mb-2" />
              <p className="text-base font-bold text-[#70a7ff] leading-tight">
                {currencyFmt.format(metrics.menorCustoKm.custo! / (metrics.menorCustoKm.kmFinal! - metrics.menorCustoKm.kmInstalado))}/km
              </p>
              <p className="text-[11px] text-[#5a72a4] mt-0.5">Menor custo/km</p>
              <p className="text-[10px] text-[#445580] mt-0.5 truncate">{metrics.menorCustoKm.marca} {metrics.menorCustoKm.modelo}</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#1e2d44] bg-[#0d1526] p-4 flex items-center justify-center">
              <p className="text-[11px] text-[#445566] text-center">Registre o custo<br />para ver o custo/km</p>
            </div>
          )}
        </div>
      )}

      {/* Seletor de veículo + botão */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#66758d]" />
          <select value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)}
            className="w-full appearance-none rounded-2xl border border-[#1e2d44] bg-[#0d1526] px-4 py-3 text-sm text-[#f0f4ff] focus:outline-none focus:ring-1 focus:ring-[#4f8df7]">
            {veiculos.length === 0 && <option value="">Nenhum veículo</option>}
            {veiculos.map((v) => <option key={v.id} value={v.id}>{v.nome} — {v.modelo}</option>)}
          </select>
        </div>
        {veiculoId && (
          <button type="button" onClick={() => openAdd()}
            className="flex items-center gap-1.5 rounded-2xl bg-[#4f8df7] px-4 py-3 text-sm font-semibold text-white active:scale-[0.97] shrink-0">
            <Plus size={16} /> Adicionar
          </button>
        )}
      </div>

      {/* Car diagram */}
      {veiculoId && (
        <div className="mt-4 rounded-2xl border border-[#1e2d44] bg-[#080f1e] py-4 px-2">
          <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-[#3d5370] mb-1">
            Toque na posição para cadastrar
          </p>
          <CarDiagram
            ativos={ativos}
            kmAtual={kmAtual}
            onPositionClick={(pos) => {
              const exists = ativos.find((p) => p.posicao === pos)
              if (exists) openEdit(exists)
              else openAdd(pos)
            }}
          />
          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-2">
            {[['#4ade80', 'OK'], ['#fbbf24', 'Atenção'], ['#f87171', 'Crítico']].map(([color, label]) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-[#3d5370]">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Cards de posição ── */}
      {veiculoId && (
        <section className="mt-5 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#66758d]">
            Posições — {veiculo?.nome}
          </p>

          {POSICOES.map((pos) => {
            const pneu = ativos.find((p) => p.posicao === pos.value)

            if (!pneu) {
              return (
                <motion.button
                  key={pos.value}
                  type="button"
                  onClick={() => openAdd(pos.value)}
                  whileTap={{ scale: 0.98 }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-[#1e2d44] bg-[#080f1e] px-4 py-3.5 text-left transition-colors hover:border-[#2d4060]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#1e2d44] bg-[#0d1526] shrink-0">
                    <span className="text-[10px] font-bold text-[#3d5370]">{pos.short}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#4a6080]">{pos.label}</p>
                    <p className="text-xs text-[#2d4058]">Nenhum pneu cadastrado</p>
                  </div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0d1526] border border-[#1e2d44]">
                    <Plus size={13} className="text-[#3d5370]" />
                  </div>
                </motion.button>
              )
            }

            const desgaste = pneu.kmVidaUtil > 0 ? ((kmAtual - pneu.kmInstalado) / pneu.kmVidaUtil) * 100 : 0
            const pct = Math.max(0, Math.min(100, desgaste))
            const color = wearColor(pct)
            const kmRest = Math.max(0, pneu.kmInstalado + pneu.kmVidaUtil - kmAtual)

            return (
              <motion.div
                key={pos.value}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border bg-[#0d1526] overflow-hidden"
                style={{ borderColor: wearBorderColor(pct) }}
              >
                {/* Status bar top */}
                <div className="h-0.5 w-full" style={{ backgroundColor: color, opacity: 0.5 }} />

                <div className="p-4">
                  {/* Header row */}
                  <div className="flex items-center gap-3">
                    <CircularWear pct={pct} size={52} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-[#1a2840] px-2 py-0.5 text-[10px] font-bold text-[#5a7ca8]">
                          {pos.short}
                        </span>
                        <p className="text-sm font-semibold text-[#e8f0fc] truncate">{pos.label}</p>
                        {pct >= 80 && <AlertTriangle size={13} className="text-[#f87171] shrink-0" />}
                      </div>
                      <p className="mt-0.5 text-xs text-[#5a7090] truncate">{pneu.marca} {pneu.modelo}</p>
                      {pneu.dataInstalacao && (
                        <p className="mt-0.5 text-[10px] text-[#3d5068]">Instalado em {pneu.dataInstalacao}</p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 shrink-0">
                      <button type="button" onClick={() => criarAvisoPneu(pneu)} title="Criar aviso de troca"
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#1e2d44] text-[#66758d] hover:border-[#fbbf24]/40 hover:text-[#fbbf24] transition-colors active:scale-90">
                        <Bell size={13} />
                      </button>
                      <button type="button" onClick={() => openEdit(pneu)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#1e2d44] text-[#66758d] hover:border-[#4f8df7]/40 hover:text-[#70a7ff] transition-colors active:scale-90">
                        <Pencil size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-[#080f1e] px-3 py-2.5">
                      <p className="text-[9px] uppercase tracking-wide text-[#3d5068]">Instalado</p>
                      <p className="mt-0.5 text-xs font-semibold text-[#c0cfe8]">
                        {pneu.kmInstalado.toLocaleString('pt-BR')} km
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#080f1e] px-3 py-2.5">
                      <p className="text-[9px] uppercase tracking-wide text-[#3d5068]">Vida útil</p>
                      <p className="mt-0.5 text-xs font-semibold text-[#c0cfe8]">
                        {pneu.kmVidaUtil.toLocaleString('pt-BR')} km
                      </p>
                    </div>
                    <div className="rounded-xl bg-[#080f1e] px-3 py-2.5">
                      <p className="text-[9px] uppercase tracking-wide text-[#3d5068]">Restante</p>
                      <p className="mt-0.5 text-xs font-semibold" style={{ color }}>
                        {kmRest.toLocaleString('pt-BR')} km
                      </p>
                    </div>
                  </div>

                  {pneu.custo && (
                    <div className="mt-2 rounded-xl bg-[#080f1e] px-3 py-2 flex items-center justify-between">
                      <p className="text-[9px] uppercase tracking-wide text-[#3d5068]">Custo do pneu</p>
                      <p className="text-xs font-semibold text-[#c0cfe8]">{currencyFmt.format(pneu.custo)}</p>
                    </div>
                  )}

                  <button type="button" onClick={() => informarKmFinal(pneu)}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#1a2840] py-2.5 text-xs text-[#5a7090] hover:text-[#8ea8c8] hover:border-[#2a3f5a] transition-colors active:scale-[0.98]">
                    <Clock size={11} /> Informar KM de retirada
                  </button>
                </div>
              </motion.div>
            )
          })}
        </section>
      )}

      {/* ── Histórico ── */}
      {historico.length > 0 && (
        <section className="mt-6">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#66758d]">
            Histórico — pneus removidos
          </p>
          <div className="space-y-2">
            {historico.map((pneu) => {
              const dur = pneu.kmFinal! - pneu.kmInstalado
              const custoKm = pneu.custo && dur > 0 ? pneu.custo / dur : null
              const pos = POSICOES.find((p) => p.value === pneu.posicao)
              return (
                <div key={pneu.id}
                  className="flex items-center gap-3 rounded-2xl border border-[#141f32] bg-[#080f1e] px-4 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0d1526] border border-[#1e2d44] shrink-0">
                    <span className="text-[10px] font-bold text-[#3d5370]">{pos?.short}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#8a9ab8] truncate">{pneu.marca} {pneu.modelo}</p>
                    <p className="text-[10px] text-[#3d5068]">{dur.toLocaleString('pt-BR')} km rodados</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {custoKm !== null && (
                      <div className="text-right">
                        <p className="text-xs font-semibold text-[#5a7aa8]">{currencyFmt.format(custoKm)}/km</p>
                        <p className="text-[10px] text-[#3d5068]">{currencyFmt.format(pneu.custo!)}</p>
                      </div>
                    )}
                    <button type="button" onClick={() => remove(pneu.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[#3d5068] hover:text-[#f87171] transition-colors active:scale-90">
                      <X size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {!veiculoId && veiculos.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-[#1e2d44] bg-[#0d1526] px-6 py-14 text-center">
          <Torus size={32} className="mx-auto text-[#2d4060]" />
          <p className="mt-4 text-sm font-semibold text-[#e7eefb]">Nenhum veículo cadastrado</p>
          <p className="mt-1 text-xs text-[#3d5068]">Cadastre um veículo na garagem primeiro.</p>
        </div>
      )}

      {/* ── Sheet: Adicionar / Editar pneu ── */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={() => setShowForm(false)} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-2xl overflow-y-auto rounded-t-3xl border-t border-[#203653] bg-[#0d1526] px-5 pb-8 pt-5"
              style={{ maxHeight: '92dvh' }}
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#f4f7ff]">{editingId ? 'Editar pneu' : 'Adicionar pneu'}</h2>
                <button type="button" onClick={() => setShowForm(false)} className="text-[#66758d]"><X size={20} /></button>
              </div>

              <div className="space-y-3">
                {editingId ? (
                  <div className="flex items-center gap-3 rounded-xl border border-[#1e2d44] bg-[#101d32] px-4 py-3">
                    <Torus size={16} className="text-[#70a7ff]" />
                    <div>
                      <p className="text-[10px] text-[#66758d]">Posição</p>
                      <p className="text-sm font-semibold text-[#f0f4ff]">
                        {POSICOES.find((p) => p.value === form.posicao)?.label ?? form.posicao}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="mb-2 block text-xs text-[#8892a4]">Posição da roda</label>
                    <div className="grid grid-cols-5 gap-2">
                      {POSICOES.map((pos) => (
                        <button key={pos.value} type="button" onClick={() => setForm((f) => ({ ...f, posicao: pos.value }))}
                          className={`rounded-xl border py-2 text-[11px] font-semibold transition-colors ${
                            form.posicao === pos.value
                              ? 'border-[#4f8df7] bg-[#4f8df7]/15 text-white'
                              : 'border-[#1e2d44] text-[#8892a4] hover:border-[#4f8df7]/40'
                          }`}>
                          {pos.short}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[10px] text-[#66758d]">
                      DD = Dianteiro Dir. · DE = Dianteiro Esq. · TD = Traseiro Dir. · TE = Traseiro Esq. · ESP = Estepe
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-[#8892a4]">Marca</label>
                    <input value={form.marca} onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))}
                      placeholder="Ex: Pirelli" className="input-field" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#8892a4]">Modelo</label>
                    <input value={form.modelo} onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))}
                      placeholder="Ex: Cinturato P1" className="input-field" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-[#8892a4]">KM instalado</label>
                    <input type="number" value={form.kmInstalado} onChange={(e) => setForm((f) => ({ ...f, kmInstalado: e.target.value }))}
                      placeholder="Ex: 45000" className="input-field" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#8892a4]">Vida útil (km)</label>
                    <input type="number" value={form.kmVidaUtil} onChange={(e) => setForm((f) => ({ ...f, kmVidaUtil: e.target.value }))}
                      placeholder="Ex: 40000" className="input-field" />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-[#8892a4]">Custo do pneu (R$)</label>
                  <input type="number" step="0.01" value={form.custo} onChange={(e) => setForm((f) => ({ ...f, custo: e.target.value }))}
                    placeholder="Ex: 380.00" className="input-field" />
                </div>

                {editingId && (
                  <div>
                    <label className="mb-1 block text-xs text-[#8892a4]">KM de retirada (opcional)</label>
                    <input type="number" value={form.kmFinal} onChange={(e) => setForm((f) => ({ ...f, kmFinal: e.target.value }))}
                      placeholder="Preencha quando remover o pneu" className="input-field" />
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs text-[#8892a4]">Data de instalação</label>
                  <input type="date" value={form.dataInstalacao} onChange={(e) => setForm((f) => ({ ...f, dataInstalacao: e.target.value }))}
                    className="input-field" />
                </div>
              </div>

              {!editingId && (
                <p className="mt-3 text-center text-[11px] text-[#66758d]">
                  Um aviso de troca será criado automaticamente com base na vida útil.
                </p>
              )}

              <button type="button" onClick={submit}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4f8df7] py-3 text-sm font-semibold text-white active:scale-[0.98]">
                {editingId ? 'Salvar alterações' : 'Adicionar pneu'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Sheet: Informar KM final ── */}
      <AnimatePresence>
        {showKmFinalSheet && kmFinalTarget && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={() => setShowKmFinalSheet(false)} />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-2xl rounded-t-3xl border-t border-[#203653] bg-[#0d1526] px-5 pb-8 pt-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#f4f7ff]">Informar KM de retirada</h2>
                <button type="button" onClick={() => setShowKmFinalSheet(false)} className="text-[#66758d]"><X size={20} /></button>
              </div>

              <div className="mb-4 rounded-xl border border-[#1e2d44] bg-[#101d32] px-4 py-3">
                <p className="text-xs text-[#8892a4]">
                  {POSICOES.find((p) => p.value === kmFinalTarget.posicao)?.label} — {kmFinalTarget.marca} {kmFinalTarget.modelo}
                </p>
                <p className="mt-0.5 text-xs text-[#66758d]">Instalado em: {kmFinalTarget.kmInstalado.toLocaleString('pt-BR')} km</p>
              </div>

              <div>
                <label className="mb-1 block text-xs text-[#8892a4]">KM atual (retirada)</label>
                <input type="number" value={kmFinalVal} onChange={(e) => setKmFinalVal(e.target.value)}
                  placeholder={`Ex: ${kmAtual || 85000}`} className="input-field" />
                {kmFinalVal && Number(kmFinalVal) > kmFinalTarget.kmInstalado && (
                  <p className="mt-1.5 text-xs text-[#4ade80]">
                    Durabilidade: {(Number(kmFinalVal) - kmFinalTarget.kmInstalado).toLocaleString('pt-BR')} km
                    {kmFinalTarget.custo && ` · ${currencyFmt.format(kmFinalTarget.custo / (Number(kmFinalVal) - kmFinalTarget.kmInstalado))}/km`}
                  </p>
                )}
              </div>

              <button type="button" onClick={salvarKmFinal} disabled={!kmFinalVal}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4ade80] py-3 text-sm font-semibold text-[#0d1526] disabled:opacity-60 active:scale-[0.98]">
                <CheckCircle size={16} /> Confirmar retirada
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .input-field {
          width: 100%; border-radius: 1rem; border: 1px solid #1e2d44;
          background: #101d32; padding: 0.75rem 1rem;
          font-size: 0.875rem; color: #f0f4ff;
        }
        .input-field::placeholder { color: #3d5068; }
        .input-field:focus { outline: none; box-shadow: 0 0 0 1px #4f8df7; }
      `}</style>
    </main>
  )
}
