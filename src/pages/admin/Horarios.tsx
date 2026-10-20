import { AlertTriangle, CalendarOff, Megaphone, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Appear,
  Badge,
  Btn,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  SectionTitle,
  Segmented,
  Textarea,
  useToast,
} from '@/components/ui'
import { activeNotice, api, lastSlotFor } from '@/lib/api'
import { addDays, durationLabel, fmtDateTime, minutesOf, todayKey, weekdayLong } from '@/lib/format'
import { useAppState } from '@/lib/store'
import type { HourException, Settings, TimeRange } from '@/lib/types'

const sortRanges = (r: TimeRange[]) => [...r].sort((a, b) => a.start.localeCompare(b.start))

/** Faixas válidas: fim depois do início e sem sobreposição. */
function rangeError(ranges: TimeRange[]): string | null {
  const s = sortRanges(ranges)
  for (let i = 0; i < s.length; i++) {
    if (minutesOf(s[i].start) >= minutesOf(s[i].end)) return 'Cada faixa precisa terminar depois de começar.'
    if (i > 0 && minutesOf(s[i].start) < minutesOf(s[i - 1].end)) return 'Duas faixas estão se sobrepondo.'
  }
  return null
}

export default function Horarios() {
  const { settings, requests } = useAppState()
  const toast = useToast()
  const [notice, setNotice] = useState(settings.notice ?? '')
  const [rule, setRule] = useState(settings.absenceRule)
  const [deadline, setDeadline] = useState(String(settings.cancelDeadlineHours))
  const [weeks, setWeeks] = useState(String(settings.horizonWeeks))
  const [slot, setSlot] = useState(String(settings.slotMinutes))
  const [maxMin, setMaxMin] = useState(String(settings.maxServiceMinutes))
  const [editing, setEditing] = useState<HourException | null>(null)

  const noticeOn = !!activeNotice(settings)
  const adjustCount = requests.filter((r) => r.needsAdjust).length

  /** Salva avisando quantos horários marcados caíram. */
  const apply = (patch: Partial<Settings>, ok: string) => {
    const hit = api.saveSettings(patch)
    toast(hit ? `${ok} ${hit} horário${hit > 1 ? 's' : ''} marcado${hit > 1 ? 's' : ''} caiu fora: resolva em Clientes.` : ok, hit ? 'error' : 'ok')
  }

  const setDefaultRange = (i: number, k: keyof TimeRange, v: string) => {
    const next = settings.defaultHours.map((r, j) => (j === i ? { ...r, [k]: v } : r))
    const err = rangeError(next)
    if (err) return toast(err, 'error')
    apply({ defaultHours: sortRanges(next) }, 'Horário padrão salvo.')
  }

  const lastHints = [settings.slotMinutes, settings.maxServiceMinutes]
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((m) => ({ m, at: lastSlotFor(todayKey(), m, settings) }))
    .filter((x) => x.at)

  return (
    <div className="space-y-9">
      <h1 className="sign text-3xl">Horários e avisos</h1>

      {adjustCount > 0 && (
        <Card className="flex items-start gap-3 border-danger/40 bg-danger/5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
          <p className="text-sm text-sand">
            {adjustCount} horário{adjustCount > 1 ? 's' : ''} caiu por mudança de agenda e está esperando ajuste na aba{' '}
            <b className="text-gold">Clientes</b>.
          </p>
        </Card>
      )}

      <section className="space-y-3">
        <SectionTitle>Agenda aberta</SectionTitle>
        <Card className="space-y-3">
          <p className="text-sm text-mute">
            Quantas semanas para frente o cliente consegue escolher. É isso que aparece no site: “agenda aberta para as próximas{' '}
            {settings.horizonWeeks} semanas”.
          </p>
          <div className="flex items-end gap-3">
            <Field label="Semanas">
              <Input
                inputMode="numeric"
                value={weeks}
                onChange={(e) => setWeeks(e.target.value.replace(/\D/g, '').slice(0, 2))}
                className="max-w-24"
              />
            </Field>
            <Btn
              size="sm"
              onClick={() => {
                const w = Math.min(26, Math.max(1, parseInt(weeks, 10) || 1))
                setWeeks(String(w))
                apply({ horizonWeeks: w }, 'Agenda atualizada.')
              }}
            >
              Salvar
            </Btn>
          </div>
          <p className="text-sm text-gold">Hoje a agenda vai até {weekdayLong(addDays(todayKey(), settings.horizonWeeks * 7 - 1))}.</p>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionTitle>Horário padrão</SectionTitle>
        {settings.defaultHours.map((r, i) => (
          <div key={i} className="flex items-end gap-3">
            <Field label="Das">
              <Input type="time" value={r.start} onChange={(e) => setDefaultRange(i, 'start', e.target.value)} />
            </Field>
            <Field label="Até">
              <Input type="time" value={r.end} onChange={(e) => setDefaultRange(i, 'end', e.target.value)} />
            </Field>
            <Btn
              variant="quiet"
              aria-label="Remover faixa"
              onClick={() => apply({ defaultHours: settings.defaultHours.filter((_, j) => j !== i) }, 'Faixa removida.')}
            >
              <Trash2 className="h-5 w-5" />
            </Btn>
          </div>
        ))}
        <Btn
          size="sm"
          variant="ghost"
          onClick={() => apply({ defaultHours: sortRanges([...settings.defaultHours, { start: '14:00', end: '18:00' }]) }, 'Faixa criada.')}
        >
          <Plus className="h-4 w-4" aria-hidden /> Faixa de horário
        </Btn>
        {lastHints.length > 0 && (
          <Card className="text-sm text-mute">
            <p className="sign text-lg leading-none text-gold-strong">Até que hora o cliente consegue marcar</p>
            <ul className="mt-1 space-y-0.5">
              {lastHints.map((x) => (
                <li key={x.m}>
                  Atendimento de {durationLabel(x.m)}: último horário <b className="text-sand">{x.at}</b>.
                </li>
              ))}
            </ul>
            <p className="mt-1.5">O atendimento tem que terminar dentro da faixa, por isso o último horário não é a hora de fechar.</p>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <SectionTitle right={<Btn size="sm" variant="ghost" onClick={() => setEditing({ date: addDays(todayKey(), 1), ranges: [{ start: '09:00', end: '12:00' }] })}>
          <Plus className="h-4 w-4" aria-hidden /> Nova
        </Btn>}>
          Exceção por dia
        </SectionTitle>
        <p className="text-sm text-mute">Dia que foge do padrão: feriado, consulta, horário diferente. Pode ter mais de uma faixa.</p>
        {settings.hourExceptions.length === 0 && <EmptyState>Nenhuma exceção cadastrada.</EmptyState>}
        {settings.hourExceptions.map((e, i) => (
          <Appear key={e.date} i={i}>
            <Card className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="first-letter:uppercase">{weekdayLong(e.date)}</p>
                <p className="truncate text-sm text-gold">
                  {e.ranges.length ? e.ranges.map((r) => `${r.start}–${r.end}`).join(' e ') : 'Fechado o dia todo'}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Btn size="sm" variant="quiet" aria-label="Editar exceção" onClick={() => setEditing(e)}>
                  <Pencil className="h-5 w-5" />
                </Btn>
                <Btn
                  size="sm"
                  variant="quiet"
                  aria-label="Remover exceção"
                  onClick={() => apply({ hourExceptions: settings.hourExceptions.filter((x) => x.date !== e.date) }, 'Exceção removida.')}
                >
                  <Trash2 className="h-5 w-5" />
                </Btn>
              </div>
            </Card>
          </Appear>
        ))}
      </section>

      <section className="space-y-3">
        <SectionTitle right={noticeOn ? <Badge tone="gold">no ar hoje</Badge> : <Badge>fora do ar</Badge>}>Aviso de hoje</SectionTitle>
        <Field
          label="Aparece no topo do site"
          hint="Vale só para hoje: depois da meia-noite sai do ar sozinho. Deixe vazio para não mostrar nada."
        >
          <Textarea
            value={notice}
            onChange={(e) => setNotice(e.target.value)}
            placeholder="Ex.: hoje atendo até as 17h."
          />
        </Field>
        <div className="flex gap-2">
          <Btn
            size="sm"
            onClick={() => {
              const t = notice.trim()
              api.saveSettings({ notice: t || null, noticeDate: t ? todayKey() : null })
              toast(t ? 'Aviso no ar até a meia-noite.' : 'Aviso tirado do ar.')
            }}
          >
            <Megaphone className="h-4 w-4" aria-hidden /> Salvar aviso
          </Btn>
          {noticeOn && (
            <Btn
              size="sm"
              variant="quiet"
              onClick={() => {
                setNotice('')
                api.saveSettings({ notice: null, noticeDate: null })
                toast('Aviso tirado do ar.')
              }}
            >
              Tirar do ar
            </Btn>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>Regras</SectionTitle>
        <Field
          label="Avisar com quantas horas de antecedência"
          hint="Menos que isso, o valor do agendamento é cobrado. Vale para cancelar e remarcar pelo site."
        >
          <Input
            inputMode="numeric"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value.replace(/\D/g, '').slice(0, 3))}
            className="max-w-28"
          />
        </Field>
        <Field label="Regra de falta (o cliente lê antes de enviar)" hint="Use {h} onde entra o número de horas.">
          <Textarea value={rule} onChange={(e) => setRule(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tamanho do horário (min)" hint="A agenda é cortada nesse tamanho.">
            <Input inputMode="numeric" value={slot} onChange={(e) => setSlot(e.target.value.replace(/\D/g, '').slice(0, 3))} />
          </Field>
          <Field label="Atendimento máximo (min)" hint="Teto, mesmo juntando serviços.">
            <Input inputMode="numeric" value={maxMin} onChange={(e) => setMaxMin(e.target.value.replace(/\D/g, '').slice(0, 3))} />
          </Field>
        </div>
        <Btn
          size="sm"
          onClick={() => {
            const s = Math.min(120, Math.max(5, parseInt(slot, 10) || 30))
            const mx = Math.max(s, parseInt(maxMin, 10) || 60)
            setSlot(String(s))
            setMaxMin(String(mx))
            apply(
              {
                cancelDeadlineHours: Math.max(0, parseInt(deadline, 10) || 0),
                absenceRule: rule,
                slotMinutes: s,
                maxServiceMinutes: mx,
              },
              'Regras salvas.',
            )
          }}
        >
          Salvar regras
        </Btn>
      </section>

      <ExceptionModal exception={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function ExceptionModal({ exception, onClose }: { exception: HourException | null; onClose: () => void }) {
  const { settings } = useAppState()
  const toast = useToast()
  const [date, setDate] = useState(exception?.date ?? addDays(todayKey(), 1))
  const [mode, setMode] = useState<'custom' | 'closed'>(exception && exception.ranges.length === 0 ? 'closed' : 'custom')
  const [ranges, setRanges] = useState<TimeRange[]>(exception?.ranges.length ? exception.ranges : [{ start: '09:00', end: '12:00' }])

  // o modal é reusado: recarrega os campos quando troca a exceção editada
  useEffect(() => {
    if (!exception) return
    setDate(exception.date)
    setMode(exception.ranges.length === 0 ? 'closed' : 'custom')
    setRanges(exception.ranges.length ? exception.ranges : [{ start: '09:00', end: '12:00' }])
  }, [exception])

  const next: Settings = {
    ...settings,
    hourExceptions: [
      ...settings.hourExceptions.filter((e) => e.date !== date),
      { date, ranges: mode === 'closed' ? [] : sortRanges(ranges) },
    ].sort((a, b) => a.date.localeCompare(b.date)),
  }
  const hit = exception ? api.conflictsWith(next) : []

  const save = () => {
    if (mode === 'custom') {
      const err = rangeError(ranges)
      if (err) return toast(err, 'error')
    }
    const n = api.saveSettings({ hourExceptions: next.hourExceptions })
    toast(n ? `Exceção salva. ${n} horário${n > 1 ? 's' : ''} caiu fora: resolva em Clientes.` : 'Exceção salva.', n ? 'error' : 'ok')
    onClose()
  }

  return (
    <Modal open={!!exception} onClose={onClose} title="Exceção por dia">
      <div className="space-y-4">
        <Field label="Dia">
          <Input type="date" value={date} min={todayKey()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'custom', label: 'Horário diferente' },
            { value: 'closed', label: 'Fechado' },
          ]}
        />
        {mode === 'custom' && (
          <div className="space-y-3">
            {ranges.map((r, i) => (
              <div key={i} className="flex items-end gap-3">
                <Field label="Das">
                  <Input
                    type="time"
                    value={r.start}
                    onChange={(e) => setRanges(ranges.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))}
                  />
                </Field>
                <Field label="Até">
                  <Input
                    type="time"
                    value={r.end}
                    onChange={(e) => setRanges(ranges.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))}
                  />
                </Field>
                <Btn
                  variant="quiet"
                  aria-label="Remover faixa"
                  disabled={ranges.length === 1}
                  onClick={() => setRanges(ranges.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-5 w-5" />
                </Btn>
              </div>
            ))}
            <Btn size="sm" variant="ghost" onClick={() => setRanges([...ranges, { start: '13:00', end: '19:00' }])}>
              <Plus className="h-4 w-4" aria-hidden /> Outra faixa
            </Btn>
            <p className="text-xs text-mute">
              Duas faixas viram pausa no meio. Ex.: 10:00–12:00 e 13:00–19:00 fecha para o almoço.
            </p>
          </div>
        )}
        {mode === 'closed' && (
          <p className="flex items-center gap-2 text-sm text-mute">
            <CalendarOff className="h-4 w-4 text-gold" aria-hidden /> O dia sai do ar para o cliente.
          </p>
        )}
        {hit.length > 0 && (
          <div className="rounded-xl border border-danger/50 bg-danger/10 p-3 text-sm text-sand">
            <p className="flex items-center gap-2 font-semibold text-danger">
              <AlertTriangle className="h-4 w-4" aria-hidden /> {hit.length} horário{hit.length > 1 ? 's' : ''} marcado
              {hit.length > 1 ? 's ficam' : ' fica'} fora do novo horário
            </p>
            <ul className="mt-1.5 space-y-0.5 text-mute">
              {hit.slice(0, 5).map((r) => (
                <li key={r.id}>
                  {r.clientName} · {fmtDateTime(r.startAt)}
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-mute">
              Ao salvar, esses horários são cancelados e vão para a aba Clientes esperando seu ajuste.
            </p>
          </div>
        )}
        <Btn className="w-full" onClick={save}>
          Salvar exceção
        </Btn>
      </div>
    </Modal>
  )
}
