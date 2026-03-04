<script setup lang="ts">
const {
  public: { siteUrl }
} = useRuntimeConfig();
const canonicalUrl = `${siteUrl}/contact`;

useSeoMeta({
  title: 'Contact — Giancarlo Papa',
  description:
    'Reach out to Giancarlo Papa — senior full stack engineer open to cloud platform, full stack, and applied AI roles in Zürich and remote.',
  ogTitle: 'Contact — Giancarlo Papa',
  ogDescription:
    'Reach out to Giancarlo Papa — senior full stack engineer open to cloud platform, full stack, and applied AI roles in Zürich and remote.',
  ogUrl: canonicalUrl,
  twitterCard: 'summary',
  twitterTitle: 'Contact — Giancarlo Papa',
  twitterDescription:
    'Reach out to Giancarlo Papa — senior full stack engineer open to cloud platform, full stack, and applied AI roles in Zürich and remote.'
});

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }]
});
</script>

<template>
  <div class="flex min-h-screen items-center">
    <UContainer class="w-full py-16">
      <CvContactCta
        headline="Let's work together"
        subline="Whether you're hiring, building something interesting, or want to explore a collaboration — drop me a line and I'll get back to you."
      />
    </UContainer>
  </div>
</template>
