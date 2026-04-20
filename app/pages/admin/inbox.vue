<script setup lang="ts">
definePageMeta({ layout: 'admin' });
useSeoMeta({ title: 'Admin — Inbox', robots: 'noindex, nofollow' });

type Mail = {
  id: string
  uid: number
  subject: string
  from_name: string
  from_email: string
  body_text: string
  body_html: string
  received_at: string
  unread: boolean
  starred: boolean
  archived: boolean
  folder: string
}

type OutboxEntry = {
  id: string
  application_id: string
  sent_at: string
  to_email: string
  subject: string
  resend_message_id: string | null
  attachments: unknown[] | null
  job_applications: { company: string; position: string } | null
}

const tab = ref<'all' | 'unread' | 'sent'>('all');
const selected = ref<Mail | null>(null);
const selectedSent = ref<OutboxEntry | null>(null);
const isSlideoverOpen = ref(false);
const isSentSlideoverOpen = ref(false);
const syncing = ref(false);
const syncResult = ref<string | null>(null);
const purging = ref(false);
const confirmPurgeOpen = ref(false);

const { formatInboxDate, formatDateTime } = useDateFormatting();
const toast = useToast();

const { data: fetchedMails, refresh: _refresh } = await useFetch<Mail[]>('/api/admin/inbox');
const mails = ref<Mail[]>(fetchedMails.value ?? []);

const { data: fetchedOutbox, refresh: _refreshOutbox } = await useFetch<OutboxEntry[]>('/api/admin/outbox');
const outboxEntries = ref<OutboxEntry[]>(fetchedOutbox.value ?? []);

async function refresh() {
  await _refresh();
  mails.value = fetchedMails.value ?? [];
}

async function refreshOutbox() {
  await _refreshOutbox();
  outboxEntries.value = fetchedOutbox.value ?? [];
}

const filtered = computed(() => {
  return tab.value === 'unread'
    ? mails.value.filter(m => m.unread)
    : mails.value;
});

const unreadCount = computed(() => mails.value.filter(m => m.unread).length);

const tabs = computed(() => [
  { label: 'All', value: 'all', badge: tab.value === 'all' && mails.value.length > 0 ? String(mails.value.length) : undefined },
  { label: 'Unread', value: 'unread', badge: unreadCount.value > 0 ? String(unreadCount.value) : undefined },
  { label: 'Sent', value: 'sent', badge: tab.value === 'sent' && outboxEntries.value.length > 0 ? String(outboxEntries.value.length) : undefined }
]);

async function selectMail(mail: Mail) {
  selected.value = mail;
  if (import.meta.client && window.innerWidth < 1024) {
    isSlideoverOpen.value = true;
  }
  if (mail.unread) {
    await updateMail(mail.uid, { unread: false });
  }
}

async function updateMail(uid: number, payload: Partial<Pick<Mail, 'unread' | 'starred' | 'archived'>>) {
  await $fetch(`/api/admin/inbox/${uid}`, {
    method: 'PATCH',
    body: payload
  });
  await Promise.all([refresh(), refreshNuxtData('admin-stats')]);
}

async function archiveMail(mail: Mail) {
  await updateMail(mail.uid, { archived: true });
  if (selected.value?.id === mail.id) {
    selected.value = null;
    isSlideoverOpen.value = false;
  }
}

async function toggleStar(mail: Mail) {
  await updateMail(mail.uid, { starred: !mail.starred });
  if (selected.value?.id === mail.id) {
    selected.value = mails.value.find(m => m.id === mail.id) ?? selected.value;
  }
}

async function markUnread(mail: Mail) {
  await updateMail(mail.uid, { unread: true });
  selected.value = null;
  isSlideoverOpen.value = false;
}

async function purgeInbox() {
  purging.value = true;
  try {
    const result = await $fetch<{ purged: number }>('/api/admin/inbox/purge', { method: 'POST' });
    const label = `Purged ${result.purged} message${result.purged === 1 ? '' : 's'}`;
    toast.add({ title: 'Inbox purged', description: label, color: 'success', icon: 'i-lucide-trash-2' });
    selected.value = null;
    isSlideoverOpen.value = false;
    await Promise.all([refresh(), refreshNuxtData('admin-stats')]);
  } catch (err: unknown) {
    const reason = (err as { data?: { message?: string }; statusMessage?: string })?.data?.message
      ?? (err as { statusMessage?: string })?.statusMessage
      ?? 'Purge failed';
    toast.add({ title: 'Inbox purge failed', description: reason, color: 'error', icon: 'i-lucide-triangle-alert' });
  } finally {
    purging.value = false;
    confirmPurgeOpen.value = false;
  }
}

