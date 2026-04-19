<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';
import type { JobApplication, ApplicationStatus, CreateApplicationPayload } from '~/types/applications';

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

const workModelLabel: Record<string, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On-site'
};

const columns: TableColumn<JobApplication>[] = [
  { accessorKey: 'company', header: 'Company' },
  { accessorKey: 'position', header: 'Position' },
  { accessorKey: 'location', header: 'Location', cell: ({ row }) => row.original.location ?? '—' },
  {
    accessorKey: 'work_model',
    header: 'Model',
    cell: ({ row }) => row.original.work_model ? workModelLabel[row.original.work_model] ?? row.original.work_model : '—'
  },
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
</script>

<template>
  <UDashboardPanel id="admin-applications">
    <template #header>
      <UDashboardNavbar title="Applications" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
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
          <template #work_model-cell="{ row }">
            <UBadge
              v-if="row.original.work_model"
              :label="workModelLabel[row.original.work_model] ?? row.original.work_model"
              color="neutral"
              variant="outline"
              size="xs"
            />
            <span v-else class="text-muted text-sm">&mdash;</span>
          </template>
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
</template>
