import { CalendarClock, Check, Clock, Lock, Plus, UserX } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import SlotPicker from '@/components/SlotPicker'
import {
  Appear,
  Badge,
  Btn,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PhoneInput,
  SectionTitle,
  Segmented,
  WaNotice,
  cx,
  spring,
  useToast,
} from '@/components/ui'
import {
  HISTORY_DAYS,
  api,
  durationFor,
  endOf,
  hoursFor,
  isPast,
  lastMessage,
  priceOf,
  serviceName,
  slotsFor,
} from '@/lib/api'
import {
  addDays,
  dateKey,
  dayMonth,
  durationLabel,
  fmtDateTime,
  fmtTime,
  moneyShort,
  monthShort,
  prettyPhone,
  todayKey,
  waLink,
  weekdayLong,
  weekdayName,
} from '@/lib/format'
import { useAppState } from '@/lib/store'
import { ApiError, type BookingRequest, type MenuItem, type ServiceGroup } from '@/lib/types'

const BADGE: Record<string, { label: string; tone: 'mute' | 'gold' | 'ok' | 'danger' }> = {
  confirmado: { label: 'Confirmado', tone: 'ok' },
  atendido: { label: 'Atendido', tone: 'gold' },
  faltou: { label: 'Faltou', tone: 'danger' },
  cancelado: { label: 'Cancelado', tone: 'mute' },
  recusado: { label: 'Recusado', tone: 'mute' },
  pendente: { label: 'Pendente', tone: 'gold' },
  outro_horario_proposto: { label: 'Sugerido', tone: 'gold' },
}

