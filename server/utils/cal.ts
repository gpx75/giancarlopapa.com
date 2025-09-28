import { createError } from 'h3'
import type { CalSlot, CalBookingPayload, CalBookingResponse } from '~/types/cal'

interface CalRequestOptions {
  path: string
  method?: 'GET' | 'POST'
  query?: Record<string, string | number | boolean | undefined>
  body?: unknown
  headers?: Record<string, string>
}

interface EventTypeV1 {
  id: number
  title: string
  slug: string
  length: number
  hidden?: boolean
  description?: string | null
  userId: number
  timeZone?: string | null
  owner?: {
    username?: string
    name?: string
  }
}

interface EventTypesV1Response {
  event_types: EventTypeV1[]
}

interface AvailabilityV1Response {
  busy?: Array<{ start: string, end: string }>
  dateRanges?: Array<{ start: string, end: string }>
  timeZone?: string
}

type BookingResponse = {
  data: CalBookingResponse
}

function useCalConfig() {
  const config = useRuntimeConfig()
  const apiKey = config.cal?.apiKey
  const baseUrl = config.cal?.baseUrl || 'https://api.cal.com'

  if (!apiKey) {
    throw new Error('CAL_API_KEY is not configured. Set it in your environment variables.')
  }

  return {
    apiKey,
    baseUrl,
    username: config.cal?.username
  }
}

async function calRequest<T>({ path, method = 'GET', query, body, headers }: CalRequestOptions) {
  const { apiKey, baseUrl } = useCalConfig()

  try {
    return await $fetch<T>(path, {
      baseURL: baseUrl,
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...headers
      },
      query,
      body
    })
  } catch (error: unknown) {
    const err = error as {
      response?: { status?: number, _data?: Record<string, unknown> }
      statusCode?: number
      message?: string
      data?: unknown
    }
    const statusCode = err?.response?.status ?? err?.statusCode ?? 500
    const statusMessage = typeof err?.response?._data?.message === 'string'
      ? err.response?._data?.message as string
      : err?.message || 'Unknown Cal API error'
    console.error('[calRequest] Cal API request failed', {
      path,
      method,
      statusCode,
      statusMessage,
      data: err?.response?._data ?? err?.data
    })
    throw createError({ statusCode, statusMessage })
  }
}

export async function fetchCalEventTypes() {
  const { apiKey, baseUrl } = useCalConfig()
  return $fetch<EventTypesV1Response>('/v1/event-types', {
    baseURL: baseUrl,
    method: 'GET',
    query: {
      apiKey
    }
  })
}

interface FetchSlotsRequest {
  userId: number
  start: string
  end: string
  durationMinutes: number
  timezone?: string
}

export async function fetchCalSlots({ userId, start, end, durationMinutes, timezone }: FetchSlotsRequest) {
  const { apiKey, baseUrl } = useCalConfig()

  const availability = await $fetch<AvailabilityV1Response>('/v1/availability', {
    baseURL: baseUrl,
    method: 'GET',
    query: {
      apiKey,
      userId,
      dateFrom: start,
      dateTo: end
    }
  })

  const slots: CalSlot[] = []
  const dateRanges = availability.dateRanges ?? []
  const busy = availability.busy ?? []
  const stepMs = durationMinutes * 60_000

  for (const range of dateRanges) {
    const rangeStart = new Date(range.start)
    const rangeEnd = new Date(range.end)

    let cursor = rangeStart.getTime()
    const limit = rangeEnd.getTime()

    while (cursor + stepMs <= limit) {
      const slotStart = new Date(cursor)
      const slotEnd = new Date(cursor + stepMs)

      const overlapsBusy = busy.some(({ start: busyStart, end: busyEnd }) => {
        const busyStartMs = new Date(busyStart).getTime()
        const busyEndMs = new Date(busyEnd).getTime()
        return slotStart.getTime() < busyEndMs && slotEnd.getTime() > busyStartMs
      })

      if (!overlapsBusy) {
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          timeZone: timezone || availability.timeZone
        } as CalSlot)
      }

      cursor += stepMs
    }
  }

  return slots
}

export async function createCalBooking(payload: CalBookingPayload) {
  const response = await calRequest<BookingResponse>({
    path: '/v2/bookings',
    method: 'POST',
    headers: {
      'cal-api-version': '2024-08-13'
    },
    body: payload
  })

  return response.data
}
