import { Resend } from 'resend';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { to, toName, subject, message } = body ?? {};

  if (!to || !subject || !message) {
    throw createError({ statusCode: 400, message: 'to, subject, and message are required.' });
  }

  const config = useRuntimeConfig(event);
  const resend = new Resend(config.resend.apiKey);

  const { error } = await resend.emails.send({
    from: 'Giancarlo Papa <contact@giancarlopapa.com>',
    to: toName ? `${toName} <${to}>` : to,
    replyTo: 'giancarlo.papa@gmail.com',
    subject,
    text: message
  });

  if (error) {
    console.error('[api/admin/inbox/reply] Resend error', error);
    throw createError({ statusCode: 500, message: 'Failed to send reply.' });
  }

  return { success: true };
});
