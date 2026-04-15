<script setup lang="ts">
type Mail = {
  id: string
  subject: string
  from_name: string
  from_email: string
  body_text: string
  body_html: string
  received_at: string
  starred: boolean
}

type LinkedContact = {
  id: number
  name: string
  email: string
  message?: string
  status: string
  created_at: string
}

type LinkedApplication = {
  id: number
  company: string
  position: string
  status: string
  match_rate: number | null
  created_at: string
}

const props = defineProps<{ mail: Mail }>();

const { formatDateTime } = useDateFormatting();
const formattedDate = computed(() => formatDateTime(props.mail.received_at));

const linkedContacts = ref<LinkedContact[]>([]);
const linkedApplications = ref<LinkedApplication[]>([]);

watch(() => props.mail.from_email, async (email) => {
  if (!email) {
    linkedContacts.value = [];
    linkedApplications.value = [];
    return;
  }
  try {
    linkedContacts.value = await $fetch<LinkedContact[]>('/api/admin/contacts/by-email', { params: { email } });
  } catch {
    linkedContacts.value = [];
  }
  try {
    linkedApplications.value = await $fetch<LinkedApplication[]>('/api/admin/applications/by-email', { params: { email } });
  } catch {
    linkedApplications.value = [];
  }
}, { immediate: true });

function openInGmail() {
  const url = props.mail.id.startsWith('uid-')
    ? `https://mail.google.com/mail/u/0/#search/from:${encodeURIComponent(props.mail.from_email)}+subject:${encodeURIComponent(props.mail.subject)}`
    : `https://mail.google.com/mail/u/0/#search/rfc822msgid:${props.mail.id}`;
  window.open(url, '_blank');
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Sender info -->
    <div class="flex items-start gap-3 p-4 border-b border-default">
      <UAvatar :alt="mail.from_name || mail.from_email" size="md" class="shrink-0" />
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <p class="font-medium text-sm">{{ mail.from_name || mail.from_email }}</p>
          <NuxtLink
            v-if="linkedContacts.length > 0"
            to="/admin/contacts"
            class="inline-flex items-center gap-1"
          >
            <UBadge
              :label="`Contact (${linkedContacts[0]?.status})`"
              color="success"
              variant="subtle"
              size="xs"
              class="capitalize"
            />
          </NuxtLink>
        </div>
        <a :href="`mailto:${mail.from_email}`" class="text-xs text-primary hover:underline">
          {{ mail.from_email }}
        </a>
        <p class="text-xs text-muted mt-0.5">{{ formattedDate }}</p>
        <!-- Linked contact message preview -->
        <div v-if="linkedContacts.length > 0" class="mt-2 rounded-md bg-elevated/50 p-2">
          <p class="text-xs text-muted mb-1">
            <UIcon name="i-lucide-user" class="size-3 inline" />
            Contact form submission:
          </p>
          <p class="text-xs truncate">{{ linkedContacts[0]?.message }}</p>
        </div>
        <!-- Linked applications -->
        <div v-if="linkedApplications.length > 0" class="mt-2 space-y-1">
          <NuxtLink
            v-for="app in linkedApplications"
            :key="app.id"
            to="/admin/applications"
            class="flex items-center gap-2 rounded-md bg-elevated/50 p-2"
          >
            <UIcon name="i-lucide-briefcase" class="size-3 text-muted shrink-0" />
            <span class="text-xs font-medium truncate">{{ app.position }} @ {{ app.company }}</span>
            <UBadge :label="app.status" color="neutral" variant="subtle" size="xs" class="capitalize shrink-0" />
            <UBadge v-if="app.match_rate != null" :label="`${app.match_rate}%`" :color="app.match_rate >= 70 ? 'success' : 'warning'" variant="subtle" size="xs" class="shrink-0" />
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Body -->
    <div class="flex-1 overflow-hidden">
      <iframe
        v-if="mail.body_html"
        :srcdoc="mail.body_html"
        sandbox="allow-same-origin"
        class="w-full h-full border-0"
        title="Email body"
      />
      <div v-else class="overflow-y-auto h-full p-4">
        <p class="text-sm whitespace-pre-wrap">{{ mail.body_text }}</p>
      </div>
    </div>

    <!-- Actions -->
    <div class="border-t border-default p-4 flex justify-end">
      <UButton
        icon="i-lucide-external-link"
        label="Open in Gmail"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="openInGmail"
      />
    </div>
  </div>
</template>
