<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';
import type {
  JobApplication,
  ApplicationStatus,
  CreateApplicationPayload,
  WorkflowStage
} from '~/types/applications';

definePageMeta({ layout: 'admin' });
useSeoMeta({ title: 'Admin — Applications', robots: 'noindex, nofollow' });

type BadgeColor =
  | 'primary'
  | 'neutral'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

const statusColor = (status: string): BadgeColor =>
  (
    ({
      saved: 'neutral',
      applied: 'primary',
      interviewing: 'info',
      offered: 'success',
      accepted: 'success',
      rejected: 'error',
      withdrawn: 'warning'
    }) as Record<string, BadgeColor>
  )[status] ?? 'neutral';

const matchColor = (rate: number | null): BadgeColor => {
  if (rate == null) return 'neutral';
  if (rate >= 70) return 'success';
  if (rate >= 40) return 'warning';
  return 'error';
};

const stageColor = (stage: WorkflowStage): BadgeColor => {
  if (stage === 'sent' || stage === 'closed') return 'success';
  if (stage === 'apply' || stage === 'review') return 'info';
  return 'neutral';
};

const toast = useToast();
const router = useRouter();
const route = useRoute();
const { applications, refresh, pending, createApplication } = useApplications();

// Status filter (driven by ?status= or tab clicks).
const filter = ref<string>(
  typeof route.query.status === 'string' ? route.query.status : 'all'
);
// Optional stage filter from /admin/analytics drill-down (?stage=apply).
const stageFilter = ref<string>(
  typeof route.query.stage === 'string' ? route.query.stage : ''
);
const createOpen = ref(false);
const creating = ref(false);

// Keep refs in sync if the user navigates back/forward.
watch(
  () => route.query,
  (q) => {
    filter.value = typeof q.status === 'string' ? q.status : 'all';
    stageFilter.value = typeof q.stage === 'string' ? q.stage : '';
  }
);

const STAGE_LABELS: Record<string, string> = {
  analyze: 'Analyze',
  prioritize: 'Prioritize',
  cv: 'CV',
  cover_letter: 'Cover letter',
  review: 'Review',
  apply: 'Apply',
  interview_prep: 'Interview prep',
  closed: 'Closed'
};

function clearStageFilter() {
  stageFilter.value = '';
  const { stage: _stage, ...rest } = route.query;
  router.replace({ query: rest });
}

const filterTabs = [
  { label: 'All', value: 'all' },
  { label: 'Saved', value: 'saved' },
  { label: 'Applied', value: 'applied' },
  { label: 'Interviewing', value: 'interviewing' },
  { label: 'Offered', value: 'offered' },
  { label: 'Decided', value: 'decided' }
];

const decidedStatuses: ApplicationStatus[] = [
  'accepted',
  'rejected',
  'withdrawn'
];

const filtered = computed(() => {
  if (!applications.value) return [];
  let list = applications.value;
  if (filter.value === 'decided') {
    list = list.filter((a) => decidedStatuses.includes(a.status));
  } else if (filter.value !== 'all') {
    list = list.filter((a) => a.status === filter.value);
  }
  if (stageFilter.value) {
    const target =
      stageFilter.value === 'interview_prep'
        ? ['interview_prep', 'sent']
        : [stageFilter.value];
    list = list.filter((a) =>
      target.includes(a.workflow?.current_stage ?? 'analyze')
    );
  }
  return list;
});

const workModelLabel: Record<string, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On-site'
};

const columns: TableColumn<JobApplication>[] = [
  { accessorKey: 'company', header: 'Company' },
  { accessorKey: 'position', header: 'Position' },
  {
    accessorKey: 'location',
    header: 'Location',
    cell: ({ row }) => row.original.location ?? '—'
  },
  { accessorKey: 'work_model', header: 'Model' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'stage', header: 'Stage' },
  { accessorKey: 'match_rate', header: 'Match' },
  {
    accessorKey: 'created_at',
    header: 'Date',
    cell: ({ row }) =>
      new Date(row.original.created_at).toLocaleDateString('en-CH', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
  }
];

function openApplication(app: JobApplication) {
  router.push(`/admin/applications/${app.id}`);
}

async function handleCreate(payload: CreateApplicationPayload) {
  creating.value = true;
  try {
    const app = await createApplication(payload);
    createOpen.value = false;
    toast.add({
      title: 'Application created',
      color: 'success',
      icon: 'i-lucide-check'
    });
    openApplication(app);
  } catch (err: unknown) {
    const statusCode =
      (err as { statusCode?: number; status?: number })?.statusCode ??
      (err as { statusCode?: number; status?: number })?.status;
    if (statusCode === 409) {
      const existingId = (err as { data?: { data?: { existingId?: number } } })
        ?.data?.data?.existingId;
      if (existingId) {
        createOpen.value = false;
        router.push(`/admin/applications/${existingId}`);
      }
      toast.add({
        title: 'Already in applications',
        description: 'This role is already tracked.',
        color: 'warning',
        icon: 'i-lucide-info'
      });
    } else {
      toast.add({
        title: 'Failed to create',
        color: 'error',
        icon: 'i-lucide-triangle-alert'
      });
    }
  } finally {
    creating.value = false;
  }
}

// Re-fetch after returning from a canvas page so workflow/stage badges stay fresh.
onActivated(() => {
  refresh();
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
        <div class="flex gap-2 flex-wrap items-center">
          <UButton
            v-for="tab in filterTabs"
            :key="tab.value"
            :label="tab.label"
            size="sm"
            :variant="filter === tab.value ? 'solid' : 'outline'"
            color="neutral"
            @click="filter = tab.value"
          />
          <UBadge
            v-if="stageFilter"
            :label="`stage: ${STAGE_LABELS[stageFilter] ?? stageFilter}`"
            color="primary"
            variant="subtle"
            size="sm"
            icon="i-lucide-filter"
            class="ms-2 cursor-pointer"
            title="Click to clear stage filter"
            @click="clearStageFilter"
          />
        </div>

        <!-- Table -->
        <UTable
          :data="filtered"
          :columns="columns"
          :loading="pending"
          class="w-full"
          @select="
            (_e: Event, row: { original: JobApplication }) =>
              openApplication(row.original)
          "
        >
          <template #work_model-cell="{ row }">
            <UBadge
              v-if="row.original.work_model"
              :label="
                workModelLabel[row.original.work_model] ??
                row.original.work_model
              "
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
          <template #stage-cell="{ row }">
            <UBadge
              :label="row.original.workflow?.current_stage ?? 'analyze'"
              :color="
                stageColor(row.original.workflow?.current_stage ?? 'analyze')
              "
              variant="soft"
              size="xs"
              class="font-mono"
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

        <p
          v-if="filtered.length === 0 && !pending"
          class="text-sm text-muted text-center py-8"
        >
          No applications found.
        </p>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Create slideover -->
  <USlideover
    v-model:open="createOpen"
    title="New application"
    description="Add a job application to track"
    side="right"
  >
    <template #body>
      <AdminApplicationForm
        :loading="creating"
        @submit="handleCreate"
        @cancel="createOpen = false"
      />
    </template>
  </USlideover>
</template>
