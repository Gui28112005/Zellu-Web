import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { GastoViagem, Lembrete, PosicaoPneu, RegistroPneu, RegistroViagem, TipoManutencao, Veiculo } from '@/lib/types'
import { formatCurrency, formatKm, getCorNome, getTipoLabel, getVeiculoLabel, normalizarMarca } from '@/lib/utils'

type Rgb = [number, number, number]

const C = {
  navy:       [15, 26, 44] as Rgb,
  blue:       [37, 99, 235] as Rgb,
  blueLight:  [96, 165, 250] as Rgb,
  muted:      [100, 116, 139] as Rgb,
  body:       [15, 23, 42] as Rgb,
  divider:    [226, 232, 240] as Rgb,
  rowOdd:     [248, 250, 252] as Rgb,
  success:    [22, 163, 74] as Rgb,
  successBg:  [240, 253, 244] as Rgb,
  danger:     [220, 38, 38] as Rgb,
  dangerBg:   [254, 242, 242] as Rgb,
  headerText: [219, 231, 248] as Rgb,
  tableHead:  [26, 41, 64] as Rgb,
}

export interface VehicleReportOptions {
  fipeValor?: string
  sugerido?: number
  adjustPct?: number
}

export interface FleetOverviewReportRow {
  nome: string
  marcaModelo: string
  kmAtual: string
  pendentes: number
  vencidos: number
  proximos: number
  saude: number
  prioridade: string
  proximoAviso: string
}

const TIRE_POSITIONS: Record<PosicaoPneu, { label: string; short: string }> = {
  DD: { label: 'Dianteiro Direito', short: 'DD' },
  DE: { label: 'Dianteiro Esquerdo', short: 'DE' },
  TD: { label: 'Traseiro Direito', short: 'TD' },
  TE: { label: 'Traseiro Esquerdo', short: 'TE' },
  ESTEPE: { label: 'Estepe', short: 'ESP' },
}

const TRAVEL_EXPENSE_LABELS: Record<string, string> = {
  combustivel: 'Combustivel',
  pedagio: 'Pedagio',
  estacionamento: 'Estacionamento',
  alimentacao: 'Alimentacao',
  outros: 'Outros',
}

function safeName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

function parseDateValue(value: string): Date | null {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split('/').map(Number)
    return new Date(year, month - 1, day)
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatReportDate(value: string | number | undefined) {
  if (!value) return '-'
  const date = typeof value === 'number' ? new Date(value) : parseDateValue(String(value))
  if (!date || Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('pt-BR')
}

function fullDate(date = new Date()) {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

async function imageUrlToDataUrl(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error('image not found')
  const blob = await response.blob()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function vehicleMakeModel(vehicle: Veiculo) {
  return [normalizarMarca(vehicle.marca), vehicle.modelo, vehicle.ano].filter(Boolean).join(' · ') || '-'
}

function isBike(vehicle: Veiculo) {
  return vehicle.tipoVeiculo === 'BICICLETA' || vehicle.tipoVeiculo === 'BIKE_ELETRICA'
}

function reminderTime(reminder: Lembrete) {
  return reminder.concluidoEm ?? reminder.criadoEm
}

function dateForType(reminders: Lembrete[], type: TipoManutencao) {
  const pending = reminders.filter(r => !r.concluido && r.tipo === type && r.dataLimite)
  if (pending.length === 0) return 'N/A'
  return formatReportDate(pending.sort((a, b) => a.dataLimite!.localeCompare(b.dataLimite!))[0].dataLimite)
}

// ── Drawing helpers ────────────────────────────────────────────────────────────

function addFooter(doc: jsPDF) {
  const pageCount = (doc.internal as any).getNumberOfPages()
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page)
    doc.setDrawColor(...C.divider)
    doc.setLineWidth(0.3)
    doc.line(14, pageH - 12, pageW - 14, pageH - 12)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...C.blue)
    doc.text('Zellu', 14, pageH - 6.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...C.muted)
    doc.text('zellu.app', 27, pageH - 6.5)
    doc.text(fullDate(), pageW / 2, pageH - 6.5, { align: 'center' })
    doc.text(`${page} / ${pageCount}`, pageW - 14, pageH - 6.5, { align: 'right' })
  }
}

function addHeader(doc: jsPDF, vehicle: Veiculo, addPage: boolean) {
  if (addPage) doc.addPage()
  const pageW = doc.internal.pageSize.getWidth()

  // Dark background
  doc.setFillColor(...C.navy)
  doc.rect(0, 0, pageW, 40, 'F')

  // Blue accent strip at top
  doc.setFillColor(...C.blue)
  doc.rect(0, 0, pageW, 3, 'F')

  // Brand
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text('Zellu', 14, 15)

  // Subtitle
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...C.muted)
  doc.text('Relatório Veicular', 14, 22)

  // Date top-right
  doc.setFontSize(8)
  doc.text(fullDate(), pageW - 14, 15, { align: 'right' })

  // Vehicle name + make/model
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11.5)
  doc.setTextColor(...C.headerText)
  doc.text(vehicle.nome || 'Veículo', 14, 33)

  const makeModel = vehicleMakeModel(vehicle)
  if (makeModel !== '-') {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...C.muted)
    doc.text(makeModel, pageW - 14, 33, { align: 'right' })
  }
}