async function syncInbox() {
  syncing.value = true;
  syncResult.value = null;
  try {
    const result = await $fetch<{ synced: number }>('/api/admin/inbox/sync', { method: 'POST' });
    const label = `Synced ${result.synced} message${result.synced === 1 ? '' : 's'}`;
    syncResult.value = label;
    toast.add({ title: 'Inbox synced', description: label, color: 'success', icon: 'i-lucide-check-circle' });
    await refresh();
  } catch (err: unknown) {
    const reason = (err as { data?: { message?: string }; statusMessage?: string })?.data?.message
      ?? (err as { statusMessage?: string })?.statusMessage
      ?? 'Sync failed';
    syncResult.value = reason;
    toast.add({ title: 'Inbox sync failed', description: reason, color: 'error', icon: 'i-lucide-triangle-alert' });
  } finally {
    syncing.value = false;
    setTimeout(() => { syncResult.value = null; }, 4000);
  }
}

const dropdownItems = (mail: Mail) => [[
  {
    label: mail.unread ? 'Mark as read' : 'Mark as unread',
    icon: mail.unread ? 'i-lucide-mail-open' : 'i-lucide-mail',
    onSelect: () => mail.unread ? updateMail(mail.uid, { unread: false }) : markUnread(mail)
  },
  {
    label: mail.starred ? 'Unstar' : 'Star',
    icon: 'i-lucide-star',
    onSelect: () => toggleStar(mail)
  }
], [
  {
    label: 'Archive',
    icon: 'i-lucide-archive',
    onSelect: () => archiveMail(mail)
  }
]];
</script>

