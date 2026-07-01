import { useEffect, useState } from 'react'
import { ArrowRight, Building2, Check, Crown, CreditCard, LoaderCircle, ShieldCheck, Sparkles, X, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useStore } from '@/lib/store'
import type { PlanoTier } from '@/lib/types'
import { cancelSubscription, createSubscriptionCheckout, getSubscriptionStatus, type SubscriptionStatus } from '@/lib/subscription'

type PaidPlan = Exclude<PlanoTier, 'FREE'>

interface PlanCard {
  id: PlanoTier
  name: string
  subtitle: string
  price: string
  period?: string
  color: string
  icon: typeof Zap
  badge?: string
  features: string[]
}

const plans: PlanCard[] = [
  {
    id: 'FREE',
    name: 'Gratuito',
    subtitle: 'Essencial para acompanhar um veiculo no dia a dia.',
    price: 'Gratis',
    color: '#8892a4',
    icon: Zap,
    features: [
      '1 veiculo',
      '5 avisos ativos',
      'Historico basico de abastecimento',
      'Lembretes simples',
    ],
  },
  {
    id: 'LITE',
    name: 'Pessoal',
    subtitle: 'Para organizar seus veiculos pessoais com recursos premium.',
    price: 'R$ 10,50',
    period: '/mes',
    color: '#34d399',
    icon: Sparkles,
    features: [
      'Ate 5 veiculos',
      '15 avisos ativos',
      'Zellu AI 30 consultas/mes',
      'Relatorios por veiculo',
      'Pneus e pecas',
      'Backup no Google Drive',
    ],
  },
  {
    id: 'FROTA',
    name: 'Frota',
    subtitle: 'Para varios veiculos, custos, viagens e estoque.',
    price: 'R$ 29,90',
    period: '/mes',
    color: '#4f8df7',
    icon: Crown,
    badge: 'Mais escolhido',
    features: [
      'Tudo do plano Pessoal',
      'Ate 50 veiculos',
      '50 avisos ativos',
      'Visao geral da frota',
      'Exportacao de todos os relatorios',
      'Diario de viagens com notas',
      'Estoque e custos da frota',
      'Zellu AI 150 consultas/mes',
    ],
  },
  {
    id: 'EMPRESARIAL',
    name: 'Empresarial',
    subtitle: 'Tudo do Frota com mais escala e suporte.',
    price: 'R$ 59,90',
    period: '/mes',
    color: '#a78bfa',
    icon: Building2,
    features: [
      'Tudo do plano Frota',
      'Ate 200 veiculos',
      'Avisos ilimitados',
      'Abastecimentos ilimitados',
      'Zellu AI 500 consultas/mes',
      'Estoque para operacao em escala',
      'Recursos para equipe e parceiros',
      'Suporte comercial',
    ],
  },
]

