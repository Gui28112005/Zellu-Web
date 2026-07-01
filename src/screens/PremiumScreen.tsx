import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Building2,
  Check,
  CreditCard,
  Crown,
  Infinity,
  LoaderCircle,
  Navigation,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useStore } from '@/lib/store'
import type { PlanoTier } from '@/lib/types'
import {
  cancelSubscription,
  createLifetimeCheckout,
  createSubscriptionCheckout,
  getSubscriptionStatus,
  type SubscriptionStatus,
} from '@/lib/subscription'

type PaidPlan = Exclude<PlanoTier, 'FREE'>
type OfferId = 'FREE' | 'LIFETIME' | PaidPlan

interface Offer {
  id: OfferId
  name: string
  subtitle: string
  price: string
  period?: string
  badge?: string
  color: string
  icon: typeof Crown
  features: string[]
  note?: string
}

const offers: Offer[] = [
  {
    id: 'FREE',
    name: 'Gratuito',
    subtitle: 'Para testar e criar o habito de registrar os cuidados.',
    price: 'Gratis',
    color: '#8892a4',
    icon: Sparkles,
    features: [
      '1 veiculo',
      '5 avisos ativos',
      'Historico basico de abastecimento',
      'Lembretes simples',
      'Sem Zellu AI e sem recursos premium',
    ],
  },
  {
    id: 'LIFETIME',
    name: 'Pessoal vitalicio',
    subtitle: 'Pague uma vez e organize seus veiculos sem mensalidade.',
    price: 'R$ 49,90',
    period: 'pagamento unico',
    badge: 'Lancamento',
    color: '#22c55e',
    icon: Infinity,
    features: [
      'Acesso pessoal permanente',
      'Ate 3 veiculos',
      'Avisos ilimitados',
      'Relatorios PDF do veiculo',
      'Controle de abastecimentos',
      'Pneus e pecas',
    ],
    note: 'Nao inclui Zellu AI, visao geral da frota, estoque, viagens nem servicos futuros com custo recorrente.',
  },
  {
    id: 'LITE',
    name: 'Pessoal mensal',
    subtitle: 'Para quem prefere assinatura e receber melhorias continuas.',
    price: 'R$ 10,50',
    period: '/mes',
    color: '#4f8df7',
    icon: Crown,
    features: [
      'Ate 5 veiculos',
      '15 avisos ativos',
      'Zellu AI 30 consultas/mes',
      'Relatorios PDF por veiculo',
      'Pneus e pecas',
      'Backup no Google Drive',
    ],
  },
  {
    id: 'FROTA',
    name: 'Frota',
    subtitle: 'Para trabalho, varios veiculos e controle operacional.',
    price: 'R$ 29,90',
    period: '/mes',
    badge: 'Mais completo',
    color: '#60a5fa',
    icon: Navigation,
    features: [
      'Ate 50 veiculos',
      'Tudo do Pessoal mensal',
      '50 avisos ativos',
      'Visao geral da frota',
      'Exportar relatorios de todos os veiculos',
      'Diario de viagens com notas',
      'Estoque e custos da frota',
      'Zellu AI 150 consultas/mes',
    ],
  },
  {
    id: 'EMPRESARIAL',
    name: 'Empresarial',
    subtitle: 'Para operacao maior, equipe, oficina ou parceiro.',
    price: 'R$ 59,90',
    period: '/mes',
    color: '#a78bfa',
    icon: Building2,
    features: [
      'Ate 200 veiculos',
      'Tudo do Frota',
      'Avisos e abastecimentos ilimitados',
      'Zellu AI 500 consultas/mes',
      'Estoque para operacao em escala',
      'Recursos para equipe e parceiros',
      'Suporte comercial',
    ],
  },
]

