<script setup lang="ts">
import { Analytics } from '@vercel/analytics/vue';

const runtimeConfig = useRuntimeConfig();
const siteUrl = runtimeConfig.public.siteUrl;
const route = useRoute();
const canonicalUrl = computed(() => {
  const path = route.path === '/' ? '' : route.path;
  return `${siteUrl}${path}`;
});

const title = 'GIANCARLOPAPA — Senior Full Stack Engineer';
const description =
  'Senior Full Stack Engineer specialising in cloud platform engineering, full stack development, and applied AI.';
const ogImage = `${siteUrl}/giancarlopapa_avatar.jpeg`;

useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: {
    lang: 'en'
  }
});

useSeoMeta({
  titleTemplate: (titleChunk) =>
    titleChunk ? `${titleChunk} · GIANCARLOPAPA` : title,
  title,
  description,
  robots: 'index, follow',
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogSiteName: 'GIANCARLOPAPA',
  ogUrl: canonicalUrl,
  ogImage,
  ogImageAlt: 'Giancarlo Papa — Senior Full Stack Engineer',
  twitterCard: 'summary_large_image',
  twitterSite: '@gpx75',
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: ogImage
});
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <Analytics />
  </UApp>
</template>
