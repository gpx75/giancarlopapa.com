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

const statusColor = (status: string) => ({
  new: 'primary',
  read: 'neutral',
  responded: 'success',
  archived: 'warning'
}[status] ?? 'neutral');

const filter = ref<string>('all');
const selected = ref<Lead | null>(null);
const isOpen = ref(false);
const saving = ref(false);
const editNotes = ref('');
const editStatus = ref('');

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
  isOpen.value = true;

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
</script>

<template>
  <UDashboardPanel id="admin-contacts">
    <template #header>
      <UDashboardNavbar title="Contacts" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UColorModeButton />
          <UTooltip text="Go to site">
            <UButton color="neutral" variant="ghost" icon="i-lucide-external-link" square to="/" />
          </UTooltip>
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
          @select="openLead($event as Lead)"
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
          :href="`mailto:${selected?.email}`"
          icon="i-lucide-reply"
          label="Reply"
          color="neutral"
          variant="outline"
          external
          class="flex-1"
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
</template>
