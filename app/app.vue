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

const navigation = [
  { label: '~/blog', to: '/blog' },
  { label: '~/resume', to: '/resume' },
  { label: '~/contact', to: '/contact' }
];

const secondaryNavigation = [
  { label: '~/runs', to: '/runs' },
  { label: '~/skillmatrix', to: '/skillmatrix' },
  { label: '~/colophon', to: '/colophon' },
  { label: '~/legal', to: '/legal' }
];

const isMenuOpen = ref(false);
const isLoginModalOpen = ref(false);

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
    <UHeader :toggle="false">
      <template #left>
        <NuxtLink to="/" aria-label="Giancarlo Papa home">
          <AppLogo />
        </NuxtLink>
      </template>

      <template #right>
        <!-- Desktop nav -->
        <NavLinks
          :items="navigation"
          orientation="horizontal"
          class="mr-2 hidden md:flex"
        />

        <UButton
          to="/book"
          label="Book a call"
          size="sm"
          color="primary"
          icon="i-lucide-calendar"
          class="hidden md:inline-flex"
        />

        <UButton
          icon="i-lucide-menu"
          aria-label="Toggle navigation"
          variant="ghost"
          class="md:hidden"
          @click="isMenuOpen = true"
        />

        <UColorModeButton />

        <!-- Auth (desktop) -->
        <AuthButtons
          compact
          class="hidden md:flex"
          @sign-in="isLoginModalOpen = true"
        />
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>

    <AppFooter :secondary-navigation="secondaryNavigation" />

    <AppMobileMenu
      v-model="isMenuOpen"
      :navigation="navigation"
      :secondary-navigation="secondaryNavigation"
      @sign-in="isLoginModalOpen = true"
    />

    <AppLoginModal v-model="isLoginModalOpen" />
    <Analytics />
  </UApp>
</template>
