<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';
import type { JobApplication, ApplicationStatus, CreateApplicationPayload, JobSuggestion } from '~/types/applications';

definePageMeta({ layout: 'admin' });
useSeoMeta({ title: 'Admin — Applications', robots: 'noindex, nofollow' });

type BadgeColor = 'primary' | 'neutral' | 'success' | 'warning' | 'error' | 'info';

const statusColor = (status: string): BadgeColor => (({
  saved: 'neutral',
  applied: 'primary',
  interviewing: 'info',
  offered: 'success',
  accepted: 'success',
  rejected: 'error',
  withdrawn: 'warning'
} as Record<string, BadgeColor>)[status] ?? 'neutral');

const matchColor = (rate: number | null): BadgeColor => {
  if (rate == null) return 'neutral';
  if (rate >= 70) return 'success';
  if (rate >= 40) return 'warning';
  return 'error';
};

const toast = useToast();
const { applications, refresh, pending, createApplication, deleteApplication, analyzeMatch } = useApplications();

const filter = ref<string>('all');
const selected = ref<JobApplication | null>(null);
const detailOpen = ref(false);
const createOpen = ref(false);
const confirmDeleteOpen = ref(false);
const creating = ref(false);
const deleting = ref(false);
const analyzing = ref(false);
const saving = ref(false);
const detailRef = ref<{ saveChanges: () => Promise<void> } | null>(null);
const viewTab = ref('applications');
const suggestions = ref<JobSuggestion[]>([]);
const loadingSuggestions = ref(false);
const findJobsOpen = ref(false);

const viewTabs = [
  { label: 'My Applications', value: 'applications' },
  { label: 'Job Match', value: 'suggestions' }
];

const filterTabs = [
  { label: 'All', value: 'all' },
  { label: 'Saved', value: 'saved' },
  { label: 'Applied', value: 'applied' },
  { label: 'Interviewing', value: 'interviewing' },
  { label: 'Offered', value: 'offered' },
  { label: 'Decided', value: 'decided' }
];

const decidedStatuses: ApplicationStatus[] = ['accepted', 'rejected', 'withdrawn'];

const filtered = computed(() => {
  if (!applications.value) return [];
  if (filter.value === 'all') return applications.value;
  if (filter.value === 'decided') return applications.value.filter(a => decidedStatuses.includes(a.status));
  return applications.value.filter(a => a.status === filter.value);
});

const columns: TableColumn<JobApplication>[] = [
  { accessorKey: 'company', header: 'Company' },
  { accessorKey: 'position', header: 'Position' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => row.original.status
  },
  {
    accessorKey: 'match_rate',
    header: 'Match',
    cell: ({ row }) => row.original.match_rate != null ? `${row.original.match_rate}%` : '—'
  },
  {
    accessorKey: 'created_at',
    header: 'Date',
    cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString('en-CH', {
      day: '2-digit', month: 'short', year: 'numeric'
    })
  }
];

function openApplication(app: JobApplication) {
  selected.value = app;
  detailOpen.value = true;
}

async function handleCreate(payload: CreateApplicationPayload) {
  creating.value = true;
  try {
    const app = await createApplication(payload);
    createOpen.value = false;
    toast.add({ title: 'Application created', color: 'success', icon: 'i-lucide-check' });
    openApplication(app);
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number; status?: number })?.statusCode
      ?? (err as { statusCode?: number; status?: number })?.status;
    if (statusCode === 409) {
      const existingId = (err as { data?: { data?: { existingId?: number } } })?.data?.data?.existingId;
      toast.add({
        title: 'Already in applications',
        description: 'This role is already tracked.',
        color: 'warning',
        icon: 'i-lucide-info'
      });
      const existing = applications.value?.find(a => a.id === existingId);
      if (existing) {
        createOpen.value = false;
        openApplication(existing);
      }
    } else {
      toast.add({ title: 'Failed to create', color: 'error', icon: 'i-lucide-triangle-alert' });
    }
  } finally {
    creating.value = false;
  }
}

function handleUpdate(app: JobApplication) {
  selected.value = app;
}

