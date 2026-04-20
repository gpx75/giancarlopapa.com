import type { JobApplication, ApplicationPriority, CreateApplicationPayload, UpdateApplicationPayload, GenerateCoverLetterPayload, CoverLetter, CoverLetterDraft, CoverLetterTone } from '~/types/applications';

export function useApplications() {
  const { data: applications, refresh, status: fetchStatus } = useFetch<JobApplication[]>('/api/admin/applications', {
    key: 'admin-applications'
  });

  const pending = computed(() => fetchStatus.value === 'pending');

  async function createApplication(payload: CreateApplicationPayload): Promise<JobApplication> {
    const result = await $fetch<JobApplication>('/api/admin/applications', {
      method: 'POST',
      body: payload
    });
    await refresh();
    return result;
  }

  async function updateApplication(id: number, payload: UpdateApplicationPayload): Promise<JobApplication> {
    const result = await $fetch<JobApplication>(`/api/admin/applications/${id}`, {
      method: 'PATCH',
      body: payload
    });
    await refresh();
    return result;
  }

  async function deleteApplication(id: number): Promise<void> {
    await $fetch(`/api/admin/applications/${id}`, { method: 'DELETE' });
    await refresh();
  }

  async function analyzeMatch(id: number): Promise<JobApplication & { suggestedPriority?: ApplicationPriority }> {
    const result = await $fetch<JobApplication & { suggestedPriority?: ApplicationPriority }>(`/api/admin/applications/${id}/analyze`, {
      method: 'POST'
    });
    await refresh();
    return result;
  }

  async function generateCoverLetter(id: number, payload?: GenerateCoverLetterPayload): Promise<CoverLetter> {
    return await $fetch<CoverLetter>(`/api/admin/applications/${id}/cover-letter`, {
      method: 'POST',
      body: { ...payload, draft: false }
    });
  }

  async function generateCoverLetterDraft(id: number, payload?: { tone?: CoverLetterTone; instructions?: string }): Promise<CoverLetterDraft> {
    return await $fetch<CoverLetterDraft>(`/api/admin/applications/${id}/cover-letter`, {
      method: 'POST',
      body: { ...payload, draft: true }
    });
  }

  async function saveCoverLetterContent(id: number, content: string, tone: CoverLetterTone): Promise<CoverLetter> {
    return await $fetch<CoverLetter>(`/api/admin/applications/${id}/cover-letter`, {
      method: 'POST',
      body: { draft: false, content, tone }
    });
  }

  async function fetchCoverLetters(id: number): Promise<CoverLetter[]> {
    return await $fetch<CoverLetter[]>(`/api/admin/applications/${id}/cover-letters`);
  }

  async function updateCoverLetter(letterId: number, payload: { content?: string; tone?: string; is_sent?: boolean }): Promise<CoverLetter> {
    return await $fetch<CoverLetter>(`/api/admin/applications/cover-letters/${letterId}`, {
      method: 'PATCH',
      body: payload
    });
  }

  async function deleteCoverLetter(letterId: number): Promise<void> {
    await $fetch(`/api/admin/applications/cover-letters/${letterId}`, { method: 'DELETE' });
  }

  return {
    applications,
    refresh,
    pending,
    createApplication,
    updateApplication,
    deleteApplication,
    analyzeMatch,
    generateCoverLetter,
    generateCoverLetterDraft,
    saveCoverLetterContent,
    fetchCoverLetters,
    updateCoverLetter,
    deleteCoverLetter
  };
}
