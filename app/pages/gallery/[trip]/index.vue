<script setup lang="ts">
const route = useRoute();
const trip = route.params.trip as string;
const { meta, stages } = await useGallery(trip);

const {
  public: { siteUrl }
} = useRuntimeConfig();
const canonicalUrl = `${siteUrl}/gallery/${trip}`;
const ogImage = `${siteUrl}${stages.value[0]?.images[0]?.src ?? '/giancarlopapa_avatar.jpeg'}`;

useSeoMeta({
  title: `${meta.value.title} — Giancarlo Papa`,
  description: meta.value.description,
  ogTitle: `${meta.value.title} — Giancarlo Papa`,
  ogDescription: meta.value.description,
  ogUrl: canonicalUrl,
  ogImage,
  twitterCard: 'summary_large_image',
  twitterTitle: `${meta.value.title} — Giancarlo Papa`,
  twitterDescription: meta.value.description,
  twitterImage: ogImage
});

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }]
});

const { formatDate } = useDateFormatting();
</script>

<template>
  <UContainer class="space-y-12 py-16">
    <div class="space-y-4">
      <UButton
        :to="meta.post.to"
        icon="i-lucide-arrow-left"
        :label="meta.post.label"
        variant="ghost"
        color="neutral"
        class="-ml-3"
      />
      <h1>{{ meta.title }}</h1>
      <p class="max-w-prose text-muted">
        {{ meta.description }}
      </p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="stage in stages"
        :key="stage.stage"
        :to="`/gallery/${trip}/stage-${stage.stage}`"
        class="block group"
      >
        <UCard
          class="h-full transition group-hover:border-primary/40"
          :ui="{ header: 'p-0 sm:p-0', body: 'space-y-1' }"
        >
          <template #header>
            <NuxtImg
              :src="stage.images[0]?.src"
              alt=""
              width="640"
              height="400"
              fit="cover"
              loading="lazy"
              class="w-full aspect-8/5 object-cover bg-muted"
            />
          </template>
          <p class="text-xs text-dimmed">
            {{ meta.labels.stage }} {{ stage.stage }} · {{ formatDate(stage.date) }}
          </p>
          <h2 class="text-base">
            {{ stage.route }}
          </h2>
          <p class="text-sm text-muted">
            {{ stage.distance }} km · {{ stage.images.length }} {{ meta.labels.photos }}
          </p>
        </UCard>
      </NuxtLink>
    </div>
  </UContainer>
</template>
