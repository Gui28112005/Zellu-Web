import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Info, AlertTriangle, CheckCircle, Wrench, Droplets, Gauge,
  BatteryWarning, Car, Plus, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useStore } from '@/lib/store'
import { addLembrete } from '@/lib/db'
import { getTipoLabel, getTipoColor, todayStr } from '@/lib/utils'
import type { TipoManutencao } from '@/lib/types'
import { PageTransition } from '@/components/layout/PageTransition'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const h = Math.floor(i / 4)
  const m = String((i % 4) * 15).padStart(2, '0')
  return `${String(h).padStart(2, '0')}:${m}`
})

function hexToRgba(hex: string, alpha: number) {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function toInputDate(dmy: string) {
  if (!dmy) return ''
  const [dd, mm, yyyy] = dmy.split('/')
  return dd && mm && yyyy ? `${yyyy}-${mm}-${dd}` : ''
}

function fromInputDate(iso: string) {
  if (!iso) return ''
  const [yyyy, mm, dd] = iso.split('-')
  return dd && mm && yyyy ? `${dd}/${mm}/${yyyy}` : ''
}

// ─── Dados ────────────────────────────────────────────────────────────────────

type Urgencia = 'alta' | 'media' | 'normal'

interface IntervalItem {
  servico: string
  km: string
  periodo: string
  urgencia: Urgencia
  tipo: TipoManutencao
  kmLimiteNum?: number
}

const INTERVALOS: IntervalItem[] = [
  { servico: 'Troca de óleo',        km: '5.000 – 10.000',  periodo: '6 – 12 meses',        urgencia: 'media',  tipo: 'OLEO',          kmLimiteNum: 5000  },
  { servico: 'Filtro de óleo',       km: '5.000 – 10.000',  periodo: 'A cada troca de óleo', urgencia: 'media',  tipo: 'REVISAO',       kmLimiteNum: 5000  },
  { servico: 'Alinhamento',          km: '10.000',           periodo: '12 meses',             urgencia: 'normal', tipo: 'MECANICA',      kmLimiteNum: 10000 },
  { servico: 'Balanceamento',        km: '10.000',           periodo: '12 meses',             urgencia: 'normal', tipo: 'MECANICA',      kmLimiteNum: 10000 },
  { servico: 'Filtro de ar',         km: '15.000 – 20.000', periodo: '12 meses',             urgencia: 'normal', tipo: 'REVISAO',       kmLimiteNum: 15000 },
  { servico: 'Filtro de combustível',km: '20.000 – 40.000', periodo: '24 meses',             urgencia: 'normal', tipo: 'REVISAO',       kmLimiteNum: 20000 },
  { servico: 'Pastilhas de freio',   km: '30.000 – 40.000', periodo: 'Inspecionar/ano',      urgencia: 'alta',   tipo: 'FREIO',         kmLimiteNum: 30000 },
  { servico: 'Fluido de freio',      km: '20.000 – 30.000', periodo: '12 – 24 meses',        urgencia: 'alta',   tipo: 'FREIO',         kmLimiteNum: 20000 },
  { servico: 'Correia dentada',      km: '60.000 – 100.000',periodo: '4 – 5 anos',           urgencia: 'alta',   tipo: 'MECANICA',      kmLimiteNum: 60000 },
  { servico: 'Velas de ignição',     km: '20.000 – 30.000', periodo: '24 meses',             urgencia: 'media',  tipo: 'MECANICA',      kmLimiteNum: 20000 },
  { servico: 'Bateria',              km: 'Sem km fixo',      periodo: '2 – 3 anos',           urgencia: 'media',  tipo: 'BATERIA'                          },
  { servico: 'Pneus (troca)',        km: '40.000 – 80.000', periodo: '5 – 10 anos',          urgencia: 'alta',   tipo: 'PNEU',          kmLimiteNum: 40000 },
  { servico: 'Revisão geral',        km: '10.000 – 15.000', periodo: '12 meses',             urgencia: 'media',  tipo: 'REVISAO',       kmLimiteNum: 10000 },
  { servico: 'IPVA',                 km: '–',                periodo: 'Anual',                urgencia: 'normal', tipo: 'IPVA'                             },
  { servico: 'Licenciamento',        km: '–',                periodo: 'Anual',                urgencia: 'normal', tipo: 'LICENCIAMENTO'                    },
]

const PASSOS_PNEU = [
  { n: 1, cor: '#f59e0b', titulo: 'Posicione o veículo',           desc: 'Estacione em local plano, firme e seguro, longe do trânsito. Aplique o freio de mão e engate a 1ª marcha (ou "P" no automático).' },
  { n: 2, cor: '#ef4444', titulo: 'Sinalização de segurança',      desc: 'Ligue os pisca-alertas imediatamente. Coloque o triângulo de segurança a ~30 m atrás do veículo.' },
  { n: 3, cor: '#4f8df7', titulo: 'Afrouxe os parafusos',          desc: 'Com o veículo NO CHÃO, afrouxe levemente cada parafuso no sentido anti-horário. NÃO retire ainda.' },
  { n: 4, cor: '#7c3aed', titulo: 'Posicione o macaco',            desc: 'Localize o ponto de apoio indicado no manual — geralmente uma nervura metálica reforçada próxima à roda com o pneu furado.' },
  { n: 5, cor: '#0ea5e9', titulo: 'Levante o veículo',             desc: 'Acione o macaco até a roda ficar ~10 cm do chão. NUNCA coloque qualquer parte do corpo sob o veículo enquanto ele estiver levantado.' },
  { n: 6, cor: '#dc2626', titulo: 'Remova o pneu furado',          desc: 'Retire os parafusos completamente e guarde-os em local seguro. Puxe o pneu furado para fora e posicione-o sob a carroceria como trava de segurança.' },
  { n: 7, cor: '#16a34a', titulo: 'Monte o estepe',                desc: 'Encaixe o estepe nos pinos. Aperte os parafusos COM A MÃO em forma de estrela (intercalado, nunca em sequência circular).' },
  { n: 8, cor: '#4f8df7', titulo: 'Abaixe e aperte',               desc: 'Retire o pneu furado de baixo da carroceria. Abaixe o veículo. Com a roda no chão, aperte todos os parafusos com força total, em forma de estrela.' },
  { n: 9, cor: '#059669', titulo: 'Finalize e dirija com cautela', desc: 'Guarde o pneu furado, o macaco e as ferramentas. Estepes têm velocidade máx. de 80 km/h. Calibre na primeira oportunidade.' },
]

const DICAS = [
  { cor: '#0ea5e9', icon: <Gauge size={17}/>,         titulo: 'Calibragem dos pneus',          desc: 'Calibre sempre com o pneu frio (de manhã ou após 2h parado). A pressão correta economiza combustível, melhora a dirigibilidade e aumenta a vida útil dos pneus. Verifique mensalmente.' },
  { cor: '#f59e0b', icon: <Droplets size={17}/>,       titulo: 'Troca de óleo em dia',          desc: 'Não ultrapasse o intervalo recomendado. Óleo velho perde viscosidade e pode danificar o motor de forma irreversível. Use sempre o óleo especificado no manual do fabricante.' },
  { cor: '#ef4444', icon: <AlertTriangle size={17}/>,  titulo: 'Fluido e pastilhas de freio',   desc: 'O fluido de freio absorve umidade com o tempo e perde eficiência. Barulhos ou vibrações ao frear indicam pastilhas desgastadas.' },
  { cor: '#8b5cf6', icon: <BatteryWarning size={17}/>, titulo: 'Bateria: sinais de alerta',     desc: 'Luzes fracas, dificuldade para ligar e bateria com mais de 3 anos são sinais de que a troca é iminente. Faça um teste de carga preventivo.' },
  { cor: '#dc2626', icon: <Wrench size={17}/>,         titulo: 'Correia dentada: não arrisque', desc: 'É um dos componentes mais críticos do motor. A ruptura pode causar danos graves e irreparáveis. Siga rigorosamente o intervalo do fabricante.' },
  { cor: '#16a34a', icon: <Car size={17}/>,            titulo: 'Alinhamento e balanceamento',   desc: 'Direção puxando para um lado, vibração no volante e desgaste irregular dos pneus indicam desalinhamento. Corrija sempre após bater em buracos ou meio-fios.' },
  { cor: '#059669', icon: <CheckCircle size={17}/>,    titulo: 'Verificações semanais',         desc: 'Crie o hábito: nível de óleo, água do radiador, fluido do freio e aspecto dos pneus. 5 minutos de atenção evitam horas de problema.' },
  { cor: '#06b6d4', icon: <Info size={17}/>,           titulo: 'Ar-condicionado',               desc: 'Ligue o ar-condicionado pelo menos uma vez por semana para lubrificar o compressor e evitar vazamentos. Recarga a cada 1–2 anos.' },
]

const urgColor: Record<Urgencia, string> = { alta: '#ef4444', media: '#f59e0b', normal: '#22c55e' }

// ─── Modal criar aviso ────────────────────────────────────────────────────────

const inputCls = 'w-full bg-[#1a2540] border border-[#1e2d44] text-[#f0f4ff] rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#4f8df7] focus:ring-1 focus:ring-[#4f8df7]/20 transition-all'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#8892a4] mb-1.5">{label}</label>
      {children}
    </div>
  )
}

