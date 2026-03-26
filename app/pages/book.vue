<script setup lang="ts">
const {
  public: { siteUrl }
} = useRuntimeConfig();
const canonicalUrl = `${siteUrl}/book`;

useSeoMeta({
  title: 'Book a call — Giancarlo Papa',
  description:
    'Schedule a session with Giancarlo Papa — architecture reviews, cloud platform deep dives, or AI engineering consultations.',
  ogTitle: 'Book a call — Giancarlo Papa',
  ogDescription:
    'Schedule a session with Giancarlo Papa — architecture reviews, cloud platform deep dives, or AI engineering consultations.',
  ogUrl: canonicalUrl,
  robots: 'noindex, follow',
  twitterCard: 'summary',
  twitterTitle: 'Book a call — Giancarlo Papa',
  twitterDescription:
    'Schedule a session with Giancarlo Papa — architecture reviews, cloud platform deep dives, or AI engineering consultations.'
});

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }]
});

const { user, loggedIn } = useAuth();
const booking = useCalBooking();

const form = reactive({
  name: '',
  email: '',
  notes: ''
});

watch(
  loggedIn,
  (isLoggedIn) => {
    if (isLoggedIn && user.value) {
      form.name = form.name || user.value.name || '';
      form.email = form.email || user.value.email || '';
    }
  },
  { immediate: true }
);

const timeframe = computed(() => {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 14);
  return { start: start.toISOString(), end: end.toISOString() };
});

const userTimezone = computed(
  () => Intl.DateTimeFormat().resolvedOptions().timeZone
);

interface DayGroup {
  key: string;
  weekday: string;
  date: string;
  label: string;
  slots: typeof booking.slots.value;
}

const selectedDayKey = ref<string | null>(null);

const dayGroups = computed((): DayGroup[] => {
  const groups = new Map<string, DayGroup>();
  const keyFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: userTimezone.value,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const weekdayFormatter = new Intl.DateTimeFormat('en', {
    weekday: 'short',
    timeZone: userTimezone.value
  });
  const dayFormatter = new Intl.DateTimeFormat('en', {
    day: 'numeric',
    timeZone: userTimezone.value
  });
  const labelFormatter = new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: userTimezone.value
  });

  for (const slot of booking.slots.value) {
    const date = new Date(slot.start);
    const key = keyFormatter.format(date);
    const existing = groups.get(key);
    if (existing) {
      existing.slots.push(slot);
    } else {
      groups.set(key, {
        key,
        weekday: weekdayFormatter.format(date).toUpperCase(),
        date: dayFormatter.format(date),
        label: labelFormatter.format(date),
        slots: [slot]
      });
    }
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([, value]) => value);
});

const selectedDayGroup = computed(
  () =>
    dayGroups.value.find((g) => g.key === selectedDayKey.value) ??
    dayGroups.value[0] ??
    null
);

watch(
  dayGroups,
  (groups) => {
    if (groups.length && !selectedDayKey.value) {
      selectedDayKey.value = groups[0]?.key ?? null;
    }
  },
  { immediate: true }
);

const selectedSlotSummary = computed(() => {
  if (!booking.selectedSlot.value) return null;
  return formatSlotRange(
    booking.selectedSlot.value.start,
    booking.selectedSlot.value.end
  );
});

function formatSlotRange(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const dateFormatter = new Intl.DateTimeFormat('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
  const timeFormatter = new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit'
  });
  return `${dateFormatter.format(startDate)} · ${timeFormatter.format(startDate)} – ${timeFormatter.format(endDate)}`;
}

function formatTime(isoString: string) {
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(isoString));
}

function resetForm() {
  form.name = '';
  form.email = '';
  form.notes = '';
}

async function handleSubmit() {
  await booking.bookSlot(form);
  if (booking.success.value) resetForm();
}

async function loadBookingData() {
  if (booking.hasEventTypes.value || booking.loadingEventTypes.value) return;
  await booking.loadEventTypes();
  if (booking.selectedEventType.value) {
    await booking.loadSlots(timeframe.value.start, timeframe.value.end);
  }
}

// Session hydrates async after mount — watch for it becoming true
watch(
  loggedIn,
  (isLoggedIn) => {
    if (isLoggedIn) loadBookingData();
  },
  { immediate: true }
);

onMounted(() => {
  if (loggedIn.value) loadBookingData();
});

watch(
  () => booking.selectedEventType.value?.slug,
  async (slug) => {
    if (slug) {
      if (booking.success.value) {
        booking.reset();
        resetForm();
      }
      booking.selectedSlot.value = null;
      selectedDayKey.value = null;
      await booking.loadSlots(timeframe.value.start, timeframe.value.end);
    }
  }
);
</script>

