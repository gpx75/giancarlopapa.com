<script setup lang="ts">
import type { CoverLetter, CoverLetterTone } from '~/types/applications';

const props = defineProps<{
  applicationId: number
}>();

const toast = useToast();
const { generateCoverLetter, fetchCoverLetters, updateCoverLetter, deleteCoverLetter } = useApplications();

const letters = ref<CoverLetter[]>([]);
const loading = ref(false);
const generating = ref(false);
const savingId = ref<number | null>(null);
const editingId = ref<number | null>(null);
const editContent = ref('');
const tone = ref<CoverLetterTone>('professional');
const instructions = ref('');

const toneOptions = [
  { label: 'Professional', value: 'professional' },
  { label: 'Conversational', value: 'conversational' },
  { label: 'Formal', value: 'formal' }
];

async function loadLetters() {
  loading.value = true;
  try {
    letters.value = await fetchCoverLetters(props.applicationId);
  } catch {
    letters.value = [];
  } finally {
    loading.value = false;
  }
}

async function handleGenerate() {
  generating.value = true;
  try {
    const letter = await generateCoverLetter(props.applicationId, {
      tone: tone.value,
      instructions: instructions.value || undefined
    });
    letters.value.unshift(letter);
    editingId.value = letter.id;
    editContent.value = letter.content;
    instructions.value = '';
    toast.add({ title: 'Cover letter generated', color: 'success', icon: 'i-lucide-sparkles' });
  } catch {
    toast.add({ title: 'Generation failed', color: 'error', icon: 'i-lucide-triangle-alert' });
  } finally {
    generating.value = false;
  }
}

function startEdit(letter: CoverLetter) {
  editingId.value = letter.id;
  editContent.value = letter.content;
}

function cancelEdit() {
  editingId.value = null;
  editContent.value = '';
}

async function saveEdit(letterId: number) {
  savingId.value = letterId;
  try {
    const updated = await updateCoverLetter(letterId, { content: editContent.value });
    const idx = letters.value.findIndex(l => l.id === letterId);
    if (idx >= 0) letters.value[idx] = updated;
    editingId.value = null;
    toast.add({ title: 'Saved', color: 'success', icon: 'i-lucide-check' });
  } catch {
    toast.add({ title: 'Save failed', color: 'error', icon: 'i-lucide-triangle-alert' });
  } finally {
    savingId.value = null;
  }
}

async function handleMarkSent(letter: CoverLetter) {
  savingId.value = letter.id;
  try {
    const updated = await updateCoverLetter(letter.id, { is_sent: !letter.is_sent });
    const idx = letters.value.findIndex(l => l.id === letter.id);
    if (idx >= 0) letters.value[idx] = updated;
  } finally {
    savingId.value = null;
  }
}

async function handleDelete(letterId: number) {
  try {
    await deleteCoverLetter(letterId);
    letters.value = letters.value.filter(l => l.id !== letterId);
    if (editingId.value === letterId) cancelEdit();
    toast.add({ title: 'Deleted', color: 'success', icon: 'i-lucide-check' });
  } catch {
    toast.add({ title: 'Delete failed', color: 'error', icon: 'i-lucide-triangle-alert' });
  }
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
  toast.add({ title: 'Copied to clipboard', color: 'success', icon: 'i-lucide-clipboard-check' });
}

const downloadingId = ref<number | null>(null);

async function downloadPdf(letterId: number) {
  downloadingId.value = letterId;
  try {
    const blob = await $fetch<Blob>(`/api/admin/applications/cover-letters/${letterId}/pdf`, {
      responseType: 'blob'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cover-letter-v${letters.value.find(l => l.id === letterId)?.version ?? letterId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    toast.add({ title: 'PDF downloaded', color: 'success', icon: 'i-lucide-file-down' });
  } catch {
    toast.add({ title: 'PDF generation failed', description: 'Check server logs for details.', color: 'error', icon: 'i-lucide-triangle-alert' });
  } finally {
    downloadingId.value = null;
  }
}

watch(() => props.applicationId, () => loadLetters(), { immediate: true });
</script>

<template>
  <div class="space-y-4">
    <p class="text-xs text-muted uppercase tracking-wide">Cover Letters</p>

    <!-- Generate controls -->
    <div class="space-y-2">
      <div class="flex gap-2">
        <USelect
          v-model="tone"
          :items="toneOptions"
          value-key="value"
          class="w-40"
          size="sm"
        />
        <UButton
          icon="i-lucide-sparkles"
          label="Generate"
          size="sm"
          :loading="generating"
          @click="handleGenerate"
        />
      </div>
      <UInput
        v-model="instructions"
        placeholder="Optional instructions (e.g. 'emphasize AI experience')..."
        size="sm"
        class="w-full"
      />
    </div>

    <USeparator />

    <!-- Loading -->
    <div v-if="loading" class="flex items-center gap-2 text-xs text-muted py-2">
      <UIcon name="i-lucide-loader" class="size-3 animate-spin" />
      Loading...
    </div>

    <!-- Empty state -->
    <p v-else-if="letters.length === 0" class="text-sm text-muted py-4 text-center">
      No cover letters yet. Generate one above.
    </p>

    <!-- Letter list -->
    <div v-else class="space-y-3">
      <div
        v-for="letter in letters"
        :key="letter.id"
        class="rounded-lg border border-default p-3 space-y-2"
      >
        <!-- Letter header -->
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <UBadge :label="`v${letter.version}`" color="neutral" variant="outline" size="xs" />
            <UBadge :label="letter.tone" color="neutral" variant="subtle" size="xs" class="capitalize" />
            <UBadge v-if="letter.is_sent" label="Sent" color="success" variant="subtle" size="xs" icon="i-lucide-check-circle" />
          </div>
          <div class="flex gap-1">
            <UButton
              icon="i-lucide-clipboard"
              size="xs"
              variant="ghost"
              color="neutral"
              @click="copyToClipboard(letter.content)"
            />
            <UButton
              icon="i-lucide-file-down"
              size="xs"
              variant="ghost"
              color="neutral"
              :loading="downloadingId === letter.id"
              @click="downloadPdf(letter.id)"
            />
            <UButton
              :icon="letter.is_sent ? 'i-lucide-circle-x' : 'i-lucide-send'"
              size="xs"
              variant="ghost"
              color="neutral"
              :loading="savingId === letter.id"
              @click="handleMarkSent(letter)"
            />
            <UButton
              v-if="editingId !== letter.id"
              icon="i-lucide-pencil"
              size="xs"
              variant="ghost"
              color="neutral"
              @click="startEdit(letter)"
            />
            <UButton
              icon="i-lucide-trash-2"
              size="xs"
              variant="ghost"
              color="error"
              @click="handleDelete(letter.id)"
            />
          </div>
        </div>

        <!-- Editing mode -->
        <div v-if="editingId === letter.id" class="space-y-2">
          <UTextarea
            v-model="editContent"
            :rows="10"
            autoresize
            class="w-full text-sm"
          />
          <div class="flex gap-2 justify-end">
            <UButton size="xs" variant="ghost" color="neutral" label="Cancel" @click="cancelEdit" />
            <UButton size="xs" label="Save" icon="i-lucide-check" :loading="savingId === letter.id" @click="saveEdit(letter.id)" />
          </div>
        </div>

        <!-- Read mode -->
        <p v-else class="text-sm whitespace-pre-wrap line-clamp-8">
          {{ letter.content }}
        </p>
      </div>
    </div>
  </div>
</template>
