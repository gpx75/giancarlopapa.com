<script setup lang="ts">
useSeoMeta({
  title: 'Colophon — Giancarlo Papa',
  description: 'How this site is built.'
})

const { data: stack } = await useAsyncData(
  'colophon',
  () => queryCollection('colophon').all()
)
</script>

<template>
  <UContainer class="space-y-12 py-16">
    <div class="space-y-4">
      <UBadge color="neutral" variant="soft" class="tracking-wider text-xs">
        <span><span class="text-terminal-400/60">~/</span>colophon</span>
      </UBadge>
      <h1>Colophon</h1>
      <p class="text-muted/80 max-w-2xl">
        This site is a personal portfolio built in the open. Here's what it's made of.
      </p>
    </div>

    <div class="space-y-3">
      <UCard
        v-for="item in stack"
        :key="item.label"
        class="grid gap-4 sm:grid-cols-[160px,1fr] sm:items-start sm:gap-6"
      >
        <p class="text-xs uppercase tracking-widest text-muted/50 pt-1">
          {{ item.label }}
        </p>
        <div class="space-y-1">
          <a
            :href="item.url"
            target="_blank"
            rel="noopener"
            class="text-sm font-semibold hover:text-primary transition"
          >
            {{ item.name }} <UIcon name="i-lucide-arrow-up-right" class="size-3 inline opacity-50" />
          </a>
          <p class="text-sm text-muted/60">{{ item.description }}</p>
        </div>
      </UCard>
    </div>
  </UContainer>
</template>
