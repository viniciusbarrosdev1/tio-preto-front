import { AnimatePresence, motion, type HTMLMotionProps } from 'motion/react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { Moon, Sun } from 'lucide-react'
import { fmtDateTime, maskMoney, maskPhone } from '@/lib/format'
import { toggleTheme, useTheme } from '@/lib/theme'

export const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ')

/** Claro é o padrão; a escolha fica guardada no aparelho de quem usa. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useTheme()
  const escuro = theme === 'escuro'
  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      whileTap={{ scale: 0.94 }}
      transition={spring}
      aria-label={escuro ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'}
      title={escuro ? 'Modo claro' : 'Modo escuro'}
      className={cx(
        'inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-line bg-panel text-mute hover:text-gold',
        className,
      )}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={theme}
          initial={{ opacity: 0, rotate: -40, scale: 0.8 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 40, scale: 0.8 }}
          transition={{ duration: 0.18 }}
          className="inline-flex"
        >
          {escuro ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}

export const spring = { type: 'spring', stiffness: 420, damping: 32, mass: 0.7 } as const

// ---------- botões ----------

type BtnProps = HTMLMotionProps<'button'> & {
  variant?: 'gold' | 'ghost' | 'danger' | 'quiet'
  size?: 'md' | 'sm'
  loading?: boolean
}

const btnBase =
  'relative inline-flex items-center justify-center gap-2 rounded-md font-display font-semibold uppercase tracking-[0.01em] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer select-none'

const variants = {
  gold: 'bg-gold-fill text-ink hover:brightness-95',
  ghost: 'border border-line bg-coal/40 text-sand hover:border-gold/70 hover:text-gold',
  quiet: 'text-mute hover:text-sand',
  danger: 'border border-danger/50 bg-danger/8 text-danger hover:bg-danger/15',
}

export function Btn({ variant = 'gold', size = 'md', loading, className, children, ...p }: BtnProps) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      transition={spring}
      {...p}
      disabled={p.disabled || loading}
      className={cx(btnBase, size === 'md' ? 'min-h-12 px-5 text-lg' : 'min-h-10 px-3.5 text-base', variants[variant], className)}
    >
      <AnimatePresence initial={false} mode="wait">
        {loading ? (
          <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-2">
            <Spinner /> Enviando
          </motion.span>
        ) : (
          <motion.span key="c" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-2">
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

export function LinkBtn({ variant = 'ghost', className, ...p }: HTMLMotionProps<'a'> & { variant?: 'gold' | 'ghost' }) {
  return (
    <motion.a
      whileTap={{ scale: 0.97 }}
      transition={spring}
      {...p}
      className={cx(btnBase, 'min-h-12 px-5 text-lg', variants[variant], className)}
    />
  )
}

export const Spinner = ({ className }: { className?: string }) => (
  <motion.span
    aria-hidden
    animate={{ rotate: 360 }}
    transition={{ repeat: Infinity, ease: 'linear', duration: 0.8 }}
    className={cx('inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent', className)}
  />
)

export const Loading = ({ label = 'Carregando' }: { label?: string }) => (
  <div className="flex items-center gap-3 py-8 text-mute" role="status">
    <Spinner /> {label}...
  </div>
)

// ---------- formulário ----------

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: ReactNode
  error?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-mute">{label}</span>
      {children}
      {hint && !error && <span className="mt-1.5 block text-xs leading-relaxed text-mute">{hint}</span>}
      <AnimatePresence>
        {error && (
          <motion.span
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-1.5 block text-sm text-danger"
          >
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </label>
  )
}

const inputCls =
  'w-full min-h-12 rounded-xl border border-line bg-coal px-3.5 text-base text-sand placeholder:text-mute/60 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20'

export const Input = ({ className, ...p }: ComponentProps<'input'>) => <input {...p} className={cx(inputCls, className)} />
export const Textarea = ({ className, ...p }: ComponentProps<'textarea'>) => (
  <textarea {...p} className={cx(inputCls, 'min-h-24 py-3', className)} />
)
export const Select = ({ className, ...p }: ComponentProps<'select'>) => <select {...p} className={cx(inputCls, className)} />

/** (44) 99999-9999 enquanto digita. */
export function PhoneInput({ value, onValue, ...p }: Omit<ComponentProps<'input'>, 'value' | 'onChange'> & { value: string; onValue: (v: string) => void }) {
  return (
    <Input
      {...p}
      value={value}
      onChange={(e) => onValue(maskPhone(e.target.value))}
      inputMode="tel"
      autoComplete="tel"
      maxLength={16}
      placeholder="(44) 99999-9999"
    />
  )
}

