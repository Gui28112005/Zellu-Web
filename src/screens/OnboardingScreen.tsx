import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { addVeiculo } from '@/lib/db'
import type { TipoVeiculo } from '@/lib/types'
import { Button, Input } from '@/components/ui'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

// ─── Vehicle type config ─────────────────────────────────────────────────────

const VEHICLE_TYPES: { tipo: TipoVeiculo; emoji: string; label: string }[] = [
  { tipo: 'CARRO', emoji: '🚗', label: 'Carro' },
  { tipo: 'HATCH', emoji: '🚗', label: 'Hatch' },
  { tipo: 'SUV', emoji: '🚙', label: 'SUV' },
  { tipo: 'MOTO', emoji: '🏍', label: 'Moto' },
  { tipo: 'CAMINHONETE', emoji: '🛻', label: 'Caminhonete' },
  { tipo: 'VAN', emoji: '🚐', label: 'Van' },
  { tipo: 'FURGAO', emoji: '🚐', label: 'Furgão' },
  { tipo: 'CAMINHAO', emoji: '🚛', label: 'Caminhão' },
  { tipo: 'ONIBUS', emoji: '🚌', label: 'Ônibus' },
  { tipo: 'BICICLETA', emoji: '🚲', label: 'Bicicleta' },
  { tipo: 'BIKE_ELETRICA', emoji: '⚡', label: 'Bike Elétrica' },
  { tipo: 'VEICULO_ELETRICO', emoji: '⚡', label: 'Elétrico' },
  { tipo: 'TRATOR', emoji: '🚜', label: 'Trator' },
  { tipo: 'MOTORHOME', emoji: '🏕', label: 'Motorhome' },
  { tipo: 'CARRETINHA', emoji: '🚛', label: 'Carretinha' },
]

// ─── iOS detection ────────────────────────────────────────────────────────────

function isIosSafariNotStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  const isIos = /iphone|ipad|ipod/i.test(ua)
  const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua)
  const isStandalone = ('standalone' in window.navigator) &&
    (window.navigator as { standalone?: boolean }).standalone === true
  return isIos && isSafari && !isStandalone
}

// ─── Slide variants ───────────────────────────────────────────────────────────

const slideVariants = {
  enter: { x: 60, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -60, opacity: 0 },
}

// ─── Step 1: Welcome ──────────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  const features = [
    { emoji: '🔔', label: 'Lembretes inteligentes' },
    { emoji: '⛽', label: 'Controle de gastos' },
    { emoji: '🤖', label: 'IA do mecânico' },
  ]

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 text-center">
      <motion.span
        className="text-7xl"
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2 }}
      >
        🚗
      </motion.span>

      <div className="space-y-3">
        <h1 className="text-3xl font-black bg-gradient-to-br from-[#4f8df7] to-[#60a5fa] bg-clip-text text-transparent">
          Bem-vindo ao Zellu
        </h1>
        <p className="text-[#8892a4] text-base leading-relaxed max-w-xs mx-auto">
          Organize toda a manutenção dos seus veículos em um só lugar.
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {features.map((f) => (
          <div
            key={f.label}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3"
          >
            <span className="text-xl">{f.emoji}</span>
            <span className="text-[#f0f4ff] text-sm font-medium">{f.label}</span>
          </div>
        ))}
      </div>

      <Button variant="gradient" size="lg" fullWidth onClick={onNext}>
        Começar
      </Button>
    </div>
  )
}

// ─── Step 2: Add vehicle ──────────────────────────────────────────────────────

