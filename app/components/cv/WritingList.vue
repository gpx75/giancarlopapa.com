<script setup lang="ts">
import type { CvWritingItem } from '~/data/profile'

interface CvWritingListProps {
  entries: CvWritingItem[]
}

const props = defineProps<CvWritingListProps>()
</script>

<template>
  <section class="space-y-4">
    <UCard
      v-for="entry in props.entries"
      :key="entry.title"
      class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
    >
      <div class="space-y-2">
        <p class="text-xs uppercase tracking-wide text-muted">
          {{ entry.platform }} · {{ entry.publishedAt }}
        </p>
        <h3 class="text-lg font-semibold">
          {{ entry.title }}
        </h3>
        <p class="text-sm text-muted/80">
          {{ entry.description }}
        </p>
      </div>

      <UButton
        :to="entry.to"
        label="Read essay"
        icon="i-lucide-arrow-up-right"
        variant="ghost"
        color="primary"
        target="_blank"
      />
    </UCard>
  </section>
</template>
