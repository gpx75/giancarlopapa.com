<script setup lang="ts">
import type { CvSkillGroup } from '~/data/profile'

interface CvSkillsGridProps {
  skills: CvSkillGroup[]
}

const props = defineProps<CvSkillsGridProps>()
</script>

<template>
  <section class="grid gap-4 md:grid-cols-3">
    <UCard
      v-for="group in props.skills"
      :key="group.label"
      class="space-y-3"
    >
      <p class="text-xs uppercase tracking-widest text-muted">
        {{ group.label }}
      </p>
      <ul class="space-y-2 text-sm text-muted/90">
        <li
          v-for="item in group.items"
          :key="item"
          class="flex items-center gap-2"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-primary/80" />
          <span>{{ item }}</span>
        </li>
      </ul>
    </UCard>
  </section>
</template>
