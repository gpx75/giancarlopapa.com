import type { ResumeDocument } from '~/types/resume';

export function useResumeContent() {
  // useRequestFetch forwards the session cookie during SSR, so signed-in
  // visitors get email and phone on the first render too.
  const requestFetch = useRequestFetch();
  const { loggedIn } = useUserSession();

  const { data, pending, error, refresh } = useAsyncData(
    'resume-content',
    () => requestFetch<ResumeDocument>('/api/resume/content'),
    { watch: [loggedIn] }
  );

  const resume = computed(() => (data.value as ResumeDocument | null) ?? null);

  return {
    resume,
    pending,
    error,
    refresh
  };
}
