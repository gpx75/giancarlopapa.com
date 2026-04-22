<script setup lang="ts">
import type { JobApplication, InterviewChecklist } from '~/types/applications';

const props = defineProps<{
  application: JobApplication;
}>();

const emit = defineEmits<{
  transitioned: [];
  refreshed: [];
}>();

const toast = useToast();
const saving = ref(false);
const completing = ref(false);
const generating = ref(false);
const overwriteOpen = ref(false);

const stage = computed(() => props.application.workflow.stages.interview_prep);
const locked = computed(
  () => props.application.workflow.current_stage === 'closed'
);

const notes = ref<string>(stage.value.notes ?? '');
const scheduledAt = ref<string>(stage.value.scheduled_at ?? '');
const checklist = reactive<InterviewChecklist>({
  company_research: stage.value.checklist.company_research ?? false,
  role_research: stage.value.checklist.role_research ?? false,
  tech_prep: stage.value.checklist.tech_prep ?? false,
  questions_ready: stage.value.checklist.questions_ready ?? false,
  logistics_ready: stage.value.checklist.logistics_ready ?? false
});

// Reset local state when switching applications.
watch(
  () => props.application.id,
  () => {
    notes.value = stage.value.notes ?? '';
    scheduledAt.value = stage.value.scheduled_at ?? '';
    Object.assign(checklist, {
      company_research: stage.value.checklist.company_research ?? false,
      role_research: stage.value.checklist.role_research ?? false,
      tech_prep: stage.value.checklist.tech_prep ?? false,
      questions_ready: stage.value.checklist.questions_ready ?? false,
      logistics_ready: stage.value.checklist.logistics_ready ?? false
    });
  }
);

const checklistItems = computed(() => [
  {
    key: 'company_research' as const,
    label: 'Researched the company (mission, product, recent news)'
  },
  {
    key: 'role_research' as const,
    label: 'Mapped the role to my experience and talking points'
  },
  {
    key: 'tech_prep' as const,
    label: 'Practiced likely technical / system-design questions'
  },
  {
    key: 'questions_ready' as const,
    label: 'Prepared questions to ask the interviewer'
  },
  {
    key: 'logistics_ready' as const,
    label: 'Confirmed time, format, platform, and travel if any'
  }
]);

const readyToComplete = computed(() =>
  checklistItems.value.every((i) => checklist[i.key])
);

async function postTransition(action: 'enter' | 'complete') {
  const body = {
    stage: 'interview_prep',
    action,
    meta: {
      notes: notes.value,
      scheduled_at: scheduledAt.value || null,
      checklist: { ...checklist }
    }
  };
  return $fetch<{ id: number; workflow: JobApplication['workflow'] }>(
    `/api/admin/applications/${props.application.id}/workflow`,
    { method: 'POST', body }
  );
}

