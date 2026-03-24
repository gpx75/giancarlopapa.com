<script setup lang="ts">
import type { RunActivity } from '~/components/runs/ActivityCard.vue';

const {
  public: { siteUrl }
} = useRuntimeConfig();
const canonicalUrl = `${siteUrl}/runs`;

useSeoMeta({
  title: 'Running — Giancarlo Papa',
  description: 'Recent activity feed, live from Strava.',
  ogTitle: 'Running — Giancarlo Papa',
  ogDescription: 'Recent activity feed, live from Strava.',
  ogUrl: canonicalUrl,
  twitterCard: 'summary',
  twitterTitle: 'Running — Giancarlo Papa',
  twitterDescription: 'Recent activity feed, live from Strava.'
});

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }]
});

const page = ref(1);
const allActivities = ref<RunActivity[]>([]);
const loadingMore = ref(false);
const hasMore = ref(true);

const {
  data: initialActivities,
  status,
  error,
  refresh
} = await useFetch<RunActivity[]>('/api/strava/activities', {
  query: { page: 1 }
});

if (initialActivities.value) {
  allActivities.value = initialActivities.value;
  hasMore.value = initialActivities.value.length === 20;
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return;
  loadingMore.value = true;
  page.value++;
  try {
    const data = await $fetch<RunActivity[]>('/api/strava/activities', {
      query: { page: page.value }
    });
    allActivities.value = [...allActivities.value, ...data];
    hasMore.value = data.length === 20;
  } catch {
    page.value--;
  } finally {
    loadingMore.value = false;
  }
}
</script>

<template>
  <UContainer class="space-y-12 py-16">
    <!-- Header -->
    <div class="space-y-4">
      <UBadge color="neutral" variant="soft" class="tracking-wider text-xs">
        <span><span class="text-terminal-400/60">~/</span>runs</span>
      </UBadge>
      <h1>Running</h1>
      <p class="text-muted max-w-2xl">Recent activity, live from Strava.</p>
    </div>

    <USeparator label="Recent Activities" />

    <!-- Activity feed -->
    <div
      v-if="status === 'pending'"
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <USkeleton v-for="i in 6" :key="i" class="h-72 rounded-xl" />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-wifi-off"
      title="Could not load activities"
      :description="error.message"
      :actions="[
        {
          label: 'Retry',
          color: 'neutral',
          variant: 'soft',
          icon: 'i-lucide-refresh-cw',
          onClick: () => refresh()
        }
      ]"
    />

    <template v-else-if="allActivities.length">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <RunsActivityCard
          v-for="activity in allActivities"
          :key="activity.id"
          :activity="activity"
        />
      </div>

      <div class="flex justify-center pt-4">
        <UButton
          v-if="hasMore"
          variant="soft"
          color="neutral"
          :loading="loadingMore"
          @click="loadMore"
        >
          Load more
        </UButton>
        <p v-else class="text-xs text-dimmed font-mono">
          // all activities loaded
        </p>
      </div>
    </template>

    <UAlert
      v-else
      color="neutral"
      variant="soft"
      icon="i-lucide-activity"
      title="No activities found"
    />
  </UContainer>
</template>