export default function PlansScreen() {
  const navigate = useNavigate()
  const user = useStore((state) => state.user)
  const setUser = useStore((state) => state.setUser)
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [loadingPlan, setLoadingPlan] = useState<PaidPlan | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timeout: ReturnType<typeof setTimeout> | undefined
    const returnedFromCheckout = new URLSearchParams(window.location.search).has('pagamento')

    const refresh = async (attempt = 0) => {
      try {
        const status = await getSubscriptionStatus()
        if (cancelled) return
        setSubscription(status)
        if (user) setUser({ ...user, plano: status.plan })

        if (returnedFromCheckout && status.active) {
          toast.success(`Plano ${status.plan} ativado!`, { id: 'plan-active' })
          window.history.replaceState({}, '', '/planos')
        } else if (returnedFromCheckout && attempt < 5) {
          timeout = setTimeout(() => void refresh(attempt + 1), 2000)
        } else if (returnedFromCheckout) {
          toast('O pagamento ainda esta sendo confirmado. Atualize a tela em instantes.', { id: 'plan-pending' })
        }
      } catch (error) {
        if (!cancelled && returnedFromCheckout) {
          toast.error(error instanceof Error ? error.message : 'Erro ao consultar o pagamento.')
        }
      }
    }

    void refresh()
    return () => {
      cancelled = true
      if (timeout) clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startCheckout = async (plan: PaidPlan) => {
    setLoadingPlan(plan)
    try {
      const result = await createSubscriptionCheckout(plan)
      if (result.active && result.plan) {
        if (user) setUser({ ...user, plano: result.plan })
        toast.success(`Seu plano ${result.plan} ja esta ativo.`)
        return
      }
      if (!result.checkoutUrl) throw new Error('O checkout nao foi retornado.')
      window.location.assign(result.checkoutUrl)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel abrir o pagamento.')
    } finally {
      setLoadingPlan(null)
    }
  }

  const cancelPlan = async () => {
    if (!window.confirm('Deseja mesmo cancelar sua assinatura?')) return
    setCancelLoading(true)
    try {
      const status = await cancelSubscription()
      setSubscription(status)
      if (user) setUser({ ...user, plano: status.plan })
      toast.success('Assinatura cancelada.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel cancelar o plano.')
    } finally {
      setCancelLoading(false)
    }
  }

  const currentPlan = subscription?.plan ?? user?.plano ?? 'FREE'
  const currentPlanName = plans.find((plan) => plan.id === currentPlan)?.name ?? 'Gratuito'

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-12 pt-5 sm:px-6">
      <header className="mb-5">
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[#253857] lg:hidden" />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#4f8df7]">Zellu</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#f4f7ff]">Planos e precos</h1>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[#8fa2bf]">
              Escolha o plano ideal e libere os recursos certos para sua rotina.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Fechar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1a2540] text-[#8892a4] transition-colors hover:text-white active:scale-95"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-[#203653] bg-[#0d1728] px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#22c55e]/10 text-[#4ade80]">
            <ShieldCheck size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6f829e]">Plano atual</p>
            <p className="mt-0.5 text-sm font-semibold text-[#f4f7ff]">{currentPlanName}</p>
          </div>
        </div>
      </header>

      <section className="space-y-3" aria-label="Planos Zellu">
        {plans.map((plan) => {
          const Icon = plan.icon
          const isActive = currentPlan === plan.id
          const isPaid = plan.id !== 'FREE'
          const disabled = loadingPlan !== null || cancelLoading || (isActive && !isPaid)

          return (
            <article
              key={plan.id}
              className="relative overflow-hidden rounded-2xl border p-4 shadow-lg shadow-black/10"
              style={{
                borderColor: isActive ? `${plan.color}80` : plan.badge ? `${plan.color}55` : '#1f3654',
                background: isActive
                  ? `linear-gradient(135deg, ${plan.color}18, #101d32 42%)`
                  : plan.badge
                    ? `linear-gradient(135deg, ${plan.color}10, #101d32 42%)`
                    : '#101d32',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                  style={{ background: `${plan.color}18`, color: plan.color }}
                >
                  <Icon size={20} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-[#f0f4ff]">{plan.name}</h2>
                    {plan.badge && !isActive && (
                      <span
                        className="rounded-full px-2.5 py-1 text-[10px] font-bold"
                        style={{ background: `${plan.color}18`, color: plan.color }}
                      >
                        {plan.badge}
                      </span>
                    )}
                    {isActive && (
                      <span className="rounded-full bg-[#22c55e]/15 px-2.5 py-1 text-[10px] font-bold text-[#4ade80]">
                        Ativo
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs leading-5 text-[#8fa2bf]">{plan.subtitle}</p>

                  <div className="mt-3 flex items-end gap-1 text-white">
                    <strong className="text-2xl font-semibold tracking-tight" style={{ color: plan.color }}>
                      {plan.price}
                    </strong>
                    {plan.period && <span className="pb-1 text-xs font-medium text-[#8892a4]">{plan.period}</span>}
                  </div>
                </div>
              </div>

              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-xs leading-5 text-[#c2d3ec]">
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{ background: `${plan.color}14`, color: plan.color }}
                    >
                      <Check size={12} strokeWidth={3} />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {isPaid ? (
                <div className="mt-5">
                  {isActive ? (
                    <button
                      type="button"
                      onClick={() => void cancelPlan()}
                      disabled={cancelLoading || loadingPlan !== null}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#22c55e]/25 bg-[#22c55e]/10 text-sm font-semibold text-[#4ade80] transition active:scale-[0.98] disabled:opacity-60"
                    >
                      {cancelLoading ? <LoaderCircle className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                      {cancelLoading ? 'Cancelando...' : 'Plano ativo'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void startCheckout(plan.id as PaidPlan)}
                      disabled={disabled}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-60"
                      style={{
                        background: `linear-gradient(135deg, ${plan.color}, #60a5fa)`,
                        boxShadow: `0 14px 30px ${plan.color}18`,
                      }}
                    >
                      {loadingPlan === plan.id ? (
                        <>
                          <LoaderCircle className="animate-spin" size={16} />
                          Abrindo pagamento...
                        </>
                      ) : (
                        <>
                          <CreditCard size={16} />
                          Assinar {plan.name}
                          <ArrowRight size={15} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <div className="mt-5 flex h-12 items-center justify-center rounded-xl border border-[#2a3d59] bg-[#0c1627] text-sm font-semibold text-[#8fa2bf]">
                  Incluido na conta
                </div>
              )}
            </article>
          )
        })}
      </section>
    </main>
  )
}
