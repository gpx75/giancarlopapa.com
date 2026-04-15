<script setup lang="ts">
import type { JobSuggestion } from '~/types/applications';

interface FindJobsResponse {
  found: number;
  imported: number;
  suggestions: JobSuggestion[];
  keywords: string;
}

const emit = defineEmits<{
  imported: [];
}>();

const toast = useToast();

// Search
const keywords = ref('');
const location = ref('Switzerland');
const workType = ref('');
const source = ref('all');
const searching = ref(false);
const results = ref<JobSuggestion[]>([]);
const resultSummary = ref('');
const usedKeywords = ref('');

const sourceOptions = [
  { label: 'All sources', value: 'all' },
  { label: 'LinkedIn', value: 'jsearch-linkedin' },
  { label: 'Indeed', value: 'jsearch-indeed' },
  { label: 'Glassdoor', value: 'jsearch-glassdoor' },
  { label: 'SwissDevJobs', value: 'swissdevjobs' },
  { label: 'Jobs.ch', value: 'jobsch' }
];

const workTypeOptions = [
  { label: 'Any', value: '' },
  { label: 'Remote', value: 'remote' },
  { label: 'Hybrid', value: 'hybrid' },
  { label: 'On-site', value: 'on_site' }
];

async function findJobs() {
  searching.value = true;
  results.value = [];
  resultSummary.value = '';
  usedKeywords.value = '';
  try {
    const data = await $fetch<FindJobsResponse>('/api/admin/applications/suggestions/find-jobs', {
      method: 'POST',
      body: {
        keywords: keywords.value,
        location: location.value,
        work_type: workType.value,
        source: source.value
      }
    });
    results.value = data.suggestions;
    usedKeywords.value = data.keywords;
    if (data.imported > 0) {
      resultSummary.value = `Found ${data.found} jobs, imported ${data.imported} new.`;
      toast.add({ title: `${data.imported} jobs imported`, color: 'success', icon: 'i-lucide-check' });
      emit('imported');
    } else if (data.found > 0) {
      resultSummary.value = `Found ${data.found} jobs, all already imported.`;
    } else {
      resultSummary.value = 'No jobs found. Try different keywords or source.';
    }
  } catch (err: unknown) {
    const msg = (err as { data?: { message?: string } })?.data?.message || 'Search failed';
    toast.add({ title: msg, color: 'error', icon: 'i-lucide-triangle-alert' });
  } finally {
    searching.value = false;
  }
}

// Import from URL
const importUrl = ref('');
const importing = ref(false);

async function importFromUrl() {
  if (!importUrl.value.trim()) return;
  importing.value = true;
  try {
    await $fetch('/api/admin/applications/suggestions/import-url', {
      method: 'POST',
      body: { url: importUrl.value.trim() }
    });
    toast.add({ title: 'Job imported!', color: 'success', icon: 'i-lucide-check' });
    importUrl.value = '';
    emit('imported');
  } catch (err: unknown) {
    const msg = (err as { data?: { message?: string } })?.data?.message || 'Import failed';
    toast.add({ title: msg, color: 'error', icon: 'i-lucide-triangle-alert' });
  } finally {
    importing.value = false;
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Job Search -->
    <div class="space-y-3">
      <p class="text-xs text-muted uppercase tracking-wide">Search jobs</p>
      <p class="text-xs text-muted">Leave keywords empty to let AI pick the best searches from your resume.</p>
      <div class="grid grid-cols-2 gap-2">
        <UInput
          v-model="keywords"
          placeholder="Keywords (or leave empty for AI)..."
          size="sm"
        />
        <UInput
          v-model="location"
          placeholder="Location"
          size="sm"
        />
      </div>
      <div class="flex gap-2 items-center flex-wrap">
        <select v-model="source" class="rounded-md border border-default bg-default text-sm px-2 py-1.5 w-36">
          <option v-for="opt in sourceOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <select v-model="workType" class="rounded-md border border-default bg-default text-sm px-2 py-1.5 w-28">
          <option v-for="opt in workTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <UButton
          icon="i-lucide-search"
          label="Search"
          size="sm"
          :loading="searching"
          @click="findJobs"
        />
      </div>
    </div>

    <!-- Results -->
    <div v-if="resultSummary" class="space-y-2">
      <USeparator />
      <div class="flex items-center justify-between gap-2">
        <p class="text-sm text-muted">{{ resultSummary }}</p>
        <UBadge v-if="usedKeywords" :label="usedKeywords" color="neutral" variant="outline" size="xs" class="max-w-48 truncate" />
      </div>
      <div v-if="results.length > 0" class="max-h-60 overflow-y-auto space-y-1">
        <div
          v-for="job in results"
          :key="job.id"
          class="flex items-center gap-3 p-2 rounded-lg border border-default"
        >
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ job.title }}</p>
            <p class="text-xs text-muted truncate">{{ job.company }}{{ job.location ? ` · ${job.location}` : '' }}</p>
          </div>
          <UBadge :label="job.source" color="neutral" variant="subtle" size="xs" />
          <UButton
            v-if="job.url"
            icon="i-lucide-external-link"
            size="xs"
            variant="ghost"
            color="neutral"
            as="a"
            :href="job.url"
            target="_blank"
          />
        </div>
      </div>
    </div>

    <USeparator />

    <!-- Import from URL -->
    <div class="space-y-3">
      <p class="text-xs text-muted uppercase tracking-wide">Import from URL</p>
      <p class="text-xs text-muted">Paste any job posting URL — AI extracts title, company and description.</p>
      <div class="flex gap-2">
        <UInput
          v-model="importUrl"
          placeholder="https://www.linkedin.com/jobs/view/..."
          size="sm"
          class="flex-1"
        />
        <UButton
          icon="i-lucide-download"
          label="Import"
          size="sm"
          :loading="importing"
          :disabled="!importUrl.trim()"
          @click="importFromUrl"
        />
      </div>
    </div>
  </div>
</template>