interface CriarAvisoProps {
  item: IntervalItem
  onClose: () => void
}

function CriarAvisoModal({ item, onClose }: CriarAvisoProps) {
  const { veiculos, user, addLembreteLocal } = useStore()
  const cor = getTipoColor(item.tipo)

  const [veiculoId,     setVeiculoId]     = useState(veiculos[0]?.id ?? '')
  const [titulo,        setTitulo]        = useState(item.servico)
  const [peca,          setPeca]          = useState('')
  const [dataLimite,    setDataLimite]    = useState(toInputDate(todayStr()))
  const [kmLimite,      setKmLimite]      = useState(item.kmLimiteNum ? item.kmLimiteNum.toLocaleString('pt-BR') : '')
  const [valor,         setValor]         = useState('')
  const [horaAviso,     setHoraAviso]     = useState('08:00')
  const [estabelecimento, setEstabelecimento] = useState('')
  const [saving,        setSaving]        = useState(false)

  async function handleSave() {
    if (!user) return
    if (!veiculoId) return toast.error('Selecione um veículo.')
    if (!titulo.trim()) return toast.error('Informe o título.')
    setSaving(true)
    try {
      const l = await addLembrete(user.uid, {
        veiculoId,
        titulo: titulo.trim(),
        peca: peca.trim(),
        dataLimite: fromInputDate(dataLimite),
        kmLimite: kmLimite.replace(/\D/g, ''),
        tipo: item.tipo,
        valor: valor ? parseFloat(valor.replace(/\./g, '').replace(',', '.')) : 0,
        horaAviso,
        estabelecimentoNome: estabelecimento.trim(),
        concluido: false,
      })
      addLembreteLocal(l)
      toast.success('Aviso criado!')
      onClose()
    } catch {
      toast.error('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        className="w-full max-w-lg rounded-t-3xl border border-[#1e2d44] bg-[#0d1526] flex flex-col"
        style={{ maxHeight: '92dvh' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[#1e2d44]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: hexToRgba(cor, 0.18) }}>
              <Wrench size={18} style={{ color: cor }} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: cor }}>
                Criar aviso
              </p>
              <p className="text-sm font-bold text-white leading-tight">{getTipoLabel(item.tipo)}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-[#8892a4] hover:text-white transition-colors mt-1">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <Field label="Veículo">
            <select value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)} className={inputCls}>
              {veiculos.map((v) => (
                <option key={v.id} value={v.id} className="bg-[#131e33]">{v.nome}</option>
              ))}
            </select>
          </Field>

          <Field label="Título">
            <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Troca de óleo" className={inputCls} />
          </Field>

          <Field label="Peça / Serviço">
            <input type="text" value={peca} onChange={(e) => setPeca(e.target.value)}
              placeholder="Ex: Filtro de óleo" className={inputCls} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Data limite">
              <input type="date" value={dataLimite} onChange={(e) => setDataLimite(e.target.value)} className={inputCls} />
            </Field>
            <Field label="KM limite">
              <input type="text" inputMode="numeric" value={kmLimite}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '')
                  setKmLimite(raw ? Number(raw).toLocaleString('pt-BR') : '')
                }}
                placeholder="Ex: 10.000" className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor (R$)">
              <input type="text" inputMode="decimal" value={valor}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d]/g, '')
                  const cents = parseInt(raw || '0', 10)
                  setValor(raw === '' ? '' : (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
                }}
                placeholder="0,00" className={inputCls} />
            </Field>
            <Field label="Hora do aviso">
              <select value={horaAviso} onChange={(e) => setHoraAviso(e.target.value)} className={inputCls}>
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t} className="bg-[#131e33]">{t}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Estabelecimento">
            <input type="text" value={estabelecimento} onChange={(e) => setEstabelecimento(e.target.value)}
              placeholder="Ex: Auto Center Silva" className={inputCls} />
          </Field>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1e2d44]"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
          <button type="button" onClick={handleSave} disabled={saving}
            className="w-full rounded-2xl py-3.5 text-sm font-bold text-white disabled:opacity-50 transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #3b7ef4, #60a5fa)' }}>
            {saving ? 'Salvando…' : 'Criar aviso'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Abas ─────────────────────────────────────────────────────────────────────

function IntervalosTab({ onCriar }: { onCriar: (item: IntervalItem) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 px-3 py-2 rounded-xl bg-[#131e33] border border-[#1e2d44]">
        <span className="text-[11px] font-bold text-[#8892a4]">Prioridade:</span>
        {(['alta', 'media', 'normal'] as Urgencia[]).map((u) => (
          <div key={u} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: urgColor[u] }} />
            <span className="text-[11px] text-[#8892a4]">{u === 'media' ? 'Média' : u.charAt(0).toUpperCase() + u.slice(1)}</span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#1e2d44] overflow-hidden">
        <div className="flex items-center px-3 py-2.5 gap-2"
          style={{ background: 'linear-gradient(135deg, #3b7ef4, #60a5fa)' }}>
          <span className="flex-1 text-[11px] font-bold text-white">Serviço</span>
          <span className="w-28 text-[10px] font-bold text-white/80 text-center">KM</span>
          <span className="w-24 text-[10px] font-bold text-white/80 text-right">Período</span>
          <span className="w-7" />
        </div>
        {INTERVALOS.map((item, i) => (
          <div key={item.servico}
            className={`flex items-center gap-2 px-3 py-2.5 ${i % 2 === 0 ? 'bg-[#131e33]' : 'bg-[#0f1a2e]'} ${i < INTERVALOS.length - 1 ? 'border-b border-[#1e2d44]/50' : ''}`}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: urgColor[item.urgencia] }} />
              <span className="text-xs font-semibold text-[#e8eef8] truncate">{item.servico}</span>
            </div>
            <span className="w-28 text-[10px] text-[#8892a4] text-center leading-tight">{item.km}</span>
            <span className="w-24 text-[10px] text-[#8892a4] text-right leading-tight">{item.periodo}</span>
            <button type="button" aria-label={`Criar aviso para ${item.servico}`}
              onClick={() => onCriar(item)}
              className="w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center transition-colors hover:bg-[#4f8df7]/20 text-[#4f8df7]">
              <Plus size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2.5 p-3 rounded-xl border border-[#f59e0b]/20 bg-[#f59e0b]/8">
        <Info size={14} className="text-[#f59e0b] shrink-0 mt-0.5" />
        <p className="text-[11px] text-[#8892a4] leading-relaxed">
          Os intervalos são estimativas gerais. Consulte sempre o manual do seu veículo para os valores exatos.
        </p>
      </div>
    </div>
  )
}

function PneusTab() {
  return (
    <div className="space-y-3">
      <div className="flex gap-2.5 p-3 rounded-xl border border-[#4f8df7]/25 bg-[#4f8df7]/8">
        <Info size={14} className="text-[#4f8df7] shrink-0 mt-0.5" />
        <p className="text-[11px] text-[#c8d4e8] leading-relaxed">
          Sempre que possível, procure um borracheiro. Este guia é para situações de emergência em estrada.
        </p>
      </div>
      {PASSOS_PNEU.map((p) => (
        <div key={p.n} className="flex gap-3 p-3.5 rounded-2xl bg-[#131e33] border border-[#1e2d44]">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
            style={{ background: `${p.cor}20`, border: `1.5px solid ${p.cor}55`, color: p.cor }}>
            {p.n}
          </div>
          <div>
            <p className="text-sm font-bold text-[#e8eef8] mb-1">{p.titulo}</p>
            <p className="text-xs text-[#8892a4] leading-relaxed">{p.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function DicasTab() {
  return (
    <div className="space-y-3">
      {DICAS.map((d) => (
        <div key={d.titulo} className="flex rounded-2xl bg-[#131e33] border border-[#1e2d44] overflow-hidden">
          <div className="w-1 flex-shrink-0" style={{ background: d.cor }} />
          <div className="flex-1 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: `${d.cor}20`, color: d.cor }}>
                {d.icon}
              </div>
              <p className="text-sm font-bold text-[#e8eef8]">{d.titulo}</p>
            </div>
            <p className="text-xs text-[#8892a4] leading-relaxed">{d.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Tela ─────────────────────────────────────────────────────────────────────

type GuiaTab = 'intervalos' | 'pneus' | 'dicas'

const TABS: { key: GuiaTab; label: string }[] = [
  { key: 'intervalos', label: 'Intervalos' },
  { key: 'pneus',      label: 'Pneus' },
  { key: 'dicas',      label: 'Dicas' },
]

export default function GuiaManutencaoScreen() {
  const [tab, setTab] = useState<GuiaTab>('intervalos')
  const [avisoItem, setAvisoItem] = useState<IntervalItem | null>(null)

  return (
    <PageTransition className="min-h-full bg-[#070c14] text-[#f0f4ff]">
      <div className="mx-auto w-full max-w-2xl px-4 pb-10">
        {/* Header */}
        <div className="pt-5 pb-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#4f8df7] mb-1">Referência</p>
          <h1 className="text-2xl font-bold text-white">Guia de Manutenção</h1>
          <p className="text-sm text-[#8892a4] mt-1">Tabelas, dicas e o que fazer no aperto.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[#1e2d44] mb-5">
          {TABS.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                tab === t.key
                  ? 'text-[#4f8df7] border-[#4f8df7]'
                  : 'text-[#8892a4] border-transparent hover:text-[#c8d4e8]'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}>
            {tab === 'intervalos' && <IntervalosTab onCriar={setAvisoItem} />}
            {tab === 'pneus'      && <PneusTab />}
            {tab === 'dicas'      && <DicasTab />}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {avisoItem && (
          <CriarAvisoModal item={avisoItem} onClose={() => setAvisoItem(null)} />
        )}
      </AnimatePresence>
    </PageTransition>
  )
}
