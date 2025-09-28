<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue'
import { useCalBooking } from '~/composables/useCalBooking'

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
  return {
    start: start.toISOString(),
    end: end.toISOString()
  }
})

const userTimezone = computed(() => Intl.DateTimeFormat().resolvedOptions().timeZone)

const groupedSlots = computed(() => {
  const groups = new Map<string, { label: string, slots: typeof booking.slots.value }>()
  const labelFormatter = new Intl.DateTimeFormat('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
  const keyFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: userTimezone.value,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })

  for (const slot of booking.slots.value) {
    const date = new Date(slot.start)
    const key = keyFormatter.format(date)
    const group = groups.get(key)
    if (group) {
      group.slots.push(slot)
    } else {
      groups.set(key, {
        label: labelFormatter.format(date),
        slots: [slot]
      })
    }
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([, value]) => value)
})

const selectedSlotSummary = computed(() => {
  if (!booking.selectedSlot.value) {
    return null
  }
  return formatSlotRange(booking.selectedSlot.value.start, booking.selectedSlot.value.end)
})

function formatSlotRange(start: string, end: string) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const dateFormatter = new Intl.DateTimeFormat('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
  const timeFormatter = new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit'
  })
  return `${dateFormatter.format(startDate)} · ${timeFormatter.format(startDate)} – ${timeFormatter.format(endDate)}`
}

function resetForm() {
  form.name = ''
  form.email = ''
  form.notes = ''
}

async function handleSubmit() {
  await booking.bookSlot(form)
  if (booking.success.value) {
    resetForm()
  }
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
    await booking.loadSlots(timeframe.value.start, timeframe.value.end)
  }
})
</script>

