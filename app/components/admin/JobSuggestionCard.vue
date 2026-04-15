<script setup lang="ts">
import type { JobSuggestion } from '~/types/applications';

type BadgeColor = 'primary' | 'neutral' | 'success' | 'warning';

const props = defineProps<{
  suggestion: JobSuggestion
}>();

const emit = defineEmits<{
  promote: [suggestion: JobSuggestion]
  dismiss: [suggestion: JobSuggestion]
  delete: [suggestion: JobSuggestion]
  analyze: [suggestion: JobSuggestion]
}>();

const analyzing = ref(false);

const statusColor = (status: string): BadgeColor => (({
  new: 'primary',
  reviewing: 'neutral',
  applied: 'success',
  dismissed: 'warning'
} as Record<string, BadgeColor>)[status] ?? 'neutral');

/** Human-friendly relative age like "2d ago", "3w ago" — only from real publish date */
const age = computed(() => {
  const dateStr = props.suggestion.published_at;
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
});
</script>

<template>
  <div class="rounded-lg border border-default p-3 space-y-2">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="text-sm font-medium truncate">{{ suggestion.title }}</p>
        <p class="text-xs text-muted truncate">
          {{ suggestion.company }}
          <span v-if="suggestion.location"> &middot; {{ suggestion.location }}</span>
        </p>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <span v-if="age" class="text-xs text-muted">{{ age }}</span>
        <UBadge
          v-if="suggestion.match_rate != null"
          :label="`${suggestion.match_rate}%`"
          :color="suggestion.match_rate >= 70 ? 'success' : suggestion.match_rate >= 40 ? 'warning' : 'error'"
          variant="subtle"
          size="xs"
        />
        <UBadge :label="suggestion.status" :color="statusColor(suggestion.status)" variant="subtle" size="xs" class="capitalize" />
      </div>
    </div>

    <p v-if="suggestion.description" class="text-xs text-muted line-clamp-2">
      {{ suggestion.description }}
    </p>

    <div class="flex items-center gap-2">
      <UBadge v-if="suggestion.source !== 'manual'" :label="suggestion.source" color="neutral" variant="outline" size="xs" />
      <UButton v-if="suggestion.url" :to="suggestion.url" target="_blank" size="xs" variant="link" icon="i-lucide-external-link" label="View" />
      <div class="flex-1" />
      <UButton
        v-if="suggestion.description && suggestion.match_rate == null"
        size="xs"
        variant="ghost"
        color="neutral"
        icon="i-lucide-sparkles"
        :loading="analyzing"
        @click="emit('analyze', suggestion)"
      />
      <UButton
        size="xs"
        variant="ghost"
        color="neutral"
        icon="i-lucide-x"
        @click="emit('dismiss', suggestion)"
      />
      <UButton
        size="xs"
        variant="soft"
        icon="i-lucide-arrow-right"
        label="Promote"
        @click="emit('promote', suggestion)"
      />
    </div>
  </div>
</template>
