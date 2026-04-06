<script setup lang="ts">
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
</script>

<template>
  <UHeader :toggle="false">
    <template #left>
      <NuxtLink to="/" aria-label="Giancarlo Papa home">
        <AppLogo />
      </NuxtLink>
    </template>

    <template #right>
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

      <AuthButtons
        compact
        class="hidden md:flex"
        @sign-in="isLoginModalOpen = true"
      />
    </template>
  </UHeader>

  <UMain>
    <slot />
  </UMain>

  <AppFooter :secondary-navigation="secondaryNavigation" />

  <AppMobileMenu
    v-model="isMenuOpen"
    :navigation="navigation"
    :secondary-navigation="secondaryNavigation"
    @sign-in="isLoginModalOpen = true"
  />

  <AppLoginModal v-model="isLoginModalOpen" />
</template>
