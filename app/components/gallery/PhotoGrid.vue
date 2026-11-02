<script setup lang="ts">
// Thumbnail grid with a fullscreen viewer; swipe or use the arrows to move between photos.
interface Photo {
  src: string;
  alt: string;
  time: string;
}

const props = defineProps<{
  photos: Photo[];
  enlargeLabel: string;
}>();

const open = ref(false);
const start = ref(0);
const current = ref(0);

function show(index: number) {
  start.value = index;
  current.value = index;
  open.value = true;
}

const active = computed(() => props.photos[current.value]);
</script>

<template>
  <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
    <UButton
      v-for="(photo, index) in props.photos"
      :key="photo.src"
      variant="ghost"
      color="neutral"
      :aria-label="`${props.enlargeLabel}: ${photo.alt}`"
      class="block p-0 rounded-lg overflow-hidden"
      @click="show(index)"
    >
      <NuxtImg
        :src="photo.src"
        :alt="photo.alt"
        width="480"
        height="480"
        fit="cover"
        loading="lazy"
        class="w-full aspect-square object-cover bg-muted rounded-lg ring ring-default transition hover:opacity-90"
      />
    </UButton>

    <UModal
      v-model:open="open"
      fullscreen
      :title="active?.alt"
      :description="`${current + 1} / ${props.photos.length} · ${active?.time.slice(11)}`"
      :ui="{ body: 'flex items-center p-2 sm:p-4' }"
    >
      <template #body>
        <UCarousel
          v-slot="{ item }"
          :items="props.photos"
          :start-index="start"
          arrows
          :prev="{ color: 'neutral', variant: 'solid' }"
          :next="{ color: 'neutral', variant: 'solid' }"
          :ui="{ root: 'w-full', prev: 'start-2 sm:start-4', next: 'end-2 sm:end-4' }"
          @select="current = $event"
        >
          <NuxtImg
            :src="item.src"
            :alt="item.alt"
            width="1400"
            class="mx-auto max-h-[80dvh] w-auto max-w-full object-contain"
          />
        </UCarousel>
      </template>
    </UModal>
  </div>
</template>
