import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileText,
  Fuel,
  History,
  Info,
  Tag,
  Wrench,
} from 'lucide-react'

import { PageTransition } from '@/components/layout/PageTransition'
import { useStore } from '@/lib/store'
import { formatCurrency, formatDate, formatKm, normalizarMarca, getCorNome } from '@/lib/utils'
import type { Lembrete, Veiculo } from '@/lib/types'
import { getPreco, getFipeTipo, getMarcas, getModelos, getAnos } from '@/lib/fipe'
import { updateVeiculo } from '@/lib/db'

const PAGE_SIZE = 5

function parseFipeValor(valor: string): number {
  return parseFloat(valor.replace('R$', '').replace(/\./g, '').replace(',', '.').trim())
}

interface FatorVenda { label: string; pct: number }

function calcularSugestaoVenda(
  fipeValor: string,
  vezesBatido: string | undefined,
  overdueCount: number,
  pendingCount: number,
  tempoComVeiculo: string | undefined,
): { sugerido: number; fatores: FatorVenda[] } {
  const base = parseFipeValor(fipeValor)
  const fatores: FatorVenda[] = []

  // Batidas
  const batidas = parseInt(vezesBatido ?? 'NAO_INFORMADO')
  if (!isNaN(batidas) && batidas > 0) {
    const pct = -Math.min(batidas * 5, 30)
    fatores.push({ label: `${batidas} ${batidas === 1 ? 'batida' : 'batidas'}`, pct })
  } else if (vezesBatido === 'NAO_INFORMADO' || !vezesBatido) {
    fatores.push({ label: 'Histórico de batidas desconhecido', pct: -3 })
  }

  // Saúde (atrasados)
  if (overdueCount >= 6) fatores.push({ label: `${overdueCount} serviços atrasados`, pct: -15 })
  else if (overdueCount >= 3) fatores.push({ label: `${overdueCount} serviços atrasados`, pct: -10 })
  else if (overdueCount >= 1) fatores.push({ label: `${overdueCount} serviço${overdueCount > 1 ? 's' : ''} atrasado${overdueCount > 1 ? 's' : ''}`, pct: -5 })

  // Avisos pendentes
  if (pendingCount >= 8) fatores.push({ label: `${pendingCount} avisos pendentes`, pct: -10 })
  else if (pendingCount >= 4) fatores.push({ label: `${pendingCount} avisos pendentes`, pct: -6 })
  else if (pendingCount >= 1) fatores.push({ label: `${pendingCount} aviso${pendingCount > 1 ? 's' : ''} pendente${pendingCount > 1 ? 's' : ''}`, pct: -3 })

  // Tempo com veículo
  const tempoMap: Record<string, { label: string; pct: number }> = {
    MENOS_6_MESES:  { label: 'Menos de 6 meses com o veículo', pct: -5 },
    '6_MESES_1_ANO': { label: '6 meses a 1 ano com o veículo', pct: -2 },
    '1_2_ANOS':     { label: '1 a 2 anos com o veículo', pct: 0 },
    '2_3_ANOS':     { label: '2 a 3 anos com o veículo', pct: 1 },
    '3_5_ANOS':     { label: '3 a 5 anos com o veículo', pct: 2 },
    MAIS_5_ANOS:    { label: 'Mais de 5 anos com o veículo', pct: 3 },
  }
  const tempo = tempoMap[tempoComVeiculo ?? '']
  if (tempo && tempo.pct !== 0) fatores.push(tempo)

  const totalPct = fatores.reduce((acc, f) => acc + f.pct, 0)
  const sugerido = base * (1 + totalPct / 100)
  return { sugerido, fatores }
}

interface SectionCardProps {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}

function SectionCard({ icon, title, children }: SectionCardProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-[#263650] bg-[#101a2c]">
      <header className="flex h-14 items-center justify-center gap-2 border-b border-[#263650] bg-[#1a2940] px-4">
        <span className="text-[#aebed5]">{icon}</span>
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#dbe7f8]">{title}</h2>
      </header>
      {children}
    </section>
  )
}

