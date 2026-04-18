import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import { Resend } from 'resend';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing contact ID.' });
  }

  const body = await readBody(event);
  if (!body?.message?.trim()) {
    throw createError({ statusCode: 400, message: 'Reply message is required.' });
  }

  const config = useRuntimeConfig(event);
  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;

  // Fetch the contact to get recipient details
  const { data: contact, error: fetchError } = await db
    .from('contact_submissions')
    .select('id, name, email, message, created_at')
    .eq('id', id)
    .single();

  if (fetchError || !contact) {
    throw createError({ statusCode: 404, message: 'Contact not found.' });
  }

  // Build quoted original message
  const date = new Date(contact.created_at).toLocaleDateString('en-CH', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  const quoted = contact.message.split('\n').map((l: string) => `> ${l}`).join('\n');
  const fullText = `${body.message.trim()}\n\n---\nOn ${date}, ${contact.name} <${contact.email}> wrote:\n\n${quoted}`;

  const subject = `Re: Message from ${contact.name}`;

  // Send via Resend
  const resend = new Resend(config.resend.apiKey);
  try {
    await resend.emails.send({
      from: `Giancarlo Papa <${config.contactEmail || 'contact@giancarlopapa.com'}>`,
      to: contact.name ? `${contact.name} <${contact.email}>` : contact.email,
      replyTo: 'giancarlo.papa@gmail.com',
      subject,
      text: fullText
    });
  } catch (err) {
    console.error('Resend error:', err);
    throw createError({ statusCode: 500, message: 'Failed to send reply.' });
  }

  // Mark contact as responded
  await db
    .from('contact_submissions')
    .update({ status: 'responded' })
    .eq('id', id);

  return { success: true };
});