function addSectionTitle(doc: jsPDF, title: string, y: number) {
  const pageW = doc.internal.pageSize.getWidth()
  doc.setFillColor(...C.blue)
  doc.rect(14, y - 5, 2.5, 9, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...C.navy)
  doc.text(title.toUpperCase(), 20, y)
  doc.setDrawColor(...C.divider)
  doc.setLineWidth(0.3)
  doc.line(14, y + 4.5, pageW - 14, y + 4.5)
  return y + 11
}

function addStatsRow(doc: jsPDF, y: number, stats: Array<{ label: string; value: string; tone?: 'success' | 'danger' | 'neutral' }>) {
  const pageW = doc.internal.pageSize.getWidth()
  const mx = 14
  const gap = 4
  const boxW = (pageW - mx * 2 - gap * (stats.length - 1)) / stats.length
  const boxH = 24

  stats.forEach((stat, i) => {
    const x = mx + i * (boxW + gap)
    const isSuccess = stat.tone === 'success'
    const isDanger = stat.tone === 'danger'

    doc.setFillColor(...(isSuccess ? C.successBg : isDanger ? C.dangerBg : C.rowOdd))
    doc.setDrawColor(...(isSuccess ? C.success : isDanger ? C.danger : C.divider))
    doc.setLineWidth(isDanger || isSuccess ? 0.8 : 0.4)
    doc.roundedRect(x, y, boxW, boxH, 2.5, 2.5, 'FD')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...C.muted)
    doc.text(stat.label.toUpperCase(), x + boxW / 2, y + 8, { align: 'center' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...(isSuccess ? C.success : isDanger ? C.danger : C.navy))
    doc.text(stat.value, x + boxW / 2, y + 18, { align: 'center' })
  })

  return y + boxH + 7
}

function addFipeCard(doc: jsPDF, y: number, fipeValor: string, sugerido: number, adjustPct: number) {
  const pageW = doc.internal.pageSize.getWidth()
  const mx = 14
  const boxW = (pageW - mx * 2 - 5) / 2
  const boxH = 32

  // FIPE box
  doc.setFillColor(...C.rowOdd)
  doc.setDrawColor(...C.divider)
  doc.setLineWidth(0.4)
  doc.roundedRect(mx, y, boxW, boxH, 2.5, 2.5, 'FD')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.muted)
  doc.text('TABELA FIPE', mx + boxW / 2, y + 10, { align: 'center' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...C.navy)
  doc.text(fipeValor, mx + boxW / 2, y + 22, { align: 'center' })

  // Sale suggestion box
  const x2 = mx + boxW + 5
  const pctColor: Rgb = adjustPct < 0 ? C.danger : C.success
  doc.setFillColor(...(adjustPct < 0 ? C.dangerBg : C.successBg))
  doc.setDrawColor(...pctColor)
  doc.setLineWidth(0.8)
  doc.roundedRect(x2, y, boxW, boxH, 2.5, 2.5, 'FD')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.muted)
  const pctLabel = `SUGESTÃO DE VENDA ${adjustPct > 0 ? '+' : ''}${adjustPct}%`
  doc.text(pctLabel, x2 + boxW / 2, y + 10, { align: 'center' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...pctColor)
  doc.text(formatCurrency(sugerido), x2 + boxW / 2, y + 22, { align: 'center' })

  return y + boxH + 8
}

function addLegalStatus(doc: jsPDF, y: number, reminders: Lembrete[]) {
  const pageW = doc.internal.pageSize.getWidth()
  const mx = 14
  const gap = 3
  const colW = (pageW - mx * 2 - gap * 2) / 3
  const boxH = 28
  const today = new Date().setHours(0, 0, 0, 0)

  const items: Array<{ label: string; type: TipoManutencao }> = [
    { label: 'IPVA', type: 'IPVA' },
    { label: 'Licenciamento', type: 'LICENCIAMENTO' },
    { label: 'Seguro', type: 'SEGURO' },
  ]

  items.forEach(({ label, type }, i) => {
    const x = mx + i * (colW + gap)
    const value = dateForType(reminders, type)
    const date = value !== 'N/A' ? parseDateValue(value.split('/').reverse().join('-')) : null
    const isOverdue = date ? date.getTime() < today : false
    const color: Rgb = value === 'N/A' ? C.muted : isOverdue ? C.danger : C.success
    const bg: Rgb = value === 'N/A' ? C.rowOdd : isOverdue ? C.dangerBg : C.successBg

    doc.setFillColor(...bg)
    doc.setDrawColor(...color)
    doc.setLineWidth(value === 'N/A' ? 0.4 : 0.8)
    doc.roundedRect(x, y, colW, boxH, 2.5, 2.5, 'FD')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.muted)
    doc.text(label, x + colW / 2, y + 9, { align: 'center' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...color)
    doc.text(value, x + colW / 2, y + 20, { align: 'center' })
  })

  return y + boxH + 8
}