function StepVehicle({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const user = useStore((s) => s.user)
  const addVeiculoStore = useStore((s) => s.addVeiculo)

  const [tipoVeiculo, setTipoVeiculo] = useState<TipoVeiculo>('CARRO')
  const [nome, setNome] = useState('')
  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [kmAtual, setKmAtual] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (!nome.trim()) { toast.error('Informe o nome do veículo'); return }

    setLoading(true)
    try {
      const v = await addVeiculo(user.uid, {
        nome: nome.trim(),
        marca: marca.trim(),
        modelo: modelo.trim(),
        kmAtual: kmAtual ? parseInt(kmAtual, 10) : 0,
        tipoVeiculo,
        cor: '',
        proprietario: user.displayName ?? '',
        semControleKm: !kmAtual,
      })
      addVeiculoStore(v)
      toast.success('Veículo adicionado!')
      onNext()
    } catch {
      toast.error('Erro ao adicionar veículo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black text-[#f0f4ff]">Qual seu veículo?</h2>
        <p className="text-[#8892a4] text-sm">Adicione seu primeiro veículo</p>
      </div>

      {/* Type selector */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl pointer-events-none select-none">
          {VEHICLE_TYPES.find((vt) => vt.tipo === tipoVeiculo)?.emoji ?? '🚗'}
        </span>
        <select
          value={tipoVeiculo}
          onChange={(e) => setTipoVeiculo(e.target.value as TipoVeiculo)}
          className="w-full bg-[#1a2540] border border-[#1e2d44] text-[#f0f4ff] rounded-2xl pl-12 pr-10 py-3 text-base appearance-none focus:outline-none focus:border-[#4f8df7] focus:ring-1 focus:ring-[#4f8df7]/30 cursor-pointer"
        >
          {VEHICLE_TYPES.map((vt) => (
            <option key={vt.tipo} value={vt.tipo} style={{ background: '#1a2540' }}>
              {vt.emoji}  {vt.label}
            </option>
          ))}
        </select>
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8892a4] pointer-events-none">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome"
          placeholder="Ex: Meu Carro"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <Input
          label="Marca"
          placeholder="Ex: Toyota"
          value={marca}
          onChange={(e) => setMarca(e.target.value)}
        />
        <Input
          label="Modelo"
          placeholder="Ex: Corolla"
          value={modelo}
          onChange={(e) => setModelo(e.target.value)}
        />
        <Input
          label="KM atual"
          type="number"
          placeholder="Ex: 45000"
          value={kmAtual}
          onChange={(e) => setKmAtual(e.target.value)}
        />

        <Button type="submit" variant="gradient" size="lg" fullWidth loading={loading}>
          Adicionar
        </Button>
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={onSkip}
          className="bg-white/5 hover:bg-white/10 border border-[#1e2d44] rounded-2xl px-6 py-2.5 text-sm text-[#8892a4] hover:text-[#f0f4ff] transition-all"
        >
          Pular por agora
        </button>
      </div>
    </div>
  )
}

// ─── Step 3: Finish / PWA install ────────────────────────────────────────────

function StepFinish() {
  const navigate = useNavigate()
  const isIos = isIosSafariNotStandalone()

  function handleFinish() {
    localStorage.setItem('zellu-onboarded', '1')
    navigate('/')
  }

  // Animated confetti dots
  const dots = Array.from({ length: 18 }, (_, i) => i)

  if (isIos) {
    return (
      <div className="flex flex-col items-center gap-8 text-center">
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-[#f0f4ff]">Instale o app 📲</h2>
          <p className="text-[#8892a4] text-sm leading-relaxed">
            Para a melhor experiência, adicione o Zellu à sua tela inicial.
          </p>
        </div>

        <div className="w-full bg-[#131e33] border border-[#1e2d44] rounded-2xl p-5 space-y-5 text-left">
          {[
            { step: '1', text: 'Toque no botão Compartilhar', icon: '⬆️' },
            { step: '2', text: 'Role até "Adicionar à Tela Inicial"', icon: '📌' },
            { step: '3', text: 'Toque em "Adicionar"', icon: '✅' },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              className="flex items-center gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15 + 0.3 }}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4f8df7] to-[#60a5fa] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {item.step}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">{item.icon}</span>
                <span className="text-[#f0f4ff] text-sm">{item.text}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <Button variant="ghost" size="lg" fullWidth onClick={handleFinish}>
          Continuar mesmo assim
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      {/* Confetti dots */}
      <div className="relative w-32 h-32 flex items-center justify-center">
        {dots.map((i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: i % 3 === 0 ? '#4f8df7' : i % 3 === 1 ? '#60a5fa' : '#f0f4ff',
            }}
            animate={{
              x: Math.cos((i / dots.length) * Math.PI * 2) * (40 + Math.sin(i) * 15),
              y: Math.sin((i / dots.length) * Math.PI * 2) * (40 + Math.cos(i) * 15),
              opacity: [0.4, 1, 0.4],
              scale: [0.6, 1.2, 0.6],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              delay: (i / dots.length) * 1.2,
              ease: 'easeInOut',
            }}
          />
        ))}
        <span className="text-4xl z-10">🎉</span>
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-black text-[#f0f4ff]">Tudo pronto!</h2>
        <p className="text-[#8892a4] text-base leading-relaxed">
          Seu Zellu está configurado e pronto para usar.
        </p>
      </div>

      <Button variant="gradient" size="lg" fullWidth onClick={handleFinish}>
        Acessar o app
      </Button>
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const [step, setStep] = useState(0)
  const [prevStep, setPrevStep] = useState(0)

  function goTo(next: number) {
    setPrevStep(step)
    setStep(next)
  }

  const slideDir = step >= prevStep ? 1 : -1

  const steps = [
    <StepWelcome key="welcome" onNext={() => goTo(1)} />,
    <StepVehicle key="vehicle" onNext={() => goTo(2)} onSkip={() => goTo(2)} />,
    <StepFinish key="finish" />,
  ]

  return (
    <motion.div
      className="min-h-screen bg-[#070c14] flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.25 }}
    >
      {/* Content area */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-8 overflow-hidden">
        <div className="w-full max-w-sm">
          <AnimatePresence mode="wait" custom={slideDir}>
            <motion.div
              key={step}
              custom={slideDir}
              variants={{
                enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              {steps[step]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 pb-8">
        {steps.map((_, i) => (
          <motion.div
            key={i}
            className="rounded-full"
            animate={{
              width: i === step ? 20 : 8,
              background: i === step
                ? 'linear-gradient(to right, #4f8df7, #60a5fa)'
                : '#1e2d44',
            }}
            style={{ height: 8 }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>
    </motion.div>
  )
}
