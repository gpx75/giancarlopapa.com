<script setup lang="ts">
import type { JobApplication, ApplicationPriority } from '~/types/applications';

const props = defineProps<{
  application: JobApplication;
}>();

const emit = defineEmits<{
  refreshed: [JobApplication];
  transitioned: [];
}>();

const toast = useToast();

const stage = computed(() => props.application.workflow.stages.prioritize);

const priority = ref<ApplicationPriority | null>(
  props.application.priority ?? null
);
const rationale = ref(stage.value.rationale ?? '');
const saving = ref(false);
const completing = ref(false);

watch(
  () => props.application.id,
  () => {
    priority.value = props.application.priority ?? null;
    rationale.value =
      props.application.workflow.stages.prioritize.rationale ?? '';
  }
);

const PRIORITY_OPTIONS: {
  value: ApplicationPriority;
  label: string;
  color: 'error' | 'warning' | 'neutral';
}[] = [
  { value: 'p0', label: 'P0 — Apply now', color: 'error' },
  { value: 'p1', label: 'P1 — Tailor & apply', color: 'warning' },
  { value: 'p2', label: 'P2 — Backlog', color: 'neutral' }
];

const suggested = computed<ApplicationPriority | null>(() => {
  const rate = props.application.match_rate ?? 0;
  if (rate >= 80) return 'p0';
  if (rate >= 60) return 'p1';
  return 'p2';
});

async function saveDraft() {
  if (!priority.value) {
    toast.add({
      title: 'Pick a priority first',
      color: 'warning',
      icon: 'i-lucide-flag'
    });
    return;
  }
  saving.value = true;
  try {
    const updated = await $fetch<JobApplication>(
      `/api/admin/applications/${props.application.id}`,
      {
        method: 'PATCH',
        body: { priority: priority.value }
      }
    );
    emit('refreshed', updated);
    toast.add({
      title: 'Priority saved',
      color: 'success',
      icon: 'i-lucide-check'
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Save failed.';
    toast.add({
      title: 'Save failed',
      description: msg,
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    });
  } finally {
    saving.value = false;
  }
}

async function confirm() {
  if (!priority.value) {
    toast.add({
      title: 'Pick a priority first',
      color: 'warning',
      icon: 'i-lucide-flag'
    });
    return;
  }
  if (!rationale.value.trim()) {
    toast.add({
      title: 'Rationale required',
      description: 'A short note keeps prioritisation honest.',
      color: 'warning',
      icon: 'i-lucide-pen-line'
    });
    return;
  }
  completing.value = true;
  try {
    await $fetch(`/api/admin/applications/${props.application.id}`, {
      method: 'PATCH',
      body: { priority: priority.value }
    });
    await $fetch(`/api/admin/applications/${props.application.id}/workflow`, {
      method: 'POST',
      body: {
        stage: 'prioritize',
        action: 'complete',
        meta: { rationale: rationale.value.trim() }
      }
    });
    emit('transitioned');
    toast.add({
      title: 'Prioritisation locked in',
      color: 'success',
      icon: 'i-lucide-check'
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Confirm failed.';
    toast.add({
      title: 'Confirm failed',
      description: msg,
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    });
  } finally {
    completing.value = false;
  }
}

async function reset() {
  try {
    await $fetch(`/api/admin/applications/${props.application.id}/workflow`, {
      method: 'POST',
      body: { stage: 'prioritize', action: 'reset' }
    });
    emit('transitioned');
  } catch {
    /* toast handled upstream */
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold">Prioritize</h2>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Decide if this role earns your time. Confirm with a short rationale
            — no auto-progress.
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

    <div class="space-y-5">
      <UAlert
        v-if="suggested && priority !== suggested && stage.status !== 'done'"
        color="info"
        variant="soft"
        icon="i-lucide-lightbulb"
        :title="`Suggested: ${suggested.toUpperCase()} (match ${application.match_rate ?? 0}%)`"
        description="You can override this — the suggestion is informational."
      />

      <div>
        <label
          class="text-xs font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2 block"
        >
          Priority tier
        </label>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <UButton
            v-for="opt in PRIORITY_OPTIONS"
            :key="opt.value"
            :color="priority === opt.value ? opt.color : 'neutral'"
            :variant="priority === opt.value ? 'solid' : 'soft'"
            block
            :disabled="stage.status === 'done'"
            @click="priority = opt.value"
          >
            {{ opt.label }}
          </UButton>
        </div>
      </div>

      <UFormField label="Rationale" required>
        <UTextarea
          v-model="rationale"
          :rows="3"
          placeholder="Why this tier? (e.g. strong tech overlap, hybrid Zurich, salary band fits.)"
          :disabled="stage.status === 'done'"
          class="w-full"
        />
      </UFormField>

      <USeparator />

      <div class="flex items-center justify-between flex-wrap gap-2">
        <UButton
          v-if="stage.status === 'done'"
          color="neutral"
          variant="ghost"
          icon="i-lucide-undo-2"
          @click="reset"
        >
          Reopen prioritisation
        </UButton>
        <div class="flex gap-2 ml-auto">
          <UButton
            v-if="stage.status !== 'done'"
            color="neutral"
            variant="soft"
            :loading="saving"
            @click="saveDraft"
          >
            Save draft
          </UButton>
          <UButton
            v-if="stage.status !== 'done'"
            color="primary"
            icon="i-lucide-check"
            :loading="completing"
            @click="confirm"
          >
            Confirm prioritisation
          </UButton>
        </div>
      </div>
    </div>
  </UCard>
</template>