function addDetailRows(doc: jsPDF, y: number, rows: Array<[string, string, ('success' | 'danger' | 'normal')?]>) {
  autoTable(doc, {
    startY: y,
    theme: 'plain',
    body: rows.map(([label, value]) => [label, value]),
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9, cellPadding: { top: 3, right: 0, bottom: 3, left: 0 }, lineColor: C.divider },
    columnStyles: {
      0: { textColor: C.muted },
      1: { textColor: C.body, fontStyle: 'bold', halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 1) return
      const tone = rows[data.row.index]?.[2]
      if (tone === 'success') data.cell.styles.textColor = C.success
      if (tone === 'danger')  data.cell.styles.textColor = C.danger
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        const y2 = data.cell.y + data.cell.height
        doc.setDrawColor(...C.divider)
        doc.line(14, y2, 196, y2)
      }
    },
  })
  return (doc as any).lastAutoTable.finalY + 8
}

function reportTable(doc: jsPDF, y: number, head: string[], rows: string[][], rightColumns: number[] = []) {
  autoTable(doc, {
    startY: y,
    theme: 'grid',
    head: [head],
    body: rows,
    margin: { left: 14, right: 14 },
    headStyles: { fillColor: C.tableHead, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, textColor: C.body, lineColor: C.divider },
    alternateRowStyles: { fillColor: C.rowOdd },
    columnStyles: Object.fromEntries(rightColumns.map((index) => [index, { halign: 'right' }])),
  })
  return (doc as any).lastAutoTable.finalY + 10
}

// ── Main report builder ────────────────────────────────────────────────────────

const PAGE_H = 297 // A4 mm
const FOOTER_MARGIN = 18

function makePageHelper(doc: jsPDF, vehicle: Veiculo) {
  let currentY = 50
  const ensurePage = (needed: number) => {
    if (currentY + needed > PAGE_H - FOOTER_MARGIN) {
      addHeader(doc, vehicle, true)
      currentY = 50
    }
  }
  return {
    get y() { return currentY },
    set y(val: number) { currentY = val },
    ensure: ensurePage,
  }
}

export function appendVehicleReport(
  doc: jsPDF,
  vehicle: Veiculo,
  reminders: Lembrete[],
  addPage = false,
  opts: VehicleReportOptions = {},
) {
  addHeader(doc, vehicle, addPage)

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const vehicleReminders = reminders.filter((r) => r.veiculoId === vehicle.id)

  const completed = vehicleReminders
    .filter((r) => r.concluido)
    .sort((a, b) => reminderTime(b) - reminderTime(a))

  const pending = vehicleReminders
    .filter((r) => !r.concluido)
    .sort((a, b) => (parseDateValue(a.dataLimite)?.getTime() ?? Infinity) - (parseDateValue(b.dataLimite)?.getTime() ?? Infinity))

  const today0 = new Date().setHours(0, 0, 0, 0)
  const overdueCount = pending.filter((r) => {
    const date = parseDateValue(r.dataLimite)
    return !!date && date.getTime() < today0
  }).length

  const totalYear = vehicleReminders
    .filter((r) => parseDateValue(r.dataLimite)?.getFullYear() === currentYear)
    .reduce((sum, r) => sum + (r.valor || 0), 0)

  const totalMonth = vehicleReminders
    .filter((r) => {
      const date = parseDateValue(r.dataLimite)
      return date?.getFullYear() === currentYear && date.getMonth() === currentMonth
    })
    .reduce((sum, r) => sum + (r.valor || 0), 0)

  const nextService = pending
    .map((r) => ({ r, date: parseDateValue(r.dataLimite) }))
    .filter(({ date }) => !!date && date.getTime() >= today0)
    .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0))[0]?.date

  const pg = makePageHelper(doc, vehicle)

  // ── Stats row ──
  pg.ensure(35)
  pg.y = addStatsRow(doc, pg.y, [
    {
      label: 'Saúde',
      value: overdueCount > 0 ? `${overdueCount} atrasado${overdueCount > 1 ? 's' : ''}` : 'Em dia',
      tone: overdueCount > 0 ? 'danger' : 'success',
    },
    { label: `Total ${currentYear}`, value: formatCurrency(totalYear), tone: 'neutral' },
    { label: 'Próx. serviço', value: nextService ? nextService.toLocaleDateString('pt-BR') : '—', tone: 'neutral' },
  ])

  // ── FIPE / Sale value ──
  if (opts.fipeValor && opts.sugerido !== undefined && opts.adjustPct !== undefined) {
    pg.ensure(55)
    pg.y = addSectionTitle(doc, 'Avaliação de Mercado', pg.y)
    pg.y = addFipeCard(doc, pg.y, opts.fipeValor, opts.sugerido, opts.adjustPct)
  }

  // ── Vehicle info ──
  pg.ensure(22)
  pg.y = addSectionTitle(doc, 'Identificação', pg.y)
  pg.y = addDetailRows(doc, pg.y, [
    ['Marca / Modelo', vehicleMakeModel(vehicle)],
    ['Tipo', getVeiculoLabel(vehicle.tipoVeiculo)],
    ['Cor', getCorNome(vehicle.cor) || '-'],
    ['KM atual', isBike(vehicle) && vehicle.semControleKm ? 'Sem controle' : formatKm(vehicle.kmAtual || 0)],
    ['Mantenedor', vehicle.proprietario || '-'],
    [`Gasto ${String(currentMonth + 1).padStart(2, '0')}/${currentYear}`, formatCurrency(totalMonth)],
  ])

  // ── Legal status ──
  pg.ensure(50)
  pg.y = addSectionTitle(doc, 'Situação Legal', pg.y)
  pg.y = addLegalStatus(doc, pg.y, vehicleReminders)

  // ── Completed records ──
  pg.ensure(30)
  pg.y = addSectionTitle(doc, 'Registros Concluídos', pg.y)
  pg.y = reportTable(
    doc, pg.y,
    ['Serviço', 'Tipo', 'Data', 'Valor'],
    completed.length
      ? completed.map((r) => [
          r.titulo || '-',
          getTipoLabel(r.tipo),
          formatReportDate(r.concluidoEm || r.dataLimite),
          r.valor > 0 ? formatCurrency(r.valor) : '-',
        ])
      : [['Nenhum registro concluído', '-', '-', '-']],
    [3],
  )

  // ── Pending alerts ──
  pg.ensure(30)
  pg.y = addSectionTitle(doc, 'Avisos Pendentes', pg.y)
  reportTable(
    doc, pg.y,
    ['Item', 'Tipo', 'Data Limite', 'KM'],
    pending.length
      ? pending.map((r) => [
          r.titulo || '-',
          getTipoLabel(r.tipo),
          formatReportDate(r.dataLimite),
          String(r.kmLimite || '-'),
        ])
      : [['Nenhum aviso pendente', '-', '-', '-']],
    [3],
  )
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function getVehicleReportBlob(vehicle: Veiculo, reminders: Lembrete[], opts: VehicleReportOptions = {}): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  appendVehicleReport(doc, vehicle, reminders, false, opts)
  addFooter(doc)
  return doc.output('blob')
}

