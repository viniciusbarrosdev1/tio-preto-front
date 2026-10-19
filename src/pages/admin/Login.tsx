import { motion } from 'motion/react'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Btn, Card, Field, Input, Wordmark } from '@/components/ui'
import { api } from '@/lib/api'
import { useLogged } from '@/lib/store'
import { ApiError } from '@/lib/types'

export default function Login() {
  const logged = useLogged()
  const nav = useNavigate()
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  if (logged) return <Navigate to="/admin" replace />

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Wordmark />
        <p className="mt-2 text-sm uppercase tracking-[0.25em] text-mute">Painel do dono</p>
      </motion.div>
      <form
        className="mt-10 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setErr('')
          try {
            await api.login(u, p)
            nav('/admin')
          } catch (x) {
            setErr(x instanceof ApiError ? x.message : 'Erro ao entrar.')
          } finally {
            setBusy(false)
          }
        }}
      >
        <Field label="Usuário">
          <Input value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" autoCapitalize="none" />
        </Field>
        <Field label="Senha" error={err}>
          <Input type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" />
        </Field>
        <Btn type="submit" loading={busy} className="w-full">
          Entrar
        </Btn>
      </form>
      <Card className="mt-8 text-sm text-mute">
        Protótipo: entre com <b className="text-sand">tio</b> / <b className="text-sand">preto123</b>. Os dados ficam só neste navegador.
      </Card>
      <a href="#/" className="mt-6 text-center text-sm text-mute underline-offset-2 hover:text-gold hover:underline">
        Ver o site do cliente
      </a>
    </div>
  )
}
