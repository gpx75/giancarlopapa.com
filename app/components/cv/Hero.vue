<script setup lang="ts">
import type { CvHero, CvStat } from '~/types/profile';

interface CvHeroSectionProps {
  hero: CvHero;
  stats: CvStat[];
}

const props = defineProps<CvHeroSectionProps>();
</script>

<template>
  <section id="about" class="flex flex-col-reverse lg:flex-row gap-10 lg:items-start">
    <div class="flex-1 min-w-0 space-y-6">
      <UBadge
        color="neutral"
        variant="outline"
        class="border-terminal-400/40 bg-terminal-400/10 text-terminal-400 uppercase tracking-wide"
      >
        <span class="mr-1 opacity-50">$</span>{{ props.hero.availability }}
      </UBadge>

      <div class="space-y-3">
        <!-- <h1>{{ props.hero.name }}</h1> -->
        <h1>
          {{ props.hero.role }}
        </h1>
        <p class="text-base sm:text-xl text-muted">
          <span class="text-terminal-400/60 mr-2 select-none">//</span
          >{{ props.hero.summary[0] }}
        </p>
        <p
          v-for="(paragraph, i) in props.hero.summary.slice(1)"
          :key="i"
          class="text-base text-muted/80 max-w-2xl"
        >
          {{ paragraph }}
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

      <div class="cursor text-muted/40 text-md">
        <span class="select-none text-magenta-400">~&gt;</span>
      </div>
    </div>

    <div class="flex justify-center lg:justify-end self-start lg:pt-72">
      <img
        src="/giancarlopapa_avatar.jpeg"
        alt="Giancarlo Papa"
        width="320"
        height="320"
        class="size-64 rounded-full ring-4 ring-primary/50 ring-offset-4 ring-offset-background lg:size-80"
      />
    </div>
  </section>
</template>
