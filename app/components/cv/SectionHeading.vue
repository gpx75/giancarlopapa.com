<script setup lang="ts">
interface CvSectionHeadingProps {
  title: string
  description?: string
  kicker?: string
  id?: string
}

const props = defineProps<CvSectionHeadingProps>()
</script>

<template>
  <header
    :id="props.id"
    class="space-y-3"
  >
    <UBadge
      v-if="props.kicker"
      color="neutral"
      variant="soft"
      class="uppercase tracking-wider text-xs"
    >
      <span class="mr-1 text-terminal-400 opacity-70">></span>{{ props.kicker }}
    </UBadge>
    <div class="space-y-2">
      <h2>
        {{ props.title }}
      </h2>
      <p
        v-if="props.description"
        class="max-w-3xl text-muted/80"
      >
        {{ props.description }}
      </p>
    </div>
  </header>
</template>
