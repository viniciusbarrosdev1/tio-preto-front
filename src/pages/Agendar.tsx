import { ArrowLeft, Check } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Btn, Card, Field, Input, useToast } from '@/components/ui'
import { api, bookableDates, hoursFor } from '@/lib/api'
import { fmtTime, normalizePhone, priceLabel, weekdayLong } from '@/lib/format'
import { useAppState } from '@/lib/store'
import { ApiError, type Slot } from '@/lib/types'

export default function Agendar() {
  const { menu, settings } = useAppState()
  const items = menu.filter((m) => m.visible)
  const nav = useNavigate()
  const toast = useToast()

  const [itemId, setItemId] = useState(items[0]?.id ?? '')
  const dates = useMemo(() => bookableDates().filter((d) => hoursFor(d, settings).length > 0), [settings])
  const [date, setDate] = useState(dates[0] ?? '')
  const [slots, setSlots] = useState<Slot[]>([])
  const [startAt, setStartAt] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const [honeypot, setHoneypot] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [blocked, setBlocked] = useState('')

  useEffect(() => {
    if (!date || !itemId) return
    let alive = true
    api.slots(date, itemId).then((s) => alive && setSlots(s))
    return () => {
      alive = false
    }
  }, [date, itemId, menu, settings])

  useEffect(() => setStartAt(''), [date, itemId])

  const item = items.find((i) => i.id === itemId)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!startAt) errs.slot = 'Escolha um horário.'
    if (name.trim().length < 2) errs.name = 'Informe seu nome.'
    if (!normalizePhone(phone)) errs.phone = 'Informe um WhatsApp válido com DDD.'
    if (!consent) errs.consent = 'Você precisa aceitar para enviar o pedido.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      const r = await api.createRequest({ clientName: name, phone, itemId, startAt, consent, honeypot })
      nav(`/pedido/${r.token}?novo=1`)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'REQUEST_NOT_ACCEPTED') setBlocked(err.message)
        else if (err.code === 'SLOT_UNAVAILABLE') {
          toast(err.message, 'error')
          setStartAt('')
          api.slots(date, itemId).then(setSlots)
        } else toast(err.message, 'error')
      }
    } finally {
      setBusy(false)
    }
  }

  if (blocked)
    return (
      <Shell>
        <Card>
          <p>{blocked}</p>
        </Card>
      </Shell>
    )

  return (
    <Shell>
      <form onSubmit={submit} className="space-y-8 pb-4" noValidate>
        <section>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.3em] text-gold">1. Serviço</h2>
          <div className="space-y-2">
            {items.map((i) => (
              <label
                key={i.id}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3.5 ${itemId === i.id ? 'border-gold bg-gold/10' : 'border-line'}`}
              >
                <input type="radio" name="item" checked={itemId === i.id} onChange={() => setItemId(i.id)} className="sr-only" />
                <span className="font-display text-xl font-bold uppercase">{i.name}</span>
                <span className="text-sm text-gold">{priceLabel(i.priceCents, i.priceType)}</span>
              </label>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.3em] text-gold">2. Dia e horário</h2>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2" role="radiogroup" aria-label="Dia">
            {dates.map((d) => {
              const dt = new Date(`${d}T12:00:00-03:00`)
              return (
                <button
                  type="button"
                  key={d}
                  role="radio"
                  aria-checked={date === d}
                  onClick={() => setDate(d)}
                  className={`flex min-w-16 shrink-0 cursor-pointer flex-col items-center rounded-lg border px-3 py-2 ${date === d ? 'border-gold bg-gold text-ink' : 'border-line'}`}
                >
                  <span className="text-xs uppercase">{dt.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'America/Sao_Paulo' }).replace('.', '')}</span>
                  <span className="font-display text-2xl font-bold">{dt.toLocaleDateString('pt-BR', { day: '2-digit', timeZone: 'America/Sao_Paulo' })}</span>
                </button>
              )
            })}
          </div>
          {date && <p className="mt-3 text-sm first-letter:uppercase text-mute">{weekdayLong(date)}</p>}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {slots.map((s) => (
              <button
                type="button"
                key={s.startAt}
                disabled={!s.available}
                aria-pressed={startAt === s.startAt}
                onClick={() => setStartAt(s.startAt)}
                className={`min-h-12 cursor-pointer rounded-lg border font-display text-lg font-bold disabled:cursor-not-allowed disabled:opacity-30 disabled:line-through ${startAt === s.startAt ? 'border-gold bg-gold text-ink' : 'border-line hover:border-gold'}`}
              >
                {fmtTime(s.startAt)}
              </button>
            ))}
          </div>
          {slots.length > 0 && slots.every((s) => !s.available) && (
            <p className="mt-3 text-sm text-mute">Sem horários livres nesse dia. Tente outro dia.</p>
          )}
          {errors.slot && <p role="alert" className="mt-2 text-sm text-danger">{errors.slot}</p>}
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-gold">3. Seus dados</h2>
          <Field label="Nome" error={errors.name}>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Seu nome" />
          </Field>
          <Field label="WhatsApp" error={errors.phone} hint="Com DDD. É por ele que o Tio Preto confirma.">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="(44) 99999-9999" />
          </Field>
          <div aria-hidden className="absolute -left-[9999px]">
            <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} name="site" />
          </div>
          <Card className="text-sm text-sand/90">
            <p className="font-semibold text-gold">Regra de falta</p>
            <p className="mt-1">{settings.absenceRule}</p>
          </Card>
          <div>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-5 w-5 accent-[#d4a94f]" />
              <span>{settings.consentText}</span>
            </label>
            {errors.consent && <p role="alert" className="mt-1 text-sm text-danger">{errors.consent}</p>}
          </div>
        </section>

        <div className="sticky bottom-0 -mx-5 border-t border-line bg-ink/95 px-5 py-3 backdrop-blur">
          <Btn type="submit" disabled={busy} className="w-full">
            {busy ? 'Enviando...' : <><Check className="h-5 w-5" aria-hidden /> Enviar pedido{item ? ` · ${item.name}` : ''}</>}
          </Btn>
          <p className="mt-2 text-center text-xs text-mute">O horário só é seu depois que o Tio Preto confirmar.</p>
        </div>
      </form>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-md px-5 pb-6 pt-6">
      <Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm text-mute hover:text-gold">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Cardápio
      </Link>
      <h1 className="mb-6 font-display text-4xl font-extrabold uppercase text-sand">Pedir horário</h1>
      {children}
    </div>
  )
}
