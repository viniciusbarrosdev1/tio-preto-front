const TZ = 'America/Sao_Paulo'

export const money = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const priceLabel = (cents: number, type: 'fixed' | 'from') =>
  type === 'from' ? `a partir de ${money(cents)}` : money(cents)

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: TZ,
  })

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })

export const fmtDateTime = (iso: string) => `${fmtDate(iso)} às ${fmtTime(iso)}`

/** YYYY-MM-DD no fuso de São Paulo */
export const dateKey = (d: Date | string) =>
  new Date(d).toLocaleDateString('en-CA', { timeZone: TZ })

/** Monta ISO com fuso -03:00 (Brasil sem horário de verão). */
export const toSP = (date: string, time: string) => `${date}T${time}:00-03:00`

export const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00-03:00`)
  d.setDate(d.getDate() + n)
  return dateKey(d)
}

export const todayKey = () => dateKey(new Date())

/** Entrada livre -> E.164 brasileiro. Devolve null se inválido. */
export const normalizePhone = (raw: string): string | null => {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('55') && digits.length >= 12) digits = digits.slice(2)
  if (digits.length !== 10 && digits.length !== 11) return null
  return `+55${digits}`
}

export const prettyPhone = (e164: string) => {
  const d = e164.replace(/\D/g, '').replace(/^55/, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return e164
}

export const waLink = (e164: string, text?: string) =>
  `https://wa.me/${e164.replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`

export const weekdayLong = (date: string) =>
  new Date(`${date}T12:00:00-03:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone: TZ,
  })
