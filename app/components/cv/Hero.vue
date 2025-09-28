<script setup lang="ts">
import { computed } from 'vue'
import type { CvHero, CvStat } from '~/data/profile'

interface CvHeroSectionProps {
  hero: CvHero
  stats: CvStat[]
  source: string
}

const props = defineProps<CvHeroSectionProps>()

const sourceLabel = computed(() => {
  switch (props.source) {
    case 'hub-database':
      return 'NuxtHub Database'
    case 'hub-kv':
      return 'NuxtHub KV'
    default:
      return 'Static profile'
  }
})
</script>

<template>
  <section
    id="about"
    class="grid items-start gap-10 lg:grid-cols-[2fr,1fr]"
  >
    <div class="space-y-6">
      <UBadge
        color="primary"
        variant="soft"
        class="uppercase tracking-wide"
      >
        {{ props.hero.availability }}
      </UBadge>

      <div class="space-y-3">
        <h1 class="text-4xl font-semibold leading-tight sm:text-5xl">
          {{ props.hero.name }}
        </h1>
        <p class="text-xl text-muted">
          {{ props.hero.role }} · {{ props.hero.location }}
        </p>
        <p class="text-base text-muted/80 max-w-2xl">
          {{ props.hero.summary }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <UButton
          v-for="action in props.hero.actions"
          :key="action.label"
          :label="action.label"
          :to="action.to"
          size="lg"
          color="primary"
          :variant="action.external ? 'solid' : 'outline'"
          :icon="action.icon"
          :target="action.external ? '_blank' : undefined"
          :rel="action.external ? 'noopener' : undefined"
        />
      </div>

      <div class="flex flex-wrap items-center gap-2 text-sm text-muted/80">
        <span>Connected via</span>
        <UBadge
          :label="sourceLabel"
          color="neutral"
          variant="subtle"
        />
      </div>
    </div>

    <UCard class="space-y-6">
      <div class="grid gap-4">
        <div
          v-for="stat in props.stats"
          :key="stat.label"
          class="rounded-xl border border-muted/30 p-4"
        >
          <p class="text-2xl font-semibold">
            {{ stat.value }}
          </p>
          <p class="text-xs uppercase tracking-wide text-muted">
            {{ stat.label }}
          </p>
        </div>
      </div>

      <UDivider label="Connect" />

      <div class="flex flex-col gap-2">
        <UButton
          v-for="link in props.hero.contactLinks"
          :key="link.label"
          :to="link.to"
          :label="link.label"
          :icon="link.icon"
          variant="ghost"
          color="neutral"
          class="justify-start"
          :target="link.to.startsWith('http') ? '_blank' : undefined"
        />
      </div>
    </UCard>
  </section>
</template>
