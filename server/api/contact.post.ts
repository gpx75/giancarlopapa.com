import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import { Resend } from 'resend';
import { checkRateLimit } from '../utils/rateLimit';
import { isValidEmail, assertValidName } from '../utils/validators';

const URL_RE = /(https?:\/\/|www\.)/i;
const URL_GLOBAL_RE = /(https?:\/\/|www\.)/gi;
const REPEATED_CHAR_RE = /(.)\1{6,}/;

function countUrls(text: string): number {
  return text.match(URL_GLOBAL_RE)?.length ?? 0;
}

function isLikelySpam(name: string, email: string, message: string): boolean {
  const urlCount = countUrls(message);
  const compactMessage = message.replace(/\s+/g, ' ').trim();

  if (urlCount > 2) {
    return true;
  }

  if (urlCount > 0 && compactMessage.length < 40) {
    return true;
  }

  if (URL_RE.test(name)) {
    return true;
  }

  if (REPEATED_CHAR_RE.test(message)) {
    return true;
  }

  return email.includes('+test') && compactMessage.length < 20;
}

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'Cache-Control': 'no-store, max-age=0',
    Pragma: 'no-cache',
    'X-Robots-Tag': 'noindex, nofollow, noarchive'
  });

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown';

  const body = await readBody(event);
  const { name, email, message, website, submittedAt } = body ?? {};

  if (typeof website === 'string' && website.trim().length > 0) {
    return { success: true };
  }

  if (typeof submittedAt !== 'number' || !Number.isFinite(submittedAt)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid submission metadata.'
    });
  }

  const elapsed = Date.now() - submittedAt;
  if (elapsed < 2500 || elapsed > 2 * 60 * 60 * 1000) {
    throw createError({
      statusCode: 400,
      message: 'Invalid submission timing.'
    });
  }

  if (!checkRateLimit(`contact:${ip}`, 3, 15 * 60 * 1000)) {
    throw createError({
      statusCode: 429,
      message: 'Too many requests. Please wait a few minutes.'
    });
  }

  if (!name || !email || !message) {
    throw createError({
      statusCode: 400,
      message: 'name, email, and message are required.'
    });
  }

  assertValidName(name);

  if (!isValidEmail(email)) {
    throw createError({
      statusCode: 400,
      message: 'A valid email address is required.'
    });
  }

  if (
    typeof message !== 'string' ||
    message.trim().length < 10 ||
    message.length > 5000
  ) {
    throw createError({
      statusCode: 400,
      message: 'Message must be between 10 and 5000 characters.'
    });
  }

  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedMessage = message.trim();

  if (!checkRateLimit(`contact:email:${normalizedEmail}`, 2, 60 * 60 * 1000)) {
    throw createError({
      statusCode: 429,
      message: 'Please wait before sending another message.'
    });
  }

  if (isLikelySpam(normalizedName, normalizedEmail, normalizedMessage)) {
    return { success: true };
  }

  const config = useRuntimeConfig(event);
  const resend = new Resend(config.resend.apiKey);

  const { error } = await resend.emails.send({
    from: 'Contact Form <contact@giancarlopapa.com>',
    to: config.resend.toEmail,
    replyTo: normalizedEmail,
    subject: `New message from ${normalizedName}`,
    text: `Name: ${normalizedName}\nEmail: ${normalizedEmail}\n\n${normalizedMessage}`
  });

  if (error) {
    console.error('[api/contact] Resend error', error);
    throw createError({
      statusCode: 500,
      message: 'Failed to send message. Please try again.'
    });
  }

  // Persist lead to Supabase — silent, never blocks the user
  void persistLead({ event, normalizedName, normalizedEmail, normalizedMessage, ip });

  return { success: true };
});

async function persistLead({ event, normalizedName, normalizedEmail, normalizedMessage, ip }: {
  event: Parameters<Parameters<typeof defineEventHandler>[0]>[0];
  normalizedName: string;
  normalizedEmail: string;
  normalizedMessage: string;
  ip: string;
}) {
  try {
    const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;

    const { error: dbError } = await db
      .from('contact_submissions')
      .insert({
        name: normalizedName,
        email: normalizedEmail,
        message: normalizedMessage,
        ip,
        status: 'new'
      });

    if (dbError) {
      console.error('[api/contact] Supabase insert error', dbError);
    }
  } catch (err) {
    console.error('[api/contact] persistLead error', err);
  }
}
