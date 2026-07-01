import { ArrowRight, Bot, Car, Check, MapPinned, Package, ShieldCheck, Torus, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useStore } from '@/lib/store'

type BenefitLevel = 'free' | 'personal' | 'fleet' | 'business'

const benefitCards = [
  {
    title: 'Base gratuita',
    subtitle: 'Comece com um veiculo e lembretes essenciais.',
    icon: Car,
    color: '#94a3b8',
    path: '/garagem',
    requires: 'free' as BenefitLevel,
    features: ['1 veiculo', '5 avisos ativos', 'Historico basico de abastecimento'],
  },
  {
    title: 'Zellu AI',
    subtitle: 'Mecanico virtual para duvidas, sintomas e cuidados.',
    icon: Bot,
    color: '#4f8df7',
    path: '/mecanico-virtual',
    requires: 'personal' as BenefitLevel,
    features: ['30 consultas no Pessoal', '150 consultas no Frota', '500 consultas no Empresarial'],
  },
  {
    title: 'Pneus e pecas',
    subtitle: 'Controle pessoal de desgaste, vida util e alertas.',
    icon: Torus,
    color: '#60a5fa',
    path: '/premium/pneus',
    requires: 'personal' as BenefitLevel,
    features: ['Pneus por posicao', 'Pecas monitoradas', 'Relatorio por veiculo'],
  },
  {
    title: 'Visao da frota',
    subtitle: 'Prioridades, vencimentos e custos de todos os veiculos.',
    icon: WalletCards,
    color: '#f59e0b',
    path: '/premium/visao-geral',
    requires: 'fleet' as BenefitLevel,
    features: ['Resumo geral', 'Veiculos que precisam de atencao', 'Exportacao em lote'],
  },
  {
    title: 'Viagens',
    subtitle: 'Cadastro completo, gastos, notas e relatorio por viagem.',
    icon: MapPinned,
    color: '#a78bfa',
    path: '/premium/viagens',
    requires: 'fleet' as BenefitLevel,
    features: ['Cadastro de viagem', 'Notas dos gastos', 'Relatorio em PDF'],
  },
  {
    title: 'Estoque',
    subtitle: 'Inventario de pecas para operacoes com varios veiculos.',
    icon: Package,
    color: '#fbbf24',
    path: '/premium/estoque',
    requires: 'fleet' as BenefitLevel,
    features: ['Estoque minimo', 'Valor unitario', 'Alertas de reposicao'],
  },
  {
    title: 'Operacao empresarial',
    subtitle: 'Mais capacidade, escala e suporte comercial.',
    icon: ShieldCheck,
    color: '#c4b5fd',
    path: null,
    requires: 'business' as BenefitLevel,
    features: ['Ate 200 veiculos', 'Avisos e abastecimentos ilimitados', 'Suporte comercial'],
  },
]

export default function PremiumBenefitsScreen() {
  const user = useStore((state) => state.user)
  const plano = user?.plano ?? 'FREE'
  const hasPersonalAccess = plano === 'LITE' || plano === 'FROTA' || plano === 'EMPRESARIAL'
  const hasFleetAccess = plano === 'FROTA' || plano === 'EMPRESARIAL'
  const hasBusinessAccess = plano === 'EMPRESARIAL'

  function isUnlocked(level: BenefitLevel) {
    if (level === 'free') return true
    if (level === 'personal') return hasPersonalAccess
    if (level === 'fleet') return hasFleetAccess
    return hasBusinessAccess
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-12 pt-6 sm:px-6">
      <header className="mb-6 rounded-[28px] border border-[#28466f] bg-[#101d32] p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#70a7ff]">Beneficios do usuario</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">O que seu acesso libera</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#aeb8ca]">
          Veja os recursos disponiveis no seu plano atual e os beneficios que entram nos planos superiores.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {benefitCards.map((benefit) => {
          const Icon = benefit.icon
          const unlocked = isUnlocked(benefit.requires)
          const content = (
            <article className="flex h-full flex-col overflow-hidden rounded-[26px] border border-[#28466f] bg-[#101d32]">
              <div className="border-b border-[#28405f] bg-gradient-to-r from-[#172d4e] to-[#13243e] p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${benefit.color}18`, color: benefit.color }}>
                    <Icon size={24} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-[#f4f7ff]">{benefit.title}</h2>
                    <p className="mt-0.5 text-sm text-[#91a4c0]">{benefit.subtitle}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <ul className="flex-1 space-y-3">
                  {benefit.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-[#b7c2d4]">
                      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: `${benefit.color}14`, color: benefit.color }}>
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-semibold transition active:scale-[0.98]" style={{
                  borderColor: unlocked ? `${benefit.color}55` : '#2a3d59',
                  background: unlocked ? `${benefit.color}14` : '#0c1627',
                  color: unlocked ? benefit.color : '#8fa2bf',
                }}>
                  {unlocked ? (benefit.path ? 'Acessar recurso' : 'Incluido no acesso') : 'Disponivel com upgrade'}
                  <ArrowRight size={17} />
                </div>
              </div>
            </article>
          )

          if (benefit.path && unlocked) {
            return <Link key={benefit.title} to={benefit.path}>{content}</Link>
          }
          return <div key={benefit.title}>{content}</div>
        })}
      </div>

      {!hasPersonalAccess && (
        <Link
          to="/premium"
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4f8df7] to-[#60a5fa] text-sm font-semibold text-white shadow-lg shadow-[#4f8df7]/20 active:scale-[0.98]"
        >
          Ver planos e fazer upgrade
          <ArrowRight size={17} />
        </Link>
      )}
    </main>
  )
}
