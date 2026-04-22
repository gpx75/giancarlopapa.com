<script setup lang="ts">
import type { JobApplication, CoverLetter } from '~/types/applications';

const props = defineProps<{
  application: JobApplication;
}>();

const emit = defineEmits<{
  sent: [];
}>();

const toast = useToast();

const open = ref(false);
const sending = ref(false);

const to = ref('');
const subject = ref('');
const bodyText = ref('');
const attachResume = ref(true);
const attachCoverLetterPdf = ref(false);

const letters = ref<CoverLetter[]>([]);
const loadingLetters = ref(false);
const selectedLetterId = ref<number | null>(null);

// Reset form when application changes
watch(
  () => props.application,
  (app) => {
    to.value = app.contact_email ?? '';
    subject.value = `Application — ${app.position} at ${app.company}`;
    bodyText.value = '';
    selectedLetterId.value = null;
    letters.value = [];
    open.value = false;
  },
  { immediate: true }
);

// When cover letter PDF toggle is enabled, ensure we have letters loaded
watch(attachCoverLetterPdf, async (val) => {
  if (val && letters.value.length === 0) {
    await loadLetters();
  }
});

async function loadLetters() {
  loadingLetters.value = true;
  try {
    letters.value = await $fetch<CoverLetter[]>(
      `/api/admin/applications/${props.application.id}/cover-letters`
    );
    const first = letters.value[0];
    if (first && !selectedLetterId.value) {
      selectedLetterId.value = first.id;
    }
  } catch {
    letters.value = [];
  } finally {
    loadingLetters.value = false;
  }
}

async function handleOpen() {
  open.value = true;
  // Pre-fill body with latest cover letter content
  if (bodyText.value === '') {
    loadingLetters.value = true;
    try {
      const fetched = await $fetch<CoverLetter[]>(
        `/api/admin/applications/${props.application.id}/cover-letters`
      );
      letters.value = fetched;
      const first = fetched[0];
      if (first) {
        bodyText.value = first.content;
        selectedLetterId.value = first.id;
      }
    } catch {
      // ignore
    } finally {
      loadingLetters.value = false;
    }
  }
}

async function handleSend() {
  if (!to.value || !subject.value || !bodyText.value) {
    toast.add({
      title: 'To, subject, and body are required.',
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    });
    return;
  }

  sending.value = true;
  try {
    await $fetch(`/api/admin/applications/${props.application.id}/send`, {
      method: 'POST',
      body: {
        to: to.value,
        subject: subject.value,
        body: bodyText.value,
        attachResume: attachResume.value,
        attachCoverLetterPdf: attachCoverLetterPdf.value,
        coverLetterId: attachCoverLetterPdf.value
          ? selectedLetterId.value
          : undefined
      }
    });

    toast.add({
      title: 'Application sent!',
      color: 'success',
      icon: 'i-lucide-send'
    });
    open.value = false;
    emit('sent');
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to send application.';
    toast.add({
      title: message,
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    });
  } finally {
    sending.value = false;
  }
}

const letterOptions = computed(() =>
  letters.value.map((l) => ({
    label: `v${l.version} — ${l.tone}`,
    value: l.id
  }))
);
</script>

<template>
  <div>
    <div v-if="!open">
      <UButton
        icon="i-lucide-send"
        label="Prepare & Send"
        variant="soft"
        color="primary"
        size="sm"
        @click="handleOpen"
      />
    </div>

    <div v-else class="space-y-4">
      <div class="flex items-center justify-between">
        <p class="text-xs text-muted uppercase tracking-wide">
          Send Application
        </p>
        <button
          class="text-xs text-muted hover:text-foreground"
          @click="open = false"
        >
          Cancel
        </button>
      </div>

      <!-- To -->
      <div class="space-y-1">
        <label class="text-xs text-muted">To</label>
        <UInput
          v-model="to"
          placeholder="recruiter@company.com"
          class="w-full"
        />
      </div>

      <!-- Subject -->
      <div class="space-y-1">
        <label class="text-xs text-muted">Subject</label>
        <UInput v-model="subject" placeholder="Subject" class="w-full" />
      </div>

      <!-- Body -->
      <div class="space-y-1">
        <div class="flex items-center justify-between">
          <label class="text-xs text-muted">Body</label>
          <span
            v-if="loadingLetters"
            class="text-xs text-muted flex items-center gap-1"
          >
            <UIcon name="i-lucide-loader" class="size-3 animate-spin" />
            Loading...
          </span>
        </div>
        <UTextarea
          v-model="bodyText"
          placeholder="Cover letter text or custom email body..."
          :rows="10"
          autoresize
          class="w-full text-sm"
        />
      </div>

      <!-- Attachments -->
      <div class="space-y-2">
        <p class="text-xs text-muted">Attachments</p>

        <div class="flex items-center gap-2">
          <UCheckbox
            v-model="attachResume"
            label="Include tailored resume PDF"
          />
        </div>

        <div class="flex items-center gap-2">
          <UCheckbox
            v-model="attachCoverLetterPdf"
            label="Include cover letter as PDF"
          />
        </div>

        <!-- Cover letter version selector -->
        <div v-if="attachCoverLetterPdf" class="pl-6 space-y-1">
          <label class="text-xs text-muted">Cover letter version</label>
          <div
            v-if="loadingLetters"
            class="text-xs text-muted flex items-center gap-1"
          >
            <UIcon name="i-lucide-loader" class="size-3 animate-spin" />
            Loading cover letters...
          </div>
          <USelect
            v-else-if="letterOptions.length > 0"
            :model-value="selectedLetterId ?? undefined"
            :items="letterOptions"
            value-key="value"
            class="w-full"
            @update:model-value="
              (v: number | undefined) => (selectedLetterId = v ?? null)
            "
          />
          <p v-else class="text-xs text-muted italic">
            No saved cover letters.
          </p>
        </div>
      </div>

      <!-- Send button -->
      <UButton
        icon="i-lucide-send"
        label="Send"
        :loading="sending"
        class="w-full"
        @click="handleSend"
      />
    </div>
  </div>
</template>
