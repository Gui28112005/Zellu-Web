import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Bell,
  Bot,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Fuel,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { LegalSection } from '@/components/legal/LegalDocument'
import { termsOfUseSections } from '@/screens/TermsOfUseScreen'
import { privacyPolicySections } from '@/screens/PrivacyPolicyScreen'

type Step = 'welcome' | 'consent' | 'permissions' | 'finish'
type PermissionState = 'idle' | 'granted' | 'denied' | 'unsupported'

const STEPS: Step[] = ['welcome', 'consent', 'permissions', 'finish']

function isIosSafariNotStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  const isIos = /iphone|ipad|ipod/i.test(ua)
  const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua)
  const isStandalone = ('standalone' in window.navigator) &&
    (window.navigator as { standalone?: boolean }).standalone === true
  return isIos && isSafari && !isStandalone
}

function StepShell({
  step,
  onBack,
  children,
}: {
  step: Step
  onBack?: () => void
  children: React.ReactNode
}) {
  const current = STEPS.indexOf(step)

  return (
    <div className="flex min-h-dvh w-full flex-col">
      <header className="relative flex h-[calc(env(safe-area-inset-top)+3.5rem)] flex-shrink-0 items-end border-b border-[#1e2d44]/80 bg-[#0d1526]/92 px-4 pb-2 shadow-lg shadow-black/10 backdrop-blur-xl">
        <div className="relative flex h-10 w-full items-center">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="absolute left-0 flex h-10 w-10 items-center justify-center text-[#aeb8ca] transition-colors hover:text-white active:scale-95"
              aria-label="Voltar"
            >
              <ChevronLeft size={22} />
            </button>
          )}
          <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-[#f0f4ff]">
            Zellu
          </span>
        </div>
      </header>

      <div className="flex flex-shrink-0 justify-center px-5 pt-5">
        <div className="flex justify-center gap-1.5">
          {STEPS.map((item, index) => (
            <span
              key={item}
              className={`h-1.5 rounded-full transition-all ${
                index <= current ? 'w-8 bg-[#4f8df7]' : 'w-3 bg-[#1d2b42]'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-5 pb-5 pt-4 sm:px-6">
        <div className="w-full max-w-[430px]">
          {children}
        </div>
      </div>
    </div>
  )
}

function StepWelcome({ onNext }: { onNext: () => void }) {
  const benefits = [
    {
      icon: Bell,
      title: 'Lembretes inteligentes',
      desc: 'Revisoes, vencimentos e manutencoes importantes no radar.',
      color: '#fbbf24',
    },
    {
      icon: Fuel,
      title: 'Controle de gastos',
      desc: 'Combustivel, servicos e historico organizados em um so lugar.',
      color: '#34d399',
    },
    {
      icon: Bot,
      title: 'Zellu AI',
      desc: 'Um assistente para tirar duvidas sobre cuidado veicular.',
      color: '#60a5fa',
    },
  ]

  return (
    <StepShell step="welcome">
      <div className="space-y-7">
        <div className="text-center">
          <motion.div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-[#2563eb] to-[#60a5fa] shadow-2xl shadow-blue-500/25"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Car size={36} className="text-white" />
          </motion.div>

          <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.28em] text-[#4f8df7]">Zellu</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#f4f7ff] sm:text-4xl">
            Bem-vindo ao Zellu
          </h1>
          <p className="mx-auto mt-3 max-w-[330px] text-sm leading-6 text-[#8fa2bf]">
            Gestao veicular inteligente para cuidar dos seus veiculos com menos esquecimento e mais controle.
          </p>
        </div>

        <div className="space-y-3">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon
            return (
              <motion.div
                key={benefit.title}
                className="flex items-center gap-4 rounded-2xl border border-[#1e2d44] bg-[#0f1a2e] px-4 py-4 shadow-lg shadow-black/10"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 + 0.1 }}
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                  style={{ background: `${benefit.color}16`, color: benefit.color }}
                >
                  <Icon size={21} />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-sm font-semibold text-[#f0f4ff]">{benefit.title}</p>
                  <p className="mt-1 text-xs leading-5 text-[#6f829e]">{benefit.desc}</p>
                </div>
              </motion.div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={onNext}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2563eb] to-[#4f8df7] text-base font-bold text-white shadow-lg shadow-blue-500/20 transition active:scale-[0.98]"
          style={{ height: 52 }}
        >
          Comecar agora
          <ChevronRight size={18} />
        </button>
      </div>
    </StepShell>
  )
}

function StepConsent({
  accepted,
  onAcceptedChange,
  onOpenLegal,
  onBack,
  onNext,
}: {
  accepted: boolean
  onAcceptedChange: (accepted: boolean) => void
  onOpenLegal: (document: 'terms' | 'privacy') => void
  onBack: () => void
  onNext: () => void
}) {
  return (
    <StepShell step="consent" onBack={onBack}>
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#4f8df7]/15 text-[#60a5fa]">
            <ShieldCheck size={30} />
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-[#f4f7ff]">
            Antes de continuar
          </h2>
          <p className="mx-auto mt-2 max-w-[330px] text-sm leading-6 text-[#8fa2bf]">
            Para usar o Zellu, confirme que voce leu e aceita os documentos legais do aplicativo.
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onOpenLegal('terms')}
            className="flex w-full items-center gap-3 rounded-2xl border border-[#1e2d44] bg-[#0f1a2e] px-4 py-4 text-left transition hover:border-[#335078]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#60a5fa]/12 text-[#60a5fa]">
              <FileText size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#f0f4ff]">Termos de uso</p>
              <p className="mt-0.5 text-xs text-[#6f829e]">Regras de uso, limites e responsabilidades.</p>
            </div>
            <ChevronRight size={17} className="text-[#607899]" />
          </button>

          <button
            type="button"
            onClick={() => onOpenLegal('privacy')}
            className="flex w-full items-center gap-3 rounded-2xl border border-[#1e2d44] bg-[#0f1a2e] px-4 py-4 text-left transition hover:border-[#335078]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#34d399]/12 text-[#34d399]">
              <ShieldCheck size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#f0f4ff]">Politica de privacidade</p>
              <p className="mt-0.5 text-xs text-[#6f829e]">Como dados e permissoes sao tratados.</p>
            </div>
            <ChevronRight size={17} className="text-[#607899]" />
          </button>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#263650] bg-[#101a2d] px-4 py-4">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => onAcceptedChange(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-[#365073] bg-[#07101f] text-[#4f8df7] accent-[#4f8df7]"
          />
          <span className="text-sm leading-6 text-[#c7d7ee]">
            Li e aceito os Termos de uso e a Politica de privacidade do Zellu.
          </span>
        </label>

        <div>
          <button
            type="button"
            onClick={onNext}
            disabled={!accepted}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2563eb] to-[#4f8df7] text-base font-bold text-white shadow-lg shadow-blue-500/20 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Continuar
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </StepShell>
  )
}

function OnboardingLegalView({
  title,
  description,
  icon: Icon,
  sections,
  onBack,
}: {
  title: string
  description: string
  icon: LucideIcon
  sections: LegalSection[]
  onBack: () => void
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="relative flex h-[calc(env(safe-area-inset-top)+3.5rem)] flex-shrink-0 items-end border-b border-[#1e2d44]/80 bg-[#0d1526]/92 px-4 pb-2 shadow-lg shadow-black/10 backdrop-blur-xl">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center text-[#aeb8ca] transition-colors hover:text-white active:scale-95"
          aria-label="Voltar"
        >
          <ChevronLeft size={22} />
        </button>
        <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-lg font-semibold text-[#f0f4ff]">
          {title}
        </span>
      </header>

      <div className="flex-1 px-4 py-5 sm:px-6">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <header className="overflow-hidden rounded-[24px] border border-[#284266] bg-gradient-to-br from-[#162849] via-[#13223c] to-[#0d1729] p-5 shadow-xl shadow-black/20">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#60a5fa]/25 bg-[#4f8df7]/15 text-[#70a7ff]">
            <Icon size={24} />
          </div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#79a9f8]">Documento Zellu</p>
          <h1 className="text-2xl font-semibold tracking-tight text-[#f5f7ff]">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-[#aebbd0]">{description}</p>
        </header>

        <div className="max-h-[calc(100dvh-230px)] overflow-y-auto rounded-[22px] border border-[#1e304b] bg-[#0d1729]">
          {sections.map((section, index) => (
            <section key={section.title} className="border-b border-[#1e304b] px-4 py-5 last:border-b-0 sm:px-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#4f8df7]/12 text-xs font-bold text-[#70a7ff]">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-[#edf3ff]">{section.title}</h2>
                  <div className="mt-3 space-y-3 text-sm leading-6 text-[#aeb8ca]">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    {section.items && (
                      <ul className="space-y-2">
                        {section.items.map((item) => (
                          <li key={item} className="flex gap-2.5">
                            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#60a5fa]" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
        </div>
      </div>
    </div>
  )
}

function PermissionButton({
  icon: Icon,
  title,
  desc,
  state,
  onClick,
}: {
  icon: typeof Bell
  title: string
  desc: string
  state: PermissionState
  onClick: () => void
}) {
  const labels: Record<PermissionState, string> = {
    idle: 'Permitir',
    granted: 'Permitido',
    denied: 'Bloqueado',
    unsupported: 'Indisponivel',
  }

  const tone = {
    idle: 'border-[#1e2d44] bg-[#0f1a2e] text-[#8fa2bf]',
    granted: 'border-[#22c55e]/30 bg-[#22c55e]/10 text-[#4ade80]',
    denied: 'border-[#ef4444]/30 bg-[#ef4444]/10 text-[#f87171]',
    unsupported: 'border-[#334155] bg-[#101826] text-[#64748b]',
  }[state]

  return (
    <div className="rounded-2xl border border-[#1e2d44] bg-[#0f1a2e] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4f8df7]/12 text-[#60a5fa]">
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#f0f4ff]">{title}</p>
          <p className="mt-1 text-xs leading-5 text-[#6f829e]">{desc}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={state === 'granted' || state === 'unsupported'}
        className={`mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition active:scale-[0.98] disabled:active:scale-100 ${tone}`}
      >
        {state === 'granted' && <Check size={15} />}
        {labels[state]}
      </button>
    </div>
  )
}

function StepPermissions({
  notificationState,
  setNotificationState,
  onBack,
  onNext,
}: {
  notificationState: PermissionState
  setNotificationState: (state: PermissionState) => void
  onBack: () => void
  onNext: () => void
}) {
  async function requestNotifications() {
    if (!('Notification' in window)) {
      setNotificationState('unsupported')
      return
    }
    const result = await Notification.requestPermission()
    setNotificationState(result === 'granted' ? 'granted' : 'denied')
    if (result !== 'granted') toast('Voce pode liberar notificacoes depois nas configuracoes do navegador.')
  }

  return (
    <StepShell step="permissions" onBack={onBack}>
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#60a5fa]/15 text-[#60a5fa]">
            <Wrench size={30} />
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-[#f4f7ff]">
            Avisos do navegador
          </h2>
          <p className="mx-auto mt-2 max-w-[340px] text-sm leading-6 text-[#8fa2bf]">
            Libere notificacoes para receber lembretes de manutencao, vencimentos e avisos importantes.
          </p>
        </div>

        <div className="space-y-3">
          <PermissionButton
            icon={Bell}
            title="Notificacoes"
            desc="Usadas para avisos de manutencao, vencimentos e lembretes."
            state={notificationState}
            onClick={() => void requestNotifications()}
          />
        </div>

        <div>
          <button
            type="button"
            onClick={onNext}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2563eb] to-[#4f8df7] text-base font-bold text-white shadow-lg shadow-blue-500/20 transition active:scale-[0.98]"
          >
            Continuar
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </StepShell>
  )
}

function StepFinish({ onBack, onFinish }: { onBack: () => void; onFinish: () => void }) {
  const isIos = isIosSafariNotStandalone()
  const tips = useMemo(() => {
    if (!isIos) {
      return [
        'Cadastre seu primeiro veiculo',
        'Crie lembretes de revisao',
        'Registre abastecimentos e custos',
      ]
    }

    return [
      'Toque em Compartilhar no Safari',
      'Escolha Adicionar a Tela Inicial',
      'Abra o Zellu pelo icone instalado',
    ]
  }, [isIos])

  return (
    <StepShell step="finish" onBack={onBack}>
      <div className="space-y-7 text-center">
        <motion.div
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-[#22c55e]/14 text-[#4ade80]"
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <Check size={38} />
        </motion.div>

        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-[#f4f7ff]">
            Tudo pronto
          </h2>
          <p className="mx-auto mt-3 max-w-[340px] text-sm leading-6 text-[#8fa2bf]">
            {isIos
              ? 'Para uma experiencia melhor no iPhone, instale o Zellu na tela inicial.'
              : 'Agora voce pode entrar no app e organizar sua garagem.'}
          </p>
        </div>

        <div className="rounded-2xl border border-[#1e2d44] bg-[#0f1a2e] p-4 text-left">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#607899]">
            Proximos passos
          </p>
          <div className="mt-3 space-y-3">
            {tips.map((tip, index) => (
              <div key={tip} className="flex items-center gap-3 text-sm text-[#c7d7ee]">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#4f8df7]/14 text-xs font-bold text-[#8bb9ff]">
                  {index + 1}
                </span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onFinish}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2563eb] to-[#4f8df7] text-base font-bold text-white shadow-lg shadow-blue-500/20 transition active:scale-[0.98]"
        >
          Acessar o Zellu
          <ChevronRight size={18} />
        </button>
      </div>
    </StepShell>
  )
}

export default function OnboardingScreen() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('welcome')
  const [previousStep, setPreviousStep] = useState<Step>('welcome')
  const [legalView, setLegalView] = useState<'terms' | 'privacy' | null>(null)
  const [accepted, setAccepted] = useState(localStorage.getItem('zellu-legal-accepted') === '1')
  const [notificationState, setNotificationState] = useState<PermissionState>(() => {
    if (!('Notification' in window)) return 'unsupported'
    return Notification.permission === 'granted' ? 'granted' : Notification.permission === 'denied' ? 'denied' : 'idle'
  })

  function goTo(next: Step) {
    setPreviousStep(step)
    setStep(next)
  }

  function finish() {
    if (accepted) localStorage.setItem('zellu-legal-accepted', '1')
    localStorage.setItem('zellu-onboarded', '1')
    navigate('/')
  }

  const dir = STEPS.indexOf(step) >= STEPS.indexOf(previousStep) ? 1 : -1
  const content: Record<Step, React.ReactNode> = {
    welcome: <StepWelcome onNext={() => goTo('consent')} />,
    consent: (
      <StepConsent
        accepted={accepted}
        onAcceptedChange={setAccepted}
        onOpenLegal={setLegalView}
        onBack={() => goTo('welcome')}
        onNext={() => {
          if (!accepted) return
          localStorage.setItem('zellu-legal-accepted', '1')
          goTo('permissions')
        }}
      />
    ),
    permissions: (
      <StepPermissions
        notificationState={notificationState}
        setNotificationState={setNotificationState}
        onBack={() => goTo('consent')}
        onNext={() => goTo('finish')}
      />
    ),
    finish: <StepFinish onBack={() => goTo('permissions')} onFinish={finish} />,
  }

  if (legalView) {
    return (
      <motion.main
        className="min-h-dvh overflow-y-auto bg-[#070c14] text-white"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(79,141,247,0.18),transparent_34%),linear-gradient(180deg,rgba(7,12,20,0)_0%,#070c14_74%)]" />
        <div className="relative z-10">
          <OnboardingLegalView
            title={legalView === 'terms' ? 'Termos de uso' : 'Politica de privacidade'}
            description={
              legalView === 'terms'
                ? 'Leia as regras principais para usar o Zellu com seguranca.'
                : 'Veja como o Zellu trata dados, permissoes e privacidade.'
            }
            icon={legalView === 'terms' ? FileText : ShieldCheck}
            sections={legalView === 'terms' ? termsOfUseSections : privacyPolicySections}
            onBack={() => setLegalView(null)}
          />
        </div>
      </motion.main>
    )
  }

  return (
    <motion.main
      className="min-h-dvh overflow-y-auto bg-[#070c14] text-white"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(79,141,247,0.18),transparent_34%),linear-gradient(180deg,rgba(7,12,20,0)_0%,#070c14_74%)]" />
      <div className="relative z-10">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={{
              enter: (direction: number) => ({ x: direction > 0 ? 36 : -36, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (direction: number) => ({ x: direction > 0 ? -36 : 36, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: 'easeInOut' }}
          >
            {content[step]}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.main>
  )
}
