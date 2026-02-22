<script setup lang="ts">
import { useCalBooking } from '~/composables/useCalBooking'

useSeoMeta({
  title: 'Book a call — Giancarlo Papa',
  description: 'Schedule a session with Giancarlo Papa — architecture reviews, cloud platform deep dives, or AI engineering consultations.'
})

const booking = useCalBooking()

const form = reactive({
  name: '',
  email: '',
  notes: ''
})

const timeframe = computed(() => {
  const start = new Date()
  const end = new Date(start)
  end.setDate(end.getDate() + 14)
  return { start: start.toISOString(), end: end.toISOString() }
})

const userTimezone = computed(() => Intl.DateTimeFormat().resolvedOptions().timeZone)

interface DayGroup {
  key: string
  weekday: string
  date: string
  label: string
  slots: typeof booking.slots.value
}

const selectedDayKey = ref<string | null>(null)

const dayGroups = computed((): DayGroup[] => {
  const groups = new Map<string, DayGroup>()
  const keyFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: userTimezone.value,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  const weekdayFormatter = new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: userTimezone.value })
  const dayFormatter = new Intl.DateTimeFormat('en', { day: 'numeric', timeZone: userTimezone.value })
  const labelFormatter = new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: userTimezone.value
  })

  for (const slot of booking.slots.value) {
    const date = new Date(slot.start)
    const key = keyFormatter.format(date)
    const existing = groups.get(key)
    if (existing) {
      existing.slots.push(slot)
    } else {
      groups.set(key, {
        key,
        weekday: weekdayFormatter.format(date).toUpperCase(),
        date: dayFormatter.format(date),
        label: labelFormatter.format(date),
        slots: [slot]
      })
    }
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([, value]) => value)
})

const selectedDayGroup = computed(() =>
  dayGroups.value.find(g => g.key === selectedDayKey.value) ?? dayGroups.value[0] ?? null
)

watch(dayGroups, (groups) => {
  if (groups.length && !selectedDayKey.value) {
    selectedDayKey.value = groups[0].key
  }
}, { immediate: true })

const selectedSlotSummary = computed(() => {
  if (!booking.selectedSlot.value) return null
  return formatSlotRange(booking.selectedSlot.value.start, booking.selectedSlot.value.end)
})

function formatSlotRange(start: string, end: string) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const dateFormatter = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' })
  const timeFormatter = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' })
  return `${dateFormatter.format(startDate)} · ${timeFormatter.format(startDate)} – ${timeFormatter.format(endDate)}`
}

function formatTime(isoString: string) {
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(isoString))
}

function resetForm() {
  form.name = ''
  form.email = ''
  form.notes = ''
}

async function handleSubmit() {
  await booking.bookSlot(form)
  if (booking.success.value) resetForm()
}

onMounted(async () => {
  await booking.loadEventTypes()
  if (booking.selectedEventType.value) {
    await booking.loadSlots(timeframe.value.start, timeframe.value.end)
  }
})

watch(() => booking.selectedEventType.value?.slug, async (slug) => {
  if (slug) {
    if (booking.success.value) {
      booking.reset()
      resetForm()
    }
    booking.selectedSlot.value = null
    selectedDayKey.value = null
    await booking.loadSlots(timeframe.value.start, timeframe.value.end)
  }
})
</script>

