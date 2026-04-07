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
}

const tab = ref<'all' | 'unread'>('all');
const selected = ref<Mail | null>(null);
const isSlideoverOpen = ref(false);
const syncing = ref(false);
const syncResult = ref<string | null>(null);

const { data: mails, refresh } = await useFetch<Mail[]>('/api/admin/inbox');

const filtered = computed(() => {
  if (!mails.value) return [];
  return tab.value === 'unread'
    ? mails.value.filter(m => m.unread)
    : mails.value;
});

const unreadCount = computed(() => mails.value?.filter(m => m.unread).length ?? 0);

const tabs = computed(() => [
  { label: 'All', value: 'all', badge: filtered.value.length > 0 && tab.value === 'all' ? String(filtered.value.length) : undefined },
  { label: 'Unread', value: 'unread', badge: unreadCount.value > 0 ? String(unreadCount.value) : undefined }
]);

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString('en-CH', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-CH', { day: '2-digit', month: 'short' });
}

function selectMail(mail: Mail) {
  selected.value = mail;
  isSlideoverOpen.value = true;
  if (mail.unread) {
    mail.unread = false;
    updateMail(mail.id, { unread: false });
  }
}

async function updateMail(id: string, payload: Partial<Pick<Mail, 'unread' | 'starred' | 'archived'>>) {
  await $fetch(`/api/admin/inbox/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: payload
  });
  await refresh();
}

async function archiveMail(mail: Mail) {
  await updateMail(mail.id, { archived: true });
  if (selected.value?.id === mail.id) {
    selected.value = null;
    isSlideoverOpen.value = false;
  }
}

async function toggleStar(mail: Mail) {
  await updateMail(mail.id, { starred: !mail.starred });
  if (selected.value?.id === mail.id) {
    selected.value = { ...selected.value, starred: !mail.starred };
  }
}

async function markUnread(mail: Mail) {
  await updateMail(mail.id, { unread: true });
  selected.value = null;
  isSlideoverOpen.value = false;
}

async function syncInbox() {
  syncing.value = true;
  syncResult.value = null;
  try {
    const result = await $fetch<{ synced: number }>('/api/admin/inbox/sync', { method: 'POST' });
    syncResult.value = `Synced ${result.synced} message${result.synced === 1 ? '' : 's'}`;
    await refresh();
  } catch (err: unknown) {
    syncResult.value = (err as { data?: { message?: string } })?.data?.message ?? 'Sync failed';
  } finally {
    syncing.value = false;
    setTimeout(() => { syncResult.value = null; }, 4000);
  }
}

const dropdownItems = (mail: Mail) => [[
  {
    label: mail.unread ? 'Mark as read' : 'Mark as unread',
    icon: mail.unread ? 'i-lucide-mail-open' : 'i-lucide-mail',
    onSelect: () => mail.unread ? updateMail(mail.id, { unread: false }) : markUnread(mail)
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
          <UTooltip :text="syncResult ?? 'Sync inbox'">
            <UButton
              :icon="syncing ? 'i-lucide-loader' : 'i-lucide-refresh-cw'"
              :class="syncing ? 'animate-spin' : ''"
              color="neutral"
              variant="ghost"
              square
              :loading="syncing"
              @click="syncInbox"
            />
          </UTooltip>
          <UColorModeButton />
          <UTooltip text="Go to site">
            <UButton color="neutral" variant="ghost" icon="i-lucide-external-link" square to="/" />
          </UTooltip>
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
      <div v-if="!mails" class="flex items-center justify-center h-full">
        <UIcon name="i-lucide-loader" class="animate-spin size-6 text-muted" />
      </div>

      <div v-else-if="filtered.length === 0" class="flex flex-col items-center justify-center h-full gap-3 text-muted">
        <UIcon name="i-lucide-inbox" class="size-12 opacity-30" />
        <p class="text-sm">{{ tab === 'unread' ? 'No unread messages' : 'Inbox is empty' }}</p>
        <UButton size="sm" variant="ghost" color="neutral" icon="i-lucide-refresh-cw" label="Sync now" :loading="syncing" @click="syncInbox" />
      </div>

      <ul v-else class="divide-y divide-default">
        <li
          v-for="mail in filtered"
          :key="mail.id"
          class="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-elevated/50 transition-colors"
          :class="selected?.id === mail.id ? 'bg-elevated' : ''"
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
              <span class="text-xs text-muted shrink-0">{{ formatDate(mail.received_at) }}</span>
            </div>
            <p class="text-sm truncate" :class="mail.unread ? 'font-medium' : 'text-muted'">
              {{ mail.subject }}
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
  </UDashboardPanel>

  <!-- Desktop: detail panel -->
  <UDashboardPanel id="inbox-detail" class="hidden lg:flex">
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
        @reply="refresh"
      />
    </template>
  </UDashboardPanel>

  <!-- Mobile: slideover -->
  <ClientOnly>
    <USlideover v-model:open="isSlideoverOpen" side="right" class="lg:hidden" :title="selected?.subject ?? ''" :description="selected?.from_name || selected?.from_email || ''">
      <template #body>
        <AdminMailDetail
          v-if="selected"
          :mail="selected"
          @reply="refresh"
        />
      </template>
    </USlideover>
  </ClientOnly>
</template>
