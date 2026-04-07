<script setup lang="ts">
definePageMeta({ layout: 'admin' });
useSeoMeta({ title: 'Admin — Overview', robots: 'noindex, nofollow' });

const { data: stats } = await useFetch('/api/admin/stats');
const { data: posts } = await useAsyncData('admin-blog-count', () =>
  queryCollection('blog').all()
);
const postCount = computed(() => posts.value?.length ?? 0);
</script>

<template>
  <UDashboardPanel id="admin-overview">
    <template #header>
      <UDashboardNavbar title="Overview" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UColorModeButton />
          <UTooltip text="Go to site">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-external-link"
              square
              to="/"
            />
          </UTooltip>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        <UCard>
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-mail" class="text-primary size-6 shrink-0" />
            <div>
              <p class="text-2xl font-bold">{{ stats?.total ?? '—' }}</p>
              <p class="text-sm text-muted">Contact submissions</p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-bell-dot" class="text-primary size-6 shrink-0" />
            <div>
              <p class="text-2xl font-bold">{{ stats?.new ?? '—' }}</p>
              <p class="text-sm text-muted">New messages</p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center gap-3">
            <UIcon name="i-lucide-file-text" class="text-primary size-6 shrink-0" />
            <div>
              <p class="text-2xl font-bold">{{ postCount }}</p>
              <p class="text-sm text-muted">Blog posts</p>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