<template>
  <UContainer class="space-y-12 py-16">
    <!-- Header -->
    <div class="space-y-3">
      <UBadge variant="soft" color="neutral" class="uppercase tracking-wider text-xs">
        <span class="mr-1 text-terminal-400 opacity-70">></span>Book a Session
      </UBadge>
      <h1>Schedule time with Giancarlo</h1>
      <p class="max-w-2xl text-lg text-muted/80">
        Select a session type and a time that works for you — I'll send a calendar invite with all the details.
      </p>
    </div>

    <div class="grid gap-8 lg:grid-cols-[1.2fr,1fr]">
      <!-- Left: offering + slots -->
      <div class="space-y-6">

        <!-- Event types -->
        <UCard class="space-y-4">
          <div class="space-y-1">
            <p class="font-semibold text-base">Select an offering</p>
            <p class="text-sm text-muted/60">
              Architecture reviews, cloud platform deep dives, AI engineering, or general technical consultation.
            </p>
          </div>

          <div v-if="booking.loadingEventTypes.value" class="space-y-2">
            <USkeleton class="h-14 rounded-xl" />
            <USkeleton class="h-14 rounded-xl" />
          </div>

          <div v-else-if="booking.hasEventTypes.value" class="space-y-2">
            <button
              v-for="eventType in booking.eventTypes.value"
              :key="eventType.id"
              type="button"
              class="w-full rounded-xl border px-4 py-3 text-left transition"
              :class="booking.selectedEventType.value?.id === eventType.id
                ? 'border-primary bg-primary/10'
                : 'border-muted/20 hover:border-muted/40 bg-muted/5 hover:bg-muted/10'"
              @click="booking.selectedEventType.value = eventType"
            >
              <div class="flex items-center justify-between gap-4">
                <span class="text-sm font-semibold">{{ eventType.title }}</span>
                <UBadge
                  color="neutral"
                  variant="soft"
                  class="shrink-0 text-xs tabular-nums"
                >
                  {{ eventType.length }} min
                </UBadge>
              </div>
              <p v-if="eventType.description" class="mt-1 text-xs text-muted/60">
                {{ eventType.description }}
              </p>
            </button>
          </div>

          <UAlert
            v-else
            color="warning"
            variant="soft"
            icon="i-lucide-triangle-alert"
            title="No session types found"
            description="Check your Cal.com configuration."
          />
        </UCard>

        <!-- Time slots -->
        <UCard class="space-y-4">
          <div class="flex items-center justify-between">
            <p class="font-semibold text-base">Pick a time</p>
            <span class="text-xs text-muted/40">{{ userTimezone }}</span>
          </div>

          <!-- Loading -->
          <div v-if="booking.loadingSlots.value" class="space-y-4">
            <div class="flex gap-2 overflow-x-auto pb-1">
              <USkeleton v-for="n in 6" :key="n" class="h-16 w-14 shrink-0 rounded-xl" />
            </div>
            <div class="flex flex-wrap gap-2">
              <USkeleton v-for="n in 8" :key="n" class="h-9 w-24 rounded-lg" />
            </div>
          </div>

          <div v-else-if="booking.hasSlots.value" class="space-y-5">
            <!-- Day strip -->
            <div class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              <button
                v-for="day in dayGroups"
                :key="day.key"
                type="button"
                class="flex min-w-[3.25rem] shrink-0 flex-col items-center rounded-xl border px-2 py-2.5 transition"
                :class="selectedDayKey === day.key
                  ? 'border-primary bg-primary/10'
                  : 'border-muted/20 bg-muted/5 hover:border-muted/40 hover:bg-muted/10'"
                @click="selectedDayKey = day.key; booking.selectedSlot.value = null"
              >
                <span
                  class="text-[10px] font-semibold uppercase tracking-wider"
                  :class="selectedDayKey === day.key ? 'text-primary' : 'text-muted/50'"
                >
                  {{ day.weekday }}
                </span>
                <span
                  class="text-xl font-bold leading-tight tabular-nums"
                  :class="selectedDayKey === day.key ? 'text-primary' : ''"
                >
                  {{ day.date }}
                </span>
                <span
                  class="mt-0.5 text-[10px] tabular-nums"
                  :class="selectedDayKey === day.key ? 'text-primary/70' : 'text-muted/30'"
                >
                  {{ day.slots.length }} open
                </span>
              </button>
            </div>

            <!-- Slots for selected day -->
            <div v-if="selectedDayGroup" class="space-y-2">
              <p class="text-xs font-semibold uppercase tracking-widest text-muted/50">
                {{ selectedDayGroup.label }}
              </p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="slot in selectedDayGroup.slots"
                  :key="`${slot.start}-${slot.end}`"
                  type="button"
                  class="rounded-lg border px-3 py-1.5 text-xs font-medium tabular-nums transition"
                  :class="booking.selectedSlot.value?.start === slot.start
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-muted/20 bg-muted/5 hover:border-primary/40 hover:bg-primary/5'"
                  @click="booking.selectedSlot.value = slot"
                >
                  {{ formatTime(slot.start) }}
                </button>
              </div>
            </div>
          </div>

          <UAlert
            v-else-if="!booking.loadingEventTypes.value"
            color="neutral"
            variant="soft"
            icon="i-lucide-calendar-x"
            title="No availability in the next 14 days"
            description="Reach out via the contact page and we'll sort something."
          />
        </UCard>
      </div>

      <!-- Right: summary + form -->
      <div class="space-y-4">

        <!-- Selected slot summary -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <UCard v-if="selectedSlotSummary" class="space-y-3">
            <div class="flex items-start justify-between gap-4">
              <div class="space-y-1">
                <p class="text-xs uppercase tracking-widest text-muted/40">Selected</p>
                <p class="font-semibold text-sm">{{ selectedSlotSummary }}</p>
                <p v-if="booking.selectedEventType.value" class="text-xs text-muted/60">
                  {{ booking.selectedEventType.value.title }} · {{ booking.selectedEventType.value.length }} min
                </p>
              </div>
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-lucide-x"
                aria-label="Clear selection"
                @click="booking.selectedSlot.value = null"
              />
            </div>
          </UCard>
        </Transition>

        <!-- Booking form -->
        <UCard class="space-y-5">
          <div class="space-y-1">
            <p class="font-semibold text-base">Your details</p>
            <p class="text-sm text-muted/60">
              I'll use these to confirm the booking and send meeting details.
            </p>
          </div>

          <UAlert
            v-if="booking.error.value"
            color="error"
            variant="soft"
            icon="i-lucide-circle-x"
            :title="booking.error.value"
          />

          <UAlert
            v-if="booking.success.value"
            color="success"
            variant="soft"
            icon="i-lucide-check-circle"
            title="Booking confirmed"
            :description="`Check your inbox. Reference: ${booking.success.value?.uid}`"
          />

          <form class="space-y-4" @submit.prevent="handleSubmit">
            <UFormField label="Name">
              <UInput
                v-model="form.name"
                placeholder="Your name"
                size="lg"
                class="w-full"
                required
              />
            </UFormField>

            <UFormField label="Email">
              <UInput
                v-model="form.email"
                type="email"
                placeholder="you@example.com"
                size="lg"
                class="w-full"
                required
              />
            </UFormField>

            <UFormField label="Notes">
              <UTextarea
                v-model="form.notes"
                placeholder="Context for our session (optional)"
                :rows="3"
                size="lg"
                class="w-full"
              />
            </UFormField>

            <UButton
              type="submit"
              color="primary"
              size="lg"
              class="w-full"
              icon="i-lucide-calendar-check"
              :loading="booking.creatingBooking.value"
              :disabled="!booking.selectedSlot.value || !form.name || !form.email"
              label="Confirm booking"
            />

            <p v-if="!booking.selectedSlot.value" class="text-center text-xs text-muted/40">
              Select a time slot to continue
            </p>
          </form>
        </UCard>
      </div>
    </div>
  </UContainer>
</template>
