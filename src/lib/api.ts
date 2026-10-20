import {
  addDays,
  dateKey,
  durationLabel,
  fmtTime,
  hhmm,
  minutesOf,
  normalizePhone,
  toSP,
  todayKey,
  weekdayLong,
} from './format'
import { getState, setLogged, setState, token, uid } from './store'
import {
  ApiError,
  type BookingRequest,
  type MenuItem,
  type RequestStatus,
  type ServiceGroup,
  type Settings,
  type Slot,
  type TimeRange,
} from './types'

const wait = <T,>(v: T) => new Promise<T>((res) => setTimeout(() => res(v), 260))

/** Quanto tempo de histórico o painel guarda. */
export const HISTORY_DAYS = 30

const ALLOWED: Record<RequestStatus, RequestStatus[]> = {
  pendente: ['confirmado', 'recusado', 'outro_horario_proposto', 'cancelado'],
  outro_horario_proposto: ['confirmado', 'cancelado'],
  confirmado: ['atendido', 'cancelado', 'faltou'],
  recusado: [],
  cancelado: [],
  atendido: [],
  faltou: [],
}

export const canTransition = (from: RequestStatus, to: RequestStatus) => ALLOWED[from].includes(to)

/** Confirmado e atendido seguram o horário. Pendente não segura. */
const HOLDS: RequestStatus[] = ['confirmado', 'atendido']

export function hoursFor(date: string, s: Settings = getState().settings): TimeRange[] {
  const ex = s.hourExceptions.find((e) => e.date === date)
  return ex ? ex.ranges : s.defaultHours
}

export const itemsOf = (itemIds: string[], menu: MenuItem[] = getState().menu) =>
  itemIds.map((id) => menu.find((m) => m.id === id)).filter((m): m is MenuItem => !!m)

export const serviceName = (itemIds: string[], menu?: MenuItem[]) => {
  const names = itemsOf(itemIds, menu).map((m) => m.name)
  return names.length ? names.join(' + ') : 'Serviço'
}

/**
 * Regra de duração (aposta a validar com o Tio Preto):
 * - serviço curto (menor que um horário, caso da sobrancelha) encaixa junto de
 *   outro serviço sem somar tempo; sozinho ocupa um horário inteiro;
 * - os outros somam a duração de cada um;
 * - o total arredonda para cima no tamanho do horário e respeita o teto de atendimento.
 */
export function durationFor(itemIds: string[], s: Settings = getState().settings): number {
  const step = Math.max(5, s.slotMinutes)
  const services = itemsOf(itemIds).filter((m) => m.kind === 'servico')
  if (services.length === 0) return 0
  const longMinutes = services
    .filter((m) => m.durationMinutes >= step)
    .reduce((acc, m) => acc + m.durationMinutes, 0)
  const raw = longMinutes > 0 ? longMinutes : step
  return Math.min(s.maxServiceMinutes, Math.ceil(raw / step) * step)
}

export const priceOf = (itemIds: string[]) => {
  const items = itemsOf(itemIds)
  return {
    cents: items.reduce((acc, m) => acc + m.priceCents, 0),
    from: items.some((m) => m.priceType === 'from'),
  }
}

export const endOf = (r: BookingRequest) =>
  new Date(new Date(r.startAt).getTime() + durationFor(r.itemIds) * 60000).toISOString()

const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
  aStart < bEnd && bStart < aEnd

export function isFree(startAt: string, durationMin: number, ignoreId?: string): boolean {
  const start = new Date(startAt).getTime()
  const end = start + durationMin * 60000
  const { requests, blocks } = getState()
  const busyByRequest = requests.some((r) => {
    if (r.id === ignoreId || !HOLDS.includes(r.status)) return false
    const rStart = new Date(r.startAt).getTime()
    return overlaps(start, end, rStart, rStart + durationFor(r.itemIds) * 60000)
  })
  const busyByBlock = blocks.some((b) =>
    overlaps(start, end, new Date(b.startAt).getTime(), new Date(b.endAt).getTime()),
  )
  return !busyByRequest && !busyByBlock
}

const startMinutesOf = (startAt: string) =>
  minutesOf(
    new Date(startAt).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    }),
  )

export function withinHours(startAt: string, durationMin: number, s?: Settings): boolean {
  const date = dateKey(startAt)
  const start = startMinutesOf(startAt)
  return hoursFor(date, s).some((r) => start >= minutesOf(r.start) && start + durationMin <= minutesOf(r.end))
}

