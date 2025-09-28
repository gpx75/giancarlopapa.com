<script setup>
import { computed, ref } from 'vue'

const runtimeConfig = useRuntimeConfig()
const siteUrl = runtimeConfig.public.siteUrl
const contactEmail = runtimeConfig.public.contactEmail

const title = 'Giancarlo Papa — Full-stack Web Developer'
const description = 'Product-focused developer crafting delightful web experiences across the stack.'

const navigation = [
  { label: 'About', to: '#about' },
  { label: 'Experience', to: '#experience' },
  { label: 'Projects', to: '#projects' },
  { label: 'Writing', to: '#writing' },
  { label: 'Contact', to: '#contact' }
]

const isMenuOpen = ref(false)

const mailtoLink = computed(() => `mailto:${contactEmail}`)

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' },
    { rel: 'canonical', href: siteUrl }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: siteUrl,
  ogImage: `${siteUrl}/og-image.png`,
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: `${siteUrl}/og-image.png`,
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp>
    <UHeader>
      <template #left>
        <NuxtLink to="/" aria-label="Giancarlo Papa home">
          <AppLogo />
        </NuxtLink>
      </template>

      <template #right>
        <div class="mr-2 hidden items-center gap-2 md:flex">
          <UHorizontalNavigation :links="navigation"
            :ui="{ link: 'px-3 py-2 text-sm rounded-full hover:bg-muted/60 transition' }" />
        </div>

        <UButton :to="mailtoLink" label="Get in touch" size="sm" color="primary" class="hidden md:inline-flex" />

        <UButton icon="i-lucide-menu" aria-label="Toggle navigation" variant="ghost" class="md:hidden"
          @click="isMenuOpen = true" />

        <UColorModeButton />
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>

    <UFooter>
      <template #left>
        <div class="flex flex-col gap-1 text-sm text-muted">
          <span>© {{ new Date().getFullYear() }} Giancarlo Papa</span>
          <span>Based in Zürich · Working globally</span>
        </div>
      </template>

      <template #right>
        <div class="flex items-center gap-1">
          <UButton to="https://github.com/giancarlopapa" target="_blank" icon="i-simple-icons-github"
            aria-label="GitHub" color="neutral" variant="ghost" />
          <UButton to="https://www.linkedin.com/in/giancarlopapa" target="_blank" icon="i-simple-icons-linkedin"
            aria-label="LinkedIn" color="neutral" variant="ghost" />
          <UButton :to="mailtoLink" icon="i-lucide-mail" aria-label="Email" color="neutral" variant="ghost" />
        </div>
      </template>
    </UFooter>

    <USlideover v-model="isMenuOpen" side="right" class="md:hidden">
      <div class="flex h-full flex-col">
        <div class="flex items-center justify-between border-b border-muted/30 px-6 py-4">
          <span class="text-sm font-semibold uppercase tracking-widest text-muted">
            Navigate
          </span>
          <UButton icon="i-lucide-x" variant="ghost" @click="isMenuOpen = false" />
        </div>
        <UVerticalNavigation :links="[
          ...navigation,
          { label: 'Email me', to: mailtoLink, icon: 'i-lucide-mail' }
        ]" class="flex-1 px-4 py-6" :ui="{
            link: 'px-4 py-3 rounded-xl text-base font-medium hover:bg-muted/80 transition',
            icon: 'text-muted'
          }" @select="isMenuOpen = false" />
      </div>
    </USlideover>
  </UApp>
</template>
