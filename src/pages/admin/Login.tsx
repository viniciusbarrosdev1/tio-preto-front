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
  if (logged) return <Navigate to="/admin" replace />

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5">
      <Wordmark />
      <form
        className="mt-10 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          try {
            await api.login(u, p)
            nav('/admin')
          } catch (x) {
            setErr(x instanceof ApiError ? x.message : 'Erro ao entrar.')
          }
        }}
      >
        <Field label="Usuário"><Input value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" autoCapitalize="none" /></Field>
        <Field label="Senha" error={err}><Input type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" /></Field>
        <Btn type="submit" className="w-full">Entrar</Btn>
      </form>
      <Card className="mt-8 text-sm text-mute">
        Protótipo: use <b className="text-sand">tio</b> / <b className="text-sand">preto123</b>. Os dados ficam só neste navegador.
      </Card>
    </div>
  )
}
