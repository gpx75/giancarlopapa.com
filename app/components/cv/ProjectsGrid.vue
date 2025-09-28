<script setup lang="ts">
import type { CvProjectItem } from '~/data/profile'

interface CvProjectsGridProps {
  projects: CvProjectItem[]
}

const props = defineProps<CvProjectsGridProps>()
</script>

<template>
  <section class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
    <UCard
      v-for="project in props.projects"
      :key="project.name"
      class="flex flex-col justify-between"
    >
      <div class="space-y-3">
        <h3 class="text-lg font-semibold">
          {{ project.name }}
        </h3>
        <p class="text-sm text-muted/80">
          {{ project.summary }}
        </p>
        <div class="flex flex-wrap gap-2">
          <UBadge
            v-for="tech in project.stack"
            :key="tech"
            color="neutral"
            variant="soft"
            class="text-[11px] uppercase tracking-widest"
          >
            {{ tech }}
          </UBadge>
        </div>
      </div>

      <div class="mt-6 flex flex-wrap gap-2">
        <UButton
          v-for="link in project.links"
          :key="link.label"
          :label="link.label"
          :to="link.to"
          :icon="link.icon"
          color="primary"
          variant="ghost"
          size="sm"
          class="justify-start"
          :target="link.to.startsWith('http') ? '_blank' : undefined"
        />
      </div>
    </UCard>
  </section>
</template>
