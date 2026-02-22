<script setup lang="ts">
useSeoMeta({
  title: 'Blog — Giancarlo Papa',
  description: 'Engineering notes, terminal setups, and thoughts on cloud platforms, full stack development, and applied AI.'
})

const { data: allPosts } = await useAsyncData('blog-posts', () =>
  queryCollection('blog')
    .order('date', 'DESC')
    .all()
)

const posts = computed(() => allPosts.value?.filter(p => !p.draft) ?? [])

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateStr))
}
</script>

<template>
  <UContainer class="space-y-12 py-16">
    <div class="space-y-4">
      <UBadge color="neutral" variant="soft" class="tracking-wider text-xs">
        <span class="text-terminal-400/60 mr-0.5">~/</span>blog
      </UBadge>
      <h1>Writing</h1>
      <p class="text-muted/80 max-w-2xl">
        Engineering notes, terminal setups, and thoughts on cloud platforms, full stack development, and applied AI.
      </p>
    </div>

    <div v-if="posts?.length" class="space-y-4">
      <NuxtLink
        v-for="post in posts"
        :key="post.path"
        :to="post.path"
        class="block group"
      >
        <UCard class="space-y-3 transition group-hover:border-primary/40">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="space-y-2">
              <p class="text-xs uppercase tracking-widest text-muted/50">
                {{ formatDate(post.date) }}
              </p>
              <h2 class="text-xl leading-snug group-hover:text-primary transition">
                {{ post.title }}
              </h2>
              <p class="text-sm text-muted/70 leading-relaxed">
                {{ post.description }}
              </p>
            </div>
            <UIcon
              name="i-lucide-arrow-right"
              class="hidden sm:block shrink-0 mt-1 size-4 text-muted/30 group-hover:text-primary group-hover:translate-x-1 transition"
            />
          </div>
          <div v-if="post.tags?.length" class="flex flex-wrap gap-2">
            <UBadge
              v-for="tag in post.tags"
              :key="tag"
              color="neutral"
              variant="soft"
              class="text-xs"
            >
              {{ tag }}
            </UBadge>
          </div>
        </UCard>
      </NuxtLink>
    </div>

    <UAlert
      v-else
      color="neutral"
      variant="soft"
      title="No posts yet"
      description="Check back soon."
      icon="i-lucide-pencil-line"
    />
  </UContainer>
</template>
