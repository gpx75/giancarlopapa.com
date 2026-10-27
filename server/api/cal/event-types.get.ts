import { createError } from 'h3'
import { fetchCalEventTypes } from '../../utils/cal'

export default defineEventHandler(async () => {
  try {
    const response = await fetchCalEventTypes()

    const eventTypes = (response.data ?? [])
      .filter(eventType => !eventType.hidden)
      .map((eventType) => {
        const owner = eventType.users?.[0]
        return {
          id: eventType.id,
          slug: eventType.slug,
          title: eventType.title,
          description: eventType.description || undefined,
          length: eventType.lengthInMinutes,
          profileSlug: owner?.username,
          profileName: owner?.name ?? owner?.username,
          userId: eventType.ownerId
        }
      })

    return { eventTypes }
  } catch (error) {
    console.error('[api/cal/event-types] Failed to fetch event types', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to load event types from Cal.com.'
    })
  }
})
