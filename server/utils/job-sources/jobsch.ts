import type {
  JobSourceProvider,
  JobSearchParams,
  JobSearchResult
} from './types';

interface JobsChDocument {
  job_id: string;
  title: string;
  company_name: string;
  preview: string;
  publication_date: string;
  _links: {
    detail_en?: { href: string };
    detail_de?: { href: string };
  };
}

interface JobsChResponse {
  documents: JobsChDocument[];
  num_pages: number;
}

/**
 * Jobs.ch provider — uses their public search API.
 * Restricts to IT/software category to avoid irrelevant results.
 */
export const jobschProvider: JobSourceProvider = {
  name: 'jobsch',
  label: 'Jobs.ch',

  async search(params: JobSearchParams): Promise<JobSearchResult[]> {
    const query: Record<string, string> = {
      term: params.keywords,
      rows: String(Math.min(params.maxResults, 20)),
      // Filter to IT / Informatik / Software category to avoid chefs, solar techs, etc.
      'category-ids': '18' // IT / Telekommunikation / Informatik
    };

    let data: JobsChResponse;
    try {
      data = await $fetch<JobsChResponse>(
        'https://www.jobs.ch/api/v1/public/search',
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            Accept: 'application/json'
          },
          query
        }
      );
    } catch {
      throw new Error('Could not reach jobs.ch');
    }

    if (!data?.documents) return [];

    return data.documents.slice(0, params.maxResults).map((doc) => ({
      title: doc.title,
      company: doc.company_name || 'Unknown',
      location: 'Switzerland',
      url:
        doc._links?.detail_en?.href ||
        doc._links?.detail_de?.href ||
        `https://www.jobs.ch/en/vacancies/detail/${doc.job_id}/`,
      description: doc.preview || '',
      source: 'jobsch' as const,
      published_at: doc.publication_date || undefined
    }));
  }
};
