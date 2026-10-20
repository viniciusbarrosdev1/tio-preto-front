import { AlertTriangle, CalendarClock, Clock, Eye, MessageCircle, Ban, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import {
  Appear,
  Badge,
  Btn,
  Card,
  EmptyState,
  LinkBtn,
  Modal,
  SectionTitle,
  cx,
  useToast,
} from '@/components/ui'
import SlotPicker from '@/components/SlotPicker'
import { api, durationFor, priceOf, serviceName } from '@/lib/api'
import { durationLabel, fmtDateTime, moneyShort, prettyPhone, waLink } from '@/lib/format'
import { useAppState } from '@/lib/store'
import { ApiError, type BookingRequest } from '@/lib/types'

const BADGE: Record<BookingRequest['status'], { label: string; tone: 'mute' | 'gold' | 'ok' | 'danger' }> = {
  pendente: { label: 'Pendente', tone: 'gold' },
  confirmado: { label: 'Confirmado', tone: 'ok' },
  outro_horario_proposto: { label: 'Sugerido', tone: 'gold' },
  atendido: { label: 'Atendido', tone: 'gold' },
  recusado: { label: 'Recusado', tone: 'mute' },
  cancelado: { label: 'Cancelado', tone: 'mute' },
  faltou: { label: 'Faltou', tone: 'danger' },
}

export default function Clientes() {
  const { requests, menu, blockedNumbers } = useAppState()
  const toast = useToast()
  const [seeing, setSeeing] = useState<string | null>(null)
  const [moving, setMoving] = useState<BookingRequest | null>(null)

  const adjust = requests.filter((r) => r.needsAdjust).sort((a, b) => a.startAt.localeCompare(b.startAt))

  const map = new Map<string, { name: string; phone: string; absences: string[]; total: number; last: string }>()
  for (const r of requests) {
    const c = map.get(r.phone) ?? { name: r.clientName, phone: r.phone, absences: [], total: 0, last: r.startAt }
    c.total += 1
    if (r.status === 'faltou') c.absences.push(r.startAt)
    if (r.startAt > c.last) c.last = r.startAt
    c.name = r.clientName
    map.set(r.phone, c)
  }
  const list = [...map.values()].sort(
    (a, b) => b.absences.length - a.absences.length || a.name.localeCompare(b.name),
  )

  const client = seeing ? map.get(seeing) : null
  const clientRequests = seeing
    ? requests.filter((r) => r.phone === seeing).sort((a, b) => b.startAt.localeCompare(a.startAt))
    : []

  const adjustText = (r: BookingRequest) =>
    `Oi ${r.clientName}, aqui é da Barbearia Tio Preto. Precisamos mexer na agenda do dia ${fmtDateTime(r.startAt)} e seu horário de ${serviceName(
      r.itemIds,
      menu,
    )} foi cancelado. Vamos ajustar: que horário fica bom para você?`

  const act = (fn: () => void, ok: string) => {
    try {
      fn()
      toast(ok)
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Algo deu errado.', 'error')
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="sign text-3xl">Clientes</h1>

      {adjust.length > 0 && (
        <section>
          <SectionTitle right={<Badge tone="danger">{adjust.length}</Badge>}>Horários para ajustar</SectionTitle>
          <div className="space-y-3">
            {adjust.map((r, i) => (
              <Appear key={r.id} i={i}>
                <Card className="space-y-3 border-danger/50 bg-danger/5">
                  <p className="flex items-start gap-2 text-sm text-danger">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    Horário cancelado automaticamente por mudança de horário no painel. O cliente já recebeu o aviso no
                    WhatsApp; este caso é exceção e você ajusta no particular.
                  </p>
                  <div>
                    <p className="sign text-lg leading-tight">{r.clientName}</p>
                    <p className="text-sm text-mute">
                      {prettyPhone(r.phone)} · {serviceName(r.itemIds, menu)}
                    </p>
                    <p className="mt-1 font-display text-lg font-bold text-gold">era {fmtDateTime(r.startAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <LinkBtn
                      variant="gold"
                      href={waLink(r.phone, adjustText(r))}
                      target="_blank"
                      rel="noreferrer"
                      className="!min-h-10 !px-3.5 !text-base"
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden /> Avisar no WhatsApp
                    </LinkBtn>
                    <Btn size="sm" variant="ghost" onClick={() => setMoving(r)}>
                      <CalendarClock className="h-4 w-4" aria-hidden /> Reagendar
                    </Btn>
                    <Btn size="sm" variant="quiet" onClick={() => act(() => api.resolveAdjust(r.id), 'Ajuste resolvido.')}>
                      Resolvido
                    </Btn>
                  </div>
                </Card>
              </Appear>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle>Quem já passou por aqui</SectionTitle>
        <p className="mb-3 text-sm text-mute">
          Identificados pelo WhatsApp. A cobrança da falta é por fora do sistema, direto com você.
        </p>
        <div className="space-y-3">
          {list.length === 0 && <EmptyState>Nenhum cliente ainda.</EmptyState>}
          {list.map((c, i) => {
            const blocked = blockedNumbers.includes(c.phone)
            return (
              <Appear key={c.phone} i={i}>
                <Card className={cx('space-y-3', blocked && 'border-danger/40')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="sign text-lg leading-tight">{c.name}</p>
                      <p className="truncate text-sm text-mute">
                        {prettyPhone(c.phone)} · {c.total} pedido{c.total > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                      {c.absences.length > 0 && (
                        <Badge tone="danger">
                          {c.absences.length} falta{c.absences.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {blocked && <Badge tone="danger">Bloqueado</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Btn size="sm" variant="ghost" onClick={() => setSeeing(c.phone)}>
                      <Eye className="h-4 w-4" aria-hidden /> Ver
                    </Btn>
                    <LinkBtn
                      href={waLink(c.phone, `Oi ${c.name}, aqui é da Barbearia Tio Preto. `)}
                      target="_blank"
                      rel="noreferrer"
                      className="!min-h-10 !px-3.5 !text-base"
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
                    </LinkBtn>
                    <Btn
                      size="sm"
                      variant={blocked ? 'quiet' : 'danger'}
                      onClick={() => {
                        api.setNumberBlocked(c.phone, !blocked)
                        toast(blocked ? 'Número desbloqueado.' : 'Número bloqueado. Esse cliente vai cair no seu WhatsApp.')
                      }}
                    >
                      {blocked ? <ShieldCheck className="h-4 w-4" aria-hidden /> : <Ban className="h-4 w-4" aria-hidden />}
                      {blocked ? 'Desbloquear' : 'Bloquear'}
                    </Btn>
                  </div>
                </Card>
              </Appear>
            )
          })}
        </div>
      </section>

      <Modal open={!!seeing} onClose={() => setSeeing(null)} title={client?.name ?? 'Cliente'}>
        {client && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-mute">
              <span>{prettyPhone(client.phone)}</span>
              <span>·</span>
              <span>
                {client.total} pedido{client.total > 1 ? 's' : ''}
              </span>
              {client.absences.length > 0 && (
                <Badge tone="danger">
                  {client.absences.length} falta{client.absences.length > 1 ? 's' : ''}
                </Badge>
              )}
              {blockedNumbers.includes(client.phone) && <Badge tone="danger">Bloqueado</Badge>}
            </div>

            <div className="space-y-3">
              {clientRequests.map((r) => {
                const total = priceOf(r.itemIds)
                return (
                  <div key={r.id} className="rounded-xl border border-line bg-coal/40 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="sign text-base leading-tight text-gold-strong">{fmtDateTime(r.startAt)}</p>
                        <p className="text-sm text-sand/90">{serviceName(r.itemIds, menu)}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-mute">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" aria-hidden /> {durationLabel(durationFor(r.itemIds))}
                          </span>
                          <span>
                            {total.from ? 'a partir de ' : ''}
                            {moneyShort(total.cents)}
                          </span>
                          <span>pedido em {fmtDateTime(r.createdAt)}</span>
                        </p>
                      </div>
                      <Badge tone={BADGE[r.status].tone}>{BADGE[r.status].label}</Badge>
                    </div>
                    {r.messages.length > 0 && (
                      <p className="mt-2 border-t border-line pt-2 text-xs text-mute">
                        Última mensagem: {r.messages[r.messages.length - 1].text}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            <LinkBtn
              variant="gold"
              href={waLink(client.phone, `Oi ${client.name}, aqui é da Barbearia Tio Preto. `)}
              target="_blank"
              rel="noreferrer"
              className="w-full"
            >
              <MessageCircle className="h-5 w-5" aria-hidden /> Falar no WhatsApp
            </LinkBtn>
          </div>
        )}
      </Modal>

      <Modal open={!!moving} onClose={() => setMoving(null)} title="Reagendar horário">
        {moving && (
          <SlotPicker
            itemIds={moving.itemIds}
            info={`${moving.clientName} · ${serviceName(moving.itemIds, menu)} · era ${fmtDateTime(moving.startAt)}`}
            onPick={(startAt) => {
              act(() => api.moveRequest(moving.id, startAt), 'Remarcado. O cliente recebeu o novo horário no WhatsApp.')
              setMoving(null)
            }}
            footer={
              <LinkBtn
                href={waLink(moving.phone, adjustText(moving))}
                target="_blank"
                rel="noreferrer"
                className="!min-h-10 w-full !px-3.5 !text-base"
              >
                <MessageCircle className="h-4 w-4" aria-hidden /> Avisar no WhatsApp
              </LinkBtn>
            }
          />
        )}
      </Modal>
    </div>
  )
}
