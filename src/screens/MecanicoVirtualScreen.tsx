import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, Bot, User, Calendar, Gauge, CheckCircle2, Wrench, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { addLembrete } from '@/lib/db'
import { getTipoColor } from '@/lib/utils'
import { consumeAI, getUsageInfo, isEmpresaAIDisabled, formatResetDate } from '@/lib/aiUsage'
import type { MensagemAI, Veiculo, Lembrete, Abastecimento, TipoManutencao } from '@/lib/types'

const AI_PROXY_URL =
  (import.meta.env.VITE_AI_PROXY_URL as string | undefined) ??
  'https://jolly-silence-4b08.encontretecnologia2.workers.dev'
const AI_APP_TOKEN = (import.meta.env.VITE_AI_APP_TOKEN as string | undefined) ?? ''

const SUGGESTION_CHIPS = [
  { emoji: '🔧', text: 'Quais avisos estão vencendo?' },
  { emoji: '⛽', text: 'Como está meu consumo de combustível?' },
  { emoji: '🚗', text: 'Qual veículo precisa de mais atenção?' },
  { emoji: '📋', text: 'Crie um plano de manutenções' },
]

const VALID_TIPOS: TipoManutencao[] = [
  'OLEO', 'FREIO', 'PNEU', 'BATERIA', 'MECANICA', 'REVISAO', 'IPVA',
  'LICENCIAMENTO', 'LAVAGEM', 'VIDROS', 'TRANSMISSAO', 'FUNILARIA',
  'SEGURO', 'OUTROS', 'CORRENTE', 'LUBRIFICACAO', 'PEDIVELA', 'ACESSORIOS', 'CONFORTO',
]

interface PlanoItem {
  titulo: string
  tipo: TipoManutencao
  peca: string
  dataLimite?: string
  kmLimite?: number
  veiculoId: string
  urgencia: 'alta' | 'media' | 'normal'
  valor?: number
  horaAviso?: string
  estabelecimentoNome?: string
}

function gerarId() { return crypto.randomUUID() }

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function isPlanRequest(text: string) {
  return /plano.*manuten|manuten.*plano|crie.*plano|plano de manuten|programa.*manuten/i.test(text)
}

function sanitizeTipo(tipo: string): TipoManutencao {
  return (VALID_TIPOS.includes(tipo as TipoManutencao) ? tipo : 'OUTROS') as TipoManutencao
}

function extractPlan(text: string): { cards: PlanoItem[] | null; cleanText: string } {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/)
  if (!match) return { cards: null, cleanText: text }
  try {
    const parsed = JSON.parse(match[1])
    if (parsed.plano && Array.isArray(parsed.plano) && parsed.plano.length > 0) {
      const cards = parsed.plano.map((item: PlanoItem) => ({
        ...item,
        tipo: sanitizeTipo(item.tipo),
      }))
      return {
        cards,
        cleanText: text.replace(/```json[\s\S]*?```/g, '').trim(),
      }
    }
  } catch {}
  return { cards: null, cleanText: text }
}

