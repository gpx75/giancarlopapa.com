import { createError } from 'h3'
import { fetchCalSlots } from '../../utils/cal'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const eventTypeId = query.eventTypeId ? Number.parseInt(String(query.eventTypeId), 10) : NaN
  const start = typeof query.start === 'string' ? query.start : null
  const end = typeof query.end === 'string' ? query.end : null
  const duration = query.duration ? Number.parseInt(String(query.duration), 10) : NaN
  const timezone = typeof query.timezone === 'string' ? query.timezone : undefined

  if (Number.isNaN(eventTypeId)) {
    throw createError({ statusCode: 400, statusMessage: 'Missing event type identifier.' })
  }

  if (!start || !end) {
    throw createError({ statusCode: 400, statusMessage: 'Missing date range.' })
  }

  if (Number.isNaN(duration) || duration <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid duration.' })
  }

  try {
    const slots = await fetchCalSlots({
      eventTypeId,
      start,
      end,
      durationMinutes: duration,
      timezone
    })
    return { slots }
  } catch (error) {
    console.error('[api/cal/slots] Failed to fetch slots', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to load available slots from Cal.com.'
    })
  }
})
