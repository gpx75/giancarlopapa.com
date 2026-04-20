<script setup lang="ts">
import type { CvSuggestion } from '~/types/applications';

const props = defineProps<{
  applicationId: number
  suggestions: CvSuggestion[]
  loading: boolean
}>();

const emit = defineEmits<{
  generated: [suggestions: CvSuggestion[]]
  regenerate: []
}>();

const toast = useToast();
const clipboardFallbackText = ref<string | null>(null);

// localStorage-backed "done" checkboxes per suggestion
const doneKeys = computed(() =>
  props.suggestions.map((_, i) => `cv_done_${props.applicationId}_${i}`)
);

const done = ref<boolean[]>([]);

watch(() => props.suggestions, (sug) => {
  done.value = sug.map((_, i) =>
    localStorage.getItem(`cv_done_${props.applicationId}_${i}`) === '1'
  );
}, { immediate: true });

function toggleDone(idx: number) {
  done.value[idx] = !done.value[idx];
  localStorage.setItem(doneKeys.value[idx], done.value[idx] ? '1' : '0');
}

const sorted = computed(() => {
  const order = { high: 0, medium: 1, low: 2 } as Record<string, number>;
  return props.suggestions
    .map((s, i) => ({ ...s, _idx: i }))
    .sort((a, b) => (order[a.priority] ?? 3) - (order[b.priority] ?? 3));
});

const allHighDone = computed(() => {
  return sorted.value
    .filter(s => s.priority === 'high')
    .every(s => done.value[s._idx]);
});

async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      toast.add({ title: 'Copied', color: 'success', icon: 'i-lucide-clipboard-check' });
      return;
    } catch { /* fall through */ }
  }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
    document.body.appendChild(el);
    el.focus();
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    if (ok) {
      toast.add({ title: 'Copied', color: 'success', icon: 'i-lucide-clipboard-check' });
      return;
    }
  } catch { /* fall through */ }
  clipboardFallbackText.value = text;
}

type BadgeColor = 'error' | 'warning' | 'neutral';
const priorityColor = (p: string): BadgeColor =>
  p === 'high' ? 'error' : p === 'medium' ? 'warning' : 'neutral';
</script>

<template>
  <div class="space-y-2">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center gap-2 text-xs text-muted py-2">
      <UIcon name="i-lucide-loader" class="size-3 animate-spin" />
      Generating CV suggestions...
    </div>

    <template v-else-if="suggestions.length > 0">
      <!-- High-priority complete banner -->
      <div
        v-if="allHighDone && sorted.some(s => s.priority === 'high')"
        class="flex items-center gap-2 rounded-md bg-success/10 border border-success/20 px-3 py-2 text-xs text-success"
      >
        <UIcon name="i-lucide-circle-check" class="size-3.5 shrink-0" />
        All high-priority gaps addressed
      </div>

      <div
        v-for="s in sorted"
        :key="s._idx"
        class="rounded-md border border-default p-3 text-xs space-y-1.5"
        :class="done[s._idx] ? 'opacity-50' : ''"
      >
        <div class="flex items-center gap-2">
          <!-- Done checkbox -->
          <button
            class="shrink-0 mt-0.5"
            :title="done[s._idx] ? 'Mark as not done' : 'Mark as done'"
            @click="toggleDone(s._idx)"
          >
            <UIcon
              :name="done[s._idx] ? 'i-lucide-circle-check' : 'i-lucide-circle'"
              class="size-3.5"
              :class="done[s._idx] ? 'text-success' : 'text-muted'"
            />
          </button>

          <UBadge
            :label="s.priority"
            :color="priorityColor(s.priority)"
            variant="subtle"
            size="xs"
            class="capitalize shrink-0"
          />
          <span class="font-semibold text-foreground flex-1 min-w-0 truncate">{{ s.section }}</span>

          <!-- Copy suggestion text -->
          <UButton
            icon="i-lucide-clipboard"
            size="xs"
            variant="ghost"
            color="neutral"
            square
            :title="'Copy suggestion'"
            @click="copyToClipboard(s.suggestion)"
          />
        </div>

        <p class="text-muted" :class="done[s._idx] && 'line-through'">{{ s.issue }}</p>
        <p class="text-foreground leading-relaxed">{{ s.suggestion }}</p>
      </div>

      <UButton
        icon="i-lucide-refresh-cw"
        label="Regenerate"
        size="xs"
        variant="ghost"
        color="neutral"
        class="mt-1"
        @click="emit('regenerate')"
      />
    </template>

    <p v-else-if="!loading" class="text-xs text-muted">No suggestions generated.</p>

    <!-- Clipboard fallback -->
    <UModal v-if="clipboardFallbackText !== null" :open="true" title="Copy suggestion" @close="clipboardFallbackText = null">
      <template #body>
        <p class="text-xs text-muted mb-2">Select all and copy manually:</p>
        <UTextarea
          :model-value="clipboardFallbackText"
          :rows="6"
          readonly
          autofocus
          class="w-full text-sm font-mono"
          @focus="($event.target as HTMLTextAreaElement).select()"
        />
      </template>
      <template #footer>
        <UButton label="Close" color="neutral" variant="ghost" @click="clipboardFallbackText = null" />
      </template>
    </UModal>
  </div>
</template>
