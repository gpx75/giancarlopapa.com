<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';

const { loggedIn } = useAuth();

watch(loggedIn, (val) => {
  if (!val && !import.meta.dev) navigateTo('/');
});

const open = ref(false);

const { data: stats } = await useFetch('/api/admin/stats', { key: 'admin-stats' });

const newContactCount = computed(() => stats.value?.new ?? 0);
const unreadInboxCount = computed(() => stats.value?.unreadInbox ?? 0);
const activeAppCount = computed(() => stats.value?.activeApplications ?? 0);

const links = computed(() => [[
  {
    label: 'Overview',
    icon: 'i-lucide-layout-dashboard',
    to: '/admin',
    exact: true
  },
  {
    label: 'Inbox',
    icon: 'i-lucide-inbox',
    to: '/admin/inbox',
    ...(unreadInboxCount.value > 0 ? { badge: String(unreadInboxCount.value) } : {})
  },
  {
    label: 'Contacts',
    icon: 'i-lucide-users',
    to: '/admin/contacts',
    ...(newContactCount.value > 0 ? { badge: String(newContactCount.value) } : {})
  },
  {
    label: 'Applications',
    icon: 'i-lucide-briefcase',
    to: '/admin/applications',
    ...(activeAppCount.value > 0 ? { badge: String(activeAppCount.value) } : {})
  }
], [
  {
    label: 'Back to site',
    icon: 'i-lucide-arrow-left',
    to: '/'
  }
]] satisfies NavigationMenuItem[][]);
</script>

<template>
  <UDashboardGroup unit="rem" class="admin-layout">
    <UDashboardSidebar
      id="admin"
      v-model:open="open"
      collapsible
      resizable
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <NuxtLink
          to="/admin"
          class="flex items-center gap-2 min-w-0 px-1 py-1 rounded-md"
          :class="collapsed ? 'justify-center' : ''"
        >
          <UAvatar src="/giancarlopapa_avatar.jpeg" alt="GP" size="xs" class="shrink-0" />
          <span v-if="!collapsed" class="font-mono font-bold text-sm truncate">GP // admin</span>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />
        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          class="mt-auto"
          tooltip
        />
      </template>

      <template #footer="{ collapsed }">
        <AdminUserMenu :collapsed="collapsed" class="w-full min-w-0" />
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
