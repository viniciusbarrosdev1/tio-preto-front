import { Lock, MessageCircle, Plus } from 'lucide-react'
import { useState } from 'react'
import { Badge, Btn, Card, Field, Input, LinkBtn, Modal, Select, useToast } from '@/components/ui'
import { api, bookableDates, hoursFor, slotsFor } from '@/lib/api'
import { addDays, dateKey, fmtDateTime, fmtTime, prettyPhone, todayKey, waLink, weekdayLong } from '@/lib/format'
import { useAppState } from '@/lib/store'
import { ApiError } from '@/lib/types'

export default function Agenda() {
  const { requests, menu, blocks, settings } = useAppState()
  const toast = useToast()
  const [date, setDate] = useState(todayKey())
  const [manual, setManual] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', itemId: menu[0]?.id ?? '', startAt: '' })

  const day = requests
    .filter((r) => r.status === 'confirmado' && dateKey(r.startAt) === date)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
  const dayBlocks = blocks.filter((b) => dateKey(b.startAt) === date).sort((a, b) => a.startAt.localeCompare(b.startAt))
  const hasHours = hoursFor(date, settings).length > 0
  const itemName = (id: string) => menu.find((m) => m.id === id)?.name ?? 'Serviço'
  const link = (token: string) => `${location.origin}${location.pathname}#/pedido/${token}`

  async function saveManual() {
    try {
      await api.createRequest({ clientName: form.name, phone: form.phone, itemId: form.itemId, startAt: form.startAt, consent: true, manual: true })
      toast('Cadastrado na agenda.')
      setManual(false)
      setForm({ ...form, name: '', phone: '', startAt: '' })
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Erro', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold uppercase">Agenda</h1>
        <Btn size="sm" onClick={() => setManual(true)}><Plus className="h-4 w-4" aria-hidden /> Cadastrar cliente</Btn>
      </div>

      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {[addDays(todayKey(), 0), ...bookableDates().slice(1)].map((d) => {
          const dt = new Date(`${d}T12:00:00-03:00`)
          const n = requests.filter((r) => r.status === 'confirmado' && dateKey(r.startAt) === d).length
          return (
            <button key={d} onClick={() => setDate(d)} aria-pressed={date === d}
              className={`relative flex min-w-16 shrink-0 cursor-pointer flex-col items-center rounded-lg border px-3 py-2 ${date === d ? 'border-gold bg-gold text-ink' : 'border-line'}`}>
              <span className="text-xs uppercase">{dt.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'America/Sao_Paulo' }).replace('.', '')}</span>
              <span className="font-display text-2xl font-bold">{dt.toLocaleDateString('pt-BR', { day: '2-digit', timeZone: 'America/Sao_Paulo' })}</span>
              {n > 0 && <span className={`text-[10px] font-bold ${date === d ? 'text-ink' : 'text-gold'}`}>{n} marcado{n > 1 ? 's' : ''}</span>}
            </button>
          )
        })}
      </div>

      <p className="first-letter:uppercase text-mute">{weekdayLong(date)}</p>
      {!hasHours && <Card className="text-mute">Fechado nesse dia.</Card>}

      <div className="space-y-3">
        {day.map((r) => (
          <Card key={r.id} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl font-bold uppercase">{fmtTime(r.startAt)} · {r.clientName}</p>
                <p className="text-sm text-mute">{prettyPhone(r.phone)} · {itemName(r.itemId)}</p>
              </div>
              <Badge tone="ok">Confirmado</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <LinkBtn href={waLink(r.phone, `Oi ${r.clientName}, tudo bem? Confirmando seu horário na Barbearia Tio Preto: ${fmtDateTime(r.startAt)}. Para cancelar ou remarcar: ${link(r.token)}`)} target="_blank" rel="noreferrer" className="!min-h-10 !text-base">
                <MessageCircle className="h-4 w-4" aria-hidden /> Avisar
              </LinkBtn>
              <Btn size="sm" variant="danger" onClick={() => { api.transition(r.id, 'faltou'); toast('Falta registrada.') }}>Faltou</Btn>
              <Btn size="sm" variant="quiet" onClick={() => { api.transition(r.id, 'cancelado'); toast('Cancelado.') }}>Cancelar</Btn>
            </div>
          </Card>
        ))}
        {dayBlocks.map((b) => (
          <Card key={b.id} className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Lock className="h-4 w-4 text-gold" aria-hidden /> Bloqueado {fmtTime(b.startAt)}–{fmtTime(b.endAt)}</span>
            <Btn size="sm" variant="quiet" onClick={() => api.removeBlock(b.id)}>Liberar</Btn>
          </Card>
        ))}
        {hasHours && day.length === 0 && dayBlocks.length === 0 && <Card className="text-mute">Nada marcado nesse dia.</Card>}
      </div>

      {hasHours && (
        <section>
          <h2 className="mb-2 font-display text-lg font-bold uppercase text-gold">Bloquear horário</h2>
          <div className="flex flex-wrap gap-2">
            {slotsFor(date, menu[0]?.id ?? '').filter((s) => s.available).map((s) => (
              <button key={s.startAt} onClick={() => { api.addBlock(s.startAt); toast('Horário bloqueado.') }}
                className="min-h-10 cursor-pointer rounded-lg border border-line px-3 font-display text-lg font-bold hover:border-gold">
                {fmtTime(s.startAt)}
              </button>
            ))}
          </div>
        </section>
      )}

      <Modal open={manual} onClose={() => setManual(false)} title="Cadastrar cliente">
        <div className="space-y-4">
          <Field label="Nome"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="WhatsApp"><Input inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(44) 99999-9999" /></Field>
          <Field label="Serviço">
            <Select value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value, startAt: '' })}>
              {menu.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
          <Field label={`Horário (${weekdayLong(date)})`}>
            <Select value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })}>
              <option value="">Escolha</option>
              {slotsFor(date, form.itemId).filter((s) => s.available).map((s) => <option key={s.startAt} value={s.startAt}>{fmtTime(s.startAt)}</option>)}
            </Select>
          </Field>
          <Btn className="w-full" onClick={saveManual}>Salvar na agenda</Btn>
        </div>
      </Modal>
    </div>
  )
}
