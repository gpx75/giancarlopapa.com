<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

definePageMeta({ layout: 'admin' });
useSeoMeta({ title: 'Admin — Contacts', robots: 'noindex, nofollow' });

type Lead = {
  id: number
  name: string
  email: string
  message: string
  status: 'new' | 'read' | 'responded' | 'archived'
  notes: string | null
  created_at: string
}

const statusOptions = [
  { label: 'New', value: 'new' },
  { label: 'Read', value: 'read' },
  { label: 'Responded', value: 'responded' },
  { label: 'Archived', value: 'archived' }
];

type BadgeColor = 'primary' | 'neutral' | 'success' | 'warning';

const statusColor = (status: string): BadgeColor => (({
  new: 'primary',
  read: 'neutral',
  responded: 'success',
  archived: 'warning'
} as Record<string, BadgeColor>)[status] ?? 'neutral');

type InboxMessage = {
  id: string
  uid: number
  subject: string
  from_name: string
  from_email: string
  body_text: string
  received_at: string
  unread: boolean
  starred: boolean
  folder: string
}

const toast = useToast();
const { formatInboxDate } = useDateFormatting();
const filter = ref<string>('all');
const selected = ref<Lead | null>(null);
const isOpen = ref(false);
const saving = ref(false);
const deleting = ref(false);
const confirmDeleteOpen = ref(false);
const editNotes = ref('');
const editStatus = ref('');
const replyText = ref('');
const replying = ref(false);
const relatedEmails = ref<InboxMessage[]>([]);
const loadingEmails = ref(false);

const { data: leads, refresh } = await useFetch<Lead[]>('/api/admin/contacts');

const filtered = computed(() => {
  if (!leads.value) return [];
  if (filter.value === 'all') return leads.value;
  return leads.value.filter(l => l.status === filter.value);
});

const filterTabs = [
  { label: 'All', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Responded', value: 'responded' },
  { label: 'Archived', value: 'archived' }
];

const columns: TableColumn<Lead>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => row.original.status
  },
  {
    accessorKey: 'created_at',
    header: 'Date',
    cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString('en-CH', {
      day: '2-digit', month: 'short', year: 'numeric'
    })
  }
];

async function openLead(lead: Lead) {
  selected.value = lead;
  editNotes.value = lead.notes ?? '';
  editStatus.value = lead.status;
  replyText.value = '';
  relatedEmails.value = [];
  isOpen.value = true;

  // Fetch related inbox messages in background
  loadingEmails.value = true;
  $fetch<InboxMessage[]>('/api/admin/inbox/by-email', { params: { email: lead.email } })
    .then(data => { relatedEmails.value = data; })
    .catch(() => { /* silently ignore */ })
    .finally(() => { loadingEmails.value = false; });

  if (lead.status === 'new') {
    await updateLead(lead.id, { status: 'read' });
    lead.status = 'read';
    editStatus.value = 'read';
  }
}

async function updateLead(id: number, payload: Partial<Pick<Lead, 'status' | 'notes'>>) {
  saving.value = true;
  try {
    await $fetch(`/api/admin/contacts/${id}`, { method: 'PATCH', body: payload });
    await refresh();
  } finally {
    saving.value = false;
  }
}

async function saveChanges() {
  if (!selected.value) return;
  await updateLead(selected.value.id, {
    status: editStatus.value as Lead['status'],
    notes: editNotes.value || null
  });
  if (selected.value) {
    selected.value.status = editStatus.value as Lead['status'];
    selected.value.notes = editNotes.value || null;
  }
}

async function sendReply() {
  if (!selected.value || !replyText.value.trim()) return;
  replying.value = true;
  try {
    await $fetch(`/api/admin/contacts/${selected.value.id}/reply`, {
      method: 'POST',
      body: { message: replyText.value }
    });
    toast.add({ title: 'Reply sent', description: `Email sent to ${selected.value.name}`, color: 'success', icon: 'i-lucide-check-circle' });
    replyText.value = '';
    editStatus.value = 'responded';
    if (selected.value) selected.value.status = 'responded';
    await refresh();
  } catch {
    toast.add({ title: 'Reply failed', description: 'Could not send email. Please try again.', color: 'error', icon: 'i-lucide-triangle-alert' });
  } finally {
    replying.value = false;
  }
}

async function deleteLead() {
  if (!selected.value) return;
  deleting.value = true;
  try {
    await $fetch(`/api/admin/contacts/${selected.value.id}`, { method: 'DELETE' });
    isOpen.value = false;
    selected.value = null;
    await refresh();
  } finally {
    deleting.value = false;
    confirmDeleteOpen.value = false;
  }
}
</script>

