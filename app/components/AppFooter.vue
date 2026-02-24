<script setup lang="ts">
const props = defineProps<{
  secondaryNavigation: Array<{ label: string; to: string }>
}>()

const runtimeConfig = useRuntimeConfig()
const contactEmail = runtimeConfig.public.contactEmail
const commitSha = runtimeConfig.public.commitSha as string
const commitDate = runtimeConfig.public.commitDate as string

const commitUrl = computed(() =>
  commitSha ? `https://github.com/gpx75/giancarlopapa.com/commit/${commitSha}` : null
)
const mailtoLink = computed(() => `mailto:${contactEmail}`)

const route = useRoute()

const navItems = computed(() =>
  props.secondaryNavigation.map(item => ({
    ...item,
    active: route.path.startsWith(item.to)
  }))
)
</script>

<template>
  <UFooter
    :ui="{
      root: 'sticky bottom-0 z-10 backdrop-blur border-t border-(--ui-border)',
      container: 'py-3 lg:py-3',
      bottom: 'py-1.5 lg:py-1.5'
    }"
  >
    <template #left>
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold tracking-tight">
          © {{ new Date().getFullYear() }} Giancarlo Papa
        </span>
        <UButton
          v-if="commitDate && commitUrl"
          :to="commitUrl"
          target="_blank"
          :label="`// ${commitDate} · ${commitSha.slice(0, 7)}`"
          variant="link"
          color="neutral"
          size="xs"
          class="font-mono tabular-nums hidden sm:inline-flex"
        />
      </div>
    </template>

    <template #default>
      <nav class="hidden md:flex items-center gap-3">
        <UButton
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :label="item.label"
          variant="link"
          color="neutral"
          size="xs"
          :class="item.active ? 'text-magenta-500 dark:text-magenta-400' : ''"
          class="font-mono"
        />
      </nav>
    </template>

    <template #right>
      <div class="flex items-center">
        <UButton
          to="https://github.com/gpx75"
          target="_blank"
          icon="i-simple-icons-github"
          aria-label="GitHub"
          color="neutral"
          variant="ghost"
          size="sm"
        />
        <UButton
          to="https://www.linkedin.com/in/gpapa"
          target="_blank"
          icon="i-simple-icons-linkedin"
          aria-label="LinkedIn"
          color="neutral"
          variant="ghost"
          size="sm"
        />
        <UButton
          :to="mailtoLink"
          icon="i-lucide-mail"
          aria-label="Email"
          color="neutral"
          variant="ghost"
          size="sm"
        />
      </div>
    </template>

    <template #bottom>
      <p class="text-center text-xs text-(--ui-text-muted)">
        Based in Zürich · Working globally
      </p>
    </template>
  </UFooter>
</template>
