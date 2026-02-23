<script setup lang="ts">
const runtimeConfig = useRuntimeConfig();
const siteUrl = runtimeConfig.public.siteUrl;
const contactEmail = runtimeConfig.public.contactEmail;

const { user, loggedIn, login, logout } = useAuth();

const title = 'GIANCARLO<bold>PAPA</bold> — Senior Full Stack Engineer';
const description =
  'Senior Full Stack Engineer specialising in cloud platform engineering, full stack development, and applied AI.';

const navigation = [
  { label: '~/blog', to: '/blog' },
  { label: '~/resume', to: '/resume' },
  { label: '~/contact', to: '/contact' }
];

const isMenuOpen = ref(false);
const isLoginModalOpen = ref(false);

const mailtoLink = computed(() => `mailto:${contactEmail}`);

const route = useRoute();

function isActive(to: string) {
  if (to === '/') return route.path === '/';
  return route.path.startsWith(to);
}

useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [
    { rel: 'icon', href: '/favicon.ico' },
    { rel: 'canonical', href: siteUrl }
  ],
  htmlAttrs: {
    lang: 'en'
  }
});

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
});
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
        <!-- Desktop nav -->
        <nav class="mr-2 hidden items-center gap-1 md:flex">
          <NuxtLink
            v-for="item in navigation"
            :key="item.to"
            :to="item.to"
            class="px-3 py-2 text-sm rounded-full transition"
            :class="
              isActive(item.to)
                ? 'text-primary bg-primary/10 font-medium'
                : 'hover:bg-muted/60'
            "
          >
            {{ item.label }}
          </NuxtLink>
        </nav>

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
        <div class="hidden md:flex items-center gap-1">
          <template v-if="loggedIn">
            <UAvatar :src="user?.avatar" :alt="user?.name" size="sm" />
            <UButton
              icon="i-lucide-log-out"
              aria-label="Sign out"
              variant="ghost"
              color="neutral"
              size="sm"
              @click="
                () => {
                  logout();
                }
              "
            />
          </template>
          <UButton
            v-else
            label="Sign in"
            icon="i-lucide-log-in"
            size="sm"
            variant="ghost"
            color="neutral"
            @click="isLoginModalOpen = true"
          />
        </div>
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>

    <UFooter class="sticky bottom-0 z-10 backdrop-blur">
      <template #left>
        <div class="flex flex-col gap-1 text-sm text-muted">
          <span>© {{ new Date().getFullYear() }} Giancarlo Papa</span>
          <span class="text-xs text-muted/60"
            >Based in Zürich · Working globally</span
          >
          <div class="flex gap-3">
            <NuxtLink
              to="/skillmatrix"
              class="text-xs transition"
              :class="
                isActive('/skillmatrix')
                  ? 'text-snazzy-yellow'
                  : 'text-snazzy-yellow/50 hover:text-snazzy-yellow'
              "
            >
              ~/skillmatrix
            </NuxtLink>
            <NuxtLink
              to="/colophon"
              class="text-xs transition"
              :class="
                isActive('/colophon')
                  ? 'text-snazzy-yellow'
                  : 'text-snazzy-yellow/50 hover:text-snazzy-yellow'
              "
            >
              ~/colophon
            </NuxtLink>
            <NuxtLink
              to="/legal"
              class="text-xs transition"
              :class="
                isActive('/legal')
                  ? 'text-snazzy-yellow'
                  : 'text-snazzy-yellow/50 hover:text-snazzy-yellow'
              "
            >
              ~/legal
            </NuxtLink>
          </div>
        </div>
      </template>

      <template #right>
        <div class="flex items-center gap-1">
          <UButton
            to="https://github.com/gpx75"
            target="_blank"
            icon="i-simple-icons-github"
            aria-label="GitHub"
            color="neutral"
            variant="ghost"
          />
          <UButton
            to="https://www.linkedin.com/in/gpapa"
            target="_blank"
            icon="i-simple-icons-linkedin"
            aria-label="LinkedIn"
            color="neutral"
            variant="ghost"
          />
          <UButton
            :to="mailtoLink"
            icon="i-lucide-mail"
            aria-label="Email"
            color="neutral"
            variant="ghost"
          />
        </div>
      </template>
    </UFooter>

    <!-- Mobile slideover -->
    <USlideover v-model="isMenuOpen" side="right" class="md:hidden">
      <div class="flex h-full flex-col">
        <div
          class="flex items-center justify-between border-b border-muted/30 px-6 py-4"
        >
          <span
            class="text-sm font-semibold uppercase tracking-widest text-muted"
          >
            Navigate
          </span>
          <UButton
            icon="i-lucide-x"
            variant="ghost"
            @click="isMenuOpen = false"
          />
        </div>
        <nav class="flex-1 flex flex-col gap-1 px-4 py-6">
          <NuxtLink
            v-for="item in navigation"
            :key="item.to"
            :to="item.to"
            class="px-4 py-3 rounded-xl text-base font-medium transition"
            :class="
              isActive(item.to)
                ? 'text-primary bg-primary/10'
                : 'hover:bg-muted/80'
            "
            @click="isMenuOpen = false"
          >
            {{ item.label }}
          </NuxtLink>
          <a
            :href="mailtoLink"
            class="px-4 py-3 rounded-xl text-base font-medium transition hover:bg-muted/80"
            @click="isMenuOpen = false"
          >
            ~/email
          </a>
        </nav>

        <!-- Auth footer in mobile menu -->
        <div class="border-t border-muted/30 px-4 py-4">
          <template v-if="loggedIn">
            <div class="flex items-center gap-3">
              <UAvatar :src="user?.avatar" :alt="user?.name" size="sm" />
              <span class="text-sm font-medium flex-1 truncate">{{
                user?.name
              }}</span>
              <UButton
                label="Sign out"
                icon="i-lucide-log-out"
                size="xs"
                variant="ghost"
                color="neutral"
                @click="
                  () => {
                    logout();
                    isMenuOpen = false;
                  }
                "
              />
            </div>
          </template>
          <UButton
            v-else
            label="Sign in"
            icon="i-lucide-log-in"
            size="sm"
            variant="outline"
            color="neutral"
            class="w-full justify-start"
            @click="
              isLoginModalOpen = true;
              isMenuOpen = false;
            "
          />
        </div>
      </div>
    </USlideover>

    <!-- Login modal -->
    <UModal
      v-model:open="isLoginModalOpen"
      title="Sign in to continue"
      description="Use your existing account — no new password needed."
    >
      <template #body>
        <div class="flex flex-col gap-3 px-1 pb-2">
          <UButton
            label="Continue with GitHub"
            icon="i-simple-icons-github"
            size="lg"
            color="neutral"
            variant="outline"
            class="justify-start"
            @click="
              () => {
                login('github');
              }
            "
          />
          <UButton
            label="Continue with Google"
            icon="i-simple-icons-google"
            size="lg"
            color="neutral"
            variant="outline"
            class="justify-start"
            @click="
              () => {
                login('google');
              }
            "
          />
          <UButton
            label="Continue with LinkedIn"
            icon="i-simple-icons-linkedin"
            size="lg"
            color="neutral"
            variant="outline"
            class="justify-start"
            @click="
              () => {
                login('linkedin');
              }
            "
          />
        </div>
      </template>
    </UModal>
  </UApp>
</template>
