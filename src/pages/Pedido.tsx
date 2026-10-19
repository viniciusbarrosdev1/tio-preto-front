import { ArrowLeft, MessageCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Badge, Btn, Card, LinkBtn, useToast } from '@/components/ui'
import { api, bookableDates, cancelDeadlineAt, hoursFor } from '@/lib/api'
import { fmtDateTime, fmtTime, priceLabel, waLink, weekdayLong } from '@/lib/format'
import { useAppState } from '@/lib/store'
import { ApiError, type BookingRequest, type Slot } from '@/lib/types'

const statusInfo: Record<BookingRequest['status'], { label: string; tone: 'mute' | 'gold' | 'ok' | 'danger'; text: string }> = {
  pendente: { label: 'Aguardando', tone: 'gold', text: 'O Tio Preto vai olhar seu pedido e te responder pelo WhatsApp.' },
  confirmado: { label: 'Confirmado', tone: 'ok', text: 'Horário confirmado. Até lá!' },
  recusado: { label: 'Recusado', tone: 'danger', text: 'Esse horário não deu. Você pode pedir outro.' },
  outro_horario_proposto: { label: 'Novo horário sugerido', tone: 'gold', text: 'O Tio Preto sugeriu outro horário para você.' },
  cancelado: { label: 'Cancelado', tone: 'mute', text: 'Pedido cancelado.' },
  faltou: { label: 'Falta registrada', tone: 'danger', text: 'Falta registrada neste atendimento.' },
}

export default function Pedido() {
  const { token } = useParams()
  const [sp] = useSearchParams()
  const { menu, settings, requests } = useAppState()
  const toast = useToast()
  const [error, setError] = useState('')
  const [resched, setResched] = useState(false)
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])

  const r = requests.find((x) => x.token === token)
  const item = menu.find((m) => m.id === r?.itemId)

  const load = useCallback(() => {
    if (token) api.requestByToken(token).catch((e: ApiError) => setError(e.message))
  }, [token])
  useEffect(load, [load])

  useEffect(() => {
    if (r && date) api.slots(date, r.itemId).then(setSlots)
  }, [date, r?.itemId, requests]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!r)
    return (
      <Wrap>
        <Card>{error || 'Carregando...'}</Card>
      </Wrap>
    )

  const info = statusInfo[r.status]
  const deadline = cancelDeadlineAt(r)
  const pastDeadline = Date.now() > new Date(deadline).getTime()

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
      {sp.get('novo') && (
        <p className="mb-4 rounded-lg border border-gold/40 bg-gold/10 p-3 text-sm">
          Pedido enviado! Guarde esta página: é por aqui que você acompanha, cancela ou remarca.
        </p>
      )}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-display text-2xl font-bold uppercase">{item?.name ?? 'Serviço'}</span>
          <Badge tone={info.tone}>{info.label}</Badge>
        </div>
        <p className="font-display text-3xl font-extrabold text-gold">{fmtDateTime(r.startAt)}</p>
        {item && <p className="text-sm text-mute">{priceLabel(item.priceCents, item.priceType)} · {item.durationMinutes} min</p>}
        <p className="text-sm">{info.text}</p>
        {r.rescheduleStartAt && (
          <p className="rounded-lg border border-gold/40 p-3 text-sm">
            Você pediu para mudar para <b>{fmtDateTime(r.rescheduleStartAt)}</b>. Seu horário atual segue valendo até o Tio Preto aprovar.
          </p>
        )}
      </Card>

      {r.status === 'outro_horario_proposto' && r.proposedStartAt && (
        <Card className="mt-4 space-y-3">
          <p>Novo horário sugerido: <b className="text-gold">{fmtDateTime(r.proposedStartAt)}</b></p>
          <div className="flex gap-2">
            <Btn onClick={() => run(() => api.acceptProposal(r.token), 'Horário confirmado!')} className="flex-1">Aceitar</Btn>
            <Btn variant="ghost" onClick={() => run(() => api.cancelByToken(r.token), 'Pedido cancelado.')} className="flex-1">Recusar</Btn>
          </div>
        </Card>
      )}

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
              <Btn variant="ghost" disabled={pastDeadline} onClick={() => setResched((v) => !v)} className="flex-1">Remarcar</Btn>
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
          {resched && (
            <div className="space-y-3 border-t border-line pt-3">
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {bookableDates().filter((d) => hoursFor(d, settings).length).map((d) => (
                  <button key={d} onClick={() => setDate(d)} className={`shrink-0 cursor-pointer rounded-lg border px-3 py-2 text-sm ${date === d ? 'border-gold bg-gold text-ink' : 'border-line'}`}>
                    {d.slice(8)}/{d.slice(5, 7)}
                  </button>
                ))}
              </div>
              {date && <p className="text-sm first-letter:uppercase text-mute">{weekdayLong(date)}</p>}
              <div className="grid grid-cols-3 gap-2">
                {slots.map((s) => (
                  <button
                    key={s.startAt}
                    disabled={!s.available}
                    onClick={() => run(() => api.rescheduleByToken(r.token, s.startAt), 'Pedido de remarcação enviado.').then(() => setResched(false))}
                    className="min-h-11 cursor-pointer rounded-lg border border-line font-display text-lg font-bold hover:border-gold disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    {fmtTime(s.startAt)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      <LinkBtn href={waLink(settings.whatsapp, `Oi, sou ${r.clientName}. Sobre meu horário de ${fmtDateTime(r.startAt)}.`)} target="_blank" rel="noreferrer" className="mt-6 w-full">
        <MessageCircle className="h-5 w-5" aria-hidden /> Falar com o Tio Preto
      </LinkBtn>
    </Wrap>
  )
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-md px-5 pb-10 pt-6">
      <Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm text-mute hover:text-gold">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Cardápio
      </Link>
      <h1 className="mb-6 font-display text-4xl font-extrabold uppercase">Seu pedido</h1>
      {children}
    </div>
  )
}
