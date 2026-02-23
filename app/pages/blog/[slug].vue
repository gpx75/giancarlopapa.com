<script setup lang="ts">
const route = useRoute()
const slug = route.params.slug as string

const { data: post } = await useAsyncData(`blog-${slug}`, () =>
  queryCollection('blog').path(`/blog/${slug}`).first()
)

if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found' })
}

useSeoMeta({
  title: `${post.value.title} — Giancarlo Papa`,
  description: post.value.description
})

const { formatDate } = useDateFormatting()
</script>

<template>
  <UContainer class="py-16">
    <div class="mx-auto max-w-3xl space-y-10">
      <div class="space-y-6">
        <UButton
          to="/blog"
          icon="i-lucide-arrow-left"
          label="Back to blog"
          variant="ghost"
          color="neutral"
          class="-ml-3"
        />

        <div class="space-y-4">
          <p class="text-xs uppercase tracking-widest text-muted/50">
            {{ formatDate(post!.date) }}
          </p>
          <h1>{{ post!.title }}</h1>
          <p class="text-lg text-muted/80 leading-relaxed">
            {{ post!.description }}
          </p>
          <div v-if="post!.tags?.length" class="flex flex-wrap gap-2">
            <UBadge
              v-for="tag in post!.tags"
              :key="tag"
              color="neutral"
              variant="soft"
              class="text-xs"
            >
              {{ tag }}
            </UBadge>
          </div>
        </div>

        <UDivider />
      </div>

      <div class="prose dark:prose-invert max-w-none">
        <ContentRenderer :value="post!" />
      </div>

      <UDivider />

      <div class="flex items-center justify-between">
        <UButton
          to="/blog"
          icon="i-lucide-arrow-left"
          label="Back to blog"
          variant="ghost"
          color="neutral"
        />
        <UButton
          to="/contact"
          icon="i-lucide-mail"
          label="Get in touch"
          variant="ghost"
          color="primary"
        />
      </div>
    </div>
  </UContainer>
</template>
