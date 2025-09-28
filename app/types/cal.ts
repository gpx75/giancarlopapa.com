export interface CalEventType {
  id: number
  slug: string
  title: string
  description?: string
  length: number
  timezone?: string
  profileSlug?: string
  profileName?: string
  userId?: number
}

export interface CalSlot {
  start: string
  end: string
  seats?: number
  timeZone?: string
  [key: string]: unknown
}

export interface CalBookingPayload {
  eventTypeId: number
  start: string
  lengthInMinutes?: number
  attendee: {
    name: string
    email: string
    timeZone?: string
    language?: string
    phoneNumber?: string
  }
  metadata?: Record<string, unknown>
  bookingFieldsResponses?: Record<string, unknown>
  guests?: string[]
}

export interface CalBookingResponse {
  id: number
  uid: string
  startTime: string
  endTime: string
  status: string
  meetingUrl?: string
}
