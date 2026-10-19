import { useSyncExternalStore } from 'react'
import menuFixture from '@contrato/fixtures/menu.json'
import requestsFixture from '@contrato/fixtures/requests.json'
import settingsFixture from '@contrato/fixtures/settings.json'
import { addDays, toSP, todayKey } from './format'
import type { BookingRequest, MenuItem, RequestStatus, Settings } from './types'

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

const KEY = 'tio-preto-proto-v1'

export const uid = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`

export const token = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, '0')).join('')

function seed(): State {
  const today = todayKey()
  const requests: BookingRequest[] = requestsFixture.map((r) => ({
    id: r.id,
    token: token(),
    clientName: r.clientName,
    phone: r.phone,
    itemId: r.itemId,
    startAt: toSP(addDays(today, r.dayOffset), r.time),
    status: r.status as RequestStatus,
    createdAt: new Date().toISOString(),
    consentAcceptedAt: new Date().toISOString(),
    consentVersion: settingsFixture.consentVersion,
  }))
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
    if (raw) return JSON.parse(raw) as State
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
