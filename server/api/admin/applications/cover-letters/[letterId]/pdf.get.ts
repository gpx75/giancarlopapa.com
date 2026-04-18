import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
  const letterId = getRouterParam(event, 'letterId');

  if (!letterId) {
    throw createError({ statusCode: 400, message: 'Missing cover letter ID.' });
  }

  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;

  // Fetch cover letter + parent application
  const { data: letter, error: letterErr } = await db
    .from('cover_letters')
    .select('id, content, tone, application_id')
    .eq('id', letterId)
    .single();

  if (letterErr || !letter) {
    throw createError({ statusCode: 404, message: 'Cover letter not found.' });
  }

  const { data: app, error: appErr } = await db
    .from('job_applications')
    .select('company, position, contact_email')
    .eq('id', letter.application_id)
    .single();

  if (appErr || !app) {
    throw createError({ statusCode: 404, message: 'Application not found.' });
  }

  // Load resume basics for header
  const resumeData = getResumeJson();

  const html = buildCoverLetterHtml({
    content: letter.content,
    company: app.company,
    position: app.position,
    contactEmail: app.contact_email,
    basics: resumeData.basics
  });

  const pdf = await renderPdfWithBorder(html);

  setResponseHeaders(event, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="cover-letter-${app.company.toLowerCase().replace(/\s+/g, '-')}.pdf"`
  });

  return pdf;
});
