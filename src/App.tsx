import { HashRouter, Route, Routes } from 'react-router-dom'
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

export default function App() {
  return (
    <ToastProvider>
      <HashRouter>
        <Routes>
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
      </HashRouter>
    </ToastProvider>
  )
}
