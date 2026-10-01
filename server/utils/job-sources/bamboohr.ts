import { htmlToText } from './html-text';

interface BambooJobDetail {
  result?: {
    jobOpening?: {
      jobOpeningName?: string;
      description?: string;
      location?: { city?: string | null; state?: string | null; addressCountry?: string | null };
      locationType?: string | null;
    };
  };
}

interface BambooCompanyInfo {
  result?: { name?: string };
}

/** `https://<tenant>.bamboohr.com/careers/<id>` → base URL + job id, or null. */
function parseBambooUrl(url: string): { base: string; id: string } | null {
  try {
    const u = new URL(url);
    if (!/\.bamboohr\.com$/i.test(u.hostname)) return null;
    const id = u.pathname.match(/\/careers\/(\d+)/)?.[1];
    return id ? { base: `${u.protocol}//${u.hostname}`, id } : null;
  } catch {
    return null;
  }
}

/**
 * Structured job data for a BambooHR careers URL — used by "Import from URL".
 * BambooHR career pages are client-side rendered (the HTML is an empty
 * shell), but the same data is served by its public JSON endpoints.
 * Returns null for non-BambooHR URLs or on any failure.
 */
export async function importBambooHrJob(url: string): Promise<{
  title: string;
  company: string;
  location: string;
  description: string;
} | null> {
  const parsed = parseBambooUrl(url);
  if (!parsed) return null;

  try {
    const [detail, company] = await Promise.all([
      $fetch<BambooJobDetail>(`${parsed.base}/careers/${parsed.id}/detail`, { timeout: 8_000 }),
      $fetch<BambooCompanyInfo>(`${parsed.base}/careers/company-info`, { timeout: 8_000 })
        .catch(() => null)
    ]);

    const job = detail.result?.jobOpening;
    const companyName = company?.result?.name?.trim();
    if (!job?.jobOpeningName || !job.description || !companyName) return null;

    const loc = job.location;
    const location = [loc?.city, loc?.addressCountry ?? loc?.state].filter(Boolean).join(', ');

    return {
      title: job.jobOpeningName.trim(),
      company: companyName,
      location: location || 'Not specified',
      description: htmlToText(job.description).slice(0, 16000)
    };
  } catch {
    return null;
  }
}
