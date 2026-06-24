import { useMemo } from 'react'
import { ChevronRight, Fuel, ReceiptText, WalletCards, Wrench } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { VehicleIllustration } from '@/components/VehicleIllustration'
import { useStore } from '@/lib/store'
import type { Abastecimento, Lembrete } from '@/lib/types'
import { normalizarMarca } from '@/lib/utils'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function parseDate(value: string): Date | null {
  if (!value) return null
  const brMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  const date = brMatch
    ? new Date(Number(brMatch[3]), Number(brMatch[2]) - 1, Number(brMatch[1]))
    : new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function fuelDate(item: Abastecimento): Date | null {
  return parseDate(item.data) ?? (item.criadoEm ? new Date(item.criadoEm) : null)
}

function maintenanceDate(item: Lembrete): Date | null {
  return item.concluidoEm ? new Date(item.concluidoEm) : parseDate(item.dataLimite)
}

function isCurrentMonth(date: Date | null, now: Date): boolean {
  return Boolean(date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear())
}

function isCurrentYear(date: Date | null, now: Date): boolean {
  return Boolean(date && date.getFullYear() === now.getFullYear())
}

export default function FleetCostsScreen() {
  const navigate = useNavigate()
  const vehicles = useStore((state) => state.veiculos)
  const fuelEntries = useStore((state) => state.abastecimentos)
  const reminders = useStore((state) => state.lembretes)

  const data = useMemo(() => {
    const now = new Date()
    const completedMaintenance = reminders.filter((item) => item.concluido && item.valor > 0)

    const rows = vehicles.map((vehicle) => {
      const vehicleFuel = fuelEntries.filter((item) => item.veiculoId === vehicle.id)
      const vehicleMaintenance = completedMaintenance.filter((item) => item.veiculoId === vehicle.id)
      const fuelTotal = vehicleFuel.reduce((total, item) => total + (item.valorPago || 0), 0)
      const maintenanceTotal = vehicleMaintenance.reduce((total, item) => total + (item.valor || 0), 0)
      const monthTotal =
        vehicleFuel.filter((item) => isCurrentMonth(fuelDate(item), now)).reduce((total, item) => total + (item.valorPago || 0), 0) +
        vehicleMaintenance.filter((item) => isCurrentMonth(maintenanceDate(item), now)).reduce((total, item) => total + (item.valor || 0), 0)
      const yearTotal =
        vehicleFuel.filter((item) => isCurrentYear(fuelDate(item), now)).reduce((total, item) => total + (item.valorPago || 0), 0) +
        vehicleMaintenance.filter((item) => isCurrentYear(maintenanceDate(item), now)).reduce((total, item) => total + (item.valor || 0), 0)

      return {
        vehicle,
        fuelTotal,
        maintenanceTotal,
        monthTotal,
        yearTotal,
        total: fuelTotal + maintenanceTotal,
      }
    }).sort((first, second) => second.total - first.total)

    return {
      rows,
      monthTotal: rows.reduce((total, row) => total + row.monthTotal, 0),
      yearTotal: rows.reduce((total, row) => total + row.yearTotal, 0),
      allTimeTotal: rows.reduce((total, row) => total + row.total, 0),
    }
  }, [fuelEntries, reminders, vehicles])

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-12 pt-6 sm:px-6">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#fbbf24]">Zellu Premium</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#f4f7ff]">Painel de custos</h1>
        <p className="mt-2 text-sm leading-6 text-[#8fa0b9]">Combustível e manutenções concluídas reunidos para facilitar as decisões da frota.</p>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3" aria-label="Resumo de custos">
        <div className="rounded-2xl border border-[#f59e0b]/20 bg-[#f59e0b]/[0.06] p-4">
          <WalletCards size={19} className="text-[#fbbf24]" aria-hidden="true" />
          <p className="mt-3 text-lg font-semibold text-white">{currencyFormatter.format(data.monthTotal)}</p>
          <p className="mt-1 text-[11px] text-[#8392a9]">Total deste mês</p>
        </div>
        <div className="rounded-2xl border border-[#203653] bg-[#101d32] p-4">
          <ReceiptText size={19} className="text-[#70a7ff]" aria-hidden="true" />
          <p className="mt-3 text-lg font-semibold text-white">{currencyFormatter.format(data.yearTotal)}</p>
          <p className="mt-1 text-[11px] text-[#8392a9]">Total deste ano</p>
        </div>
      </section>

      <div className="mt-3 flex items-center justify-between rounded-2xl border border-[#203653] bg-[#0d192c] px-4 py-3">
        <span className="text-xs text-[#8392a9]">Total registrado</span>
        <strong className="text-sm text-[#dce7f8]">{currencyFormatter.format(data.allTimeTotal)}</strong>
      </div>

      <section className="mt-6" aria-labelledby="vehicle-costs-title">
        <h2 id="vehicle-costs-title" className="text-xs font-bold uppercase tracking-[0.16em] text-[#8297b7]">Por veículo</h2>

        {data.rows.length === 0 ? (
          <div className="mt-3 rounded-[24px] border border-[#203653] bg-[#101d32] px-6 py-12 text-center">
            <WalletCards size={32} className="mx-auto text-[#60708a]" aria-hidden="true" />
            <p className="mt-4 text-sm font-semibold text-[#e7eefb]">Nenhum veículo cadastrado</p>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {data.rows.map((row, index) => (
              <button
                key={row.vehicle.id}
                type="button"
                onClick={() => navigate(`/relatorio/${row.vehicle.id}`)}
                className="w-full rounded-[24px] border border-[#203653] bg-[#101d32] p-4 text-left transition-transform active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#172944]">
                    <VehicleIllustration tipo={row.vehicle.tipoVeiculo} className="h-11 w-11 object-contain" />
                    <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#4f8df7] px-1 text-[10px] font-bold text-white">{index + 1}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-[#f4f7ff]">{row.vehicle.nome}</p>
                    <p className="mt-0.5 truncate text-xs text-[#8392a9]">{normalizarMarca(row.vehicle.marca)} · {row.vehicle.modelo}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#fbbf24]">{currencyFormatter.format(row.total)}</p>
                    <p className="mt-0.5 text-[10px] text-[#66758d]">total</p>
                  </div>
                  <ChevronRight size={17} className="shrink-0 text-[#60708a]" aria-hidden="true" />
                </div>

                <div className="mt-4 grid grid-cols-2 divide-x divide-[#203653] rounded-2xl border border-[#203653] bg-[#0b1627] py-3">
                  <div className="flex items-center gap-2 px-3">
                    <Fuel size={16} className="shrink-0 text-[#70a7ff]" aria-hidden="true" />
                    <div>
                      <p className="text-[10px] text-[#66758d]">Combustível</p>
                      <p className="mt-0.5 text-xs font-semibold text-[#dce7f8]">{currencyFormatter.format(row.fuelTotal)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3">
                    <Wrench size={16} className="shrink-0 text-[#4ade80]" aria-hidden="true" />
                    <div>
                      <p className="text-[10px] text-[#66758d]">Manutenção</p>
                      <p className="mt-0.5 text-xs font-semibold text-[#dce7f8]">{currencyFormatter.format(row.maintenanceTotal)}</p>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
