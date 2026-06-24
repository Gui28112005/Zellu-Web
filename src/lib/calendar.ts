import type { Lembrete } from '@/lib/types'

function buildICS(lembrete: Lembrete, veiculoNome: string, start: Date, end: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
  const stamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'

  const desc = [
    `Veículo: ${veiculoNome}`,
    lembrete.peca ? `Peça: ${lembrete.peca}` : '',
    lembrete.kmLimite ? `KM: ${lembrete.kmLimite}` : '',
    lembrete.valor ? `Valor: R$ ${Number(lembrete.valor).toFixed(2)}` : '',
    lembrete.estabelecimentoNome ? `Local: ${lembrete.estabelecimentoNome}` : '',
  ].filter(Boolean).join('\\n')

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Zellu//Zellu App//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:zellu-${lembrete.id}@zellu.app`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:🔧 ${lembrete.titulo} · ${veiculoNome}`,
    `DESCRIPTION:${desc}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    `DESCRIPTION:Lembrete Zellu: ${lembrete.titulo}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function isDesktopBrowser(): boolean {
  const ua = navigator.userAgent
  return !/android|iphone|ipad|ipod/i.test(ua)
}

export function openDeviceCalendar(
  lembrete: Lembrete,
  veiculoNome: string,
  preOpenedWin?: Window | null,
): void {
  if (!lembrete.dataLimite) return
  const [dd, mm, yyyy] = lembrete.dataLimite.split('/').map(Number)
  if (!dd || !mm || !yyyy) return

  const [hh, min] = (lembrete.horaAviso ?? '08:00').split(':').map(Number)
  const start = new Date(yyyy, mm - 1, dd, hh, min, 0)
  const end   = new Date(yyyy, mm - 1, dd, Math.min(hh + 1, 23), min, 0)

  const title = `🔧 ${lembrete.titulo} · ${veiculoNome}`
  const desc  = [
    `Veículo: ${veiculoNome}`,
    lembrete.peca               ? `Peça: ${lembrete.peca}` : '',
    lembrete.kmLimite           ? `KM limite: ${lembrete.kmLimite}` : '',
    lembrete.valor              ? `Valor estimado: R$ ${Number(lembrete.valor).toFixed(2)}` : '',
    lembrete.estabelecimentoNome ? `Local: ${lembrete.estabelecimentoNome}` : '',
    '',
    '✅ Conclua este aviso no Zellu após realizar a manutenção.',
    '🚗 Zellu — Gestão veicular inteligente',
  ].filter((l, i) => i < 5 ? l !== '' : true).join('\n')

  const ua        = navigator.userAgent
  const isAndroid = /android/i.test(ua)
  const isIOS     = /iphone|ipad|ipod/i.test(ua)

  const pad2 = (n: number) => String(n).padStart(2, '0')
  const fmtGcal = (d: Date) =>
    `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}T${pad2(d.getHours())}${pad2(d.getMinutes())}00`
  const gcalUrl =
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${fmtGcal(start)}/${fmtGcal(end)}` +
    `&details=${encodeURIComponent(desc)}`

  if (isAndroid) {
    // Intent URI — abre app de agenda nativo sem baixar nada
    const intent =
      `intent:#Intent;` +
      `action=android.intent.action.INSERT;` +
      `type=vnd.android.cursor.item%2Fevent;` +
      `S.title=${encodeURIComponent(title)};` +
      `S.description=${encodeURIComponent(desc)};` +
      `l.beginTime=${start.getTime()};` +
      `l.endTime=${end.getTime()};` +
      `end`
    window.location.href = intent
    return
  }

  // iOS Safari: data: URI abre o app Agenda nativamente sem baixar.
  // Chrome/Firefox no iOS e qualquer desktop: usa Google Calendar (sem download).
  const isIOSSafari = isIOS && /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua)
  if (isIOSSafari) {
    const ics = buildICS(lembrete, veiculoNome, start, end)
    window.location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics)
    return
  }

  // Todos os outros casos (desktop, Chrome iOS, Firefox): Google Calendar na nova aba.
  // preOpenedWin é aberto ANTES do await no ReminderFormSheet para não ser bloqueado.
  if (preOpenedWin) {
    preOpenedWin.location.href = gcalUrl
  } else {
    window.open(gcalUrl, '_blank')
  }
}
