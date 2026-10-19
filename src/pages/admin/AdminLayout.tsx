import { CalendarDays, ClipboardList, Clock, LogOut, Store, Users } from 'lucide-react'
import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { Wordmark } from '@/components/ui'
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
  if (!logged) return <Navigate to="/admin/login" replace />
  const pending = requests.filter((r) => r.status === 'pendente' || r.rescheduleStartAt).length

  return (
    <div className="mx-auto min-h-dvh max-w-3xl pb-24">
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <NavLink to="/"><Wordmark small /></NavLink>
        <div className="flex items-center gap-3 text-sm text-mute">
          <button
            onClick={() => {
              if (confirm('Voltar os dados de teste ao início?')) resetState()
            }}
            className="cursor-pointer underline-offset-2 hover:text-gold hover:underline"
          >
            Resetar dados
          </button>
          <button onClick={() => api.logout()} className="inline-flex cursor-pointer items-center gap-1 hover:text-gold">
            <LogOut className="h-4 w-4" aria-hidden /> Sair
          </button>
        </div>
      </header>
      <main className="px-5 py-6">
        <Outlet />
      </main>
      <nav aria-label="Painel" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/95 backdrop-blur">
        <ul className="mx-auto flex max-w-3xl">
          {tabs.map(({ to, label, Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${isActive ? 'text-gold' : 'text-mute hover:text-sand'}`
                }
              >
                <Icon className="h-5 w-5" aria-hidden />
                {label}
                {label === 'Pedidos' && pending > 0 && (
                  <span className="absolute right-[28%] top-2 min-w-4 rounded-full bg-gold px-1 text-center text-[10px] font-bold text-ink">{pending}</span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
