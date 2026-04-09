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

const { formatDateTime } = useDateFormatting();
const formattedDate = computed(() => formatDateTime(props.mail.received_at));

function openInMail() {
  const subject = props.mail.subject.startsWith('Re:') ? props.mail.subject : `Re: ${props.mail.subject}`;
  window.open(`mailto:${props.mail.from_email}?subject=${encodeURIComponent(subject)}`, '_blank');
}

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
          icon="i-lucide-external-link"
          label="Open in Mail"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="openInMail"
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
