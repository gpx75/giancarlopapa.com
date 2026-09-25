import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApplicationStatus } from '~/types/applications';
import { zurichMonthKey } from '~~/shared/utils/rav-date';

interface RavRow {
  applied_at: string;
  company: string;
  location: string | null;
  position: string;
  contact_email: string | null;
  status: ApplicationStatus;
}

export default defineEventHandler(async (event) => {
  const period = parseRavMonth(getRouterParam(event, 'month') ?? '');
  if (!period) {
    throw createError({
      statusCode: 400,
      message: 'Invalid month, expected YYYY-MM.'
    });
  }

  // Query one day wider on each side, then filter by Swiss calendar month.
  const day = 24 * 60 * 60 * 1000;
  const start = new Date(Date.UTC(period.year, period.month - 1, 1) - day);
  const end = new Date(Date.UTC(period.year, period.month, 1) + day);
  const monthKey = `${period.year}-${String(period.month).padStart(2, '0')}`;

  const db = serverSupabaseServiceRole<unknown>(
    event
  ) as unknown as SupabaseClient;

  const { data, error } = await db
    .from('job_applications')
    .select('applied_at, company, location, position, contact_email, status')
    .is('deleted_at', null)
    .gte('applied_at', start.toISOString())
    .lt('applied_at', end.toISOString())
    .order('applied_at', { ascending: true });

  if (error) {
    throw createError({ statusCode: 500, message: error.message });
  }

  const entries: RavEntry[] = (data as RavRow[])
    .filter((r) => zurichMonthKey(r.applied_at) === monthKey)
    .map((r) => ({
      appliedAt: r.applied_at,
      company: r.company,
      location: r.location,
      position: r.position,
      contact: r.contact_email,
      status: r.status
    }));
  if (entries.length > RAV_MAX_ENTRIES) {
    throw createError({
      statusCode: 422,
      message: `The RAV form fits ${RAV_MAX_ENTRIES} applications; this month has ${entries.length}.`
    });
  }

  const template =
    await useStorage('assets:server').getItemRaw<Uint8Array>(
      'rav-template.xlsm'
    );
  if (!template) {
    throw createError({ statusCode: 500, message: 'RAV template missing.' });
  }

  const [firstName = '', ...rest] = String(
    getResumeJson().basics?.name ?? ''
  ).split(' ');
  const workbook = fillRavWorkbook(
    new Uint8Array(template),
    period.year,
    period.month,
    entries,
    {
      firstName,
      lastName: rest.join(' '),
      ahvNumber: useRuntimeConfig(event).rav.ahvNumber
    }
  );

  setHeader(
    event,
    'Content-Type',
    'application/vnd.ms-excel.sheet.macroEnabled.12'
  );
  setHeader(
    event,
    'Content-Disposition',
    `attachment; filename="RAV_Arbeitsbemuehungen_${period.year}-${String(period.month).padStart(2, '0')}.xlsm"`
  );
  return Buffer.from(workbook);
});
