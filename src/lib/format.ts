const TZ = 'America/Sao_Paulo'

export const money = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** R$ 50 em vez de R$ 50,00 quando não tem centavos. */
export const moneyShort = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: cents % 100 ? 2 : 0,
  })

export const priceLabel = (cents: number, type: 'fixed' | 'from') =>
  type === 'from' ? `a partir de ${moneyShort(cents)}` : moneyShort(cents)

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

export const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

export const durationLabel = (min: number) => {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

/** Entrada livre -> E.164 brasileiro. Devolve null se inválido. */
export const normalizePhone = (raw: string): string | null => {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('55') && digits.length >= 12) digits = digits.slice(2)
  if (digits.length !== 10 && digits.length !== 11) return null
  return `+55${digits}`
}

/** Máscara progressiva do input: (44) 99999-9999 */
export const maskPhone = (raw: string) => {
  const d = raw.replace(/\D/g, '').replace(/^55(?=\d{10,})/, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  const rest = d.slice(2)
  const cut = d.length > 10 ? 5 : 4
  return rest.length <= cut ? `(${d.slice(0, 2)}) ${rest}` : `(${d.slice(0, 2)}) ${rest.slice(0, cut)}-${rest.slice(cut)}`
}

export const prettyPhone = (e164: string) => {
  const d = e164.replace(/\D/g, '').replace(/^55/, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return e164
}

/** Máscara de dinheiro no input: digita 5000 -> 50,00 */
export const maskMoney = (raw: string) => {
  const d = raw.replace(/\D/g, '').slice(0, 9)
  if (!d) return ''
  const cents = parseInt(d, 10)
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export const centsFromMask = (masked: string) => {
  const d = masked.replace(/\D/g, '')
  return d ? parseInt(d, 10) : 0
}

export const centsToMask = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const waLink = (e164: string, text?: string) =>
  `https://wa.me/${e164.replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`

export const weekdayLong = (date: string) =>
  new Date(`${date}T12:00:00-03:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone: TZ,
  })

/** terça-feira */
export const weekdayName = (date: string) =>
  new Date(`${date}T12:00:00-03:00`).toLocaleDateString('pt-BR', { weekday: 'long', timeZone: TZ })

/** 21/10 */
export const dayMonth = (date: string) => `${date.slice(8)}/${date.slice(5, 7)}`

/** out, nov */
export const monthShort = (date: string) =>
  new Date(`${date}T12:00:00-03:00`)
    .toLocaleDateString('pt-BR', { month: 'short', timeZone: TZ })
    .replace('.', '')
