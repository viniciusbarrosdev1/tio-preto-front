import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { ToastProvider } from '@/components/ui'
import Agendar from '@/pages/Agendar'
import Menu from '@/pages/Menu'
import Pedido from '@/pages/Pedido'
import AdminLayout from '@/pages/admin/AdminLayout'
import Agenda from '@/pages/admin/Agenda'
import Cardapio from '@/pages/admin/Cardapio'
import Clientes from '@/pages/admin/Clientes'
import Horarios from '@/pages/admin/Horarios'
import Login from '@/pages/admin/Login'
import Pedidos from '@/pages/admin/Pedidos'

/** O painel troca de aba por dentro: a casca não refaz a transição. */
const groupKey = (path: string) => (path.startsWith('/admin') && path !== '/admin/login' ? 'admin' : path)

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={groupKey(location.pathname)}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      >
        <Routes location={location}>
          <Route path="/" element={<Menu />} />
          <Route path="/agendar" element={<Agendar />} />
          <Route path="/pedido/:token" element={<Pedido />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Pedidos />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="cardapio" element={<Cardapio />} />
            <Route path="horarios" element={<Horarios />} />
            <Route path="clientes" element={<Clientes />} />
          </Route>
          <Route path="*" element={<Menu />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <HashRouter>
          <AnimatedRoutes />
        </HashRouter>
      </ToastProvider>
    </MotionConfig>
  )
}
