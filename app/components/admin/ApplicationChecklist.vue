<script setup lang="ts">
import type { JobApplication, ApplicationPriority } from '~/types/applications';

const props = defineProps<{
  application: JobApplication
  coverLetterCount: number
  cvSuggestionsLoaded: boolean
}>();

const emit = defineEmits<{
  goToAnalyze: []
  goToPriority: []
  goToCvSuggestions: []
  goToCoverLetter: []
  markApplied: []
}>();

const step1Done = computed(() => props.application.match_rate != null);
const step2Done = computed(() => props.application.priority != null);
const step3Done = computed(() => props.cvSuggestionsLoaded);
const step4Done = computed(() => props.coverLetterCount > 0);
const allDone = computed(() => step1Done.value && step2Done.value && step3Done.value && step4Done.value);

const steps = computed(() => [
  {
    label: 'Analyze match',
    done: step1Done.value,
    detail: step1Done.value ? `${props.application.match_rate}% match` : 'Run match analysis first',
    action: () => emit('goToAnalyze')
  },
  {
    label: 'Set priority',
    done: step2Done.value,
    detail: step2Done.value ? props.application.priority!.toUpperCase() : 'Classify role importance',
    action: () => emit('goToPriority')
  },
  {
    label: 'Tailor CV',
    done: step3Done.value,
    detail: step3Done.value ? 'CV suggestions reviewed' : 'Review CV improvement suggestions',
    action: () => emit('goToCvSuggestions')
  },
  {
    label: 'Cover letter',
    done: step4Done.value,
    detail: step4Done.value ? `${props.coverLetterCount} version${props.coverLetterCount > 1 ? 's' : ''} ready` : 'Generate a tailored cover letter',
    action: () => emit('goToCoverLetter')
  }
]);

const applying = ref(false);

function handleApply() {
  applying.value = true;
  emit('markApplied');
  // Parent handles the actual update; reset loading after a tick
  nextTick(() => { applying.value = false; });
}
</script>

<template>
  <div class="rounded-lg border border-default bg-elevated/30 p-3 space-y-3 select-none">
    <p class="text-xs text-muted uppercase tracking-wide font-medium">Application checklist</p>

    <div class="space-y-1.5">
      <div
        v-for="(step, idx) in steps"
        :key="idx"
        class="flex items-center gap-2.5"
      >
        <!-- Status icon -->
        <div class="shrink-0">
          <UIcon
            v-if="step.done"
            name="i-lucide-circle-check"
            class="size-4 text-success"
          />
          <div
            v-else
            class="size-4 rounded-full border-2 border-muted flex items-center justify-center"
          >
            <span class="text-[9px] text-muted font-mono">{{ idx + 1 }}</span>
          </div>
        </div>

        <!-- Label + detail -->
        <div class="flex-1 min-w-0">
          <span class="text-xs font-medium" :class="step.done ? 'text-foreground' : 'text-muted'">{{ step.label }}</span>
          <span class="text-xs text-muted ml-1.5">{{ step.detail }}</span>
        </div>

        <!-- Action link if not done -->
        <button
          v-if="!step.done"
          class="text-xs text-primary hover:underline shrink-0"
          @click="step.action"
        >
          Do this →
        </button>
      </div>
    </div>

    <!-- Apply button -->
    <div class="pt-1">
      <UButton
        icon="i-lucide-send"
        label="Mark as Applied"
        size="sm"
        :color="allDone ? 'primary' : 'neutral'"
        :variant="allDone ? 'solid' : 'outline'"
        :loading="applying"
        class="w-full justify-center"
        @click="handleApply"
      />
      <p v-if="!allDone" class="text-xs text-muted mt-1.5 text-center">
        Complete all steps above for the best application quality
      </p>
    </div>
  </div>
</template>