async function saveProgress() {
  saving.value = true;
  try {
    await postTransition('enter');
    toast.add({ title: 'Saved', color: 'success', icon: 'i-lucide-check' });
    emit('refreshed');
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

async function generateBrief(force: boolean) {
  if (!force && notes.value.trim().length > 0) {
    overwriteOpen.value = true;
    return;
  }
  generating.value = true;
  try {
    const result = await $fetch<{
      brief: string;
      based_on_match_analysis: boolean;
    }>(`/api/admin/applications/${props.application.id}/interview-brief`, {
      method: 'POST'
    });
    notes.value = result.brief;
    overwriteOpen.value = false;
    toast.add({
      title: 'Brief generated',
      description: result.based_on_match_analysis
        ? 'Anchored to your impact analysis.'
        : 'No impact analysis yet — generic brief generated.',
      color: 'success',
      icon: 'i-lucide-sparkles'
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Brief generation failed.';
    toast.add({
      title: 'Generation failed',
      description: msg,
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    });
  } finally {
    generating.value = false;
  }
}

async function markComplete() {
  if (!readyToComplete.value) {
    toast.add({
      title: 'Finish the checklist first',
      description:
        'Tick every preparation item before closing the application.',
      color: 'warning',
      icon: 'i-lucide-shield-alert'
    });
    return;
  }
  completing.value = true;
  try {
    await postTransition('complete');
    toast.add({
      title: 'Application closed',
      color: 'success',
      icon: 'i-lucide-check'
    });
    emit('transitioned');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Complete failed.';
    toast.add({
      title: 'Could not complete',
      description: msg,
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    });
  } finally {
    completing.value = false;
  }
}
</script>

<template>
  <div class="space-y-4">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold">Interview preparation</h2>
            <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Track preparation for this company's interview loop. Save notes as
              you go and mark complete once you've wrapped.
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

      <UAlert
        v-if="locked"
        color="success"
        variant="soft"
        icon="i-lucide-check-circle"
        title="Application closed"
        description="The workflow is locked. Reopen from the Apply stage to edit preparation."
        class="mb-4"
      />

      <div class="space-y-5">
        <!-- Scheduled date -->
        <UFormField
          label="Interview date / time"
          hint="Optional — e.g. 2026-05-03 14:00"
        >
          <UInput
            v-model="scheduledAt"
            placeholder="YYYY-MM-DD HH:mm"
            icon="i-lucide-calendar"
            :disabled="locked"
          />
        </UFormField>

        <!-- Checklist -->
        <div class="space-y-2">
          <div class="text-sm font-semibold">Preparation checklist</div>
          <div class="space-y-2">
            <label
              v-for="item in checklistItems"
              :key="item.key"
              class="flex items-start gap-3 p-3 rounded-md border border-default hover:bg-elevated/50 transition-colors cursor-pointer"
              :class="locked ? 'opacity-60 cursor-not-allowed' : ''"
            >
              <UCheckbox v-model="checklist[item.key]" :disabled="locked" />
              <span class="text-sm leading-tight">{{ item.label }}</span>
            </label>
          </div>
        </div>

        <!-- Notes -->
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <label class="text-sm font-medium">Notes</label>
            <UButton
              size="xs"
              variant="ghost"
              color="primary"
              icon="i-lucide-sparkles"
              :loading="generating"
              :disabled="locked"
              @click="generateBrief(false)"
            >
              Generate prep brief
            </UButton>
          </div>
          <UTextarea
            v-model="notes"
            :rows="12"
            placeholder="Research, likely questions, STAR stories, key metrics, your questions for them…"
            class="w-full font-mono text-xs"
            :disabled="locked"
          />
          <p class="text-xs text-muted">
            Prep notes, talking points, questions for them, post-interview
            debrief. Generate uses the company, JD, and your impact analysis to
            seed a structured brief.
          </p>
        </div>

        <div
          class="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-default"
        >
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-save"
            :loading="saving"
            :disabled="locked || completing"
            @click="saveProgress"
          >
            Save progress
          </UButton>
          <UButton
            color="success"
            icon="i-lucide-check-circle"
            :loading="completing"
            :disabled="locked || saving || !readyToComplete"
            @click="markComplete"
          >
            Mark complete & close
          </UButton>
        </div>
      </div>
    </UCard>
  </div>

  <UModal
    v-model:open="overwriteOpen"
    title="Overwrite existing notes?"
    description="Generating a new brief will replace the current notes."
  >
    <template #body>
      <p class="text-sm text-muted">
        Your existing notes will be replaced with a freshly generated brief.
        This can't be undone — copy them out first if you want to keep them.
      </p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton color="neutral" variant="ghost" @click="overwriteOpen = false"
          >Cancel</UButton
        >
        <UButton
          color="primary"
          icon="i-lucide-sparkles"
          :loading="generating"
          @click="generateBrief(true)"
        >
          Overwrite & generate
        </UButton>
      </div>
    </template>
  </UModal>
</template>
