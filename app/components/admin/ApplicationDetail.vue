<script setup lang="ts">
import type {
  JobApplication,
  ApplicationStatus,
  ApplicationPriority,
  CvSuggestion
} from '~/types/applications';

type BadgeColor =
  | 'primary'
  | 'neutral'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

type InboxMessage = {
  id: string;
  uid: number;
  subject: string;
  from_name: string;
  from_email: string;
  body_text: string;
  received_at: string;
  unread: boolean;
  folder: string;
};

type LinkedContact = {
  id: number;
  name: string;
  email: string;
  status: string;
  created_at: string;
};

const props = defineProps<{
  application: JobApplication;
}>();

const emit = defineEmits<{
  update: [app: JobApplication];
  delete: [];
  analyze: [];
}>();

const toast = useToast();
const { updateApplication } = useApplications();
const { formatInboxDate, formatDate } = useDateFormatting();

// Refs for section anchors
const analyzeRef = ref<HTMLElement | null>(null);
const priorityRef = ref<HTMLElement | null>(null);
const cvSugRef = ref<HTMLElement | null>(null);
const coverLetterRef = ref<HTMLElement | null>(null);

const saving = ref(false);
const jobDescExpanded = ref(false);
const editingJobDesc = ref(false);
const editJobDesc = ref(props.application.job_description ?? '');
const savingJobDesc = ref(false);
const editStatus = ref<ApplicationStatus>(props.application.status);
const editNotes = ref(props.application.notes ?? '');
const editPriority = ref<string>(props.application.priority ?? '');

const cvSuggestions = ref<CvSuggestion[]>([]);
const loadingCvSuggestions = ref(false);
const cvSuggestionsOpen = ref(false);
const coverLetterCount = ref(0);

const relatedContacts = ref<LinkedContact[]>([]);
const relatedEmails = ref<InboxMessage[]>([]);
const loadingContacts = ref(false);
const loadingEmails = ref(false);

