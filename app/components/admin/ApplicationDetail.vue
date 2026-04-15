<script setup lang="ts">
import type { JobApplication, ApplicationStatus } from '~/types/applications';

type BadgeColor = 'primary' | 'neutral' | 'success' | 'warning' | 'error' | 'info';

type InboxMessage = {
  id: string
  uid: number
  subject: string
  from_name: string
  from_email: string
  body_text: string
  received_at: string
  unread: boolean
  folder: string
}

type LinkedContact = {
  id: number
  name: string
  email: string
  status: string
  created_at: string
}

const props = defineProps<{
  application: JobApplication
}>();

const emit = defineEmits<{
  update: [app: JobApplication]
  delete: []
  analyze: []
}>();

const toast = useToast();
const { updateApplication } = useApplications();
const { formatInboxDate, formatDate } = useDateFormatting();

const saving = ref(false);
const jobDescExpanded = ref(false);
const editStatus = ref<ApplicationStatus>(props.application.status);
const editNotes = ref(props.application.notes ?? '');

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

const workModelLabels: Record<string, string> = {
  onsite: 'On-site',
  hybrid: 'Hybrid',
  remote: 'Remote'
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

watch(() => props.application, (app) => {
  editStatus.value = app.status;
  editNotes.value = app.notes ?? '';
  fetchRelated();
}, { immediate: true });

function fetchRelated() {
  if (!props.application.contact_email) {
    relatedContacts.value = [];
    relatedEmails.value = [];
    return;
  }
  loadingContacts.value = true;
  loadingEmails.value = true;

  $fetch<LinkedContact[]>('/api/admin/contacts/by-email', { params: { email: props.application.contact_email } })
    .then(data => { relatedContacts.value = data; })
    .catch(() => { relatedContacts.value = []; })
    .finally(() => { loadingContacts.value = false; });

  $fetch<InboxMessage[]>('/api/admin/inbox/by-email', { params: { email: props.application.contact_email } })
    .then(data => { relatedEmails.value = data; })
    .catch(() => { relatedEmails.value = []; })
    .finally(() => { loadingEmails.value = false; });
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
    toast.add({ title: 'Save failed', color: 'error', icon: 'i-lucide-triangle-alert' });
  } finally {
    saving.value = false;
  }
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
          <span v-if="application.location"> &middot; {{ application.location }}</span>
        </p>
      </div>
      <UBadge
        :label="editStatus"
        :color="statusColor(editStatus)"
        variant="subtle"
        class="capitalize shrink-0"
      />
    </div>

    <!-- Quick info -->
    <div class="flex flex-wrap gap-2">
      <UBadge v-if="application.work_model" :label="workModelLabels[application.work_model] ?? application.work_model" color="neutral" variant="outline" size="sm" />
      <UBadge v-if="application.salary_range" :label="application.salary_range" color="neutral" variant="outline" size="sm" icon="i-lucide-banknote" />
      <UBadge v-if="application.match_rate != null" :label="`${application.match_rate}% match`" :color="application.match_rate >= 70 ? 'success' : application.match_rate >= 40 ? 'warning' : 'error'" variant="subtle" size="sm" icon="i-lucide-target" />
      <UButton v-if="application.url" :to="application.url" target="_blank" size="xs" variant="link" icon="i-lucide-external-link" label="Job posting" />
    </div>

    <!-- Match Rate Display -->
    <div v-if="application.match_rate != null && application.match_breakdown">
      <AdminMatchRateDisplay :rate="application.match_rate" :breakdown="application.match_breakdown" />
    </div>
    <div v-else-if="application.job_description">
      <UButton
        icon="i-lucide-sparkles"
        label="Analyze match"
        variant="soft"
        size="sm"
        @click="emit('analyze')"
      />
    </div>

    <USeparator />

    <!-- Job description -->
    <div v-if="application.job_description">
      <p class="text-xs text-muted mb-2 uppercase tracking-wide">Job description</p>
      <div class="relative">
        <p
          class="text-sm whitespace-pre-wrap"
          :class="!jobDescExpanded && 'line-clamp-6'"
        >
          {{ application.job_description }}
        </p>
        <button
          class="text-xs text-primary hover:underline mt-1"
          @click="jobDescExpanded = !jobDescExpanded"
        >
          {{ jobDescExpanded ? 'Show less' : 'Show more' }}
        </button>
      </div>
    </div>

    <USeparator v-if="application.job_description" />

    <!-- Cover Letters -->
    <AdminCoverLetterPanel :application-id="application.id" />

    <USeparator />

    <!-- Dates -->
    <div v-if="application.applied_at || application.interviewed_at || application.decided_at">
      <p class="text-xs text-muted mb-2 uppercase tracking-wide">Timeline</p>
      <div class="space-y-1 text-sm">
        <p v-if="application.applied_at">
          <span class="text-muted">Applied:</span> {{ formatDate(application.applied_at) }}
        </p>
        <p v-if="application.interviewed_at">
          <span class="text-muted">Interviewed:</span> {{ formatDate(application.interviewed_at) }}
        </p>
        <p v-if="application.decided_at">
          <span class="text-muted">Decided:</span> {{ formatDate(application.decided_at) }}
        </p>
      </div>
    </div>

    <USeparator v-if="application.applied_at || application.interviewed_at || application.decided_at" />

    <!-- Related contacts -->
    <div v-if="application.contact_email">
      <p class="text-xs text-muted mb-2 uppercase tracking-wide">
        Contact
        <span v-if="relatedContacts.length > 0" class="text-primary">({{ relatedContacts.length }})</span>
      </p>
      <p class="text-sm text-primary mb-2">{{ application.contact_email }}</p>
      <div v-if="loadingContacts" class="flex items-center gap-2 text-xs text-muted py-1">
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
          <UBadge :label="contact.status" :color="contact.status === 'responded' ? 'success' : 'neutral'" variant="subtle" size="xs" class="capitalize" />
        </div>
      </div>

      <!-- Related inbox messages -->
      <p class="text-xs text-muted mb-2 mt-3 uppercase tracking-wide">
        Inbox history
        <span v-if="relatedEmails.length > 0" class="text-primary">({{ relatedEmails.length }})</span>
      </p>
      <div v-if="loadingEmails" class="flex items-center gap-2 text-xs text-muted py-1">
        <UIcon name="i-lucide-loader" class="size-3 animate-spin" />
        Loading...
      </div>
      <div v-else-if="relatedEmails.length === 0" class="text-xs text-muted py-1">
        No inbox messages.
      </div>
      <ul v-else class="space-y-1.5 max-h-48 overflow-y-auto">
        <li
          v-for="msg in relatedEmails"
          :key="msg.id"
          class="flex items-start gap-2 rounded-md p-2 bg-elevated/50 text-xs"
        >
          <UIcon
            :name="msg.folder === '[Gmail]/Sent Mail' ? 'i-lucide-arrow-up-right' : 'i-lucide-arrow-down-left'"
            class="size-3.5 shrink-0 mt-0.5"
            :class="msg.folder === '[Gmail]/Sent Mail' ? 'text-success' : 'text-primary'"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-1">
              <span class="font-medium truncate">{{ msg.subject || '(no subject)' }}</span>
              <span class="text-muted shrink-0">{{ formatInboxDate(msg.received_at) }}</span>
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
  </div>
</template>
