<script setup lang="ts">
import type { JobApplication } from '~/types/applications';

definePageMeta({ layout: 'admin' });
useSeoMeta({ title: 'Admin — Overview', robots: 'noindex, nofollow' });

type BadgeColor = 'primary' | 'neutral' | 'success' | 'warning' | 'error' | 'info';

const { data: stats, refresh: refreshStats } = await useFetch('/api/admin/stats');

const { data: topMatches } = await useAsyncData('overview-top-matches', async () => {
  const apps = await $fetch<JobApplication[]>('/api/admin/applications');
  return apps
    .filter(a => a.match_rate != null)
    .sort((a, b) => (b.match_rate ?? 0) - (a.match_rate ?? 0))
    .slice(0, 5);
});

const pipeline = computed(() => [
  { label: 'Saved', value: stats.value?.pipeline?.saved ?? 0, color: 'text-muted', icon: 'i-lucide-bookmark' },
  { label: 'Applied', value: stats.value?.pipeline?.applied ?? 0, color: 'text-primary', icon: 'i-lucide-send' },
  { label: 'Interviewing', value: stats.value?.pipeline?.interviewing ?? 0, color: 'text-info', icon: 'i-lucide-users' },
  { label: 'Offered', value: stats.value?.pipeline?.offered ?? 0, color: 'text-success', icon: 'i-lucide-trophy' }
]);

const decided = computed(() => ({
  accepted: stats.value?.pipeline?.accepted ?? 0,
  rejected: stats.value?.pipeline?.rejected ?? 0,
  withdrawn: stats.value?.pipeline?.withdrawn ?? 0
}));

const matchDist = computed(() => stats.value?.matchDistribution ?? { high: 0, medium: 0, low: 0, total: 0, totalApplications: 0 });

const matchColor = (rate: number | null): BadgeColor => {
  if (rate == null) return 'neutral';
  if (rate >= 70) return 'success';
  if (rate >= 40) return 'warning';
  return 'error';
};

const statusColor = (status: string): BadgeColor => (({
  saved: 'neutral',
  applied: 'primary',
  interviewing: 'info',
  offered: 'success',
  accepted: 'success',
  rejected: 'error',
  withdrawn: 'warning'
} as Record<string, BadgeColor>)[status] ?? 'neutral');

const workModelIcon = (wm: string | null) => ({
  remote: 'i-lucide-wifi',
  hybrid: 'i-lucide-building-2',
  onsite: 'i-lucide-map-pin'
}[wm ?? ''] ?? 'i-lucide-map-pin');
</script>

