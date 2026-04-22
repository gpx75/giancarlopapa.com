<script setup lang="ts">
import type { JobSuggestion, JobApplication } from '~/types/applications';

definePageMeta({ layout: 'admin' });
useSeoMeta({ title: 'Admin — Job Matches', robots: 'noindex, nofollow' });

const toast = useToast();
const router = useRouter();

const suggestions = ref<JobSuggestion[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const findJobsOpen = ref(false);
const selectedId = ref<number | null>(null);
const analyzingId = ref<number | null>(null);
const promotingId = ref<number | null>(null);
const snoozingId = ref<number | null>(null);
const refreshingId = ref<number | null>(null);
const bulkRefreshing = ref(false);
const snoozeOpen = ref(false);
const snoozeUntilDate = ref<string>('');
const jdOpen = ref(false);

// ---- Filters ----
const statusFilter = ref<'active' | 'dismissed' | 'all'>('active');
const sourceFilter = ref<string>('');
const minScore = ref<number | null>(null);
const onlyUnanalyzed = ref(false);
const includeSnoozed = ref(false);
const onlySnoozed = ref(false);
const search = ref('');

const filterParams = computed(() => {
  const q: Record<string, string> = { status: statusFilter.value };
  if (sourceFilter.value) q.source = sourceFilter.value;
  if (minScore.value != null && Number.isFinite(minScore.value))
    q.min_score = String(minScore.value);
  if (onlyUnanalyzed.value) q.unanalyzed = 'only';
  if (onlySnoozed.value) q.snoozed = 'only';
  else if (includeSnoozed.value) q.snoozed = 'include';
  if (search.value.trim()) q.search = search.value.trim();
  return q;
});

const lastRefreshedAt = import.meta.client
  ? ref<number>(Number(localStorage.getItem('admin_matches_last_refresh') ?? 0))
  : ref<number>(0);

function saveRefreshTimestamp() {
  const now = Date.now();
  lastRefreshedAt.value = now;
  if (import.meta.client)
    localStorage.setItem('admin_matches_last_refresh', String(now));
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
    if (a.match_rate != null && b.match_rate != null)
      return b.match_rate - a.match_rate;
    if (a.match_rate != null) return -1;
    if (b.match_rate != null) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  })
);

// ---- View mode (flat vs. grouped-by-company) ----
type ViewMode = 'flat' | 'company';
const viewMode = ref<ViewMode>(
  import.meta.client &&
    localStorage.getItem('admin_matches_view_mode') === 'company'
    ? 'company'
    : 'flat'
);
watch(viewMode, (v) => {
  if (import.meta.client) localStorage.setItem('admin_matches_view_mode', v);
});

interface CompanyGroup {
  company: string;
  bestMatch: number | null;
  hasUnanalyzed: boolean;
  items: JobSuggestion[];
}

const grouped = computed<CompanyGroup[]>(() => {
  const map = new Map<string, CompanyGroup>();
  for (const s of sorted.value) {
    const key = (s.company || 'Unknown').trim();
    let g = map.get(key);
    if (!g) {
      g = { company: key, bestMatch: null, hasUnanalyzed: false, items: [] };
      map.set(key, g);
    }
    g.items.push(s);
    if (s.match_rate == null) g.hasUnanalyzed = true;
    else if (g.bestMatch == null || s.match_rate > g.bestMatch)
      g.bestMatch = s.match_rate;
  }
  // Sort groups by bestMatch desc; null bestMatch goes last
  return Array.from(map.values()).sort((a, b) => {
    if (a.bestMatch != null && b.bestMatch != null)
      return b.bestMatch - a.bestMatch;
    if (a.bestMatch != null) return -1;
    if (b.bestMatch != null) return 1;
    return a.company.localeCompare(b.company);
  });
});

const collapsedCompanies = ref<Set<string>>(new Set());
function toggleCompany(company: string) {
  const next = new Set(collapsedCompanies.value);
  if (next.has(company)) next.delete(company);
  else next.add(company);
  collapsedCompanies.value = next;
}
function isCollapsed(company: string) {
  return collapsedCompanies.value.has(company);
}

