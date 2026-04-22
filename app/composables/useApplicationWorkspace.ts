import type {
  JobApplication,
  WorkflowAction,
  WorkflowStage,
  WorkflowTransitionPayload
} from '~/types/applications';

/**
 * Reactive workspace for a single application: fetch, refresh, and
 * trigger workflow transitions. One instance per canvas route.
 */
export function useApplicationWorkspace(id: MaybeRefOrGetter<number>) {
  const idRef = computed(() => Number(toValue(id)));
  const application = ref<JobApplication | null>(null);
  const pending = ref(false);
  const error = ref<string | null>(null);
  const toast = useToast();

  async function refresh() {
    pending.value = true;
    error.value = null;
    try {
      application.value = await $fetch<JobApplication>(
        `/api/admin/applications/${idRef.value}`
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to load application.';
      error.value = msg;
      toast.add({
        title: 'Load failed',
        description: msg,
        color: 'error',
        icon: 'i-lucide-triangle-alert'
      });
    } finally {
      pending.value = false;
    }
  }

  async function transition(payload: WorkflowTransitionPayload) {
    try {
      const res = await $fetch<{
        id: number;
        workflow: JobApplication['workflow'];
      }>(`/api/admin/applications/${idRef.value}/workflow`, {
        method: 'POST',
        body: payload
      });
      if (application.value) {
        application.value = { ...application.value, workflow: res.workflow };
      }
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transition rejected.';
      toast.add({
        title: 'Stage blocked',
        description: msg,
        color: 'warning',
        icon: 'i-lucide-shield-alert'
      });
      return false;
    }
  }

  function enterStage(stage: WorkflowStage) {
    return transition({ stage, action: 'enter' });
  }

  function completeStage(stage: WorkflowStage, meta?: Record<string, unknown>) {
    return transition({ stage, action: 'complete' as WorkflowAction, meta });
  }

  function resetStage(stage: WorkflowStage) {
    return transition({ stage, action: 'reset' });
  }

  function unlock() {
    return transition({ stage: 'apply', action: 'unlock' });
  }

  return {
    application,
    pending,
    error,
    refresh,
    transition,
    enterStage,
    completeStage,
    resetStage,
    unlock
  };
}