export function slotsFor(date: string, itemIds: string[]): Slot[] {
  const s = getState().settings
  const dur = durationFor(itemIds, s)
  if (!dur) return []
  const step = Math.max(5, s.slotMinutes)
  const out: Slot[] = []
  for (const r of hoursFor(date, s)) {
    for (let t = minutesOf(r.start); t + dur <= minutesOf(r.end); t += step) {
      const startAt = toSP(date, hhmm(t))
      const future = new Date(startAt).getTime() > Date.now()
      out.push({ startAt, available: future && isFree(startAt, dur) })
    }
  }
  return out
}

/** Último horário que ainda cabe no dia, para explicar no painel. */
export function lastSlotFor(date: string, minutes: number, s: Settings = getState().settings) {
  const ranges = hoursFor(date, s)
  const step = Math.max(5, s.slotMinutes)
  let last: string | null = null
  for (const r of ranges)
    for (let t = minutesOf(r.start); t + minutes <= minutesOf(r.end); t += step) last = hhmm(t)
  return last
}

export const horizonDays = (s: Settings = getState().settings) => Math.max(1, s.horizonWeeks) * 7

export const bookableDates = (s: Settings = getState().settings) => {
  const t = todayKey()
  return Array.from({ length: horizonDays(s) }, (_, i) => addDays(t, i))
}

export const openDates = (s: Settings = getState().settings) =>
  bookableDates(s).filter((d) => hoursFor(d, s).length > 0)

export const historyDates = () => {
  const t = todayKey()
  return Array.from({ length: HISTORY_DAYS }, (_, i) => addDays(t, -(i + 1)))
}

export const cancelDeadlineAt = (r: BookingRequest) =>
  new Date(new Date(r.startAt).getTime() - getState().settings.cancelDeadlineHours * 3600000).toISOString()

export const absenceRuleText = (s: Settings = getState().settings) =>
  s.absenceRule.replace(/\{h\}/g, String(s.cancelDeadlineHours))

/** Só depois da hora marcada o dono pode dizer que faltou ou que atendeu. */
export const isPast = (r: BookingRequest) => Date.now() >= new Date(r.startAt).getTime()

/** Aviso do dia vale só para hoje: depois da meia-noite sai do ar. */
export const activeNotice = (s: Settings = getState().settings) =>
  s.notice && s.noticeDate === todayKey() ? s.notice : null

const whenText = (startAt: string) => `${weekdayLong(dateKey(startAt))} às ${fmtTime(startAt)}`

function pushMessage(id: string, text: string) {
  setState((st) => ({
    ...st,
    requests: st.requests.map((r) =>
      r.id === id ? { ...r, messages: [...r.messages, { at: new Date().toISOString(), text }] } : r,
    ),
  }))
}

function patch(id: string, p: Partial<BookingRequest>) {
  setState((st) => ({ ...st, requests: st.requests.map((r) => (r.id === id ? { ...r, ...p } : r)) }))
}

/** Mensagem que o protótipo "manda" no WhatsApp quando o pedido entra. */
export const receivedMessage = (r: Pick<BookingRequest, 'itemIds' | 'startAt'>) =>
  `Recebemos seu pedido: ${serviceName(r.itemIds)} · ${whenText(r.startAt)}. Em breve retornaremos com a confirmação do seu horário.`

export const confirmedMessage = (r: Pick<BookingRequest, 'itemIds' | 'startAt'>) =>
  `Horário confirmado: ${serviceName(r.itemIds)} · ${whenText(r.startAt)} (${durationLabel(durationFor(r.itemIds))}). Até lá!`

