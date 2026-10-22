import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing application ID.' });
  }

  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;

  const { data: app, error } = await db
    .from('job_applications')
    .select('tailored_resume, match_breakdown, company, position, language')
    .eq('id', id)
    .single();

  if (error || !app) {
    throw createError({ statusCode: 404, message: 'Application not found.' });
  }

  const resumeData = app.tailored_resume ?? getResumeJsonFor(app.language);
  const keywords = resumeMatchKeywords(app.match_breakdown);
  const company: string = app.company ?? 'company';
  const position: string = app.position ?? '';

  const { pdf } = await renderTailoredResumePdf(resumeData, keywords, company, position, normalizeResumeLanguage(app.language));

  const slug = fileSlug(company);
  setResponseHeaders(event, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="resume-${slug}-tailored.pdf"`
  });

  return pdf;
});
