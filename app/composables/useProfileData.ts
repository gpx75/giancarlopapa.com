import { defaultProfile, type CvProfile } from '~/data/profile';

export function useProfileData() {
  const fetchState = useFetch<{ profile: CvProfile }>('/api/profile', {
    default: () => ({ profile: defaultProfile })
  });

  const profile = computed(
    () => fetchState.data.value?.profile ?? defaultProfile
  );

  return {
    ...fetchState,
    profile
  };
}
