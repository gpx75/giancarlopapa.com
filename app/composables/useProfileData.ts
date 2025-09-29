import { computed } from 'vue'
import { defaultProfile, type CvProfile } from '~/data/profile'

type ProfileSource = 'hub-database' | 'hub-kv' | 'static'

interface ProfilePayload {
  profile: CvProfile
  source: ProfileSource
}

export function useProfileData() {
  const fetchState = useFetch<ProfilePayload>('/api/profile', {
    default: (): ProfilePayload => ({ profile: defaultProfile, source: 'static' as ProfileSource })
  })

  const profile = computed(() => fetchState.data.value?.profile ?? defaultProfile)
  const source = computed<ProfileSource>(() => fetchState.data.value?.source ?? 'static')

  return {
    ...fetchState,
    profile,
    source
  }
}
