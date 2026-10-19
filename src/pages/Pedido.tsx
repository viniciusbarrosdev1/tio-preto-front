import { ArrowLeft, Camera, Check, Clock, Phone } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Appear, Badge, Btn, Card, Loading, SectionTitle, Spinner, cx, spring, useToast } from '@/components/ui'
import { api, cancelDeadlineAt, durationFor, openDates, priceOf, serviceName } from '@/lib/api'
import { dateKey, dayMonth, durationLabel, fmtDateTime, fmtTime, moneyShort, waLink, weekdayName } from '@/lib/format'
import { useAppState } from '@/lib/store'
import { ApiError, type BookingRequest, type Slot } from '@/lib/types'

const statusInfo: Record<BookingRequest['status'], { label: string; tone: 'mute' | 'gold' | 'ok' | 'danger'; text: string }> = {
  pendente: { label: 'Aguardando', tone: 'gold', text: 'O Tio Preto vai olhar seu pedido e responder pelo WhatsApp.' },
  confirmado: { label: 'Confirmado', tone: 'ok', text: 'Horário confirmado. Até lá!' },
  recusado: { label: 'Recusado', tone: 'danger', text: 'Esse horário não deu. Você pode pedir outro.' },
  outro_horario_proposto: { label: 'Novo horário sugerido', tone: 'gold', text: 'O Tio Preto sugeriu outro horário para você.' },
  cancelado: { label: 'Cancelado', tone: 'mute', text: 'Pedido cancelado.' },
  atendido: { label: 'Atendido', tone: 'ok', text: 'Atendimento concluído. Valeu pela visita!' },
  faltou: { label: 'Falta registrada', tone: 'danger', text: 'Falta registrada neste atendimento.' },
}