/** Dinheiro com máscara: digita 5000 e vira 50,00. */
export function MoneyInput({ value, onValue, ...p }: Omit<ComponentProps<'input'>, 'value' | 'onChange'> & { value: string; onValue: (v: string) => void }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-mute">R$</span>
      <Input
        {...p}
        value={value}
        onChange={(e) => onValue(maskMoney(e.target.value))}
        inputMode="numeric"
        placeholder="0,00"
        className="pl-10"
      />
    </div>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
    >
      <span className="text-sm text-sand">{label}</span>
      <span className={cx('flex h-7 w-12 shrink-0 items-center rounded-full border p-0.5', checked ? 'border-gold bg-gold/30' : 'border-line bg-coal')}>
        <motion.span layout transition={spring} className={cx('h-5 w-5 rounded-full', checked ? 'ml-auto bg-gold-fill' : 'bg-mute')} />
      </span>
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
}) {
  const id = useId()
  return (
    <div className="flex gap-1 rounded-xl border border-line bg-coal/60 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cx(
            'relative flex-1 cursor-pointer rounded-lg px-3 py-2 font-display text-base font-bold uppercase tracking-wide',
            value === o.value ? 'text-ink' : 'text-mute hover:text-sand',
          )}
        >
          {value === o.value && (
            <motion.span layoutId={`seg-${id}`} transition={spring} className="absolute inset-0 rounded-lg bg-gold-fill" />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

// ---------- superfícies ----------

export function Badge({ tone = 'mute', children }: { tone?: 'mute' | 'gold' | 'ok' | 'danger'; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold uppercase',
        tone === 'mute' && 'border-line text-mute',
        tone === 'gold' && 'border-gold/50 bg-gold/10 text-gold',
        tone === 'ok' && 'border-ok/50 bg-ok/10 text-ok',
        tone === 'danger' && 'border-danger/50 bg-danger/10 text-danger',
      )}
    >
      {children}
    </span>
  )
}

export const Card = ({ className, ...p }: HTMLMotionProps<'div'>) => (
  <motion.div {...p} className={cx('lift rounded-lg border border-line bg-panel p-4', className)} />
)

/** Entrada em cascata para listas. */
export const Appear = ({ i = 0, className, ...p }: HTMLMotionProps<'div'> & { i?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    {...p}
    className={className}
  />
)

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="sign text-2xl leading-none text-sand">{children}</h2>
      {right}
    </div>
  )
}

export const EmptyState = ({ children }: { children: ReactNode }) => (
  <Card className="text-sm text-mute">{children}</Card>
)

// ---------- toast ----------

type ToastTone = 'ok' | 'error'
const ToastCtx = createContext<(msg: string, tone?: ToastTone) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<{ msg: string; tone: ToastTone; id: number }[]>([])
  const show = useCallback((msg: string, tone: ToastTone = 'ok') => {
    const id = Date.now() + Math.random()
    setList((c) => [...c, { msg, tone, id }].slice(-3))
    setTimeout(() => setList((c) => c.filter((t) => t.id !== id)), 3600)
  }, [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {list.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={spring}
              className={cx(
                'lift pointer-events-auto max-w-sm rounded-xl border px-4 py-3 text-sm',
                t.tone === 'ok' ? 'border-gold/50 bg-panel text-sand' : 'border-danger/60 bg-panel text-danger',
              )}
            >
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}

// ---------- modal ----------

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-end justify-center bg-[#16110e]/70 backdrop-blur-sm sm:items-center"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={spring}
            onClick={(e) => e.stopPropagation()}
            className="lift max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-xl border border-line bg-panel p-5 pb-8 sm:rounded-xl sm:pb-5"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="sign text-2xl text-sand">{title}</h2>
              <button onClick={onClose} aria-label="Fechar" className="cursor-pointer rounded-lg p-2 text-mute hover:bg-coal hover:text-sand">
                ✕
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---------- fotos ----------

/** Foto do item. Clicou, vai para a próxima. */
export function Gallery({ photos, alt, className }: { photos: string[]; alt: string; className?: string }) {
  const [i, setI] = useState(0)
  if (!photos.length) return null
  const next = () => setI((v) => (v + 1) % photos.length)
  return (
    <button
      type="button"
      onClick={next}
      aria-label={photos.length > 1 ? `${alt} — foto ${i + 1} de ${photos.length}, toque para ver a próxima` : alt}
      className={cx('relative shrink-0 cursor-pointer overflow-hidden rounded-xl border border-line bg-coal', className)}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.img
          key={photos[i]}
          src={photos[i]}
          alt=""
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="h-full w-full object-cover"
        />
      </AnimatePresence>
      {photos.length > 1 && (
        <>
          <span className="absolute right-1 top-1 rounded bg-[#16110e]/75 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {i + 1}/{photos.length}
          </span>
          <span className="absolute inset-x-0 bottom-1.5 flex justify-center gap-1">
            {photos.map((p, j) => (
              <span key={p} className={cx('h-1.5 w-4 rounded-full', j === i ? 'bg-gold-fill' : 'bg-white/50')} />
            ))}
          </span>
        </>
      )}
    </button>
  )
}

/**
 * Quem avisa o cliente é a API do WhatsApp, sozinha, a cada mudança de estado.
 * O botão de falar é exceção: só quando o dono precisa resolver na mão.
 */
export function WaNotice({
  text,
  at,
  href,
  cta = 'Falar no WhatsApp',
}: {
  text?: string
  at?: string
  href?: string
  cta?: string
}) {
  return (
    <div className="rounded-xl border border-line/70 bg-coal/50 p-2.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ok">
        <span aria-hidden className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-ok/60 text-[10px]">
          ✓
        </span>
        WhatsApp enviado {at && <span className="font-normal normal-case tracking-normal text-mute">· {fmtDateTime(at)}</span>}
      </p>
      {text && <p className="mt-1 text-xs leading-snug text-mute">“{text}”</p>}
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex min-h-9 items-center text-xs font-semibold text-gold underline underline-offset-2 hover:text-sand"
        >
          {cta}
        </a>
      )}
    </div>
  )
}

export function Wordmark({ small }: { small?: boolean }) {
  return (
    <div className="leading-none">
      <div className={cx('sign text-gold', small ? 'text-2xl' : 'text-6xl')}>Tio Preto</div>
      <div className={cx('font-display font-medium uppercase text-sand/70', small ? 'mt-0.5 text-[11px]' : 'mt-1.5 text-sm')}>
        Barbearia
      </div>
    </div>
  )
}
