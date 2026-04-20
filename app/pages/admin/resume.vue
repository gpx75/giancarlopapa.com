<script setup lang="ts">
definePageMeta({ layout: 'admin' });

const toast = useToast();
const jsonText = ref('');
const saving = ref(false);
const jsonError = ref('');

const { data, refresh } = await useFetch('/api/admin/resume', {
  transform: (d) => JSON.stringify(d, null, 2)
});
jsonText.value = data.value ?? '';

watch(data, (val) => { if (val) jsonText.value = val; });

function validateJson() {
  try {
    JSON.parse(jsonText.value);
    jsonError.value = '';
    return true;
  } catch (e: unknown) {
    jsonError.value = e instanceof Error ? e.message : 'Invalid JSON';
    return false;
  }
}

async function save() {
  if (!validateJson()) return;
  saving.value = true;
  try {
    await $fetch('/api/admin/resume', {
      method: 'POST',
      body: JSON.parse(jsonText.value)
    });
    toast.add({ title: 'Resume saved & PDF regenerated', color: 'success', icon: 'i-lucide-check' });
    await refresh();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Save failed';
    toast.add({ title: msg, color: 'error', icon: 'i-lucide-triangle-alert' });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div>
          <h2 class="text-base font-semibold">Resume JSON</h2>
          <p class="text-xs text-muted">Edit master resume — saves to file and regenerates PDF</p>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-eye"
            label="Preview PDF"
            variant="ghost"
            size="sm"
            to="/api/resume/pdf"
            target="_blank"
          />
          <UButton
            icon="i-lucide-save"
            label="Save & Regenerate"
            size="sm"
            :loading="saving"
            @click="save"
          />
        </div>
      </div>
    </template>

    <div class="p-4 flex flex-col gap-2">
      <p v-if="jsonError" class="text-xs text-error font-mono px-1">{{ jsonError }}</p>
      <UTextarea
        v-model="jsonText"
        :rows="60"
        class="w-full"
        :ui="{ base: 'font-mono text-xs' }"
        autoresize
        @input="validateJson"
      />
    </div>
  </UDashboardPanel>
</template>