export function saveVehicleReport(vehicle: Veiculo, reminders: Lembrete[], opts: VehicleReportOptions = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  appendVehicleReport(doc, vehicle, reminders, false, opts)
  addFooter(doc)
  doc.save(`relatorio_${safeName(vehicle.nome || 'veiculo')}_${new Date().toISOString().slice(0, 10)}.pdf`)
}

export function saveFleetReports(vehicles: Veiculo[], reminders: Lembrete[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  if (vehicles.length === 0) {
    doc.setFontSize(16)
    doc.text('Nenhum veiculo cadastrado.', 14, 20)
  } else {
    vehicles.forEach((vehicle, index) => appendVehicleReport(doc, vehicle, reminders, index > 0))
  }
  addFooter(doc)
  doc.save(`zellu_relatorios_frota_${new Date().toISOString().slice(0, 10)}.pdf`)
}

export async function saveFleetOverviewReport(params: {
  totalVehicles: number
  criticalCount: number
  attentionCount: number
  summary: string
  rows: FleetOverviewReportRow[]
}) {
  let logoDataUrl: string | null = null
  try {
    logoDataUrl = await imageUrlToDataUrl('/zellu-logo.png')
  } catch {
    logoDataUrl = null
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()

  doc.setFillColor(...C.navy)
  doc.rect(0, 0, pageW, 46, 'F')
  doc.setFillColor(8, 18, 34)
  doc.rect(pageW * 0.52, 0, pageW * 0.48, 46, 'F')
  doc.setFillColor(...C.blue)
  doc.rect(0, 0, pageW, 3, 'F')

  doc.setFillColor(15, 30, 55)
  doc.roundedRect(14, 10, 16, 16, 4, 4, 'F')
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', 16.5, 12.5, 11, 11)
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255)
    doc.text('Z', 22, 20.5, { align: 'center' })
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text('Zellu', 34, 20)
  doc.setFontSize(12)
  doc.text('Visao geral dos veiculos', 14, 33)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...C.headerText)
  doc.text('Relatorio consolidado da frota', 14, 40)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...C.headerText)
  doc.text(fullDate(), pageW - 14, 15, { align: 'right' })

  const statsY = 58
  const cardGap = 6
  const cardW = (pageW - 28 - cardGap * 2) / 3
  const stats = [
    ['Veiculos', String(params.totalVehicles), C.blue],
    ['Criticos', String(params.criticalCount), C.danger],
    ['Acompanhar', String(params.attentionCount), [217, 119, 6] as Rgb],
  ] as const

  stats.forEach(([label, value, color], index) => {
    const x = 14 + index * (cardW + cardGap)
    doc.setDrawColor(...color)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(x, statsY, cardW, 27, 3, 3, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(...C.body)
    doc.text(value, x + 6, statsY + 11)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...C.muted)
    doc.text(label, x + 6, statsY + 20)
  })

  const criticalRows = params.rows.filter((row) => row.vencidos > 0)
  let nextY = statsY + 40
  if (criticalRows.length > 0) {
    const alertLines = criticalRows.slice(0, 3).map((row) => `${row.nome}: ${row.vencidos} vencido(s), ${row.pendentes} pendente(s)`)
    const alertH = 18 + alertLines.length * 5
    doc.setFillColor(...C.dangerBg)
    doc.setDrawColor(...C.danger)
    doc.setLineWidth(0.45)
    doc.roundedRect(14, nextY, pageW - 28, alertH, 3, 3, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...C.danger)
    doc.text('ATENCAO IMEDIATA', 22, nextY + 9)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...C.body)
    doc.text(alertLines, 22, nextY + 16)
    nextY += alertH + 12
  }

  const summaryY = nextY
  const summaryLines = doc.splitTextToSize(params.summary, pageW - 40)
  const summaryH = Math.max(26, 16 + summaryLines.length * 5)
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(...C.divider)
  doc.roundedRect(14, summaryY, pageW - 28, summaryH, 3, 3, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...C.blue)
  doc.text('RESUMO INTELIGENTE', 22, summaryY + 10)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...C.body)
  doc.text(summaryLines, 22, summaryY + 18)

  const tableY = summaryY + summaryH + 16
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...C.navy)
  doc.text('VEICULOS', 14, tableY - 6)

  autoTable(doc, {
    startY: tableY,
    head: [['Veiculo', 'Prioridade', 'Saude', 'KM atual', 'Pend.', 'Venc.', 'Prox.', 'Proximo aviso']],
    body: params.rows.length
      ? params.rows.map((row) => [
          `${row.nome}\n${row.marcaModelo}`,
          row.prioridade,
          `${row.saude}/100`,
          row.kmAtual,
          String(row.pendentes),
          String(row.vencidos),
          String(row.proximos),
          row.proximoAviso,
        ])
      : [['Nenhum veiculo cadastrado', '-', '-', '-', '-', '-', '-', '-']],
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: { top: 3.2, right: 2.4, bottom: 3.2, left: 2.4 },
      textColor: C.body,
      valign: 'middle',
      minCellHeight: 12,
      lineColor: C.divider,
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: C.tableHead,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: C.rowOdd },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 25 },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 22 },
      4: { cellWidth: 13, halign: 'center' },
      5: { cellWidth: 13, halign: 'center' },
      6: { cellWidth: 13, halign: 'center' },
      7: { cellWidth: 'auto' },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return
      const row = params.rows[data.row.index]
      if (!row) return
      if (row.vencidos > 0) {
        data.cell.styles.fillColor = [254, 242, 242]
        if (data.column.index === 1 || data.column.index === 5) {
          data.cell.styles.textColor = C.danger
          data.cell.styles.fontStyle = 'bold'
        }
      } else if (row.proximos > 0) {
        data.cell.styles.fillColor = [255, 251, 235]
        if (data.column.index === 1 || data.column.index === 6) {
          data.cell.styles.textColor = [217, 119, 6]
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
    margin: { left: 14, right: 14 },
  })

  addFooter(doc)
  doc.save(`zellu_visao_geral_frota_${new Date().toISOString().slice(0, 10)}.pdf`)
}

