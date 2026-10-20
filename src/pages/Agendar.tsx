import { AlertTriangle, ArrowLeft, Check, Clock, MessageCircle, Scissors } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Btn, Card, Field, Input, LinkBtn, PhoneInput, SectionTitle, Spinner, cx, spring, useToast } from '@/components/ui'
import { absenceRuleText, api, durationFor, openDates, priceOf } from '@/lib/api'
import { dayMonth, durationLabel, fmtTime, moneyShort, monthShort, normalizePhone, waLink, weekdayName } from '@/lib/format'
import { useAppState } from '@/lib/store'
import { ApiError, GROUP_LABEL, type MenuItem, type ServiceGroup, type Slot } from '@/lib/types'

const ORDER: ServiceGroup[] = ['cabelo', 'barba', 'sobrancelha', 'outro']

export default function Agendar() {
  const { menu, settings } = useAppState()
  const nav = useNavigate()
  const toast = useToast()

  const servicos = useMemo(() => menu.filter((m) => m.visible && m.kind === 'servico'), [menu])
  const groups = useMemo(() => {
    const byGroup = new Map<ServiceGroup, MenuItem[]>()
    for (const m of servicos) {
      const g = m.group ?? 'outro'
      byGroup.set(g, [...(byGroup.get(g) ?? []), m])
    }
    return ORDER.filter((g) => byGroup.has(g)).map((g) => ({ group: g, items: byGroup.get(g)! }))
  }, [servicos])

  const [picked, setPicked] = useState<Record<string, string[]>>({})
  const itemIds = useMemo(() => Object.values(picked).flat(), [picked])

  const dates = useMemo(() => openDates(settings), [settings])
  const [date, setDate] = useState(dates[0] ?? '')
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [startAt, setStartAt] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const [honeypot, setHoneypot] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [blocked, setBlocked] = useState('')

  const key = itemIds.join(',')
  const duration = durationFor(itemIds, settings)
  const total = priceOf(itemIds)
  const usedSlots = duration ? Math.ceil(duration / settings.slotMinutes) : 0

  useEffect(() => {
    if (!date || !key) {
      setSlots([])
      return
    }
    let alive = true
    setLoadingSlots(true)
    api.slots(date, key.split(',')).then((s) => {
      if (!alive) return
      setSlots(s)
      setLoadingSlots(false)
    })
    return () => {
      alive = false
    }
  }, [date, key, menu, settings])

  useEffect(() => setStartAt(''), [date, key])

  /** Um por grupo. Clicou no que já estava escolhido, desmarca. */
  const toggle = (g: ServiceGroup, id: string) =>
    setPicked((p) => {
      const cur = p[g] ?? []
      if (g === 'outro') return { ...p, outro: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] }
      return { ...p, [g]: cur.includes(id) ? [] : [id] }
    })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!itemIds.length) errs.itemIds = 'Escolha pelo menos um serviço.'
    if (!startAt) errs.slot = 'Escolha um horário.'
    if (name.trim().length < 2) errs.name = 'Informe seu nome.'
    if (!normalizePhone(phone)) errs.phone = 'Informe um WhatsApp válido com DDD.'
    if (!consent) errs.consent = 'Você precisa aceitar para enviar o pedido.'
    setErrors(errs)
    if (Object.keys(errs).length) {
      toast('Falta pouco: confira os campos em vermelho.', 'error')
      return
    }
    setBusy(true)
    try {
      const r = await api.createRequest({ clientName: name, phone, itemIds, startAt, consent, honeypot })
      nav(`/pedido/${r.token}?novo=1`)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'REQUEST_NOT_ACCEPTED') setBlocked(err.message)
        else if (err.code === 'SLOT_UNAVAILABLE') {
          toast(err.message, 'error')
          setStartAt('')
          api.slots(date, itemIds).then(setSlots)
        } else toast(err.message, 'error')
      }
    } finally {
      setBusy(false)
    }
  }

  if (blocked)
    return (
      <Shell>
        <Card className="space-y-4">
          <p className="flex items-center gap-2 font-display text-xl font-bold uppercase text-gold">
            <AlertTriangle className="h-5 w-5" aria-hidden /> Vamos resolver no WhatsApp
          </p>
          <p className="text-sm">{blocked}</p>
          <LinkBtn
            variant="gold"
            className="w-full"
            href={waLink(
              settings.whatsapp,
              `Olá, tentei agendar horário${itemIds.length ? ` de ${itemIds.map((id) => menu.find((m) => m.id === id)?.name).filter(Boolean).join(' + ')}` : ''}${startAt ? ` para ${weekdayName(date)}, ${dayMonth(date)} às ${fmtTime(startAt)}` : ''}, porém ocorreu um erro.`,
            )}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle className="h-5 w-5" aria-hidden /> Falar com a gente no WhatsApp
          </LinkBtn>
          <Link to="/" className="block text-center text-sm text-mute underline-offset-2 hover:text-gold hover:underline">
            Voltar para o início
          </Link>
        </Card>
      </Shell>
    )

  return (
    <Shell>
      <form onSubmit={submit} className="space-y-9 pb-4" noValidate>
        <section>
          <SectionTitle>1. Serviços</SectionTitle>
          <div className="mt-4 space-y-5">
            {groups.map(({ group, items }) => (
              <div key={group}>
                <p className="mb-2 flex items-baseline justify-between gap-2">
                  <span className="font-display text-lg font-bold uppercase tracking-wide text-sand">{GROUP_LABEL[group]}</span>
                  <span className="text-xs text-mute">{group === 'outro' ? 'o que quiser' : items.length > 1 ? 'escolha um' : 'opcional'}</span>
                </p>
                <div className="space-y-2">
                  {items.map((i) => {
                    const on = (picked[group] ?? []).includes(i.id)
                    return (
                      <motion.label
                        key={i.id}
                        whileTap={{ scale: 0.985 }}
                        transition={spring}
                        className={cx(
                          'flex cursor-pointer items-center gap-3 rounded-xl border p-3.5',
                          on ? 'border-gold bg-gold/10' : 'border-line bg-coal/30 hover:border-gold/40',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggle(group, i.id)}
                          className="sr-only"
                        />
                        <span
                          aria-hidden
                          className={cx(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                            on ? 'border-gold bg-gold text-ink' : 'border-line text-transparent',
                          )}
                        >
                          <Check className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-display text-xl font-bold uppercase leading-tight">{i.name}</span>
                          <span className="block text-xs text-mute">{durationLabel(i.durationMinutes)}</span>
                        </span>
                        <span className="shrink-0 text-right text-sm font-semibold text-gold">
                          {i.priceType === 'from' && <span className="block text-[10px] uppercase text-gold-dim">a partir de</span>}
                          {moneyShort(i.priceCents)}
                        </span>
                      </motion.label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          {errors.itemIds && <p role="alert" className="mt-3 text-sm text-danger">{errors.itemIds}</p>}
          <AnimatePresence>
            {duration > 0 && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 flex items-center gap-2 overflow-hidden text-sm text-mute"
              >
                <Clock className="h-4 w-4 shrink-0 text-gold" aria-hidden />
                <span>
                  Atendimento de <b className="text-sand">{durationLabel(duration)}</b> — ocupa {usedSlots} horário
                  {usedSlots > 1 ? 's' : ''} na agenda.
                </span>
              </motion.p>
            )}
          </AnimatePresence>
        </section>

        <section>
          <SectionTitle>2. Dia</SectionTitle>
          <div className="strip -mx-5 px-5" role="radiogroup" aria-label="Dia">
            {dates.map((d) => {
              const on = date === d
              return (
                <motion.button
                  type="button"
                  key={d}
                  role="radio"
                  aria-checked={on}
                  whileTap={{ scale: 0.95 }}
                  transition={spring}
                  onClick={() => setDate(d)}
                  className={cx(
                    'flex min-w-17 shrink-0 cursor-pointer flex-col items-center rounded-xl border px-3 py-2.5',
                    on ? 'border-gold bg-gold text-ink' : 'border-line bg-coal/30 hover:border-gold/50',
                  )}
                >
                  <span className="text-[11px] font-semibold uppercase">{weekdayName(d).slice(0, 3)}</span>
                  <span className="font-display text-2xl font-bold leading-tight">{d.slice(8)}</span>
                  <span className={cx('text-[10px] uppercase', on ? 'text-ink/70' : 'text-mute')}>{monthShort(d)}</span>
                </motion.button>
              )
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-coal/30 p-4">
          <SectionTitle>3. Horário</SectionTitle>
          <p className="mb-3 text-sm first-letter:uppercase text-sand/80">
            {date ? `${weekdayName(date)}, ${dayMonth(date)}` : 'Escolha o dia acima'}
          </p>
          {!itemIds.length ? (
            <p className="py-4 text-sm text-mute">Escolha o serviço para ver os horários livres.</p>
          ) : loadingSlots ? (
            <div className="flex items-center gap-2 py-4 text-sm text-mute">
              <Spinner /> Buscando horários...
            </div>
          ) : slots.length === 0 ? (
            <p className="py-4 text-sm text-mute">Nesse dia não cabe esse atendimento. Tente outro dia.</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((s) => {
                  const on = startAt === s.startAt
                  return (
                    <motion.button
                      type="button"
                      key={s.startAt}
                      disabled={!s.available}
                      aria-pressed={on}
                      whileTap={{ scale: 0.94 }}
                      transition={spring}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => setStartAt(s.startAt)}
                      className={cx(
                        'relative min-h-12 cursor-pointer rounded-xl border font-display text-lg font-bold disabled:cursor-not-allowed disabled:border-line/60 disabled:bg-coal/20 disabled:text-mute/40 disabled:line-through',
                        on ? 'border-gold bg-gold text-ink' : 'border-line bg-coal/40 hover:border-gold',
                      )}
                    >
                      {fmtTime(s.startAt)}
                    </motion.button>
                  )
                })}
              </div>
              {slots.every((s) => !s.available) && <p className="mt-3 text-xs text-mute">Tudo ocupado nesse dia.</p>}
            </>
          )}
          {errors.slot && <p role="alert" className="mt-2 text-sm text-danger">{errors.slot}</p>}
        </section>

        <section className="space-y-4">
          <SectionTitle>4. Seus dados</SectionTitle>
          <Field label="Nome" error={errors.name}>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Seu nome" />
          </Field>
          <Field label="WhatsApp" error={errors.phone} hint="Com DDD. Com o número é que confirmamos seu pedido.">
            <PhoneInput value={phone} onValue={setPhone} />
          </Field>
          <div aria-hidden className="absolute -left-[9999px]">
            <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} name="site" />
          </div>
          <Card className="space-y-1 text-sm text-sand/90">
            <p className="font-display font-bold uppercase tracking-wide text-gold">Regra de falta</p>
            <p>{absenceRuleText(settings)}</p>
          </Card>
          <div>
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[#d4a94f]" />
              <span>{settings.consentText}</span>
            </label>
            {errors.consent && <p role="alert" className="mt-1 text-sm text-danger">{errors.consent}</p>}
          </div>
        </section>

        <div className="no-print sticky bottom-0 -mx-5 border-t border-line bg-ink/95 px-5 pt-3 safe-bottom backdrop-blur">
          <AnimatePresence>
            {itemIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-2 flex items-center justify-between gap-3 overflow-hidden text-sm"
              >
                <span className="flex min-w-0 items-center gap-2 text-mute">
                  <Scissors className="h-4 w-4 shrink-0 text-gold" aria-hidden />
                  <span className="truncate">
                    {itemIds.map((id) => servicos.find((s) => s.id === id)?.name).filter(Boolean).join(' + ')}
                  </span>
                </span>
                <span className="shrink-0 font-display text-xl font-bold text-gold">
                  {total.from ? 'a partir de ' : ''}
                  {moneyShort(total.cents)}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <Btn type="submit" loading={busy} className="w-full">
            <Check className="h-5 w-5" aria-hidden /> Enviar pedido
          </Btn>
          <p className="mt-2 text-center text-xs text-mute">O horário só é seu depois da nossa confirmação.</p>
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
      <h1 className="mb-7 font-display text-4xl font-extrabold uppercase text-sand">Agendar horário</h1>
      {children}
    </div>
  )
}
