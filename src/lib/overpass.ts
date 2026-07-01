const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

export type TipoServico = 'mecanico' | 'pneu' | 'lavagem' | 'funilaria' | 'eletrica'

export interface LocalServico {
  id: number
  name?: string
  phone?: string
  address?: string
  lat: number
  lon: number
  distanciaKm?: number
}

function tagsParaTipo(tipo: TipoServico): [string, string][] {
  switch (tipo) {
    case 'pneu':
      return [['shop', 'tyres'], ['shop', 'car_repair'], ['amenity', 'car_repair']]
    case 'lavagem':
      return [['amenity', 'car_wash'], ['shop', 'car_wash']]
    case 'funilaria':
      return [['shop', 'car_repair'], ['craft', 'painter']]
    case 'eletrica':
      return [['shop', 'car_repair'], ['craft', 'electrician']]
    default:
      return [['shop', 'car_repair'], ['amenity', 'car_repair'], ['craft', 'mechanic']]
  }
}

function buildQuery(lat: number, lon: number, raioM: number, tipo: TipoServico): string {
  const tags = tagsParaTipo(tipo)
  const blocos = tags
    .map(
      ([k, v]) =>
        `  node(around:${raioM},${lat},${lon})["${k}"="${v}"];\n` +
        `  way(around:${raioM},${lat},${lon})["${k}"="${v}"];`,
    )
    .join('\n')
  return `[out:json][timeout:20];\n(\n${blocos}\n);\nout center tags 50;`
}

function distancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function parseLocais(elements: any[], userLat: number, userLon: number): LocalServico[] {
  return elements
    .map((el: any) => {
      const lat: number = el.lat ?? el.center?.lat
      const lon: number = el.lon ?? el.center?.lon
      if (!lat || !lon) return null
      const tags = el.tags ?? {}
      const phone =
        tags['contact:phone'] ??
        tags['phone'] ??
        tags['mobile'] ??
        tags['contact:mobile'] ??
        tags['contact:whatsapp']
      const addrParts = [
        tags['addr:street'],
        tags['addr:housenumber'],
        tags['addr:suburb'],
        tags['addr:city'],
      ].filter(Boolean)
      const address = addrParts.length > 0 ? addrParts.join(', ') : tags['addr:full']
      return {
        id: el.id as number,
        name: tags.name as string | undefined,
        phone: phone as string | undefined,
        address: address as string | undefined,
        lat,
        lon,
        distanciaKm: Math.round(distancia(userLat, userLon, lat, lon) * 10) / 10,
      } satisfies LocalServico
    })
    .filter(Boolean) as LocalServico[]
}

export async function buscarServicosProximos(
  lat: number,
  lon: number,
  tipo: TipoServico,
  raioKm = 15,
): Promise<LocalServico[]> {
  const query = buildQuery(lat, lon, raioKm * 1000, tipo)

  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(12000),
      })
      if (!res.ok) continue
      const data = await res.json()
      const locais = parseLocais(data.elements ?? [], lat, lon)
      if (locais.length > 0) {
        return locais.sort((a, b) => (a.distanciaKm ?? 99) - (b.distanciaKm ?? 99))
      }
    } catch {
      continue
    }
  }
  return []
}

export function abrirNoMaps(local: LocalServico): void {
  const url = `https://www.google.com/maps/search/?api=1&query=${local.lat},${local.lon}`
  window.open(url, '_blank', 'noopener')
}
