import type { CvProfile } from '~/types/profile'

export function useProfileData() {
  const { data, pending, error, refresh } = useAsyncData(
    'profile',
    () => queryCollection('profile').first()
  )

  const profile = computed(() => data.value as CvProfile | null)

  return {
    profile,
    pending,
    error,
    refresh
  }
}
