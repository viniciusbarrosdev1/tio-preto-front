import { addDays, dateKey, normalizePhone, toSP, todayKey } from './format'
import { getState, setLogged, setState, token, uid } from './store'
import {
  ApiError,
  type BookingRequest,
  type MenuItem,
  type RequestStatus,
  type Settings,
  type Slot,
  type TimeRange,
} from './types'

const wait = <T,>(v: T) => new Promise<T>((res) => setTimeout(() => res(v), 120))

const HORIZON_DAYS = 14
const STEP_MIN = 60

const ALLOWED: Record<RequestStatus, RequestStatus[]> = {
  pendente: ['confirmado', 'recusado', 'outro_horario_proposto', 'cancelado'],
  outro_horario_proposto: ['confirmado', 'cancelado'],
  confirmado: ['cancelado', 'faltou'],
  recusado: [],
  cancelado: [],
  faltou: [],
}

export const canTransition = (from: RequestStatus, to: RequestStatus) => ALLOWED[from].includes(to)

const mins = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function hoursFor(date: string, s: Settings = getState().settings): TimeRange[] {
  const ex = s.hourExceptions.find((e) => e.date === date)
  return ex ? ex.ranges : s.defaultHours
}

const itemDuration = (itemId: string) =>
  getState().menu.find((m) => m.id === itemId)?.durationMinutes ?? 60

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
  aStart < bEnd && bStart < aEnd

/** Só "confirmado" e bloqueio ocupam horário. Pendente não segura. */
export function isFree(startAt: string, durationMin: number, ignoreId?: string): boolean {
  const start = new Date(startAt).getTime()
  const end = start + durationMin * 60000
  const { requests, blocks } = getState()
  const busyByRequest = requests.some(
    (r) =>
      r.id !== ignoreId &&
      r.status === 'confirmado' &&
      overlaps(start, end, new Date(r.startAt).getTime(), new Date(r.startAt).getTime() + itemDuration(r.itemId) * 60000),
  )
  const busyByBlock = blocks.some((b) =>
    overlaps(start, end, new Date(b.startAt).getTime(), new Date(b.endAt).getTime()),
  )
  return !busyByRequest && !busyByBlock
}

export function withinHours(startAt: string, durationMin: number): boolean {
  const date = dateKey(startAt)
  const startMin = mins(
    new Date(startAt).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    }),
  )
  return hoursFor(date).some((r) => startMin >= mins(r.start) && startMin + durationMin <= mins(r.end))
}

export function slotsFor(date: string, itemId: string): Slot[] {
  const dur = itemDuration(itemId)
  const out: Slot[] = []
  for (const r of hoursFor(date)) {
    for (let t = mins(r.start); t + dur <= mins(r.end); t += STEP_MIN) {
      const hh = String(Math.floor(t / 60)).padStart(2, '0')
      const mm = String(t % 60).padStart(2, '0')
      const startAt = toSP(date, `${hh}:${mm}`)
      const future = new Date(startAt).getTime() > Date.now()
      out.push({ startAt, available: future && isFree(startAt, dur) })
    }
  }
  return out
}

export const bookableDates = () => {
  const t = todayKey()
  return Array.from({ length: HORIZON_DAYS + 1 }, (_, i) => addDays(t, i))
}

export const cancelDeadlineAt = (r: BookingRequest) =>
  new Date(new Date(r.startAt).getTime() - getState().settings.cancelDeadlineHours * 3600000).toISOString()

// ---------- público ----------

