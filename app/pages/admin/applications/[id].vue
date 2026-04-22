<script setup lang="ts">
import type { JobApplication, WorkflowStage } from '~/types/applications';

definePageMeta({ layout: 'admin' });

const route = useRoute();
const router = useRouter();
const toast = useToast();

const id = computed(() => Number(route.params.id));

const { application, pending, refresh } = useApplicationWorkspace(id);
await refresh();

const STAGES = [
  'analyze',
  'prioritize',
  'cv',
  'cover_letter',
  'review',
  'apply',
  'interview_prep'
] as const;
type ActiveStage = (typeof STAGES)[number];

const VALID = new Set<string>(STAGES);

const activeStage = computed<ActiveStage>(() => {
  const fromHash = (route.hash || '').replace(/^#stage=/, '');
  if (fromHash && VALID.has(fromHash)) return fromHash as ActiveStage;
  const current = application.value?.workflow.current_stage;
  if (current && VALID.has(current)) return current as ActiveStage;
  // Legacy 'sent' falls back to interview_prep.
  if (current === 'sent') return 'interview_prep';
  return 'analyze';
});

function selectStage(stage: WorkflowStage) {
  router.replace({ hash: `#stage=${stage}` });
}

async function reload() {
  await refresh();
}

function onJdSaved(updated: JobApplication) {
  application.value = updated;
}

const headerStatusColor = computed(() => {
  const w = application.value?.workflow;
  if (!w) return 'neutral';
  if (w.current_stage === 'closed') return 'success';
  if (w.current_stage === 'interview_prep' || w.current_stage === 'sent')
    return 'info';
  return 'info';
});

const stageLabel = computed(() => {
  const stage = application.value?.workflow.current_stage;
  if (!stage) return '';
  if (stage === 'interview_prep') return 'Interview prep';
  if (stage === 'cover_letter') return 'Cover letter';
  return stage;
});

// -- Delete flow --------------------------------------------------------
const deleteOpen = ref(false);
const deleting = ref(false);

async function confirmDelete() {
  if (!application.value) return;
  deleting.value = true;
  try {
    await $fetch(`/api/admin/applications/${application.value.id}`, {
      method: 'DELETE'
    });
    toast.add({
      title: 'Application deleted',
      color: 'success',
      icon: 'i-lucide-trash-2'
    });
    deleteOpen.value = false;
    await router.push('/admin/applications');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Delete failed.';
    toast.add({
      title: 'Delete failed',
      description: msg,
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    });
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <UDashboardPanel id="admin-application-canvas">
    <template #header>
      <UDashboardNavbar
        :title="application?.position ?? 'Application'"
        :ui="{ right: 'gap-2' }"
      >
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            to="/admin/applications"
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-arrow-left"
          >
            All
          </UButton>
          <UButton
            v-if="application?.url"
            :to="application.url"
            target="_blank"
            color="neutral"
            variant="ghost"
            icon="i-lucide-external-link"
            size="xs"
          >
            Listing
          </UButton>
          <AdminWorkflowHistoryButton
            v-if="application"
            :application-id="application.id"
          />
          <UButton
            v-if="application"
            color="error"
            variant="ghost"
            size="xs"
            icon="i-lucide-trash-2"
            @click="deleteOpen = true"
          >
            Delete
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="pending && !application" class="p-6">
        <div class="text-sm text-neutral-500">Loading…</div>
      </div>

      <div v-else-if="!application" class="p-6">
        <UAlert
          color="error"
          variant="soft"
          icon="i-lucide-triangle-alert"
          title="Application not found."
        />
        <UButton
          class="mt-3"
          to="/admin/applications"
          icon="i-lucide-arrow-left"
          variant="soft"
        >
          Back to applications
        </UButton>
      </div>

      <div v-else class="p-4 sm:p-6 space-y-4">
        <!-- Header meta -->
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div class="min-w-0 space-y-1">
            <div class="flex items-center gap-2 min-w-0">
              <UIcon
                name="i-lucide-building-2"
                class="text-primary size-5 shrink-0"
              />
              <span
                class="text-xl sm:text-2xl font-semibold text-default truncate"
              >
                {{ application.company }}
              </span>
            </div>
            <div
              class="flex items-center gap-2 text-sm text-muted font-mono truncate pl-7"
            >
              <span v-if="application.location">{{
                application.location
              }}</span>
              <span
                v-if="application.location && application.work_model"
                class="opacity-50"
                >·</span
              >
              <span v-if="application.work_model">{{
                application.work_model
              }}</span>
              <span
                v-if="!application.location && !application.work_model"
                class="italic"
                >No location specified</span
              >
            </div>
          </div>
          <div class="flex items-center gap-2">
            <UBadge
              v-if="application.match_rate !== null"
              color="primary"
              variant="soft"
            >
              Match {{ application.match_rate }}%
            </UBadge>
            <UBadge :color="headerStatusColor" variant="subtle">
              {{ stageLabel }}
            </UBadge>
          </div>
        </div>

        <!-- Stepper -->
        <AdminWorkflowStepper
          :workflow="application.workflow"
          :active="activeStage"
          @select="selectStage"
        />

        <!-- Job description (full width, top) -->
        <AdminJobDescriptionViewer
          :application="application"
          @saved="onJdSaved"
        />

        <!-- Active stage panel -->
        <div class="min-w-0">
          <KeepAlive>
            <AdminStagesStageAnalyze
              v-if="activeStage === 'analyze'"
              :application="application"
              @refreshed="reload"
              @transitioned="reload"
            />
            <AdminStagesStagePrioritize
              v-else-if="activeStage === 'prioritize'"
              :application="application"
              @refreshed="reload"
              @transitioned="reload"
            />
            <AdminStagesStageCv
              v-else-if="activeStage === 'cv'"
              :application="application"
              @refreshed="reload"
              @transitioned="reload"
            />
            <AdminStagesStageCoverLetter
              v-else-if="activeStage === 'cover_letter'"
              :application="application"
              @refreshed="reload"
              @transitioned="reload"
            />
            <AdminStagesStageReview
              v-else-if="activeStage === 'review'"
              :application="application"
              @refreshed="reload"
              @transitioned="reload"
            />
            <AdminStagesStageApply
              v-else-if="activeStage === 'apply'"
              :application="application"
              @refreshed="reload"
              @transitioned="reload"
              @applied="reload"
            />
            <AdminStagesStageInterviewPrep
              v-else-if="activeStage === 'interview_prep'"
              :application="application"
              @refreshed="reload"
              @transitioned="reload"
            />
          </KeepAlive>
        </div>

        <!-- Delete confirmation -->
        <UModal
          v-model:open="deleteOpen"
          :dismissible="!deleting"
          title="Delete this application?"
          :description="
            application
              ? `${application.company} — ${application.position}`
              : undefined
          "
        >
          <template #body>
            <p class="text-sm text-muted">
              This soft-deletes the application and all its workflow history. It
              can be restored by clearing
              <code class="font-mono text-xs">deleted_at</code> in the database.
            </p>
          </template>
          <template #footer>
            <div class="flex items-center justify-end gap-2 w-full">
              <UButton
                color="neutral"
                variant="ghost"
                :disabled="deleting"
                @click="deleteOpen = false"
              >
                Cancel
              </UButton>
              <UButton
                color="error"
                icon="i-lucide-trash-2"
                :loading="deleting"
                @click="confirmDelete"
              >
                Delete application
              </UButton>
            </div>
          </template>
        </UModal>
      </div>
    </template>
  </UDashboardPanel>
</template>
