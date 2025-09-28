import { createCalBooking } from '../../utils/cal'
import type { CalBookingPayload } from '~/types/cal'

export default defineEventHandler(async (event) => {
  const body = await readBody<CalBookingPayload>(event)

  if (!body?.eventTypeId || !body.start || !body.attendee?.name || !body.attendee?.email) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required booking fields.'
    })
  }

  try {
    const booking = await createCalBooking(body)
    return { booking }
  } catch (error) {
    console.error('[api/cal/bookings] Failed to create booking', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to create booking on Cal.com.'
    })
  }
})
