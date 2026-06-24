export type FipeTipoVeiculo = 'carros' | 'motos' | 'caminhoes'

export interface FipeMarca  { codigo: string; nome: string }
export interface FipeModelo { codigo: number; nome: string }
export interface FipeAno    { codigo: string; nome: string }

export interface FipePreco {
  Valor: string
  Marca: string
  Modelo: string
  AnoModelo: number
  Combustivel: string
  CodigoFipe: string
  MesReferencia: string
}

const BASE = 'https://parallelum.com.br/fipe/api/v1'

// ── TTLs ──────────────────────────────────────────────────────────────────────
// Marcas e modelos mudam raramente → 7 dias
// Anos mudam raramente → 7 dias
// Preço muda mensalmente → 24 horas
const TTL_STATIC  = 7 * 24 * 60 * 60 * 1000  // 7 dias
const TTL_PRECO   = 24 * 60 * 60 * 1000       // 24 horas

// ── Memória (evita buscas duplicadas na mesma sessão) ─────────────────────────
const memCache = new Map<string, unknown>()

// ── localStorage com TTL ──────────────────────────────────────────────────────
function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`fipe:${key}`)
    if (!raw) return null
    const { data, expiresAt } = JSON.parse(raw) as { data: T; expiresAt: number }
    if (Date.now() > expiresAt) {
      localStorage.removeItem(`fipe:${key}`)
      return null
    }
    return data
  } catch {
    return null
  }
}

function lsSet(key: string, data: unknown, ttl: number): void {
  try {
    localStorage.setItem(`fipe:${key}`, JSON.stringify({ data, expiresAt: Date.now() + ttl }))
  } catch {
    // localStorage cheio ou indisponível — ignora silenciosamente
  }
}

// ── Fetcher com cache em camadas ─────────────────────────────────────────────
async function fetchFipe<T>(path: string, ttl: number): Promise<T> {
  // 1. Memória (sessão atual)
  if (memCache.has(path)) return memCache.get(path) as T

  // 2. localStorage (entre sessões)
  const cached = lsGet<T>(path)
  if (cached !== null) {
    memCache.set(path, cached)
    return cached
  }

  // 3. Rede
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`FIPE ${res.status}`)
  const data = await res.json() as T

  memCache.set(path, data)
  lsSet(path, data, ttl)
  return data
}

// ── API pública ───────────────────────────────────────────────────────────────

export async function getMarcas(tipo: FipeTipoVeiculo): Promise<FipeMarca[]> {
  return fetchFipe<FipeMarca[]>(`/${tipo}/marcas`, TTL_STATIC)
}

export async function getModelos(tipo: FipeTipoVeiculo, codMarca: string): Promise<FipeModelo[]> {
  const data = await fetchFipe<{ modelos: FipeModelo[] }>(`/${tipo}/marcas/${codMarca}/modelos`, TTL_STATIC)
  return data.modelos
}

export async function getAnos(tipo: FipeTipoVeiculo, codMarca: string, codModelo: number): Promise<FipeAno[]> {
  return fetchFipe<FipeAno[]>(`/${tipo}/marcas/${codMarca}/modelos/${codModelo}/anos`, TTL_STATIC)
}

export async function getPreco(
  tipo: FipeTipoVeiculo,
  codMarca: string,
  codModelo: string,
  codAno: string,
): Promise<FipePreco> {
  return fetchFipe<FipePreco>(`/${tipo}/marcas/${codMarca}/modelos/${codModelo}/anos/${codAno}`, TTL_PRECO)
}

export function getFipeTipo(tipoVeiculo: string): FipeTipoVeiculo | null {
  if (['CARRO', 'HATCH', 'SUV', 'CAMINHONETE', 'VEICULO_ELETRICO'].includes(tipoVeiculo)) return 'carros'
  if (['MOTO'].includes(tipoVeiculo)) return 'motos'
  if (['CAMINHAO', 'ONIBUS', 'VAN', 'FURGAO'].includes(tipoVeiculo)) return 'caminhoes'
  return null
}
