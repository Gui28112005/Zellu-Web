import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, Bot, User } from 'lucide-react'
import { PageTransition } from '@/components/layout/PageTransition'
import { useStore } from '@/lib/store'
import type { MensagemAI } from '@/lib/types'

const SUGGESTION_CHIPS = [
  { emoji: '💧', text: 'Quando trocar o óleo?' },
  { emoji: '🔧', text: 'Como verificar os freios?' },
  { emoji: '📊', text: 'Analise meu histórico' },
  { emoji: '⚡', text: 'Dicas de economia' },
]

function gerarId(): string {
  return crypto.randomUUID()
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function MecanicoVirtualScreen() {
  const { veiculos } = useStore()
  const [messages, setMessages] = useState<MensagemAI[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return

    const userMsg: MensagemAI = {
      id: gerarId(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    }

    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInputText('')
    setIsLoading(true)

    const apiKey = import.meta.env.VITE_GROQ_API_KEY

    if (!apiKey) {
      const errMsg: MensagemAI = {
        id: gerarId(),
        role: 'assistant',
        content: 'Configure sua chave Groq API no arquivo .env',
        timestamp: Date.now(),
      }
      setMessages([...newMessages, errMsg])
      setIsLoading(false)
      return
    }

    try {
      const systemPrompt =
        'Você é um mecânico especialista em português do Brasil. Responda de forma clara e prática. Contexto do usuário — veículos: ' +
        JSON.stringify(
          veiculos.map((v) => ({
            nome: v.nome,
            tipo: v.tipoVeiculo,
            modelo: v.modelo,
            km: v.kmAtual,
          }))
        )

      const conversationHistory = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [
              { role: 'system', content: systemPrompt },
              ...conversationHistory,
            ],
            max_tokens: 1024,
            stream: false,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content ?? 'Sem resposta.'

      const aiMsg: MensagemAI = {
        id: gerarId(),
        role: 'assistant',
        content,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch (err) {
      const errMsg: MensagemAI = {
        id: gerarId(),
        role: 'assistant',
        content:
          'Erro ao conectar com o serviço de IA. Verifique sua conexão e tente novamente.',
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputText)
    }
  }

  return (
    <PageTransition>
      <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col border-[#1e2d44] bg-[#070c14] sm:border-x">
        {/* Messages area */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            /* Empty state */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center pt-10"
            >
              <div
                className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4"
                style={{
                  background: 'linear-gradient(135deg, #4f8df7, #60a5fa)',
                }}
              >
                <Sparkles size={36} className="text-white" />
              </div>
              <p className="text-xl font-bold text-[#f0f4ff] text-center">
                Olá! Sou a Zellu AI.
              </p>
              <p className="text-[#8892a4] text-center text-sm mt-2 max-w-xs leading-relaxed">
                Pergunte sobre manutenção, diagnósticos ou análise dos seus
                veículos.
              </p>

              {/* Suggestion chips */}
              <div className="mt-6 flex w-full max-w-lg flex-wrap justify-center gap-2 px-1 pb-2">
                {SUGGESTION_CHIPS.map((chip) => (
                  <button
                    key={chip.text}
                    type="button"
                    onClick={() => sendMessage(chip.emoji + ' ' + chip.text)}
                    className="max-w-full rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-[#f0f4ff] backdrop-blur-xl transition-colors hover:bg-white/10 active:scale-[0.97]"
                  >
                    {chip.emoji} {chip.text}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-4">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start items-end gap-2'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-5"
                        style={{
                          background: 'linear-gradient(135deg, #4f8df7, #60a5fa)',
                        }}
                      >
                        <Bot size={14} className="text-white" />
                      </div>
                    )}

                    <div
                      className={`flex flex-col ${
                        msg.role === 'user' ? 'items-end' : 'items-start'
                      } max-w-[80%]`}
                    >
                      <div
                        className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                          msg.role === 'user'
                            ? 'text-white rounded-3xl rounded-tr-sm'
                            : 'text-[#f0f4ff] bg-[#131e33] border border-[#1e2d44] rounded-3xl rounded-tl-sm'
                        }`}
                        style={
                          msg.role === 'user'
                            ? {
                                background:
                                  'linear-gradient(135deg, #4f8df7, #60a5fa)',
                              }
                            : undefined
                        }
                      >
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-[#8892a4] mt-1 px-1">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>

                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-[#1a2540] border border-[#1e2d44] flex items-center justify-center flex-shrink-0 mb-5">
                        <User size={14} className="text-[#8892a4]" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              <AnimatePresence>
                {isLoading && (
                  <motion.div
                    key="typing"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-end gap-2"
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, #4f8df7, #60a5fa)',
                      }}
                    >
                      <Bot size={14} className="text-white" />
                    </div>
                    <div className="bg-[#131e33] border border-[#1e2d44] rounded-3xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                      {[0, 0.15, 0.3].map((delay, i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full bg-[#4f8df7]"
                          animate={{ y: [0, -5, 0] }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay,
                            ease: 'easeInOut',
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div
          className="z-10 w-full flex-shrink-0 border-t border-[#1e2d44] bg-[#070c14]/95 px-4 py-3 backdrop-blur"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              aria-label="Mensagem para a Zellu AI"
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte algo sobre seu veículo..."
              className="flex-1 bg-[#1a2540] border border-[#1e2d44] text-[#f0f4ff] placeholder-[#8892a4] rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#4f8df7] focus:ring-1 focus:ring-[#4f8df7]/30 transition-all"
            />
            <button
              type="button"
              aria-label="Enviar mensagem"
              onClick={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isLoading}
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #4f8df7, #60a5fa)',
              }}
            >
              <Send size={18} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
