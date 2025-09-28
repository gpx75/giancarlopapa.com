import { computed, ref } from 'vue'
import type {
  CalEventType,
  CalSlot,
  CalBookingPayload,
  CalBookingResponse
} from '~/types/cal'

interface BookingForm {
  name: string
  email: string
  notes: string
}

export function useCalBooking() {
  const eventTypes = ref<CalEventType[]>([])
  const slots = ref<CalSlot[]>([])
  const selectedEventType = ref<CalEventType | null>(null)
  const selectedSlot = ref<CalSlot | null>(null)
  const loadingEventTypes = ref(false)
  const loadingSlots = ref(false)
  const creatingBooking = ref(false)
  const error = ref<string | null>(null)
  const success = ref<CalBookingResponse | null>(null)

  async function loadEventTypes() {
    loadingEventTypes.value = true
    error.value = null

    try {
      const data = await $fetch<{ eventTypes: CalEventType[] }>('/api/cal/event-types')
      eventTypes.value = data.eventTypes ?? []
      if (eventTypes.value.length && !selectedEventType.value) {
        selectedEventType.value = eventTypes.value[0]
      }
    } catch (err) {
      console.error('[useCalBooking] Failed to load event types', err)
      error.value = 'Failed to load event types.'
    } finally {
      loadingEventTypes.value = false
    }
  }

  async function loadSlots(start: string, end: string) {
    if (!selectedEventType.value) {
      return
    }

    loadingSlots.value = true
    error.value = null

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const startDate = start.slice(0, 10)
      const endDate = end.slice(0, 10)
      const data = await $fetch<{ slots: CalSlot[] }>('/api/cal/slots', {
        method: 'GET',
        query: {
          userId: selectedEventType.value.userId,
          start: startDate,
          end: endDate,
          duration: selectedEventType.value.length,
          timezone
        }
      })
      slots.value = data.slots ?? []
    } catch (err) {
      console.error('[useCalBooking] Failed to load slots', err)
      error.value = 'Failed to load availability.'
    } finally {
      loadingSlots.value = false
    }
  }

  async function bookSlot(form: BookingForm) {
    if (!selectedEventType.value || !selectedSlot.value) {
      error.value = 'Select a time before booking.'
      return
    }

    creatingBooking.value = true
    error.value = null
    success.value = null

    try {
      const payload: CalBookingPayload = {
        eventTypeId: selectedEventType.value.id,
        start: selectedSlot.value.start,
        attendee: {
          name: form.name,
          email: form.email,
          timeZone: selectedSlot.value.timeZone
            || selectedEventType.value.timezone
            || Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: 'en'
        },
        metadata: form.notes ? { notes: form.notes } : undefined
      }

      const data = await $fetch<{ booking: CalBookingResponse }>('/api/cal/bookings', {
        method: 'POST',
        body: payload
      })

      if (data.booking) {
        success.value = data.booking
      } else {
        error.value = 'Booking response did not include confirmation.'
      }
    } catch (err) {
      console.error('[useCalBooking] Failed to create booking', err)
      error.value = 'We could not confirm your booking. Please try again.'
    } finally {
      creatingBooking.value = false
    }
  }

  const hasEventTypes = computed(() => eventTypes.value.length > 0)
  const hasSlots = computed(() => slots.value.length > 0)

  function reset() {
    selectedSlot.value = null
    success.value = null
    error.value = null
  }

  return {
    eventTypes,
    slots,
    selectedEventType,
    selectedSlot,
    loadingEventTypes,
    loadingSlots,
    creatingBooking,
    error,
    success,
    hasEventTypes,
    hasSlots,
    loadEventTypes,
    loadSlots,
    bookSlot,
    reset
  }
}
