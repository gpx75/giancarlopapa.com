import { PDFDocument } from 'pdf-lib';

export const MAX_RESUME_PAGES = 2;

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