<template>
  <UContainer class="space-y-12 py-12 lg:space-y-16 lg:py-16">
    <div class="space-y-3">
      <UBadge
        variant="soft"
        color="neutral"
      >
        Book a Session
      </UBadge>
      <h1 class="text-4xl font-semibold sm:text-5xl">
        Schedule time with Giancarlo
      </h1>
      <p class="max-w-2xl text-lg text-muted/80">
        Pick an offering, choose a slot that fits your calendar, and I’ll send you a confirmation with meeting details.
      </p>
    </div>

    <div class="grid gap-8 lg:grid-cols-[1.2fr,1fr]">
      <UCard class="space-y-6">
        <div class="space-y-2">
          <h2 class="text-2xl font-semibold">
            Select an offering
          </h2>
          <p class="text-sm text-muted/80">
            Each session is designed for collaborative planning—from architecture reviews to AI/Docker/GCP deep dives.
          </p>
        </div>

        <div class="space-y-3">
          <USkeleton
            v-if="booking.loadingEventTypes.value"
            class="h-16 rounded-2xl"
          />

          <div
            v-else-if="booking.hasEventTypes.value"
            class="grid gap-3"
          >
            <button
              v-for="eventType in booking.eventTypes.value"
              :key="eventType.id"
              type="button"
              class="rounded-2xl border border-muted/40 p-4 text-left transition hover:border-primary/60"
              :class="{
                'border-primary bg-primary/10': booking.selectedEventType.value?.id === eventType.id
              }"
              @click="booking.selectedEventType.value = eventType"
            >
              <div class="flex items-center justify-between">
                <span class="text-lg font-semibold">{{ eventType.title }}</span>
                <span class="text-sm text-muted/80">{{ Math.round(eventType.length / 60) }} min</span>
              </div>
              <p
                v-if="eventType.description"
                class="mt-2 text-sm text-muted"
              >
                {{ eventType.description }}
              </p>
            </button>
          </div>

          <UAlert
            v-else
            color="warning"
            variant="soft"
            title="No event types found"
            description="Double-check your Cal.com configuration or create an event type first."
          />
        </div>

        <div class="space-y-2">
          <h3 class="text-xl font-semibold">
            Pick a time
          </h3>
          <p class="text-sm text-muted/80">
            Availability is shown in your local timezone.
          </p>
        </div>

        <USkeleton
          v-if="booking.loadingSlots.value"
          class="h-24 rounded-2xl"
        />

        <div
          v-else-if="booking.hasSlots.value"
          class="space-y-3"
        >
          <div
            v-for="group in groupedSlots"
            :key="group.label"
            class="space-y-2"
          >
            <p class="text-xs font-semibold uppercase tracking-widest text-muted/70">
              {{ group.label }}
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="slot in group.slots"
                :key="`${slot.start}-${slot.end}`"
                type="button"
                class="rounded-xl border border-muted/30 px-3 py-2 text-sm transition hover:border-primary/60 hover:bg-primary/5"
                :class="{
                  'border-primary bg-primary/10 text-primary font-medium': booking.selectedSlot.value?.start === slot.start
                }"
                @click="booking.selectedSlot.value = slot"
              >
                {{ formatSlotRange(slot.start, slot.end) }}
              </button>
            </div>
          </div>
        </div>

        <UAlert
          v-else
          color="info"
          variant="soft"
          title="No availability"
          description="Let me know your preferred time and I’ll follow up manually."
        />
      </UCard>

      <div class="space-y-6">
        <UCard
          v-if="selectedSlotSummary"
          class="space-y-3"
        >
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold uppercase tracking-widest text-muted/70">
                Selected session
              </h3>
              <UBadge
                v-if="booking.selectedEventType.value?.title"
                variant="soft"
                color="primary"
              >
                {{ booking.selectedEventType.value.title }}
              </UBadge>
            </div>
          </template>
          <div class="space-y-2 text-sm text-muted/90">
            <p class="font-medium text-foreground">
              {{ selectedSlotSummary }}
            </p>
            <p v-if="booking.selectedSlot.value?.timeZone">
              Timezone · {{ booking.selectedSlot.value.timeZone }}
            </p>
          </div>
          <template #footer>
            <div class="flex items-center justify-between text-xs text-muted/80">
              <span>
                Duration · {{ booking.selectedEventType.value?.length }} minutes
              </span>
              <button
                type="button"
                class="text-primary hover:underline"
                @click="booking.selectedSlot.value = null"
              >
                Change
              </button>
            </div>
          </template>
        </UCard>

        <UCard class="space-y-6">
          <div class="space-y-2">
            <h2 class="text-2xl font-semibold">
              Share your details
            </h2>
            <p class="text-sm text-muted/80">
              We’ll use this to confirm the booking and send meeting details.
            </p>
          </div>

          <UAlert
            v-if="booking.error.value"
            color="error"
            variant="soft"
            :title="booking.error.value"
          />

          <UAlert
            v-if="booking.success.value"
            color="success"
            variant="soft"
            title="Booking confirmed"
            :description="`Check your inbox for details. Reference: ${booking.success.value?.uid}`"
            icon="i-lucide-check-circle"
          />

          <form
            class="space-y-4"
            @submit.prevent="handleSubmit"
          >
            <div class="space-y-2">
              <label class="text-sm font-medium text-foreground">
                Name
              </label>
              <UInput
                v-model="form.name"
                placeholder="Your name"
              />
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium text-foreground">
                Email
              </label>
              <UInput
                v-model="form.email"
                type="email"
                placeholder="you@example.com"
              />
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium text-foreground">
                Notes
              </label>
              <UTextarea
                v-model="form.notes"
                placeholder="Context for our session (optional)"
                :rows="4"
              />
            </div>

            <UButton
              type="submit"
              color="primary"
              size="lg"
              class="w-full"
              :loading="booking.creatingBooking.value"
              :disabled="!booking.selectedSlot.value || !form.name || !form.email"
              label="Confirm booking"
            />
          </form>
        </UCard>
      </div>
    </div>
  </UContainer>
</template>