function buildGarageContext(
  veiculos: Veiculo[], lembretes: Lembrete[], abastecimentos: Abastecimento[], history: MensagemAI[],
) {
  const today = new Date()
  const parts: string[] = []
  const veiMap = Object.fromEntries(veiculos.map((v) => [v.id, v.nome]))

  if (veiculos.length > 0) {
    parts.push(`Veículos:\n${veiculos.map((v) => {
      const desc = [v.marca, v.modelo, v.ano].filter(Boolean).join(' ')
      return `- ID:${v.id} | ${v.nome}${desc ? ` (${desc})` : ''} | KM: ${v.kmAtual.toLocaleString('pt-BR')}`
    }).join('\n')}`)
  }

  const pendentes = lembretes.filter((l) => !l.concluido).filter((l) => {
    if (!l.dataLimite) return true
    return (new Date(l.dataLimite).getTime() - today.getTime()) / 86400000 <= 60
  }).slice(0, 15)

  if (pendentes.length > 0) {
    parts.push(`Avisos pendentes:\n${pendentes.map((l) => {
      const vNome = veiMap[l.veiculoId] ?? 'Veículo'
      const isVencido = l.dataLimite && new Date(l.dataLimite) < today
      const dateStr = l.dataLimite ? new Date(l.dataLimite).toLocaleDateString('pt-BR') : ''
      return `- ${vNome}: ${l.titulo || l.tipo}${isVencido ? ` ⚠️VENCIDO em ${dateStr}` : dateStr ? ` até ${dateStr}` : ''}`
    }).join('\n')}`)
  }

  const recentFuel = [...abastecimentos].sort((a, b) => b.criadoEm - a.criadoEm).slice(0, 5)
  if (recentFuel.length > 0) {
    parts.push(`Abastecimentos recentes:\n${recentFuel.map((a) =>
      `- ${veiMap[a.veiculoId] ?? 'Veículo'}: ${a.litros.toFixed(1)}L ${a.tipoCombustivel} R$${a.valorPago.toFixed(2)} (${a.data})`
    ).join('\n')}`)
  }

  const recentHistory = history.slice(-6)
  if (recentHistory.length > 0) {
    parts.push(`Histórico:\n${recentHistory.map((m) =>
      `${m.role === 'user' ? 'usuário' : 'zellu'}: ${m.content.slice(0, 200)}`
    ).join('\n')}`)
  }

  return parts.join('\n\n')
}

function RenderMarkdown({ text }: { text: string }) {
  return (
    <div className="space-y-0.5 text-sm leading-relaxed">
      {text.split('\n').map((line, i) => {
        if (line === '---') return <hr key={i} className="border-[#1e2d44] my-2" />
        const isBullet = line.startsWith('- ')
        const raw = isBullet ? line.slice(2) : line
        const nodes = raw.split(/(\*\*[^*]*\*\*)/).map((seg, j) =>
          seg.startsWith('**') && seg.endsWith('**') && seg.length > 4
            ? <strong key={j} className="font-semibold">{seg.slice(2, -2)}</strong>
            : <React.Fragment key={j}>{seg}</React.Fragment>
        )
        if (isBullet) return (
          <div key={i} className="flex gap-1.5 items-start">
            <span className="text-[#4f8df7] shrink-0 leading-relaxed">•</span>
            <span>{nodes}</span>
          </div>
        )
        if (line === '') return <div key={i} className="h-1.5" />
        return <div key={i}>{nodes}</div>
      })}
    </div>
  )
}

