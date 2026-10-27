<script setup lang="ts">
import type { CvLatest } from '~/types/profile';
import type { RunActivity } from '~/components/runs/ActivityCard.vue';

const props = defineProps<{ latest: CvLatest }>();

const RUN_TYPES = new Set(['Run', 'TrailRun', 'VirtualRun', 'Treadmill']);

// Filtered in JS like /blog: posts without a `draft` field are stored as NULL,
// which an SQL `draft <> true` would silently exclude.
const { data: post } = await useAsyncData('latest-post', async () => {
  const posts = await queryCollection('blog').order('date', 'DESC').all();
  return posts.find((p) => !p.draft) ?? null;
});

// Client-only and lazy: a Strava outage must never block or break the homepage.
const { data: activities } = useFetch<RunActivity[]>('/api/strava/activities', {
  key: 'latest-run',
  server: false,
  lazy: true
});

const run = computed(
  () => activities.value?.find((a) => RUN_TYPES.has(a.sport_type)) ?? null
);

const { formatDate } = useDateFormatting();
</script>

<template>
  <section v-if="post || run" class="space-y-6">
    <CvSectionHeading :kicker="props.latest.kicker" :title="props.latest.title" />

    <div class="grid gap-6 lg:grid-cols-2 lg:items-start">
      <div v-if="post" class="space-y-3">
        <p class="text-sm text-muted">
          <span class="text-success-700 dark:text-success-400 mr-2 select-none">//</span>{{ props.latest.postLabel }}
        </p>
        <NuxtLink :to="post.path" class="block group">
          <UCard
            class="transition group-hover:border-primary/40"
            :ui="{ body: 'space-y-2' }"
          >
            <NuxtImg
              v-if="post.image"
              :src="post.image"
              alt=""
              width="1200"
              height="630"
              sizes="100vw lg:600px"
              class="w-full h-auto rounded-md ring ring-default"
            />
            <p class="text-xs uppercase tracking-widest text-dimmed">
              {{ formatDate(post.date) }}
            </p>
            <h3 class="text-xl leading-snug transition group-hover:text-primary">
              {{ post.title }}
            </h3>
            <p class="text-sm text-muted leading-relaxed">
              {{ post.description }}
            </p>
          </UCard>
        </NuxtLink>
        <ULink to="/blog" class="text-sm text-muted hover:text-primary">
          {{ props.latest.allPostsLabel }}
          <UIcon name="i-lucide-arrow-right" class="size-4 align-middle" />
        </ULink>
      </div>

      <div v-if="run" class="space-y-3">
        <p class="text-sm text-muted">
          <span class="text-success-700 dark:text-success-400 mr-2 select-none">//</span>{{ props.latest.runLabel }}
        </p>
        <RunsActivityCard :activity="run" />
        <ULink to="/runs" class="text-sm text-muted hover:text-primary">
          {{ props.latest.allRunsLabel }}
          <UIcon name="i-lucide-arrow-right" class="size-4 align-middle" />
        </ULink>
      </div>
    </div>
  </section>
</template>
