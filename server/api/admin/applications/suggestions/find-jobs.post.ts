import { serverSupabaseServiceRole } from '#supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const source = body.source || 'all';
  const customKeywords = body.keywords || '';
  const location = body.location || 'Switzerland';
  const workType = (body.work_type || '') as '' | 'remote' | 'hybrid' | 'on_site';
  const maxResults = Math.min(body.max_results || 10, 25);

  // Resolve providers
  const providers = (source === 'all'
    ? listJobProviders().map(p => getJobProvider(p.name))
    : [getJobProvider(source)]
  ).filter((p): p is NonNullable<typeof p> => Boolean(p));

  if (providers.length === 0) {
    throw createError({ statusCode: 400, message: `Unknown job source: ${source}` });
  }

  // Generate search keywords from resume + skills if not provided
  let keywordSets: string[];
  if (customKeywords) {
    keywordSets = [customKeywords];
  } else {
    const anthropic = useAnthropic();
    const resumeText = await getResumeForPrompt();
    keywordSets = await generateSearchKeywords(anthropic, resumeText);
  }

  // Search all providers × all keyword sets in parallel
  const searchPromises = providers.flatMap(provider =>
    keywordSets.map(keywords =>
      provider.search({ keywords, location, workType, maxResults })
        .catch((err) => {
          console.error(`[find-jobs] ${provider.name} "${keywords}":`, err instanceof Error ? err.message : err);
          return [] as Awaited<ReturnType<typeof provider.search>>;
        })
    )
  );

  const allResults = (await Promise.all(searchPromises)).flat();

  // Filter out obviously irrelevant jobs (chefs, solar techs, etc.)
  const relevant = filterRelevantJobs(allResults);

  // Deduplicate by URL or title+company
  const unique = new Map<string, typeof relevant[0]>();
  for (const job of relevant) {
    const key = job.url || `${job.title}::${job.company}`;
    if (!unique.has(key)) unique.set(key, job);
  }
  const deduped = Array.from(unique.values());

  if (deduped.length === 0) {
    return { found: 0, imported: 0, suggestions: [], keywords: keywordSets.join(', ') };
  }

  // Batch-check existing URLs to avoid N+1 queries
  const db = serverSupabaseServiceRole<unknown>(event) as unknown as SupabaseClient;
  const urls = deduped.map(j => j.url).filter(Boolean) as string[];
  const existingUrls = new Set<string>();

  if (urls.length > 0) {
    const { data: existing } = await db
      .from('job_suggestions')
      .select('url')
      .in('url', urls);
    for (const row of existing ?? []) {
      if (row.url) existingUrls.add(row.url);
    }
  }

  // Also check by title+company to catch duplicates with different URLs
  const titles = deduped.map(j => j.title);
  const companies = deduped.map(j => j.company);
  const existingTitleCompany = new Set<string>();

  if (titles.length > 0) {
    const { data: existing } = await db
      .from('job_suggestions')
      .select('title, company')
      .in('title', titles)
      .in('company', companies);
    for (const row of existing ?? []) {
      existingTitleCompany.add(`${row.title}::${row.company}`);
    }
  }

  // Also skip jobs that are already tracked as applications (by URL or by
  // position+company). Prevents the feed from re-surfacing jobs the user
  // already promoted/created.
  const existingAppUrls = new Set<string>();
  const existingAppTitleCompany = new Set<string>();

  if (urls.length > 0) {
    const { data: existingApps } = await db
      .from('job_applications')
      .select('url')
      .in('url', urls);
    for (const row of existingApps ?? []) {
      if (row.url) existingAppUrls.add(row.url);
    }
  }

  if (titles.length > 0) {
    const { data: existingApps } = await db
      .from('job_applications')
      .select('position, company')
      .in('position', titles)
      .in('company', companies);
    for (const row of existingApps ?? []) {
      existingAppTitleCompany.add(`${row.position}::${row.company}`);
    }
  }

  // Insert new suggestions
  const toInsert = deduped.filter(job => {
    if (job.url && existingUrls.has(job.url)) return false;
    if (existingTitleCompany.has(`${job.title}::${job.company}`)) return false;
    if (job.url && existingAppUrls.has(job.url)) return false;
    if (existingAppTitleCompany.has(`${job.title}::${job.company}`)) return false;
    return true;
  });

  const suggestions = [];

  for (const job of toInsert) {
    const row: Record<string, unknown> = {
      title: job.title,
      company: job.company,
      url: job.url || null,
      location: job.location || null,
      description: job.description || null,
      source: job.source
    };
    if (job.published_at) row.published_at = job.published_at;

    let { data, error } = await db
      .from('job_suggestions')
      .insert(row)
      .select()
      .single();

    // Retry without published_at if column doesn't exist yet
    if (error?.message?.includes('published_at')) {
      delete row.published_at;
      ({ data, error } = await db
        .from('job_suggestions')
        .insert(row)
        .select()
        .single());
    }

    if (!error && data) suggestions.push(data);
  }

  return {
    found: deduped.length,
    imported: suggestions.length,
    suggestions,
    keywords: keywordSets.join(', ')
  };
});
