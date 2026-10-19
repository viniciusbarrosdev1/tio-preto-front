import { Badge, Btn, Card } from '@/components/ui'
import { api } from '@/lib/api'
import { fmtDateTime, prettyPhone } from '@/lib/format'
import { useAppState } from '@/lib/store'

export default function Clientes() {
  const { requests, blockedNumbers } = useAppState()
  const map = new Map<string, { name: string; phone: string; absences: string[]; total: number }>()
  for (const r of requests) {
    const c = map.get(r.phone) ?? { name: r.clientName, phone: r.phone, absences: [], total: 0 }
    c.total += 1
    if (r.status === 'faltou') c.absences.push(r.startAt)
    c.name = r.clientName
    map.set(r.phone, c)
  }
  const list = [...map.values()].sort((a, b) => b.absences.length - a.absences.length || a.name.localeCompare(b.name))

  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-extrabold uppercase">Clientes</h1>
      <p className="text-sm text-mute">Identificados pelo WhatsApp. A cobrança da falta é por fora do sistema.</p>
      <div className="space-y-3">
        {list.map((c) => {
          const blocked = blockedNumbers.includes(c.phone)
          return (
            <Card key={c.phone} className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-bold uppercase">{c.name}</p>
                  <p className="text-sm text-mute">{prettyPhone(c.phone)} · {c.total} pedido{c.total > 1 ? 's' : ''}</p>
                </div>
                <div className="flex gap-1.5">
                  {c.absences.length > 0 && <Badge tone="danger">{c.absences.length} falta{c.absences.length > 1 ? 's' : ''}</Badge>}
                  {blocked && <Badge tone="danger">Bloqueado</Badge>}
                </div>
              </div>
              {c.absences.length > 0 && (
                <ul className="text-sm text-mute">{c.absences.map((a) => <li key={a}>Faltou em {fmtDateTime(a)}</li>)}</ul>
              )}
              <Btn size="sm" variant={blocked ? 'ghost' : 'danger'} onClick={() => api.setNumberBlocked(c.phone, !blocked)}>
                {blocked ? 'Desbloquear número' : 'Bloquear número'}
              </Btn>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
