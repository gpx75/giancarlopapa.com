<script setup lang="ts">
import type { ApplicationWorkflow, WorkflowStage } from '~/types/applications';

const props = defineProps<{
  workflow: ApplicationWorkflow
  active: WorkflowStage
}>();

const emit = defineEmits<{
  select: [stage: WorkflowStage]
}>();

interface StepDef {
  stage: WorkflowStage
  label: string
  icon: string
}

const STEPS: StepDef[] = [
  { stage: 'analyze',        label: 'Analyze',      icon: 'i-lucide-radar' },
  { stage: 'prioritize',     label: 'Prioritize',   icon: 'i-lucide-flag' },
  { stage: 'cv',             label: 'CV',           icon: 'i-lucide-file-text' },
  { stage: 'cover_letter',   label: 'Cover Letter', icon: 'i-lucide-mail' },
  { stage: 'review',         label: 'Review',       icon: 'i-lucide-clipboard-check' },
  { stage: 'apply',          label: 'Apply',        icon: 'i-lucide-send' },
  { stage: 'interview_prep', label: 'Interview',    icon: 'i-lucide-message-square' }
];

const locked = computed(() => props.workflow.current_stage === 'closed');

function statusOf(stage: WorkflowStage) {
  return props.workflow.stages[stage as Exclude<WorkflowStage, 'sent' | 'closed'>]?.status ?? 'pending';
}

function colorOf(stage: WorkflowStage) {
  if (stage === props.active) return 'primary';
  const s = statusOf(stage);
  if (s === 'done') return 'success';
  if (s === 'in_progress') return 'info';
  return 'neutral';
}

function iconOf(step: StepDef) {
  const s = statusOf(step.stage);
  if (s === 'done') return 'i-lucide-check';
  return step.icon;
}
</script>

<template>
  <div class="w-full">
    <UAlert
      v-if="locked"
      color="success"
      variant="soft"
      icon="i-lucide-lock"
      title="Application closed"
      description="This workflow is locked. Use Reopen to make further changes."
      class="mb-3"
    />
    <ol class="grid grid-cols-3 sm:grid-cols-7 gap-2">
      <li v-for="(step, i) in STEPS" :key="step.stage" class="min-w-0">
        <UButton
          :color="colorOf(step.stage)"
          :variant="step.stage === active ? 'solid' : 'soft'"
          :icon="iconOf(step)"
          block
          :disabled="locked"
          class="justify-start truncate"
          @click="emit('select', step.stage)"
        >
          <span class="hidden sm:inline text-xs font-mono opacity-70 mr-1">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="truncate">{{ step.label }}</span>
        </UButton>
      </li>
    </ol>
  </div>
</template>
