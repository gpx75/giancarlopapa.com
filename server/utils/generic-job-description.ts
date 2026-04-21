/**
 * Generic HTML-to-text job description extractor.
 *
 * Used as a fallback when a job-source provider doesn't have its own
 * `refreshDescription` (or returns empty because the listing redirects to an
 * external ATS like join.com / lever / greenhouse / workable).
 *
 * Returns empty string on any failure or if the extracted text is too short
 * to be useful (< 200 chars).
 */
export async function genericFetchDescription(url: string): Promise<string> {
  try {
    const html = await $fetch<string>(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; giancarlopapa.com job-scanner)' },
      responseType: 'text',
      timeout: 10_000,
    });

    const patterns = [
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /class="[^"]*(?:job-description|description|entry-content|job-body|job__description|posting-description|content--main)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<main[^>]*>([\s\S]*?)<\/main>/i,
      /<body[^>]*>([\s\S]*?)<\/body>/i,
    ];

    for (const pat of patterns) {
      const m = html.match(pat);
      if (m && m[1]) {
        const text = m[1]
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<\/(p|div|li|h[1-6]|br)>/gi, '\n')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/[ \t]+/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        if (text.length > 200) return text.slice(0, 16000);
      }
    }
  } catch {
    // ignore
  }
  return '';
}
