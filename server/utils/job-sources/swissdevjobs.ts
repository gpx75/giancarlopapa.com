import type {
  JobSourceProvider,
  JobSearchParams,
  JobSearchResult
} from './types';
import { htmlToText } from './html-text';

interface SwissDevJob {
  _id: string;
  name: string;
  company: string;
  actualCity: string;
  cityCategory: string;
  jobUrl: string;
  redirectJobUrl?: string;
  workplace: string;
  jobType: string;
  expLevel: string;
  techCategory: string;
  technologies: string[];
  annualSalaryFrom?: number;
  annualSalaryTo?: number;
  language: string;
  companySize: string;
}

/**
 * Fetch the `window.__detailedJob` JSON embedded in a SwissDevJobs detail page
 * (the site is client-side rendered, so the listing API returns metadata only).
 * Returns null on any failure.
 */
async function fetchDetailedJob(
  url: string
): Promise<Record<string, unknown> | null> {
  // Only the SwissDevJobs detail pages embed `window.__detailedJob`. Some
  // listings link straight to external ATSes (join.com, lever, greenhouse,
  // workable, smartrecruiters, etc.) via `redirectJobUrl` — bail out so the
  // caller can fall back to the generic HTML extractor.
  if (!isSwissDevJobsUrl(url)) return null;

  try {
    const html = await $fetch<string>(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; giancarlopapa.com job-scanner)'
      },
      responseType: 'text',
      timeout: 8_000
    });

    const m = html.match(
      /window\.__detailedJob\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/
    );
    if (!m || !m[1]) return null;

    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

/** Build a plain-text description from the detailed job JSON. */
function describeDetailedJob(data: Record<string, unknown>): string {
  const parts: string[] = [];
  const desc = data.description;
  if (typeof desc === 'string' && desc.trim()) {
    parts.push(htmlToText(desc));
  }
  const responsibilities = data.responsibilitiesTextArea;
  if (typeof responsibilities === 'string' && responsibilities.trim()) {
    parts.push('Responsibilities:\n' + htmlToText(responsibilities));
  }
  const mustHave = data.requirementsMustTextArea;
  if (typeof mustHave === 'string' && mustHave.trim()) {
    parts.push('Requirements (must-have):\n' + htmlToText(mustHave));
  }
  const niceToHave = data.requirementsNiceTextArea;
  if (typeof niceToHave === 'string' && niceToHave.trim()) {
    parts.push('Requirements (nice-to-have):\n' + htmlToText(niceToHave));
  }

  return parts.join('\n\n').slice(0, 16000);
}

/** Full job description for a SwissDevJobs URL. Returns '' on any failure. */
async function fetchFullDescription(url: string): Promise<string> {
  const data = await fetchDetailedJob(url);
  return data ? describeDetailedJob(data) : '';
}

export function isSwissDevJobsUrl(url: string): boolean {
  try {
    return /(^|\.)swissdevjobs\.ch$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * Structured job data for a single SwissDevJobs URL — used by "Import from
 * URL", where the generic HTML extractor only sees the empty SPA shell.
 * Returns null when the page has no embedded job.
 */
export async function importSwissDevJob(url: string): Promise<{
  title: string;
  company: string;
  location: string;
  description: string;
} | null> {
  const data = await fetchDetailedJob(url);
  if (!data || typeof data.name !== 'string' || typeof data.company !== 'string') {
    return null;
  }

  const city = data.actualCity || data.cityCategory;
  return {
    title: data.name,
    company: data.company,
    location: typeof city === 'string' && city ? `${city}, Switzerland` : 'Switzerland',
    description: describeDetailedJob(data)
  };
}

/**
 * SwissDevJobs provider — uses their public JSON API at /api/jobsLight for
 * listing, then scrapes each job page for the full description (the listing
 * API returns metadata only).
 */
export const swissdevjobsProvider: JobSourceProvider = {
  name: 'swissdevjobs',
  label: 'SwissDevJobs',

  refreshDescription(url: string): Promise<string> {
    return fetchFullDescription(url);
  },

  async search(params: JobSearchParams): Promise<JobSearchResult[]> {
    let jobs: SwissDevJob[];
    try {
      jobs = await $fetch<SwissDevJob[]>(
        'https://swissdevjobs.ch/api/jobsLight',
        {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        }
      );
    } catch {
      throw new Error('Could not reach swissdevjobs.ch');
    }

    if (!Array.isArray(jobs)) return [];

    // Filter by keywords — require at least half the terms to match for broader results
    const kw = params.keywords
      .toLowerCase()
      .split(/\s+/)
      .filter((k) => k.length > 1);
    const minMatches = Math.max(1, Math.ceil(kw.length / 2));
    const filtered = jobs.filter((job) => {
      const searchable = [
        job.name,
        job.company,
        job.techCategory,
        ...(job.technologies || [])
      ]
        .join(' ')
        .toLowerCase();

      const matches = kw.filter((k) => searchable.includes(k)).length;
      return matches >= minMatches;
    });

    // Filter by work type
    let results = filtered;
    if (params.workType === 'remote') {
      results = results.filter((j) => j.workplace === 'remote');
    } else if (params.workType === 'hybrid') {
      results = results.filter((j) => j.workplace === 'hybrid');
    } else if (params.workType === 'on_site') {
      results = results.filter((j) => j.workplace === 'office');
    }

    const top = results.slice(0, params.maxResults);

    // Fetch full descriptions in parallel (bounded by maxResults).
    const fullDescriptions = await Promise.all(
      top.map((job) =>
        fetchFullDescription(`https://swissdevjobs.ch/jobs/${job.jobUrl}`)
      )
    );

    return top.map((job, i) => {
      const salary =
        job.annualSalaryFrom && job.annualSalaryTo
          ? `CHF ${(job.annualSalaryFrom / 1000).toFixed(0)}k–${(job.annualSalaryTo / 1000).toFixed(0)}k`
          : '';
      const tech = (job.technologies || []).slice(0, 5).join(', ');
      const metaLine = [
        job.expLevel,
        job.jobType,
        job.workplace,
        salary,
        tech ? `Tech: ${tech}` : ''
      ]
        .filter(Boolean)
        .join(' · ');

      const fullDesc = fullDescriptions[i] || '';
      const description = fullDesc ? `${metaLine}\n\n${fullDesc}` : metaLine;

      return {
        title: job.name,
        company: job.company,
        location: `${job.actualCity || job.cityCategory}, Switzerland`,
        url: job.redirectJobUrl || `https://swissdevjobs.ch/jobs/${job.jobUrl}`,
        description,
        source: 'swissdevjobs' as const
      };
    });
  }
};
