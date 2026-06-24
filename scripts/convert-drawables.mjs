/**
 * Converts Android VectorDrawable XML files to SVG files.
 * Run: node scripts/convert-drawables.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'

const SRC = 'C:/Users/PROJETO/Documents/ProjetosGit/Scanner/Projeto_GOL/app/src/main/res/drawable'
const OUT = 'public/vehicles'

const VEHICLES = {
  CARRO:            'ic_carro',
  HATCH:            'hatch',
  SUV:              'suv',
  MOTO:             'ic_moto',
  CAMINHONETE:      'ic_camionete',
  VAN:              'newvan',
  FURGAO:           'van',
  CAMINHAO:         'ic_caminhao',
  ONIBUS:           'onibus',
  BICICLETA:        'bikenova',
  BIKE_ELETRICA:    'bikeeletrica',
  VEICULO_ELETRICO: 'carroeletrico',
  CARRETINHA:       'ic_carreta',
  MOTORHOME:        'motorhome',
  TRATOR:           'ic_trator',
}

// ─── Color parsing ────────────────────────────────────────────────────────────

function parseColor(raw) {
  if (!raw) return null
  const s = raw.trim()
  if (s === '@color/black') return { color: '#000000', opacity: null }
  if (s === '@color/white') return { color: '#ffffff', opacity: null }
  if (!s.startsWith('#')) return { color: s, opacity: null }
  if (s.length === 9) {
    // Android #AARRGGBB
    const alpha = parseInt(s.slice(1, 3), 16)
    const color = '#' + s.slice(3)
    if (alpha === 0) return { color: 'none', opacity: null }
    const opacity = alpha === 255 ? null : +(alpha / 255).toFixed(3)
    return { color, opacity }
  }
  return { color: s, opacity: null }
}

// ─── Attribute extraction (simple, no regex stack issues) ─────────────────────

function getAttr(tag, name) {
  const key = name + '="'
  const start = tag.indexOf(key)
  if (start === -1) return null
  const valueStart = start + key.length
  const end = tag.indexOf('"', valueStart)
  return end === -1 ? null : tag.slice(valueStart, end)
}

// ─── Convert a single <path> tag ──────────────────────────────────────────────

function convertPathTag(tag) {
  const d = getAttr(tag, 'android:pathData')
  if (!d) return null

  const attrs = [`d="${d}"`]

  const fillRaw = getAttr(tag, 'android:fillColor')
  if (fillRaw) {
    const { color, opacity } = parseColor(fillRaw)
    attrs.push(`fill="${color}"`)
    if (opacity !== null) attrs.push(`fill-opacity="${opacity}"`)
  }

  const strokeRaw = getAttr(tag, 'android:strokeColor')
  if (strokeRaw) {
    const { color, opacity } = parseColor(strokeRaw)
    attrs.push(`stroke="${color}"`)
    if (opacity !== null) attrs.push(`stroke-opacity="${opacity}"`)
  }

  const sw = getAttr(tag, 'android:strokeWidth')
  if (sw) attrs.push(`stroke-width="${sw}"`)

  const slc = getAttr(tag, 'android:strokeLineCap')
  if (slc) attrs.push(`stroke-linecap="${slc.toLowerCase()}"`)

  const slj = getAttr(tag, 'android:strokeLineJoin')
  if (slj) attrs.push(`stroke-linejoin="${slj.toLowerCase()}"`)

  const alpha = getAttr(tag, 'android:alpha')
  if (alpha) attrs.push(`opacity="${alpha}"`)

  return `<path ${attrs.join(' ')}/>`
}

// ─── Convert a <group> open tag to <g> ───────────────────────────────────────

function convertGroupOpen(tag) {
  const rotation = getAttr(tag, 'android:rotation')
  const pivotX   = getAttr(tag, 'android:pivotX')
  const pivotY   = getAttr(tag, 'android:pivotY')
  const scaleX   = getAttr(tag, 'android:scaleX')
  const scaleY   = getAttr(tag, 'android:scaleY')
  const transX   = getAttr(tag, 'android:translateX')
  const transY   = getAttr(tag, 'android:translateY')

  const transforms = []
  if (transX || transY) transforms.push(`translate(${transX ?? 0},${transY ?? 0})`)
  if (rotation) {
    if (pivotX && pivotY) transforms.push(`rotate(${rotation},${pivotX},${pivotY})`)
    else transforms.push(`rotate(${rotation})`)
  }
  if (scaleX || scaleY) transforms.push(`scale(${scaleX ?? 1},${scaleY ?? 1})`)

  const tAttr = transforms.length ? ` transform="${transforms.join(' ')}"` : ''
  return `<g${tAttr}>`
}

// ─── Main conversion (iterative tokeniser, no recursion) ─────────────────────

function convert(xml) {
  const vw = getAttr(xml, 'android:viewportWidth') ?? '1536'
  const vh = getAttr(xml, 'android:viewportHeight') ?? '1024'

  const output = []

  // Tokenise by splitting on tag boundaries
  // We walk through the XML finding < and > characters
  let i = 0
  while (i < xml.length) {
    if (xml[i] !== '<') { i++; continue }

    // Find end of tag
    let j = i + 1
    // Handle multi-line path data by scanning to the closing >
    let depth = 0
    while (j < xml.length) {
      if (xml[j] === '"') {
        // skip quoted strings (path data may contain >/<)
        j++
        while (j < xml.length && xml[j] !== '"') j++
      }
      if (xml[j] === '>') break
      j++
    }
    const tag = xml.slice(i, j + 1)
    i = j + 1

    // Determine tag type
    if (tag.startsWith('<!--')) continue                         // comment
    if (tag.startsWith('<vector') || tag.startsWith('<?')) continue // root/processing
    if (tag.startsWith('</vector')) continue
    if (tag.startsWith('<clip-path') || tag.startsWith('</clip-path')) continue

    if (tag.startsWith('</group')) {
      output.push('</g>')
      continue
    }

    if (tag.startsWith('<group')) {
      output.push(convertGroupOpen(tag))
      // self-closing group (rare)
      if (tag.endsWith('/>')) output.push('</g>')
      continue
    }

    if (tag.startsWith('<path')) {
      const converted = convertPathTag(tag)
      if (converted) output.push(converted)
      continue
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}">`,
    ...output,
    '</svg>',
  ].join('\n')
}

// ─── Run ──────────────────────────────────────────────────────────────────────

mkdirSync(OUT, { recursive: true })

const manifest = {}
for (const [tipo, file] of Object.entries(VEHICLES)) {
  let xml
  try { xml = readFileSync(`${SRC}/${file}.xml`, 'utf-8') } catch { console.warn(`⚠  ${file}.xml not found`); continue }

  const svg = convert(xml)
  const outPath = `${OUT}/${file}.svg`
  writeFileSync(outPath, svg, 'utf-8')
  manifest[tipo] = `/vehicles/${file}.svg`
  console.log(`✓  ${tipo} → ${outPath}`)
}

writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2))
console.log('\nDone.')