<template>
  <UDashboardPanel id="admin-contacts">
    <template #header>
      <UDashboardNavbar title="Contacts" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
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
          :loading="!leads"
          class="w-full"
          @select="(_e: Event, row: { original: Lead }) => openLead(row.original)"
        >
          <template #status-cell="{ row }">
            <UBadge
              :label="row.original.status"
              :color="statusColor(row.original.status)"
              variant="subtle"
              class="capitalize"
            />
          </template>
        </UTable>

        <p v-if="filtered.length === 0 && leads" class="text-sm text-muted text-center py-8">
          No leads found.
        </p>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Lead detail slideover -->
  <USlideover v-model:open="isOpen" :title="selected?.name ?? ''" side="right">
    <template #body>
      <div v-if="selected" class="flex flex-col gap-5 p-1">
        <!-- Meta -->
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium">{{ selected.name }}</p>
            <a :href="`mailto:${selected.email}`" class="text-sm text-primary hover:underline">
              {{ selected.email }}
            </a>
          </div>
          <UBadge
            :label="editStatus"
            :color="statusColor(editStatus)"
            variant="subtle"
            class="capitalize"
          />
        </div>

        <USeparator />

        <!-- Message -->
        <div>
          <p class="text-xs text-muted mb-2 uppercase tracking-wide">Message</p>
          <p class="text-sm whitespace-pre-wrap">{{ selected.message }}</p>
        </div>

        <USeparator />

        <!-- Related inbox messages -->
        <div>
          <p class="text-xs text-muted mb-2 uppercase tracking-wide">
            Inbox history
            <span v-if="relatedEmails.length > 0" class="text-primary">({{ relatedEmails.length }})</span>
          </p>

          <div v-if="loadingEmails" class="flex items-center gap-2 text-xs text-muted py-2">
            <UIcon name="i-lucide-loader" class="size-3 animate-spin" />
            Loading...
          </div>

          <div v-else-if="relatedEmails.length === 0" class="text-xs text-muted py-2">
            No inbox messages from this contact.
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
                  <span class="font-medium truncate" :class="msg.unread ? 'font-semibold' : ''">
                    {{ msg.subject || '(no subject)' }}
                  </span>
                  <span class="text-muted shrink-0">{{ formatInboxDate(msg.received_at) }}</span>
                </div>
                <p class="text-muted truncate">{{ msg.body_text?.slice(0, 100) }}</p>
              </div>
              <UBadge v-if="msg.folder === '[Gmail]/Sent Mail'" label="Sent" color="neutral" variant="subtle" size="xs" />
            </li>
          </ul>

          <NuxtLink
            v-if="relatedEmails.length > 0"
            to="/admin/inbox"
            class="text-xs text-primary hover:underline mt-2 inline-block"
          >
            View in inbox →
          </NuxtLink>
        </div>

        <USeparator />

        <!-- Status -->
        <div>
          <p class="text-xs text-muted mb-2 uppercase tracking-wide">Status</p>
          <USelect
            v-model="editStatus"
            :items="statusOptions"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </div>

        <!-- Reply -->
        <div>
          <p class="text-xs text-muted mb-2 uppercase tracking-wide">Reply</p>
          <UTextarea
            v-model="replyText"
            :placeholder="`Reply to ${selected.name}...`"
            :rows="4"
            autoresize
            class="w-full"
            :disabled="replying"
          />
        </div>

        <USeparator />

        <!-- Notes -->
        <div>
          <p class="text-xs text-muted mb-2 uppercase tracking-wide">Notes</p>
          <UTextarea
            v-model="editNotes"
            placeholder="Add private notes about this lead..."
            :rows="4"
            class="w-full"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2 w-full">
        <UButton
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          square
          @click="confirmDeleteOpen = true"
        />
        <UButton
          icon="i-lucide-send"
          label="Send reply"
          color="neutral"
          variant="outline"
          class="flex-1"
          :loading="replying"
          :disabled="!replyText.trim()"
          @click="sendReply"
        />
        <UButton
          label="Save"
          icon="i-lucide-check"
          :loading="saving"
          class="flex-1"
          @click="saveChanges"
        />
      </div>
    </template>
  </USlideover>

  <!-- Delete confirm -->
  <UModal v-model:open="confirmDeleteOpen" title="Delete contact?">
    <template #body>
      <p class="text-sm">
        This will permanently delete <strong>{{ selected?.name }}</strong> and their message. This cannot be undone.
      </p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" label="Cancel" :disabled="deleting" @click="confirmDeleteOpen = false" />
        <UButton color="error" icon="i-lucide-trash-2" label="Delete" :loading="deleting" @click="deleteLead" />
      </div>
    </template>
  </UModal>
</template>
