import { CalendarDays, ClipboardList, Clock, ExternalLink, LogOut, RotateCcw, Store, Users } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Wordmark, cx, spring } from '@/components/ui'
import { api } from '@/lib/api'
import { resetState, useAppState, useLogged } from '@/lib/store'

const tabs = [
  { to: '/admin', end: true, label: 'Pedidos', Icon: ClipboardList },
  { to: '/admin/agenda', label: 'Agenda', Icon: CalendarDays },
  { to: '/admin/cardapio', label: 'Cardápio', Icon: Store },
  { to: '/admin/horarios', label: 'Horários', Icon: Clock },
  { to: '/admin/clientes', label: 'Clientes', Icon: Users },
]

export default function AdminLayout() {
  const logged = useLogged()
  const { requests } = useAppState()
  const location = useLocation()
  if (!logged) return <Navigate to="/admin/login" replace />

  const counts: Record<string, number> = {
    Pedidos: requests.filter((r) => r.status === 'pendente' || r.rescheduleStartAt).length,
    Clientes: requests.filter((r) => r.needsAdjust).length,
  }

  return (
    <div className="mx-auto min-h-dvh max-w-3xl pb-28">
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <Wordmark small />
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-mute">Painel do dono</p>
        </div>
        <div className="flex items-center gap-1 text-sm text-mute">
          <a href="#/" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 hover:bg-coal hover:text-gold" title="Ver o site do cliente">
            <ExternalLink className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Ver site</span>
          </a>
          <button
            onClick={() => {
              if (confirm('Voltar os dados de teste ao início?')) resetState()
            }}
            className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 hover:bg-coal hover:text-gold"
            title="Resetar dados do protótipo"
          >
            <RotateCcw className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Resetar</span>
          </button>
          <button
            onClick={() => api.logout()}
            className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 hover:bg-coal hover:text-gold"
          >
            <LogOut className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <main className="px-5 py-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <nav aria-label="Painel" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/95 backdrop-blur">
        <ul className="mx-auto flex max-w-3xl">
          {tabs.map(({ to, label, Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cx(
                    'relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium',
                    isActive ? 'text-gold' : 'text-mute hover:text-sand',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span layoutId="tab-bar" transition={spring} className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-gold" />
                    )}
                    <Icon className="h-5 w-5" aria-hidden />
                    {label}
                    {counts[label] > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={spring}
                        className="absolute right-[26%] top-2 min-w-4 rounded-full bg-gold px-1 text-center text-[10px] font-bold text-ink"
                      >
                        {counts[label]}
                      </motion.span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
