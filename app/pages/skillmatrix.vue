<script setup lang="ts">
useSeoMeta({
  title: 'Skill Matrix — Giancarlo Papa',
  description: 'A structured overview of skills, technologies, and proficiency levels across engineering, cloud, AI, and databases.'
})

type Level = 'expert' | 'advanced' | 'proficient' | 'familiar'

interface Skill {
  name: string
  level: Level
  years?: number
  icon: string
}

interface Category {
  label: string
  icon: string
  skills: Skill[]
}

const categories: Category[] = [
  {
    label: 'Core Engineering',
    icon: 'i-lucide-code-2',
    skills: [
      { name: 'PHP 8', level: 'expert', years: 19, icon: 'i-simple-icons-php' },
      { name: 'Laravel', level: 'expert', years: 12, icon: 'i-simple-icons-laravel' },
      { name: 'JavaScript / ES2022+', level: 'expert', years: 19, icon: 'i-simple-icons-javascript' },
      { name: 'Vue.js', level: 'expert', years: 8, icon: 'i-simple-icons-vuedotjs' },
      { name: 'Nuxt', level: 'expert', years: 5, icon: 'i-simple-icons-nuxtdotjs' },
      { name: 'TypeScript', level: 'advanced', years: 4, icon: 'i-simple-icons-typescript' },
      { name: 'HTML5 / CSS', level: 'expert', years: 19, icon: 'i-simple-icons-html5' },
      { name: 'RESTful APIs', level: 'expert', years: 15, icon: 'i-lucide-plug-2' },
      { name: 'Python', level: 'proficient', years: 3, icon: 'i-simple-icons-python' }
    ]
  },
  {
    label: 'Cloud & Platform',
    icon: 'i-lucide-cloud',
    skills: [
      { name: 'Linux (RHEL / Debian / Ubuntu)', level: 'expert', years: 19, icon: 'i-simple-icons-linux' },
      { name: 'Docker', level: 'advanced', years: 6, icon: 'i-simple-icons-docker' },
      { name: 'Google Cloud Platform', level: 'advanced', years: 5, icon: 'i-simple-icons-googlecloud' },
      { name: 'Cloud Run', level: 'advanced', years: 4, icon: 'i-simple-icons-googlecloud' },
      { name: 'GitLab CI / Jenkins', level: 'advanced', years: 6, icon: 'i-simple-icons-gitlab' },
      { name: 'Kubernetes', level: 'proficient', years: 2, icon: 'i-simple-icons-kubernetes' },
      { name: 'Terraform', level: 'familiar', years: 1, icon: 'i-simple-icons-terraform' }
    ]
  },
  {
    label: 'AI & Data',
    icon: 'i-lucide-brain',
    skills: [
      { name: 'LLM Integration', level: 'advanced', years: 3, icon: 'i-lucide-bot' },
      { name: 'Vertex AI', level: 'advanced', years: 2, icon: 'i-simple-icons-googlecloud' },
      { name: 'Gemini API', level: 'advanced', years: 2, icon: 'i-simple-icons-googlegemini' },
      { name: 'Prompt Engineering', level: 'advanced', years: 3, icon: 'i-lucide-terminal' },
      { name: 'Big Data Platforms', level: 'proficient', years: 4, icon: 'i-lucide-layers' },
      { name: 'Analytics Engineering', level: 'proficient', years: 5, icon: 'i-lucide-chart-bar' }
    ]
  },
  {
    label: 'Databases & Enterprise',
    icon: 'i-lucide-database',
    skills: [
      { name: 'MySQL', level: 'expert', years: 19, icon: 'i-simple-icons-mysql' },
      { name: 'Oracle DB', level: 'advanced', years: 10, icon: 'i-simple-icons-oracle' },
      { name: 'PostgreSQL', level: 'proficient', years: 4, icon: 'i-simple-icons-postgresql' },
      { name: 'Salesforce / Apex', level: 'advanced', years: 6, icon: 'i-simple-icons-salesforce' },
      { name: 'LDAP / Active Directory', level: 'advanced', years: 8, icon: 'i-lucide-users' }
    ]
  },
  {
    label: 'DevOps & Networking',
    icon: 'i-lucide-network',
    skills: [
      { name: 'Git', level: 'expert', years: 13, icon: 'i-simple-icons-git' },
      { name: 'Bash / Shell scripting', level: 'advanced', years: 15, icon: 'i-simple-icons-gnubash' },
      { name: 'Nginx / Apache', level: 'advanced', years: 15, icon: 'i-simple-icons-nginx' },
      { name: 'TCP/IP / DNS', level: 'advanced', years: 19, icon: 'i-lucide-network' },
      { name: 'SSL / TLS', level: 'advanced', years: 15, icon: 'i-lucide-lock' },
      { name: 'System hardening', level: 'advanced', years: 10, icon: 'i-lucide-shield' }
    ]
  }
]

const levels: { key: Level, label: string, dots: number }[] = [
  { key: 'expert', label: 'Expert', dots: 4 },
  { key: 'advanced', label: 'Advanced', dots: 3 },
  { key: 'proficient', label: 'Proficient', dots: 2 },
  { key: 'familiar', label: 'Familiar', dots: 1 }
]

const levelDotClass: Record<Level, string> = {
  expert: 'bg-terminal-400',
  advanced: 'bg-primary',
  proficient: 'bg-zinc-400 dark:bg-zinc-500',
  familiar: 'bg-zinc-300 dark:bg-zinc-600'
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
        <span class="text-terminal-400/60">~/</span>skillmatrix
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
        v-for="category in categories"
        :key="category.label"
        class="space-y-4"
      >
        <div class="flex items-center gap-2 border-b border-muted/20 pb-3">
          <UIcon :name="category.icon" class="size-4 text-muted/50" />
          <h2 class="text-sm font-semibold uppercase tracking-widest text-muted/60">
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
