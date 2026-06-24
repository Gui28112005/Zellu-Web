import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { TipoManutencao, TipoVeiculo, Lembrete } from '@/lib/types'

// ─── Tailwind class merger ────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// ─── Date & formatting ────────────────────────────────────────────────────────

/**
 * Converts "dd/MM/yyyy" → "15 jan. 2024"
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('/')
  if (parts.length !== 3) return dateStr
  const [day, month, year] = parts
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Formats a number as Brazilian currency: "R$ 1.234,56"
 */
export function formatCurrency(v: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v)
}

/**
 * Formats an odometer reading: "45.231 km"
 */
export function formatKm(km: number): string {
  return `${new Intl.NumberFormat('pt-BR').format(km)} km`
}

/**
 * Returns today as "dd/MM/yyyy"
 */
export function todayStr(): string {
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = now.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

// ─── Maintenance type helpers ─────────────────────────────────────────────────

const TIPO_LABELS: Record<TipoManutencao, string> = {
  CORRENTE: 'Corrente',
  LUBRIFICACAO: 'Lubrificação',
  PEDIVELA: 'Pedivela',
  ACESSORIOS: 'Acessórios',
  CONFORTO: 'Conforto',
  PNEU: 'Pneu',
  TRANSMISSAO: 'Transmissão',
  REVISAO: 'Revisão',
  OLEO: 'Óleo',
  LAVAGEM: 'Lavagem',
  ABASTECIMENTO: 'Abastecimento',
  BATERIA: 'Bateria',
  VIDROS: 'Vidros',
  MECANICA: 'Mecânica',
  FUNILARIA: 'Funilaria',
  FREIO: 'Freio',
  LICENCIAMENTO: 'Licenciamento',
  IPVA: 'IPVA',
  SEGURO: 'Seguro',
  OUTROS: 'Outros',
}

export function getTipoLabel(tipo: TipoManutencao): string {
  return TIPO_LABELS[tipo] ?? tipo
}

const TIPO_COLORS: Record<TipoManutencao, string> = {
  CORRENTE: '#f59e0b',
  LUBRIFICACAO: '#f59e0b',
  PEDIVELA: '#a78bfa',
  ACESSORIOS: '#60a5fa',
  CONFORTO: '#34d399',
  PNEU: '#94a3b8',
  TRANSMISSAO: '#f97316',
  REVISAO: '#4f8df7',
  OLEO: '#f59e0b',
  LAVAGEM: '#38bdf8',
  ABASTECIMENTO: '#4ade80',
  BATERIA: '#facc15',
  VIDROS: '#7dd3fc',
  MECANICA: '#fb923c',
  FUNILARIA: '#e879f9',
  FREIO: '#f87171',
  LICENCIAMENTO: '#34d399',
  IPVA: '#34d399',
  SEGURO: '#818cf8',
  OUTROS: '#8892a4',
}

export function getTipoColor(tipo: TipoManutencao): string {
  return TIPO_COLORS[tipo] ?? '#8892a4'
}

// ─── Vehicle type helpers ─────────────────────────────────────────────────────

const VEICULO_EMOJIS: Record<TipoVeiculo, string> = {
  BICICLETA: '🚲',
  BIKE_ELETRICA: '⚡🚲',
  VEICULO_ELETRICO: '⚡🚗',
  CARRETINHA: '🚛',
  CARRO: '🚗',
  HATCH: '🚙',
  MOTO: '🏍️',
  CAMINHONETE: '🛻',
  FURGAO: '🚐',
  CAMINHAO: '🚚',
  ONIBUS: '🚌',
  SUV: '🚙',
  VAN: '🚐',
  MOTORHOME: '🚐',
  TRATOR: '🚜',
}

export function getVeiculoEmoji(tipo: TipoVeiculo): string {
  return VEICULO_EMOJIS[tipo] ?? '🚗'
}

const VEICULO_LABELS: Record<TipoVeiculo, string> = {
  BICICLETA: 'Bicicleta',
  BIKE_ELETRICA: 'Bike Elétrica',
  VEICULO_ELETRICO: 'Veículo Elétrico',
  CARRETINHA: 'Carretinha',
  CARRO: 'Sedan',
  HATCH: 'Hatch',
  MOTO: 'Moto',
  CAMINHONETE: 'Caminhonete',
  FURGAO: 'Furgão',
  CAMINHAO: 'Caminhão',
  ONIBUS: 'Ônibus',
  SUV: 'SUV',
  VAN: 'Van',
  MOTORHOME: 'Motorhome',
  TRATOR: 'Trator',
}

export function getVeiculoLabel(tipo: TipoVeiculo): string {
  return VEICULO_LABELS[tipo] ?? tipo
}

// ─── Lembrete status helpers ──────────────────────────────────────────────────

/**
 * Parses "dd/MM/yyyy" into a Date at midnight local time.
 */
function parseDDMMYYYY(dateStr: string): Date | null {
  if (!dateStr) return null
  const parts = dateStr.split('/')
  if (parts.length !== 3) return null
  const [dd, mm, yyyy] = parts
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
  return isNaN(d.getTime()) ? null : d
}

/**
 * Returns true if the lembrete's dataLimite is in the past and it is not concluded.
 */
export function isLembreteVencido(l: Lembrete): boolean {
  if (l.concluido) return false
  const limit = parseDDMMYYYY(l.dataLimite)
  if (!limit) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return limit < today
}

/**
 * Returns true if the lembrete is due within `days` days (and not concluded).
 */
export function isLembretePróximo(l: Lembrete, days: number): boolean {
  if (l.concluido) return false
  const limit = parseDDMMYYYY(l.dataLimite)
  if (!limit) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const future = new Date(today)
  future.setDate(future.getDate() + days)
  return limit >= today && limit <= future
}

// ─── ID generation ────────────────────────────────────────────────────────────

export function gerarId(): string {
  return crypto.randomUUID()
}

// ─── Currency parsing ─────────────────────────────────────────────────────────

/**
 * Parses "R$ 1.234,56" or "1234,56" or "1234.56" to a number.
 */
export function parseCurrency(s: string): number {
  if (!s) return 0
  // Remove currency symbol and whitespace
  let clean = s.replace(/R\$\s*/g, '').trim()
  // Remove thousand separators (dots) and replace comma decimal with dot
  clean = clean.replace(/\./g, '').replace(',', '.')
  const val = parseFloat(clean)
  return isNaN(val) ? 0 : val
}

// ─── Fuel type labels ─────────────────────────────────────────────────────────

const COMBUSTIVEL_LABELS: Record<string, string> = {
  GASOLINA: 'Gasolina',
  ETANOL: 'Etanol',
  DIESEL: 'Diesel',
  FLEX: 'Flex',
  ELETRICO: 'Elétrico',
  GNV: 'GNV',
}

export function formatarTipoCombustivel(t: string): string {
  return COMBUSTIVEL_LABELS[t] ?? t
}

// ─── FIPE brand name normalization ───────────────────────────────────────────

const FIPE_MARCA_MAP: Record<string, string> = {
  'VW - VolksWagen':   'Volkswagen',
  'GM - Chevrolet':    'Chevrolet',
  'Mercedes-Benz':     'Mercedes-Benz',
  'Land Rover':        'Land Rover',
  'Alfa Romeo':        'Alfa Romeo',
  'Aston Martin':      'Aston Martin',
  'RAM':               'RAM',
}

export function normalizarMarca(nome: string): string {
  if (!nome) return nome
  if (FIPE_MARCA_MAP[nome]) return FIPE_MARCA_MAP[nome]
  // Remove prefixo "I/" (importados antigos: "I/Ford", "I/Toyota")
  let clean = nome.replace(/^I\//, '')
  // Remove padrão "XX - NomeMarca" (ex: "VW - VolksWagen" já tratado acima)
  clean = clean.replace(/^[A-Z]{1,4}\s*-\s*/i, '')
  // Capitaliza corretamente (ex: "FIAT" → "Fiat", "BMW" mantém maiúsculo se ≤3 chars)
  const words = clean.trim().split(/\s+/)
  clean = words.map((w) => {
    if (w.length <= 3 && w === w.toUpperCase()) return w
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  }).join(' ')
  return clean
}
