<script setup lang="ts">
import type { JobApplication } from '~/types/applications';
import resumeLabels from '~~/content/resume-labels.json';

const props = defineProps<{ application: JobApplication }>();
const emit = defineEmits<{ updated: [JobApplication] }>();

const toast = useToast();

const current = computed<ResumeLanguage>(() => props.application.language ?? 'en');
const detected = computed(() => detectAdLanguage(props.application.job_description));
const nameOf = (lang: ResumeLanguage) => resumeLabels[lang].languageName;

const items = RESUME_LANGUAGES.map((lang) => ({ label: nameOf(lang), value: lang }));

// "Keep current language" is remembered per application in this browser.
const dismissKey = computed(() => `app-language-dismissed:${props.application.id}`);
const dismissed = ref(false);
onMounted(() => {
  try {
    dismissed.value = localStorage.getItem(dismissKey.value) === detected.value;
  } catch {
    dismissed.value = false;
  }
});
function dismiss() {
  dismissed.value = true;
  try {
    if (detected.value) localStorage.setItem(dismissKey.value, detected.value);
  } catch {
    // Storage unavailable — the suggestion simply shows again next visit.
  }
}

const showSuggestion = computed(
  () => !!detected.value && detected.value !== current.value && !dismissed.value
);

const { data: translations } = await useFetch('/api/admin/resume/translations', {
  default: () => []
});
const translationStatus = computed(() =>
  translations.value.find((t) => t.language === current.value)
);

// Switching language discards the tailored CV (it is a copy in the old language).
const pending = ref<ResumeLanguage | null>(null);
const confirmOpen = computed({
  get: () => pending.value !== null,
  set: (open: boolean) => {
    if (!open) pending.value = null;
  }
});
const saving = ref(false);

function requestSwitch(lang: ResumeLanguage) {
  if (lang === current.value) return;
  if (props.application.tailored_resume) {
    pending.value = lang;
  } else {
    void save(lang);
  }
}

async function save(lang: ResumeLanguage) {
  saving.value = true;
  try {
    const updated = await $fetch<JobApplication>(
      `/api/admin/applications/${props.application.id}`,
      { method: 'PATCH', body: { language: lang, tailored_resume: null } }
    );
    emit('updated', updated);
    toast.add({
      title: `Documents now in ${nameOf(lang)}`,
      description: 'CV, cover letter and email subject use this language. Re-run "Tailor to job ad" and regenerate the cover letter.',
      color: 'success',
      icon: 'i-lucide-languages'
    });
  } catch (err: unknown) {
    const msg = (err as { data?: { message?: string } })?.data?.message || 'Could not change language.';
    toast.add({ title: msg, color: 'error', icon: 'i-lucide-triangle-alert' });
  } finally {
    saving.value = false;
    pending.value = null;
  }
}
</script>

<template>
  <div class="space-y-2">
    <UAlert
      v-if="showSuggestion && detected"
      color="info"
      variant="soft"
      icon="i-lucide-languages"
      :title="`This ad is in ${nameOf(detected)}`"
      :description="`Use your ${nameOf(detected)} CV, cover letter and email for this application? Currently: ${nameOf(current)}.`"
      :actions="[
        { label: `Use ${nameOf(detected)}`, color: 'info', loading: saving, onClick: () => requestSwitch(detected!) },
        { label: `Keep ${nameOf(current)}`, color: 'neutral', variant: 'ghost', onClick: dismiss }
      ]"
    />

    <div class="flex items-center gap-2 flex-wrap text-sm">
      <UIcon name="i-lucide-languages" class="size-4 text-muted" />
      <span class="text-muted">Documents language</span>
      <USelect
        :model-value="current"
        :items="items"
        size="xs"
        class="w-32"
        :loading="saving"
        aria-label="Language of CV, cover letter and email"
        @update:model-value="(v) => requestSwitch(v as ResumeLanguage)"
      />
      <UBadge
        v-if="translationStatus && !translationStatus.upToDate"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
      >
        Translation outdated — run npm run translate-resume -- {{ current }}
      </UBadge>
      <UBadge
        v-else-if="translationStatus && !translationStatus.reviewed"
        color="neutral"
        variant="subtle"
        icon="i-lucide-eye"
      >
        Draft translation — not yet proofread
      </UBadge>
    </div>

    <UModal
      v-model:open="confirmOpen"
      title="Switch documents language?"
      :description="pending ? `Switching to ${nameOf(pending)} resets the tailored CV of this application to the ${nameOf(pending)} master — your tailored edits and Core Competencies are discarded.` : ''"
    >
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" label="Cancel" @click="pending = null" />
          <UButton
            color="warning"
            :label="pending ? `Switch to ${nameOf(pending)}` : 'Switch'"
            :loading="saving"
            @click="pending && save(pending)"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
