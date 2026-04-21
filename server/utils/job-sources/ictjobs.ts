import type { JobSourceProvider, JobSearchParams, JobSearchResult } from './types';

// Category slugs that cover relevant IT roles on ictjobs.ch
const FEED_CATEGORIES = [
  'software-entwicklung',
  'netzwerke-systeme',
  'beratung-consultants',
  'ki-machine-learning',
];

interface RssItem {
  title: string
  link: string
  company: string
  pubDate: string
  description: string
  categories: string[]
}

function extractValue(xml: string, tag: string): string {
  // CDATA
  const cdata = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'));
  if (cdata && cdata[1]) return cdata[1].trim();
  // Plain text (handles <link>URL</link>)
  const plain = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i'));
  if (plain && plain[1]) return plain[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
  return '';
}

function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const c = m[1];
    if (!c) continue;
    const title = extractValue(c, 'title');
    const link = extractValue(c, 'link') || extractValue(c, 'guid');
    if (!title || !link) continue;
    items.push({
      title,
      link,
      company: extractValue(c, 'dc:creator'),
      pubDate: extractValue(c, 'pubDate'),
      description: extractValue(c, 'description'),
      categories: [...c.matchAll(/<category[^>]*><!?\[?(?:CDATA\[)?([^\]<]+)/g)]
        .map(x => (x[1] ?? '').trim())
        .filter(Boolean),
    });
  }
  return items;
}

/** Extract plain text from a job page HTML. Falls back to empty string on any error. */
async function fetchPageDescription(url: string): Promise<string> {
  try {
    const html = await $fetch<string>(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; giancarlopapa.com job-scanner)' },
      responseType: 'text',
      timeout: 8_000,
    });

    // Try known WordPress content selectors
    const contentPatterns = [
      /class="entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/(?:div|section|article)/i,
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /class="job-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /class="content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/(?:div|section)/i,
    ];

    for (const pat of contentPatterns) {
      const m = html.match(pat);
      if (m && m[1]) {
        return m[1]
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          // Preserve paragraph breaks before stripping tags.
          .replace(/<\/(p|div|li|h[1-6]|br)>/gi, '\n')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]+>/g, ' ')
          .replace(/[ \t]+/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim()
          .slice(0, 16000);
      }
    }
  } catch {
    // timeout or fetch error — use RSS description
  }
  return '';
}

export const ictjobsProvider: JobSourceProvider = {
  name: 'ictjobs',
  label: 'ICTjobs.ch',

  refreshDescription(url: string): Promise<string> {
    return fetchPageDescription(url);
  },

  async search(params: JobSearchParams): Promise<JobSearchResult[]> {
    const kw = params.keywords.toLowerCase().split(/[\s,+]+/).filter(k => k.length > 2);
    // At least 1/3 of keywords must match for broader coverage
    const minMatches = Math.max(1, Math.ceil(kw.length / 3));

    // Fetch all category feeds in parallel
    const feedFetches = await Promise.allSettled(
      FEED_CATEGORIES.map(cat =>
        $fetch<string>(`https://ictjobs.ch/feed/?cat=${cat}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/rss+xml, application/xml, text/xml',
          },
          responseType: 'text',
          timeout: 10_000,
        })
      )
    );

    // Collect and deduplicate items
    const seen = new Set<string>();
    const allItems: RssItem[] = [];
    for (const result of feedFetches) {
      if (result.status !== 'fulfilled') continue;
      for (const item of parseRssItems(result.value)) {
        if (!seen.has(item.link)) {
          seen.add(item.link);
          allItems.push(item);
        }
      }
    }

    if (allItems.length === 0) throw new Error('Could not reach ictjobs.ch');

    // Filter by keyword relevance
    const filtered = allItems.filter(item => {
      const blob = [item.title, item.company, item.description, ...item.categories]
        .join(' ').toLowerCase();
      return kw.filter(k => blob.includes(k)).length >= minMatches;
    });

    // Work-type filter (ictjobs descriptions use German terms)
    let results = filtered;
    if (params.workType === 'remote') {
      results = results.filter(j =>
        /remote|homeoffice|home.?office|telearbeit/i.test(j.title + ' ' + j.description)
      );
    } else if (params.workType === 'hybrid') {
      results = results.filter(j =>
        /hybrid/i.test(j.title + ' ' + j.description)
      );
    }

    const limited = results.slice(0, params.maxResults);

    // Fetch full page descriptions for top matches (cap at 6 to avoid rate-limiting)
    const fetchCount = Math.min(6, limited.length);
    const fullDescriptions = await Promise.all(
      limited.slice(0, fetchCount).map(item => fetchPageDescription(item.link))
    );

    return limited.map((item, i) => ({
      title: item.title,
      company: item.company || 'Unknown',
      location: 'Switzerland',
      url: item.link,
      description: fullDescriptions[i] || item.description || '',
      source: 'ictjobs' as const,
      published_at: item.pubDate ? new Date(item.pubDate).toISOString() : undefined,
    }));
  },
};
