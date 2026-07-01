import { useMemo } from 'react'
import { AlertTriangle, CalendarClock, Car, CheckCircle2, ChevronRight, Download, Gauge } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { VehicleIllustration } from '@/components/VehicleIllustration'
import { useStore } from '@/lib/store'
import type { Lembrete, Veiculo } from '@/lib/types'
import { formatKm, getVeiculoLabel, normalizarMarca } from '@/lib/utils'
import { saveFleetOverviewReport } from '@/lib/pdfReports'


type AttentionLevel = 'critical' | 'attention' | 'ok'

interface VehicleOverview {
  vehicle: Veiculo
  pending: Lembrete[]
  overdueCount: number
  dueSoonCount: number
  level: AttentionLevel
  score: number
  healthScore: number
  nextReminder?: Lembrete
}

const levelStyles: Record<AttentionLevel, { label: string; badge: string; border: string }> = {
  critical: {
    label: 'Atenção imediata',
    badge: 'border-red-400/25 bg-red-400/10 text-red-300',
    border: 'border-red-400/30',
  },
  attention: {
    label: 'Acompanhar',
    badge: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
    border: 'border-amber-400/25',
  },
  ok: {
    label: 'Em dia',
    badge: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    border: 'border-[#203653]',
  },
}

function parseReminderDate(value: string): Date | null {
  if (!value) return null

  const brMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  const date = brMatch
    ? new Date(Number(brMatch[3]), Number(brMatch[2]) - 1, Number(brMatch[1]))
    : new Date(`${value}T00:00:00`)

  return Number.isNaN(date.getTime()) ? null : date
}

function getDaysUntil(value: string): number | null {
  const date = parseReminderDate(value)
  if (!date) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((date.getTime() - today.getTime()) / 86_400_000)
}

function getKmLimit(reminder: Lembrete): number | null {
  const value = Number(String(reminder.kmLimite).replace(/\D/g, ''))
  return value > 0 ? value : null
}

function isOverdue(reminder: Lembrete, vehicle: Veiculo): boolean {
  const days = getDaysUntil(reminder.dataLimite)
  const kmLimit = getKmLimit(reminder)
  return (days !== null && days < 0) || (kmLimit !== null && !vehicle.semControleKm && kmLimit <= vehicle.kmAtual)
}

function isDueSoon(reminder: Lembrete, vehicle: Veiculo): boolean {
  const days = getDaysUntil(reminder.dataLimite)
  const kmLimit = getKmLimit(reminder)
  const kmRemaining = kmLimit === null ? null : kmLimit - vehicle.kmAtual

  return (
    (days !== null && days >= 0 && days <= 30) ||
    (kmRemaining !== null && !vehicle.semControleKm && kmRemaining > 0 && kmRemaining <= 1_000)
  )
}

function getNextReminder(reminders: Lembrete[], vehicle: Veiculo): Lembrete | undefined {
  return [...reminders].sort((first, second) => {
    if (isOverdue(first, vehicle) !== isOverdue(second, vehicle)) {
      return isOverdue(first, vehicle) ? -1 : 1
    }

    const firstDays = getDaysUntil(first.dataLimite) ?? Number.MAX_SAFE_INTEGER
    const secondDays = getDaysUntil(second.dataLimite) ?? Number.MAX_SAFE_INTEGER
    return firstDays - secondDays
  })[0]
}

function formatReminderDeadline(reminder: Lembrete): string {
  const date = parseReminderDate(reminder.dataLimite)
  if (date) return date.toLocaleDateString('pt-BR')

  const kmLimit = getKmLimit(reminder)
  return kmLimit ? formatKm(kmLimit) : 'Sem prazo definido'
}