function DetailRow({ label, value, accent = false }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-5 border-b border-[#263650] py-3 last:border-b-0">
      <span className="text-sm text-[#8898ad]">{label}</span>
      <span className={`min-w-0 text-right text-sm font-semibold ${accent ? 'text-[#60a5fa]' : 'text-[#f0f4ff]'}`}>
        {value}
      </span>
    </div>
  )
}

function reminderTimestamp(reminder: Lembrete) {
  return reminder.concluidoEm ?? reminder.criadoEm
}

// ── Mapa de manutenção ────────────────────────────────────────────────────────
import type { TipoManutencao } from '@/lib/types'

type ZoneStatus = 'ok' | 'warning' | 'critical'

function zoneStatus(
  lembretes: Lembrete[],
  veiculoId: string,
  tipos: TipoManutencao[],
  hoje: string,
): ZoneStatus {
  const rel = lembretes.filter(
    (l) => !l.concluido && l.veiculoId === veiculoId && tipos.includes(l.tipo),
  )
  if (rel.length === 0) return 'ok'
  return rel.some((l) => l.dataLimite && l.dataLimite < hoje) ? 'critical' : 'warning'
}

function zoneColor(s: ZoneStatus, dim = false) {
  if (s === 'critical') return dim ? '#f87171aa' : '#f87171'
  if (s === 'warning') return dim ? '#fbbf24aa' : '#fbbf24'
  return dim ? '#4ade80aa' : '#4ade80'
}

function zoneFill(s: ZoneStatus) {
  if (s === 'critical') return '#f8717116'
  if (s === 'warning') return '#fbbf2412'
  return '#4ade8012'
}

