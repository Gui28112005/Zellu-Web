import { useEffect, useState } from 'react'
import { ArrowRight, ChartNoAxesCombined, Check, CreditCard, Crown, LoaderCircle, ShieldCheck, Sparkles, WalletCards, Torus, Wrench, Route, Package, Navigation } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useStore } from '@/lib/store'
import { cancelSubscription, createSubscriptionCheckout, getSubscriptionStatus, type SubscriptionStatus } from '@/lib/subscription'

const aiBenefits = [
  'Tire dúvidas sobre cuidados e manutenção do veículo.',
  'Receba orientações rápidas em uma conversa simples.',
  'Entenda possíveis causas antes de procurar uma oficina.',
]

const fleetBenefits = [
  'Identifique rapidamente os veículos que precisam de atenção.',
  'Acompanhe avisos vencidos, próximos serviços e quilometragem.',
  'Priorize a manutenção da frota em uma única tela.',
]

const costBenefits = [
  'Veja gastos com combustível e manutenção por veículo.',
  'Compare os custos da frota e identifique os veículos mais caros.',
  'Acompanhe totais do mês e do ano automaticamente.',
]

export default function PremiumScreen() {
  const user = useStore((state) => state.user)
  const setUser = useStore((state) => state.setUser)
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [loadingAction, setLoadingAction] = useState<'checkout' | 'cancel' | null>(null)
  const isPremium = user?.plano === 'FROTA'

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
          toast.success('Zellu Premium ativado! Mandou bem. ✨', { id: 'premium-active' })
          window.history.replaceState({}, '', '/premium')
        } else if (returnedFromCheckout && attempt < 5) {
          timeout = setTimeout(() => void refresh(attempt + 1), 2000)
        } else if (returnedFromCheckout) {
          toast('O pagamento ainda está sendo confirmado. Atualize a tela em instantes.', { id: 'premium-pending' })
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

  const scrollToCheckout = () => {
    document.getElementById('assinar')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const startCheckout = async () => {
    setLoadingAction('checkout')
    try {
      const result = await createSubscriptionCheckout()
      if (result.active) {
        if (user) setUser({ ...user, plano: 'FROTA' })
        toast.success('Seu plano Premium já está ativo.')
        return
      }
      if (!result.checkoutUrl) throw new Error('O checkout não foi retornado.')
      window.location.assign(result.checkoutUrl)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível abrir o pagamento.')
    } finally {
      setLoadingAction(null)
    }
  }

  const cancelPlan = async () => {
    if (!window.confirm('Deseja mesmo cancelar o Zellu Premium?')) return
    setLoadingAction('cancel')
    try {
      const status = await cancelSubscription()
      setSubscription(status)
      if (user) setUser({ ...user, plano: status.plan })
      toast.success('Assinatura cancelada.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível cancelar o plano.')
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-12 pt-6 sm:px-6">
      <section className="relative overflow-hidden rounded-[30px] border border-[#3478df]/35 bg-gradient-to-br from-[#173a73] via-[#112a53] to-[#0d1b34] px-6 py-8 text-center shadow-2xl shadow-black/20">
        <div
          aria-hidden="true"
          className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#60a5fa]/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-white/5 blur-3xl"
        />

        <div className="relative">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#8bc5ff]/25 bg-white/10 text-[#8bc5ff] shadow-lg shadow-[#4f8df7]/10 backdrop-blur-sm">
            <Crown size={30} aria-hidden="true" />
          </div>
          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#91bdff]">
            Benefícios exclusivos
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Zellu Premium</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#b7c9e6]">
            Recursos inteligentes para facilitar os cuidados com seu veículo e deixar sua rotina mais tranquila.
          </p>
        </div>
      </section>

      <section
        id="assinar"
        className="mt-6 rounded-[26px] border border-[#3265aa] bg-[#101d32] p-5 shadow-xl shadow-black/15"
        aria-label="Assinatura Zellu Premium"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#70a7ff]">
              {isPremium ? 'Seu plano' : 'Plano mensal'}
            </p>
            <div className="mt-2 flex items-end gap-1 text-white">
              <span className="text-sm">R$</span>
              <strong className="text-4xl font-semibold tracking-tight">29,90</strong>
              <span className="pb-1 text-sm text-[#91a4c0]">/mês</span>
            </div>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#4f8df7]/15 text-[#70a7ff]">
            {isPremium ? <ShieldCheck size={23} /> : <CreditCard size={23} />}
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-[#aebbd0]">
          {isPremium
            ? 'Plano ativo. Todos os benefícios Premium estão liberados para sua conta.'
            : 'Pagamento seguro pelo Mercado Pago. A cobrança é renovada mensalmente e você pode cancelar quando quiser.'}
        </p>

        {isPremium ? (
          <div className="mt-5">
            <div className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#22c55e]/25 bg-[#22c55e]/10 text-sm font-semibold text-[#4ade80]">
              <Check size={17} /> Plano ativo
            </div>
            <button
              type="button"
              onClick={() => void cancelPlan()}
              disabled={loadingAction !== null}
              className="mt-3 w-full py-2 text-xs text-[#8297b7] underline decoration-[#8297b7]/40 underline-offset-4 disabled:opacity-50"
            >
              {loadingAction === 'cancel' ? 'Cancelando…' : 'Cancelar assinatura'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void startCheckout()}
            disabled={loadingAction !== null || subscription?.status === 'UNCONFIGURED'}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4f8df7] to-[#60a5fa] px-5 text-sm font-semibold text-white shadow-lg shadow-[#4f8df7]/20 transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loadingAction === 'checkout' ? (
              <><LoaderCircle className="animate-spin" size={18} /> Abrindo pagamento…</>
            ) : (
              <><CreditCard size={18} /> Assinar Zellu Premium</>
            )}
          </button>
        )}
      </section>

      <section className="mt-6" aria-labelledby="premium-benefits-title">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2
            id="premium-benefits-title"
            className="text-xs font-bold uppercase tracking-[0.16em] text-[#8297b7]"
          >
            Disponível agora
          </h2>
          <span className="rounded-full border border-[#4f8df7]/25 bg-[#4f8df7]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#70a7ff]">
            Premium
          </span>
        </div>

        <article className="overflow-hidden rounded-[26px] border border-[#28466f] bg-[#101d32]">
          <div className="border-b border-[#28405f] bg-gradient-to-r from-[#172d4e] to-[#13243e] p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#4f8df7]/15 text-[#70a7ff]">
                <Sparkles size={24} aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#f4f7ff]">Zellu AI</h3>
                <p className="mt-0.5 text-sm text-[#91a4c0]">Seu assistente automotivo inteligente</p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <ul className="space-y-3">
              {aiBenefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-sm leading-6 text-[#b7c2d4]">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#4f8df7]/15 text-[#70a7ff]">
                    <Check size={12} strokeWidth={3} aria-hidden="true" />
                  </span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            <Link
              to={isPremium ? '/mecanico-virtual' : '/premium#assinar'}
              onClick={(event) => {
                if (!isPremium) {
                  event.preventDefault()
                  scrollToCheckout()
                }
              }}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4f8df7] to-[#60a5fa] px-5 text-sm font-semibold text-white shadow-lg shadow-[#4f8df7]/20 transition-transform active:scale-[0.98]"
            >
              {isPremium ? 'Acessar Zellu AI' : 'Assine para acessar'}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </article>

        <article className="mt-4 overflow-hidden rounded-[26px] border border-[#28466f] bg-[#101d32]">
          <div className="border-b border-[#28405f] bg-gradient-to-r from-[#172d4e] to-[#13243e] p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#22c55e]/10 text-[#4ade80]">
                <ChartNoAxesCombined size={24} aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#f4f7ff]">Visão geral dos veículos</h3>
                <p className="mt-0.5 text-sm text-[#91a4c0]">Prioridades e saúde da sua frota</p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <ul className="space-y-3">
              {fleetBenefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-sm leading-6 text-[#b7c2d4]">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#22c55e]/10 text-[#4ade80]">
                    <Check size={12} strokeWidth={3} aria-hidden="true" />
                  </span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            <Link
              to={isPremium ? '/premium/visao-geral' : '/premium#assinar'}
              onClick={(event) => {
                if (!isPremium) {
                  event.preventDefault()
                  scrollToCheckout()
                }
              }}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#4f8df7]/35 bg-[#4f8df7]/10 px-5 text-sm font-semibold text-[#8bb9ff] transition-colors hover:bg-[#4f8df7]/15 active:scale-[0.98]"
            >
              {isPremium ? 'Ver visão geral' : 'Assine para acessar'}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </article>

        <article className="mt-4 overflow-hidden rounded-[26px] border border-[#28466f] bg-[#101d32]">
          <div className="border-b border-[#28405f] bg-gradient-to-r from-[#172d4e] to-[#13243e] p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f59e0b]/10 text-[#fbbf24]">
                <WalletCards size={24} aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#f4f7ff]">Painel de custos</h3>
                <p className="mt-0.5 text-sm text-[#91a4c0]">Gastos e comparação da frota</p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <ul className="space-y-3">
              {costBenefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-sm leading-6 text-[#b7c2d4]">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f59e0b]/10 text-[#fbbf24]">
                    <Check size={12} strokeWidth={3} aria-hidden="true" />
                  </span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            <Link
              to={isPremium ? '/premium/custos' : '/premium#assinar'}
              onClick={(event) => {
                if (!isPremium) {
                  event.preventDefault()
                  scrollToCheckout()
                }
              }}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-5 text-sm font-semibold text-[#fbbf24] transition-colors hover:bg-[#f59e0b]/15 active:scale-[0.98]"
            >
              {isPremium ? 'Ver painel de custos' : 'Assine para acessar'}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </article>

        {/* Pneus */}
        <article className="mt-4 overflow-hidden rounded-[26px] border border-[#28466f] bg-[#101d32]">
          <div className="border-b border-[#28405f] bg-gradient-to-r from-[#172d4e] to-[#13243e] p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#4ade80]/10 text-[#4ade80]">
                <Torus size={24} aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#f4f7ff]">Controle de Pneus</h3>
                <p className="mt-0.5 text-sm text-[#91a4c0]">Desgaste por posição em tempo real</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <ul className="space-y-3">
              {['Acompanhe o desgaste das 5 posições (DD, DE, TD, TE, Estepe).', 'Barra de progresso colorida: verde, amarelo e vermelho.', 'Alertas automáticos quando o pneu precisa de troca.'].map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm leading-6 text-[#b7c2d4]">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#4ade80]/10 text-[#4ade80]">
                    <Check size={12} strokeWidth={3} aria-hidden="true" />
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Link
              to={isPremium ? '/premium/pneus' : '/premium#assinar'}
              onClick={(event) => { if (!isPremium) { event.preventDefault(); scrollToCheckout() } }}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#4ade80]/30 bg-[#4ade80]/10 px-5 text-sm font-semibold text-[#4ade80] transition-colors hover:bg-[#4ade80]/15 active:scale-[0.98]"
            >
              {isPremium ? 'Ver controle de pneus' : 'Assine para acessar'}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </article>

        {/* Peças */}
        <article className="mt-4 overflow-hidden rounded-[26px] border border-[#28466f] bg-[#101d32]">
          <div className="border-b border-[#28405f] bg-gradient-to-r from-[#172d4e] to-[#13243e] p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#70a7ff]/10 text-[#70a7ff]">
                <Wrench size={24} aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#f4f7ff]">Peças e Componentes</h3>
                <p className="mt-0.5 text-sm text-[#91a4c0]">Vida útil de peças por veículo</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <ul className="space-y-3">
              {['Monitore correia dentada, freios, filtros e mais.', 'Indicador de desgaste com alertas de atenção e crítico.', 'Controle individualizado por veículo da frota.'].map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm leading-6 text-[#b7c2d4]">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#70a7ff]/10 text-[#70a7ff]">
                    <Check size={12} strokeWidth={3} aria-hidden="true" />
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Link
              to={isPremium ? '/premium/pecas' : '/premium#assinar'}
              onClick={(event) => { if (!isPremium) { event.preventDefault(); scrollToCheckout() } }}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#4f8df7]/35 bg-[#4f8df7]/10 px-5 text-sm font-semibold text-[#8bb9ff] transition-colors hover:bg-[#4f8df7]/15 active:scale-[0.98]"
            >
              {isPremium ? 'Ver peças monitoradas' : 'Assine para acessar'}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </article>

        {/* Rotas */}
        <article className="mt-4 overflow-hidden rounded-[26px] border border-[#28466f] bg-[#101d32]">
          <div className="border-b border-[#28405f] bg-gradient-to-r from-[#172d4e] to-[#13243e] p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#a78bfa]/10 text-[#a78bfa]">
                <Route size={24} aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#f4f7ff]">Análise de Rotas</h3>
                <p className="mt-0.5 text-sm text-[#91a4c0]">Lucratividade por rota</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <ul className="space-y-3">
              {['Calcule lucro e margem de cada rota automaticamente.', 'Compare receita e custo por trajeto.', 'Identifique as rotas mais e menos rentáveis da frota.'].map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm leading-6 text-[#b7c2d4]">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#a78bfa]/10 text-[#a78bfa]">
                    <Check size={12} strokeWidth={3} aria-hidden="true" />
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Link
              to={isPremium ? '/premium/rotas' : '/premium#assinar'}
              onClick={(event) => { if (!isPremium) { event.preventDefault(); scrollToCheckout() } }}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#a78bfa]/30 bg-[#a78bfa]/10 px-5 text-sm font-semibold text-[#c4b5fd] transition-colors hover:bg-[#a78bfa]/15 active:scale-[0.98]"
            >
              {isPremium ? 'Ver análise de rotas' : 'Assine para acessar'}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </article>

        {/* Estoque */}
        <article className="mt-4 overflow-hidden rounded-[26px] border border-[#28466f] bg-[#101d32]">
          <div className="border-b border-[#28405f] bg-gradient-to-r from-[#172d4e] to-[#13243e] p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f59e0b]/10 text-[#fbbf24]">
                <Package size={24} aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#f4f7ff]">Estoque de Peças</h3>
                <p className="mt-0.5 text-sm text-[#91a4c0]">Inventário da frota</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <ul className="space-y-3">
              {['Controle quantidade, estoque mínimo e valor unitário.', 'Alertas automáticos de estoque baixo.', 'Ajuste de quantidade com um toque diretamente na lista.'].map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm leading-6 text-[#b7c2d4]">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f59e0b]/10 text-[#fbbf24]">
                    <Check size={12} strokeWidth={3} aria-hidden="true" />
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Link
              to={isPremium ? '/premium/estoque' : '/premium#assinar'}
              onClick={(event) => { if (!isPremium) { event.preventDefault(); scrollToCheckout() } }}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-5 text-sm font-semibold text-[#fbbf24] transition-colors hover:bg-[#f59e0b]/15 active:scale-[0.98]"
            >
              {isPremium ? 'Ver estoque' : 'Assine para acessar'}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </article>

        {/* Viagens */}
        <article className="mt-4 overflow-hidden rounded-[26px] border border-[#28466f] bg-[#101d32]">
          <div className="border-b border-[#28405f] bg-gradient-to-r from-[#172d4e] to-[#13243e] p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#60a5fa]/10 text-[#60a5fa]">
                <Navigation size={24} aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#f4f7ff]">Diário de Viagens</h3>
                <p className="mt-0.5 text-sm text-[#91a4c0]">Registro detalhado por trajeto</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <ul className="space-y-3">
              {['Registre origem, destino, KM percorrido e finalidade.', 'Detalhe custos: combustível, pedágio, alimentação e mais.', 'Resumo mensal de viagens, distância e custos totais.'].map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm leading-6 text-[#b7c2d4]">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#60a5fa]/10 text-[#60a5fa]">
                    <Check size={12} strokeWidth={3} aria-hidden="true" />
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Link
              to={isPremium ? '/premium/viagens' : '/premium#assinar'}
              onClick={(event) => { if (!isPremium) { event.preventDefault(); scrollToCheckout() } }}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#4f8df7]/35 bg-[#4f8df7]/10 px-5 text-sm font-semibold text-[#8bb9ff] transition-colors hover:bg-[#4f8df7]/15 active:scale-[0.98]"
            >
              {isPremium ? 'Ver diário de viagens' : 'Assine para acessar'}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </article>
      </section>

      <p className="mt-6 text-center text-xs leading-5 text-[#66758d]">
        Novos benefícios Premium serão adicionados futuramente.
      </p>
    </main>
  )
}
