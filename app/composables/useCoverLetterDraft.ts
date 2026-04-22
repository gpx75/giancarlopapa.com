import type { CoverLetterTone } from '~/types/applications';

interface DraftSnapshot {
  content: string;
  tone: CoverLetterTone;
  savedAt: number;
}

/**
 * Cover letter draft autosave to localStorage.
 *
 * Storage key: `admin_cover_draft_{applicationId}`
 * Persists draft content + tone with a debounced writer (default 500ms).
 * Survives page reloads; can be inspected and explicitly cleared.
 */
export function useCoverLetterDraft(
  applicationId: MaybeRefOrGetter<number>,
  options: { debounceMs?: number } = {}
) {
  const debounceMs = options.debounceMs ?? 500;
  const idRef = computed(() => Number(toValue(applicationId)));
  const storageKey = computed(() => `admin_cover_draft_${idRef.value}`);

  const lastSavedAt = ref<number | null>(null);
  const isDirty = ref(false);

  function loadFromStorage(): DraftSnapshot | null {
    if (!import.meta.client) return null;
    try {
      const raw = localStorage.getItem(storageKey.value);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as DraftSnapshot;
      if (typeof parsed?.content !== 'string') return null;
      lastSavedAt.value = parsed.savedAt ?? null;
      return parsed;
    } catch {
      return null;
    }
  }

  let timer: ReturnType<typeof setTimeout> | null = null;

  function scheduleSave(content: string, tone: CoverLetterTone) {
    if (!import.meta.client) return;
    isDirty.value = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        const snap: DraftSnapshot = { content, tone, savedAt: Date.now() };
        localStorage.setItem(storageKey.value, JSON.stringify(snap));
        lastSavedAt.value = snap.savedAt;
        isDirty.value = false;
      } catch {
        // quota or disabled — silent
      }
    }, debounceMs);
  }

  function clearDraft() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (import.meta.client) {
      try {
        localStorage.removeItem(storageKey.value);
      } catch {
        /* noop */
      }
    }
    lastSavedAt.value = null;
    isDirty.value = false;
  }

  const lastSavedLabel = computed(() => {
    if (!lastSavedAt.value) return null;
    const diff = Date.now() - lastSavedAt.value;
    const secs = Math.floor(diff / 1000);
    if (secs < 5) return 'just now';
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  });

  return {
    loadFromStorage,
    scheduleSave,
    clearDraft,
    lastSavedAt,
    lastSavedLabel,
    isDirty
  };
}
