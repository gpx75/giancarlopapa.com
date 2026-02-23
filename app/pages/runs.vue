<script setup lang="ts">
import type { RunActivity } from '~/components/runs/ActivityCard.vue'

useSeoMeta({
  title: 'Running — Giancarlo Papa',
  description: 'Recent activity feed, live from Strava.'
})

const page = ref(1)
const allActivities = ref<RunActivity[]>([])
const loadingMore = ref(false)
const hasMore = ref(true)

const { data: initialActivities, status } = await useFetch<RunActivity[]>('/api/strava/activities', {
  query: { page: 1 }
})

if (initialActivities.value) {
  allActivities.value = initialActivities.value
  hasMore.value = initialActivities.value.length === 20
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  page.value++
  const data = await $fetch<RunActivity[]>('/api/strava/activities', {
    query: { page: page.value }
  })
  allActivities.value = [...allActivities.value, ...data]
  hasMore.value = data.length === 20
  loadingMore.value = false
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
      <p class="text-muted/80 max-w-2xl">
        Recent activity, live from Strava.
      </p>
    </div>

    <!-- Divider -->
    <div class="flex items-center gap-3">
      <span class="text-xs uppercase tracking-widest text-muted/40">Recent Activities</span>
      <div class="flex-1 border-t border-muted/15" />
    </div>

    <!-- Activity feed -->
    <div v-if="status === 'pending'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 6" :key="i" class="h-72 rounded-xl bg-muted/10 animate-pulse" />
    </div>

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
        <p v-else class="text-xs text-muted/40 font-mono">// all activities loaded</p>
      </div>
    </template>

    <div v-else class="text-center py-16 text-muted/40">
      <UIcon name="i-lucide-activity" class="size-10 mx-auto mb-3" />
      <p class="text-sm">No activities found.</p>
    </div>
  </UContainer>
</template>