<template>
  <UDashboardPanel id="admin-overview">
    <template #header>
      <UDashboardNavbar title="Overview" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            icon="i-lucide-refresh-cw"
            size="sm"
            variant="ghost"
            color="neutral"
            @click="refreshStats"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-6 p-4 max-w-5xl">

        <!-- Pipeline Funnel -->
        <div>
          <p class="text-xs text-muted uppercase tracking-wide mb-3">Application Pipeline</p>
          <UCard :ui="{ body: 'p-4' }">
            <div class="flex items-center gap-1 flex-wrap">
              <div
                v-for="(stage, idx) in pipeline"
                :key="stage.label"
                class="flex items-center gap-1"
              >
                <div class="flex flex-col items-center gap-1 px-4 py-2 rounded-lg bg-elevated/60 min-w-[80px] text-center">
                  <UIcon :name="stage.icon" class="size-4" :class="stage.color" />
                  <span class="text-2xl font-bold" :class="stage.color">{{ stage.value }}</span>
                  <span class="text-xs text-muted">{{ stage.label }}</span>
                </div>
                <UIcon
                  v-if="idx < pipeline.length - 1"
                  name="i-lucide-chevron-right"
                  class="size-4 text-muted shrink-0"
                />
              </div>

              <!-- Divider -->
              <div class="h-12 w-px bg-border mx-2 shrink-0" />

              <!-- Decided outcomes -->
              <div class="flex flex-col gap-1 text-xs text-muted">
                <div class="flex items-center gap-1.5">
                  <span class="size-2 rounded-full bg-success inline-block" />
                  <span>Accepted: <strong class="text-foreground">{{ decided.accepted }}</strong></span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="size-2 rounded-full bg-error inline-block" />
                  <span>Rejected: <strong class="text-foreground">{{ decided.rejected }}</strong></span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="size-2 rounded-full bg-warning inline-block" />
                  <span>Withdrawn: <strong class="text-foreground">{{ decided.withdrawn }}</strong></span>
                </div>
              </div>
            </div>
          </UCard>
        </div>

        <!-- KPI Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <!-- Match Quality -->
          <UCard :ui="{ body: 'p-4' }">
            <div class="flex items-start gap-3">
              <UIcon name="i-lucide-target" class="text-primary size-5 shrink-0 mt-0.5" />
              <div class="flex-1 min-w-0">
                <p class="text-sm text-muted mb-2">Match Quality</p>
                <div class="flex gap-2 flex-wrap">
                  <UBadge label="" color="success" variant="subtle" size="sm">
                    <template #default>
                      <span class="font-bold">{{ matchDist.high }}</span>
                      <span class="ml-1 text-xs opacity-70">High</span>
                    </template>
                  </UBadge>
                  <UBadge label="" color="warning" variant="subtle" size="sm">
                    <template #default>
                      <span class="font-bold">{{ matchDist.medium }}</span>
                      <span class="ml-1 text-xs opacity-70">Med</span>
                    </template>
                  </UBadge>
                  <UBadge label="" color="error" variant="subtle" size="sm">
                    <template #default>
                      <span class="font-bold">{{ matchDist.low }}</span>
                      <span class="ml-1 text-xs opacity-70">Low</span>
                    </template>
                  </UBadge>
                </div>
                <p class="text-xs text-muted mt-2">
                  {{ matchDist.total }} of {{ matchDist.totalApplications }} analyzed
                </p>
              </div>
            </div>
          </UCard>

          <!-- Contact Leads -->
          <UCard :ui="{ body: 'p-4' }">
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-mail" class="text-primary size-5 shrink-0" />
              <div>
                <p class="text-2xl font-bold">{{ stats?.new ?? '—' }}</p>
                <p class="text-sm text-muted">New leads</p>
                <p class="text-xs text-muted">{{ stats?.total ?? 0 }} total submissions</p>
              </div>
            </div>
          </UCard>

          <!-- Inbox -->
          <UCard :ui="{ body: 'p-4' }">
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-inbox" class="text-primary size-5 shrink-0" />
              <div>
                <p class="text-2xl font-bold">{{ stats?.unreadInbox ?? '—' }}</p>
                <p class="text-sm text-muted">Unread messages</p>
                <NuxtLink to="/admin/inbox" class="text-xs text-primary hover:underline">
                  Open inbox →
                </NuxtLink>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Top Opportunities -->
        <div v-if="topMatches && topMatches.length > 0">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs text-muted uppercase tracking-wide">Best Matches</p>
            <NuxtLink to="/admin/applications" class="text-xs text-primary hover:underline">
              View all →
            </NuxtLink>
          </div>
          <div class="flex flex-col gap-2">
            <NuxtLink
              v-for="app in topMatches"
              :key="app.id"
              to="/admin/applications"
              class="block"
            >
              <UCard :ui="{ body: 'p-3' }" class="hover:bg-elevated/60 transition-colors cursor-pointer">
                <div class="flex items-center gap-3">
                  <UBadge
                    :label="`${app.match_rate}%`"
                    :color="matchColor(app.match_rate)"
                    variant="subtle"
                    size="sm"
                    class="shrink-0 font-mono"
                  />
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium truncate">{{ app.position }}</p>
                    <p class="text-xs text-muted truncate">
                      {{ app.company }}
                      <span v-if="app.location"> &middot; {{ app.location }}</span>
                    </p>
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <UIcon
                      v-if="app.work_model"
                      :name="workModelIcon(app.work_model)"
                      class="size-3.5 text-muted"
                    />
                    <UBadge
                      :label="app.status"
                      :color="statusColor(app.status)"
                      variant="subtle"
                      size="xs"
                      class="capitalize"
                    />
                  </div>
                </div>
              </UCard>
            </NuxtLink>
          </div>
        </div>

        <div v-else-if="topMatches !== null">
          <UCard :ui="{ body: 'p-6' }">
            <div class="flex flex-col items-center gap-2 text-center text-muted">
              <UIcon name="i-lucide-sparkles" class="size-8 opacity-30" />
              <p class="text-sm">No analyzed applications yet.</p>
              <NuxtLink to="/admin/applications">
                <UButton size="sm" variant="ghost" label="Open Applications →" />
              </NuxtLink>
            </div>
          </UCard>
        </div>

      </div>
    </template>
  </UDashboardPanel>
</template>
