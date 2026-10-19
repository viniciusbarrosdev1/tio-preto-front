export type PriceType = 'fixed' | 'from'

export interface MenuItem {
  id: string
  name: string
  description?: string
  priceCents: number
  priceType: PriceType
  durationMinutes: number
  visible: boolean
  photoUrl?: string | null
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
  notice: string | null
  timezone: string
  defaultHours: TimeRange[]
  hourExceptions: HourException[]
  cancelDeadlineHours: number
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
  | 'faltou'

export interface BookingRequest {
  id: string
  token: string
  clientName: string
  phone: string
  itemId: string
  startAt: string
  status: RequestStatus
  proposedStartAt?: string | null
  rescheduleStartAt?: string | null
  createdAt: string
  consentAcceptedAt: string
  consentVersion: string
  manual?: boolean
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
