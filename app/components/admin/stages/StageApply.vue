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
      title: mode === 'send' ? 'Marked as sent' : 'Marked as exported',
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
  try {
    await $fetch(`/api/admin/applications/${props.application.id}/workflow`, {
      method: 'POST',
      body: { stage: 'apply', action: 'unlock' }
    });
    emit('applied', props.application);
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
              Send via the email panel, or export the assembled package and
              submit elsewhere.
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
            : 'Sent & marked applied'
        "
        :description="
          stage.sent_at
            ? `Sent at ${new Date(stage.sent_at).toLocaleString()}`
            : stage.exported_at
              ? `Exported at ${new Date(stage.exported_at).toLocaleString()}`
              : ''
        "
        class="mb-4"
      />

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <UButton
          color="primary"
          icon="i-lucide-send"
          size="lg"
          block
          :disabled="!reviewDone || locked"
          :loading="submitting === 'send'"
          @click="markApplied('send')"
        >
          Send & mark applied
        </UButton>
        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-download"
          size="lg"
          block
          :disabled="!reviewDone || locked"
          :loading="submitting === 'export'"
          @click="markApplied('export')"
        >
          Export package & mark applied
        </UButton>
      </div>

      <USeparator class="my-4" label="Send via email" />
      <AdminApplicationSendPanel
        :application="application"
        @sent="emit('applied', application)"
      />
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
