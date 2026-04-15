<script setup lang="ts">
import type { CreateSuggestionPayload } from '~/types/applications';

const emit = defineEmits<{
  submit: [payload: CreateSuggestionPayload]
  cancel: []
}>();

defineProps<{
  loading?: boolean
}>();

const form = reactive<CreateSuggestionPayload>({
  title: '',
  company: '',
  url: '',
  location: '',
  description: '',
  source: 'manual'
});

function handleSubmit() {
  if (!form.title || !form.company) return;
  emit('submit', { ...form });
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UFormField label="Job title" required>
        <UInput v-model="form.title" placeholder="Senior Engineer" class="w-full" />
      </UFormField>
      <UFormField label="Company" required>
        <UInput v-model="form.company" placeholder="Acme Inc." class="w-full" />
      </UFormField>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UFormField label="URL">
        <UInput v-model="form.url" type="url" placeholder="https://..." class="w-full" />
      </UFormField>
      <UFormField label="Location">
        <UInput v-model="form.location" placeholder="Zurich, Switzerland" class="w-full" />
      </UFormField>
    </div>

    <UFormField label="Description">
      <UTextarea
        v-model="form.description"
        placeholder="Paste the job description or a summary..."
        :rows="4"
        autoresize
        class="w-full"
      />
    </UFormField>

    <div class="flex justify-end gap-2 pt-2">
      <UButton color="neutral" variant="ghost" label="Cancel" @click="emit('cancel')" />
      <UButton
        type="submit"
        label="Add suggestion"
        icon="i-lucide-plus"
        :loading="loading"
        :disabled="!form.title || !form.company"
      />
    </div>
  </form>
</template>
