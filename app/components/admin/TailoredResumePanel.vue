<script setup lang="ts">
const props = defineProps<{ applicationId: number, company: string }>();

const toast = useToast();
const open = ref(false);
const jsonText = ref('');
const saving = ref(false);
const downloading = ref(false);
const jsonError = ref('');
const loaded = ref(false);

async function load() {
  if (loaded.value) return;
  const data = await $fetch(`/api/admin/applications/${props.applicationId}/tailored-resume`);
  jsonText.value = JSON.stringify(data, null, 2);
  loaded.value = true;
}

watch(open, (val) => { if (val) load(); });

function validateJson() {
  try { JSON.parse(jsonText.value); jsonError.value = ''; return true; }
  catch (e: unknown) { jsonError.value = e instanceof Error ? e.message : 'Invalid JSON'; return false; }
}

async function save() {
  if (!validateJson()) return;
  saving.value = true;
  try {
    await $fetch(`/api/admin/applications/${props.applicationId}`, {
      method: 'PATCH',
      body: { tailored_resume: JSON.parse(jsonText.value) }
    });
    toast.add({ title: 'Tailored resume saved', color: 'success', icon: 'i-lucide-check' });
  } catch {
    toast.add({ title: 'Save failed', color: 'error', icon: 'i-lucide-triangle-alert' });
  } finally { saving.value = false; }
}

async function resetToMaster() {
  await $fetch(`/api/admin/applications/${props.applicationId}`, {
    method: 'PATCH',
    body: { tailored_resume: null }
  });
  loaded.value = false;
  await load();
  toast.add({ title: 'Reset to master resume', color: 'neutral', icon: 'i-lucide-rotate-ccw' });
}

async function downloadPdf() {
  downloading.value = true;
  try {
    const blob = await $fetch(`/api/admin/applications/${props.applicationId}/resume-pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(blob as Blob);
    const a = document.createElement('a');
    a.href = url; a.download = `resume-${props.company.toLowerCase()}-tailored.pdf`;
    a.click(); URL.revokeObjectURL(url);
  } catch {
    toast.add({ title: 'Download failed', color: 'error', icon: 'i-lucide-triangle-alert' });
  } finally { downloading.value = false; }
}
</script>

<template>
  <div class="rounded-lg border border-default bg-elevated/30">
    <button class="w-full flex items-center justify-between p-3 text-left" @click="open = !open">
      <span class="text-xs font-medium uppercase tracking-wide text-muted">Tailored Resume</span>
      <UIcon :name="open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="size-4 text-muted" />
    </button>

    <div v-if="open" class="border-t border-default p-3 space-y-3">
      <div class="flex items-center gap-2 flex-wrap">
        <UButton icon="i-lucide-download" label="Download tailored PDF" size="xs" variant="soft" :loading="downloading" @click="downloadPdf" />
        <UButton icon="i-lucide-download" label="Standard resume" size="xs" variant="ghost" color="neutral" to="/api/resume/pdf" target="_blank" />
        <UButton icon="i-lucide-rotate-ccw" label="Reset to master" size="xs" variant="ghost" color="neutral" @click="resetToMaster" />
      </div>

      <div v-if="jsonError" class="text-xs text-error font-mono">{{ jsonError }}</div>

      <UTextarea
        v-model="jsonText"
        :rows="20"
        class="w-full text-xs font-mono"
        :ui="{ base: 'font-mono text-xs' }"
        autoresize
        placeholder="Loading..."
        @input="validateJson"
      />

      <UButton icon="i-lucide-save" label="Save tailored resume" size="sm" :loading="saving" @click="save" />
    </div>
  </div>
</template>
