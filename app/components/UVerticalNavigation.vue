<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { useRoute } from 'vue-router'
import type { PropType } from 'vue'

interface NavigationLink {
  label: string
  to?: string
  href?: string
  icon?: string
  target?: string
  rel?: string
  description?: string
  active?: boolean
  external?: boolean
  onSelect?: (link: NavigationLink) => void
  [key: string]: unknown
}

interface NavigationUi {
  link?: string
  active?: string
  icon?: string
  description?: string
}

const props = defineProps({
  links: {
    type: Array as PropType<NavigationLink[]>,
    default: () => []
  },
  ui: {
    type: Object as PropType<NavigationUi>,
    default: () => ({})
  }
})

const emit = defineEmits<{
  (event: 'select', link: NavigationLink): void
}>()

const attrs = useAttrs()
const route = useRoute()

const baseLinkClass = computed(() => [
  'relative flex items-center gap-3 rounded-xl px-4 py-3 text-base transition-colors',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/70',
  props.ui?.link
])

const activeLinkClass = computed(() => props.ui?.active || 'bg-primary/10 text-primary font-semibold')

function handleSelect(link: NavigationLink) {
  emit('select', link)
  link.onSelect?.(link)
}

function linkClasses(link: NavigationLink) {
  const baseClass = baseLinkClass.value
  const classes = (Array.isArray(baseClass) ? [...baseClass] : [baseClass]).filter(Boolean) as string[]

  if (link.active) {
    classes.push(activeLinkClass.value)
  }

  return classes
}

function isHashLink(link: NavigationLink) {
  return typeof link.to === 'string' && link.to.startsWith('#')
}

function hashHref(link: NavigationLink) {
  if (!isHashLink(link)) {
    return undefined
  }

  const hash = link.to as string
  return route.path === '/' ? hash : `/${hash}`
}
</script>

<template>
  <nav
    v-bind="attrs"
    class="flex flex-col gap-2"
    role="navigation"
    aria-label="Vertical navigation"
  >
    <template
      v-for="link in props.links"
      :key="link.label"
    >
      <NuxtLink
        v-if="link.to && !isHashLink(link)"
        :to="link.to"
        :class="linkClasses(link)"
        :target="link.target"
        :rel="link.rel"
        @click="handleSelect(link)"
      >
        <div class="flex items-center gap-3">
          <UIcon
            v-if="link.icon"
            :name="link.icon"
            aria-hidden="true"
            class="text-lg"
            :class="props.ui?.icon"
          />
          <div class="flex flex-col text-left">
            <span>{{ link.label }}</span>
            <span
              v-if="link.description"
              class="text-sm text-muted"
              :class="props.ui?.description"
            >{{ link.description }}</span>
          </div>
        </div>
      </NuxtLink>

      <a
        v-else-if="link.href || isHashLink(link)"
        :href="link.href ?? hashHref(link)"
        :class="linkClasses(link)"
        :target="link.target || (link.external ? '_blank' : undefined)"
        :rel="link.rel || (link.external ? 'noopener' : undefined)"
        @click="handleSelect(link)"
      >
        <div class="flex items-center gap-3">
          <UIcon
            v-if="link.icon"
            :name="link.icon"
            aria-hidden="true"
            class="text-lg"
            :class="props.ui?.icon"
          />
          <div class="flex flex-col text-left">
            <span>{{ link.label }}</span>
            <span
              v-if="link.description"
              class="text-sm text-muted"
              :class="props.ui?.description"
            >{{ link.description }}</span>
          </div>
        </div>
      </a>

      <button
        v-else
        type="button"
        :class="linkClasses(link)"
        @click="handleSelect(link)"
      >
        <div class="flex items-center gap-3">
          <UIcon
            v-if="link.icon"
            :name="link.icon"
            aria-hidden="true"
            class="text-lg"
            :class="props.ui?.icon"
          />
          <div class="flex flex-col text-left">
            <span>{{ link.label }}</span>
            <span
              v-if="link.description"
              class="text-sm text-muted"
              :class="props.ui?.description"
            >{{ link.description }}</span>
          </div>
        </div>
      </button>
    </template>
  </nav>
</template>
