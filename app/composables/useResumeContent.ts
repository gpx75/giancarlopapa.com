import { computed } from 'vue'
import { useAsyncData } from '#app'
import type { ResumeDocument } from '~/types/resume'

export function useResumeContent() {
  const fetchResume = async () => {
    try {
      const document = await queryContent<ResumeDocument>('/giancarlo_papa_resume').findOne()
      if (document) {
        const parsed = (document.body ?? document) as ResumeDocument
        if (parsed.basics) {
          return parsed
        }
        console.warn('[useResumeContent] Resume document missing basics after content query.')
      } else {
        console.warn('[useResumeContent] Resume content query returned null.')
      }
    } catch (error) {
      console.error('[useResumeContent] Failed to query Nuxt Content', error)
    }

    const fallbackModule = await import('../../content/giancarlo_papa_resume.json')
    const fallback = (fallbackModule.default || fallbackModule) as ResumeDocument

    if (!fallback?.basics) {
      throw new Error('Resume document missing basics section.')
    }

    return fallback
  }

  const { data, pending, error, refresh } = useAsyncData('resume-content', fetchResume)

  const resume = computed(() => data.value ?? null)

  return {
    resume,
    pending,
    error,
    refresh
  }
}
