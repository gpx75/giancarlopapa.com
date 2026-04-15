import type { JobSourceProvider, JobSearchParams, JobSearchResult } from './types';

interface SwissDevJob {
  _id: string
  name: string
  company: string
  actualCity: string
  cityCategory: string
  jobUrl: string
  redirectJobUrl?: string
  workplace: string
  jobType: string
  expLevel: string
  techCategory: string
  technologies: string[]
  annualSalaryFrom?: number
  annualSalaryTo?: number
  language: string
  companySize: string
}

/**
 * SwissDevJobs provider — uses their public JSON API at /api/jobsLight.
 * Returns all jobs, client-side filtered by keywords.
 */
export const swissdevjobsProvider: JobSourceProvider = {
  name: 'swissdevjobs',
  label: 'SwissDevJobs',

  async search(params: JobSearchParams): Promise<JobSearchResult[]> {
    let jobs: SwissDevJob[];
    try {
      jobs = await $fetch<SwissDevJob[]>('https://swissdevjobs.ch/api/jobsLight', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
    } catch {
      throw new Error('Could not reach swissdevjobs.ch');
    }

    if (!Array.isArray(jobs)) return [];

    // Filter by keywords — require at least half the terms to match for broader results
    const kw = params.keywords.toLowerCase().split(/\s+/).filter(k => k.length > 1);
    const minMatches = Math.max(1, Math.ceil(kw.length / 2));
    const filtered = jobs.filter(job => {
      const searchable = [
        job.name,
        job.company,
        job.techCategory,
        ...(job.technologies || [])
      ].join(' ').toLowerCase();

      const matches = kw.filter(k => searchable.includes(k)).length;
      return matches >= minMatches;
    });

    // Filter by work type
    let results = filtered;
    if (params.workType === 'remote') {
      results = results.filter(j => j.workplace === 'remote');
    } else if (params.workType === 'hybrid') {
      results = results.filter(j => j.workplace === 'hybrid');
    } else if (params.workType === 'on_site') {
      results = results.filter(j => j.workplace === 'office');
    }

    return results.slice(0, params.maxResults).map(job => {
      const salary = job.annualSalaryFrom && job.annualSalaryTo
        ? `CHF ${(job.annualSalaryFrom / 1000).toFixed(0)}k–${(job.annualSalaryTo / 1000).toFixed(0)}k`
        : '';
      const tech = (job.technologies || []).slice(0, 5).join(', ');

      return {
        title: job.name,
        company: job.company,
        location: `${job.actualCity || job.cityCategory}, Switzerland`,
        url: job.redirectJobUrl || `https://swissdevjobs.ch/jobs/${job.jobUrl}`,
        description: [
          job.expLevel,
          job.jobType,
          job.workplace,
          salary,
          tech ? `Tech: ${tech}` : ''
        ].filter(Boolean).join(' · '),
        source: 'swissdevjobs' as const
      };
    });
  }
};
