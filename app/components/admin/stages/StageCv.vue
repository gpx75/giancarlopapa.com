<script setup lang="ts">
import type {
  JobApplication,
  PersistedCvSuggestion,
  CvSuggestionStatus
} from '~/types/applications';

const props = defineProps<{
  application: JobApplication;
}>();

const emit = defineEmits<{
  transitioned: [];
}>();

const {
  suggestions,
  loading,
  generating,
  refresh,
  regenerate,
  setStatus,
  counters
} = useCvSuggestions(() => props.application.id);

onMounted(refresh);
watch(() => props.application.id, refresh);

const stage = computed(() => props.application.workflow.stages.cv);

const filter = ref<'all' | CvSuggestionStatus>('all');
const filtered = computed<PersistedCvSuggestion[]>(() =>
  filter.value === 'all'
    ? suggestions.value
    : suggestions.value.filter((s) => s.status === filter.value)
);

function priorityColor(p: string): 'error' | 'warning' | 'neutral' {
  if (p === 'high') return 'error';
  if (p === 'medium') return 'warning';
  return 'neutral';
}

function statusColor(s: CvSuggestionStatus): 'success' | 'neutral' | 'info' {
  if (s === 'applied') return 'success';
  if (s === 'dismissed') return 'neutral';
  return 'info';
}

const completing = ref(false);
async function complete() {
  completing.value = true;
  try {
    await $fetch(`/api/admin/applications/${props.application.id}/workflow`, {
      method: 'POST',
      body: { stage: 'cv', action: 'complete' }
    });
    emit('transitioned');
  } finally {
    completing.value = false;
  }
}

async function reset() {
  await $fetch(`/api/admin/applications/${props.application.id}/workflow`, {
    method: 'POST',
    body: { stage: 'cv', action: 'reset' }
  });
  emit('transitioned');
}
</script>

<template>
  <div class="space-y-4">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold">CV tailoring</h2>
            <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Mark each suggestion as applied or dismissed. State persists
              across regenerations.
            </p>
          </div>
          <UBadge
            :color="
              stage.status === 'done'
                ? 'success'
                : stage.status === 'in_progress'
                  ? 'info'
                  : 'neutral'
            "
            variant="subtle"
          >
            {{ stage.status }}
          </UBadge>
        </div>
      </template>

      <div class="flex flex-wrap items-center gap-2 mb-4">
        <UBadge color="neutral" variant="soft"
          >{{ counters.total }} total</UBadge
        >
        <UBadge color="success" variant="soft"
          >{{ counters.applied }} applied</UBadge
        >
        <UBadge color="info" variant="soft"
          >{{ counters.pending }} pending</UBadge
        >
        <UBadge color="neutral" variant="soft"
          >{{ counters.dismissed }} dismissed</UBadge
        >
        <div class="ml-auto flex gap-2">
          <UButton
            color="neutral"
            variant="soft"
            size="sm"
            icon="i-lucide-refresh-cw"
            :loading="generating"
            :disabled="!application.job_description"
            @click="regenerate"
          >
            {{ suggestions.length ? 'Regenerate' : 'Generate' }}
          </UButton>
        </div>
      </div>

      <UTabs
        :items="[
          { label: 'All', value: 'all' },
          { label: 'Pending', value: 'pending' },
          { label: 'Applied', value: 'applied' },
          { label: 'Dismissed', value: 'dismissed' }
        ]"
        :model-value="filter"
        @update:model-value="
          (v: string | number) => (filter = v as 'all' | CvSuggestionStatus)
        "
        class="mb-4"
      />

      <div v-if="loading" class="text-sm text-neutral-500">Loading…</div>

      <div
        v-else-if="!filtered.length"
        class="text-sm text-neutral-500 text-center py-6"
      >
        <UIcon name="i-lucide-inbox" class="mb-2" />
        <div>No suggestions in this view.</div>
      </div>

      <ul v-else class="space-y-3">
        <li
          v-for="s in filtered"
          :key="s.id"
          class="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 bg-neutral-50/50 dark:bg-neutral-900/50"
        >
          <div class="flex items-start justify-between gap-2 mb-2">
            <div class="flex flex-wrap items-center gap-1.5">
              <UBadge
                :color="priorityColor(s.priority)"
                variant="subtle"
                size="sm"
                >{{ s.priority }}</UBadge
              >
              <UBadge color="neutral" variant="outline" size="sm">{{
                s.section
              }}</UBadge>
              <UBadge :color="statusColor(s.status)" variant="soft" size="sm">{{
                s.status
              }}</UBadge>
            </div>
          </div>
          <div class="text-sm font-semibold mb-1">{{ s.issue }}</div>
          <div class="text-sm text-neutral-700 dark:text-neutral-300 mb-3">
            {{ s.suggestion }}
          </div>
          <div class="flex flex-wrap gap-1.5">
            <UButton
              size="xs"
              :color="s.status === 'applied' ? 'success' : 'neutral'"
              :variant="s.status === 'applied' ? 'solid' : 'soft'"
              icon="i-lucide-check"
              @click="
                setStatus(s.id, s.status === 'applied' ? 'pending' : 'applied')
              "
            >
              {{ s.status === 'applied' ? 'Applied' : 'Mark applied' }}
            </UButton>
            <UButton
              size="xs"
              :color="s.status === 'dismissed' ? 'neutral' : 'neutral'"
              :variant="s.status === 'dismissed' ? 'solid' : 'ghost'"
              icon="i-lucide-x"
              @click="
                setStatus(
                  s.id,
                  s.status === 'dismissed' ? 'pending' : 'dismissed'
                )
              "
            >
              {{ s.status === 'dismissed' ? 'Dismissed' : 'Dismiss' }}
            </UButton>
          </div>
        </li>
      </ul>
    </UCard>

    <AdminTailoredResumePanel
      :application-id="application.id"
      :company="application.company"
    />

    <div class="flex items-center justify-between flex-wrap gap-2">
      <UButton
        v-if="stage.status === 'done'"
        color="neutral"
        variant="ghost"
        icon="i-lucide-undo-2"
        @click="reset"
      >
        Reopen CV stage
      </UButton>
      <UButton
        v-else
        color="primary"
        icon="i-lucide-check"
        class="ml-auto"
        :loading="completing"
        @click="complete"
      >
        Mark CV ready
      </UButton>
    </div>
  </div>
</template>
