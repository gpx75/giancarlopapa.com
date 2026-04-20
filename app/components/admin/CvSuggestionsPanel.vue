<script setup lang="ts">
import type { CvSuggestion } from '~/types/applications';

const props = defineProps<{
  applicationId: number
  suggestions: CvSuggestion[]
  loading: boolean
}>();

const emit = defineEmits<{
  regenerate: []
}>();

const toast = useToast();
const clipboardFallbackText = ref<string | null>(null);

const sorted = computed(() => {
  const order = { high: 0, medium: 1, low: 2 } as Record<string, number>;
  return props.suggestions
    .map((s, i) => ({ ...s, _idx: i }))
    .sort((a, b) => (order[a.priority] ?? 3) - (order[b.priority] ?? 3));
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
  <div class="space-y-2 select-none">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center gap-2 text-xs text-muted py-2">
      <UIcon name="i-lucide-loader" class="size-3 animate-spin" />
      Generating CV suggestions...
    </div>

    <template v-else-if="suggestions.length > 0">
      <div
        v-for="s in sorted"
        :key="s._idx"
        class="rounded-md border border-default p-3 text-xs space-y-1.5"
      >
        <div class="flex items-center gap-2">
          <UBadge
            :label="s.priority"
            :color="priorityColor(s.priority)"
            variant="subtle"
            size="xs"
            class="capitalize shrink-0"
          />
          <span class="font-semibold text-foreground flex-1 min-w-0 truncate">{{ s.section }}</span>

          <UButton
            icon="i-lucide-clipboard"
            size="xs"
            variant="ghost"
            color="neutral"
            square
            title="Copy suggestion"
            @click="copyToClipboard(s.suggestion)"
          />
        </div>

        <p class="text-muted">{{ s.issue }}</p>
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