export default function Agenda() {
  const { requests, menu, blocks, settings } = useAppState()
  const toast = useToast()
  const [mode, setMode] = useState<'dia' | 'historico'>('dia')
  const [date, setDate] = useState(todayKey())
  const [manual, setManual] = useState(false)
  const [moving, setMoving] = useState<BookingRequest | null>(null)
  const stripRef = useRef<HTMLDivElement>(null)

  const days = useMemo(() => {
    const past = Array.from({ length: HISTORY_DAYS }, (_, i) => addDays(todayKey(), -(HISTORY_DAYS - i)))
    const future = Array.from({ length: Math.max(1, settings.horizonWeeks) * 7 }, (_, i) => addDays(todayKey(), i))
    return [...past, ...future]
  }, [settings.horizonWeeks])

  // abre centralizado no dia de hoje, com o histórico à esquerda
  useEffect(() => {
    const el = stripRef.current?.querySelector('[data-today="1"]') as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [])

  const act = (fn: () => void, ok: string) => {
    try {
      fn()
      toast(ok)
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Algo deu errado.', 'error')
    }
  }

  const ofDay = (d: string) =>
    requests
      .filter((r) => dateKey(r.startAt) === d && ['confirmado', 'atendido', 'faltou'].includes(r.status))
      .sort((a, b) => a.startAt.localeCompare(b.startAt))

  const day = ofDay(date)
  const dayBlocks = blocks.filter((b) => dateKey(b.startAt) === date).sort((a, b) => a.startAt.localeCompare(b.startAt))
  const hasHours = hoursFor(date, settings).length > 0
  const link = (token: string) => `${location.origin}${location.pathname}#/pedido/${token}`

  const history = useMemo(
    () =>
      requests
        .filter((r) => {
          const d = dateKey(r.startAt)
          return d < todayKey() && d >= addDays(todayKey(), -HISTORY_DAYS)
        })
        .sort((a, b) => b.startAt.localeCompare(a.startAt)),
    [requests],
  )

  const waText = (r: BookingRequest, extra = '') =>
    `Oi ${r.clientName}, aqui é o Tio Preto. ${extra}Seu horário: ${serviceName(r.itemIds, menu)} · ${fmtDateTime(
      r.startAt,
    )}. Para cancelar ou remarcar: ${link(r.token)}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold uppercase">Agenda</h1>
        <Btn size="sm" onClick={() => setManual(true)}>
          <Plus className="h-4 w-4" aria-hidden /> Cadastrar
        </Btn>
      </div>

      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'dia', label: 'Por dia' },
          { value: 'historico', label: `Histórico ${HISTORY_DAYS}d` },
        ]}
      />

      {mode === 'dia' ? (
        <>
          <div ref={stripRef} className="strip -mx-5 px-5">
            {days.map((d) => {
              const n = ofDay(d).length
              const isToday = d === todayKey()
              const on = date === d
              return (
                <motion.button
                  key={d}
                  data-today={isToday ? '1' : undefined}
                  whileTap={{ scale: 0.95 }}
                  transition={spring}
                  onClick={() => setDate(d)}
                  aria-pressed={on}
                  aria-label={`${weekdayLong(d)}${n > 0 ? `, ${n} marcado${n > 1 ? 's' : ''}` : ''}`}
                  className={cx(
                    'relative flex min-w-17 shrink-0 cursor-pointer flex-col items-center rounded-xl border px-3 py-2.5',
                    on ? 'border-gold bg-gold text-ink' : 'border-line bg-coal/30 hover:border-gold/50',
                    !on && d < todayKey() && 'opacity-60',
                  )}
                >
                  <span className="text-[11px] font-semibold uppercase">{weekdayName(d).slice(0, 3)}</span>
                  <span className="font-display text-2xl font-bold leading-tight">{d.slice(8)}</span>
                  <span className={cx('text-[10px] font-bold uppercase', on ? 'text-ink/70' : 'text-mute')}>
                    {isToday ? 'hoje' : monthShort(d)}
                  </span>
                  {n > 0 && (
                    <span
                      aria-hidden
                      className={cx('absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full', on ? 'bg-ink' : 'bg-gold')}
                    />
                  )}
                </motion.button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-display text-xl font-bold uppercase first-letter:uppercase">{weekdayLong(date)}</p>
            <p className="text-sm text-mute">
              {hasHours ? hoursFor(date, settings).map((r) => `${r.start}–${r.end}`).join(' · ') : 'Fechado'}
            </p>
          </div>

          {!hasHours && <EmptyState>Fechado nesse dia. Dá para mudar em Horários.</EmptyState>}

          <div className="space-y-3">
            {day.map((r, i) => {
              const total = priceOf(r.itemIds)
              const past = isPast(r)
              return (
                <Appear key={r.id} i={i}>
                  <Card className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-xl font-bold uppercase leading-tight">
                          {fmtTime(r.startAt)}–{fmtTime(endOf(r))} · {r.clientName}
                        </p>
                        <p className="truncate text-sm text-mute">
                          {prettyPhone(r.phone)} · {serviceName(r.itemIds, menu)}
                        </p>
                        <p className="mt-0.5 text-sm text-mute">
                          {durationLabel(durationFor(r.itemIds))} · {total.from ? 'a partir de ' : ''}
                          {moneyShort(total.cents)}
                          {r.manual && ' · cadastro manual'}
                        </p>
                      </div>
                      <Badge tone={BADGE[r.status].tone}>{BADGE[r.status].label}</Badge>
                    </div>
                    {r.status === 'confirmado' && (
                      <div className="flex flex-wrap gap-2">
                        <Btn size="sm" variant="ghost" onClick={() => setMoving(r)}>
                          <CalendarClock className="h-4 w-4" aria-hidden /> Reagendar
                        </Btn>
                        <Btn
                          size="sm"
                          variant="ghost"
                          disabled={!past}
                          title={past ? 'Atendimento concluído' : 'Libera depois da hora marcada'}
                          onClick={() => act(() => api.transition(r.id, 'atendido'), 'Atendimento confirmado.')}
                        >
                          <Check className="h-4 w-4" aria-hidden /> Atendido
                        </Btn>
                        <Btn
                          size="sm"
                          variant="danger"
                          disabled={!past}
                          title={past ? 'Registrar falta' : 'Libera depois da hora marcada'}
                          onClick={() => act(() => api.transition(r.id, 'faltou'), 'Falta registrada.')}
                        >
                          <UserX className="h-4 w-4" aria-hidden /> Faltou
                        </Btn>
                        <Btn
                          size="sm"
                          variant="quiet"
                          onClick={() => act(() => api.transition(r.id, 'cancelado'), 'Cancelado. O cliente foi avisado no WhatsApp.')}
                        >
                          Cancelar
                        </Btn>
                      </div>
                    )}
                    {r.status === 'confirmado' && (
                      <WaNotice
                        text={lastMessage(r)?.text}
                        at={lastMessage(r)?.at}
                        href={waLink(r.phone, waText(r, ''))}
                        cta="Falar no WhatsApp (se precisar)"
                      />
                    )}
                  </Card>
                </Appear>
              )
            })}

            {dayBlocks.map((b) => (
              <Card key={b.id} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sand/90">
                  <Lock className="h-4 w-4 text-gold" aria-hidden /> Bloqueado {fmtTime(b.startAt)}–{fmtTime(b.endAt)}
                </span>
                <Btn size="sm" variant="quiet" onClick={() => api.removeBlock(b.id)}>
                  Liberar
                </Btn>
              </Card>
            ))}

            {hasHours && day.length === 0 && dayBlocks.length === 0 && <EmptyState>Nada marcado nesse dia.</EmptyState>}
          </div>

          {hasHours && date >= todayKey() && (
            <section>
              <SectionTitle>Bloquear horário</SectionTitle>
              <p className="mb-2 text-sm text-mute">Toque no horário que você não quer atender nesse dia.</p>
              <div className="flex flex-wrap gap-2">
                {slotsFor(date, [menu.find((m) => m.kind === 'servico')?.id ?? ''])
                  .filter((s) => s.available)
                  .map((s) => (
                    <motion.button
                      key={s.startAt}
                      whileTap={{ scale: 0.94 }}
                      transition={spring}
                      onClick={() => {
                        api.addBlock(s.startAt)
                        toast('Horário bloqueado.')
                      }}
                      className="min-h-10 cursor-pointer rounded-xl border border-line bg-coal/40 px-3 font-display text-lg font-bold hover:border-gold"
                    >
                      {fmtTime(s.startAt)}
                    </motion.button>
                  ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <section className="space-y-3">
          <p className="text-sm text-mute">
            Últimos {HISTORY_DAYS} dias: {history.filter((r) => r.status === 'atendido').length} atendidos ·{' '}
            {history.filter((r) => r.status === 'faltou').length} faltas ·{' '}
            {history.filter((r) => r.status === 'cancelado').length} cancelados
          </p>
          {history.length === 0 && <EmptyState>Sem histórico ainda.</EmptyState>}
          {history.map((r, i) => (
            <Appear key={r.id} i={i}>
              <Card className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold uppercase leading-tight">
                    {dayMonth(dateKey(r.startAt))} {fmtTime(r.startAt)} · {r.clientName}
                  </p>
                  <p className="truncate text-sm text-mute">
                    {serviceName(r.itemIds, menu)} · {moneyShort(priceOf(r.itemIds).cents)}
                  </p>
                </div>
                <Badge tone={BADGE[r.status].tone}>{BADGE[r.status].label}</Badge>
              </Card>
            </Appear>
          ))}
        </section>
      )}

      <ManualModal open={manual} onClose={() => setManual(false)} date={date} />

      <Modal open={!!moving} onClose={() => setMoving(null)} title="Reagendar horário">
        {moving && (
          <SlotPicker
            itemIds={moving.itemIds}
            info={`${moving.clientName} · ${serviceName(moving.itemIds, menu)} · hoje está em ${fmtDateTime(moving.startAt)}`}
            onPick={(startAt) => {
              act(() => api.moveRequest(moving.id, startAt), 'Remarcado. O cliente já recebeu o novo horário no WhatsApp.')
              setMoving(null)
            }}
            footer={
              <div className="rounded-xl border border-line/70 bg-coal/50 p-2.5 text-xs text-mute">
                Ao escolher o novo horário, o cliente recebe a mudança no WhatsApp automaticamente.{' '}
                <a
                  href={waLink(moving.phone, waText(moving, 'Preciso mudar seu horário. '))}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-gold underline underline-offset-2"
                >
                  Falar com ele antes
                </a>
                , se preferir.
              </div>
            }
          />
        )}
      </Modal>
    </div>
  )
}

/** Cadastro manual: o dono marca por fora e a agenda já nasce confirmada. */
function ManualModal({ open, onClose, date }: { open: boolean; onClose: () => void; date: string }) {
  const { menu } = useAppState()
  const toast = useToast()
  const servicos = menu.filter((m) => m.kind === 'servico')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [picked, setPicked] = useState<Record<string, string[]>>({})
  const itemIds = Object.values(picked).flat()

  const toggle = (m: MenuItem) => {
    const g: ServiceGroup = m.group ?? 'outro'
    setPicked((p) => {
      const cur = p[g] ?? []
      if (g === 'outro') return { ...p, outro: cur.includes(m.id) ? cur.filter((x) => x !== m.id) : [...cur, m.id] }
      return { ...p, [g]: cur.includes(m.id) ? [] : [m.id] }
    })
  }

  const save = async (startAt: string) => {
    try {
      await api.createRequest({ clientName: name, phone, itemIds, startAt, consent: true, manual: true })
      toast('Cadastrado na agenda. O cliente recebeu a confirmação no WhatsApp.')
      setName('')
      setPhone('')
      setPicked({})
      onClose()
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erro', 'error')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Cadastrar cliente">
      <div className="space-y-4">
        <Field label="Nome">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do cliente" />
        </Field>
        <Field label="WhatsApp">
          <PhoneInput value={phone} onValue={setPhone} />
        </Field>
        <div>
          <span className="mb-1.5 block text-sm font-medium text-mute">Serviços (um de cada tipo)</span>
          <div className="flex flex-wrap gap-2">
            {servicos.map((m) => {
              const on = itemIds.includes(m.id)
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggle(m)}
                  aria-pressed={on}
                  className={cx(
                    'cursor-pointer rounded-full border px-3 py-1.5 text-sm',
                    on ? 'border-gold bg-gold text-ink' : 'border-line bg-coal/30 text-sand hover:border-gold/60',
                  )}
                >
                  {m.name}
                </button>
              )
            })}
          </div>
        </div>
        {itemIds.length > 0 && (
          <p className="flex items-center gap-2 text-sm text-mute">
            <Clock className="h-4 w-4 text-gold" aria-hidden /> {durationLabel(durationFor(itemIds))} ·{' '}
            {moneyShort(priceOf(itemIds).cents)}
          </p>
        )}
        {itemIds.length === 0 ? (
          <p className="text-sm text-mute">Escolha o serviço para ver os horários livres de {dayMonth(date)}.</p>
        ) : (
          <SlotPicker itemIds={itemIds} initial={date} onPick={save} />
        )}
      </div>
    </Modal>
  )
}
