const BASE = 'https://commons.wikimedia.org/w/api.php'

const BLOCKED_KEYWORDS = [
  'logo', 'badge', 'emblem', 'icon', 'symbol', 'flag', 'coat', 'map',
  'schematic', 'diagram', 'drawing', 'interior', 'dashboard', 'engine',
  'motor', 'spare part', 'advertisement', 'poster', 'brochure',
]

function isRelevantTitle(title: string, queryWords: string[]): boolean {
  const t = title.toLowerCase()
  if (BLOCKED_KEYWORDS.some((kw) => t.includes(kw))) return false
  return queryWords.some((w) => w.length > 2 && t.includes(w))
}

function buildQueries(marca: string, modelo: string, ano?: string, tipoHint?: string): string[] {
  const parts = [marca, modelo, ano, tipoHint].filter(Boolean) as string[]
  const candidates = [
    [marca, modelo, ano, tipoHint],
    [marca, modelo, tipoHint],
    [marca, modelo],
    [modelo, marca, tipoHint],
    [modelo, tipoHint],
  ].map((arr) => arr.filter(Boolean).join(' ').trim())
  return [...new Set(candidates)].filter(Boolean)
}

const cache = new Map<string, string | null>()

export async function fetchVehicleImage(
  marca: string,
  modelo: string,
  ano?: string,
  tipoHint?: string,
): Promise<string | null> {
  const cacheKey = [marca, modelo, ano].filter(Boolean).join('|').toLowerCase()
  if (cache.has(cacheKey)) return cache.get(cacheKey) ?? null

  const queries = buildQueries(marca, modelo, ano, tipoHint)

  for (const query of queries) {
    try {
      const url =
        `${BASE}?action=query&format=json&origin=*` +
        `&generator=search&gsrsearch=${encodeURIComponent(query)}` +
        `&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url&iiurlwidth=900`

      const res = await fetch(url, { signal: AbortSignal.timeout(6000) })
      if (!res.ok) continue

      const data = await res.json()
      const pages: Record<string, any> = data?.query?.pages ?? {}
      const queryWords = query.toLowerCase().split(' ')

      for (const page of Object.values(pages)) {
        const title: string = page.title ?? ''
        if (!isRelevantTitle(title, queryWords)) continue
        const info = page.imageinfo?.[0]
        const imgUrl: string = info?.thumburl || info?.url || ''
        if (imgUrl) {
          cache.set(cacheKey, imgUrl)
          return imgUrl
        }
      }
    } catch {
      continue
    }
  }

  cache.set(cacheKey, null)
  return null
}