async function handleDelete() {
  if (!selected.value) return;
  deleting.value = true;
  try {
    await deleteApplication(selected.value.id);
    detailOpen.value = false;
    selected.value = null;
    toast.add({ title: 'Application deleted', color: 'success', icon: 'i-lucide-check' });
  } catch {
    toast.add({ title: 'Delete failed', color: 'error', icon: 'i-lucide-triangle-alert' });
  } finally {
    deleting.value = false;
    confirmDeleteOpen.value = false;
  }
}

async function handleAnalyze() {
  if (!selected.value) return;
  analyzing.value = true;
  try {
    const updated = await analyzeMatch(selected.value.id);
    selected.value = updated;
    toast.add({ title: 'Match analysis complete', description: `${updated.match_rate}% match`, color: 'success', icon: 'i-lucide-sparkles' });
  } catch {
    toast.add({ title: 'Analysis failed', description: 'Could not complete match analysis.', color: 'error', icon: 'i-lucide-triangle-alert' });
  } finally {
    analyzing.value = false;
  }
}

// Suggestions
const refreshingFeed = ref(false);

async function loadSuggestions() {
  loadingSuggestions.value = true;
  try {
    suggestions.value = await $fetch<JobSuggestion[]>('/api/admin/applications/suggestions');
  } catch {
    suggestions.value = [];
  } finally {
    loadingSuggestions.value = false;
  }
}

async function refreshJobFeed() {
  refreshingFeed.value = true;
  try {
    const data = await $fetch<{ imported: number }>('/api/admin/applications/suggestions/find-jobs', {
      method: 'POST',
      body: { source: 'all' }
    });
    if (data.imported > 0) {
      toast.add({ title: `${data.imported} new jobs found`, color: 'success', icon: 'i-lucide-sparkles' });
    } else {
      toast.add({ title: 'No new jobs found', color: 'neutral', icon: 'i-lucide-check' });
    }
    await loadSuggestions();
  } catch {
    toast.add({ title: 'Refresh failed', color: 'error', icon: 'i-lucide-triangle-alert' });
  } finally {
    refreshingFeed.value = false;
  }
}

