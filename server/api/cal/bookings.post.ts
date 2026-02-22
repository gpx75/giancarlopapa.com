import { createCalBooking } from '../../utils/cal'
import type { CalBookingPayload, CalBookingResponse } from '~/types/cal'
import { checkRateLimit } from '../../utils/rateLimit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default defineEventHandler(
  async (event): Promise<{ booking: CalBookingResponse }> => {
    const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'

    if (!checkRateLimit(`booking:${ip}`, 10, 60 * 60 * 1000)) {
      throw createError({ statusCode: 429, statusMessage: 'Too many booking requests. Please try again later.' })
    }

    const body = await readBody<CalBookingPayload>(event)

    if (
      !body?.eventTypeId ||
      !body.start ||
      !body.attendee?.name ||
      !body.attendee?.email
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required booking fields.'
      })
    }

    if (!EMAIL_RE.test(body.attendee.email) || body.attendee.email.length > 254) {
      throw createError({ statusCode: 400, statusMessage: 'A valid attendee email is required.' })
    }

    if (body.attendee.name.trim().length < 2 || body.attendee.name.length > 100) {
      throw createError({ statusCode: 400, statusMessage: 'Attendee name must be between 2 and 100 characters.' })
    }

    try {
      const booking: CalBookingResponse = await createCalBooking(body)
      return { booking }
    } catch (error) {
      console.error('[api/cal/bookings] Failed to create booking', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Unable to create booking on Cal.com.'
      })
    }
  }
)
