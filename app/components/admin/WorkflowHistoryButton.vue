<script setup lang="ts">
interface HistoryEvent {
  id: number
  stage: string
  action: string
  meta: Record<string, unknown> | null
  created_at: string
}

const props = defineProps<{
  applicationId: number
}>();

const open = ref(false);
const events = ref<HistoryEvent[]>([]);
const loading = ref(false);

const STAGE_LABELS: Record<string, string> = {
  analyze: 'Analyze',
  prioritize: 'Prioritize',
  cv: 'CV',
  cover_letter: 'Cover letter',
  review: 'Review',
  apply: 'Apply',
  interview_prep: 'Interview prep',
  closed: 'Closed'
};

const ACTION_META: Record<string, { color: 'primary' | 'success' | 'warning' | 'neutral' | 'info', icon: string, label: string }> = {
  enter: { color: 'info', icon: 'i-lucide-log-in', label: 'Entered' },
  complete: { color: 'success', icon: 'i-lucide-check-circle', label: 'Completed' },
  unlock: { color: 'warning', icon: 'i-lucide-unlock', label: 'Unlocked' },
  skip: { color: 'neutral', icon: 'i-lucide-skip-forward', label: 'Skipped' }
};

function actionInfo(action: string) {
  return ACTION_META[action] ?? { color: 'neutral' as const, icon: 'i-lucide-circle-dot', label: action };
}

const DOT_CLASSES: Record<string, string> = {
  info: 'bg-info-500',
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  neutral: 'bg-neutral-500',
  primary: 'bg-primary-500'
};

function dotClass(action: string) {
  return DOT_CLASSES[actionInfo(action).color] ?? 'bg-neutral-500';
}

function stageLabel(stage: string) {
  return STAGE_LABELS[stage] ?? stage;
}

const dateFmt = new Intl.DateTimeFormat('en-CH', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

function formatDate(iso: string) {
  return dateFmt.format(new Date(iso));
}

function ago(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

async function load() {
  loading.value = true;
  try {
    events.value = await $fetch<HistoryEvent[]>(`/api/admin/applications/${props.applicationId}/workflow-history`);
  } catch {
    events.value = [];
  } finally {
    loading.value = false;
  }
}

watch(open, (v) => {
  if (v) load();
});
</script>

<template>
  <div>
    <UButton
      icon="i-lucide-history"
      size="xs"
      variant="ghost"
      color="neutral"
      @click="open = true"
    >
      History
    </UButton>

    <USlideover
      v-model:open="open"
      title="Workflow history"
      description="Every stage transition for this application, newest first."
      side="right"
    >
      <template #body>
        <div v-if="loading" class="flex items-center gap-2 text-sm text-muted">
          <UIcon name="i-lucide-loader" class="size-4 animate-spin" />
          Loading…
        </div>
        <div v-else-if="!events.length" class="text-sm text-muted italic">
          No transitions recorded yet.
        </div>
        <ol v-else class="relative border-s border-default ms-2 space-y-4 ps-4">
          <li v-for="ev in events" :key="ev.id" class="relative">
            <span
              class="absolute -start-5.5 top-1 size-3 rounded-full ring-2 ring-default"
              :class="dotClass(ev.action)"
            />
            <div class="flex flex-wrap items-center gap-2">
              <UBadge
                :color="actionInfo(ev.action).color"
                variant="subtle"
                size="xs"
                :icon="actionInfo(ev.action).icon"
                :label="actionInfo(ev.action).label"
              />
              <span class="text-sm font-medium">{{ stageLabel(ev.stage) }}</span>
              <span class="text-xs text-muted ms-auto" :title="formatDate(ev.created_at)">
                {{ ago(ev.created_at) }}
              </span>
            </div>
            <details v-if="ev.meta && Object.keys(ev.meta).length" class="mt-2">
              <summary class="text-xs text-muted cursor-pointer hover:text-default">
                Meta ({{ Object.keys(ev.meta).length }} fields)
              </summary>
              <pre class="text-xs font-mono bg-elevated/50 rounded-md p-2 mt-1 overflow-auto max-h-60">{{ JSON.stringify(ev.meta, null, 2) }}</pre>
            </details>
          </li>
        </ol>
      </template>
    </USlideover>
  </div>
</template>
