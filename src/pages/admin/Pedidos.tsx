import { AlertTriangle, Check, Clock, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { Appear, Badge, Btn, Card, EmptyState, Modal, SectionTitle, WaNotice, cx, spring, useToast } from '@/components/ui'
import { absencesOf, api, durationFor, lastMessage, openDates, priceOf, serviceName, slotsFor } from '@/lib/api'
import { dayMonth, durationLabel, fmtDateTime, fmtTime, moneyShort, prettyPhone, waLink, weekdayName } from '@/lib/format'
import { useAppState } from '@/lib/store'
import { ApiError, type BookingRequest } from '@/lib/types'

export default function Pedidos() {
  const { requests, menu, settings, blockedNumbers } = useAppState()
  const toast = useToast()
  const [proposing, setProposing] = useState<BookingRequest | null>(null)
  const [pDate, setPDate] = useState(openDates(settings)[0] ?? '')

  const act = (fn: () => void, ok: string) => {
    try {
      fn()
      toast(ok)
      return true
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Algo deu errado.', 'error')
      return false
    }
  }

  const pending = useMemo(
    () => requests.filter((r) => r.status === 'pendente').sort((a, b) => a.startAt.localeCompare(b.startAt)),
    [requests],
  )
  const resched = requests.filter((r) => r.status === 'confirmado' && r.rescheduleStartAt)
  const proposed = requests.filter((r) => r.status === 'outro_horario_proposto')
  const link = (r: BookingRequest) => `${location.origin}${location.pathname}#/pedido/${r.token}`

  const head = (r: BookingRequest) => {
    const total = priceOf(r.itemIds)
    return (
      <>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-xl font-bold uppercase leading-tight">{r.clientName}</p>
            <p className="truncate text-sm text-mute">{prettyPhone(r.phone)}</p>
          </div>
          <Badge tone={r.status === 'pendente' ? 'gold' : 'mute'}>{serviceName(r.itemIds, menu)}</Badge>
        </div>
        <p className="font-display text-2xl font-bold leading-tight text-gold first-letter:uppercase">
          {weekdayName(r.startAt.slice(0, 10))}, {dayMonth(r.startAt.slice(0, 10))} às {fmtTime(r.startAt)}
        </p>
        <p className="flex flex-wrap items-center gap-x-3 text-sm text-mute">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4" aria-hidden /> {durationLabel(durationFor(r.itemIds))}
          </span>
          <span>
            {total.from ? 'a partir de ' : ''}
            {moneyShort(total.cents)}
          </span>
          <span>pedido em {fmtDateTime(r.createdAt)}</span>
        </p>
      </>
    )
  }

  return (
    <div className="space-y-9">
      <section>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h1 className="font-display text-3xl font-extrabold uppercase">Pedidos novos</h1>
          {pending.length > 0 && <Badge tone="gold">{pending.length} esperando</Badge>}
        </div>
        {pending.length === 0 ? (
          <EmptyState>Nenhum pedido esperando resposta. Tudo em ordem.</EmptyState>
        ) : (
          <div className="space-y-3">
            {pending.map((r, i) => {
              const miss = absencesOf(r.phone)
              const isBlocked = blockedNumbers.includes(r.phone)
              return (
                <Appear key={r.id} i={i}>
                  <Card className="space-y-3">
                    {head(r)}
                    {(miss > 0 || isBlocked) && (
                      <p className="flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 p-2.5 text-sm text-danger">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                        <span>
                          {miss > 0 && `Esse cliente já faltou ${miss}x. `}
                          {isBlocked && 'Número bloqueado por você.'}
                        </span>
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Btn
                        size="sm"
                        onClick={() =>
                          act(() => api.transition(r.id, 'confirmado'), 'Confirmado. A confirmação já saiu no WhatsApp do cliente.')
                        }
                      >
                        <Check className="h-4 w-4" aria-hidden /> Aprovar
                      </Btn>
                      <Btn
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setProposing(r)
                          setPDate(openDates(settings)[0] ?? '')
                        }}
                      >
                        <Clock className="h-4 w-4" aria-hidden /> Outro horário
                      </Btn>
                      <Btn
                        size="sm"
                        variant="danger"
                        onClick={() => act(() => api.transition(r.id, 'recusado'), 'Recusado. O cliente foi avisado no WhatsApp.')}
                      >
                        <X className="h-4 w-4" aria-hidden /> Recusar
                      </Btn>
                    </div>
                  </Card>
                </Appear>
              )
            })}
          </div>
        )}
      </section>

      {resched.length > 0 && (
        <section>
          <SectionTitle>Pedidos de remarcação</SectionTitle>
          <div className="space-y-3">
            {resched.map((r, i) => (
              <Appear key={r.id} i={i}>
                <Card className="space-y-3">
                  <p className="font-display text-xl font-bold uppercase">{r.clientName}</p>
                  <p className="text-sm text-mute">
                    De {fmtDateTime(r.startAt)} para <b className="text-gold">{fmtDateTime(r.rescheduleStartAt!)}</b>. O horário atual
                    continua valendo até você aprovar.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Btn
                      size="sm"
                      onClick={() => act(() => api.approveReschedule(r.id), 'Remarcado. O cliente já recebeu o novo horário.')}
                    >
                      Aprovar
                    </Btn>
                    <Btn
                      size="sm"
                      variant="ghost"
                      onClick={() => act(() => api.refuseReschedule(r.id), 'Mantido o horário atual. O cliente foi avisado.')}
                    >
                      Manter o atual
                    </Btn>
                  </div>
                  <WaNotice
                    text={lastMessage(r)?.text}
                    at={lastMessage(r)?.at}
                    href={waLink(
                      r.phone,
                      `Oi ${r.clientName}, aqui é o Tio Preto. Sobre sua remarcação de ${fmtDateTime(r.startAt)} para ${fmtDateTime(r.rescheduleStartAt!)}: `,
                    )}
                    cta="Falar no WhatsApp (se precisar)"
                  />
                </Card>
              </Appear>
            ))}
          </div>
        </section>
      )}

      {proposed.length > 0 && (
        <section>
          <SectionTitle>Aguardando o cliente</SectionTitle>
          <div className="space-y-3">
            {proposed.map((r, i) => (
              <Appear key={r.id} i={i}>
                <Card className="space-y-3">
                  <p className="font-display text-xl font-bold uppercase">{r.clientName}</p>
                  <p className="text-sm text-mute">
                    Você sugeriu <b className="text-gold">{fmtDateTime(r.proposedStartAt!)}</b> no lugar de {fmtDateTime(r.startAt)}.
                  </p>
                  <WaNotice
                    text={lastMessage(r)?.text}
                    at={lastMessage(r)?.at}
                    href={waLink(
                      r.phone,
                      `Oi ${r.clientName}, aqui é o Tio Preto. Não consigo ${fmtDateTime(r.startAt)}. Posso te atender ${fmtDateTime(
                        r.proposedStartAt!,
                      )}? Confirme aqui: ${link(r)}`,
                    )}
                    cta="Falar no WhatsApp (se precisar)"
                  />
                </Card>
              </Appear>
            ))}
          </div>
        </section>
      )}

      <Modal open={!!proposing} onClose={() => setProposing(null)} title="Propor outro horário">
        {proposing && (
          <div className="space-y-4">
            <p className="text-sm text-mute">
              {proposing.clientName} · {serviceName(proposing.itemIds, menu)} · {durationLabel(durationFor(proposing.itemIds))}
            </p>
            <div className="strip">
              {openDates(settings).map((d) => (
                <motion.button
                  key={d}
                  whileTap={{ scale: 0.95 }}
                  transition={spring}
                  onClick={() => setPDate(d)}
                  className={cx(
                    'flex min-w-16 shrink-0 cursor-pointer flex-col items-center rounded-xl border px-3 py-2',
                    pDate === d ? 'border-gold bg-gold text-ink' : 'border-line bg-coal/30',
                  )}
                >
                  <span className="text-[11px] uppercase">{weekdayName(d).slice(0, 3)}</span>
                  <span className="font-display text-xl font-bold">{d.slice(8)}</span>
                </motion.button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {slotsFor(pDate, proposing.itemIds).map((s) => (
                <motion.button
                  key={s.startAt}
                  disabled={!s.available}
                  whileTap={{ scale: 0.94 }}
                  transition={spring}
                  onClick={() => {
                    act(
                      () => api.transition(proposing.id, 'outro_horario_proposto', s.startAt),
                      'Proposta enviada no WhatsApp do cliente.',
                    )
                    setProposing(null)
                  }}
                  className="min-h-11 cursor-pointer rounded-xl border border-line bg-coal/40 font-display text-lg font-bold hover:border-gold disabled:cursor-not-allowed disabled:opacity-30 disabled:line-through"
                >
                  {fmtTime(s.startAt)}
                </motion.button>
              ))}
            </div>
            {slotsFor(pDate, proposing.itemIds).length === 0 && (
              <p className="text-sm text-mute">Nesse dia não cabe esse atendimento.</p>
            )}
          </div>
        )}
      </Modal>

    </div>
  )
}