export const api = {
  async publicMenu() {
    const { menu, settings } = getState()
    return wait({
      items: menu.filter((m) => m.visible),
      settings,
    })
  },

  async slots(date: string, itemId: string) {
    return wait(slotsFor(date, itemId))
  },

  async createRequest(input: {
    clientName: string
    phone: string
    itemId: string
    startAt: string
    consent: boolean
    honeypot?: string
    manual?: boolean
  }) {
    const s = getState().settings
    if (input.honeypot) return wait({ token: token() } as { token: string })
    const phone = normalizePhone(input.phone)
    const name = input.clientName.trim()
    if (name.length < 2)
      throw new ApiError('VALIDATION_ERROR', 400, 'Informe seu nome.', { field: 'clientName' })
    if (!phone)
      throw new ApiError('VALIDATION_ERROR', 400, 'Informe um WhatsApp válido com DDD.', { field: 'phone' })
    if (!input.consent && !input.manual)
      throw new ApiError('VALIDATION_ERROR', 400, 'Você precisa aceitar o uso dos seus dados.', {
        field: 'consent',
      })
    if (!input.manual && getState().blockedNumbers.includes(phone))
      throw new ApiError(
        'REQUEST_NOT_ACCEPTED',
        422,
        'Não conseguimos receber o pedido por aqui. Fale direto pelo WhatsApp.',
      )
    const dur = itemDuration(input.itemId)
    if (!withinHours(input.startAt, dur))
      throw new ApiError('OUTSIDE_BUSINESS_HOURS', 422, 'Esse horário está fora do atendimento.')
    if (!isFree(input.startAt, dur))
      throw new ApiError('SLOT_UNAVAILABLE', 409, 'Esse horário não está mais disponível.')

    const now = new Date().toISOString()
    const req: BookingRequest = {
      id: uid('req'),
      token: token(),
      clientName: name,
      phone,
      itemId: input.itemId,
      startAt: input.startAt,
      status: input.manual ? 'confirmado' : 'pendente',
      createdAt: now,
      consentAcceptedAt: now,
      consentVersion: s.consentVersion,
      manual: input.manual,
    }
    setState((st) => ({ ...st, requests: [...st.requests, req] }))
    return wait(req)
  },

  async requestByToken(tk: string) {
    const r = getState().requests.find((x) => x.token === tk)
    if (!r) throw new ApiError('NOT_FOUND', 404, 'Pedido não encontrado.')
    return wait(r)
  },

  async cancelByToken(tk: string) {
    const r = getState().requests.find((x) => x.token === tk)
    if (!r) throw new ApiError('NOT_FOUND', 404, 'Pedido não encontrado.')
    if (!canTransition(r.status, 'cancelado'))
      throw new ApiError('INVALID_TRANSITION', 409, 'Esse pedido não pode mais ser cancelado.')
    if (r.status === 'confirmado' && Date.now() > new Date(cancelDeadlineAt(r)).getTime())
      throw new ApiError('DEADLINE_PASSED', 403, 'O prazo para cancelar já passou. Fale com o Tio Preto.')
    patch(r.id, { status: 'cancelado', rescheduleStartAt: null })
    return wait(true)
  },

  async rescheduleByToken(tk: string, startAt: string) {
    const r = getState().requests.find((x) => x.token === tk)
    if (!r) throw new ApiError('NOT_FOUND', 404, 'Pedido não encontrado.')
    if (r.status !== 'confirmado')
      throw new ApiError('INVALID_TRANSITION', 409, 'Só dá para remarcar um horário confirmado.')
    if (Date.now() > new Date(cancelDeadlineAt(r)).getTime())
      throw new ApiError('DEADLINE_PASSED', 403, 'O prazo para remarcar já passou. Fale com o Tio Preto.')
    const dur = itemDuration(r.itemId)
    if (!withinHours(startAt, dur))
      throw new ApiError('OUTSIDE_BUSINESS_HOURS', 422, 'Esse horário está fora do atendimento.')
    if (!isFree(startAt, dur, r.id))
      throw new ApiError('SLOT_UNAVAILABLE', 409, 'Esse horário não está mais disponível.')
    patch(r.id, { rescheduleStartAt: startAt })
    return wait(true)
  },

  async acceptProposal(tk: string) {
    const r = getState().requests.find((x) => x.token === tk)
    if (!r || r.status !== 'outro_horario_proposto' || !r.proposedStartAt)
      throw new ApiError('INVALID_TRANSITION', 409, 'Não há proposta para aceitar.')
    const dur = itemDuration(r.itemId)
    if (!isFree(r.proposedStartAt, dur, r.id))
      throw new ApiError('SLOT_UNAVAILABLE', 409, 'Esse horário não está mais disponível.')
    patch(r.id, { status: 'confirmado', startAt: r.proposedStartAt, proposedStartAt: null })
    return wait(true)
  },

  // ---------- dono ----------

  async login(username: string, password: string) {
    if (username.trim().toLowerCase() !== 'tio' || password !== 'preto123')
      throw new ApiError('UNAUTHORIZED', 401, 'Usuário ou senha incorretos.')
    setLogged(true)
    return wait(true)
  },

  logout() {
    setLogged(false)
  },

  saveItem(item: Omit<MenuItem, 'id'> & { id?: string }) {
    if (!item.name.trim())
      throw new ApiError('VALIDATION_ERROR', 400, 'Informe o nome.', { field: 'name' })
    if (!Number.isFinite(item.priceCents) || item.priceCents < 0)
      throw new ApiError('VALIDATION_ERROR', 400, 'Informe um preço válido.', { field: 'price' })
    setState((st) => {
      if (item.id)
        return { ...st, menu: st.menu.map((m) => (m.id === item.id ? ({ ...m, ...item } as MenuItem) : m)) }
      return { ...st, menu: [...st.menu, { ...item, id: uid('item') } as MenuItem] }
    })
  },

  deleteItem(id: string) {
    setState((st) => ({ ...st, menu: st.menu.filter((m) => m.id !== id) }))
  },

  toggleItem(id: string) {
    setState((st) => ({ ...st, menu: st.menu.map((m) => (m.id === id ? { ...m, visible: !m.visible } : m)) }))
  },

  saveSettings(patchS: Partial<Settings>) {
    setState((st) => ({ ...st, settings: { ...st.settings, ...patchS } }))
  },

  transition(id: string, to: RequestStatus, proposedStartAt?: string) {
    const r = getState().requests.find((x) => x.id === id)
    if (!r) throw new ApiError('NOT_FOUND', 404, 'Pedido não encontrado.')
    if (!canTransition(r.status, to))
      throw new ApiError('INVALID_TRANSITION', 409, 'Essa mudança de estado não é permitida.')
    if (to === 'confirmado') {
      const at = r.status === 'outro_horario_proposto' && r.proposedStartAt ? r.proposedStartAt : r.startAt
      if (!isFree(at, itemDuration(r.itemId), r.id))
        throw new ApiError('SLOT_UNAVAILABLE', 409, 'Esse horário já foi ocupado por outro pedido.')
      patch(id, { status: 'confirmado', startAt: at, proposedStartAt: null })
      return
    }
    if (to === 'outro_horario_proposto') {
      if (!proposedStartAt) throw new ApiError('VALIDATION_ERROR', 400, 'Escolha o novo horário.')
      patch(id, { status: to, proposedStartAt })
      return
    }
    patch(id, { status: to, rescheduleStartAt: null })
  },

  approveReschedule(id: string) {
    const r = getState().requests.find((x) => x.id === id)
    if (!r?.rescheduleStartAt) return
    if (!isFree(r.rescheduleStartAt, itemDuration(r.itemId), r.id))
      throw new ApiError('SLOT_UNAVAILABLE', 409, 'O novo horário já foi ocupado.')
    patch(id, { startAt: r.rescheduleStartAt, rescheduleStartAt: null })
  },

  refuseReschedule(id: string) {
    patch(id, { rescheduleStartAt: null })
  },

  addBlock(startAt: string, minutes = 60) {
    const endAt = new Date(new Date(startAt).getTime() + minutes * 60000).toISOString()
    setState((st) => ({ ...st, blocks: [...st.blocks, { id: uid('blk'), startAt, endAt }] }))
  },

  removeBlock(id: string) {
    setState((st) => ({ ...st, blocks: st.blocks.filter((b) => b.id !== id) }))
  },

  setNumberBlocked(phone: string, blocked: boolean) {
    setState((st) => ({
      ...st,
      blockedNumbers: blocked
        ? [...new Set([...st.blockedNumbers, phone])]
        : st.blockedNumbers.filter((p) => p !== phone),
    }))
  },
}

function patch(id: string, p: Partial<BookingRequest>) {
  setState((st) => ({ ...st, requests: st.requests.map((r) => (r.id === id ? { ...r, ...p } : r)) }))
}

export const absencesOf = (phone: string) =>
  getState().requests.filter((r) => r.phone === phone && r.status === 'faltou').length
