import type { JobSourceProvider, JobSearchParams, JobSearchResult, JobSource } from './types';

/** JSearch API response shape */
interface JSearchJob {
  job_title: string
  employer_name: string
  job_city: string | null
  job_state: string | null
  job_country: string | null
  job_apply_link: string | null
  job_google_link: string | null
  job_description: string | null
  job_publisher: string | null
  job_posted_at_datetime_utc: string | null
}

interface JSearchResponse {
  status: string
  data: JSearchJob[]
}

function getJSearchApiKey(): string {
  const key = useRuntimeConfig().rapidApiKey?.trim();
  if (!key) throw new Error('NUXT_RAPID_API_KEY not configured. Get a free key at rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch');
  return key;
}

async function jsearchRequest<T>(path: string, query: Record<string, string>): Promise<T> {
  const apiKey = getJSearchApiKey();
  return $fetch<T>(path, {
    baseURL: 'https://jsearch.p.rapidapi.com',
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': 'jsearch.p.rapidapi.com',
      'Content-Type': 'application/json'
    },
    query
  });
}

function locationToCountry(location: string): string {
  const loc = (location || '').toLowerCase();
  const map: Record<string, string> = {
    switzerland: 'ch', zurich: 'ch', zürich: 'ch', bern: 'ch', basel: 'ch', geneva: 'ch', lausanne: 'ch',
    germany: 'de', berlin: 'de', munich: 'de', münchen: 'de', hamburg: 'de', frankfurt: 'de',
    austria: 'at', vienna: 'at', wien: 'at',
    france: 'fr', paris: 'fr', lyon: 'fr',
    uk: 'gb', london: 'gb', 'united kingdom': 'gb',
    netherlands: 'nl', amsterdam: 'nl',
    italy: 'it', milan: 'it', rome: 'it',
    spain: 'es', barcelona: 'es', madrid: 'es',
    usa: 'us', 'united states': 'us'
  };
  for (const [key, code] of Object.entries(map)) {
    if (loc.includes(key)) return code;
  }
  return 'ch'; // Default to Switzerland
}

/**
 * Factory that creates a JSearch provider filtered by publisher (LinkedIn, Indeed, Glassdoor).
 * JSearch aggregates multiple job boards; we post-filter by `job_publisher` field.
 */
export function createJSearchProvider(siteName: 'linkedin' | 'indeed' | 'glassdoor'): JobSourceProvider {
  const sourceName = `jsearch-${siteName}` as JobSource;
  const labels: Record<string, string> = {
    linkedin: 'LinkedIn',
    indeed: 'Indeed',
    glassdoor: 'Glassdoor'
  };

  return {
    name: sourceName,
    label: labels[siteName] ?? siteName,

    async search(params: JobSearchParams): Promise<JobSearchResult[]> {
      const country = locationToCountry(params.location);
      const query = params.location
        ? `${params.keywords} jobs in ${params.location}`
        : params.keywords;

      const queryParams: Record<string, string> = {
        query,
        page: '1',
        num_pages: '2',
        country,
        date_posted: 'month'
      };

      if (params.workType === 'remote') {
        queryParams.remote_jobs_only = 'true';
      }

      const response = await jsearchRequest<JSearchResponse>('/search', queryParams);

      if (!response?.data) return [];

      // Soft filter by publisher — if the specific site has results use those,
      // otherwise return all results (JSearch aggregates many boards)
      const byPublisher = response.data.filter(job =>
        job.job_publisher?.toLowerCase().includes(siteName)
      );
      const results = byPublisher.length > 0 ? byPublisher : response.data;

      return results.slice(0, params.maxResults).map(job => ({
        title: job.job_title || 'Untitled',
        company: job.employer_name || 'Unknown',
        location: [job.job_city, job.job_state, job.job_country].filter(Boolean).join(', ') || params.location,
        url: job.job_apply_link || job.job_google_link || '',
        description: job.job_description || '',
        source: sourceName,
        published_at: job.job_posted_at_datetime_utc || undefined
      }));
    }
  };
}