async function promoteSuggestion(suggestion: JobSuggestion) {
  try {
    const app = await $fetch<JobApplication>(`/api/admin/applications/suggestions/${suggestion.id}/promote`, { method: 'POST' });
    await Promise.all([refresh(), loadSuggestions()]);
    toast.add({ title: 'Promoted to application', color: 'success', icon: 'i-lucide-arrow-right' });
    openApplication(app);
  } catch {
    toast.add({ title: 'Promote failed', color: 'error', icon: 'i-lucide-triangle-alert' });
  }
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

async function dismissSuggestion(suggestion: JobSuggestion) {
  try {
    await $fetch(`/api/admin/applications/suggestions/${suggestion.id}`, {
      method: 'PATCH',
      body: { status: 'dismissed' }
    });
    await loadSuggestions();
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
    await loadSuggestions();
  } catch {
    toast.add({ title: 'Clear failed', color: 'error', icon: 'i-lucide-triangle-alert' });
  } finally {
    clearingFeed.value = false;
  }
}

const hasAutoRefreshed = ref(false);

watch(viewTab, async (tab) => {
  if (tab === 'suggestions') {
    await loadSuggestions();
    // Auto-refresh from all sources on first visit if no suggestions exist
    if (!hasAutoRefreshed.value && suggestions.value.length === 0) {
      hasAutoRefreshed.value = true;
      refreshJobFeed();
    }
  }
});
</script>

<template>
  <UDashboardPanel id="admin-applications">
    <template #header>
      <UDashboardNavbar title="Applications" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <template v-if="viewTab === 'suggestions'">
            <UButton
              v-if="suggestions.length > 0"
              icon="i-lucide-trash-2"
              label="Clear"
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
              :loading="refreshingFeed"
              @click="refreshJobFeed"
            />
            <UButton
              icon="i-lucide-search"
              label="Find Jobs"
              size="sm"
              variant="outline"
              @click="findJobsOpen = true"
            />
          </template>
          <UButton
            v-else
            icon="i-lucide-plus"
            label="New"
            size="sm"
            @click="createOpen = true"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-4 p-4">
        <!-- View tabs -->
        <div class="flex gap-2">
          <UButton
            v-for="tab in viewTabs"
            :key="tab.value"
            :label="tab.label"
            size="sm"
            :variant="viewTab === tab.value ? 'solid' : 'outline'"
            @click="viewTab = tab.value"
          />
        </div>

        <!-- Applications view -->
        <template v-if="viewTab === 'applications'">
        <!-- Filter tabs -->
        <div class="flex gap-2 flex-wrap">
          <UButton
            v-for="tab in filterTabs"
            :key="tab.value"
            :label="tab.label"
            size="sm"
            :variant="filter === tab.value ? 'solid' : 'outline'"
            color="neutral"
            @click="filter = tab.value"
          />
        </div>

        <!-- Table -->
        <UTable
          :data="filtered"
          :columns="columns"
          :loading="pending"
          class="w-full"
          @select="(_e: Event, row: { original: JobApplication }) => openApplication(row.original)"
        >
          <template #status-cell="{ row }">
            <UBadge
              :label="row.original.status"
              :color="statusColor(row.original.status)"
              variant="subtle"
              class="capitalize"
            />
          </template>
          <template #match_rate-cell="{ row }">
            <UBadge
              v-if="row.original.match_rate != null"
              :label="`${row.original.match_rate}%`"
              :color="matchColor(row.original.match_rate)"
              variant="subtle"
              size="sm"
            />
            <span v-else class="text-muted text-sm">&mdash;</span>
          </template>
        </UTable>

        <p v-if="filtered.length === 0 && !pending" class="text-sm text-muted text-center py-8">
          No applications found.
        </p>
        </template>

        <!-- Suggestions view -->
        <template v-else>
          <div v-if="loadingSuggestions" class="flex items-center gap-2 text-sm text-muted py-8 justify-center">
            <UIcon name="i-lucide-loader" class="size-4 animate-spin" />
            Loading suggestions...
          </div>
          <p v-else-if="suggestions.length === 0" class="text-sm text-muted text-center py-8">
            No job matches yet. Click Refresh to find jobs matching your profile.
          </p>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AdminJobSuggestionCard
              v-for="s in suggestions"
              :key="s.id"
              :suggestion="s"
              @promote="promoteSuggestion"
              @dismiss="dismissSuggestion"
              @analyze="analyzeSuggestion"
            />
          </div>
        </template>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Application detail slideover -->
  <USlideover v-model:open="detailOpen" :title="selected?.position ?? ''" :description="selected?.company ?? ''" side="right" :ui="{ content: 'max-w-2xl' }">
    <template #body>
      <AdminApplicationDetail
        v-if="selected"
        ref="detailRef"
        :application="selected"
        @update="handleUpdate"
        @delete="confirmDeleteOpen = true"
        @analyze="handleAnalyze"
      />
      <div v-if="selected && analyzing" class="flex items-center gap-2 text-sm text-muted p-4">
        <UIcon name="i-lucide-loader" class="size-4 animate-spin" />
        Analyzing match...
      </div>
    </template>
    <template #footer>
      <div v-if="selected" class="flex gap-2 w-full">
        <UButton
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          square
          @click="confirmDeleteOpen = true"
        />
        <UButton
          label="Save"
          icon="i-lucide-check"
          :loading="saving"
          class="flex-1"
          @click="detailRef?.saveChanges()"
        />
      </div>
    </template>
  </USlideover>

  <!-- Create modal -->
  <USlideover v-model:open="createOpen" title="New application" description="Add a job application to track" side="right">
    <template #body>
      <AdminApplicationForm
        :loading="creating"
        @submit="handleCreate"
        @cancel="createOpen = false"
      />
    </template>
  </USlideover>

  <!-- Delete confirm -->
  <USlideover v-model:open="confirmDeleteOpen" title="Delete application?" description="This action is permanent" side="right">
    <template #body>
      <p class="text-sm">
        This will permanently delete <strong>{{ selected?.position }}</strong> at <strong>{{ selected?.company }}</strong> and all associated cover letters. This cannot be undone.
      </p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" label="Cancel" :disabled="deleting" @click="confirmDeleteOpen = false" />
        <UButton color="error" icon="i-lucide-trash-2" label="Delete" :loading="deleting" @click="handleDelete" />
      </div>
    </template>
  </USlideover>

  <!-- Find Jobs slideover -->
  <USlideover v-model:open="findJobsOpen" title="Find jobs" description="Search job boards for matching positions" side="right">
    <template #body>
      <AdminFindJobsModal @imported="loadSuggestions" />
    </template>
  </USlideover>
</template>
