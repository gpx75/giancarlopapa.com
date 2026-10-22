import { PDFDocument } from 'pdf-lib';

export const MAX_RESUME_PAGES = 2;

/**
 * JD terms that order the tailored CV's skill groups (matching groups first). Uses the analysis' short `keywords`;
 * older analyses only have `strongMatches`, which are usually full sentences
 * that match no skill — so only their short entries are kept.
 */
export function resumeMatchKeywords(breakdown: unknown): string[] {
  const b = breakdown as { keywords?: unknown; strongMatches?: unknown } | null;
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((k): k is string => typeof k === 'string') : []);
  const keywords = strings(b?.keywords);
  if (keywords.length) return keywords;
  return strings(b?.strongMatches).filter(k => k.length <= 30);
}

/**
 * Renders the tailored CV, stepping through RESUME_FIT_LEVELS (tighter
 * spacing first, then fewer bullets) until it fits on MAX_RESUME_PAGES.
 * Returns the first render that fits, or the most compact one (with its page
 * count) when even that is too long.
 */
export async function renderTailoredResumePdf(
  resume: Parameters<typeof buildTailoredResumeHtml>[0],
  keywords: string[],
  company: string,
  position: string,
  language: ResumeLanguage = 'en'
): Promise<{ pdf: Buffer; pages: number }> {
  let result: { pdf: Buffer; pages: number } | undefined;
  for (const fit of RESUME_FIT_LEVELS) {
    const html = buildTailoredResumeHtml(resume, keywords, company, position, language, fit);
    const pdf = await renderPdfWithBorder(html);
    const pages = (await PDFDocument.load(pdf)).getPageCount();
    result = { pdf, pages };
    if (pages <= MAX_RESUME_PAGES) break;
  }
  return result!;
}