export default function Pedido() {
  const { token } = useParams()
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const { menu, settings, requests } = useAppState()
  const toast = useToast()
  const [error, setError] = useState('')
  const [resched, setResched] = useState(false)
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const r = requests.find((x) => x.token === token)

  useEffect(() => {
    if (token) api.requestByToken(token).catch((e: ApiError) => setError(e.message))
  }, [token])

  useEffect(() => {
    if (!r || !date) return
    let alive = true
    setLoadingSlots(true)
    api.slots(date, r.itemIds).then((s) => {
      if (!alive) return
      setSlots(s)
      setLoadingSlots(false)
    })
    return () => {
      alive = false
    }
  }, [date, r?.id, requests]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!r)
    return (
      <Wrap>
        <Card>{error || <Loading />}</Card>
      </Wrap>
    )

  const info = statusInfo[r.status]
  const deadline = cancelDeadlineAt(r)
  const pastDeadline = Date.now() > new Date(deadline).getTime()
  const total = priceOf(r.itemIds)
  const duration = durationFor(r.itemIds)
  const names = serviceName(r.itemIds, menu)

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn()
      toast(ok)
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Algo deu errado.', 'error')
    }
  }

  return (
    <Wrap>
      <AnimatePresence>
        {sp.get('novo') && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-4"
          >
            <motion.span
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ ...spring, delay: 0.1 }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-ink"
            >
              <Check className="h-5 w-5" aria-hidden />
            </motion.span>
            <div className="text-sm">
              <p className="font-display text-lg font-bold uppercase leading-none text-gold">Pedido enviado</p>
              <p className="mt-1 text-sand/90">Já saiu uma mensagem no seu WhatsApp. Agora é esperar a confirmação.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <span className="font-display text-2xl font-bold uppercase leading-tight">{names}</span>
          <Badge tone={info.tone}>{info.label}</Badge>
        </div>
        <p className="font-display text-3xl font-extrabold leading-tight text-gold first-letter:uppercase">
          {weekdayName(dateKey(r.startAt))}, {dayMonth(dateKey(r.startAt))} às {fmtTime(r.startAt)}
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-mute">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4" aria-hidden /> {durationLabel(duration)}
          </span>
          <span>
            {total.from ? 'a partir de ' : ''}
            {moneyShort(total.cents)}
          </span>
        </p>
        <p className="text-sm text-sand/90">{info.text}</p>
        {r.rescheduleStartAt && (
          <p className="rounded-xl border border-gold/40 bg-gold/5 p-3 text-sm">
            Você pediu para mudar para <b>{fmtDateTime(r.rescheduleStartAt)}</b>. Seu horário atual segue valendo até o Tio Preto aprovar.
          </p>
        )}
      </Card>

      {r.status === 'outro_horario_proposto' && r.proposedStartAt && (
        <Card className="mt-4 space-y-3">
          <p>
            Novo horário sugerido: <b className="text-gold">{fmtDateTime(r.proposedStartAt)}</b>
          </p>
          <div className="flex gap-2">
            <Btn onClick={() => run(() => api.acceptProposal(r.token), 'Horário confirmado!')} className="flex-1">
              Aceitar
            </Btn>
            <Btn variant="ghost" onClick={() => run(() => api.cancelByToken(r.token), 'Pedido cancelado.')} className="flex-1">
              Recusar
            </Btn>
          </div>
        </Card>
      )}

      <section className="mt-6">
        <SectionTitle>Mensagens no seu WhatsApp</SectionTitle>
        <p className="mb-3 text-sm text-mute">Enviadas na hora, sozinhas, a cada passo do seu pedido.</p>
        <div className="space-y-2">
          {r.messages.map((m, i) => (
            <Appear key={`${m.at}-${i}`} i={i} className="rounded-xl border border-line bg-coal/40 p-3">
              <p className="text-sm text-sand/90">{m.text}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-mute">{fmtDateTime(m.at)}</p>
            </Appear>
          ))}
        </div>
        <p className="mt-2 text-xs text-mute">No protótipo elas ficam só aqui, de registro.</p>
      </section>

      <Card className="mt-6 space-y-3 border-gold/25">
        <p className="flex items-center gap-2 font-display font-bold uppercase tracking-wide text-gold">
          <Camera className="h-4 w-4" aria-hidden /> Guarde esta página
        </p>
        <p className="text-sm text-sand/90">
          Tire um print desta tela. É por aqui que você acompanha, cancela ou remarca seu horário.
        </p>
        <p className="flex items-start gap-2 text-sm text-mute">
          <Phone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Digitou o número errado ou não recebeu a confirmação no WhatsApp?{' '}
            <a
              href={waLink(
                settings.whatsapp,
                `Olá, pedi horário de ${names} para ${weekdayName(dateKey(r.startAt))}, ${dayMonth(dateKey(r.startAt))} às ${fmtTime(r.startAt)} no nome de ${r.clientName}, mas não recebi a confirmação no WhatsApp.`,
              )}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-gold underline underline-offset-2"
            >
              fale com o Tio Preto no WhatsApp
            </a>{' '}
            que ele resolve.
          </span>
        </p>
      </Card>

      {(r.status === 'confirmado' || r.status === 'pendente') && (
        <Card className="mt-4 space-y-3">
          {r.status === 'confirmado' && (
            <p className="text-sm text-mute">
              Cancelar ou remarcar até {fmtDateTime(deadline)} ({settings.cancelDeadlineHours}h antes).
              {pastDeadline && ' O prazo já passou: fale direto com o Tio Preto.'}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {r.status === 'confirmado' && (
              <Btn variant="ghost" disabled={pastDeadline} onClick={() => setResched((v) => !v)} className="flex-1">
                Remarcar
              </Btn>
            )}
            <Btn
              variant="danger"
              disabled={r.status === 'confirmado' && pastDeadline}
              onClick={() => run(() => api.cancelByToken(r.token), 'Pedido cancelado.')}
              className="flex-1"
            >
              Cancelar
            </Btn>
          </div>
          <AnimatePresence>
            {resched && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-3 border-t border-line pt-3">
                  <p className="text-sm text-mute">Escolha o novo dia e horário:</p>
                  <div className="strip">
                    {openDates(settings).map((d) => (
                      <motion.button
                        key={d}
                        whileTap={{ scale: 0.95 }}
                        transition={spring}
                        onClick={() => setDate(d)}
                        className={cx(
                          'shrink-0 cursor-pointer rounded-xl border px-3 py-2 text-sm',
                          date === d ? 'border-gold bg-gold text-ink' : 'border-line bg-coal/30',
                        )}
                      >
                        {dayMonth(d)}
                      </motion.button>
                    ))}
                  </div>
                  {date && <p className="text-sm first-letter:uppercase text-mute">{weekdayName(date)}</p>}
                  {loadingSlots ? (
                    <div className="flex items-center gap-2 text-sm text-mute">
                      <Spinner /> Buscando horários...
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {slots.map((s) => (
                        <motion.button
                          key={s.startAt}
                          disabled={!s.available}
                          whileTap={{ scale: 0.94 }}
                          transition={spring}
                          onClick={() =>
                            run(() => api.rescheduleByToken(r.token, s.startAt), 'Pedido de remarcação enviado.').then(() =>
                              setResched(false),
                            )
                          }
                          className="min-h-11 cursor-pointer rounded-xl border border-line bg-coal/40 font-display text-lg font-bold hover:border-gold disabled:cursor-not-allowed disabled:opacity-30 disabled:line-through"
                        >
                          {fmtTime(s.startAt)}
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}

      <Btn variant="gold" className="no-print mt-6 w-full" onClick={() => nav('/')}>
        Ok
      </Btn>
    </Wrap>
  )
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-md px-5 pb-10 pt-6">
      <Link to="/" className="no-print mb-5 inline-flex items-center gap-2 text-sm text-mute hover:text-gold">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Cardápio
      </Link>
      <h1 className="mb-6 font-display text-4xl font-extrabold uppercase">Seu pedido</h1>
      {children}
    </div>
  )
}