function MaintenanceMap({
  lembretes,
  veiculoId,
}: {
  lembretes: Lembrete[]
  veiculoId: string
}) {
  const hoje = new Date().toISOString().split('T')[0]
  const st = (tipos: TipoManutencao[]) => zoneStatus(lembretes, veiculoId, tipos, hoje)

  const motor   = st(['OLEO', 'REVISAO', 'MECANICA'])
  const bateria = st(['BATERIA'])
  const freio   = st(['FREIO'])
  const pneu    = st(['PNEU'])
  const cambio  = st(['TRANSMISSAO'])
  const carBody = st(['FUNILARIA', 'VIDROS'])
  const docs    = st(['LICENCIAMENTO', 'IPVA', 'SEGURO'])

  function Chip({ x, y, label, status }: { x: number; y: number; label: string; status: ZoneStatus }) {
    const c = zoneColor(status)
    const w = label.length * 6.2 + 14
    return (
      <g>
        <rect x={x - w / 2} y={y - 9} width={w} height={17} rx={5}
          fill={status === 'ok' ? '#0d1a2e' : zoneFill(status)}
          stroke={c} strokeWidth={status === 'ok' ? 1 : 1.5} />
        <text x={x} y={y + 3.5} textAnchor="middle" fontSize="8" fill={c} fontWeight="700"
          style={{ fontFamily: 'system-ui, sans-serif', letterSpacing: '0.03em' }}>
          {label}
        </text>
      </g>
    )
  }

  function SideLabel({ x, y, label, status }: { x: number; y: number; label: string; status: ZoneStatus }) {
    const c = zoneColor(status)
    return (
      <text x={x} y={y} textAnchor="middle" fontSize="8" fill={c} fontWeight="700"
        style={{ fontFamily: 'system-ui, sans-serif' }}>
        {label}
      </text>
    )
  }

  function Book({ x, y, label, status }: { x: number; y: number; label: string; status: ZoneStatus }) {
    const c = zoneColor(status)
    const f = zoneFill(status)
    return (
      <g>
        {/* Capa do livro */}
        <rect x={x} y={y} width={20} height={26} rx={3}
          fill={f} stroke={c} strokeWidth="1.5" />
        {/* Lombada */}
        <rect x={x} y={y} width={4} height={26} rx={3}
          fill={c + '55'} stroke={c} strokeWidth="0.5" />
        {/* Linhas de páginas */}
        <line x1={x + 6} y1={y + 7}  x2={x + 18} y2={y + 7}  stroke={c} strokeWidth="1" opacity="0.5" />
        <line x1={x + 6} y1={y + 11} x2={x + 18} y2={y + 11} stroke={c} strokeWidth="1" opacity="0.5" />
        <line x1={x + 6} y1={y + 15} x2={x + 18} y2={y + 15} stroke={c} strokeWidth="1" opacity="0.5" />
        <line x1={x + 6} y1={y + 19} x2={x + 18} y2={y + 19} stroke={c} strokeWidth="1" opacity="0.5" />
        {/* Label */}
        <text x={x + 10} y={y + 35} textAnchor="middle" fontSize="7.5" fill={c} fontWeight="700"
          style={{ fontFamily: 'system-ui, sans-serif' }}>
          {label}
        </text>
      </g>
    )
  }

  return (
    <div className="mt-3 rounded-2xl bg-[#070d1c] py-3">
      <svg viewBox="0 0 300 235" className="mx-auto w-full max-w-[280px]">

        {/* ── Carro ── */}
        <rect x={95} y={22} width={110} height={148} rx={17}
          fill="#0b1528" stroke={zoneColor(carBody)} strokeWidth={carBody === 'ok' ? 1.5 : 2.5} />

        {/* Zona motor */}
        <rect x={102} y={28} width={96} height={50} rx={10}
          fill={zoneFill(motor)} stroke={zoneColor(motor)} strokeWidth={motor === 'ok' ? 0 : 1.5} />

        {/* Para-brisa */}
        <rect x={105} y={30} width={90} height={24} rx={7} fill="#162035" opacity="0.9" />

        {/* Bateria — quadrado dentro do motor (canto superior direito) */}
        <rect x={177} y={32} width={20} height={14} rx={3}
          fill={bateria === 'ok' ? '#162035' : zoneFill(bateria)}
          stroke={zoneColor(bateria)} strokeWidth="1.5" />
        <text x={187} y={42} textAnchor="middle" fontSize="6.5" fill={zoneColor(bateria)} fontWeight="700"
          style={{ fontFamily: 'system-ui, sans-serif' }}>
          BAT
        </text>

        {/* Linha do capô */}
        <line x1={95} y1={78} x2={205} y2={78} stroke="#1e3050" strokeWidth="1" />

        {/* Zona câmbio */}
        <rect x={120} y={85} width={60} height={36} rx={9}
          fill={zoneFill(cambio)} stroke={zoneColor(cambio)} strokeWidth={cambio === 'ok' ? 0.8 : 1.5} />

        {/* Linha porta-malas */}
        <line x1={95} y1={122} x2={205} y2={122} stroke="#1e3050" strokeWidth="1" />

        {/* Vigia traseiro */}
        <rect x={105} y={125} width={90} height={18} rx={5} fill="#162035" opacity="0.7" />

        {/* Porta-malas — STEP */}
        <rect x={102} y={145} width={96} height={20} rx={7}
          fill={zoneFill(docs)} stroke={zoneColor(docs)} strokeWidth={docs === 'ok' ? 0.8 : 1.5} />
        <text x={150} y={158} textAnchor="middle" fontSize="7.5" fill={zoneColor(docs)} fontWeight="700"
          style={{ fontFamily: 'system-ui, sans-serif' }}>
          STEP
        </text>

        {/* ── Rodas ── */}
        {/* DE */}
        <rect x={60} y={35} width={25} height={38} rx={6}
          fill={pneu === 'ok' ? '#101d32' : zoneFill(pneu)}
          stroke={zoneColor(pneu)} strokeWidth="1.8" />
        {freio !== 'ok' && (
          <circle cx={72} cy={54} r={7} fill="none" stroke={zoneColor(freio)} strokeWidth="1.5" strokeDasharray="3.5 2" />
        )}

        {/* DD */}
        <rect x={215} y={35} width={25} height={38} rx={6}
          fill={pneu === 'ok' ? '#101d32' : zoneFill(pneu)}
          stroke={zoneColor(pneu)} strokeWidth="1.8" />
        {freio !== 'ok' && (
          <circle cx={228} cy={54} r={7} fill="none" stroke={zoneColor(freio)} strokeWidth="1.5" strokeDasharray="3.5 2" />
        )}

        {/* TE */}
        <rect x={60} y={106} width={25} height={38} rx={6}
          fill={pneu === 'ok' ? '#101d32' : zoneFill(pneu)}
          stroke={zoneColor(pneu)} strokeWidth="1.8" />
        {freio !== 'ok' && (
          <circle cx={72} cy={125} r={7} fill="none" stroke={zoneColor(freio)} strokeWidth="1.5" strokeDasharray="3.5 2" />
        )}

        {/* TD */}
        <rect x={215} y={106} width={25} height={38} rx={6}
          fill={pneu === 'ok' ? '#101d32' : zoneFill(pneu)}
          stroke={zoneColor(pneu)} strokeWidth="1.8" />
        {freio !== 'ok' && (
          <circle cx={228} cy={125} r={7} fill="none" stroke={zoneColor(freio)} strokeWidth="1.5" strokeDasharray="3.5 2" />
        )}

        {/* ── Chips de zona ── */}
        <Chip x={150} y={54} label="MOTOR" status={motor} />
        <Chip x={150} y={103} label="CÂMBIO" status={cambio} />

        {/* Labels de posição das rodas */}
        <text x={72}  y={29}  textAnchor="middle" fontSize="7.5" fill="#5a82a8" fontWeight="700">DE</text>
        <text x={228} y={29}  textAnchor="middle" fontSize="7.5" fill="#5a82a8" fontWeight="700">DD</text>
        <text x={72}  y={152} textAnchor="middle" fontSize="7.5" fill="#5a82a8" fontWeight="700">TE</text>
        <text x={228} y={152} textAnchor="middle" fontSize="7.5" fill="#5a82a8" fontWeight="700">TD</text>

        {/* Labels laterais */}
        <SideLabel x={37}  y={54} label="PNEU"  status={pneu} />
        <SideLabel x={37}  y={65} label="FREIO" status={freio} />
        <SideLabel x={263} y={54} label="PNEU"  status={pneu} />
        <SideLabel x={263} y={65} label="FREIO" status={freio} />

        {/* ── Livros lado a lado, abaixo e afastados do carro ── */}
        {/* Livro 1 — IPVA */}
        <Book x={118} y={178} label="IPVA" status={docs} />
        {/* Livro 2 — LIC */}
        <Book x={144} y={178} label="LIC"  status={docs} />
      </svg>

      {/* Legenda */}
      <div className="mt-1 flex items-center justify-center gap-5">
        {([['#4ade80', 'Em dia'], ['#fbbf24', 'Pendente'], ['#f87171', 'Atrasado']] as [string, string][]).map(([color, label]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[11px] text-[#3d5370]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RelatorioScreen() {
  const { veiculoId } = useParams<{ veiculoId: string }>()
  const navigate = useNavigate()
  const { veiculos, lembretes, updateVeiculoLocal } = useStore()
  const [noticePage, setNoticePage] = useState(0)

  const veiculo = veiculos.find((item) => item.id === veiculoId)

  const [fipeValor, setFipeValor] = useState<string | null>(null)
  useEffect(() => {
    if (!veiculo?.fipeCodMarca || !veiculo?.fipeCodModelo || !veiculo?.fipeCodAno) return
    const fipeTipo = getFipeTipo(veiculo.tipoVeiculo)
    if (!fipeTipo) return
    getPreco(fipeTipo, veiculo.fipeCodMarca, veiculo.fipeCodModelo, veiculo.fipeCodAno)
      .then((p) => setFipeValor(p.Valor))
      .catch(() => setFipeValor(null))
  }, [veiculo?.id])


  // ── Auto-vinculação FIPE ─────────────────────────────────────────────────────
  const fipeTipoVeiculo = veiculo ? getFipeTipo(veiculo.tipoVeiculo) : null

  useEffect(() => {
    if (!veiculo || !fipeTipoVeiculo) return
    // Se já tem códigos, só busca o preço
    if (veiculo.fipeCodMarca && veiculo.fipeCodModelo && veiculo.fipeCodAno) return
    if (!veiculo.marca || !veiculo.modelo) return

    const autoVincular = async () => {
      try {
        const marcasList = await getMarcas(fipeTipoVeiculo)
        const marcaMatch = marcasList.find(
          (m) => normalizarMarca(m.nome).toLowerCase() === normalizarMarca(veiculo.marca).toLowerCase()
        )
        if (!marcaMatch) return

        const modelosList = await getModelos(fipeTipoVeiculo, marcaMatch.codigo)
        const modeloMatch = modelosList.find((m) => m.nome.toLowerCase() === veiculo.modelo.toLowerCase())
        if (!modeloMatch) return

        const anosList = await getAnos(fipeTipoVeiculo, marcaMatch.codigo, modeloMatch.codigo)
        const anoMatch = veiculo.ano
          ? anosList.find((a) => a.nome.startsWith(veiculo.ano!))
          : anosList[0]
        if (!anoMatch) return

        const preco = await getPreco(fipeTipoVeiculo, marcaMatch.codigo, String(modeloMatch.codigo), anoMatch.codigo)
        const atualizado: Veiculo = {
          ...veiculo,
          fipeCodMarca: marcaMatch.codigo,
          fipeCodModelo: String(modeloMatch.codigo),
          fipeCodAno: anoMatch.codigo,
        }
        await updateVeiculo(atualizado.userId, atualizado)
        updateVeiculoLocal(atualizado)
        setFipeValor(preco.Valor)
      } catch {
        // silencioso — FIPE offline ou sem match
      }
    }

    autoVincular()
  }, [veiculo?.id])

  const vehicleReminders = useMemo(
    () => lembretes.filter((item) => item.veiculoId === veiculoId),
    [lembretes, veiculoId]
  )

  const completed = useMemo(
    () => vehicleReminders.filter((item) => item.concluido).sort((a, b) => reminderTimestamp(b) - reminderTimestamp(a)),
    [vehicleReminders]
  )

  const pending = useMemo(
    () => vehicleReminders
      .filter((item) => !item.concluido)
      .sort((a, b) => (a.dataLimite || '9999-12-31').localeCompare(b.dataLimite || '9999-12-31')),
    [vehicleReminders]
  )

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const totalYear = completed.reduce((sum, item) => {
    const date = new Date(reminderTimestamp(item))
    return date.getFullYear() === currentYear ? sum + item.valor : sum
  }, 0)
  const totalMonth = completed.reduce((sum, item) => {
    const date = new Date(reminderTimestamp(item))
    return date.getFullYear() === currentYear && date.getMonth() === currentMonth ? sum + item.valor : sum
  }, 0)

  const overdueCount = pending.filter((item) => {
    if (!item.dataLimite) return false
    return new Date(`${item.dataLimite}T23:59:59`).getTime() < Date.now()
  }).length

  const noticePages = Math.max(1, Math.ceil(pending.length / PAGE_SIZE))
  const visibleNotices = pending.slice(noticePage * PAGE_SIZE, (noticePage + 1) * PAGE_SIZE)
  const nextService = pending.find((item) => item.dataLimite)?.dataLimite

  const legalValue = (type: Lembrete['tipo']) => {
    const reminder = pending.find((item) => item.tipo === type)
    return reminder?.dataLimite ? formatDate(reminder.dataLimite) : 'N/A'
  }


  if (!veiculo) {
    return (
      <PageTransition className="flex min-h-full items-center justify-center bg-[#070c14] px-6 text-center">
        <div>
          <p className="font-semibold text-[#f0f4ff]">Veículo não encontrado</p>
          <button onClick={() => navigate('/garagem')} className="mt-3 text-sm text-[#60a5fa]">
            Voltar para a garagem
          </button>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition className="min-h-full bg-[#070c14] text-[#f0f4ff]">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-8 pt-5">
        {/* ── Hero card ── */}
        <section className="relative overflow-hidden rounded-3xl border border-[#1a2d48] bg-[#070d1c]">
          {/* Glow com a cor do veículo */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(ellipse 70% 50% at 50% 100%, ${veiculo.cor}30 0%, transparent 70%)`,
            }}
          />
          {/* Linha colorida no topo */}
          <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, transparent, ${veiculo.cor}, transparent)` }} />

          <div className="px-5 pb-5 pt-4">
            {/* Nome + marca/modelo */}
            <h1 className="text-center text-2xl font-bold tracking-tight text-[#f4f7ff]">{veiculo.nome}</h1>
            <p className="mt-0.5 text-center text-sm text-[#4a6480]">
              {[normalizarMarca(veiculo.marca), veiculo.modelo, veiculo.ano].filter(Boolean).join(' · ')}
            </p>

            {/* Mapa de manutenção */}
            <MaintenanceMap
              lembretes={lembretes}
              veiculoId={veiculoId ?? ''}
            />

          </div>
        </section>

        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => navigate(`/veiculo/${veiculoId}/abastecimento`)}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2563eb] to-[#4f8df7] text-sm font-bold text-white shadow-lg shadow-blue-500/15 active:scale-[0.98]"
          >
            <Fuel size={18} />
            Ver consumo
          </button>
        </div>

        <SectionCard icon={<Info size={19} />} title="Resumo">
          <div className="px-5">
            <DetailRow label="Marca/Modelo" value={[normalizarMarca(veiculo.marca), veiculo.modelo].filter(Boolean).join(' · ') || 'N/A'} />
            <DetailRow label="Saúde" value={overdueCount ? `${overdueCount} atrasado${overdueCount > 1 ? 's' : ''}` : 'Em dia'} accent />
            <DetailRow label={`Total ano ${currentYear}`} value={formatCurrency(totalYear)} />
            <DetailRow label={`Total mês ${String(currentMonth + 1).padStart(2, '0')}/${currentYear}`} value={formatCurrency(totalMonth)} />
            <DetailRow label="KM atual" value={veiculo.semControleKm ? 'Sem controle' : formatKm(veiculo.kmAtual)} accent />
            {fipeValor && <DetailRow label="Tabela FIPE" value={fipeValor} />}
          </div>
        </SectionCard>

        {fipeValor && (() => {
          const { sugerido, fatores } = calcularSugestaoVenda(
            fipeValor,
            veiculo.vezesBatido,
            overdueCount,
            pending.length,
            veiculo.tempoComVeiculo,
          )
          const totalPct = fatores.reduce((acc, f) => acc + f.pct, 0)
          return (
            <SectionCard icon={<Tag size={19} />} title="Sugestão de venda">
              <div className="px-5 pb-2">
                <div className="flex items-center justify-between py-4 border-b border-[#263650]">
                  <span className="text-sm text-[#8898ad]">Valor sugerido</span>
                  <span className="text-xl font-bold text-[#60a5fa]">{formatCurrency(sugerido)}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-[#263650]">
                  <span className="text-sm text-[#8898ad]">Base (FIPE)</span>
                  <span className="text-sm font-semibold text-[#f0f4ff]">{fipeValor}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-[#263650]">
                  <span className="text-sm text-[#8898ad]">Ajuste total</span>
                  <span className={`text-sm font-bold ${totalPct < 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {totalPct > 0 ? '+' : ''}{totalPct}%
                  </span>
                </div>
                {fatores.length > 0 && (
                  <div className="pt-3 pb-1 flex flex-col gap-2">
                    {fatores.map((f, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-xs text-[#8898ad]">{f.label}</span>
                        <span className={`text-xs font-semibold ${f.pct < 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {f.pct > 0 ? '+' : ''}{f.pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SectionCard>
          )
        })()}

        <SectionCard icon={<Wrench size={19} />} title="Ficha técnica">
          <div className="px-5">
            <DetailRow
              label="Cor"
              value={<span className="inline-flex items-center gap-2"><i className="h-3 w-3 rounded-full border border-white/20" style={{ backgroundColor: veiculo.cor }} />{getCorNome(veiculo.cor) || 'N/A'}</span>}
            />
            <DetailRow label="Modelo" value={veiculo.modelo || 'N/A'} />
            <DetailRow label="Tipo" value={veiculo.tipoVeiculo.replace(/_/g, ' ')} />
            <DetailRow label="Código ID" value={veiculo.id.slice(0, 8).toUpperCase()} />
            <DetailRow label="Próx. serviço" value={nextService ? formatDate(nextService) : 'N/A'} accent={Boolean(nextService)} />
            <DetailRow label="Mantenedor" value={veiculo.proprietario || 'N/A'} />
          </div>
        </SectionCard>

        <SectionCard icon={<FileText size={19} />} title="Situação legal">
          <div className="grid grid-cols-3 divide-x divide-[#263650] px-2 py-6 text-center">
            {[
              ['IPVA', legalValue('IPVA')],
              ['Licenciamento', legalValue('LICENCIAMENTO')],
              ['Seguro', legalValue('SEGURO')],
            ].map(([label, value]) => (
              <div key={label} className="px-1">
                <p className="text-xs text-[#8898ad]">{label}</p>
                <p className="mt-1 text-sm font-bold text-[#dbe7f8]">{value}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard icon={<History size={19} />} title="Registros cadastrados">
          {completed.length === 0 ? (
            <div className="m-4 rounded-2xl border border-[#263650] bg-[#0c1525] px-5 py-8 text-center">
              <History size={24} className="mx-auto text-[#718096]" />
              <p className="mt-4 font-semibold">Sem registros cadastrados</p>
              <p className="mt-2 text-sm leading-relaxed text-[#8898ad]">
                Quando você concluir um serviço, ele aparecerá aqui com data e valor.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#263650]">
              {completed.slice(0, 5).map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.titulo}</p>
                    <p className="mt-1 text-xs text-[#8898ad]">{item.dataLimite ? formatDate(item.dataLimite) : 'Sem data'}</p>
                  </div>
                  <p className="self-center text-sm font-semibold text-[#60a5fa]">{formatCurrency(item.valor)}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard icon={<CalendarDays size={19} />} title="Avisos cadastrados">
          {pending.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[#8898ad]">Nenhum aviso pendente.</p>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_92px_72px] bg-[#17243a] px-4 py-3 text-xs font-bold text-[#dbe7f8]">
                <span>Item</span><span className="text-center">Data</span><span className="text-right">KM</span>
              </div>
              <div className="divide-y divide-[#263650]">
                {visibleNotices.map((item) => (
                  <div key={item.id} className="grid min-h-16 grid-cols-[1fr_92px_72px] items-center px-4 py-3 text-sm">
                    <span className="pr-2 font-medium">{item.titulo}</span>
                    <span className="text-center text-xs text-[#9cabbf]">{item.dataLimite ? formatDate(item.dataLimite) : '—'}</span>
                    <span className="text-right text-xs text-[#dbe7f8]">{item.kmLimite || '—'}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-6 border-t border-[#263650] bg-[#17243a] py-4">
                <button
                  onClick={() => setNoticePage((page) => Math.max(0, page - 1))}
                  disabled={noticePage === 0}
                  aria-label="Página anterior"
                  className="text-[#dbe7f8] disabled:opacity-30"
                ><ChevronLeft size={21} /></button>
                <span className="text-sm text-[#9cabbf]">Página {noticePage + 1}/{noticePages}</span>
                <button
                  onClick={() => setNoticePage((page) => Math.min(noticePages - 1, page + 1))}
                  disabled={noticePage >= noticePages - 1}
                  aria-label="Próxima página"
                  className="text-[#dbe7f8] disabled:opacity-30"
                ><ChevronRight size={21} /></button>
              </div>
            </>
          )}
        </SectionCard>

      </div>
    </PageTransition>
  )
}