// Ensure the group containing the selected suggestion is never collapsed
watch([selectedId, grouped], () => {
  if (!selectedId.value) return;
  const g = grouped.value.find((grp) =>
    grp.items.some((s) => s.id === selectedId.value)
  );
  if (g && collapsedCompanies.value.has(g.company)) {
    const next = new Set(collapsedCompanies.value);
    next.delete(g.company);
    collapsedCompanies.value = next;
  }
});

const selected = computed(
  () => sorted.value.find((s) => s.id === selectedId.value) ?? null
);

async function load() {
  loading.value = true;
  try {
    suggestions.value = await $fetch<JobSuggestion[]>(
      '/api/admin/applications/suggestions',
      {
        query: filterParams.value
      }
    );
    // Keep selection if still in list, otherwise pick first
    if (
      selectedId.value &&
      !suggestions.value.some((s) => s.id === selectedId.value)
    ) {
      selectedId.value = suggestions.value[0]?.id ?? null;
    } else if (!selectedId.value) {
      selectedId.value = suggestions.value[0]?.id ?? null;
    }
  } catch {
    suggestions.value = [];
  } finally {
    loading.value = false;
  }
}

watch(
  filterParams,
  () => {
    load();
  },
  { deep: true }
);

async function refreshJobFeed() {
  refreshing.value = true;
  try {
    const data = await $fetch<{ imported: number }>(
      '/api/admin/applications/suggestions/find-jobs',
      {
        method: 'POST',
        body: { source: 'all' }
      }
    );
    saveRefreshTimestamp();
    if (data.imported > 0) {
      toast.add({
        title: `${data.imported} new jobs found`,
        color: 'success',
        icon: 'i-lucide-sparkles'
      });
    } else {
      toast.add({
        title: 'No new jobs found',
        color: 'neutral',
        icon: 'i-lucide-check'
      });
    }
    await load();
  } catch {
    toast.add({
      title: 'Refresh failed',
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    });
  } finally {
    refreshing.value = false;
  }
}

async function analyzeSuggestion(suggestion: JobSuggestion) {
  analyzingId.value = suggestion.id;
  try {
    const updated = await $fetch<JobSuggestion>(
      `/api/admin/applications/suggestions/${suggestion.id}/analyze`,
      { method: 'POST' }
    );
    const idx = suggestions.value.findIndex((s) => s.id === suggestion.id);
    if (idx >= 0) suggestions.value[idx] = updated;
    toast.add({
      title: `${updated.match_rate}% match`,
      color: 'success',
      icon: 'i-lucide-sparkles'
    });
  } catch {
    toast.add({
      title: 'Analysis failed',
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    });
  } finally {
    analyzingId.value = null;
  }
}

