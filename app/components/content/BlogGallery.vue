<script setup lang="ts">
// Photo gallery for blog posts, used from Markdown via MDC:
//   ::blog-gallery
//   ---
//   images:
//     - { src: /images/blog/x.jpg, alt: 'What the photo shows', caption: 'Optional caption' }
//   ---
//   ::
interface GalleryImage {
  src: string;
  alt: string;
  caption?: string;
}

const props = defineProps<{
  images: GalleryImage[];
}>();

const multiple = computed(() => props.images.length > 1);
// Dots wrap onto several lines on mobile beyond a handful of photos; use a counter instead.
const showDots = computed(() => multiple.value && props.images.length <= 8);
const current = ref(0);
const open = ref(false);
const active = ref<GalleryImage>();

function show(image: GalleryImage) {
  active.value = image;
  open.value = true;
}
</script>

<template>
  <div v-if="props.images.length" class="not-prose my-8 max-w-3xl">
    <UCarousel
      v-slot="{ item }"
      :items="props.images"
      :arrows="multiple"
      :dots="showDots"
      :prev="{ color: 'neutral', variant: 'solid' }"
      :next="{ color: 'neutral', variant: 'solid' }"
      :ui="{ prev: 'start-2 sm:start-3', next: 'end-2 sm:end-3', dots: '-bottom-6' }"
      @select="current = $event"
    >
      <figure class="space-y-2">
        <UButton
          variant="ghost"
          color="neutral"
          :aria-label="`Enlarge photo: ${item.alt}`"
          class="block w-full p-0 rounded-lg overflow-hidden"
          @click="show(item)"
        >
          <NuxtImg
            :src="item.src"
            :alt="item.alt"
            width="1200"
            height="900"
            loading="lazy"
            class="w-full aspect-4/3 object-contain bg-muted rounded-lg ring ring-default"
          />
        </UButton>
        <figcaption v-if="item.caption || (multiple && !showDots)" class="flex justify-between gap-4 text-sm text-muted">
          <span>{{ item.caption }}</span>
          <span v-if="multiple && !showDots" class="shrink-0 tabular-nums">
            {{ current + 1 }} / {{ props.images.length }}
          </span>
        </figcaption>
      </figure>
    </UCarousel>

    <UModal
      v-model:open="open"
      fullscreen
      :title="active?.caption ?? active?.alt"
      :ui="{ body: 'flex items-center justify-center p-2 sm:p-4' }"
    >
      <template #body>
        <NuxtImg
          v-if="active"
          :src="active.src"
          :alt="active.alt"
          width="1536"
          class="max-h-full max-w-full object-contain"
        />
      </template>
    </UModal>
  </div>
</template>