export const api = {
  async publicMenu() {
    const { menu, settings } = getState()
    return wait({ items: menu.filter((m) => m.visible), settings })
  },

  async slots(date: string, itemIds: string[]) {
    return wait(slotsFor(date, itemIds))
  },

  async createRequest(input: {
    clientName: string
    phone: string
    itemIds: string[]
    startAt: string
    consent: boolean
    honeypot?: string
    manual?: boolean
  }) {
    const s = getState().settings
    if (input.honeypot) return wait({ token: token() } as unknown as BookingRequest)
    const phone = normalizePhone(input.phone)
    const name = input.clientName.trim()
    const services = itemsOf(input.itemIds).filter((m) => m.kind === 'servico')
    if (services.length === 0)
      throw new ApiError('VALIDATION_ERROR', 400, 'Escolha pelo menos um serviço.', { field: 'itemIds' })
    const groups = new Map<ServiceGroup, number>()
    for (const m of services) {
      const g = m.group ?? 'outro'
      if (g !== 'outro') groups.set(g, (groups.get(g) ?? 0) + 1)
    }
    if ([...groups.values()].some((n) => n > 1))
      throw new ApiError('VALIDATION_ERROR', 400, 'Dá para escolher só um serviço de cada tipo.', {
        field: 'itemIds',
      })
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
        'Não conseguimos registrar seu pedido por aqui. Fale com a gente no WhatsApp.',
      )
    const itemIds = services.map((m) => m.id)
    const dur = durationFor(itemIds, s)
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
      itemIds,
      startAt: input.startAt,
      status: input.manual ? 'confirmado' : 'pendente',
      createdAt: now,
      consentAcceptedAt: now,
      consentVersion: s.consentVersion,
      manual: input.manual,
      messages: [
        {
          at: now,
          text: input.manual ? confirmedMessage({ itemIds, startAt: input.startAt }) : receivedMessage({ itemIds, startAt: input.startAt }),
        },
      ],
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
      throw new ApiError('DEADLINE_PASSED', 403, 'O prazo para cancelar já passou. Fale com a gente no WhatsApp.')
    patch(r.id, { status: 'cancelado', rescheduleStartAt: null })
    pushMessage(r.id, `Pedido cancelado pelo cliente (${whenText(r.startAt)}).`)
    return wait(true)
  },

  async rescheduleByToken(tk: string, startAt: string) {
    const r = getState().requests.find((x) => x.token === tk)
    if (!r) throw new ApiError('NOT_FOUND', 404, 'Pedido não encontrado.')
    if (r.status !== 'confirmado')
      throw new ApiError('INVALID_TRANSITION', 409, 'Só dá para remarcar um horário confirmado.')
    if (Date.now() > new Date(cancelDeadlineAt(r)).getTime())
      throw new ApiError('DEADLINE_PASSED', 403, 'O prazo para remarcar já passou. Fale com a gente no WhatsApp.')
    const dur = durationFor(r.itemIds)
    if (!withinHours(startAt, dur))
      throw new ApiError('OUTSIDE_BUSINESS_HOURS', 422, 'Esse horário está fora do atendimento.')
    if (!isFree(startAt, dur, r.id))
      throw new ApiError('SLOT_UNAVAILABLE', 409, 'Esse horário não está mais disponível.')
    patch(r.id, { rescheduleStartAt: startAt })
    pushMessage(r.id, `Pedido de remarcação para ${whenText(startAt)} enviado. Aguarde a confirmação.`)
    return wait(true)
  },

  async acceptProposal(tk: string) {
    const r = getState().requests.find((x) => x.token === tk)
    if (!r || r.status !== 'outro_horario_proposto' || !r.proposedStartAt)
      throw new ApiError('INVALID_TRANSITION', 409, 'Não há proposta para aceitar.')
    const dur = durationFor(r.itemIds)
    if (!isFree(r.proposedStartAt, dur, r.id))
      throw new ApiError('SLOT_UNAVAILABLE', 409, 'Esse horário não está mais disponível.')
    const startAt = r.proposedStartAt
    patch(r.id, { status: 'confirmado', startAt, proposedStartAt: null })
    pushMessage(r.id, confirmedMessage({ itemIds: r.itemIds, startAt }))
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
    if (!Number.isFinite(item.priceCents) || item.priceCents <= 0)
      throw new ApiError('VALIDATION_ERROR', 400, 'Informe um preço válido.', { field: 'price' })
    setState((st) => {
      if (item.id)
        return { ...st, menu: st.menu.map((m) => (m.id === item.id ? ({ ...m, ...item } as MenuItem) : m)) }
      return { ...st, menu: [...st.menu, { ...item, id: uid(item.kind === 'produto' ? 'prod' : 'svc') } as MenuItem] }
    })
  },

  deleteItem(id: string) {
    setState((st) => ({ ...st, menu: st.menu.filter((m) => m.id !== id) }))
  },

  toggleItem(id: string) {
    setState((st) => ({ ...st, menu: st.menu.map((m) => (m.id === id ? { ...m, visible: !m.visible } : m)) }))
  },

  /**
   * Quem cai se o horário do dia mudar. Só horário futuro entra na conta.
   * O dono vê isso antes de salvar e resolve cada caso na tela de clientes.
   */
  conflictsWith(next: Settings) {
    const now = Date.now()
    return getState().requests.filter(
      (r) =>
        ['pendente', 'confirmado', 'outro_horario_proposto'].includes(r.status) &&
        new Date(r.startAt).getTime() > now &&
        !withinHours(r.startAt, durationFor(r.itemIds, next), next),
    )
  },

  /** Salva a configuração e derruba o que ficou fora do novo horário. */
  saveSettings(patchS: Partial<Settings>) {
    const next = { ...getState().settings, ...patchS }
    const hit = api.conflictsWith(next)
    setState((st) => ({
      ...st,
      settings: next,
      requests: st.requests.map((r) =>
        hit.some((h) => h.id === r.id)
          ? {
              ...r,
              status: 'cancelado' as RequestStatus,
              needsAdjust: true,
              rescheduleStartAt: null,
              messages: [
                ...r.messages,
                {
                  at: new Date().toISOString(),
                  text: `Horário de ${whenText(r.startAt)} cancelado automaticamente por mudança na agenda do dia. Entre em contato para ajustar.`,
                },
              ],
            }
          : r,
      ),
    }))
    return hit.length
  },

  transition(id: string, to: RequestStatus, proposedStartAt?: string) {
    const r = getState().requests.find((x) => x.id === id)
    if (!r) throw new ApiError('NOT_FOUND', 404, 'Pedido não encontrado.')
    if (!canTransition(r.status, to))
      throw new ApiError('INVALID_TRANSITION', 409, 'Essa mudança de estado não é permitida.')
    if ((to === 'atendido' || to === 'faltou') && !isPast(r))
      throw new ApiError('INVALID_TRANSITION', 409, 'Só depois da hora marcada.')
    if (to === 'confirmado') {
      const at = r.status === 'outro_horario_proposto' && r.proposedStartAt ? r.proposedStartAt : r.startAt
      if (!isFree(at, durationFor(r.itemIds), r.id))
        throw new ApiError('SLOT_UNAVAILABLE', 409, 'Esse horário já foi ocupado por outro pedido.')
      patch(id, { status: 'confirmado', startAt: at, proposedStartAt: null })
      pushMessage(id, confirmedMessage({ itemIds: r.itemIds, startAt: at }))
      return
    }
    if (to === 'outro_horario_proposto') {
      if (!proposedStartAt) throw new ApiError('VALIDATION_ERROR', 400, 'Escolha o novo horário.')
      patch(id, { status: to, proposedStartAt })
      pushMessage(id, `Sugerimos ${whenText(proposedStartAt)} no lugar de ${whenText(r.startAt)}.`)
      return
    }
    patch(id, { status: to, rescheduleStartAt: null })
    if (to === 'recusado')
      pushMessage(id, `Não vai dar para atender ${whenText(r.startAt)}. Pode pedir outro horário pelo site.`)
    if (to === 'cancelado') pushMessage(id, `Precisamos cancelar seu horário de ${whenText(r.startAt)}. Pode pedir outro pelo site.`)
    if (to === 'faltou') pushMessage(id, `Falta registrada no horário de ${whenText(r.startAt)}.`)
  },

  /** Dono muda o horário de um confirmado direto na agenda. */
  moveRequest(id: string, startAt: string) {
    const r = getState().requests.find((x) => x.id === id)
    if (!r) throw new ApiError('NOT_FOUND', 404, 'Pedido não encontrado.')
    const dur = durationFor(r.itemIds)
    if (!withinHours(startAt, dur))
      throw new ApiError('OUTSIDE_BUSINESS_HOURS', 422, 'Esse horário está fora do atendimento.')
    if (!isFree(startAt, dur, r.id))
      throw new ApiError('SLOT_UNAVAILABLE', 409, 'Esse horário já está ocupado.')
    patch(id, { startAt, status: 'confirmado', needsAdjust: false, rescheduleStartAt: null, proposedStartAt: null })
    pushMessage(id, `Remarcamos seu horário: ${whenText(startAt)}.`)
  },

  /** Tira o pedido da fila de ajustes sem remarcar. */
  resolveAdjust(id: string) {
    patch(id, { needsAdjust: false })
  },

  approveReschedule(id: string) {
    const r = getState().requests.find((x) => x.id === id)
    if (!r?.rescheduleStartAt) return
    if (!isFree(r.rescheduleStartAt, durationFor(r.itemIds), r.id))
      throw new ApiError('SLOT_UNAVAILABLE', 409, 'O novo horário já foi ocupado.')
    const startAt = r.rescheduleStartAt
    patch(id, { startAt, rescheduleStartAt: null })
    pushMessage(id, confirmedMessage({ itemIds: r.itemIds, startAt }))
  },

  refuseReschedule(id: string) {
    const r = getState().requests.find((x) => x.id === id)
    patch(id, { rescheduleStartAt: null })
    if (r) pushMessage(id, `Remarcação não deu. Seu horário segue ${whenText(r.startAt)}.`)
  },

  addBlock(startAt: string, minutes = getState().settings.slotMinutes) {
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

export const absencesOf = (phone: string) =>
  getState().requests.filter((r) => r.phone === phone && r.status === 'faltou').length

export const lastMessage = (r: BookingRequest) => r.messages[r.messages.length - 1]

export const pendingAdjusts = (requests: BookingRequest[]) => requests.filter((r) => r.needsAdjust)