export async function saveTireControlReport(params: {
  vehicle: Veiculo
  tires: RegistroPneu[]
  currentKm: number
}) {
  let logoDataUrl: string | null = null
  try {
    logoDataUrl = await imageUrlToDataUrl('/zellu-logo.png')
  } catch {
    logoDataUrl = null
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const activeTires = params.tires.filter((tire) => !tire.kmFinal)
  const history = params.tires.filter((tire) => !!tire.kmFinal)
  const tireWear = (tire: RegistroPneu) => tire.kmVidaUtil > 0
    ? Math.max(0, Math.min(100, ((params.currentKm - tire.kmInstalado) / tire.kmVidaUtil) * 100))
    : 0
  const critical = activeTires.filter((tire) => tireWear(tire) >= 80)
  const attention = activeTires.filter((tire) => {
    const wear = tireWear(tire)
    return wear >= 60 && wear < 80
  })
  const avgWear = activeTires.length > 0
    ? Math.round(activeTires.reduce((sum, tire) => sum + tireWear(tire), 0) / activeTires.length)
    : 0

  doc.setFillColor(...C.navy)
  doc.rect(0, 0, pageW, 46, 'F')
  doc.setFillColor(8, 18, 34)
  doc.rect(pageW * 0.52, 0, pageW * 0.48, 46, 'F')
  doc.setFillColor(...C.blue)
  doc.rect(0, 0, pageW, 3, 'F')

  doc.setFillColor(15, 30, 55)
  doc.roundedRect(14, 10, 16, 16, 4, 4, 'F')
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', 16.5, 12.5, 11, 11)
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255)
    doc.text('Z', 22, 20.5, { align: 'center' })
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text('Zellu', 34, 20)
  doc.setFontSize(12)
  doc.text('Controle de pneus', 14, 33)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...C.headerText)
  doc.text(`${params.vehicle.nome || 'Veiculo'} - ${vehicleMakeModel(params.vehicle)}`, 14, 40)
  doc.text(fullDate(), pageW - 14, 15, { align: 'right' })

  let y = 58
  const cardGap = 6
  const cardW = (pageW - 28 - cardGap * 2) / 3
  const stats = [
    ['Ativos', String(activeTires.length), C.blue],
    ['Criticos', String(critical.length), C.danger],
    ['Desgaste medio', `${avgWear}%`, [217, 119, 6] as Rgb],
  ] as const

  stats.forEach(([label, value, color], index) => {
    const x = 14 + index * (cardW + cardGap)
    doc.setDrawColor(...color)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(x, y, cardW, 27, 3, 3, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(...C.body)
    doc.text(value, x + 6, y + 11)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...C.muted)
    doc.text(label, x + 6, y + 20)
  })

  y += 40
  const summary = activeTires.length === 0
    ? 'Nenhum pneu ativo cadastrado para este veiculo.'
    : critical.length > 0
      ? `${critical.length} pneu${critical.length > 1 ? 's estao' : ' esta'} em estado critico. Priorize a troca ou revisao antes de rodar longas distancias.`
      : attention.length > 0
        ? `${attention.length} pneu${attention.length > 1 ? 's precisam' : ' precisa'} de acompanhamento. Programe a troca com antecedencia.`
        : 'Os pneus ativos estao dentro da faixa segura de uso pelos dados registrados.'

  if (critical.length > 0 || attention.length > 0) {
    const watchRows = [...critical, ...attention].slice(0, 4).map((tire) => {
      const pos = TIRE_POSITIONS[tire.posicao]
      return `${pos.label}: ${Math.round(tireWear(tire))}% de desgaste - ${Math.max(0, tire.kmInstalado + tire.kmVidaUtil - params.currentKm).toLocaleString('pt-BR')} km restantes`
    })
    const alertTone = critical.length > 0 ? C.danger : ([217, 119, 6] as Rgb)
    const alertBg: Rgb = critical.length > 0 ? C.dangerBg : [255, 251, 235]
    const alertH = 18 + watchRows.length * 5
    doc.setFillColor(...alertBg)
    doc.setDrawColor(...alertTone)
    doc.roundedRect(14, y, pageW - 28, alertH, 3, 3, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...alertTone)
    doc.text(critical.length > 0 ? 'ATENCAO IMEDIATA' : 'ACOMPANHAR', 22, y + 9)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...C.body)
    doc.text(watchRows, 22, y + 16)
    y += alertH + 12
  }

  const summaryLines = doc.splitTextToSize(summary, pageW - 40)
  const summaryH = Math.max(26, 16 + summaryLines.length * 5)
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(...C.divider)
  doc.roundedRect(14, y, pageW - 28, summaryH, 3, 3, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...C.blue)
  doc.text('RESUMO DOS PNEUS', 22, y + 10)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...C.body)
  doc.text(summaryLines, 22, y + 18)

  y += summaryH + 16
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...C.navy)
  doc.text('PNEUS ATIVOS', 14, y - 6)

  autoTable(doc, {
    startY: y,
    head: [['Posicao', 'Pneu', 'Instalado', 'Vida util', 'Restante', 'Desgaste', 'Custo']],
    body: activeTires.length
      ? activeTires.map((tire) => {
          const remaining = Math.max(0, tire.kmInstalado + tire.kmVidaUtil - params.currentKm)
          return [
            TIRE_POSITIONS[tire.posicao].label,
            `${tire.marca} ${tire.modelo}`.trim() || '-',
            `${tire.kmInstalado.toLocaleString('pt-BR')} km`,
            `${tire.kmVidaUtil.toLocaleString('pt-BR')} km`,
            `${remaining.toLocaleString('pt-BR')} km`,
            `${Math.round(tireWear(tire))}%`,
            tire.custo ? formatCurrency(tire.custo) : '-',
          ]
        })
      : [['Nenhum pneu ativo', '-', '-', '-', '-', '-', '-']],
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: { top: 3.2, right: 2.4, bottom: 3.2, left: 2.4 },
      textColor: C.body,
      valign: 'middle',
      minCellHeight: 12,
      lineColor: C.divider,
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: C.tableHead,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: C.rowOdd },
    columnStyles: {
      0: { cellWidth: 31 },
      1: { cellWidth: 34 },
      2: { cellWidth: 24 },
      3: { cellWidth: 24 },
      4: { cellWidth: 24 },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 'auto' },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return
      const tire = activeTires[data.row.index]
      if (!tire) return
      const wear = tireWear(tire)
      if (wear >= 80) {
        data.cell.styles.fillColor = [254, 242, 242]
        if (data.column.index === 0 || data.column.index === 5) {
          data.cell.styles.textColor = C.danger
          data.cell.styles.fontStyle = 'bold'
        }
      } else if (wear >= 60) {
        data.cell.styles.fillColor = [255, 251, 235]
        if (data.column.index === 0 || data.column.index === 5) {
          data.cell.styles.textColor = [217, 119, 6]
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
    margin: { left: 14, right: 14 },
  })

  const tableEndY = (doc as any).lastAutoTable?.finalY ?? y
  if (history.length > 0) {
    autoTable(doc, {
      startY: tableEndY + 16,
      head: [['Historico', 'Durabilidade', 'KM retirada', 'Custo/km', 'Data']],
      body: history.map((tire) => {
        const durability = Math.max(0, (tire.kmFinal ?? tire.kmInstalado) - tire.kmInstalado)
        const costKm = tire.custo && durability > 0 ? tire.custo / durability : null
        return [
          `${TIRE_POSITIONS[tire.posicao].label}\n${tire.marca} ${tire.modelo}`.trim(),
          `${durability.toLocaleString('pt-BR')} km`,
          `${(tire.kmFinal ?? 0).toLocaleString('pt-BR')} km`,
          costKm ? `${formatCurrency(costKm)}/km` : '-',
          formatReportDate(tire.dataRemocao || tire.dataInstalacao),
        ]
      }),
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: { top: 3, right: 2.4, bottom: 3, left: 2.4 },
        textColor: C.body,
        lineColor: C.divider,
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: C.tableHead,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: C.rowOdd },
      margin: { left: 14, right: 14 },
    })
  }

  addFooter(doc)
  doc.save(`zellu_pneus_${safeName(params.vehicle.nome || 'veiculo')}_${new Date().toISOString().slice(0, 10)}.pdf`)
}

