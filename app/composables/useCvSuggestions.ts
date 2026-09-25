import type {
  PersistedCvSuggestion,
  CvSuggestionStatus,
  CvEditOp,
  ProposeCvEditsResponse,
  ApplyCvEditsResponse
} from '~/types/applications';

export function useCvSuggestions(applicationId: MaybeRefOrGetter<number>) {
  const idRef = computed(() => Number(toValue(applicationId)));
  const suggestions = ref<PersistedCvSuggestion[]>([]);
  const loading = ref(false);
  const generating = ref(false);
  const toast = useToast();

  async function refresh() {
    loading.value = true;
    try {
      suggestions.value = await $fetch<PersistedCvSuggestion[]>(
        `/api/admin/applications/${idRef.value}/cv-suggestions`
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to load suggestions.';
      toast.add({
        title: 'Load failed',
        description: msg,
        color: 'error',
        icon: 'i-lucide-triangle-alert'
      });
    } finally {
      loading.value = false;
    }
  }

  async function regenerate() {
    generating.value = true;
    try {
      suggestions.value = await $fetch<PersistedCvSuggestion[]>(
        `/api/admin/applications/${idRef.value}/cv-suggestions`,
        { method: 'POST' }
      );
      toast.add({
        title: 'Suggestions regenerated',
        color: 'success',
        icon: 'i-lucide-check'
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Generation failed.';
      toast.add({
        title: 'Generation failed',
        description: msg,
        color: 'error',
        icon: 'i-lucide-triangle-alert'
      });
    } finally {
      generating.value = false;
    }
  }

  async function setStatus(
    suggestionId: number,
    status: CvSuggestionStatus,
    applied_note?: string
  ) {
    try {
      const updated = await $fetch<PersistedCvSuggestion>(
        `/api/admin/applications/${idRef.value}/cv-suggestions/${suggestionId}`,
        { method: 'PATCH', body: { status, applied_note } }
      );
      const idx = suggestions.value.findIndex((s) => s.id === suggestionId);
      if (idx >= 0) suggestions.value[idx] = updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed.';
      toast.add({
        title: 'Update failed',
        description: msg,
        color: 'error',
        icon: 'i-lucide-triangle-alert'
      });
    }
  }

  async function proposeDiff(suggestionId: number) {
    return $fetch<ProposeCvEditsResponse>(
      `/api/admin/applications/${idRef.value}/cv-suggestions/${suggestionId}/propose-diff`,
      { method: 'POST' }
    );
  }

  async function applyEdits(suggestionId: number, edits: CvEditOp[]) {
    const result = await $fetch<ApplyCvEditsResponse>(
      `/api/admin/applications/${idRef.value}/cv-suggestions/${suggestionId}/apply`,
      { method: 'POST', body: { edits } }
    );
    const idx = suggestions.value.findIndex((s) => s.id === suggestionId);
    if (idx >= 0) suggestions.value[idx] = result.suggestion;
    return result;
  }

  const counters = computed(() => {
    const total = suggestions.value.length;
    const applied = suggestions.value.filter(
      (s) => s.status === 'applied'
    ).length;
    const dismissed = suggestions.value.filter(
      (s) => s.status === 'dismissed'
    ).length;
    const pending = total - applied - dismissed;
    return { total, applied, dismissed, pending };
  });

  return {
    suggestions,
    loading,
    generating,
    refresh,
    regenerate,
    setStatus,
    proposeDiff,
    applyEdits,
    counters
  };
}
