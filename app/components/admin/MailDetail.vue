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

const props = defineProps<{ mail: Mail }>();
const emit = defineEmits<{ reply: [] }>();

const replyText = ref('');
const sending = ref(false);

const formattedDate = computed(() =>
  new Date(props.mail.received_at).toLocaleString('en-CH', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
);

async function sendReply() {
  if (!replyText.value.trim()) return;
  sending.value = true;
  try {
    await $fetch('/api/admin/inbox/reply', {
      method: 'POST',
      body: {
        to: props.mail.from_email,
        toName: props.mail.from_name,
        subject: props.mail.subject.startsWith('Re:') ? props.mail.subject : `Re: ${props.mail.subject}`,
        message: replyText.value
      }
    });
    replyText.value = '';
    emit('reply');
  } catch {
    // error handled silently — user can retry
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Sender info -->
    <div class="flex items-start gap-3 p-4 border-b border-default">
      <UAvatar :alt="mail.from_name || mail.from_email" size="md" class="shrink-0" />
      <div class="flex-1 min-w-0">
        <p class="font-medium text-sm">{{ mail.from_name || mail.from_email }}</p>
        <a :href="`mailto:${mail.from_email}`" class="text-xs text-primary hover:underline">
          {{ mail.from_email }}
        </a>
        <p class="text-xs text-muted mt-0.5">{{ formattedDate }}</p>
      </div>
    </div>

    <!-- Body -->
    <div class="flex-1 overflow-y-auto p-4">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-if="mail.body_html" class="prose prose-sm dark:prose-invert max-w-none text-sm" v-html="mail.body_html" />
      <p v-else class="text-sm whitespace-pre-wrap">{{ mail.body_text }}</p>
    </div>

    <!-- Reply -->
    <div class="border-t border-default p-4 space-y-2">
      <UTextarea
        v-model="replyText"
        :placeholder="`Reply to ${mail.from_name || mail.from_email}...`"
        :rows="3"
        autoresize
        class="w-full"
        :disabled="sending"
      />
      <div class="flex justify-between items-center">
        <UButton
          :href="`mailto:${mail.from_email}?subject=${encodeURIComponent(mail.subject.startsWith('Re:') ? mail.subject : 'Re: ' + mail.subject)}`"
          icon="i-lucide-external-link"
          label="Open in Mail"
          color="neutral"
          variant="ghost"
          size="sm"
          external
        />
        <UButton
          icon="i-lucide-send"
          label="Send reply"
          size="sm"
          :loading="sending"
          :disabled="!replyText.trim()"
          @click="sendReply"
        />
      </div>
    </div>
  </div>
</template>
