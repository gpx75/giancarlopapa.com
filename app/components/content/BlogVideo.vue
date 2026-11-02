<script setup lang="ts">
// Video for blog posts, used from Markdown via MDC:
//   ::blog-video
//   ---
//   src: /videos/blog/x.mp4
//   poster: /images/blog/x.jpg
//   label: 'What the video shows'
//   caption: 'Optional caption'
//   captions: /videos/blog/x.en.vtt
//   landscape: true   # 16:9 instead of the default 9:16 portrait
//   ---
//   ::
const props = defineProps<{
  src: string;
  label: string;
  poster?: string;
  caption?: string;
  captions?: string;
  landscape?: boolean;
}>();
</script>

<template>
  <figure class="not-prose my-8 space-y-2" :class="props.landscape ? 'max-w-3xl' : 'max-w-sm'">
    <video
      :src="props.src"
      :poster="props.poster"
      :aria-label="props.label"
      controls
      playsinline
      preload="none"
      class="w-full bg-muted rounded-lg ring ring-default"
      :class="props.landscape ? 'aspect-video' : 'aspect-9/16'"
    >
      <track v-if="props.captions" :src="props.captions" kind="captions" srclang="en" label="English" default>
    </video>
    <figcaption v-if="props.caption" class="text-sm text-muted">
      {{ props.caption }}
    </figcaption>
  </figure>
</template>
