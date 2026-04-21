<script setup lang="ts">
import type { JobApplication, ReviewChecklist } from '~/types/applications';

const props = defineProps<{
  application: JobApplication
}>();

const emit = defineEmits<{
  transitioned: []
}>();

const stage = computed(() => props.application.workflow.stages.review);

const CHECKS: { key: keyof ReviewChecklist, label: string, hint: string }[] = [
  { key: 'jd_read',         label: 'JD re-read end-to-end',         hint: 'No skimming. Look for buried requirements.' },
  { key: 'scoring_ok',      label: 'Match scoring still makes sense', hint: 'Spot-check the breakdown — adjust if the JD changed.' },
  { key: 'cv_ok',           label: 'Tailored CV reviewed & saved',  hint: 'Open the tailored JSON, scan for stale claims, regenerate PDF.' },
  { key: 'cover_letter_ok', label: 'Active cover letter chosen',    hint: 'Exactly one version is pinned and the prose reads cleanly.' },
  { key: 'references_ok',   label: 'Reference letters selected',    hint: 'Ticked the right ones for this employer.' },
  { key: 'recipient_ok',    label: 'Recipient & subject correct',   hint: 'Email, name, role title, ATS link — verified.' }
];

const checklist = ref<ReviewChecklist>({ ...stage.value.checklist });

watch(() => props.application.id, () => {
  checklist.value = { ...props.application.workflow.stages.review.checklist };
});

const allChecked = computed(() => CHECKS.every(c => checklist.value[c.key]));

const completing = ref(false);
async function complete() {
  completing.value = true;
  try {
    await $fetch(`/api/admin/applications/${props.application.id}/workflow`, {
      method: 'POST',
      body: { stage: 'review', action: 'complete', meta: { checklist: checklist.value } }
    });
    emit('transitioned');
  } finally {
    completing.value = false;
  }
}

async function reset() {
  await $fetch(`/api/admin/applications/${props.application.id}/workflow`, {
    method: 'POST',
    body: { stage: 'review', action: 'reset' }
  });
  emit('transitioned');
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold">Pre-flight review</h2>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Manual gate. Apply is locked until every box is ticked.
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

    <ul class="space-y-3">
      <li
        v-for="c in CHECKS"
        :key="c.key"
        class="flex items-start gap-3 rounded-md border border-neutral-200 dark:border-neutral-800 p-3"
      >
        <UCheckbox
          v-model="checklist[c.key]"
          :disabled="stage.status === 'done'"
          class="mt-0.5"
        />
        <div class="min-w-0 flex-1">
          <div class="text-sm font-medium">{{ c.label }}</div>
          <div class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{{ c.hint }}</div>
        </div>
      </li>
    </ul>

    <template #footer>
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <UButton
          v-if="stage.status === 'done'"
          color="neutral"
          variant="ghost"
          icon="i-lucide-undo-2"
          @click="reset"
        >
          Reopen review
        </UButton>
        <UButton
          v-else
          color="primary"
          icon="i-lucide-clipboard-check"
          class="ml-auto"
          :loading="completing"
          :disabled="!allChecked"
          @click="complete"
        >
          Confirm review complete
        </UButton>
      </div>
    </template>
  </UCard>
</template>
