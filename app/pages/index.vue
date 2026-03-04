<script setup lang="ts">
const {
  public: { siteUrl }
} = useRuntimeConfig();

const title = 'Senior Full Stack Engineer — Giancarlo Papa';
const description =
  'Senior Full Stack Engineer specialising in cloud platform engineering, full stack development, and applied AI.';
const canonicalUrl = `${siteUrl}/`;

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: canonicalUrl,
  ogType: 'website',
  ogImage: `${siteUrl}/giancarlopapa_avatar.jpeg`,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: `${siteUrl}/giancarlopapa_avatar.jpeg`
});

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }]
});

const { profile } = useProfileData();
</script>

<template>
  <UContainer class="py-16">
    <CvHero v-if="profile" :hero="profile.hero" :stats="profile.stats" />
  </UContainer>
</template>
