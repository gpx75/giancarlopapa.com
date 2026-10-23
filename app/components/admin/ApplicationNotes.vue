<script setup lang="ts">
import type { JobApplication } from '~/types/applications';

const props = defineProps<{ application: JobApplication }>();
const emit = defineEmits<{ saved: [JobApplication] }>();

const toast = useToast();

const draft = ref(props.application.notes ?? '');
watch(
  () => props.application.notes,
  (notes) => {
    draft.value = notes ?? '';
  }
);

const dirty = computed(() => draft.value !== (props.application.notes ?? ''));
const saving = ref(false);

async function save() {
  saving.value = true;
  try {
    const updated = await $fetch<JobApplication>(
      `/api/admin/applications/${props.application.id}`,
      { method: 'PATCH', body: { notes: draft.value.trim() || null } }
    );
    emit('saved', updated);
    toast.add({ title: 'Notes saved', color: 'success', icon: 'i-lucide-check' });
  } catch (err: unknown) {
    toast.add({
      title: 'Could not save notes',
      description: err instanceof Error ? err.message : undefined,
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-notebook-pen" class="size-4 text-muted" />
          <h2 class="font-semibold">Notes</h2>
        </div>
        <UButton
          size="sm"
          icon="i-lucide-save"
          :disabled="!dirty"
          :loading="saving"
          @click="save"
        >
          Save
        </UButton>
      </div>
    </template>
    <UTextarea
      v-model="draft"
      placeholder="Private notes: recruiter, channel, call dates, open questions…"
      :rows="3"
      autoresize
      class="w-full"
    />
  </UCard>
</template>
