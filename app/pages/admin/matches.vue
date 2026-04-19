<script setup lang="ts">
import type { JobSuggestion, JobApplication } from '~/types/applications';

definePageMeta({ layout: 'admin' });
useSeoMeta({ title: 'Admin — Job Matches', robots: 'noindex, nofollow' });

const toast = useToast();

const suggestions = ref<JobSuggestion[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const findJobsOpen = ref(false);
const autoAnalyzing = ref(false);

// Daily refresh tracking via localStorage
const lastRefreshedAt = import.meta.client
  ? ref<number>(Number(localStorage.getItem('admin_matches_last_refresh') ?? 0))
  : ref<number>(0);

function saveRefreshTimestamp() {
  const now = Date.now();
  lastRefreshedAt.value = now;
  if (import.meta.client) localStorage.setItem('admin_matches_last_refresh', String(now));
}

const lastRefreshedLabel = computed(() => {
  if (!lastRefreshedAt.value) return null;
  const diff = Date.now() - lastRefreshedAt.value;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
});

// Sorted: analyzed by match_rate desc, then unanalyzed by date desc
const sorted = computed(() =>
  [...suggestions.value].sort((a, b) => {
    if (a.match_rate != null && b.match_rate != null) return b.match_rate - a.match_rate;
    if (a.match_rate != null) return -1;
    if (b.match_rate != null) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  })
);

const todaysCutoff = computed(() => Date.now() - 24 * 60 * 60 * 1000);
const todaysPicks = computed(() =>
  sorted.value.filter(s => new Date(s.created_at).getTime() > todaysCutoff.value)
);
const olderMatches = computed(() =>
  sorted.value.filter(s => new Date(s.created_at).getTime() <= todaysCutoff.value)
);

async function load() {
  loading.value = true;
  try {
    suggestions.value = await $fetch<JobSuggestion[]>('/api/admin/applications/suggestions');
  } catch {
    suggestions.value = [];
  } finally {
    loading.value = false;
  }
}

async function refreshJobFeed() {
  refreshing.value = true;
  try {
    const data = await $fetch<{ imported: number }>('/api/admin/applications/suggestions/find-jobs', {
      method: 'POST',
      body: { source: 'all' }
    });
    saveRefreshTimestamp();
    if (data.imported > 0) {
      toast.add({ title: `${data.imported} new jobs found`, color: 'success', icon: 'i-lucide-sparkles' });
    } else {
      toast.add({ title: 'No new jobs found', color: 'neutral', icon: 'i-lucide-check' });
    }
    await load();
    autoAnalyzeNew();
  } catch {
    toast.add({ title: 'Refresh failed', color: 'error', icon: 'i-lucide-triangle-alert' });
  } finally {
    refreshing.value = false;
  }
}

// Auto-analyze unanalyzed suggestions that have a description
async function autoAnalyzeNew() {
  const queue = suggestions.value.filter(s => s.match_rate == null && s.description);
  if (queue.length === 0) return;
  autoAnalyzing.value = true;
  for (const s of queue) {
    try {
      const updated = await $fetch<JobSuggestion>(`/api/admin/applications/suggestions/${s.id}/analyze`, { method: 'POST' });
      const idx = suggestions.value.findIndex(x => x.id === s.id);
      if (idx >= 0) suggestions.value[idx] = updated;
    } catch {
      // skip failures silently during batch
    }
    await new Promise(r => setTimeout(r, 400));
  }
  autoAnalyzing.value = false;
}

async function analyzeSuggestion(suggestion: JobSuggestion) {
  try {
    const updated = await $fetch<JobSuggestion>(`/api/admin/applications/suggestions/${suggestion.id}/analyze`, { method: 'POST' });
    const idx = suggestions.value.findIndex(s => s.id === suggestion.id);
    if (idx >= 0) suggestions.value[idx] = updated;
    toast.add({ title: `${updated.match_rate}% match`, color: 'success', icon: 'i-lucide-sparkles' });
  } catch {
    toast.add({ title: 'Analysis failed', color: 'error', icon: 'i-lucide-triangle-alert' });
  }
}

async function promoteSuggestion(suggestion: JobSuggestion) {
  try {
    await $fetch<JobApplication>(`/api/admin/applications/suggestions/${suggestion.id}/promote`, { method: 'POST' });
    suggestions.value = suggestions.value.filter(s => s.id !== suggestion.id);
    toast.add({ title: 'Promoted to application', color: 'success', icon: 'i-lucide-briefcase' });
  } catch {
    toast.add({ title: 'Promote failed', color: 'error', icon: 'i-lucide-triangle-alert' });
  }
}

async function dismissSuggestion(suggestion: JobSuggestion) {
  try {
    await $fetch(`/api/admin/applications/suggestions/${suggestion.id}`, {
      method: 'PATCH',
      body: { status: 'dismissed' }
    });
    suggestions.value = suggestions.value.filter(s => s.id !== suggestion.id);
  } catch {
    toast.add({ title: 'Update failed', color: 'error', icon: 'i-lucide-triangle-alert' });
  }
}

const clearingFeed = ref(false);
async function clearSuggestions() {
  clearingFeed.value = true;
  try {
    const data = await $fetch<{ cleared: number }>('/api/admin/applications/suggestions/clear', { method: 'POST' });
    toast.add({ title: `Cleared ${data.cleared} suggestions`, color: 'success', icon: 'i-lucide-trash-2' });
    await load();
  } catch {
    toast.add({ title: 'Clear failed', color: 'error', icon: 'i-lucide-triangle-alert' });
  } finally {
    clearingFeed.value = false;
  }
}

onMounted(async () => {
  await load();
  const hoursSince = (Date.now() - lastRefreshedAt.value) / (1000 * 60 * 60);
  if (hoursSince > 24 || suggestions.value.length === 0) {
    await refreshJobFeed();
  } else {
    autoAnalyzeNew();
  }
});
</script>

<template>
  <UDashboardPanel id="admin-matches">
    <template #header>
      <UDashboardNavbar title="Job Matches" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <span v-if="lastRefreshedLabel" class="text-xs text-muted hidden sm:inline">
            Updated {{ lastRefreshedLabel }}
          </span>
          <UButton
            v-if="autoAnalyzing"
            size="sm"
            variant="ghost"
            color="neutral"
            loading
            label="Analyzing..."
          />
          <UButton
            v-if="suggestions.length > 0"
            icon="i-lucide-trash-2"
            size="sm"
            variant="ghost"
            color="error"
            :loading="clearingFeed"
            @click="clearSuggestions"
          />
          <UButton
            icon="i-lucide-refresh-cw"
            label="Refresh"
            size="sm"
            variant="outline"
            :loading="refreshing"
            @click="refreshJobFeed"
          />
          <UButton
            icon="i-lucide-search"
            label="Find Jobs"
            size="sm"
            @click="findJobsOpen = true"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="loading" class="flex items-center justify-center gap-2 py-20 text-sm text-muted">
        <UIcon name="i-lucide-loader" class="size-4 animate-spin" />
        Loading matches...
      </div>

      <div v-else-if="sorted.length === 0" class="flex flex-col items-center justify-center gap-3 py-20 text-muted">
        <UIcon name="i-lucide-sparkles" class="size-10 opacity-20" />
        <p class="text-sm">No job matches yet.</p>
        <UButton icon="i-lucide-search" label="Find Jobs" size="sm" @click="findJobsOpen = true" />
      </div>

      <div v-else class="flex flex-col gap-8 p-4 max-w-5xl">

        <!-- Today's Picks -->
        <div v-if="todaysPicks.length > 0">
          <div class="flex items-center gap-2 mb-3">
            <UIcon name="i-lucide-sun" class="size-4 text-warning" />
            <p class="text-xs text-muted uppercase tracking-wide">Today's Picks</p>
            <UBadge :label="String(todaysPicks.length)" color="warning" variant="subtle" size="xs" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AdminJobSuggestionCard
              v-for="s in todaysPicks"
              :key="s.id"
              :suggestion="s"
              highlight
              @promote="promoteSuggestion"
              @dismiss="dismissSuggestion"
              @analyze="analyzeSuggestion"
            />
          </div>
        </div>

        <!-- All matches -->
        <div v-if="olderMatches.length > 0">
          <p class="text-xs text-muted uppercase tracking-wide mb-3">All Matches</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AdminJobSuggestionCard
              v-for="s in olderMatches"
              :key="s.id"
              :suggestion="s"
              @promote="promoteSuggestion"
              @dismiss="dismissSuggestion"
              @analyze="analyzeSuggestion"
            />
          </div>
        </div>

      </div>
    </template>
  </UDashboardPanel>

  <!-- Find Jobs slideover -->
  <USlideover v-model:open="findJobsOpen" title="Find Jobs" description="Search job boards for matching positions" side="right">
    <template #body>
      <AdminFindJobsModal @imported="load" />
    </template>
  </USlideover>
</template>
