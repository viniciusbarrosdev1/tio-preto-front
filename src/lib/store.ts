import { useSyncExternalStore } from 'react'
import menuFixture from '@contrato/fixtures/menu.json'
import requestsFixture from '@contrato/fixtures/requests.json'
import settingsFixture from '@contrato/fixtures/settings.json'
import { addDays, fmtTime, toSP, todayKey, weekdayLong } from './format'
import type { BookingRequest, MenuItem, RequestMessage, RequestStatus, Settings } from './types'

export interface TimeBlock {
  id: string
  startAt: string
  endAt: string
  reason?: string
}

export interface State {
  menu: MenuItem[]
  settings: Settings
  requests: BookingRequest[]
  blocks: TimeBlock[]
  blockedNumbers: string[]
}

const KEY = 'tio-preto-proto-v5'

export const uid = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`

export const token = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, '0')).join('')

/** Texto que a API do WhatsApp teria mandado nos pedidos de exemplo. */
const seedMessage = (status: string, itemIds: string[], startAt: string) => {
  const names = itemIds.map((id) => menuFixture.find((m) => m.id === id)?.name).filter(Boolean).join(' + ')
  const when = `${weekdayLong(startAt.slice(0, 10))} às ${fmtTime(startAt)}`
  if (status === 'faltou') return `Falta registrada no horário de ${when}.`
  return `Horário confirmado: ${names} · ${when}. Até lá!`
}

function seed(): State {
  const today = todayKey()
  const requests: BookingRequest[] = requestsFixture.map((r, i) => {
    const startAt = toSP(addDays(today, r.dayOffset), r.time)
    // cada pedido de exemplo chegou numa hora diferente, sempre antes do horário marcado
    const created = new Date(
      Math.min(Date.now() - (2 + i * 9) * 3600000, new Date(startAt).getTime() - (26 + i * 3) * 3600000),
    ).toISOString()
    const messages: RequestMessage[] = [{ at: created, text: 'Pedido de horário recebido. Em breve retornamos com a confirmação.' }]
    if (r.status !== 'pendente')
      messages.push({ at: created, text: seedMessage(r.status, r.itemIds, startAt) })
    return {
      id: r.id,
      token: token(),
      clientName: r.clientName,
      phone: r.phone,
      itemIds: r.itemIds,
      startAt,
      status: r.status as RequestStatus,
      createdAt: created,
      consentAcceptedAt: created,
      consentVersion: settingsFixture.consentVersion,
      messages,
    }
  })
  return {
    menu: menuFixture as MenuItem[],
    settings: settingsFixture as Settings,
    requests,
    blocks: [],
    blockedNumbers: [],
  }
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as State
      // protótipo: se o formato mudou, começa de novo em vez de quebrar a tela
      if (s?.settings?.horizonWeeks && Array.isArray(s.requests)) return s
    }
  } catch {
    /* storage indisponível: segue com o seed */
  }
  return seed()
}

let state: State = load()
const listeners = new Set<() => void>()

const persist = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* sem persistência */
  }
}

export const getState = () => state

export function setState(updater: (s: State) => State) {
  state = updater(state)
  persist()
  listeners.forEach((l) => l())
}

export function resetState() {
  state = seed()
  persist()
  listeners.forEach((l) => l())
}

export function useAppState() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
  )
}

// Sessão mock do dono
const SESSION = 'tio-preto-session'
const sessionListeners = new Set<() => void>()
export const isLogged = () => {
  try {
    return sessionStorage.getItem(SESSION) === '1'
  } catch {
    return false
  }
}
export const setLogged = (v: boolean) => {
  try {
    if (v) sessionStorage.setItem(SESSION, '1')
    else sessionStorage.removeItem(SESSION)
  } catch {
    /* ignora */
  }
  sessionListeners.forEach((l) => l())
}
export const useLogged = () =>
  useSyncExternalStore(
    (cb) => {
      sessionListeners.add(cb)
      return () => sessionListeners.delete(cb)
    },
    isLogged,
  )
