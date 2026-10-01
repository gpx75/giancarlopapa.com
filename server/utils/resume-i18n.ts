import { createHash } from 'node:crypto';
// Static imports so the translations and labels are bundled into the server
// build (Vercel) — no runtime file reads.
import resumeDe from '~~/content/giancarlo_papa_resume.de.json';
import resumeFr from '~~/content/giancarlo_papa_resume.fr.json';
import resumeIt from '~~/content/giancarlo_papa_resume.it.json';
import resumeLabels from '~~/content/resume-labels.json';

export type ResumeLabels = (typeof resumeLabels)['en'];

const translations: Record<Exclude<ResumeLanguage, 'en'>, Record<string, unknown>> = {
  de: resumeDe,
  fr: resumeFr,
  it: resumeIt
};

export function normalizeResumeLanguage(value: unknown): ResumeLanguage {
  return RESUME_LANGUAGES.includes(value as ResumeLanguage)
    ? (value as ResumeLanguage)
    : 'en';
}

/**
 * Master resume in the given language. Returns a shared object — callers
 * that mutate it must structuredClone() first (same as getResumeJson()).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getResumeJsonFor(language: unknown): Record<string, any> {
  const lang = normalizeResumeLanguage(language);
  return lang === 'en' ? getResumeJson() : translations[lang];
}

export function getResumeLabels(language: unknown): ResumeLabels {
  return resumeLabels[normalizeResumeLanguage(language)];
}

/** Must match the hash in scripts/translate-resume.mjs. */
function resumeSourceHash(): string {
  return createHash('sha256').update(JSON.stringify(getResumeJson())).digest('hex');
}

export interface ResumeTranslationStatus {
  language: ResumeLanguage;
  upToDate: boolean;
  reviewed: boolean;
}

/** Whether each translation still matches the English master, and was proofread. */
export function getResumeTranslationStatus(): ResumeTranslationStatus[] {
  const hash = resumeSourceHash();
  return (Object.keys(translations) as Array<keyof typeof translations>).map((language) => {
    const meta = translations[language].meta as
      | { translation?: { sourceHash?: string; reviewed?: boolean } }
      | undefined;
    return {
      language,
      upToDate: meta?.translation?.sourceHash === hash,
      reviewed: meta?.translation?.reviewed === true
    };
  });
}