export default function FleetOverviewScreen() {
  const navigate = useNavigate()
  const vehicles = useStore((state) => state.veiculos)
  const reminders = useStore((state) => state.lembretes)

  const overview = useMemo<VehicleOverview[]>(() => {
    return vehicles
      .map((vehicle) => {
        const pending = reminders.filter(
          (reminder) => reminder.veiculoId === vehicle.id && !reminder.concluido
        )
        const overdueCount = pending.filter((reminder) => isOverdue(reminder, vehicle)).length
        const dueSoonCount = pending.filter(
          (reminder) => !isOverdue(reminder, vehicle) && isDueSoon(reminder, vehicle)
        ).length
        const level: AttentionLevel = overdueCount > 0 ? 'critical' : dueSoonCount > 0 ? 'attention' : 'ok'

        return {
          vehicle,
          pending,
          overdueCount,
          dueSoonCount,
          level,
          score: overdueCount * 100 + dueSoonCount * 10 + pending.length,
          healthScore: Math.max(
            0,
            100 - overdueCount * 25 - dueSoonCount * 10 - Math.max(0, pending.length - overdueCount - dueSoonCount) * 2
          ),
          nextReminder: getNextReminder(pending, vehicle),
        }
      })
      .sort((first, second) => second.score - first.score || first.vehicle.nome.localeCompare(second.vehicle.nome))
  }, [reminders, vehicles])

  const criticalCount = overview.filter((item) => item.level === 'critical').length
  const attentionCount = overview.filter((item) => item.level === 'attention').length
  const fleetSummary = criticalCount > 0
    ? `${criticalCount} veículo${criticalCount > 1 ? 's precisam' : ' precisa'} de atenção imediata. Comece por ${overview[0]?.vehicle.nome ?? 'o primeiro da lista'}, que concentra a maior prioridade.`
    : attentionCount > 0
      ? `A frota não possui itens vencidos, mas ${attentionCount} veículo${attentionCount > 1 ? 's têm' : ' tem'} serviços próximos. Antecipar esses cuidados ajuda a evitar paradas.`
      : vehicles.length > 0
        ? 'Sua frota está em dia. Continue registrando serviços e quilometragem para manter a análise atualizada.'
        : 'Cadastre veículos e avisos para receber uma análise automática da saúde da frota.'

  const handleExportPdf = async () => {
    try {
      await saveFleetOverviewReport({
        totalVehicles: vehicles.length,
        criticalCount,
        attentionCount,
        summary: fleetSummary,
        rows: overview.map(({ vehicle, pending, overdueCount, dueSoonCount, level, nextReminder, healthScore }) => {
          const subtitle = [normalizarMarca(vehicle.marca), vehicle.modelo, vehicle.ano]
            .filter(Boolean)
            .join(' - ') || getVeiculoLabel(vehicle.tipoVeiculo)

          return {
            nome: vehicle.nome || 'Veiculo',
            marcaModelo: subtitle,
            kmAtual: vehicle.semControleKm ? 'Sem controle' : formatKm(vehicle.kmAtual),
            pendentes: pending.length,
            vencidos: overdueCount,
            proximos: dueSoonCount,
            saude: healthScore,
            prioridade: levelStyles[level].label,
            proximoAviso: nextReminder
              ? `${nextReminder.titulo || 'Aviso'} - ${formatReminderDeadline(nextReminder)}`
              : 'Nenhum aviso pendente',
          }
        }),
      })
      toast.success('Relatorio PDF gerado.')
    } catch {
      toast.error('Nao foi possivel gerar o PDF.')
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-12 pt-6 sm:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#70a7ff]">Zellu Premium</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#f4f7ff]">Visão geral dos veículos</h1>
        <p className="mt-2 max-w-lg text-sm leading-6 text-[#8fa0b9]">
          Veículos ordenados por prioridade para você agir primeiro onde a frota precisa de mais atenção.
        </p>
        </div>
        <button
          type="button"
          onClick={handleExportPdf}
          className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-[#4f8df7]/30 bg-[#4f8df7]/10 px-4 text-sm font-semibold text-[#8bb9ff] transition hover:bg-[#4f8df7]/15 active:scale-[0.98]"
        >
          <Download size={16} />
          Gerar PDF
        </button>
      </header>

      <section className="mt-6 grid grid-cols-3 gap-2" aria-label="Resumo da frota">
        <div className="rounded-2xl border border-[#203653] bg-[#101d32] p-3">
          <Car size={18} className="text-[#70a7ff]" aria-hidden="true" />
          <p className="mt-3 text-xl font-semibold text-white">{vehicles.length}</p>
          <p className="mt-0.5 text-[11px] text-[#8392a9]">Veículos</p>
        </div>
        <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-3">
          <AlertTriangle size={18} className="text-red-300" aria-hidden="true" />
          <p className="mt-3 text-xl font-semibold text-white">{criticalCount}</p>
          <p className="mt-0.5 text-[11px] text-[#8392a9]">Críticos</p>
        </div>
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-3">
          <CalendarClock size={18} className="text-amber-300" aria-hidden="true" />
          <p className="mt-3 text-xl font-semibold text-white">{attentionCount}</p>
          <p className="mt-0.5 text-[11px] text-[#8392a9]">Acompanhar</p>
        </div>
      </section>

      <section className="mt-3 rounded-2xl border border-[#4f8df7]/25 bg-[#4f8df7]/[0.07] p-4" aria-labelledby="smart-summary-title">
        <div className="flex items-center gap-2 text-[#70a7ff]">
          <Gauge size={18} aria-hidden="true" />
          <h2 id="smart-summary-title" className="text-xs font-bold uppercase tracking-[0.14em]">Resumo inteligente</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-[#aebcd1]">{fleetSummary}</p>
      </section>

      {overview.length === 0 ? (
        <section className="mt-8 flex flex-col items-center rounded-[24px] border border-[#203653] bg-[#101d32] px-6 py-12 text-center">
          <Car size={34} className="text-[#60708a]" aria-hidden="true" />
          <h2 className="mt-4 text-base font-semibold text-[#edf3ff]">Nenhum veículo cadastrado</h2>
          <p className="mt-2 text-sm leading-6 text-[#8392a9]">Cadastre veículos na garagem para acompanhar a frota aqui.</p>
        </section>
      ) : (
        <section className="mt-6 space-y-3" aria-label="Veículos por prioridade">
          {overview.map(({ vehicle, pending, overdueCount, dueSoonCount, level, nextReminder, healthScore }) => {
            const styles = levelStyles[level]
            const subtitle = [normalizarMarca(vehicle.marca), vehicle.modelo]
              .filter(Boolean)
              .join(' · ') || getVeiculoLabel(vehicle.tipoVeiculo)

            return (
              <button
                key={vehicle.id}
                type="button"
                onClick={() => navigate(`/veiculo/${vehicle.id}`)}
                className={`w-full rounded-[24px] border bg-[#101d32] p-4 text-left transition-transform active:scale-[0.99] ${styles.border}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#172944]">
                    <VehicleIllustration tipo={vehicle.tipoVeiculo} className="h-11 w-11 object-contain" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold text-[#f4f7ff]">{vehicle.nome}</h2>
                        <p className="mt-0.5 truncate text-xs text-[#8392a9]">{subtitle}</p>
                      </div>
                      <ChevronRight size={18} className="mt-1 shrink-0 text-[#60708a]" aria-hidden="true" />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${styles.badge}`}>
                        {styles.label}
                      </span>
                      <span className="text-[11px] font-semibold text-[#8bb9ff]">Saúde {healthScore}/100</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 divide-x divide-[#203653] rounded-2xl border border-[#203653] bg-[#0b1627] py-3">
                  <div className="px-3">
                    <p className="text-[10px] uppercase tracking-wide text-[#66758d]">KM atual</p>
                    <p className="mt-1 truncate text-xs font-semibold text-[#dce7f8]">
                      {vehicle.semControleKm ? 'Sem controle' : formatKm(vehicle.kmAtual)}
                    </p>
                  </div>
                  <div className="px-3">
                    <p className="text-[10px] uppercase tracking-wide text-[#66758d]">Pendentes</p>
                    <p className="mt-1 text-xs font-semibold text-[#dce7f8]">{pending.length}</p>
                  </div>
                  <div className="px-3">
                    <p className="text-[10px] uppercase tracking-wide text-[#66758d]">Vencidos</p>
                    <p className={`mt-1 text-xs font-semibold ${overdueCount > 0 ? 'text-red-300' : 'text-[#dce7f8]'}`}>
                      {overdueCount}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3 rounded-2xl bg-[#14213a] px-3 py-3">
                  {nextReminder ? (
                    <>
                      <Gauge size={18} className={level === 'critical' ? 'text-red-300' : 'text-[#70a7ff]'} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-[#e7eefb]">{nextReminder.titulo}</p>
                        <p className="mt-0.5 text-[11px] text-[#8392a9]">
                          {formatReminderDeadline(nextReminder)}
                          {dueSoonCount > 0 && ` · ${dueSoonCount} próximo${dueSoonCount > 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} className="text-emerald-300" aria-hidden="true" />
                      <p className="text-xs font-medium text-[#a8b7ca]">Nenhum aviso pendente</p>
                    </>
                  )}
                </div>
              </button>
            )
          })}
        </section>
      )}
    </main>
  )
}
