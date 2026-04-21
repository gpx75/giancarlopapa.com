<script setup lang="ts">
import type { MatchBreakdown } from '~/types/applications';

type BadgeColor = 'success' | 'warning' | 'error';

const props = defineProps<{
  rate: number
  breakdown: MatchBreakdown
}>();

const rateColor = computed((): BadgeColor => {
  if (props.rate >= 70) return 'success';
  if (props.rate >= 40) return 'warning';
  return 'error';
});

const dimensions = computed(() => {
  const base = [
    { label: 'Skills', value: props.breakdown.skills, weight: '27%' },
    { label: 'Tech Stack', value: props.breakdown.techStack, weight: '22%' },
    { label: 'Experience', value: props.breakdown.experience, weight: '22%' },
    { label: 'Seniority', value: props.breakdown.seniority, weight: '9%' },
    { label: 'Industry', value: props.breakdown.industry, weight: '9%' }
  ];
  if (props.breakdown.location != null) {
    base.push({ label: 'Location', value: props.breakdown.location, weight: '11%' });
  }
  return base;
});

function barColor(value: number): string {
  if (value >= 70) return 'bg-success';
  if (value >= 40) return 'bg-warning';
  return 'bg-error';
}
</script>

<template>
  <div class="space-y-3">
    <!-- Overall rate -->
    <div class="flex items-center gap-3">
      <UBadge
        :label="`${rate}%`"
        :color="rateColor"
        variant="subtle"
        size="lg"
        icon="i-lucide-target"
      />
      <span class="text-xs text-muted">Overall match</span>
    </div>

    <!-- Summary -->
    <p v-if="breakdown.summary" class="text-sm text-muted">
      {{ breakdown.summary }}
    </p>

    <!-- Dimension bars -->
    <div class="space-y-2">
      <div v-for="dim in dimensions" :key="dim.label" class="flex items-center gap-2">
        <span class="text-xs text-muted w-20 shrink-0">{{ dim.label }}</span>
        <div class="flex-1 h-2 bg-muted/20 rounded-full overflow-hidden">
          <div
            :class="barColor(dim.value)"
            class="h-full rounded-full transition-all"
            :style="{ width: `${dim.value}%` }"
          />
        </div>
        <span class="text-xs font-mono w-8 text-right">{{ dim.value }}</span>
      </div>
    </div>

    <!-- Strong matches -->
    <div v-if="breakdown.strongMatches?.length" class="flex flex-wrap gap-1.5">
      <UBadge
        v-for="match in breakdown.strongMatches"
        :key="match"
        :label="match"
        color="success"
        variant="subtle"
        size="xs"
      />
    </div>

    <!-- Gaps -->
    <div v-if="breakdown.gaps?.length" class="flex flex-wrap gap-1.5">
      <UBadge
        v-for="gap in breakdown.gaps"
        :key="gap"
        :label="gap"
        color="warning"
        variant="subtle"
        size="xs"
      />
    </div>

    <!-- From fit to impact -->
    <div
      v-if="breakdown.companyPainPoints?.length || breakdown.valueDelivered?.length || breakdown.measurableImpact?.length || breakdown.whyJoin"
      class="space-y-3 pt-3 mt-3 border-t border-default"
    >
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-zap" class="text-primary size-4" />
        <span class="text-xs font-semibold uppercase tracking-wide text-muted">
          From fit to impact
        </span>
      </div>

      <div v-if="breakdown.companyPainPoints?.length" class="space-y-1.5">
        <div class="text-xs font-semibold text-error flex items-center gap-1.5">
          <UIcon name="i-lucide-alert-triangle" class="size-3.5" />
          What's likely broken or missing
        </div>
        <ul class="text-sm text-default space-y-1 pl-5 list-disc marker:text-error/60">
          <li v-for="(item, i) in breakdown.companyPainPoints" :key="`pain-${i}`">{{ item }}</li>
        </ul>
      </div>

      <div v-if="breakdown.valueDelivered?.length" class="space-y-1.5">
        <div class="text-xs font-semibold text-primary flex items-center gap-1.5">
          <UIcon name="i-lucide-wrench" class="size-3.5" />
          What I would do
        </div>
        <ul class="text-sm text-default space-y-1 pl-5 list-disc marker:text-primary/60">
          <li v-for="(item, i) in breakdown.valueDelivered" :key="`value-${i}`">{{ item }}</li>
        </ul>
      </div>

      <div v-if="breakdown.measurableImpact?.length" class="space-y-1.5">
        <div class="text-xs font-semibold text-success flex items-center gap-1.5">
          <UIcon name="i-lucide-trending-up" class="size-3.5" />
          Measurable change
        </div>
        <ul class="text-sm text-default space-y-1 pl-5 list-disc marker:text-success/60">
          <li v-for="(item, i) in breakdown.measurableImpact" :key="`impact-${i}`">{{ item }}</li>
        </ul>
      </div>

      <div v-if="breakdown.whyJoin" class="space-y-1.5">
        <div class="text-xs font-semibold text-muted flex items-center gap-1.5">
          <UIcon name="i-lucide-compass" class="size-3.5" />
          Why join
        </div>
        <p class="text-sm text-default italic">{{ breakdown.whyJoin }}</p>
      </div>
    </div>
  </div>
</template>