async function refreshDescription(suggestion: JobSuggestion) {
  refreshingId.value = suggestion.id;
  try {
    const updated = await $fetch<JobSuggestion>(
      `/api/admin/applications/suggestions/${suggestion.id}/refresh-description`,
      { method: 'POST' }
    );
    const idx = suggestions.value.findIndex((s) => s.id === suggestion.id);
    if (idx >= 0) suggestions.value[idx] = updated;
    toast.add({
      title: 'Description refreshed',
      description: `${updated.description?.length ?? 0} chars`,
      color: 'success',
      icon: 'i-lucide-refresh-cw'
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Refresh failed';
    toast.add({ title: msg, color: 'error', icon: 'i-lucide-triangle-alert' });
  } finally {
    refreshingId.value = null;
  }
}

async function bulkRefreshDescriptions() {
  bulkRefreshing.value = true;
  try {
    const result = await $fetch<{
      candidates: number;
      refreshed: number;
      unchanged: number;
      failed: number;
      total: number;
    }>('/api/admin/applications/suggestions/bulk-refresh-descriptions', {
      method: 'POST'
    });
    if (result.candidates === 0) {
      toast.add({
        title: 'Nothing to refresh',
        description: 'No stub descriptions found.',
        color: 'neutral',
        icon: 'i-lucide-check'
      });
    } else {
      toast.add({
        title: `Refreshed ${result.refreshed} of ${result.candidates}`,
        description: `${result.unchanged} unchanged · ${result.failed} failed`,
        color: result.refreshed > 0 ? 'success' : 'warning',
        icon: 'i-lucide-refresh-cw'
      });
      if (result.refreshed > 0) await load();
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Bulk refresh failed';
    toast.add({ title: msg, color: 'error', icon: 'i-lucide-triangle-alert' });
  } finally {
    bulkRefreshing.value = false;
  }
}

async function promoteSuggestion(suggestion: JobSuggestion) {
  promotingId.value = suggestion.id;
  try {
    const app = await $fetch<JobApplication>(
      `/api/admin/applications/suggestions/${suggestion.id}/promote`,
      { method: 'POST' }
    );
    suggestions.value = suggestions.value.filter((s) => s.id !== suggestion.id);
    toast.add({
      title: 'Promoted to application',
      color: 'success',
      icon: 'i-lucide-briefcase'
    });
    router.push(`/admin/applications/${app.id}`);
  } catch {
    toast.add({
      title: 'Promote failed',
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    });
  } finally {
    promotingId.value = null;
  }
}

async function dismissSuggestion(suggestion: JobSuggestion) {
  // Optimistic update for the active view; server soft-dismisses with timestamp
  const prev = [...suggestions.value];
  if (statusFilter.value === 'active') {
    suggestions.value = suggestions.value.filter((s) => s.id !== suggestion.id);
  }
  try {
    const updated = await $fetch<JobSuggestion>(
      `/api/admin/applications/suggestions/${suggestion.id}`,
      {
        method: 'PATCH',
        body: { status: 'dismissed' }
      }
    );
    if (statusFilter.value !== 'active') {
      const idx = suggestions.value.findIndex((s) => s.id === suggestion.id);
      if (idx >= 0) suggestions.value[idx] = updated;
    }
    toast.add({
      title: 'Dismissed',
      description: 'Find it again in the Dismissed filter.',
      color: 'neutral',
      icon: 'i-lucide-x',
      actions: [
        {
          label: 'Undo',
          color: 'primary',
          variant: 'link',
          onClick: () => undismiss(updated)
        }
      ]
    });
  } catch {
    suggestions.value = prev;
    toast.add({
      title: 'Dismiss failed',
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    });
  }
}

async function undismiss(suggestion: JobSuggestion) {
  try {
    await $fetch(`/api/admin/applications/suggestions/${suggestion.id}`, {
      method: 'PATCH',
      body: { status: 'new' }
    });
    await load();
    toast.add({ title: 'Restored', color: 'success', icon: 'i-lucide-check' });
  } catch {
    toast.add({
      title: 'Restore failed',
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    });
  }
}

function openSnooze(suggestion: JobSuggestion) {
  snoozingId.value = suggestion.id;
  // Default: 7 days from now, formatted YYYY-MM-DD
  const d = new Date();
  d.setDate(d.getDate() + 7);
  snoozeUntilDate.value = d.toISOString().slice(0, 10);
  snoozeOpen.value = true;
}

async function applySnooze() {
  if (!snoozingId.value) return;
  const id = snoozingId.value;
  const isoUntil = snoozeUntilDate.value
    ? new Date(`${snoozeUntilDate.value}T09:00:00`).toISOString()
    : null;
  try {
    await $fetch(`/api/admin/applications/suggestions/${id}/snooze`, {
      method: 'POST',
      body: { until: isoUntil }
    });
    snoozeOpen.value = false;
    snoozingId.value = null;
    await load();
    toast.add({
      title: isoUntil
        ? `Snoozed until ${snoozeUntilDate.value}`
        : 'Snooze cleared',
      color: 'neutral',
      icon: 'i-lucide-bell-off'
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Snooze failed';
    toast.add({ title: msg, color: 'error', icon: 'i-lucide-triangle-alert' });
  }
}

async function unsnooze(suggestion: JobSuggestion) {
  try {
    await $fetch(
      `/api/admin/applications/suggestions/${suggestion.id}/snooze`,
      {
        method: 'POST',
        body: { until: null }
      }
    );
    await load();
    toast.add({
      title: 'Snooze cleared',
      color: 'success',
      icon: 'i-lucide-bell'
    });
  } catch {
    toast.add({
      title: 'Failed',
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    });
  }
}

function clearFilters() {
  statusFilter.value = 'active';
  sourceFilter.value = '';
  minScore.value = null;
  onlyUnanalyzed.value = false;
  includeSnoozed.value = false;
  onlySnoozed.value = false;
  search.value = '';
}

const sourceOptions = computed(() => {
  const set = new Set<string>();
  for (const s of suggestions.value) if (s.source) set.add(s.source);
  return Array.from(set).sort();
});

onMounted(() => {
  load();
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
          <span
            v-if="lastRefreshedLabel"
            class="text-xs text-muted hidden sm:inline"
          >
            Updated {{ lastRefreshedLabel }}
          </span>
          <UButton
            icon="i-lucide-file-text"
            label="Refresh JDs"
            size="sm"
            variant="ghost"
            color="neutral"
            :loading="bulkRefreshing"
            title="Re-scrape full descriptions for any stub-only suggestions."
            @click="bulkRefreshDescriptions"
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
      <!-- Filter bar -->
      <div
        class="border-b border-default px-4 py-3 flex flex-wrap items-center gap-2 bg-elevated/40"
      >
        <UButtonGroup size="xs">
          <UButton
            :variant="statusFilter === 'active' ? 'solid' : 'outline'"
            color="neutral"
            label="Active"
            @click="statusFilter = 'active'"
          />
          <UButton
            :variant="statusFilter === 'dismissed' ? 'solid' : 'outline'"
            color="neutral"
            label="Dismissed"
            @click="statusFilter = 'dismissed'"
          />
          <UButton
            :variant="statusFilter === 'all' ? 'solid' : 'outline'"
            color="neutral"
            label="All"
            @click="statusFilter = 'all'"
          />
        </UButtonGroup>

        <UInput
          v-model="search"
          placeholder="Search title or company"
          icon="i-lucide-search"
          size="xs"
          class="w-56"
        />

        <USelect
          v-model="sourceFilter"
          :items="sourceOptions.map((s) => ({ label: s, value: s }))"
          placeholder="All sources"
          size="xs"
          class="w-40"
        />

        <UInput
          v-model.number="minScore"
          type="number"
          min="0"
          max="100"
          placeholder="Min score"
          size="xs"
          class="w-28"
        />

        <UCheckbox v-model="onlyUnanalyzed" label="Unanalyzed only" />
        <UCheckbox v-model="onlySnoozed" label="Snoozed only" />
        <UCheckbox
          v-if="!onlySnoozed"
          v-model="includeSnoozed"
          label="Include snoozed"
        />

        <UButton
          icon="i-lucide-filter-x"
          size="xs"
          variant="ghost"
          color="neutral"
          @click="clearFilters"
        >
          Reset
        </UButton>

        <span class="ml-auto text-xs text-muted"
          >{{ sorted.length }} match{{ sorted.length === 1 ? '' : 'es' }}</span
        >

        <UButtonGroup size="xs">
          <UButton
            :variant="viewMode === 'flat' ? 'solid' : 'outline'"
            color="neutral"
            icon="i-lucide-list"
            title="Flat list"
            @click="viewMode = 'flat'"
          />
          <UButton
            :variant="viewMode === 'company' ? 'solid' : 'outline'"
            color="neutral"
            icon="i-lucide-building-2"
            title="Group by company"
            @click="viewMode = 'company'"
          />
        </UButtonGroup>
      </div>

      <!-- Master-detail body -->
      <div
        v-if="loading"
        class="flex items-center justify-center gap-2 py-20 text-sm text-muted"
      >
        <UIcon name="i-lucide-loader" class="size-4 animate-spin" />
        Loading matches...
      </div>

      <div
        v-else-if="sorted.length === 0"
        class="flex flex-col items-center justify-center gap-3 py-20 text-muted"
      >
        <UIcon name="i-lucide-sparkles" class="size-10 opacity-20" />
        <p class="text-sm">No matches with these filters.</p>
        <UButton
          icon="i-lucide-filter-x"
          label="Reset filters"
          size="sm"
          variant="outline"
          @click="clearFilters"
        />
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-0 min-h-0 flex-1">
        <!-- Master list -->
        <div
          class="lg:col-span-5 xl:col-span-4 border-r border-default overflow-y-auto max-h-[calc(100vh-var(--header-height,0px)-7rem)]"
        >
          <!-- Flat mode -->
          <ul v-if="viewMode === 'flat'" class="divide-y divide-default">
            <li
              v-for="s in sorted"
              :key="s.id"
              class="px-3 py-3 cursor-pointer transition-colors hover:bg-elevated"
              :class="selectedId === s.id ? 'bg-elevated' : ''"
              @click="selectedId = s.id"
            >
              <div class="flex items-start gap-3">
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-sm truncate">{{ s.title }}</div>
                  <div class="text-xs text-muted truncate font-mono">
                    {{ s.company }}
                    <span v-if="s.location"> · {{ s.location }}</span>
                  </div>
                  <div class="flex items-center gap-1 mt-1 flex-wrap">
                    <UBadge
                      v-if="s.match_rate != null"
                      :label="`${s.match_rate}%`"
                      :color="
                        s.match_rate >= 70
                          ? 'success'
                          : s.match_rate >= 40
                            ? 'warning'
                            : 'error'
                      "
                      variant="subtle"
                      size="xs"
                    />
                    <UBadge
                      v-else
                      label="unanalyzed"
                      color="neutral"
                      variant="outline"
                      size="xs"
                    />
                    <UBadge
                      :label="s.source"
                      color="neutral"
                      variant="subtle"
                      size="xs"
                    />
                    <UBadge
                      v-if="
                        s.snoozed_until &&
                        new Date(s.snoozed_until) > new Date()
                      "
                      label="snoozed"
                      color="warning"
                      variant="subtle"
                      size="xs"
                      icon="i-lucide-bell-off"
                    />
                    <UBadge
                      v-if="s.status === 'dismissed'"
                      label="dismissed"
                      color="error"
                      variant="subtle"
                      size="xs"
                    />
                  </div>
                </div>
              </div>
            </li>
          </ul>

          <!-- Grouped-by-company mode -->
          <div v-else>
            <div
              v-for="g in grouped"
              :key="g.company"
              class="border-b border-default"
            >
              <button
                type="button"
                class="w-full px-3 py-2 flex items-center gap-2 hover:bg-elevated text-left"
                @click="toggleCompany(g.company)"
              >
                <UIcon
                  :name="
                    isCollapsed(g.company)
                      ? 'i-lucide-chevron-right'
                      : 'i-lucide-chevron-down'
                  "
                  class="size-4 text-muted shrink-0"
                />
                <UIcon
                  name="i-lucide-building-2"
                  class="size-4 text-primary-500 shrink-0"
                />
                <span class="font-medium text-sm truncate flex-1">{{
                  g.company
                }}</span>
                <UBadge
                  v-if="g.bestMatch != null"
                  :label="`${g.bestMatch}%`"
                  :color="
                    g.bestMatch >= 70
                      ? 'success'
                      : g.bestMatch >= 40
                        ? 'warning'
                        : 'error'
                  "
                  variant="subtle"
                  size="xs"
                />
                <UBadge
                  :label="String(g.items.length)"
                  color="neutral"
                  variant="subtle"
                  size="xs"
                />
              </button>
              <ul
                v-if="!isCollapsed(g.company)"
                class="divide-y divide-default bg-default"
              >
                <li
                  v-for="s in g.items"
                  :key="s.id"
                  class="pl-8 pr-3 py-2 cursor-pointer transition-colors hover:bg-elevated"
                  :class="selectedId === s.id ? 'bg-elevated' : ''"
                  @click="selectedId = s.id"
                >
                  <div class="flex items-start gap-2">
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-sm truncate">
                        {{ s.title }}
                      </div>
                      <div
                        v-if="s.location"
                        class="text-xs text-muted truncate font-mono"
                      >
                        {{ s.location }}
                      </div>
                      <div class="flex items-center gap-1 mt-1 flex-wrap">
                        <UBadge
                          v-if="s.match_rate != null"
                          :label="`${s.match_rate}%`"
                          :color="
                            s.match_rate >= 70
                              ? 'success'
                              : s.match_rate >= 40
                                ? 'warning'
                                : 'error'
                          "
                          variant="subtle"
                          size="xs"
                        />
                        <UBadge
                          v-else
                          label="unanalyzed"
                          color="neutral"
                          variant="outline"
                          size="xs"
                        />
                        <UBadge
                          :label="s.source"
                          color="neutral"
                          variant="subtle"
                          size="xs"
                        />
                        <UBadge
                          v-if="
                            s.snoozed_until &&
                            new Date(s.snoozed_until) > new Date()
                          "
                          label="snoozed"
                          color="warning"
                          variant="subtle"
                          size="xs"
                          icon="i-lucide-bell-off"
                        />
                        <UBadge
                          v-if="s.status === 'dismissed'"
                          label="dismissed"
                          color="error"
                          variant="subtle"
                          size="xs"
                        />
                      </div>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Detail panel -->
        <div
          class="lg:col-span-7 xl:col-span-8 overflow-y-auto max-h-[calc(100vh-var(--header-height,0px)-7rem)]"
        >
          <div
            v-if="!selected"
            class="flex items-center justify-center h-full text-sm text-muted"
          >
            Select a match to view details
          </div>

          <div v-else class="p-4 sm:p-6 space-y-4">
            <!-- Header -->
            <div class="flex items-start justify-between gap-3 flex-wrap">
              <div class="min-w-0">
                <h2 class="text-xl font-semibold">{{ selected.title }}</h2>
                <div class="text-sm text-muted font-mono mt-1">
                  {{ selected.company }}
                  <span v-if="selected.location">
                    · {{ selected.location }}</span
                  >
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <UButton
                  v-if="selected.url"
                  :to="selected.url"
                  target="_blank"
                  icon="i-lucide-external-link"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                >
                  Listing
                </UButton>
                <UButton
                  v-if="selected.match_rate == null"
                  icon="i-lucide-sparkles"
                  size="xs"
                  variant="outline"
                  :loading="analyzingId === selected.id"
                  :disabled="!selected.description"
                  @click="analyzeSuggestion(selected)"
                >
                  Analyze
                </UButton>
                <UButton
                  v-else
                  icon="i-lucide-refresh-cw"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  :loading="analyzingId === selected.id"
                  @click="analyzeSuggestion(selected)"
                >
                  Re-analyze
                </UButton>
                <UButton
                  v-if="
                    selected.snoozed_until &&
                    new Date(selected.snoozed_until) > new Date()
                  "
                  icon="i-lucide-bell"
                  size="xs"
                  variant="outline"
                  color="neutral"
                  @click="unsnooze(selected)"
                >
                  Wake
                </UButton>
                <UButton
                  v-else
                  icon="i-lucide-bell-off"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  @click="openSnooze(selected)"
                >
                  Snooze
                </UButton>
                <UButton
                  v-if="selected.status !== 'dismissed'"
                  icon="i-lucide-x"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  @click="dismissSuggestion(selected)"
                >
                  Dismiss
                </UButton>
                <UButton
                  v-else
                  icon="i-lucide-rotate-ccw"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  @click="undismiss(selected)"
                >
                  Restore
                </UButton>
                <UButton
                  icon="i-lucide-briefcase"
                  size="xs"
                  color="primary"
                  :loading="promotingId === selected.id"
                  @click="promoteSuggestion(selected)"
                >
                  Promote
                </UButton>
              </div>
            </div>

            <!-- Snoozed banner -->
            <UAlert
              v-if="
                selected.snoozed_until &&
                new Date(selected.snoozed_until) > new Date()
              "
              color="warning"
              variant="soft"
              icon="i-lucide-bell-off"
              :title="`Snoozed until ${new Date(selected.snoozed_until).toLocaleDateString('en-CH')}`"
            />

            <!-- Match analysis -->
            <UCard
              v-if="selected.match_rate != null && selected.match_breakdown"
              variant="soft"
            >
              <template #header>
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-bar-chart-3" class="text-primary-500" />
                  <h3 class="font-semibold">Match analysis</h3>
                  <UButton
                    v-if="
                      !selected.match_breakdown.companyPainPoints?.length &&
                      !selected.match_breakdown.valueDelivered?.length
                    "
                    icon="i-lucide-sparkles"
                    size="xs"
                    variant="ghost"
                    color="primary"
                    class="ml-auto"
                    :loading="analyzingId === selected.id"
                    @click="analyzeSuggestion(selected)"
                  >
                    Re-analyze for impact
                  </UButton>
                </div>
              </template>
              <AdminMatchRateDisplay
                :rate="selected.match_rate"
                :breakdown="selected.match_breakdown"
              />
            </UCard>

            <UCard v-else variant="soft">
              <div class="flex items-center justify-between gap-3">
                <div class="text-sm text-muted">
                  <span v-if="selected.description"
                    >No analysis yet — run it to score this against your
                    CV.</span
                  >
                  <span v-else
                    >Add a job description (or import from URL) to enable
                    analysis.</span
                  >
                </div>
                <div class="flex items-center gap-2">
                  <UButton
                    v-if="selected.url"
                    icon="i-lucide-refresh-cw"
                    size="sm"
                    variant="ghost"
                    color="neutral"
                    :loading="refreshingId === selected.id"
                    @click="refreshDescription(selected)"
                  >
                    Refresh JD
                  </UButton>
                  <UButton
                    v-if="selected.description"
                    icon="i-lucide-sparkles"
                    size="sm"
                    :loading="analyzingId === selected.id"
                    @click="analyzeSuggestion(selected)"
                  >
                    Analyze
                  </UButton>
                </div>
              </div>
            </UCard>

            <!-- Job description -->
            <UCard v-if="selected.description" variant="soft">
              <template #header>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="flex items-center gap-2 flex-1 min-w-0 text-left"
                    @click="jdOpen = !jdOpen"
                  >
                    <UIcon
                      :name="
                        jdOpen
                          ? 'i-lucide-chevron-down'
                          : 'i-lucide-chevron-right'
                      "
                      class="size-4 text-muted"
                    />
                    <UIcon name="i-lucide-file-text" class="text-primary-500" />
                    <h3 class="font-semibold">Job description</h3>
                    <UBadge
                      :label="`${selected.description.length} chars`"
                      :color="
                        selected.description.length < 400
                          ? 'error'
                          : selected.description.length < 800
                            ? 'warning'
                            : 'neutral'
                      "
                      variant="subtle"
                      size="xs"
                    />
                  </button>
                  <UButton
                    v-if="selected.url"
                    icon="i-lucide-refresh-cw"
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    :loading="refreshingId === selected.id"
                    @click="refreshDescription(selected)"
                  >
                    Refresh
                  </UButton>
                </div>
              </template>
              <div
                v-if="jdOpen"
                class="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-xs leading-relaxed max-h-[60vh] overflow-y-auto"
              >
                {{ selected.description }}
              </div>
            </UCard>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Find Jobs slideover -->
  <USlideover
    v-model:open="findJobsOpen"
    title="Find Jobs"
    description="Search job boards for matching positions"
    side="right"
  >
    <template #body>
      <AdminFindJobsModal @imported="load" />
    </template>
  </USlideover>

  <!-- Snooze modal -->
  <UModal
    v-model:open="snoozeOpen"
    title="Snooze match"
    description="Hide this suggestion until the chosen date."
  >
    <template #body>
      <div class="space-y-3">
        <UFormField label="Snooze until">
          <UInput v-model="snoozeUntilDate" type="date" />
        </UFormField>
        <div class="flex flex-wrap gap-2 text-xs">
          <UButton
            v-for="preset in [
              { label: '+3 days', days: 3 },
              { label: '+1 week', days: 7 },
              { label: '+2 weeks', days: 14 },
              { label: '+1 month', days: 30 }
            ]"
            :key="preset.label"
            size="xs"
            variant="outline"
            color="neutral"
            @click="
              () => {
                const d = new Date();
                d.setDate(d.getDate() + preset.days);
                snoozeUntilDate = d.toISOString().slice(0, 10);
              }
            "
          >
            {{ preset.label }}
          </UButton>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton color="neutral" variant="ghost" @click="snoozeOpen = false"
          >Cancel</UButton
        >
        <UButton color="primary" @click="applySnooze">Snooze</UButton>
      </div>
    </template>
  </UModal>
</template>
