export type PriceType = 'fixed' | 'from'

/** Serviço ocupa horário na agenda. Produto é só venda no cardápio. */
export type ItemKind = 'servico' | 'produto'

/**
 * Grupo do serviço. Regra de negócio: o cliente escolhe no máximo um item
 * por grupo (um tipo de cabelo, uma sobrancelha). "outro" não tem limite.
 */
export type ServiceGroup = 'cabelo' | 'barba' | 'sobrancelha' | 'outro'

export const GROUP_LABEL: Record<ServiceGroup, string> = {
  cabelo: 'Cabelo',
  barba: 'Barba',
  sobrancelha: 'Sobrancelha',
  outro: 'Outros',
}

export interface MenuItem {
  id: string
  kind: ItemKind
  group?: ServiceGroup
  name: string
  description?: string
  priceCents: number
  priceType: PriceType
  /** Produto usa 0. Serviço curto (sobrancelha) encaixa em outro serviço. */
  durationMinutes: number
  visible: boolean
  photoUrls: string[]
}

export interface TimeRange {
  start: string
  end: string
}

export interface HourException {
  date: string
  ranges: TimeRange[]
}

export interface Settings {
  businessName: string
  city: string
  whatsapp: string
  instagramUrl: string
  mapsUrl: string
  /** Aviso do dia. Sai do ar sozinho depois da meia-noite (ver noticeDate). */
  notice: string | null
  noticeDate: string | null
  timezone: string
  /** Quantas semanas de agenda ficam abertas para o cliente. */
  horizonWeeks: number
  /** Tamanho do horário na agenda, em minutos. */
  slotMinutes: number
  /** Teto de duração de um atendimento, em minutos. */
  maxServiceMinutes: number
  defaultHours: TimeRange[]
  hourExceptions: HourException[]
  cancelDeadlineHours: number
  /** Texto mostrado ao cliente. {h} é trocado pelo prazo de cancelamento. */
  absenceRule: string
  consentVersion: string
  consentText: string
}

export type RequestStatus =
  | 'pendente'
  | 'confirmado'
  | 'recusado'
  | 'outro_horario_proposto'
  | 'cancelado'
  | 'atendido'
  | 'faltou'

/** Mensagem de WhatsApp simulada pelo protótipo (fica só de log). */
export interface RequestMessage {
  at: string
  text: string
}

export interface BookingRequest {
  id: string
  token: string
  clientName: string
  phone: string
  itemIds: string[]
  startAt: string
  status: RequestStatus
  proposedStartAt?: string | null
  rescheduleStartAt?: string | null
  createdAt: string
  consentAcceptedAt: string
  consentVersion: string
  manual?: boolean
  messages: RequestMessage[]
  /** Caiu por mudança de horário feita no painel. Espera ajuste do dono. */
  needsAdjust?: boolean
}

export type ErrorCode =
  | 'SLOT_UNAVAILABLE'
  | 'OUTSIDE_BUSINESS_HOURS'
  | 'VALIDATION_ERROR'
  | 'DEADLINE_PASSED'
  | 'UNAUTHORIZED'
  | 'REQUEST_NOT_ACCEPTED'
  | 'INVALID_TRANSITION'
  | 'NOT_FOUND'
  | 'TOO_MANY_REQUESTS'

export class ApiError extends Error {
  code: ErrorCode
  status: number
  details?: Record<string, unknown>
  constructor(code: ErrorCode, status: number, message: string, details?: Record<string, unknown>) {
    super(message)
    this.code = code
    this.status = status
    this.details = details
  }
}

export interface Slot {
  startAt: string
  available: boolean
}