function PlanCardsView({
  cards,
  onConfirm,
  confirmed,
}: {
  cards: PlanoItem[]
  onConfirm: () => void
  confirmed: boolean
}) {
  const urgColor = { alta: '#ef4444', media: '#f59e0b', normal: '#22c55e' }
  const urgLabel = { alta: 'Urgente', media: 'Atenção', normal: 'Normal' }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {cards.map((card, i) => {
        const color = getTipoColor(card.tipo)
        const uc = urgColor[card.urgencia] ?? '#22c55e'
        const dateDisplay = card.dataLimite
          ? (() => { const [y, m, d] = card.dataLimite.split('-'); return `${d}/${m}/${y}` })()
          : null
        return (
          <div
            key={i}
            className="rounded-2xl border border-[#1e2d44] bg-[#0a1220] p-3.5 flex gap-3"
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${color}22` }}
            >
              <Wrench size={17} style={{ color }} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold text-[#f0f4ff]">{card.titulo}</span>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: `${uc}20`, color: uc }}
                >
                  {urgLabel[card.urgencia] ?? card.urgencia}
                </span>
              </div>
              {card.peca && (
                <p className="text-[12px] text-[#9aa8bd] leading-relaxed">{card.peca}</p>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                {dateDisplay && (
                  <span className="flex items-center gap-1 text-[11px] text-[#8892a4]">
                    <Calendar size={11} />
                    {dateDisplay}
                  </span>
                )}
                {card.kmLimite && (
                  <span className="flex items-center gap-1 text-[11px] text-[#8892a4]">
                    <Gauge size={11} />
                    {Number(card.kmLimite).toLocaleString('pt-BR')} km
                  </span>
                )}
                {card.valor ? (
                  <span className="text-[11px] text-[#8892a4]">
                    ~R$ {card.valor.toLocaleString('pt-BR')}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        )
      })}

      {!confirmed ? (
        <button
          onClick={onConfirm}
          className="mt-1 w-full py-2.5 rounded-2xl text-sm font-semibold text-white transition-all active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
        >
          Criar {cards.length} aviso{cards.length !== 1 ? 's' : ''}
        </button>
      ) : (
        <div className="flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-green-500/10 border border-green-500/20 mt-1">
          <CheckCircle2 size={15} className="text-green-400" />
          <span className="text-sm text-green-400 font-semibold">
            {cards.length} aviso{cards.length !== 1 ? 's' : ''} criado{cards.length !== 1 ? 's' : ''}!
          </span>
        </div>
      )}
    </div>
  )
}

export default function MecanicoVirtualScreen() {
  const navigate = useNavigate()
  const { veiculos, lembretes, abastecimentos, user, addLembreteLocal } = useStore()
  const [messages, setMessages] = useState<MensagemAI[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [planCards, setPlanCards] = useState<Record<string, PlanoItem[]>>({})
  const [confirmedPlans, setConfirmedPlans] = useState<Set<string>>(new Set())
  const [limitMsgIds, setLimitMsgIds] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const plano = user?.plano ?? 'FREE'
  const usageInfo = user ? getUsageInfo(user.uid, plano) : null

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function handleConfirmPlan(msgId: string) {
    const cards = planCards[msgId]
    if (!cards || !user) return

    for (const card of cards) {
      try {
        const resolvedVeiculoId =
          veiculos.find((v) => v.id === card.veiculoId)?.id ?? veiculos[0]?.id
        if (!resolvedVeiculoId) continue

        const dataLimite = card.dataLimite
          ? card.dataLimite.split('-').reverse().join('/')
          : ''

        const l = await addLembrete(user.uid, {
          veiculoId: resolvedVeiculoId,
          tipo: card.tipo,
          titulo: card.titulo,
          peca: card.peca ?? '',
          dataLimite,
          kmLimite: card.kmLimite ? String(card.kmLimite) : '',
          valor: card.valor ?? 0,
          horaAviso: card.horaAviso ?? '08:00',
          estabelecimentoNome: card.estabelecimentoNome ?? '',
          concluido: false,
        })
        if (l) addLembreteLocal(l)
      } catch {}
    }

    setConfirmedPlans((prev) => new Set([...prev, msgId]))
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return

    // Check enterprise AI disable flag
    if (plano === 'EMPRESARIAL' && isEmpresaAIDisabled()) {
      const msgId = gerarId()
      const userMsg: MensagemAI = { id: gerarId(), role: 'user', content: text.trim(), timestamp: Date.now() }
      const blockMsg: MensagemAI = { id: msgId, role: 'assistant', content: '__EMPRESA_OFF__', timestamp: Date.now() }
      setMessages((prev) => [...prev, userMsg, blockMsg])
      setInputText('')
      return
    }

    // Check usage limit before consuming API quota
    if (user) {
      const usage = consumeAI(user.uid, plano)
      if (!usage.allowed) {
        const msgId = gerarId()
        const userMsg: MensagemAI = { id: gerarId(), role: 'user', content: text.trim(), timestamp: Date.now() }
        const limitMsg: MensagemAI = { id: msgId, role: 'assistant', content: '', timestamp: Date.now() }
        setMessages((prev) => [...prev, userMsg, limitMsg])
        setLimitMsgIds((prev) => new Set([...prev, msgId]))
        setInputText('')
        return
      }
    }

    const userMsg: MensagemAI = {
      id: gerarId(), role: 'user', content: text.trim(), timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInputText('')
    setIsLoading(true)

    try {
      const garageContext = buildGarageContext(veiculos, lembretes, abastecimentos, messages)
      const planMode = isPlanRequest(text)

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (AI_APP_TOKEN) headers['X-Zellu-App-Token'] = AI_APP_TOKEN

      const body: Record<string, unknown> = { message: text, garageContext }
      if (planMode) {
        body.planMode = true
        const primary = veiculos[0]
        if (primary) {
          const parts = [primary.marca, primary.modelo, primary.ano].filter(Boolean)
          if (parts.length) body.vehicleSearch = parts.join(' ')
        }
      }

      const res = await fetch(AI_PROXY_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      const rawAnswer = data.answer ?? 'Sem resposta.'
      const msgId = gerarId()

      if (planMode) {
        const { cards, cleanText } = extractPlan(rawAnswer)
        if (cards && cards.length > 0) {
          setPlanCards((prev) => ({ ...prev, [msgId]: cards }))
        }
        setMessages((prev) => [
          ...prev,
          { id: msgId, role: 'assistant', content: cleanText || rawAnswer, timestamp: Date.now() },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          { id: msgId, role: 'assistant', content: rawAnswer, timestamp: Date.now() },
        ])
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : ''
      const msg = raw.toLowerCase().includes('limit')
        ? 'Limite de consultas atingido. Tente novamente em alguns minutos.'
        : 'Erro ao conectar com a Zellu AI. Verifique sua conexão e tente novamente.'
      setMessages((prev) => [
        ...prev,
        { id: gerarId(), role: 'assistant', content: msg, timestamp: Date.now() },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(inputText) }
  }

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100dvh - 3.5rem)' }}>
      <div className="flex-1 flex flex-col mx-auto w-full max-w-2xl px-4 py-4">
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            className="flex flex-1 flex-col items-center justify-center gap-6"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #3b7ef4, #60a5fa)' }}>
                <Sparkles size={36} className="text-white" />
              </div>
              <p className="text-xl font-bold text-[#f0f4ff] text-center">Olá! Sou a Zellu AI.</p>
              <p className="text-[#8892a4] text-center text-sm max-w-xs leading-relaxed">
                Pergunte sobre manutenção, diagnósticos ou análise dos seus veículos.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {SUGGESTION_CHIPS.map((chip) => (
                <button key={chip.text} type="button" onClick={() => sendMessage(chip.text)}
                  className="flex items-start gap-2 p-3 rounded-2xl bg-[#131e33] border border-[#1e2d44] text-left text-sm text-[#c8d4e8] hover:border-[#4f8df7]/50 hover:bg-[#1a2540] transition-all active:scale-95">
                  <span className="text-base leading-none mt-0.5">{chip.emoji}</span>
                  <span className="leading-tight">{chip.text}</span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className={`flex items-end gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg"
                      style={{ background: 'linear-gradient(135deg, #3b7ef4, #60a5fa)', boxShadow: '0 0 12px #3b7ef430' }}>
                      <Bot size={15} className="text-white" />
                    </div>
                  )}
                  <div
                    className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    style={{ maxWidth: 'min(78%, 480px)' }}
                  >
                    {msg.role === 'user' ? (
                      <div className="px-4 py-2.5 text-sm text-white leading-relaxed"
                        style={{ background: 'linear-gradient(135deg, #3b7ef4, #60a5fa)', borderRadius: '18px 18px 4px 18px', boxShadow: '0 2px 12px #3b7ef428', minWidth: '2.5rem' }}>
                        {msg.content}
                      </div>
                    ) : msg.content === '__EMPRESA_OFF__' ? (
                      <div
                        className="px-4 py-3.5"
                        style={{ background: 'linear-gradient(160deg, #1a120a 0%, #120d06 100%)', border: '1px solid #f59e0b30', borderRadius: '18px 18px 18px 4px' }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <AlertCircle size={15} className="text-amber-400 flex-shrink-0" />
                          <span className="text-sm font-semibold text-amber-400">IA desativada pelo administrador</span>
                        </div>
                        <p className="text-xs text-[#c8b07a] leading-relaxed">
                          O acesso à Zellu AI foi desativado para esta conta. Contate o administrador do plano Empresarial.
                        </p>
                      </div>
                    ) : limitMsgIds.has(msg.id) ? (
                      <div
                        className="px-4 py-3.5"
                        style={{ background: 'linear-gradient(160deg, #1a0f0f 0%, #120a0a 100%)', border: '1px solid #ef444430', borderRadius: '18px 18px 18px 4px' }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
                          <span className="text-sm font-semibold text-red-400">Limite mensal atingido</span>
                        </div>
                        {usageInfo && (
                          <p className="text-xs text-[#c8a0a0] leading-relaxed mb-3">
                            Você usou todas as <strong>{usageInfo.limit}</strong> consultas do plano{' '}
                            <strong>{plano}</strong> este mês.
                            Renovação em <strong>{formatResetDate(usageInfo.resetAt)}</strong>.
                          </p>
                        )}
                        <button
                          onClick={() => navigate('/perfil')}
                          className="text-xs font-semibold text-[#4f8df7] underline underline-offset-2"
                        >
                          Ver uso em Perfil →
                        </button>
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-[#e8eef8]"
                        style={{ background: 'linear-gradient(160deg, #131e33 0%, #0f1a2e 100%)', border: '1px solid #1e2d44', borderRadius: '18px 18px 18px 4px', boxShadow: '0 2px 16px #00000030' }}>
                        <RenderMarkdown text={msg.content} />
                        {planCards[msg.id] && (
                          <PlanCardsView
                            cards={planCards[msg.id]}
                            onConfirm={() => handleConfirmPlan(msg.id)}
                            confirmed={confirmedPlans.has(msg.id)}
                          />
                        )}
                      </div>
                    )}
                    <span className="text-[10px] text-[#4a5568] px-1">{formatTime(msg.timestamp)}</span>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden" style={{ border: '1px solid #2a3a5a' }}>
                      {user?.photoURL
                        ? <img src={user.photoURL} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        : <div className="w-full h-full flex items-center justify-center bg-[#1a2540]"><User size={14} className="text-[#6b7fa3]" /></div>
                      }
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {isLoading && (
                <motion.div key="typing"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.2 }}
                  className="flex items-end gap-2.5"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #3b7ef4, #60a5fa)', boxShadow: '0 0 12px #3b7ef430' }}>
                    <Bot size={15} className="text-white" />
                  </div>
                  <div className="px-4 py-3.5 flex items-center gap-1.5"
                    style={{ background: 'linear-gradient(160deg, #131e33 0%, #0f1a2e 100%)', border: '1px solid #1e2d44', borderRadius: '18px 18px 18px 4px' }}>
                    {[0, 0.18, 0.36].map((delay, i) => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-[#4f8df7]"
                        animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 0.7, repeat: Infinity, delay, ease: 'easeInOut' }} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="sticky bottom-0 mt-auto border-t border-[#1e2d44] bg-[#070c14]/95 px-4 pt-2 pb-2 backdrop-blur"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
        <div className="mx-auto w-full max-w-2xl">
          <div className="flex items-center gap-2">
            <input ref={inputRef} type="text" value={inputText}
              aria-label="Mensagem para a Zellu AI"
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte algo sobre seu veículo..."
              className="flex-1 bg-[#1a2540] border border-[#1e2d44] text-[#f0f4ff] placeholder-[#8892a4] rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#4f8df7] focus:ring-1 focus:ring-[#4f8df7]/30 transition-all"
            />
            <button type="button" aria-label="Enviar mensagem" onClick={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isLoading}
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity active:scale-95"
              style={{ background: 'linear-gradient(135deg, #3b7ef4, #60a5fa)' }}>
              <Send size={18} className="text-white" />
            </button>
          </div>
          {usageInfo && usageInfo.remaining <= Math.ceil(usageInfo.limit * 0.2) && usageInfo.remaining > 0 && (
            <p className="mt-1.5 text-center text-[11px] text-[#f59e0b]">
              {usageInfo.remaining} consulta{usageInfo.remaining !== 1 ? 's' : ''} restante{usageInfo.remaining !== 1 ? 's' : ''} este mês
              {' · '}
              <button onClick={() => navigate('/perfil')} className="underline underline-offset-2">ver no Perfil</button>
            </p>
          )}
          <p className="mt-1 text-center text-[11px] text-[#66758d]">
            A Zellu AI pode cometer erros. Confirme informações importantes com um profissional.
          </p>
        </div>
      </div>
    </div>
  )
}