export default function PremiumScreen() {
  const user = useStore((state) => state.user)
  const setUser = useStore((state) => state.setUser)
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [loadingAction, setLoadingAction] = useState<OfferId | 'cancel' | null>(null)

  const currentPlan = subscription?.plan ?? user?.plano ?? 'FREE'
  const hasPersonalAccess = currentPlan === 'LITE' || currentPlan === 'FROTA' || currentPlan === 'EMPRESARIAL'
  const hasFleetAccess = currentPlan === 'FROTA' || currentPlan === 'EMPRESARIAL'

  useEffect(() => {
    let cancelled = false
    let timeout: ReturnType<typeof setTimeout> | undefined
    const params = new URLSearchParams(window.location.search)
    const returnedFromCheckout = params.has('pagamento')
    const returnedWithError = params.get('pagamento') === 'erro'

    if (returnedWithError) {
      toast.error('Pagamento nao concluido.')
      window.history.replaceState({}, '', '/premium')
    }

    const refresh = async (attempt = 0) => {
      try {
        const status = await getSubscriptionStatus()
        if (cancelled) return
        setSubscription(status)
        if (user) setUser({ ...user, plano: status.plan })

        if (returnedFromCheckout && status.active) {
          toast.success('Acesso Zellu liberado!', { id: 'premium-active' })
          window.history.replaceState({}, '', '/premium')
        } else if (returnedFromCheckout && attempt < 5) {
          timeout = setTimeout(() => void refresh(attempt + 1), 2000)
        } else if (returnedFromCheckout) {
          toast('O pagamento ainda esta sendo confirmado. Atualize a tela em instantes.', { id: 'premium-pending' })
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

  async function startRecurringCheckout(plan: PaidPlan) {
    setLoadingAction(plan)
    try {
      const result = await createSubscriptionCheckout(plan, '/premium')
      if (result.active && result.plan) {
        if (user) setUser({ ...user, plano: result.plan })
        toast.success('Esse acesso ja esta ativo.')
        return
      }
      if (!result.checkoutUrl) throw new Error('O checkout nao foi retornado.')
      window.location.assign(result.checkoutUrl)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel abrir o pagamento.')
    } finally {
      setLoadingAction(null)
    }
  }

  async function startLifetimeCheckout() {
    setLoadingAction('LIFETIME')
    try {
      const result = await createLifetimeCheckout()
      if (result.active && result.plan) {
        if (user) setUser({ ...user, plano: result.plan })
        toast.success('Seu acesso pessoal ja esta ativo.')
        return
      }
      if (!result.checkoutUrl) throw new Error('O checkout nao foi retornado.')
      window.location.assign(result.checkoutUrl)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel abrir o pagamento vitalicio.')
    } finally {
      setLoadingAction(null)
    }
  }

  async function cancelPlan() {
    if (!window.confirm('Deseja mesmo cancelar sua assinatura?')) return
    setLoadingAction('cancel')
    try {
      const status = await cancelSubscription()
      setSubscription(status)
      if (user) setUser({ ...user, plano: status.plan })
      toast.success('Assinatura cancelada.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel cancelar o plano.')
    } finally {
      setLoadingAction(null)
    }
  }

  function isOfferActive(offer: Offer): boolean {
    if (offer.id === 'FREE') return currentPlan === 'FREE'
    if (offer.id === 'LIFETIME') return currentPlan === 'LITE' && !subscription?.nextPaymentAt
    return currentPlan === offer.id
  }

  function renderOfferAction(offer: Offer) {
    const active = isOfferActive(offer)
    const loading = loadingAction === offer.id
    const canCancel = active && offer.id !== 'FREE' && offer.id !== 'LIFETIME' && !!subscription?.nextPaymentAt

    if (offer.id === 'FREE') {
      return <div className="flex h-12 items-center justify-center rounded-xl border border-[#2a3d59] bg-[#0c1627] text-sm font-semibold text-[#8fa2bf]">Incluido</div>
    }

    if (active) {
      return (
        <div className="space-y-2">
          <div className="flex h-12 items-center justify-center gap-2 rounded-xl border border-[#22c55e]/25 bg-[#22c55e]/10 text-sm font-semibold text-[#4ade80]">
            <ShieldCheck size={16} />
            Ativo
          </div>
          {canCancel && (
            <button
              type="button"
              onClick={() => void cancelPlan()}
              disabled={loadingAction !== null}
              className="w-full text-xs font-semibold text-[#8297b7] underline underline-offset-2 disabled:opacity-50"
            >
              {loadingAction === 'cancel' ? 'Cancelando...' : 'Cancelar assinatura'}
            </button>
          )}
        </div>
      )
    }

    if (currentPlan !== 'FREE' && offer.id !== 'EMPRESARIAL') {
      return (
        <div className="flex h-12 items-center justify-center rounded-xl border border-[#2a3d59] bg-[#0c1627] px-3 text-center text-xs font-semibold text-[#8fa2bf]">
          Cancele o plano atual antes de trocar
        </div>
      )
    }

    const action = offer.id === 'LIFETIME'
      ? () => void startLifetimeCheckout()
      : () => void startRecurringCheckout(offer.id as PaidPlan)

    return (
      <button
        type="button"
        onClick={action}
        disabled={loadingAction !== null || subscription?.status === 'UNCONFIGURED'}
        className="grid h-12 w-full grid-cols-[18px_1fr_18px] items-center gap-2 rounded-xl px-3 text-[15px] font-semibold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-60"
        style={{
          background: `linear-gradient(135deg, ${offer.color}, #60a5fa)`,
          boxShadow: `0 14px 30px ${offer.color}18`,
        }}
      >
        {loading ? (
          <>
            <LoaderCircle className="animate-spin" size={16} />
            Abrindo...
          </>
        ) : (
          <>
            <CreditCard size={16} />
            <span className="min-w-0 text-center leading-tight">{offer.id === 'LIFETIME' ? 'Comprar vitalicio' : `Assinar ${offer.name}`}</span>
            <ArrowRight size={15} />
          </>
        )}
      </button>
    )
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 sm:px-6">
      <section className="relative overflow-hidden rounded-[30px] border border-[#3478df]/35 bg-gradient-to-br from-[#173a73] via-[#112a53] to-[#0d1b34] px-6 py-8 shadow-2xl shadow-black/20">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#60a5fa]/20 blur-3xl" />
        <div className="absolute -bottom-24 left-8 h-52 w-52 rounded-full bg-[#22c55e]/10 blur-3xl" />

        <div className="relative grid gap-6 md:grid-cols-[1.15fr_0.85fr] md:items-center">
          <div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#8bc5ff]/25 bg-white/10 text-[#8bc5ff] shadow-lg shadow-[#4f8df7]/10 backdrop-blur-sm">
              <Crown size={30} />
            </div>
            <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#91bdff]">Zellu Premium</p>
            <h1 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Escolha entre pagar uma vez ou assinar recursos avancados.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#b7c9e6]">
              O vitalicio libera o uso pessoal essencial. As assinaturas cobrem recursos que evoluem, usam servicos recorrentes e atendem quem gerencia mais veiculos.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/15 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#91bdff]">Plano atual</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#22c55e]/10 text-[#4ade80]">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">
                  {currentPlan === 'LITE' && !subscription?.nextPaymentAt
                    ? 'Pessoal vitalicio'
                    : offers.find((offer) => offer.id === currentPlan)?.name ?? 'Gratuito'}
                </p>
                <p className="text-sm text-[#aeb8ca]">
                  {hasFleetAccess ? 'Recursos de frota liberados' : hasPersonalAccess ? 'Recursos pessoais liberados' : 'Conta gratuita'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="ofertas" className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Planos Zellu">
        {offers.map((offer) => {
          const Icon = offer.icon
          const active = isOfferActive(offer)
          return (
            <article
              key={offer.id}
              className="relative flex min-h-[360px] flex-col overflow-hidden rounded-2xl border p-4 shadow-lg shadow-black/10"
              style={{
                borderColor: active ? `${offer.color}80` : offer.badge ? `${offer.color}55` : '#1f3654',
                background: active
                  ? `linear-gradient(135deg, ${offer.color}18, #101d32 42%)`
                  : offer.badge
                    ? `linear-gradient(135deg, ${offer.color}10, #101d32 42%)`
                    : '#101d32',
              }}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${offer.color}18`, color: offer.color }}>
                  <Icon size={20} />
                </div>
                <div className="flex flex-col items-end gap-1">
                  {offer.badge && <span className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: `${offer.color}18`, color: offer.color }}>{offer.badge}</span>}
                  {active && <span className="rounded-full bg-[#22c55e]/15 px-2.5 py-1 text-[10px] font-bold text-[#4ade80]">Ativo</span>}
                </div>
              </div>

              <h2 className="text-lg font-semibold text-[#f0f4ff]">{offer.name}</h2>
              <p className="mt-1 min-h-[48px] text-sm leading-6 text-[#8fa2bf]">{offer.subtitle}</p>

              <div className="mt-4">
                <strong className="text-3xl font-semibold tracking-tight" style={{ color: offer.color }}>{offer.price}</strong>
                {offer.period && <p className="mt-0.5 text-sm font-medium text-[#8892a4]">{offer.period}</p>}
              </div>

              <ul className="mt-4 flex-1 space-y-2">
                {offer.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm leading-6 text-[#c2d3ec]">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: `${offer.color}14`, color: offer.color }}>
                      <Check size={12} strokeWidth={3} />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {offer.note && <p className="mt-3 text-xs leading-5 text-[#8297b7]">{offer.note}</p>}

              <div className="mt-5">{renderOfferAction(offer)}</div>
            </article>
          )
        })}
      </section>

      <Link
        to="/premium/beneficios"
        className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-[#4f8df7]/30 bg-[#4f8df7]/10 text-sm font-semibold text-[#8bb9ff] transition hover:bg-[#4f8df7]/15 active:scale-[0.98]"
      >
        Ver beneficios do meu acesso
        <ArrowRight size={17} />
      </Link>

      <p className="mt-6 text-center text-xs leading-5 text-[#66758d]">
        Vitalicio cobre o uso pessoal essencial. Assinaturas cobrem recursos recorrentes, frota e melhorias continuas.
      </p>
    </main>
  )
}
