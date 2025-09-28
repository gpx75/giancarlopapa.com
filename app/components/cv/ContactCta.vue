<script setup lang="ts">
import type { CvCallToAction } from '~/data/profile'

interface CvContactCtaProps {
  headline: string
  subline: string
  cta: CvCallToAction
}

const props = defineProps<CvContactCtaProps>()
</script>

<template>
  <section id="contact">
    <UCallout
      icon="i-lucide-rocket"
      color="primary"
      variant="soft"
      class="rounded-3xl p-8"
    >
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div class="max-w-2xl space-y-2">
          <h3 class="text-2xl font-semibold">
            {{ props.headline }}
          </h3>
          <p class="text-muted/80">
            {{ props.subline }}
          </p>
        </div>
        <UButton
          :to="props.cta.to"
          :label="props.cta.label"
          size="lg"
          color="primary"
          target="_blank"
          icon="i-lucide-calendar"
        />
      </div>
    </UCallout>
  </section>
</template>