<template>
  <UDashboardPanel id="inbox-list" :default-size="35" :min-size="25" :max-size="50" resizable>
    <template #header>
      <UDashboardNavbar title="Inbox" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <template v-if="tab !== 'sent'">
            <UTooltip text="Purge inbox (delete all)">
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                square
                :loading="purging"
                :disabled="syncing"
                @click="confirmPurgeOpen = true"
              />
            </UTooltip>
            <UTooltip :text="syncResult ?? 'Sync inbox'">
              <UButton
                :icon="syncing ? 'i-lucide-loader' : 'i-lucide-refresh-cw'"
                :class="syncing ? 'animate-spin' : ''"
                color="neutral"
                variant="ghost"
                square
                :loading="syncing"
                :disabled="purging"
                @click="syncInbox"
              />
            </UTooltip>
          </template>
          <template v-else>
            <UTooltip text="Refresh sent">
              <UButton
                icon="i-lucide-refresh-cw"
                color="neutral"
                variant="ghost"
                square
                @click="refreshOutbox"
              />
            </UTooltip>
          </template>
        </template>
      </UDashboardNavbar>

      <div class="border-b border-default px-4 pb-3 pt-2">
        <UTabs
          v-model="tab"
          :items="tabs"
          size="sm"
          variant="link"
          :ui="{ list: 'gap-4' }"
        />
      </div>
    </template>

    <template #body>
      <!-- Inbox list (All / Unread tabs) -->
      <template v-if="tab !== 'sent'">
        <div v-if="filtered.length === 0" class="flex flex-col items-center justify-center h-full gap-3 text-muted">
          <UIcon name="i-lucide-inbox" class="size-12 opacity-30" />
          <p class="text-sm">{{ tab === 'unread' ? 'No unread messages' : 'Inbox is empty' }}</p>
          <UButton size="sm" variant="ghost" color="neutral" icon="i-lucide-refresh-cw" label="Sync now" :loading="syncing" @click="syncInbox" />
        </div>

        <ul v-else class="divide-y divide-default">
          <li
            v-for="mail in filtered"
            :key="mail.id"
            class="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors"
            :class="selected?.id === mail.id ? 'bg-elevated border-l-2 border-primary' : 'hover:bg-elevated/50 border-l-2 border-transparent'"
            @click="selectMail(mail)"
          >
            <UAvatar
              :alt="mail.from_name || mail.from_email"
              size="sm"
              class="shrink-0 mt-0.5"
            />
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <span class="text-sm truncate" :class="mail.unread ? 'font-semibold' : 'font-medium'">
                  {{ mail.from_name || mail.from_email }}
                </span>
                <span class="text-xs text-muted shrink-0">{{ formatInboxDate(mail.received_at) }}</span>
              </div>
              <p class="text-sm truncate" :class="mail.unread ? 'font-medium' : 'text-muted'">
                <UBadge v-if="mail.folder === '[Gmail]/Sent Mail'" label="Sent" color="neutral" variant="subtle" size="xs" class="mr-1" />{{ mail.subject }}
              </p>
              <p class="text-xs text-muted truncate">
                {{ mail.body_text?.slice(0, 80) }}
              </p>
            </div>
            <div class="flex flex-col items-center gap-1 shrink-0">
              <span v-if="mail.unread" class="size-2 rounded-full bg-primary mt-1" />
              <UIcon v-if="mail.starred" name="i-lucide-star" class="size-3 text-warning-400 fill-warning-400" />
            </div>
          </li>
        </ul>
      </template>

      <!-- Sent / Outbox list -->
      <template v-else>
        <div v-if="outboxEntries.length === 0" class="flex flex-col items-center justify-center h-full gap-3 text-muted">
          <UIcon name="i-lucide-send" class="size-12 opacity-30" />
          <p class="text-sm">No sent messages</p>
        </div>

        <ul v-else class="divide-y divide-default">
          <li
            v-for="entry in outboxEntries"
            :key="entry.id"
            class="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors"
            :class="selectedSent?.id === entry.id ? 'bg-elevated border-l-2 border-primary' : 'hover:bg-elevated/50 border-l-2 border-transparent'"
            @click="selectedSent = entry; isSentSlideoverOpen = true"
          >
            <UIcon name="i-lucide-send" class="size-4 shrink-0 mt-1 text-muted" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <span class="text-sm font-medium truncate">
                  {{ entry.job_applications?.company ?? '—' }}
                </span>
                <span class="text-xs text-muted shrink-0">{{ formatInboxDate(entry.sent_at) }}</span>
              </div>
              <p class="text-sm text-muted truncate">{{ entry.job_applications?.position ?? '' }}</p>
              <p class="text-xs text-muted truncate">{{ entry.subject }}</p>
            </div>
          </li>
        </ul>
      </template>
    </template>
  </UDashboardPanel>

  <!-- Desktop: detail panel (inbox) -->
  <UDashboardPanel v-if="tab !== 'sent'" id="inbox-detail" class="hidden lg:flex">
    <template v-if="selected" #header>
      <UDashboardNavbar :title="selected.subject" :ui="{ title: 'text-sm font-medium truncate', right: 'gap-1' }">
        <template #right>
          <UTooltip text="Mark as unread">
            <UButton color="neutral" variant="ghost" icon="i-lucide-mail" square @click="markUnread(selected)" />
          </UTooltip>
          <UTooltip :text="selected.starred ? 'Unstar' : 'Star'">
            <UButton
              color="neutral"
              variant="ghost"
              :icon="selected.starred ? 'i-lucide-star-off' : 'i-lucide-star'"
              square
              @click="toggleStar(selected)"
            />
          </UTooltip>
          <UTooltip text="Archive">
            <UButton color="neutral" variant="ghost" icon="i-lucide-archive" square @click="archiveMail(selected)" />
          </UTooltip>
          <UDropdownMenu :items="dropdownItems(selected)">
            <UButton color="neutral" variant="ghost" icon="i-lucide-ellipsis-vertical" square />
          </UDropdownMenu>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="!selected" class="flex flex-col items-center justify-center h-full gap-3 text-muted">
        <UIcon name="i-lucide-inbox" class="size-16 opacity-20" />
        <p class="text-sm">Select a message to read</p>
      </div>

      <AdminMailDetail
        v-else
        :mail="selected"
      />
    </template>
  </UDashboardPanel>

  <!-- Desktop: detail panel (sent) -->
  <UDashboardPanel v-else id="sent-detail" class="hidden lg:flex">
    <template v-if="selectedSent" #header>
      <UDashboardNavbar :title="selectedSent.subject" :ui="{ title: 'text-sm font-medium truncate' }" />
    </template>

    <template #body>
      <div v-if="!selectedSent" class="flex flex-col items-center justify-center h-full gap-3 text-muted">
        <UIcon name="i-lucide-send" class="size-16 opacity-20" />
        <p class="text-sm">Select a sent message to view</p>
      </div>

      <div v-else class="p-4 space-y-4">
        <div class="space-y-1">
          <p class="text-xs text-muted uppercase tracking-wide font-medium">Application</p>
          <p class="text-sm font-semibold">{{ selectedSent.job_applications?.company ?? '—' }}</p>
          <p class="text-sm text-muted">{{ selectedSent.job_applications?.position ?? '' }}</p>
        </div>
        <div class="space-y-1">
          <p class="text-xs text-muted uppercase tracking-wide font-medium">To</p>
          <p class="text-sm">{{ selectedSent.to_email }}</p>
        </div>
        <div class="space-y-1">
          <p class="text-xs text-muted uppercase tracking-wide font-medium">Subject</p>
          <p class="text-sm">{{ selectedSent.subject }}</p>
        </div>
        <div class="space-y-1">
          <p class="text-xs text-muted uppercase tracking-wide font-medium">Sent at</p>
          <p class="text-sm">{{ formatDateTime(selectedSent.sent_at) }}</p>
        </div>
        <div v-if="selectedSent.attachments && selectedSent.attachments.length > 0" class="space-y-1">
          <p class="text-xs text-muted uppercase tracking-wide font-medium">Attachments</p>
          <ul class="space-y-1">
            <li
              v-for="(att, i) in selectedSent.attachments"
              :key="i"
              class="flex items-center gap-2 text-sm"
            >
              <UIcon name="i-lucide-paperclip" class="size-3 text-muted shrink-0" />
              <span class="truncate">{{ (att as { filename?: string; name?: string })?.filename ?? (att as { filename?: string; name?: string })?.name ?? `Attachment ${i + 1}` }}</span>
            </li>
          </ul>
        </div>
        <div v-if="selectedSent.resend_message_id" class="space-y-1">
          <p class="text-xs text-muted uppercase tracking-wide font-medium">Resend ID</p>
          <p class="text-xs font-mono text-muted break-all">{{ selectedSent.resend_message_id }}</p>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Mobile: slideover (inbox) -->
  <ClientOnly>
    <USlideover v-model:open="isSlideoverOpen" side="right" class="lg:hidden" :title="selected?.subject ?? ''" :description="selected?.from_name || selected?.from_email || ''">
      <template #body>
        <AdminMailDetail
          v-if="selected"
          :mail="selected"
        />
      </template>
    </USlideover>
  </ClientOnly>

  <!-- Mobile: slideover (sent) -->
  <ClientOnly>
    <USlideover v-model:open="isSentSlideoverOpen" side="right" class="lg:hidden" :title="selectedSent?.subject ?? ''" :description="selectedSent?.job_applications?.company ?? ''">
      <template #body>
        <div v-if="selectedSent" class="p-4 space-y-4">
          <div class="space-y-1">
            <p class="text-xs text-muted uppercase tracking-wide font-medium">Application</p>
            <p class="text-sm font-semibold">{{ selectedSent.job_applications?.company ?? '—' }}</p>
            <p class="text-sm text-muted">{{ selectedSent.job_applications?.position ?? '' }}</p>
          </div>
          <div class="space-y-1">
            <p class="text-xs text-muted uppercase tracking-wide font-medium">To</p>
            <p class="text-sm">{{ selectedSent.to_email }}</p>
          </div>
          <div class="space-y-1">
            <p class="text-xs text-muted uppercase tracking-wide font-medium">Subject</p>
            <p class="text-sm">{{ selectedSent.subject }}</p>
          </div>
          <div class="space-y-1">
            <p class="text-xs text-muted uppercase tracking-wide font-medium">Sent at</p>
            <p class="text-sm">{{ formatDateTime(selectedSent.sent_at) }}</p>
          </div>
          <div v-if="selectedSent.attachments && selectedSent.attachments.length > 0" class="space-y-1">
            <p class="text-xs text-muted uppercase tracking-wide font-medium">Attachments</p>
            <ul class="space-y-1">
              <li
                v-for="(att, i) in selectedSent.attachments"
                :key="i"
                class="flex items-center gap-2 text-sm"
              >
                <UIcon name="i-lucide-paperclip" class="size-3 text-muted shrink-0" />
                <span class="truncate">{{ (att as { filename?: string; name?: string })?.filename ?? (att as { filename?: string; name?: string })?.name ?? `Attachment ${i + 1}` }}</span>
              </li>
            </ul>
          </div>
          <div v-if="selectedSent.resend_message_id" class="space-y-1">
            <p class="text-xs text-muted uppercase tracking-wide font-medium">Resend ID</p>
            <p class="text-xs font-mono text-muted break-all">{{ selectedSent.resend_message_id }}</p>
          </div>
        </div>
      </template>
    </USlideover>
  </ClientOnly>

  <!-- Purge confirm -->
  <USlideover v-model:open="confirmPurgeOpen" title="Purge inbox?" description="This action is permanent" side="right">
    <template #body>
      <p class="text-sm">
        This will permanently delete <strong>every message</strong> from the inbox table.
        Use this to wipe stale pre-migration rows — then click <em>Sync</em> to repopulate
        from Gmail with the current <code>@giancarlopapa.com</code> filter.
      </p>
      <p class="text-sm text-muted mt-2">
        This action cannot be undone.
      </p>
    </template>
    <template #footer>
      <UButton color="neutral" variant="ghost" label="Cancel" :disabled="purging" @click="confirmPurgeOpen = false" />
      <UButton color="error" icon="i-lucide-trash-2" label="Purge all" :loading="purging" @click="purgeInbox" />
    </template>
  </USlideover>
</template>
