<script setup lang="ts">
const route = useRoute();
const trip = route.params.trip as string;
const { meta, stages } = await useGallery(trip);

const stageNumber = Number(/^stage-(\d+)$/.exec(route.params.stage as string)?.[1]);
const index = stages.value.findIndex(s => s.stage === stageNumber);
if (index < 0) {
  throw createError({ statusCode: 404, statusMessage: 'Stage not found' });
}

const stage = computed(() => stages.value[index]!);
const previous = computed(() => stages.value[index - 1]);
const next = computed(() => stages.value[index + 1]);
const title = computed(() => `${meta.value.labels.stage} ${stage.value.stage}: ${stage.value.route}`);

const {
  public: { siteUrl }
} = useRuntimeConfig();
const canonicalUrl = `${siteUrl}/gallery/${trip}/stage-${stageNumber}`;
const description = `${stage.value.images.length} ${meta.value.labels.photos} — ${meta.value.description}`;
const ogImage = `${siteUrl}${stage.value.images[0]?.src ?? '/giancarlopapa_avatar.jpeg'}`;

useSeoMeta({
  title: `${title.value} — Giancarlo Papa`,
  description,
  ogTitle: `${title.value} — Giancarlo Papa`,
  ogDescription: description,
  ogUrl: canonicalUrl,
  ogImage,
  twitterCard: 'summary_large_image',
  twitterTitle: `${title.value} — Giancarlo Papa`,
  twitterDescription: description,
  twitterImage: ogImage
});

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }]
});

const { formatDate } = useDateFormatting();
</script>

<template>
  <UContainer class="space-y-10 py-16">
    <div class="space-y-4">
      <UButton
        :to="`/gallery/${trip}`"
        icon="i-lucide-arrow-left"
        :label="meta.labels.allStages"
        variant="ghost"
        color="neutral"
        class="-ml-3"
      />
      <p class="text-xs uppercase tracking-widest text-dimmed">
        {{ formatDate(stage.date) }}
      </p>
      <h1 class="text-3xl sm:text-4xl">
        {{ title }}
      </h1>
      <div class="flex flex-wrap gap-2">
        <UBadge color="neutral" variant="soft" icon="i-lucide-route">
          {{ stage.distance }} km
        </UBadge>
        <UBadge color="neutral" variant="soft" icon="i-lucide-trending-up">
          {{ stage.ascent.toLocaleString('en') }} m
        </UBadge>
        <UBadge color="neutral" variant="soft" icon="i-lucide-trending-down">
          {{ stage.descent.toLocaleString('en') }} m
        </UBadge>
        <UBadge color="neutral" variant="soft" icon="i-lucide-heart-pulse">
          {{ stage.heartRate }} bpm
        </UBadge>
      </div>
    </div>

    <GalleryPhotoGrid :photos="stage.images" :enlarge-label="meta.labels.enlarge" />

    <USeparator />

    <nav class="flex flex-wrap items-center justify-between gap-4" :aria-label="meta.labels.allStages">
      <UButton
        v-if="previous"
        :to="`/gallery/${trip}/stage-${previous.stage}`"
        icon="i-lucide-arrow-left"
        :label="`${meta.labels.stage} ${previous.stage}`"
        :aria-label="`${meta.labels.previous}: ${previous.route}`"
        variant="ghost"
        color="neutral"
      />
      <span v-else />
      <UButton
        v-if="next"
        :to="`/gallery/${trip}/stage-${next.stage}`"
        trailing-icon="i-lucide-arrow-right"
        :label="`${meta.labels.stage} ${next.stage}`"
        :aria-label="`${meta.labels.next}: ${next.route}`"
        variant="ghost"
        color="neutral"
      />
    </nav>
  </UContainer>
</template>
