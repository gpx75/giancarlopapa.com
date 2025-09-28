import { createError } from 'h3'
import { fetchCalEventTypes } from '../../utils/cal'

export default defineEventHandler(async () => {
  try {
    const response = await fetchCalEventTypes()

    const eventTypes = (response.event_types ?? [])
      .filter(eventType => !eventType.hidden)
      .map(eventType => ({
        id: eventType.id,
        slug: eventType.slug,
        title: eventType.title,
        description: eventType.description ?? undefined,
        length: eventType.length,
        timezone: eventType.timeZone ?? undefined,
        profileSlug: eventType.owner?.username,
        profileName: eventType.owner?.name ?? eventType.owner?.username,
        userId: eventType.userId
      }))

    return { eventTypes }
  } catch (error) {
    console.error('[api/cal/event-types] Failed to fetch event types', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to load event types from Cal.com.'
    })
  }
})
