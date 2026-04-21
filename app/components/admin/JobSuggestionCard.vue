<script setup lang="ts">
import type { JobSuggestion } from '~/types/applications';

type BadgeColor = 'primary' | 'neutral' | 'success' | 'warning' | 'error';

const props = defineProps<{
  suggestion: JobSuggestion
  highlight?: boolean
}>();

const emit = defineEmits<{
  promote: [suggestion: JobSuggestion]
  dismiss: [suggestion: JobSuggestion]
  analyze: [suggestion: JobSuggestion]
}>();

const analyzing = ref(false);

const matchColor = (rate: number): BadgeColor =>
  rate >= 70 ? 'success' : rate >= 40 ? 'warning' : 'error';

const statusColor = (status: string): BadgeColor => (({
  new: 'primary',
  reviewing: 'neutral',
  applied: 'success',
  dismissed: 'warning'
} as Record<string, BadgeColor>)[status] ?? 'neutral');

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
  return `${Math.floor(days / 7)}w ago`;
});

const breakdown = computed(() => props.suggestion.match_breakdown);

const needsReanalyze = computed(() => {
  const b = props.suggestion.match_breakdown;
  if (!b) return false;
  return !b.companyPainPoints?.length && !b.valueDelivered?.length;
});

async function handleAnalyze() {
  analyzing.value = true;
  try {
    emit('analyze', props.suggestion);
  } finally {
    // parent handles state; reset after brief delay
    setTimeout(() => { analyzing.value = false; }, 2000);
  }
}
</script>

<template>
  <div
    class="rounded-lg border p-3 space-y-2 transition-colors"
    :class="highlight ? 'border-primary/40 bg-primary/5' : 'border-default'"
  >
    <!-- Header row -->
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
          :color="matchColor(suggestion.match_rate)"
          variant="subtle"
          size="xs"
        />
        <UBadge
          v-if="needsReanalyze"
          label="legacy"
          color="neutral"
          variant="outline"
          size="xs"
          icon="i-lucide-zap-off"
          title="Analyzed before impact framing was added — re-analyze for richer insights."
        />
        <UBadge :label="suggestion.status" :color="statusColor(suggestion.status)" variant="subtle" size="xs" class="capitalize" />
      </div>
    </div>

    <!-- Match breakdown summary (when analyzed) -->
    <template v-if="breakdown">
      <!-- Score bars (compact) -->
      <div class="grid grid-cols-3 gap-x-3 gap-y-1">
        <div v-for="dim in [
          { label: 'Skills', value: breakdown.skills },
          { label: 'Stack', value: breakdown.techStack },
          { label: 'Exp', value: breakdown.experience },
          { label: 'Seniority', value: breakdown.seniority },
          { label: 'Industry', value: breakdown.industry },
          { label: 'Location', value: breakdown.location },
        ]" :key="dim.label" class="flex items-center gap-1">
          <span class="text-xs text-muted w-14 shrink-0">{{ dim.label }}</span>
          <div class="flex-1 bg-elevated rounded-full h-1">
            <div
              class="h-1 rounded-full"
              :class="(dim.value ?? 0) >= 70 ? 'bg-success' : (dim.value ?? 0) >= 40 ? 'bg-warning' : 'bg-error'"
              :style="{ width: `${dim.value ?? 0}%` }"
            />
          </div>
        </div>
      </div>

      <!-- Summary -->
      <p v-if="breakdown.summary" class="text-xs text-muted leading-relaxed line-clamp-2">
        {{ breakdown.summary }}
      </p>

      <!-- Impact teaser: surface the top "what's broken" insight -->
      <div
        v-if="breakdown.companyPainPoints?.length"
        class="flex items-start gap-1.5 text-xs text-default leading-relaxed"
      >
        <UIcon name="i-lucide-zap" class="text-primary size-3.5 shrink-0 mt-0.5" />
        <span class="line-clamp-2">{{ breakdown.companyPainPoints[0] }}</span>
      </div>

      <!-- Gaps -->
      <div v-if="breakdown.gaps?.length" class="flex flex-wrap gap-1">
        <UBadge
          v-for="gap in breakdown.gaps.slice(0, 3)"
          :key="gap"
          :label="gap"
          color="warning"
          variant="subtle"
          size="xs"
        />
        <UBadge
          v-if="breakdown.gaps.length > 3"
          :label="`+${breakdown.gaps.length - 3} more`"
          color="neutral"
          variant="subtle"
          size="xs"
        />
      </div>
    </template>

    <!-- Description excerpt (when not yet analyzed) -->
    <p v-else-if="suggestion.description" class="text-xs text-muted line-clamp-2">
      {{ suggestion.description }}
    </p>

    <!-- Actions -->
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
        @click="handleAnalyze"
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
