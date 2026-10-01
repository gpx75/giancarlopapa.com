export const RESUME_LANGUAGES = ['en', 'de', 'fr', 'it'] as const;
export type ResumeLanguage = (typeof RESUME_LANGUAGES)[number];

// Frequent function words per language — distinctive enough that counting
// them identifies the language of a job ad without an API call.
const STOPWORDS: Record<ResumeLanguage, string[]> = {
  en: ['the', 'and', 'with', 'you', 'our', 'for', 'are', 'will', 'your', 'experience', 'team', 'we'],
  de: ['und', 'der', 'die', 'das', 'mit', 'für', 'du', 'wir', 'sie', 'eine', 'ist', 'bei', 'erfahrung', 'unser'],
  fr: ['et', 'le', 'la', 'les', 'des', 'vous', 'nous', 'pour', 'une', 'avec', 'est', 'expérience', 'votre'],
  it: ['e', 'il', 'la', 'di', 'che', 'per', 'con', 'una', 'sono', 'nostro', 'esperienza', 'del', 'della']
};

/**
 * Best guess at the language a job ad is written in, or null when the text
 * is too short or ambiguous to tell.
 */
export function detectAdLanguage(text: string | null | undefined): ResumeLanguage | null {
  if (!text) return null;
  const words = text.toLowerCase().match(/[a-zàâäçéèêëîïôöùûüß]+/g) ?? [];
  if (words.length < 30) return null;

  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);

  const scores = RESUME_LANGUAGES.map((lang) => ({
    lang,
    score: STOPWORDS[lang].reduce((sum, w) => sum + (counts.get(w) ?? 0), 0)
  })).sort((a, b) => b.score - a.score);

  const [best, second] = scores;
  // Require a clear winner — ads mixing languages stay undecided.
  if (!best || best.score < 5 || best.score < (second?.score ?? 0) * 1.5) return null;
  return best.lang;
}