export async function saveTravelReport(params: {
  trips: RegistroViagem[]
  vehicles: Veiculo[]
}) {
  let logoDataUrl: string | null = null
  try {
    logoDataUrl = await imageUrlToDataUrl('/zellu-logo.png')
  } catch {
    logoDataUrl = null
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const totalCost = params.trips.reduce((sum, trip) => sum + (trip.gastos ?? []).reduce((s, gasto) => s + gasto.valor, 0), 0)
  const totalDistance = params.trips.reduce((sum, trip) => sum + (trip.distanciaKm || 0), 0)
  const openTrips = params.trips.filter((trip) => !trip.finalizada).length

  function addTravelHeader() {
    doc.setFillColor(...C.navy)
    doc.rect(0, 0, pageW, 46, 'F')
    doc.setFillColor(8, 18, 34)
    doc.rect(pageW * 0.52, 0, pageW * 0.48, 46, 'F')
    doc.setFillColor(...C.blue)
    doc.rect(0, 0, pageW, 3, 'F')

    doc.setFillColor(15, 30, 55)
    doc.roundedRect(14, 10, 16, 16, 4, 4, 'F')
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', 16.5, 12.5, 11, 11)
    } else {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(255, 255, 255)
      doc.text('Z', 22, 20.5, { align: 'center' })
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(255, 255, 255)
    doc.text('Zellu', 34, 20)
    doc.setFontSize(12)
    doc.text('Diario de viagens', 14, 33)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...C.headerText)
    doc.text('Relatorio de viagens, gastos e notas anexadas', 14, 40)
    doc.text(fullDate(), pageW - 14, 15, { align: 'right' })
  }

  function ensureSpace(y: number, needed: number) {
    if (y + needed <= pageH - 22) return y
    doc.addPage()
    return 18
  }

  function imageFormat(dataUrl: string) {
    if (dataUrl.startsWith('data:image/png')) return 'PNG'
    if (dataUrl.startsWith('data:image/webp')) return 'WEBP'
    return 'JPEG'
  }

  addTravelHeader()

  let y = 58
  const cardGap = 6
  const cardW = (pageW - 28 - cardGap * 2) / 3
  const stats = [
    ['Viagens', String(params.trips.length), C.blue],
    ['Em andamento', String(openTrips), [217, 119, 6] as Rgb],
    ['Custo total', formatCurrency(totalCost), C.success],
  ] as const

  stats.forEach(([label, value, color], index) => {
    const x = 14 + index * (cardW + cardGap)
    doc.setDrawColor(...color)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(x, y, cardW, 27, 3, 3, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(index === 2 ? 11 : 15)
    doc.setTextColor(...C.body)
    doc.text(value, x + 6, y + 11)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...C.muted)
    doc.text(label, x + 6, y + 20)
  })

  y += 40
  const summary = params.trips.length === 0
    ? 'Nenhuma viagem cadastrada.'
    : `${params.trips.length} viagem${params.trips.length !== 1 ? 's' : ''} registradas, ${totalDistance.toLocaleString('pt-BR')} km planejados/rodados e ${formatCurrency(totalCost)} em gastos.`
  const summaryLines = doc.splitTextToSize(summary, pageW - 40)
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(...C.divider)
  doc.roundedRect(14, y, pageW - 28, 28, 3, 3, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...C.blue)
  doc.text('RESUMO', 22, y + 10)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...C.body)
  doc.text(summaryLines, 22, y + 18)

  y += 44
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...C.navy)
  doc.text('VIAGENS', 14, y - 6)

  y += 2
  if (params.trips.length === 0) {
    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(...C.divider)
    doc.roundedRect(14, y, pageW - 28, 22, 3, 3, 'FD')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...C.muted)
    doc.text('Nenhuma viagem cadastrada.', 22, y + 13)
    y += 34
  } else {
    for (const trip of params.trips) {
      const vehicle = params.vehicles.find((v) => v.id === trip.veiculoId)
      const cost = (trip.gastos ?? []).reduce((sum, gasto) => sum + gasto.valor, 0)
      const period = `${formatReportDate(trip.dataInicio || trip.data)}${trip.dataFim ? ` ate ${formatReportDate(trip.dataFim)}` : ''}`
      const statusTone: Rgb = trip.finalizada ? C.success : [217, 119, 6]
      const statusBg: Rgb = trip.finalizada ? C.successBg : [255, 251, 235]

      y = ensureSpace(y, 49)
      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(...(trip.finalizada ? C.divider : statusTone))
      doc.setLineWidth(trip.finalizada ? 0.3 : 0.55)
      doc.roundedRect(14, y, pageW - 28, 43, 3, 3, 'FD')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...C.navy)
      doc.text(doc.splitTextToSize(trip.nome || `${trip.origem} para ${trip.destino}`, 110), 22, y + 9)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...C.muted)
      doc.text(doc.splitTextToSize(`${trip.origem} -> ${trip.destino}`, 112), 22, y + 16)

      doc.setFillColor(...statusBg)
      doc.setDrawColor(...statusTone)
      doc.roundedRect(pageW - 57, y + 6, 35, 9, 2.5, 2.5, 'FD')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(...statusTone)
      doc.text(trip.finalizada ? 'Finalizada' : 'Em andamento', pageW - 39.5, y + 12, { align: 'center' })

      const details = [
        ['Periodo', period],
        ['Veiculo', vehicle ? `${vehicle.nome} - ${vehicle.modelo}` : 'Veiculo removido'],
        ['Distancia', trip.distanciaKm ? `${trip.distanciaKm.toLocaleString('pt-BR')} km` : '-'],
        ['Responsavel', trip.responsavel || '-'],
        ['Gastos', formatCurrency(cost)],
      ]
      const colW = (pageW - 44) / 5
      details.forEach(([label, value], index) => {
        const x = 22 + index * colW
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(6.7)
        doc.setTextColor(...C.blue)
        doc.text(label.toUpperCase(), x, y + 27)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.3)
        doc.setTextColor(index === 4 ? C.success[0] : C.body[0], index === 4 ? C.success[1] : C.body[1], index === 4 ? C.success[2] : C.body[2])
        doc.text(doc.splitTextToSize(value, colW - 4), x, y + 34)
      })

      y += 51
    }
  }

  for (const trip of params.trips) {
    const expenses = trip.gastos ?? []
    if (expenses.length === 0) continue
    y = ensureSpace(y, 32)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...C.navy)
    doc.text(`GASTOS - ${trip.nome || `${trip.origem} para ${trip.destino}`}`.toUpperCase(), 14, y)

    autoTable(doc, {
      startY: y + 5,
      head: [['Categoria', 'Descricao', 'Valor', 'Nota']],
      body: expenses.map((gasto) => [
        TRAVEL_EXPENSE_LABELS[gasto.categoria] ?? gasto.categoria,
        gasto.descricao || '-',
        formatCurrency(gasto.valor),
        gasto.notaImagem ? 'Anexada' : '-',
      ]),
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: { top: 3, right: 2.4, bottom: 3, left: 2.4 },
        textColor: C.body,
        lineColor: C.divider,
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: C.tableHead,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: C.rowOdd },
      margin: { left: 14, right: 14 },
    })

    y = ((doc as any).lastAutoTable?.finalY ?? y) + 10
    const receipts = expenses.filter((gasto): gasto is GastoViagem & { notaImagem: string } => Boolean(gasto.notaImagem))
    if (receipts.length === 0) continue

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...C.blue)
    y = ensureSpace(y, 12)
    doc.text('NOTAS ANEXADAS', 14, y)
    y += 6

    for (const gasto of receipts) {
      y = ensureSpace(y, 72)
      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(...C.divider)
      doc.roundedRect(14, y, pageW - 28, 64, 3, 3, 'FD')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(...C.navy)
      doc.text(`${TRAVEL_EXPENSE_LABELS[gasto.categoria] ?? gasto.categoria} - ${formatCurrency(gasto.valor)}`, 20, y + 8)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...C.muted)
      doc.text(doc.splitTextToSize(gasto.descricao || 'Sem descricao', pageW - 92), 20, y + 14)
      try {
        doc.addImage(gasto.notaImagem, imageFormat(gasto.notaImagem), pageW - 76, y + 8, 56, 48)
      } catch {
        doc.setTextColor(...C.danger)
        doc.text('Imagem da nota indisponivel no PDF.', pageW - 76, y + 30)
      }
      y += 72
    }
  }

  addFooter(doc)
  doc.save(`zellu_viagens_${new Date().toISOString().slice(0, 10)}.pdf`)
}
