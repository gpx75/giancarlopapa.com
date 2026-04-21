<script setup lang="ts">
import type { JobApplication } from '~/types/applications';

const props = defineProps<{
  application: JobApplication
}>();

const emit = defineEmits<{
  refreshed: [JobApplication]
}>();

const toast = useToast();
const running = ref(false);

const stage = computed(() => props.application.workflow.stages.analyze);
const lastRunLabel = computed(() => {
  if (!stage.value.last_run_at) return null;
  return new Date(stage.value.last_run_at).toLocaleString();
});

const breakdown = computed(() => props.application.match_breakdown ?? null);

async function runAnalysis() {
  running.value = true;
  try {
    const updated = await $fetch<JobApplication>(`/api/admin/applications/${props.application.id}/analyze`, {
      method: 'POST'
    });
    emit('refreshed', updated);
    toast.add({ title: 'Analysis complete', color: 'success', icon: 'i-lucide-check' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Analysis failed.';
    toast.add({ title: 'Analysis failed', description: msg, color: 'error', icon: 'i-lucide-triangle-alert' });
  } finally {
    running.value = false;
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold">Analyze match</h2>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Score the resume against this JD across 6 dimensions.
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

    <div class="space-y-4">
      <UAlert
        v-if="!application.job_description"
        color="warning"
        variant="soft"
        icon="i-lucide-triangle-alert"
        title="Job description required"
        description="Add the JD in the sidebar before running analysis."
      />

      <div v-if="breakdown" class="space-y-3">
        <AdminMatchRateDisplay
          :rate="application.match_rate ?? 0"
          :breakdown="breakdown"
        />
      </div>
      <div v-else class="text-sm text-neutral-500 dark:text-neutral-400">
        No analysis yet. Run it to see scoring.
      </div>

      <USeparator />

      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
          <span v-if="lastRunLabel">Last run: {{ lastRunLabel }}</span>
          <span v-else>Never run</span>
        </div>
        <UButton
          color="primary"
          icon="i-lucide-radar"
          :loading="running"
          :disabled="!application.job_description"
          @click="runAnalysis"
        >
          {{ breakdown ? 'Re-run analysis' : 'Run analysis' }}
        </UButton>
      </div>
    </div>
  </UCard>
</template>
