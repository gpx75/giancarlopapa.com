<script setup lang="ts">
import type { JobApplication } from '~/types/applications';

const props = defineProps<{
  application: JobApplication
}>();

const emit = defineEmits<{
  transitioned: []
}>();

const stage = computed(() => props.application.workflow.stages.cover_letter);
const completing = ref(false);

async function complete() {
  completing.value = true;
  try {
    await $fetch(`/api/admin/applications/${props.application.id}/workflow`, {
      method: 'POST',
      body: { stage: 'cover_letter', action: 'complete' }
    });
    emit('transitioned');
  } finally {
    completing.value = false;
  }
}

async function reset() {
  await $fetch(`/api/admin/applications/${props.application.id}/workflow`, {
    method: 'POST',
    body: { stage: 'cover_letter', action: 'reset' }
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
            <h2 class="text-lg font-semibold">Cover letter</h2>
            <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Draft, refine, and pin an active version. Generation never overwrites — every run is a new draft.
            </p>
          </div>
          <UBadge
            :color="stage.status === 'done' ? 'success' : stage.status === 'in_progress' ? 'info' : 'neutral'"
            variant="subtle"
          >
            {{ stage.status }}
          </UBadge>
        </div>
      </template>

      <AdminCoverLetterPanel :application-id="application.id" />
    </UCard>

    <div class="flex items-center justify-between flex-wrap gap-2">
      <UButton
        v-if="stage.status === 'done'"
        color="neutral"
        variant="ghost"
        icon="i-lucide-undo-2"
        @click="reset"
      >
        Reopen cover letter stage
      </UButton>
      <UButton
        v-else
        color="primary"
        icon="i-lucide-check"
        class="ml-auto"
        :loading="completing"
        @click="complete"
      >
        Mark cover letter ready
      </UButton>
    </div>
  </div>
</template>
