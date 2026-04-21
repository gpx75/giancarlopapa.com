<script setup lang="ts">
import type { JobApplication } from '~/types/applications';

const props = defineProps<{
  application: JobApplication
  defaultOpen?: boolean
}>();

const emit = defineEmits<{
  saved: [JobApplication]
}>();

const editing = ref(false);
const draft = ref(props.application.job_description ?? '');
const saving = ref(false);
const toast = useToast();

const open = ref(props.defaultOpen ?? false);

const charCount = computed(() => props.application.job_description?.length ?? 0);
const wordCount = computed(() =>
  props.application.job_description
    ? props.application.job_description.trim().split(/\s+/).filter(Boolean).length
    : 0
);
const lengthBadge = computed<{ label: string; color: 'success' | 'warning' | 'error' | 'neutral' }>(() => {
  if (!charCount.value) return { label: 'empty', color: 'error' };
  if (charCount.value < 400) return { label: 'too short', color: 'error' };
  if (charCount.value < 800) return { label: 'thin', color: 'warning' };
  return { label: `${wordCount.value} words`, color: 'neutral' };
});

watch(() => props.application.id, () => {
  draft.value = props.application.job_description ?? '';
  editing.value = false;
  open.value = props.defaultOpen ?? false;
});

async function save() {
  saving.value = true;
  try {
    const updated = await $fetch<JobApplication>(`/api/admin/applications/${props.application.id}`, {
      method: 'PATCH',
      body: { job_description: draft.value }
    });
    emit('saved', updated);
    toast.add({ title: 'JD saved', color: 'success', icon: 'i-lucide-check' });
    editing.value = false;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Save failed.';
    toast.add({ title: 'Save failed', description: msg, color: 'error', icon: 'i-lucide-triangle-alert' });
  } finally {
    saving.value = false;
  }
}

function startEdit() {
  open.value = true;
  editing.value = true;
}
</script>

<template>
  <UCard variant="soft">
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <button
          type="button"
          class="flex items-center gap-2 text-left flex-1 min-w-0"
          @click="open = !open"
        >
          <UIcon
            :name="open ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
            class="size-4 text-muted shrink-0"
          />
          <UIcon name="i-lucide-file-text" class="text-primary-500 shrink-0" />
          <h3 class="font-semibold truncate">Job description</h3>
          <UBadge
            v-if="application.job_description"
            :label="lengthBadge.label"
            :color="lengthBadge.color"
            variant="subtle"
            size="xs"
          />
          <UBadge
            v-else
            label="missing"
            color="error"
            variant="subtle"
            size="xs"
          />
        </button>
        <div class="flex items-center gap-1">
          <UButton
            v-if="!editing"
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-pencil"
            @click.stop="startEdit"
          >
            Edit
          </UButton>
          <template v-else>
            <UButton size="xs" color="neutral" variant="ghost" @click.stop="editing = false; draft = application.job_description ?? ''">
              Cancel
            </UButton>
            <UButton size="xs" color="primary" :loading="saving" @click.stop="save">Save</UButton>
          </template>
        </div>
      </div>
    </template>

    <div v-if="open">
      <UTextarea
        v-if="editing"
        v-model="draft"
        :rows="14"
        placeholder="Paste the job description…"
        class="w-full font-mono text-xs"
      />
      <div
        v-else-if="application.job_description"
        class="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-xs leading-relaxed max-h-[60vh] overflow-y-auto"
      >
        {{ application.job_description }}
      </div>
      <div v-else class="text-sm text-neutral-500 dark:text-neutral-400">
        No job description yet. Add one to enable analysis and CV suggestions.
      </div>
    </div>
  </UCard>
</template>
