import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Btn, Card, Field, Input, Textarea, useToast } from '@/components/ui'
import { api } from '@/lib/api'
import { addDays, todayKey, weekdayLong } from '@/lib/format'
import { useAppState } from '@/lib/store'
import type { TimeRange } from '@/lib/types'

export default function Horarios() {
  const { settings } = useAppState()
  const toast = useToast()
  const [notice, setNotice] = useState(settings.notice ?? '')
  const [rule, setRule] = useState(settings.absenceRule)
  const [deadline, setDeadline] = useState(String(settings.cancelDeadlineHours))
  const [exDate, setExDate] = useState(addDays(todayKey(), 1))
  const [exMode, setExMode] = useState<'closed' | 'custom'>('custom')
  const [exStart, setExStart] = useState('09:00')
  const [exEnd, setExEnd] = useState('21:00')

  const setDefault = (i: number, k: keyof TimeRange, v: string) =>
    api.saveSettings({ defaultHours: settings.defaultHours.map((r, j) => (j === i ? { ...r, [k]: v } : r)) })

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-extrabold uppercase">Horários e avisos</h1>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold uppercase text-gold">Horário padrão</h2>
        {settings.defaultHours.map((r, i) => (
          <div key={i} className="flex items-end gap-3">
            <Field label="Das"><Input type="time" value={r.start} onChange={(e) => setDefault(i, 'start', e.target.value)} /></Field>
            <Field label="Até"><Input type="time" value={r.end} onChange={(e) => setDefault(i, 'end', e.target.value)} /></Field>
            <Btn variant="quiet" aria-label="Remover faixa" onClick={() => api.saveSettings({ defaultHours: settings.defaultHours.filter((_, j) => j !== i) })}><Trash2 className="h-5 w-5" /></Btn>
          </div>
        ))}
        <Btn size="sm" variant="ghost" onClick={() => api.saveSettings({ defaultHours: [...settings.defaultHours, { start: '14:00', end: '18:00' }] })}><Plus className="h-4 w-4" aria-hidden /> Faixa</Btn>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold uppercase text-gold">Exceção por dia</h2>
        <Card className="space-y-3">
          <Field label="Dia"><Input type="date" value={exDate} min={todayKey()} onChange={(e) => setExDate(e.target.value)} /></Field>
          <div className="flex gap-2">
            <Btn size="sm" variant={exMode === 'custom' ? 'gold' : 'ghost'} onClick={() => setExMode('custom')}>Horário diferente</Btn>
            <Btn size="sm" variant={exMode === 'closed' ? 'gold' : 'ghost'} onClick={() => setExMode('closed')}>Fechado</Btn>
          </div>
          {exMode === 'custom' && (
            <div className="flex gap-3">
              <Field label="Das"><Input type="time" value={exStart} onChange={(e) => setExStart(e.target.value)} /></Field>
              <Field label="Até"><Input type="time" value={exEnd} onChange={(e) => setExEnd(e.target.value)} /></Field>
            </div>
          )}
          <Btn size="sm" onClick={() => {
            if (exMode === 'custom' && exStart >= exEnd) return toast('O fim precisa ser depois do início.', 'error')
            const ranges = exMode === 'closed' ? [] : [{ start: exStart, end: exEnd }]
            api.saveSettings({ hourExceptions: [...settings.hourExceptions.filter((e) => e.date !== exDate), { date: exDate, ranges }].sort((a, b) => a.date.localeCompare(b.date)) })
            toast('Exceção salva.')
          }}>Salvar exceção</Btn>
        </Card>
        {settings.hourExceptions.map((e) => (
          <Card key={e.date} className="flex items-center justify-between">
            <div>
              <p className="first-letter:uppercase">{weekdayLong(e.date)}</p>
              <p className="text-sm text-gold">{e.ranges.length ? e.ranges.map((r) => `${r.start}–${r.end}`).join(' e ') : 'Fechado'}</p>
            </div>
            <Btn size="sm" variant="quiet" aria-label="Remover exceção" onClick={() => api.saveSettings({ hourExceptions: settings.hourExceptions.filter((x) => x.date !== e.date) })}><Trash2 className="h-5 w-5" /></Btn>
          </Card>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold uppercase text-gold">Aviso do dia</h2>
        <Field label="Aparece no topo do cardápio" hint="Deixe vazio para esconder."><Textarea value={notice} onChange={(e) => setNotice(e.target.value)} /></Field>
        <Btn size="sm" onClick={() => { api.saveSettings({ notice: notice.trim() || null }); toast('Aviso salvo.') }}>Salvar aviso</Btn>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold uppercase text-gold">Regras</h2>
        <Field label="Cancelar ou remarcar até (horas antes)"><Input inputMode="numeric" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
        <Field label="Regra de falta (mostrada ao cliente)"><Textarea value={rule} onChange={(e) => setRule(e.target.value)} /></Field>
        <Btn size="sm" onClick={() => { api.saveSettings({ cancelDeadlineHours: Math.max(0, parseInt(deadline, 10) || 0), absenceRule: rule }); toast('Regras salvas.') }}>Salvar regras</Btn>
      </section>
    </div>
  )
}
