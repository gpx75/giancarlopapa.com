import type { ResumeDocument } from '~/types/resume';

export function useResumeContent() {
  const { data, pending, error, refresh } = useAsyncData('resume-content', () =>
    $fetch<ResumeDocument>('/api/resume/content')
  );

  const resume = computed(() => (data.value as ResumeDocument | null) ?? null);

  return {
    resume,
    pending,
    error,
    refresh
  };
}
