import { createContext, useCallback, useContext, useState, type ComponentProps, type ReactNode } from 'react'

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')

type BtnProps = ComponentProps<'button'> & { variant?: 'gold' | 'ghost' | 'danger' | 'quiet'; size?: 'md' | 'sm' }

export function Btn({ variant = 'gold', size = 'md', className, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-display font-bold uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer',
        size === 'md' ? 'min-h-12 px-5 text-lg' : 'min-h-10 px-3.5 text-base',
        variant === 'gold' && 'bg-gold text-ink hover:bg-[#e2b95f]',
        variant === 'ghost' && 'border border-line text-sand hover:border-gold hover:text-gold',
        variant === 'quiet' && 'text-mute hover:text-sand',
        variant === 'danger' && 'border border-danger/50 text-danger hover:bg-danger/10',
        className,
      )}
    />
  )
}

export function LinkBtn({ variant = 'ghost', className, ...p }: ComponentProps<'a'> & { variant?: 'gold' | 'ghost' }) {
  return (
    <a
      {...p}
      className={cx(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-5 font-display text-lg font-bold uppercase tracking-wide',
        variant === 'gold' ? 'bg-gold text-ink hover:bg-[#e2b95f]' : 'border border-line text-sand hover:border-gold hover:text-gold',
        className,
      )}
    />
  )
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-mute">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-mute">{hint}</span>}
      {error && <span role="alert" className="mt-1 block text-sm text-danger">{error}</span>}
    </label>
  )
}

const inputCls =
  'w-full min-h-12 rounded-lg border border-line bg-coal px-3.5 text-base text-sand placeholder:text-mute/60 focus:border-gold focus:outline-none'

export const Input = (p: ComponentProps<'input'>) => <input {...p} className={cx(inputCls, p.className)} />
export const Textarea = (p: ComponentProps<'textarea'>) => (
  <textarea {...p} className={cx(inputCls, 'min-h-24 py-3', p.className)} />
)
export const Select = (p: ComponentProps<'select'>) => <select {...p} className={cx(inputCls, p.className)} />

export function Badge({ tone = 'mute', children }: { tone?: 'mute' | 'gold' | 'ok' | 'danger'; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide',
        tone === 'mute' && 'border-line text-mute',
        tone === 'gold' && 'border-gold/50 text-gold',
        tone === 'ok' && 'border-ok/50 text-ok',
        tone === 'danger' && 'border-danger/50 text-danger',
      )}
    >
      {children}
    </span>
  )
}

export const Card = ({ className, ...p }: ComponentProps<'div'>) => (
  <div {...p} className={cx('rounded-xl border border-line bg-panel p-4', className)} />
)

// Toast simples
const ToastCtx = createContext<(msg: string, tone?: 'ok' | 'error') => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ msg: string; tone: 'ok' | 'error'; id: number } | null>(null)
  const show = useCallback((msg: string, tone: 'ok' | 'error' = 'ok') => {
    const id = Date.now()
    setT({ msg, tone, id })
    setTimeout(() => setT((c) => (c?.id === id ? null : c)), 3200)
  }, [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4">
        {t && (
          <div
            className={cx(
              'pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-xl',
              t.tone === 'ok' ? 'border-gold/50 bg-coal text-sand' : 'border-danger/60 bg-coal text-danger',
            )}
          >
            {t.msg}
          </div>
        )}
      </div>
    </ToastCtx.Provider>
  )
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-line bg-panel p-5 sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold uppercase text-gold">{title}</h2>
          <button onClick={onClose} aria-label="Fechar" className="cursor-pointer p-2 text-mute hover:text-sand">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Wordmark({ small }: { small?: boolean }) {
  return (
    <div className="leading-none">
      <div className={cx('font-display font-extrabold uppercase tracking-[0.08em] text-gold', small ? 'text-xl' : 'text-5xl')}>
        Tio Preto
      </div>
      <div className={cx('font-display font-semibold uppercase tracking-[0.35em] text-sand/70', small ? 'text-[10px]' : 'text-sm mt-1')}>
        Barbearia
      </div>
    </div>
  )
}
