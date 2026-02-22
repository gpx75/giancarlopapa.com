<script setup lang="ts">
import type { CvHero, CvStat } from '~/data/profile'

interface CvHeroSectionProps {
  hero: CvHero
  stats: CvStat[]
}

const props = defineProps<CvHeroSectionProps>()
</script>

<template>
  <section
    id="about"
    class="grid items-center gap-10 lg:grid-cols-[2fr,1fr]"
  >
    <div class="space-y-6">
      <UBadge
        color="neutral"
        variant="outline"
        class="border-terminal-400/40 bg-terminal-400/10 text-terminal-400 uppercase tracking-wide"
      >
        <span class="mr-1 opacity-50">$</span>{{ props.hero.availability }}
      </UBadge>

      <div class="space-y-3">
        <h1 class="cursor">
          {{ props.hero.name }}
        </h1>
        <p class="text-xl text-muted">
          <span class="text-terminal-400/60 mr-2 select-none">//</span>{{ props.hero.role }} · {{ props.hero.location }}
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
    </div>

    <div class="flex justify-center lg:justify-end">
      <NuxtImg
        src="/giancarlopapa_avatar.jpeg"
        alt="Giancarlo Papa"
        width="320"
        height="320"
        class="size-64 rounded-full ring-4 ring-primary/50 ring-offset-4 ring-offset-background lg:size-80"
      />
    </div>
  </section>
</template>
