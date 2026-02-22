<script setup lang="ts">
import type { CvExperienceItem } from '~/data/profile'

interface CvExperienceTimelineProps {
  experience: CvExperienceItem[]
}

const props = defineProps<CvExperienceTimelineProps>()
</script>

<template>
  <section class="space-y-6">
    <div
      v-for="item in props.experience"
      :key="`${item.company}-${item.period}`"
      class="grid gap-4 rounded-2xl border border-muted/30 bg-muted/5 p-6 sm:p-8 lg:grid-cols-[1fr,2fr]"
    >
      <div class="space-y-2">
        <p class="text-sm uppercase tracking-wider text-muted/80">
          {{ item.period }}
        </p>
        <h3>
          {{ item.role }} · {{ item.company }}
        </h3>
        <p class="text-sm text-muted/70">
          {{ item.location }}
        </p>
        <p class="text-sm text-muted/90">
          {{ item.summary }}
        </p>
        <div class="flex flex-wrap gap-2 pt-3">
          <UBadge
            v-for="tech in item.stack"
            :key="tech"
            color="primary"
            variant="soft"
            class="uppercase tracking-wide text-[11px]"
          >
            {{ tech }}
          </UBadge>
        </div>
      </div>

      <div class="space-y-3">
        <ul class="space-y-2 text-sm text-muted/90">
          <li
            v-for="achievement in item.achievements"
            :key="achievement"
            class="flex gap-2"
          >
            <span class="mt-1 h-1.5 w-1.5 rounded-full bg-primary/70" />
            <span>{{ achievement }}</span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
