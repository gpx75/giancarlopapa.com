<script setup lang="ts">
import type {
  JobApplication,
  PersistedCvSuggestion,
  CvSuggestionStatus,
  ProposedCvEdit
} from '~/types/applications';

const props = defineProps<{
  application: JobApplication;
}>();

const emit = defineEmits<{
  transitioned: [];
}>();

const toast = useToast();

// $fetch's own error message is a generic "422 Server Error" — the useful
// text lives in the h3 error body under `data.message`.
function apiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { data?: { message?: string } } | undefined)?.data;
  return data?.message ?? (err instanceof Error ? err.message : fallback);
}

const {
  suggestions,
  loading,
  generating,
  refresh,
  regenerate,
  setStatus,
  proposeDiff,
  applyEdits,
  counters
} = useCvSuggestions(() => props.application.id);

// ---- Auto-apply preview modal ----
const previewOpen = ref(false);
const previewLoading = ref(false);
const previewApplying = ref(false);
const previewSuggestion = ref<PersistedCvSuggestion | null>(null);
const previewEdits = ref<ProposedCvEdit[]>([]);
const previewError = ref('');

const applicableEdits = computed(() =>
  previewEdits.value.filter((e) => e.result.status === 'ok')
);

async function openPreview(suggestion: PersistedCvSuggestion) {
  previewSuggestion.value = suggestion;
  previewEdits.value = [];
  previewError.value = '';
  previewOpen.value = true;
  previewLoading.value = true;
  try {
    const { edits } = await proposeDiff(suggestion.id);
    previewEdits.value = edits;
  } catch (err: unknown) {
    previewError.value = apiErrorMessage(err, 'Could not generate a diff.');
  } finally {
    previewLoading.value = false;
  }
}

async function confirmApply() {
  if (!previewSuggestion.value || applicableEdits.value.length === 0) return;
  previewApplying.value = true;
  try {
    const result = await applyEdits(
      previewSuggestion.value.id,
      applicableEdits.value.map((e) => e.op)
    );
    toast.add({
      title: 'Applied to tailored resume',
      description: `Now ${result.pageCount} page${result.pageCount === 1 ? '' : 's'}.`,
      color: 'success',
      icon: 'i-lucide-sparkles'
    });
    previewOpen.value = false;
  } catch (err: unknown) {
    previewError.value = apiErrorMessage(err, 'Apply failed.');
  } finally {
    previewApplying.value = false;
  }
}

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
        class="mb-4"
        @update:model-value="
          (v: string | number) => (filter = v as 'all' | CvSuggestionStatus)
        "
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
              v-if="s.status === 'pending'"
              size="xs"
              color="primary"
              variant="soft"
              icon="i-lucide-wand-2"
              @click="openPreview(s)"
            >
              Auto-apply
            </UButton>
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

    <!-- Auto-apply preview modal -->
    <UModal
      v-model:open="previewOpen"
      title="Review auto-apply"
      description="Applies to the tailored resume for this application only — the public CV is never touched."
    >
      <template #body>
        <div v-if="previewLoading" class="text-sm text-neutral-500 py-4">
          Working out the exact edit…
        </div>

        <div v-else class="space-y-3">
          <UAlert
            v-if="previewError"
            color="error"
            variant="soft"
            icon="i-lucide-triangle-alert"
            :title="previewError"
          />

          <div
            v-for="(e, i) in previewEdits"
            :key="i"
            class="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 text-sm"
          >
            <div class="flex items-center gap-2 mb-2">
              <UBadge
                :color="
                  e.result.status === 'ok'
                    ? 'success'
                    : e.result.status === 'manual'
                      ? 'warning'
                      : 'error'
                "
                variant="subtle"
                size="xs"
              >
                {{ e.result.status }}
              </UBadge>
              <span
                v-if="e.result.path"
                class="text-xs font-mono text-neutral-500"
                >{{ e.result.path }}</span
              >
            </div>

            <template v-if="e.result.status === 'ok' && e.op.op === 'replace'">
              <div class="text-error line-through opacity-70 mb-1">
                {{ e.result.before }}
              </div>
              <div class="text-success">{{ e.result.after }}</div>
            </template>
            <template
              v-else-if="e.result.status === 'ok' && e.op.op === 'insert'"
            >
              <div class="text-success">+ {{ e.result.value }}</div>
            </template>
            <div v-else class="text-neutral-500">{{ e.result.message }}</div>
          </div>

          <p
            v-if="!previewLoading && previewEdits.length && !applicableEdits.length"
            class="text-sm text-neutral-500"
          >
            Nothing here can be auto-applied — edit the tailored resume
            manually instead.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" @click="previewOpen = false">
            Cancel
          </UButton>
          <UButton
            color="primary"
            icon="i-lucide-wand-2"
            :disabled="!applicableEdits.length"
            :loading="previewApplying"
            @click="confirmApply"
          >
            Apply {{ applicableEdits.length }} edit{{
              applicableEdits.length === 1 ? '' : 's'
            }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
