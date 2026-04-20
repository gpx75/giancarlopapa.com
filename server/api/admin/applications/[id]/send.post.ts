import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

interface SendBody {
  to: string
  subject: string
  body: string
  attachResume?: boolean
  attachCoverLetterPdf?: boolean
  coverLetterId?: number
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing application ID.' });
  }

  const body = await readBody<SendBody>(event);

  if (!body?.to || !body?.subject || !body?.body) {
    throw createError({ statusCode: 400, message: 'to, subject, and body are required.' });
  }

  const attachResume = body.attachResume !== false; // default true
  const attachCoverLetterPdf = body.attachCoverLetterPdf === true; // default false

  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;

  // 1. Fetch application data
  const { data: app, error: appErr } = await db
    .from('job_applications')
    .select('id, company, position, contact_email, tailored_resume, match_breakdown')
    .eq('id', id)
    .single();

  if (appErr || !app) {
    throw createError({ statusCode: 404, message: 'Application not found.' });
  }

  const config = useRuntimeConfig(event);
  const resend = new Resend(config.resend.apiKey);

  // Build attachments
  const attachments: Array<{ filename: string; content: string }> = [];
  const attachmentNames: string[] = [];

  // 2. Generate tailored resume PDF if requested
  if (attachResume) {
    const resumeData = app.tailored_resume ?? getResumeJson();
    const keywords: string[] = app.match_breakdown?.strongMatches ?? [];
    const company: string = app.company ?? 'company';
    const position: string = app.position ?? '';

    const resumeHtml = buildTailoredResumeHtml(resumeData, keywords, company, position);
    const resumePdf = await renderPdfWithBorder(resumeHtml);

    const slug = company.toLowerCase().replace(/\s+/g, '-');
    const filename = `resume-${slug}-tailored.pdf`;
    attachments.push({
      filename,
      content: Buffer.from(resumePdf).toString('base64')
    });
    attachmentNames.push(filename);
  }

  // 3. Generate cover letter PDF if requested
  if (attachCoverLetterPdf && body.coverLetterId) {
    const { data: letter, error: letterErr } = await db
      .from('cover_letters')
      .select('id, content, tone, application_id')
      .eq('id', body.coverLetterId)
      .single();

    if (letterErr || !letter) {
      throw createError({ statusCode: 404, message: 'Cover letter not found.' });
    }

    const resumeData = getResumeJson();
    const clHtml = buildCoverLetterHtml({
      content: letter.content,
      company: app.company,
      position: app.position,
      contactEmail: app.contact_email,
      basics: resumeData.basics
    });

    const clPdf = await renderPdfWithBorder(clHtml);
    const clSlug = app.company.toLowerCase().replace(/\s+/g, '-');
    const clFilename = `cover-letter-${clSlug}.pdf`;
    attachments.push({
      filename: clFilename,
      content: Buffer.from(clPdf).toString('base64')
    });
    attachmentNames.push(clFilename);
  }

  // 4. Send via Resend
  const fromEmail = config.resend.toEmail || 'giancarlo.papa@gmail.com';
  const { data: resendData, error: resendErr } = await resend.emails.send({
    from: `Giancarlo Papa <${fromEmail}>`,
    to: body.to,
    subject: body.subject,
    text: body.body,
    attachments: attachments.length > 0 ? attachments : undefined
  });

  if (resendErr || !resendData) {
    console.error('[api/admin/applications/send] Resend error', resendErr);
    throw createError({ statusCode: 500, message: 'Failed to send email.' });
  }

  // 5. Insert into outbox
  const { error: outboxErr } = await db
    .from('outbox')
    .insert({
      application_id: Number(id),
      to_email: body.to,
      subject: body.subject,
      resend_message_id: resendData.id,
      attachments: attachmentNames,
      sent_at: new Date().toISOString()
    });

  if (outboxErr) {
    console.error('[api/admin/applications/send] Outbox insert error', outboxErr);
  }

  // 6. Update application status to 'applied'
  const { error: updateErr } = await db
    .from('job_applications')
    .update({ status: 'applied', applied_at: new Date().toISOString() })
    .eq('id', id);

  if (updateErr) {
    console.error('[api/admin/applications/send] Status update error', updateErr);
  }

  return { ok: true, messageId: resendData.id };
});
