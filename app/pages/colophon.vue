<script setup lang="ts">
const {
  public: { siteUrl }
} = useRuntimeConfig();
const canonicalUrl = `${siteUrl}/colophon`;

useSeoMeta({
  title: 'Colophon — Giancarlo Papa',
  description: 'How this site is built.',
  ogTitle: 'Colophon — Giancarlo Papa',
  ogDescription: 'How this site is built.',
  ogUrl: canonicalUrl,
  twitterCard: 'summary',
  twitterTitle: 'Colophon — Giancarlo Papa',
  twitterDescription: 'How this site is built.'
});

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }]
});

const { data: colophonData } = await useAsyncData('colophon', () =>
  queryCollection('colophon').first()
);

const stack = computed(() => colophonData.value?.items ?? []);
</script>

<template>
  <UContainer class="space-y-12 py-16">
    <div class="space-y-4">
      <UBadge color="neutral" variant="soft" class="tracking-wider text-xs">
        <span><span class="text-success-400/60">~/</span>colophon</span>
      </UBadge>
      <h1>Colophon</h1>
      <p class="text-muted max-w-2xl">
        This site is a personal portfolio built in the open. Here's what it's
        made of.
      </p>
    </div>

    <div class="space-y-3">
      <UCard
        v-for="item in stack"
        :key="item.label"
        class="grid gap-4 sm:grid-cols-[160px,1fr] sm:items-start sm:gap-6"
      >
        <p class="text-xs uppercase tracking-widest text-dimmed pt-1">
          {{ item.label }}
        </p>
        <div class="space-y-1">
          <UButton
            :to="item.url"
            :label="item.name"
            target="_blank"
            variant="link"
            color="neutral"
            trailing-icon="i-lucide-arrow-up-right"
            class="font-semibold p-0"
          />
          <p class="text-sm text-muted">{{ item.description }}</p>
        </div>
      </UCard>
    </div>
  </UContainer>
</template>