<template>
  <UContainer class="space-y-12 py-16">
    <!-- Header -->
    <div class="space-y-4">
      <UBadge color="neutral" variant="soft" class="tracking-wider text-xs">
        <span><span class="text-success-400/60">~/</span>book</span>
      </UBadge>
      <h1>Schedule time with Giancarlo</h1>
      <p class="text-muted max-w-2xl">
        Select a session type and a time that works for you — I'll send a
        calendar invite with all the details.
      </p>
    </div>

    <AuthWall
      v-if="!loggedIn"
      title="Sign in to book a session"
      description="Use your existing account to confirm your identity before booking."
      class="max-w-md"
    />

    <div v-else class="grid gap-8 lg:grid-cols-[1.2fr,1fr]">
      <!-- Left: offering + slots -->
      <div class="space-y-6">
        <!-- Event types -->
        <UCard class="space-y-4">
          <div class="space-y-1">
            <p class="font-semibold text-base">Select an offering</p>
            <p class="text-sm text-dimmed">
              Architecture reviews, cloud platform deep dives, AI engineering,
              or general technical consultation.
            </p>
          </div>

          <div v-if="booking.loadingEventTypes.value" class="space-y-2">
            <USkeleton class="h-14 rounded-xl" />
            <USkeleton class="h-14 rounded-xl" />
          </div>

          <div v-else-if="booking.hasEventTypes.value" class="space-y-2">
            <UButton
              v-for="eventType in booking.eventTypes.value"
              :key="eventType.id"
              :variant="
                booking.selectedEventType.value?.id === eventType.id
                  ? 'soft'
                  : 'outline'
              "
              :color="
                booking.selectedEventType.value?.id === eventType.id
                  ? 'primary'
                  : 'neutral'
              "
              class="w-full justify-start text-left"
              size="lg"
              @click="booking.selectedEventType.value = eventType"
            >
              <div class="flex w-full items-center justify-between gap-4">
                <span class="text-sm font-semibold">{{ eventType.title }}</span>
                <UBadge
                  color="neutral"
                  variant="soft"
                  class="shrink-0 text-xs tabular-nums"
                >
                  {{ eventType.length }} min
                </UBadge>
              </div>
              <p v-if="eventType.description" class="mt-1 text-xs text-muted">
                {{ eventType.description }}
              </p>
            </UButton>
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
            <span class="text-xs text-dimmed">{{ userTimezone }}</span>
          </div>

          <!-- Loading -->
          <div v-if="booking.loadingSlots.value" class="space-y-4">
            <div class="flex gap-2 overflow-x-auto pb-1">
              <USkeleton
                v-for="n in 6"
                :key="n"
                class="h-16 w-14 shrink-0 rounded-xl"
              />
            </div>
            <div class="flex flex-wrap gap-2">
              <USkeleton v-for="n in 8" :key="n" class="h-9 w-24 rounded-lg" />
            </div>
          </div>

          <div v-else-if="booking.hasSlots.value" class="space-y-5">
            <!-- Day strip -->
            <div class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              <UButton
                v-for="day in dayGroups"
                :key="day.key"
                :variant="selectedDayKey === day.key ? 'soft' : 'outline'"
                :color="selectedDayKey === day.key ? 'primary' : 'neutral'"
                class="flex min-w-13 shrink-0 flex-col items-center px-2 py-2.5"
                @click="
                  selectedDayKey = day.key;
                  booking.selectedSlot.value = null;
                "
              >
                <span
                  class="text-xs font-semibold uppercase tracking-wider"
                  :class="
                    selectedDayKey === day.key ? 'text-primary' : 'text-muted'
                  "
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
                  class="mt-0.5 text-xs tabular-nums"
                  :class="
                    selectedDayKey === day.key
                      ? 'text-primary/70'
                      : 'text-muted'
                  "
                >
                  {{ day.slots.length }} open
                </span>
              </UButton>
            </div>

            <!-- Slots for selected day -->
            <div v-if="selectedDayGroup" class="space-y-2">
              <p
                class="text-xs font-semibold uppercase tracking-widest text-muted"
              >
                {{ selectedDayGroup.label }}
              </p>
              <div class="flex flex-wrap gap-2">
                <UButton
                  v-for="slot in selectedDayGroup.slots"
                  :key="`${slot.start}-${slot.end}`"
                  :variant="
                    booking.selectedSlot.value?.start === slot.start
                      ? 'soft'
                      : 'outline'
                  "
                  :color="
                    booking.selectedSlot.value?.start === slot.start
                      ? 'primary'
                      : 'neutral'
                  "
                  size="sm"
                  class="tabular-nums"
                  :label="formatTime(slot.start)"
                  @click="booking.selectedSlot.value = slot"
                />
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
                <p class="text-xs uppercase tracking-widest text-dimmed">
                  Selected
                </p>
                <p class="font-semibold text-sm">{{ selectedSlotSummary }}</p>
                <p
                  v-if="booking.selectedEventType.value"
                  class="text-xs text-dimmed"
                >
                  {{ booking.selectedEventType.value.title }} ·
                  {{ booking.selectedEventType.value.length }} min
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
            <p class="text-sm text-dimmed">
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
              :disabled="
                !booking.selectedSlot.value || !form.name || !form.email
              "
              label="Confirm booking"
            />

            <p
              v-if="!booking.selectedSlot.value"
              class="text-center text-xs text-dimmed"
            >
              Select a time slot to continue
            </p>
          </form>
        </UCard>
      </div>
    </div>
  </UContainer>
</template>
