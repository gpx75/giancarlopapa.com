<script setup lang="ts">
const consent = useCookie<'granted' | 'declined' | null>('ga_consent', {
  maxAge: 60 * 60 * 24 * 365,
  default: () => null
});

const showBanner = ref(false);
const { initialize } = useGtag();

onMounted(() => {
  if (consent.value === 'granted') {
    initialize();
  } else if (consent.value === null) {
    showBanner.value = true;
  }
});

function accept() {
  consent.value = 'granted';
  initialize();
  showBanner.value = false;
}

function decline() {
  consent.value = 'declined';
  showBanner.value = false;
}
</script>

<template>
  <Teleport to="body">
    <Transition name="slide-up">
      <div
        v-if="showBanner"
        class="fixed bottom-0 left-0 right-0 z-50 border-t border-(--ui-border) bg-(--ui-bg) py-3"
      >
        <UContainer>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-sm text-(--ui-text-muted)">
              <span class="font-mono text-primary mr-1">$</span>
              This site uses Google Analytics to understand visitor engagement.
              <NuxtLink to="/legal" class="underline underline-offset-2 hover:text-(--ui-text)">Privacy policy</NuxtLink>.
            </p>
            <div class="flex shrink-0 gap-2">
              <UButton size="sm" variant="outline" @click="decline">
                Decline
              </UButton>
              <UButton size="sm" @click="accept">
                Accept
              </UButton>
            </div>
          </div>
        </UContainer>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.2s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
