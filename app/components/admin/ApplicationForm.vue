<script setup lang="ts">
import type { CreateApplicationPayload, WorkModel } from '~/types/applications';

const emit = defineEmits<{
  submit: [payload: CreateApplicationPayload]
  cancel: []
}>();

const props = defineProps<{
  loading?: boolean
  initial?: Partial<CreateApplicationPayload>
}>();

const form = reactive<CreateApplicationPayload>({
  company: props.initial?.company ?? '',
  position: props.initial?.position ?? '',
  url: props.initial?.url ?? '',
  location: props.initial?.location ?? '',
  work_model: props.initial?.work_model,
  job_description: props.initial?.job_description ?? '',
  salary_range: props.initial?.salary_range ?? '',
  notes: props.initial?.notes ?? '',
  contact_email: props.initial?.contact_email ?? ''
});

const workModelOptions = [
  { label: 'On-site', value: 'onsite' },
  { label: 'Hybrid', value: 'hybrid' },
  { label: 'Remote', value: 'remote' }
];

function handleSubmit() {
  if (!form.company || !form.position) return;
  const payload: CreateApplicationPayload = { ...form };
  if (!payload.work_model) delete payload.work_model;
  emit('submit', payload);
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UFormField label="Company" required>
        <UInput v-model="form.company" placeholder="Acme Inc." class="w-full" />
      </UFormField>
      <UFormField label="Position" required>
        <UInput v-model="form.position" placeholder="Senior Engineer" class="w-full" />
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

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UFormField label="Work model">
        <USelect
          v-model="(form.work_model as WorkModel | undefined)"
          :items="workModelOptions"
          value-key="value"
          placeholder="Select..."
          class="w-full"
        />
      </UFormField>
      <UFormField label="Salary range">
        <UInput v-model="form.salary_range" placeholder="120-150k CHF" class="w-full" />
      </UFormField>
    </div>

    <UFormField label="Contact email">
      <UInput v-model="form.contact_email" type="email" placeholder="recruiter@company.com" class="w-full" />
    </UFormField>

    <UFormField label="Job description">
      <UTextarea
        v-model="form.job_description"
        placeholder="Paste the full job description here..."
        :rows="6"
        autoresize
        class="w-full"
      />
    </UFormField>

    <UFormField label="Notes">
      <UTextarea
        v-model="form.notes"
        placeholder="Private notes..."
        :rows="3"
        autoresize
        class="w-full"
      />
    </UFormField>

    <div class="flex justify-end gap-2 pt-2">
      <UButton color="neutral" variant="ghost" label="Cancel" @click="emit('cancel')" />
      <UButton
        type="submit"
        label="Save application"
        icon="i-lucide-plus"
        :loading="loading"
        :disabled="!form.company || !form.position"
      />
    </div>
  </form>
</template>
