import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Bike,
  Car,
  Circle,
  ClipboardList,
  Cog,
  CreditCard,
  Droplet,
  Droplets,
  FileText,
  Fuel,
  Link2,
  MoreHorizontal,
  Package,
  Paintbrush,
  Shield,
  Sparkles,
  Star,
  Wrench,
  BatteryCharging,
  Disc3,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageTransition } from '@/components/layout/PageTransition'
import ReminderFormSheet from '@/components/reminders/ReminderFormSheet'
import { Button, EmptyState } from '@/components/ui'
import { useStore } from '@/lib/store'
import { getTipoColor, getTipoLabel } from '@/lib/utils'
import type { TipoManutencao } from '@/lib/types'

const CATEGORY_ICONS: Record<TipoManutencao, LucideIcon> = {
  CORRENTE: Link2,
  LUBRIFICACAO: Droplet,
  PEDIVELA: Bike,
  ACESSORIOS: Package,
  CONFORTO: Star,
  PNEU: Circle,
  TRANSMISSAO: Cog,
  REVISAO: ClipboardList,
  OLEO: Droplets,
  LAVAGEM: Sparkles,
  ABASTECIMENTO: Fuel,
  BATERIA: BatteryCharging,
  VIDROS: Car,
  MECANICA: Wrench,
  FUNILARIA: Paintbrush,
  FREIO: Disc3,
  LICENCIAMENTO: FileText,
  IPVA: CreditCard,
  SEGURO: Shield,
  OUTROS: MoreHorizontal,
}

const CATEGORY_ORDER: TipoManutencao[] = [
  'LAVAGEM',
  'OLEO',
  'FREIO',
  'PNEU',
  'REVISAO',
  'MECANICA',
  'FUNILARIA',
  'BATERIA',
  'TRANSMISSAO',
  'VIDROS',
  'LICENCIAMENTO',
  'IPVA',
  'SEGURO',
  'ABASTECIMENTO',
  'CORRENTE',
  'LUBRIFICACAO',
  'PEDIVELA',
  'ACESSORIOS',
  'CONFORTO',
  'OUTROS',
]

type ReminderMode = 'concluido' | 'futuro'
const BIKE_TYPES = ['BICICLETA', 'BIKE_ELETRICA']
const BIKE_ONLY_CATEGORIES: TipoManutencao[] = ['CORRENTE', 'LUBRIFICACAO', 'PEDIVELA']

export default function ReminderCategoryScreen() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const veiculos = useStore((s) => s.veiculos)

  const mode: ReminderMode = searchParams.get('modo') === 'concluido' ? 'concluido' : 'futuro'
  const [selectedTipo, setSelectedTipo] = useState<TipoManutencao | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const veiculo = useMemo(() => veiculos.find((v) => v.id === id), [veiculos, id])
  const visibleCategories = useMemo(() => {
    const isBike = veiculo ? BIKE_TYPES.includes(veiculo.tipoVeiculo) : false
    return CATEGORY_ORDER.filter((tipo) => isBike || !BIKE_ONLY_CATEGORIES.includes(tipo))
  }, [veiculo])

  const title = mode === 'concluido' ? 'O que já aconteceu?' : 'O que vamos lembrar?'
  const subtitle =
    mode === 'concluido'
      ? 'Escolha a categoria do serviço concluído.'
      : 'Escolha a categoria para criar o aviso.'

  function handleSelect(tipo: TipoManutencao) {
    if (!id) return

    if (tipo === 'ABASTECIMENTO') {
      navigate(`/veiculo/${id}/abastecimento?novo=1`)
      return
    }

    setSelectedTipo(tipo)
    setFormOpen(true)
  }

  if (!id || !veiculo) {
    return (
      <PageTransition className="min-h-full bg-[#070c14] px-4 py-8">
        <EmptyState
          icon={<span className="text-2xl">🚗</span>}
          title="Veículo não encontrado"
          description="Volte para a garagem e escolha um veículo novamente."
          action={<Button onClick={() => navigate('/garagem')}>Ir para garagem</Button>}
        />
      </PageTransition>
    )
  }

  return (
    <PageTransition className="min-h-full bg-[#070c14] text-[#f0f4ff]">
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 py-6">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-[#4f8df7]/25 bg-[#4f8df7]/15 shadow-lg shadow-[#4f8df7]/10">
            <ClipboardList size={30} className="text-[#60a5fa]" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8892a4]">
            {veiculo.nome}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#9aa8bd]">{subtitle}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 pb-6 sm:grid-cols-3">
          {visibleCategories.map((tipo) => {
            const Icon = CATEGORY_ICONS[tipo]
            const color = getTipoColor(tipo)

            return (
              <button
                key={tipo}
                type="button"
                onClick={() => handleSelect(tipo)}
                className="group flex min-h-[92px] items-center gap-3 rounded-2xl border border-[#1e2d44] bg-[#131e33] px-3.5 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-[#4f8df7]/45 hover:bg-[#17243d] active:scale-[0.98]"
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${color}22` }}
                >
                  <Icon size={21} style={{ color }} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold leading-tight text-[#f0f4ff]">
                    {getTipoLabel(tipo)}
                  </span>
                  {tipo === 'ABASTECIMENTO' && (
                    <span className="mt-1 block text-[11px] leading-tight text-[#8892a4]">
                      cadastro próprio
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {selectedTipo && (
        <ReminderFormSheet
          isOpen={formOpen}
          onClose={() => setFormOpen(false)}
          veiculoId={id}
          initialTipo={selectedTipo}
          createAsCompleted={mode === 'concluido'}
        />
      )}
    </PageTransition>
  )
}
