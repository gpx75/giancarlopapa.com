<script setup lang="ts">
useSeoMeta({
  title: 'Skill Matrix — Giancarlo Papa',
  description: 'A structured overview of skills, technologies, and proficiency levels across engineering, cloud, AI, and databases.'
})

type Level = 'expert' | 'advanced' | 'proficient' | 'familiar'

const { data: skillsData } = await useAsyncData(
  'skills',
  () => queryCollection('skills').first()
)

const categories = computed(() => skillsData.value?.categories ?? [])

const levels: { key: Level, label: string, dots: number }[] = [
  { key: 'expert', label: 'Expert', dots: 4 },
  { key: 'advanced', label: 'Advanced', dots: 3 },
  { key: 'proficient', label: 'Proficient', dots: 2 },
  { key: 'familiar', label: 'Familiar', dots: 1 }
]

const levelDotClass: Record<Level, string> = {
  expert: 'bg-terminal-400',
  advanced: 'bg-primary',
  proficient: 'bg-snazzy-dark-400 dark:bg-snazzy-dark-500',
  familiar: 'bg-snazzy-dark-300 dark:bg-snazzy-dark-600'
}

const levelTextClass: Record<Level, string> = {
  expert: 'text-terminal-500 dark:text-terminal-400',
  advanced: 'text-primary',
  proficient: 'text-muted/70',
  familiar: 'text-muted/50'
}

const levelIconClass: Record<Level, string> = {
  expert: 'text-terminal-400',
  advanced: 'text-primary',
  proficient: 'text-muted/50',
  familiar: 'text-muted/30'
}

function dots(level: Level) {
  const filled = levels.find(l => l.key === level)?.dots ?? 0
  return Array.from({ length: 4 }, (_, i) => i < filled)
}
</script>

<template>
  <UContainer class="space-y-12 py-16">
    <div class="space-y-4">
      <UBadge color="neutral" variant="soft" class="tracking-wider text-xs">
        <span><span class="text-terminal-400/60">~/</span>skillmatrix</span>
      </UBadge>
      <h1>Skill Matrix</h1>
      <p class="text-muted/80 max-w-2xl">
        A structured overview of technologies and proficiency levels built across 19+ years of engineering, from web to cloud to AI.
      </p>
    </div>

    <!-- Legend -->
    <div class="flex flex-wrap items-center gap-6">
      <span class="text-xs uppercase tracking-widest text-muted/40">Proficiency</span>
      <div
        v-for="level in levels"
        :key="level.key"
        class="flex items-center gap-2"
      >
        <div class="flex items-center gap-0.5">
          <span
            v-for="(filled, i) in dots(level.key)"
            :key="i"
            class="inline-block size-2 rounded-full"
            :class="filled ? levelDotClass[level.key] : 'bg-muted/20'"
          />
        </div>
        <span class="text-xs" :class="levelTextClass[level.key]">{{ level.label }}</span>
      </div>
    </div>

    <!-- Categories -->
    <div class="space-y-10">
      <div
        v-for="category in (categories ?? [])"
        :key="category.label"
        class="space-y-4"
      >
        <div class="flex items-center gap-2 border-b border-muted/20 pb-3">
          <UIcon :name="category.icon" class="size-4 text-muted/50" />
          <h2 class="text-sm font-semibold uppercase tracking-widest opacity-70">
            {{ category.label }}
          </h2>
        </div>

        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="skill in category.skills"
            :key="skill.name"
            class="flex items-center justify-between gap-3 rounded-xl border border-muted/10 bg-muted/5 px-4 py-3"
          >
            <div class="flex items-center gap-3 min-w-0">
              <UIcon
                :name="skill.icon"
                class="size-4 shrink-0"
                :class="levelIconClass[skill.level]"
              />
              <span class="text-sm font-medium truncate">{{ skill.name }}</span>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <span v-if="skill.years" class="text-xs text-muted/40">{{ skill.years }}y</span>
              <div class="flex items-center gap-0.5">
                <span
                  v-for="(filled, i) in dots(skill.level)"
                  :key="i"
                  class="inline-block size-2 rounded-full"
                  :class="filled ? levelDotClass[skill.level] : 'bg-muted/15'"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </UContainer>
</template>
