import { AlertTriangle, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { Badge, Btn, Card, LinkBtn, Modal, Select, useToast } from '@/components/ui'
import { absencesOf, api, bookableDates, slotsFor } from '@/lib/api'
import { fmtDateTime, fmtTime, prettyPhone, waLink, weekdayLong } from '@/lib/format'
import { useAppState } from '@/lib/store'
import { ApiError, type BookingRequest } from '@/lib/types'

export default function Pedidos() {
  const { requests, menu, settings } = useAppState()
  const toast = useToast()
  const [proposing, setProposing] = useState<BookingRequest | null>(null)
  const [pDate, setPDate] = useState(bookableDates()[0])

  const act = (fn: () => void, ok: string) => {
    try {
      fn()
      toast(ok)
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Algo deu errado.', 'error')
    }
  }

  const pending = requests.filter((r) => r.status === 'pendente').sort((a, b) => a.startAt.localeCompare(b.startAt))
  const proposed = requests.filter((r) => r.status === 'outro_horario_proposto')
  const resched = requests.filter((r) => r.status === 'confirmado' && r.rescheduleStartAt)
  const itemName = (id: string) => menu.find((m) => m.id === id)?.name ?? 'Serviço'
  const link = (r: BookingRequest) => `${location.origin}${location.pathname}#/pedido/${r.token}`

  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-4 font-display text-3xl font-extrabold uppercase">Pedidos novos</h1>
        {pending.length === 0 && <Card className="text-mute">Nenhum pedido esperando resposta.</Card>}
        <div className="space-y-3">
          {pending.map((r) => {
            const miss = absencesOf(r.phone)
            return (
              <Card key={r.id} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl font-bold uppercase">{r.clientName}</p>
                    <p className="text-sm text-mute">{prettyPhone(r.phone)} · {itemName(r.itemId)}</p>
                  </div>
                  <Badge tone="gold">Pendente</Badge>
                </div>
                <p className="font-display text-2xl font-bold text-gold">{fmtDateTime(r.startAt)}</p>
                {miss > 0 && (
                  <p className="flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/10 p-2.5 text-sm text-danger">
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden /> Esse cliente já faltou {miss}x.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Btn size="sm" onClick={() => act(() => api.transition(r.id, 'confirmado'), 'Pedido confirmado.')}>Aprovar</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => { setProposing(r); setPDate(bookableDates()[0]) }}>Outro horário</Btn>
                  <Btn size="sm" variant="danger" onClick={() => act(() => api.transition(r.id, 'recusado'), 'Pedido recusado.')}>Recusar</Btn>
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      {resched.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-2xl font-bold uppercase">Pedidos de remarcação</h2>
          <div className="space-y-3">
            {resched.map((r) => (
              <Card key={r.id} className="space-y-2">
                <p className="font-display text-xl font-bold uppercase">{r.clientName}</p>
                <p className="text-sm text-mute">De {fmtDateTime(r.startAt)} para <b className="text-gold">{fmtDateTime(r.rescheduleStartAt!)}</b>. O horário atual continua valendo até você aprovar.</p>
                <div className="flex gap-2">
                  <Btn size="sm" onClick={() => act(() => api.approveReschedule(r.id), 'Remarcado.')}>Aprovar</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => act(() => api.refuseReschedule(r.id), 'Mantido o horário atual.')}>Manter o atual</Btn>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {proposed.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-2xl font-bold uppercase">Aguardando o cliente</h2>
          <div className="space-y-3">
            {proposed.map((r) => (
              <Card key={r.id} className="space-y-2">
                <p className="font-display text-xl font-bold uppercase">{r.clientName}</p>
                <p className="text-sm text-mute">Você sugeriu <b className="text-gold">{fmtDateTime(r.proposedStartAt!)}</b>.</p>
                <LinkBtn
                  href={waLink(r.phone, `Oi ${r.clientName}, aqui é o Tio Preto. Não consigo ${fmtDateTime(r.startAt)}. Posso ${fmtDateTime(r.proposedStartAt!)}? Confirme aqui: ${link(r)}`)}
                  target="_blank" rel="noreferrer" className="!min-h-10 !text-base"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden /> Avisar no WhatsApp
                </LinkBtn>
              </Card>
            ))}
          </div>
        </section>
      )}

      <Modal open={!!proposing} onClose={() => setProposing(null)} title="Propor outro horário">
        {proposing && (
          <div className="space-y-4">
            <Select value={pDate} onChange={(e) => setPDate(e.target.value)} aria-label="Dia">
              {bookableDates().map((d) => <option key={d} value={d}>{weekdayLong(d)}</option>)}
            </Select>
            <div className="grid grid-cols-3 gap-2">
              {slotsFor(pDate, proposing.itemId).map((s) => (
                <button
                  key={s.startAt}
                  disabled={!s.available}
                  onClick={() => {
                    act(() => api.transition(proposing.id, 'outro_horario_proposto', s.startAt), 'Proposta registrada. Avise o cliente.')
                    setProposing(null)
                  }}
                  className="min-h-11 cursor-pointer rounded-lg border border-line font-display text-lg font-bold hover:border-gold disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {fmtTime(s.startAt)}
                </button>
              ))}
            </div>
            {slotsFor(pDate, proposing.itemId).length === 0 && <p className="text-sm text-mute">Fechado nesse dia ({settings.businessName}).</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}
