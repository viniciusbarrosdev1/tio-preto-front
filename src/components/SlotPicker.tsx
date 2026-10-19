import { motion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { cx, spring } from '@/components/ui'
import { openDates, slotsFor } from '@/lib/api'
import { fmtTime, weekdayName } from '@/lib/format'
import { useAppState } from '@/lib/store'

/** Escolhe dia e horário respeitando a duração do atendimento. */
export default function SlotPicker({
  itemIds,
  info,
  initial,
  onPick,
  footer,
}: {
  itemIds: string[]
  info?: string
  initial?: string
  onPick: (startAt: string) => void
  footer?: ReactNode
}) {
  const { settings, requests } = useAppState()
  const dates = openDates(settings)
  const [d, setD] = useState(initial && dates.includes(initial) ? initial : (dates[0] ?? ''))
  // requests entra na conta para a grade recalcular quando a agenda muda
  const slots = d && requests ? slotsFor(d, itemIds) : []

  return (
    <div className="space-y-4">
      {info && <p className="text-sm text-mute">{info}</p>}
      <div className="strip">
        {dates.map((x) => (
          <motion.button
            key={x}
            type="button"
            whileTap={{ scale: 0.95 }}
            transition={spring}
            onClick={() => setD(x)}
            aria-pressed={d === x}
            className={cx(
              'flex min-w-16 shrink-0 cursor-pointer flex-col items-center rounded-xl border px-3 py-2',
              d === x ? 'border-gold bg-gold text-ink' : 'border-line bg-coal/30 hover:border-gold/50',
            )}
          >
            <span className="text-[11px] uppercase">{weekdayName(x).slice(0, 3)}</span>
            <span className="font-display text-xl font-bold">{x.slice(8)}</span>
          </motion.button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {slots.map((s) => (
          <motion.button
            key={s.startAt}
            type="button"
            disabled={!s.available}
            whileTap={{ scale: 0.94 }}
            transition={spring}
            onClick={() => onPick(s.startAt)}
            className="min-h-11 cursor-pointer rounded-xl border border-line bg-coal/40 font-display text-lg font-bold hover:border-gold disabled:cursor-not-allowed disabled:opacity-30 disabled:line-through"
          >
            {fmtTime(s.startAt)}
          </motion.button>
        ))}
      </div>
      {slots.length === 0 && <p className="text-sm text-mute">Nesse dia não cabe esse atendimento.</p>}
      {footer}
    </div>
  )
}
