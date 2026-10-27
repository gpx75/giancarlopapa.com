<script setup lang="ts">
const route = useRoute();
const slug = route.params.slug as string;

const { data: post } = await useAsyncData(`blog-${slug}`, () =>
  queryCollection('blog').path(`/blog/${slug}`).first()
);

if (!post.value || post.value.draft) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found' });
}

const {
  public: { siteUrl }
} = useRuntimeConfig();
const canonicalUrl = `${siteUrl}/blog/${slug}`;
const ogImage = `${siteUrl}${post.value.image ?? '/giancarlopapa_avatar.jpeg'}`;

useSeoMeta({
  title: `${post.value.title} — Giancarlo Papa`,
  description: post.value.description,
  ogTitle: `${post.value.title} — Giancarlo Papa`,
  ogDescription: post.value.description,
  ogUrl: canonicalUrl,
  ogType: 'article',
  ogImage,
  articlePublishedTime: post.value.date,
  twitterCard: 'summary_large_image',
  twitterTitle: `${post.value.title} — Giancarlo Papa`,
  twitterDescription: post.value.description,
  twitterImage: ogImage
});

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }]
});

const { formatDate } = useDateFormatting();

// "Title: Subtitle" renders on two lines, keeping the colon on the first.
const titleLines = computed(() => {
  const title = post.value?.title ?? '';
  const i = title.indexOf(': ');
  return i === -1 ? [title] : [title.slice(0, i + 1), title.slice(i + 2)];
});
</script>

<template>
  <UContainer v-if="post" class="space-y-12 py-16">
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
        <p class="text-xs uppercase tracking-widest text-dimmed">
          {{ formatDate(post.date) }}
        </p>
        <h1>
          <span v-for="line in titleLines" :key="line" class="block">{{ line }}</span>
        </h1>
        <p class="max-w-prose text-lg text-muted leading-relaxed">
          {{ post.description }}
        </p>
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
      </div>

      <NuxtImg
        v-if="post.image"
        :src="post.image"
        alt=""
        width="1200"
        height="630"
        class="w-full max-w-3xl h-auto rounded-lg ring ring-default"
      />

      <USeparator />
    </div>

    <div class="prose max-w-3xl">
      <ContentRenderer :value="post" />
    </div>

    <USeparator />

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
  </UContainer>
</template>