const statusOptions = [
  { label: 'Saved', value: 'saved' },
  { label: 'Applied', value: 'applied' },
  { label: 'Interviewing', value: 'interviewing' },
  { label: 'Offered', value: 'offered' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Withdrawn', value: 'withdrawn' }
];

const priorityOptions = [
  { label: 'P0 — Dream role', value: 'p0' },
  { label: 'P1 — Strong fit', value: 'p1' },
  { label: 'P2 — Backup', value: 'p2' }
];

type PriorityBadgeColor = 'success' | 'info' | 'warning' | 'neutral';
const PRIORITY_COLORS: Record<ApplicationPriority, PriorityBadgeColor> = {
  p0: 'success',
  p1: 'info',
  p2: 'warning'
};
const PRIORITY_LABELS: Record<ApplicationPriority, string> = {
  p0: 'P0',
  p1: 'P1',
  p2: 'P2'
};
const priorityColor = (
  p: ApplicationPriority | null | undefined
): PriorityBadgeColor => (p ? PRIORITY_COLORS[p] : 'neutral');

const priorityLabel = (
  p: ApplicationPriority | null | undefined
): string | null => (p ? PRIORITY_LABELS[p] : null);

const workModelLabels: Record<string, string> = {
  onsite: 'On-site',
  hybrid: 'Hybrid',
  remote: 'Remote'
};

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

// Gap scorecard — top 2 gaps from match breakdown
const topGaps = computed(
  () => props.application.match_breakdown?.gaps?.slice(0, 2) ?? []
);
const dimensionScores = computed(() => {
  const bd = props.application.match_breakdown;
  if (!bd) return [];
  return [
    { label: 'Skills', score: bd.skills },
    { label: 'Tech Stack', score: bd.techStack },
    { label: 'Experience', score: bd.experience },
    { label: 'Seniority', score: bd.seniority },
    { label: 'Industry', score: bd.industry },
    { label: 'Location', score: bd.location ?? 0 }
  ].sort((a, b) => a.score - b.score); // weakest first
});

watch(
  () => props.application,
  (app) => {
    editStatus.value = app.status;
    editNotes.value = app.notes ?? '';
    editPriority.value = app.priority ?? '';
    editJobDesc.value = app.job_description ?? '';
    editingJobDesc.value = false;
    if (app.cv_suggestions?.length) {
      cvSuggestions.value = app.cv_suggestions as CvSuggestion[];
      cvSuggestionsOpen.value = true;
    } else {
      cvSuggestions.value = [];
      cvSuggestionsOpen.value = false;
    }
    fetchRelated();
  },
  { immediate: true }
);

// Auto-save priority when user changes it (skip if value matches current prop — happens on prop sync)
watch(editPriority, async (val) => {
  const currentProp = props.application.priority ?? '';
  if (val === currentProp) return;
  await savePriority(val);
});

function fetchRelated() {
  if (!props.application.contact_email) {
    relatedContacts.value = [];
    relatedEmails.value = [];
    return;
  }
  loadingContacts.value = true;
  loadingEmails.value = true;

  $fetch<LinkedContact[]>('/api/admin/contacts/by-email', {
    params: { email: props.application.contact_email }
  })
    .then((data) => {
      relatedContacts.value = data;
    })
    .catch(() => {
      relatedContacts.value = [];
    })
    .finally(() => {
      loadingContacts.value = false;
    });

  $fetch<InboxMessage[]>('/api/admin/inbox/by-email', {
    params: { email: props.application.contact_email }
  })
    .then((data) => {
      relatedEmails.value = data;
    })
    .catch(() => {
      relatedEmails.value = [];
    })
    .finally(() => {
      loadingEmails.value = false;
    });
}

async function fetchCvSuggestions() {
  loadingCvSuggestions.value = true;
  cvSuggestionsOpen.value = true;
  try {
    cvSuggestions.value = await $fetch<CvSuggestion[]>(
      `/api/admin/applications/${props.application.id}/cv-suggestions`,
      { method: 'POST' }
    );
    emit('update', {
      ...props.application,
      cv_suggestions: cvSuggestions.value
    });
  } catch {
    toast.add({
      title: 'CV suggestions failed',
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    });
    cvSuggestionsOpen.value = false;
  } finally {
    loadingCvSuggestions.value = false;
  }
}

async function savePriority(val: string) {
  const priority = (val || null) as ApplicationPriority | null;
  try {
    const updated = await updateApplication(props.application.id, { priority });
    emit('update', updated);
  } catch {
    toast.add({
      title: 'Failed to save priority',
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    });
  }
}

async function saveJobDescription() {
  savingJobDesc.value = true;
  try {
    const updated = await updateApplication(props.application.id, {
      job_description: editJobDesc.value || null
    });
    emit('update', updated);
    editingJobDesc.value = false;
    toast.add({
      title: 'Job description saved',
      color: 'success',
      icon: 'i-lucide-check'
    });
  } catch {
    toast.add({
      title: 'Failed to save job description',
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    });
  } finally {
    savingJobDesc.value = false;
  }
}

async function handleMarkApplied() {
  const updated = await updateApplication(props.application.id, {
    status: 'applied',
    applied_at: new Date().toISOString()
  });
  editStatus.value = 'applied';
  emit('update', updated);
}

async function saveChanges() {
  saving.value = true;
  try {
    const updated = await updateApplication(props.application.id, {
      status: editStatus.value,
      notes: editNotes.value || null
    });
    emit('update', updated);
    toast.add({ title: 'Saved', color: 'success', icon: 'i-lucide-check' });
  } catch {
    toast.add({
      title: 'Save failed',
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    });
  } finally {
    saving.value = false;
  }
}

function scrollTo(el: HTMLElement | null) {
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

defineExpose({ saveChanges });
</script>

<template>
  <div class="flex flex-col gap-5 p-1">
    <!-- Header -->
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="text-base font-semibold truncate">
          {{ application.position }}
        </h3>
        <p class="text-sm text-muted truncate">
          {{ application.company }}
          <span v-if="application.location">
            &middot; {{ application.location }}</span
          >
        </p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <UBadge
          v-if="application.priority"
          :label="priorityLabel(application.priority)!"
          :color="priorityColor(application.priority)"
          variant="solid"
          size="xs"
          class="font-mono"
        />
        <UBadge
          :label="editStatus"
          :color="statusColor(editStatus)"
          variant="subtle"
          class="capitalize"
        />
      </div>
    </div>

    <!-- Quick info -->
    <div class="flex flex-wrap gap-2">
      <UBadge
        v-if="application.work_model"
        :label="
          workModelLabels[application.work_model] ?? application.work_model
        "
        color="neutral"
        variant="outline"
        size="sm"
      />
      <UBadge
        v-if="application.salary_range"
        :label="application.salary_range"
        color="neutral"
        variant="outline"
        size="sm"
        icon="i-lucide-banknote"
      />
      <UBadge
        v-if="application.match_rate != null"
        :label="`${application.match_rate}% match`"
        :color="
          application.match_rate >= 70
            ? 'success'
            : application.match_rate >= 40
              ? 'warning'
              : 'error'
        "
        variant="subtle"
        size="sm"
        icon="i-lucide-target"
      />
      <UButton
        v-if="application.url"
        :to="application.url"
        target="_blank"
        size="xs"
        variant="link"
        icon="i-lucide-external-link"
        label="Job posting"
      />
    </div>

    <!-- Preparation Checklist (only for saved applications) -->
    <AdminApplicationChecklist
      v-if="application.status === 'saved'"
      :application="application"
      :cover-letter-count="coverLetterCount"
      :cv-suggestions-loaded="cvSuggestionsOpen && !loadingCvSuggestions"
      @go-to-analyze="
        scrollTo(analyzeRef);
        emit('analyze');
      "
      @go-to-priority="scrollTo(priorityRef)"
      @go-to-cv-suggestions="
        scrollTo(cvSugRef);
        if (!cvSuggestionsOpen) fetchCvSuggestions();
      "
      @go-to-cover-letter="scrollTo(coverLetterRef)"
      @mark-applied="handleMarkApplied"
    />

    <!-- Match Rate Display -->
    <div ref="analyzeRef">
      <div v-if="application.match_rate != null && application.match_breakdown">
        <AdminMatchRateDisplay
          :rate="application.match_rate"
          :breakdown="application.match_breakdown"
        />

        <!-- Dimension gap scorecard -->
        <div v-if="dimensionScores.length" class="mt-3 space-y-1">
          <p class="text-xs text-muted uppercase tracking-wide mb-2">
            Score breakdown
          </p>
          <div
            v-for="dim in dimensionScores"
            :key="dim.label"
            class="flex items-center gap-2 text-xs"
          >
            <span class="w-20 shrink-0 text-muted">{{ dim.label }}</span>
            <div class="flex-1 h-1.5 rounded-full bg-elevated overflow-hidden">
              <div
                class="h-full rounded-full transition-all"
                :class="
                  dim.score >= 70
                    ? 'bg-success'
                    : dim.score >= 40
                      ? 'bg-warning'
                      : 'bg-error'
                "
                :style="{ width: `${dim.score}%` }"
              />
            </div>
            <span
              class="w-8 text-right font-mono"
              :class="
                dim.score >= 70
                  ? 'text-success'
                  : dim.score >= 40
                    ? 'text-warning'
                    : 'text-error'
              "
              >{{ dim.score }}</span
            >
          </div>
        </div>

        <!-- Top gaps hint -->
        <div v-if="topGaps.length" class="mt-3 flex flex-wrap gap-1.5">
          <span class="text-xs text-muted mr-1">Gaps:</span>
          <UBadge
            v-for="gap in topGaps"
            :key="gap"
            :label="gap"
            color="error"
            variant="subtle"
            size="xs"
          />
        </div>

        <!-- CV Suggestions trigger -->
        <div ref="cvSugRef" class="mt-3">
          <UButton
            icon="i-lucide-file-pen"
            :label="
              cvSuggestionsOpen
                ? 'Refresh CV suggestions'
                : 'Improve CV for this role'
            "
            variant="ghost"
            size="xs"
            color="neutral"
            :loading="loadingCvSuggestions"
            @click="fetchCvSuggestions"
          />
        </div>

        <!-- CV Suggestions panel -->
        <div v-if="cvSuggestionsOpen" class="mt-3">
          <p class="text-xs text-muted uppercase tracking-wide mb-2">
            CV Improvement Suggestions
          </p>
          <AdminCvSuggestionsPanel
            :application-id="application.id"
            :suggestions="cvSuggestions"
            :loading="loadingCvSuggestions"
            @regenerate="fetchCvSuggestions"
          />
        </div>
      </div>
      <div v-else>
        <UButton
          icon="i-lucide-sparkles"
          label="Analyze match"
          variant="soft"
          size="sm"
          @click="emit('analyze')"
        />
      </div>
    </div>

    <USeparator />

    <!-- Priority selector -->
    <div ref="priorityRef">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-muted uppercase tracking-wide">Priority tier</p>
        <button
          v-if="editPriority"
          class="text-xs text-muted hover:text-foreground"
          @click="editPriority = ''"
        >
          Clear
        </button>
      </div>
      <USelect
        v-model="editPriority"
        :items="priorityOptions"
        value-key="value"
        placeholder="Not set"
        class="w-full"
      />
      <p class="text-xs text-muted mt-1">
        P0 = dream role &middot; P1 = strong fit &middot; P2 = backup
      </p>
    </div>

    <USeparator />

    <!-- Job description -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-muted uppercase tracking-wide">
          Job description
        </p>
        <button
          class="text-xs text-primary hover:underline"
          @click="
            editingJobDesc = !editingJobDesc;
            editJobDesc = application.job_description ?? '';
          "
        >
          {{
            editingJobDesc
              ? 'Cancel'
              : application.job_description
                ? 'Edit'
                : 'Add'
          }}
        </button>
      </div>

      <!-- Edit mode -->
      <div v-if="editingJobDesc" class="space-y-2">
        <UTextarea
          v-model="editJobDesc"
          placeholder="Paste the full job description here..."
          :rows="10"
          class="w-full text-sm"
          autoresize
        />
        <UButton
          label="Save"
          size="xs"
          :loading="savingJobDesc"
          @click="saveJobDescription"
        />
      </div>

      <!-- Read mode -->
      <div v-else-if="application.job_description" class="relative">
        <p
          class="text-sm whitespace-pre-wrap"
          :class="!jobDescExpanded && 'line-clamp-6'"
        >
          {{ application.job_description }}
        </p>
        <button
          v-if="application.job_description.length > 300"
          class="text-xs text-primary hover:underline mt-1"
          @click="jobDescExpanded = !jobDescExpanded"
        >
          {{ jobDescExpanded ? 'Show less' : 'Show more' }}
        </button>
      </div>

      <!-- Empty state -->
      <p v-else class="text-sm text-muted italic">
        No job description added. Add one to enable match analysis and cover
        letter generation.
      </p>
    </div>

    <USeparator />

    <!-- Tailored Resume -->
    <AdminTailoredResumePanel
      :application-id="application.id"
      :company="application.company"
    />

    <USeparator />

    <!-- Cover Letters -->
    <div ref="coverLetterRef">
      <AdminCoverLetterPanel
        :application-id="application.id"
        @letter-count="(n: number) => (coverLetterCount = n)"
      />
    </div>

    <USeparator />

    <!-- Dates -->
    <div
      v-if="
        application.applied_at ||
        application.interviewed_at ||
        application.decided_at
      "
    >
      <p class="text-xs text-muted mb-2 uppercase tracking-wide">Timeline</p>
      <div class="space-y-1 text-sm">
        <p v-if="application.applied_at">
          <span class="text-muted">Applied:</span>
          {{ formatDate(application.applied_at) }}
        </p>
        <p v-if="application.interviewed_at">
          <span class="text-muted">Interviewed:</span>
          {{ formatDate(application.interviewed_at) }}
        </p>
        <p v-if="application.decided_at">
          <span class="text-muted">Decided:</span>
          {{ formatDate(application.decided_at) }}
        </p>
      </div>
    </div>

    <USeparator
      v-if="
        application.applied_at ||
        application.interviewed_at ||
        application.decided_at
      "
    />

    <!-- Related contacts -->
    <div v-if="application.contact_email">
      <p class="text-xs text-muted mb-2 uppercase tracking-wide">
        Contact
        <span v-if="relatedContacts.length > 0" class="text-primary"
          >({{ relatedContacts.length }})</span
        >
      </p>
      <p class="text-sm text-primary mb-2">{{ application.contact_email }}</p>
      <div
        v-if="loadingContacts"
        class="flex items-center gap-2 text-xs text-muted py-1"
      >
        <UIcon name="i-lucide-loader" class="size-3 animate-spin" />
        Loading...
      </div>
      <div v-else-if="relatedContacts.length > 0" class="space-y-1">
        <div
          v-for="contact in relatedContacts"
          :key="contact.id"
          class="flex items-center gap-2 text-xs rounded-md p-2 bg-elevated/50"
        >
          <span class="font-medium">{{ contact.name }}</span>
          <UBadge
            :label="contact.status"
            :color="contact.status === 'responded' ? 'success' : 'neutral'"
            variant="subtle"
            size="xs"
            class="capitalize"
          />
        </div>
      </div>

      <!-- Related inbox messages -->
      <p class="text-xs text-muted mb-2 mt-3 uppercase tracking-wide">
        Inbox history
        <span v-if="relatedEmails.length > 0" class="text-primary"
          >({{ relatedEmails.length }})</span
        >
      </p>
      <div
        v-if="loadingEmails"
        class="flex items-center gap-2 text-xs text-muted py-1"
      >
        <UIcon name="i-lucide-loader" class="size-3 animate-spin" />
        Loading...
      </div>
      <div
        v-else-if="relatedEmails.length === 0"
        class="text-xs text-muted py-1"
      >
        No inbox messages.
      </div>
      <ul v-else class="space-y-1.5 max-h-48 overflow-y-auto">
        <li
          v-for="msg in relatedEmails"
          :key="msg.id"
          class="flex items-start gap-2 rounded-md p-2 bg-elevated/50 text-xs"
        >
          <UIcon
            :name="
              msg.folder === '[Gmail]/Sent Mail'
                ? 'i-lucide-arrow-up-right'
                : 'i-lucide-arrow-down-left'
            "
            class="size-3.5 shrink-0 mt-0.5"
            :class="
              msg.folder === '[Gmail]/Sent Mail'
                ? 'text-success'
                : 'text-primary'
            "
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-1">
              <span class="font-medium truncate">{{
                msg.subject || '(no subject)'
              }}</span>
              <span class="text-muted shrink-0">{{
                formatInboxDate(msg.received_at)
              }}</span>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <USeparator v-if="application.contact_email" />

    <!-- Status -->
    <div>
      <p class="text-xs text-muted mb-2 uppercase tracking-wide">Status</p>
      <USelect
        v-model="editStatus"
        :items="statusOptions"
        value-key="value"
        class="w-full"
      />
    </div>

    <!-- Notes -->
    <div>
      <p class="text-xs text-muted mb-2 uppercase tracking-wide">Notes</p>
      <UTextarea
        v-model="editNotes"
        placeholder="Private notes about this application..."
        :rows="4"
        autoresize
        class="w-full"
      />
    </div>

    <USeparator />

    <!-- Send Application -->
    <AdminApplicationSendPanel
      :application="application"
      @sent="emit('update', { ...application, status: 'applied' })"
    />
  </div>
</template>
