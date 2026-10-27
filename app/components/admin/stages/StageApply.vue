<script setup lang="ts">
import type { JobApplication, ApplyMode } from '~/types/applications';

const props = defineProps<{
  application: JobApplication;
}>();

const emit = defineEmits<{
  applied: [JobApplication];
}>();

const stage = computed(() => props.application.workflow.stages.apply);
const reviewDone = computed(
  () => props.application.workflow.stages.review.status === 'done'
);
const locked = computed(
  () =>
    props.application.workflow.current_stage === 'interview_prep' ||
    props.application.workflow.current_stage === 'sent' ||
    props.application.workflow.current_stage === 'closed'
);

const toast = useToast();
const submitting = ref<ApplyMode | null>(null);

async function markApplied(mode: ApplyMode) {
  if (!reviewDone.value) {
    toast.add({
      title: 'Review required',
      description: 'Tick all review boxes before marking applied.',
      color: 'warning',
      icon: 'i-lucide-shield-alert'
    });
    return;
  }
  submitting.value = mode;
  try {
    const updated = await $fetch<JobApplication>(
      `/api/admin/applications/${props.application.id}/apply`,
      {
        method: 'POST',
        body: { mode }
      }
    );
    emit('applied', updated);
    toast.add({
      title: mode === 'export' ? 'Exported & marked applied' : 'Marked applied',
      color: 'success',
      icon: 'i-lucide-check'
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Apply failed.';
    toast.add({
      title: 'Apply failed',
      description: msg,
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    });
  } finally {
    submitting.value = null;
  }
}

async function unlock() {
  // Only a closed workflow (sent/closed) is locked server-side; right after
  // Apply it sits in interview_prep, so reopening just resets the Apply stage.
  const current = props.application.workflow.current_stage;
  const terminal = current === 'sent' || current === 'closed';
  try {
    const updated = await $fetch<JobApplication>(
      `/api/admin/applications/${props.application.id}/workflow`,
      {
        method: 'POST',
        body: { stage: 'apply', action: terminal ? 'unlock' : 'reset' }
      }
    );
    emit('applied', updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unlock failed.';
    toast.add({
      title: 'Unlock failed',
      description: msg,
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    });
  }
}
</script>

<template>
  <div class="space-y-4">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold">Apply</h2>
            <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Mark applied once you have applied (portal, LinkedIn, recruiter).
            </p>
          </div>
          <UBadge
            :color="stage.status === 'done' ? 'success' : 'neutral'"
            variant="subtle"
          >
            {{ stage.status }}
          </UBadge>
        </div>
      </template>

      <UAlert
        v-if="!reviewDone && !locked"
        color="warning"
        variant="soft"
        icon="i-lucide-shield-alert"
        title="Review checklist not complete"
        description="Apply actions are disabled until pre-flight review is done."
        class="mb-4"
      />

      <UAlert
        v-if="locked"
        color="success"
        variant="soft"
        icon="i-lucide-check-circle"
        :title="
          stage.mode === 'export'
            ? 'Exported & marked applied'
            : stage.mode === 'send'
              ? 'Sent & marked applied'
              : 'Marked applied'
        "
        :description="
          application.applied_at
            ? `Applied on ${new Date(application.applied_at).toLocaleDateString()}`
            : ''
        "
        class="mb-4"
      />

      <UButton
        color="primary"
        icon="i-lucide-check"
        size="lg"
        block
        :disabled="!reviewDone || locked"
        :loading="submitting === 'manual'"
        @click="markApplied('manual')"
      >
        Mark applied
      </UButton>
    </UCard>

    <div v-if="locked" class="flex justify-end">
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-unlock"
        @click="unlock"
      >
        Reopen workflow
      </UButton>
    </div>
  </div>
</template>
